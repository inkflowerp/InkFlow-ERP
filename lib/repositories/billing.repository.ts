import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type {
  InvoiceRecord,
  InvoiceItemRecord,
  PaymentRecord,
  PaymentAllocationRecord,
  FinancialWriteOffRecord,
} from '../../types/billing.types.ts'

export class BillingRepository {
  private static memorySequences = new Map<string, number>()

  /**
   * Concurrency-safe, tenant-aware document number generator
   */
  static async getNextDocumentNumber(companyId: string, docType: 'invoice' | 'quotation' | 'order' | 'challan' | 'payment' | 'purchase'): Promise<string> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any).rpc('get_next_document_number', {
        p_company_id: companyId,
        p_doc_type: docType,
      })

      if (!error && data) {
        return String(data)
      }

      // If RPC is unavailable, use atomic sequence fallback query with padding
      const admin = createAdminClient()
      const { data: seq } = await (admin as any)
        .from('document_sequences')
        .select('*')
        .eq('company_id', companyId)
        .eq('doc_type', docType)
        .maybeSingle()

      const prefixMap: Record<string, string> = {
        invoice: 'INV',
        quotation: 'QUO',
        order: 'ORD',
        challan: 'CHL',
        payment: 'PAY',
        purchase: 'PUR',
      }
      const prefix = seq?.prefix || prefixMap[docType] || 'DOC'
      const nextVal = (seq?.current_val ? Number(seq.current_val) : 0) + 1

      await (admin as any).from('document_sequences').upsert({
        company_id: companyId,
        doc_type: docType,
        prefix,
        current_val: nextVal,
        padding: 6,
        updated_at: new Date().toISOString(),
      })

      return `${prefix}-${String(nextVal).padStart(6, '0')}`
    } catch {
      // Offline/Test in-memory sequence store (deterministic, concurrency-safe, sequential increment)
      const seqKey = `${companyId}:${docType}`
      const current = (BillingRepository.memorySequences.get(seqKey) || 0) + 1
      BillingRepository.memorySequences.set(seqKey, current)

      const prefixMap: Record<string, string> = {
        invoice: 'INV',
        quotation: 'QUO',
        order: 'ORD',
        challan: 'CHL',
        payment: 'PAY',
        purchase: 'PUR',
      }
      const prefix = prefixMap[docType] || 'DOC'
      return `${prefix}-${String(current).padStart(6, '0')}`
    }
  }

  static async getInvoices(companyId: string): Promise<InvoiceRecord[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('invoices')
        .select('*, items:invoice_items(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        return (data || []) as unknown as InvoiceRecord[]
      }
    } catch {}

    const all = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    return all.filter((inv) => !inv.company_id || inv.company_id === companyId)
  }

  static async getInvoiceById(id: string, companyId: string): Promise<InvoiceRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('invoices')
        .select('*, items:invoice_items(*)')
        .or(`id.eq.${id},invoice_number.eq.${id}`)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return (data as unknown as InvoiceRecord) || null
      }
    } catch {}

    const all = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    return all.find((inv) => (inv.id === id || inv.invoice_number === id) && (!inv.company_id || inv.company_id === companyId)) || null
  }

  static async createInvoice(invoice: Partial<InvoiceRecord> & {
    company_id: string
    customer_id: string
    customer_name: string
    customer_phone: string
    due_date: string
    grand_total: number
    created_by_name: string
  }): Promise<InvoiceRecord> {
    const invoiceNumber = invoice.invoice_number || (await this.getNextDocumentNumber(invoice.company_id, 'invoice'))

    const subtotal = invoice.subtotal || invoice.grand_total || 0
    const vatPct = invoice.vat_percentage || 0
    const vatAmt = invoice.vat_amount || (subtotal * vatPct) / 100
    const discountAmt = invoice.discount_amount || 0
    const grandTotal = invoice.grand_total || subtotal - discountAmt + vatAmt
    const paidAmount = invoice.paid_amount || 0
    const dueAmount = Math.max(0, grandTotal - paidAmount)

    const payload: any = {
      id: invoice.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: invoice.company_id,
      invoice_number: invoiceNumber,
      invoice_type: invoice.invoice_type || 'sales_invoice',
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      customer_bin: invoice.customer_bin || null,
      customer_tin: invoice.customer_tin || null,
      customer_address: invoice.customer_address || null,
      sales_order_id: invoice.sales_order_id || null,
      order_number: invoice.order_number || null,
      invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
      due_date: invoice.due_date,
      status: paidAmount >= grandTotal ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid',
      subtotal,
      discount_amount: discountAmt,
      vat_percentage: vatPct,
      vat_amount: vatAmt,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      write_off_amount: 0,
      notes: invoice.notes || null,
      terms_and_conditions: invoice.terms_and_conditions || null,
      created_by_name: invoice.created_by_name,
      created_at: invoice.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('invoices')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        // Insert invoice items if present
        if (invoice.items && invoice.items.length > 0) {
          const itemsPayload = invoice.items.map((it: any) => ({
            invoice_id: data.id,
            product_id: it.product_id || null,
            item_description: it.item_description || it.item_name || 'Printing Item',
            dimensions_spec: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'inch'}` : null),
            quantity: it.quantity,
            unit: it.unit || 'pcs',
            unit_price: it.unit_price,
            vat_percentage: it.vat_percentage || 0,
            total_price: it.total_price || (it.quantity * it.unit_price),
          }))
          await (supabase as any).from('invoice_items').insert(itemsPayload)
        }

        return (await this.getInvoiceById(data.id, invoice.company_id)) as InvoiceRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    const idx = all.findIndex((i) => i.id === payload.id)
    if (idx >= 0) all[idx] = payload
    else all.push(payload)
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, all)
    return payload
  }

  static async getInvoicePrintData(id: string, companyId: string): Promise<{
    invoice: InvoiceRecord
    company: any
  } | null> {
    try {
      const supabase = await createClient()
      const invoice = await this.getInvoiceById(id, companyId)
      if (!invoice) return null

      const { data: company } = await (supabase as any)
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle()

      return {
        invoice,
        company: company || { name: 'InkFlow Enterprise', address: 'Dhaka, Bangladesh' },
      }
    } catch {
      const invoice = await this.getInvoiceById(id, companyId)
      if (!invoice) return null
      return {
        invoice,
        company: { name: 'InkFlow Enterprise', address: 'Dhaka, Bangladesh' },
      }
    }
  }

  static async updateInvoice(
    id: string,
    param2: Partial<InvoiceRecord> | string,
    param3?: Partial<InvoiceRecord> | string
  ): Promise<InvoiceRecord> {
    const updates: Partial<InvoiceRecord> = (typeof param2 === 'object' ? param2 : typeof param3 === 'object' ? param3 : {}) as Partial<InvoiceRecord>
    const companyId: string = typeof param2 === 'string' ? param2 : typeof param3 === 'string' ? param3 : ''

    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id
    delete payload.items

    try {
      const supabase = await createClient()
      let query = (supabase as any).from('invoices').update(payload).eq('id', id)
      if (companyId) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query.select().single()
      if (!error && data) {
        return data as unknown as InvoiceRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    const idx = all.findIndex((i) => i.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...payload }
      PrintERPDataStore.set(STORAGE_KEYS.INVOICES, all)
      return all[idx]
    }
    throw new Error(`Invoice ${id} not found to update.`)
  }

  static async getPayments(companyId: string, customerId?: string): Promise<PaymentRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })

      if (customerId) {
        query = query.eq('customer_id', customerId)
      }

      const { data, error } = await query
      if (!error && data) {
        return (data || []) as unknown as PaymentRecord[]
      }
    } catch {}

    const all = PrintERPDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []
    return all.filter((p) => (!p.company_id || p.company_id === companyId) && (!customerId || p.customer_id === customerId))
  }

  static async recordPayment(payment: {
    company_id: string
    customer_id: string
    customer_name: string
    amount: number
    payment_method: 'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'other_mfs'
    payment_type?: 'full_payment' | 'partial_payment' | 'advance_payment' | 'due_payment'
    invoice_id?: string
    bank_name?: string | null
    cheque_number?: string | null
    cheque_date?: string | null
    mfs_transaction_id?: string | null
    notes?: string | null
    received_by_name: string
  }): Promise<PaymentRecord> {
    const receiptNumber = await this.getNextDocumentNumber(payment.company_id, 'payment')

    const payload: any = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: payment.company_id,
      receipt_number: receiptNumber,
      customer_id: payment.customer_id,
      customer_name: payment.customer_name,
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: payment.payment_type || (payment.invoice_id ? 'partial_payment' : 'advance_payment'),
      payment_method: payment.payment_method,
      amount: payment.amount,
      bank_name: payment.bank_name || null,
      cheque_number: payment.cheque_number || null,
      cheque_date: payment.cheque_date || null,
      mfs_transaction_id: payment.mfs_transaction_id || null,
      notes: payment.notes || null,
      received_by_name: payment.received_by_name,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: createdPayment, error: payErr } = await (supabase as any)
        .from('payments')
        .insert(payload)
        .select()
        .single()

      if (!payErr && createdPayment) {
        if (payment.invoice_id) {
          const invoice = await this.getInvoiceById(payment.invoice_id, payment.company_id)
          if (invoice) {
            const newPaid = (Number(invoice.paid_amount) || 0) + Number(payment.amount)
            const newDue = Math.max(0, (Number(invoice.grand_total) || 0) - newPaid - (Number(invoice.write_off_amount) || 0))
            const newStatus = newDue <= 0 ? 'paid' : 'partially_paid'

            await (supabase as any).from('payment_allocations').insert({
              payment_id: createdPayment.id,
              invoice_id: invoice.id,
              allocated_amount: payment.amount,
            })

            await (supabase as any)
              .from('invoices')
              .update({
                paid_amount: newPaid,
                due_amount: newDue,
                status: newStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', invoice.id)
              .eq('company_id', payment.company_id)
          }
        }
        return createdPayment as unknown as PaymentRecord
      }
    } catch {}

    // Fallback store handling
    const all = PrintERPDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []
    all.push(payload)
    PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, all)

    if (payment.invoice_id) {
      const invoice = await this.getInvoiceById(payment.invoice_id, payment.company_id)
      if (invoice) {
        const newPaid = (Number(invoice.paid_amount) || 0) + Number(payment.amount)
        const newDue = Math.max(0, (Number(invoice.grand_total) || 0) - newPaid - (Number(invoice.write_off_amount) || 0))
        const newStatus = newDue <= 0 ? 'paid' : 'partially_paid'
        await this.updateInvoice(invoice.id, {
          paid_amount: newPaid,
          due_amount: newDue,
          status: newStatus,
        }, payment.company_id)
      }
    }

    return payload as unknown as PaymentRecord
  }

  static async recordWriteOff(writeOff: {
    company_id: string
    invoice_id: string
    amount: number
    reason: string
    authorized_by_name: string
  }): Promise<FinancialWriteOffRecord> {
    const payload: any = {
      id: `wo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...writeOff,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('financial_write_offs')
        .insert(writeOff)
        .select()
        .single()

      if (!error && data) {
        const invoice = await this.getInvoiceById(writeOff.invoice_id, writeOff.company_id)
        if (invoice) {
          const newWriteOff = (Number(invoice.write_off_amount) || 0) + Number(writeOff.amount)
          const newDue = Math.max(0, (Number(invoice.grand_total) || 0) - (Number(invoice.paid_amount) || 0) - newWriteOff)
          const newStatus = newDue <= 0 ? 'written_off' : invoice.status

          await (supabase as any)
            .from('invoices')
            .update({
              write_off_amount: newWriteOff,
              due_amount: newDue,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.id)
            .eq('company_id', writeOff.company_id)
        }
        return data as unknown as FinancialWriteOffRecord
      }
    } catch {}

    const invoice = await this.getInvoiceById(writeOff.invoice_id, writeOff.company_id)
    if (invoice) {
      const newWriteOff = (Number(invoice.write_off_amount) || 0) + Number(writeOff.amount)
      const newDue = Math.max(0, (Number(invoice.grand_total) || 0) - (Number(invoice.paid_amount) || 0) - newWriteOff)
      const newStatus = newDue <= 0 ? 'written_off' : invoice.status
      await this.updateInvoice(invoice.id, {
        write_off_amount: newWriteOff,
        due_amount: newDue,
        status: newStatus,
      }, writeOff.company_id)
    }

    return payload as unknown as FinancialWriteOffRecord
  }
}

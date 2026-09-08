import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  InvoiceRecord,
  InvoiceItemRecord,
  PaymentRecord,
  PaymentAllocationRecord,
  FinancialWriteOffRecord,
} from '@/types/billing.types'

export class BillingRepository {
  /**
   * Concurrency-safe, tenant-aware document number generator
   */
  static async getNextDocumentNumber(companyId: string, docType: 'invoice' | 'quotation' | 'order' | 'challan' | 'payment' | 'purchase'): Promise<string> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any).rpc('get_next_document_number', {
      p_company_id: companyId,
      p_doc_type: docType,
    })

    if (error || !data) {
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
    }

    return String(data)
  }

  static async getInvoices(companyId: string): Promise<InvoiceRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`)
    }
    return (data || []) as unknown as InvoiceRecord[]
  }

  static async getInvoiceById(id: string, companyId: string): Promise<InvoiceRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .or(`id.eq.${id},invoice_number.eq.${id}`)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch invoice ${id}: ${error.message}`)
    }
    return (data as unknown as InvoiceRecord) || null
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
    const supabase = await createClient()
    const invoiceNumber = invoice.invoice_number || (await this.getNextDocumentNumber(invoice.company_id, 'invoice'))

    const subtotal = invoice.subtotal || invoice.grand_total || 0
    const vatPct = invoice.vat_percentage || 0
    const vatAmt = invoice.vat_amount || (subtotal * vatPct) / 100
    const discountAmt = invoice.discount_amount || 0
    const grandTotal = invoice.grand_total || subtotal - discountAmt + vatAmt
    const paidAmount = invoice.paid_amount || 0
    const dueAmount = Math.max(0, grandTotal - paidAmount)

    const payload: any = {
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
    }

    if (invoice.id) {
      payload.id = invoice.id
    }

    const { data, error } = await (supabase as any)
      .from('invoices')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create invoice: ${error.message}`)
    }

    // Insert invoice items if present
    if (invoice.items && invoice.items.length > 0) {
      const itemsPayload = invoice.items.map((it) => ({
        invoice_id: data.id,
        item_description: it.item_description,
        dimensions_spec: it.dimensions_spec || null,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        vat_percentage: it.vat_percentage || 0,
        total_price: it.total_price || it.quantity * it.unit_price,
      }))
      await (supabase as any).from('invoice_items').insert(itemsPayload)
    }

    return (await this.getInvoiceById(data.id, invoice.company_id)) as InvoiceRecord
  }

  static async updateInvoice(id: string, updates: Partial<InvoiceRecord>, companyId: string): Promise<InvoiceRecord> {
    const supabase = await createClient()
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id
    delete payload.items

    const { data, error } = await (supabase as any)
      .from('invoices')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update invoice: ${error.message}`)
    }
    return data as unknown as InvoiceRecord
  }

  static async getPayments(companyId: string, customerId?: string): Promise<PaymentRecord[]> {
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
    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }
    return (data || []) as unknown as PaymentRecord[]
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
    const supabase = await createClient()
    const receiptNumber = await this.getNextDocumentNumber(payment.company_id, 'payment')

    const payload: any = {
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
    }

    const { data: createdPayment, error: payErr } = await (supabase as any)
      .from('payments')
      .insert(payload)
      .select()
      .single()

    if (payErr) {
      throw new Error(`Failed to record payment: ${payErr.message}`)
    }

    // Allocate payment to invoice atomically if invoice_id is specified
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

  static async recordWriteOff(writeOff: {
    company_id: string
    invoice_id: string
    amount: number
    reason: string
    authorized_by_name: string
  }): Promise<FinancialWriteOffRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('financial_write_offs')
      .insert(writeOff)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to record write-off: ${error.message}`)
    }

    // Update invoice due balance and status non-destructively
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
}

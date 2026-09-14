// ==============================================================================
// InkFlow ERP SaaS - Dedicated SaaS Billing & Invoicing Service
// Manages SaaS Subscription Invoices, Line Items, Credits, and Receipts.
// Strictly isolated from Tenant Customer Sales Invoices.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import type {
  SaasSubscriptionInvoiceRecord,
  SaasSubscriptionInvoiceItemRecord,
  BillingInterval,
  PaymentGatewayType,
} from '../types/subscription.types.ts'
import { SubscriptionService } from './subscription.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import { formatDate } from '../lib/formatters.ts'

const isValidUuid = (str?: string | null): boolean => {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
}

export class SaasBillingService {
  /**
   * Generates a new official SaaS Subscription Invoice with sequential numbering (SAAS-INV-YYYY-XXXXX)
   */
  static async generateInvoice(params: {
    companyId: string
    planId: string
    billingInterval: BillingInterval
    subtotal: number
    discountAmount?: number
    taxAmount?: number
    notes?: string
  }): Promise<SaasSubscriptionInvoiceRecord> {
    const admin = createAdminClient()
    const {
      companyId,
      planId,
      billingInterval,
      subtotal,
      discountAmount = 0,
      taxAmount = 0,
      notes,
    } = params

    const plan = await SubscriptionService.getPlanById(planId)
    const sub = await SubscriptionService.getTenantSubscription(companyId)

    const now = new Date()
    const year = now.getFullYear()
    const periodStart = now.toISOString()
    const periodDays = billingInterval === 'yearly' ? 365 : 30
    const periodEnd = new Date(now.getTime() + periodDays * 86400000).toISOString()
    const dueDate = new Date(now.getTime() + 3 * 86400000).toISOString()
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount)

    let invoiceNumber = `SAAS-INV-${year}-${Math.floor(10000 + Math.random() * 90000)}`

    // Count existing invoices for sequential numbering
    try {
      const { count } = await (admin as any)
        .from('saas_subscription_invoices')
        .select('*', { count: 'exact', head: true })
      const seq = (count || 0) + 1
      invoiceNumber = `SAAS-INV-${year}-${String(seq).padStart(5, '0')}`
    } catch {}

    const invoicePayload = {
      company_id: isValidUuid(companyId) ? companyId : null,
      subscription_id: isValidUuid(sub?.id) ? sub.id : null,
      invoice_number: invoiceNumber,
      plan_id: isValidUuid(plan.id) ? plan.id : null,
      plan_code: plan.code,
      plan_name: plan.name,
      plan_version: plan.version || 1,
      billing_interval: billingInterval,
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: 'BDT',
      due_date: dueDate,
      status: 'unpaid',
      notes: notes || `SaaS Subscription Invoice for ${plan.name} (${billingInterval})`,
      created_at: periodStart,
      updated_at: periodStart,
    }

    let createdInvoice: SaasSubscriptionInvoiceRecord | null = null

    if (isValidUuid(companyId)) {
      try {
        const { data: inv, error } = await (admin as any)
          .from('saas_subscription_invoices')
          .insert(invoicePayload)
          .select()
          .single()

        if (!error && inv) {
          createdInvoice = inv as SaasSubscriptionInvoiceRecord

          // Insert line items
          await (admin as any).from('saas_subscription_invoice_items').insert([
            {
              invoice_id: inv.id,
              description: `${plan.name} (${billingInterval === 'yearly' ? 'Yearly Plan' : 'Monthly Plan'})`,
              item_type: 'plan_fee',
              quantity: 1,
              unit_price: subtotal,
              total_price: subtotal,
            },
            ...(discountAmount > 0
              ? [
                  {
                    invoice_id: inv.id,
                    description: 'Promotional / Proration Discount',
                    item_type: 'discount',
                    quantity: 1,
                    unit_price: -discountAmount,
                    total_price: -discountAmount,
                  },
                ]
              : []),
            ...(taxAmount > 0
              ? [
                  {
                    invoice_id: inv.id,
                    description: 'Standard VAT (Tax)',
                    item_type: 'vat',
                    quantity: 1,
                    unit_price: taxAmount,
                    total_price: taxAmount,
                  },
                ]
              : []),
          ])
        }
      } catch (dbErr) {
        console.warn('[SaasBillingService] DB invoice creation warning:', dbErr)
      }
    }

    if (!createdInvoice) {
      createdInvoice = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        company_id: companyId,
        subscription_id: sub?.id,
        invoice_number: invoiceNumber,
        plan_id: plan.id,
        plan_code: plan.code,
        plan_name: plan.name,
        plan_version: plan.version || 1,
        billing_interval: billingInterval,
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: 'BDT',
        due_date: dueDate,
        status: 'unpaid',
        payment_method: null,
        notes: notes || null,
        items: [
          {
            id: `item-${Date.now()}-1`,
            invoice_id: `inv-${Date.now()}`,
            description: `${plan.name} (${billingInterval})`,
            item_type: 'plan_fee',
            quantity: 1,
            unit_price: subtotal,
            total_price: subtotal,
            created_at: periodStart,
          },
        ],
        created_at: periodStart,
        updated_at: periodStart,
      }
    }

    // Persist in DataStore cache
    const existingInvoices = PrintERPDataStore.get<SaasSubscriptionInvoiceRecord[]>(STORAGE_KEYS.SAAS_INVOICES) || []
    PrintERPDataStore.set(STORAGE_KEYS.SAAS_INVOICES, [createdInvoice, ...existingInvoices], false)

    return createdInvoice
  }

  /**
   * Settles an unpaid SaaS invoice upon verified payment
   */
  static async settleInvoice(params: {
    invoiceId: string
    transactionId: string
    paymentMethod: PaymentGatewayType | string
    paidAmount: number
  }): Promise<{ success: boolean; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()
    const { invoiceId, transactionId, paymentMethod } = params

    try {
      if (isValidUuid(invoiceId)) {
        await (admin as any)
          .from('saas_subscription_invoices')
          .update({
            status: 'paid',
            payment_method: paymentMethod,
            gateway_transaction_id: isValidUuid(transactionId) ? transactionId : null,
            paid_at: now,
            updated_at: now,
          })
          .eq('id', invoiceId)
      }

      // Update in DataStore cache
      const memInvoices = PrintERPDataStore.get<SaasSubscriptionInvoiceRecord[]>(STORAGE_KEYS.SAAS_INVOICES) || []
      const updated = memInvoices.map((inv) => {
        if (inv.id === invoiceId || inv.invoice_number === invoiceId) {
          return {
            ...inv,
            status: 'paid' as const,
            payment_method: paymentMethod,
            paid_at: now,
            updated_at: now,
          }
        }
        return inv
      })
      PrintERPDataStore.set(STORAGE_KEYS.SAAS_INVOICES, updated, false)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to settle SaaS invoice.' }
    }
  }

  /**
   * Voids an unpaid SaaS invoice with an audited reason
   */
  static async voidInvoice(
    invoiceId: string,
    reason: string,
    actorId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    try {
      if (isValidUuid(invoiceId)) {
        const { data: inv } = await (admin as any)
          .from('saas_subscription_invoices')
          .select('company_id, invoice_number, status')
          .eq('id', invoiceId)
          .maybeSingle()

        if (!inv) return { success: false, error: 'Invoice not found.' }
        if (inv.status === 'paid') return { success: false, error: 'Cannot void a paid invoice.' }

        await (admin as any)
          .from('saas_subscription_invoices')
          .update({
            status: 'void',
            notes: `Voided: ${reason}`,
            updated_at: now,
          })
          .eq('id', invoiceId)

        if (inv.company_id) {
          await SubscriptionService.recordSubscriptionEvent({
            company_id: inv.company_id,
            event_type: 'CREDIT_ADJUSTMENT',
            reason: `Invoice ${inv.invoice_number} voided: ${reason}`,
            performed_by: actorId,
          })
        }
      }

      // Update in DataStore cache
      const memInvoices = PrintERPDataStore.get<SaasSubscriptionInvoiceRecord[]>(STORAGE_KEYS.SAAS_INVOICES) || []
      const updated = memInvoices.map((inv) => {
        if (inv.id === invoiceId || inv.invoice_number === invoiceId) {
          return {
            ...inv,
            status: 'void' as const,
            notes: `Voided: ${reason}`,
            updated_at: now,
          }
        }
        return inv
      })
      PrintERPDataStore.set(STORAGE_KEYS.SAAS_INVOICES, updated, false)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to void SaaS invoice.' }
    }
  }

  /**
   * Issues a manual credit adjustment to a tenant company
   */
  static async issueCreditAdjustment(params: {
    companyId: string
    amount: number
    reason: string
    actorId?: string
  }): Promise<{ success: boolean; creditInvoiceId?: string; error?: string }> {
    const { companyId, amount, reason, actorId } = params
    if (amount <= 0) return { success: false, error: 'Credit amount must be greater than zero.' }

    try {
      const sub = await SubscriptionService.getTenantSubscription(companyId)
      const invoice = await this.generateInvoice({
        companyId,
        planId: sub.plan_id,
        billingInterval: sub.billing_interval,
        subtotal: 0,
        discountAmount: amount,
        taxAmount: 0,
        notes: `Platform Credit Adjustment: ${reason}`,
      })

      await SubscriptionService.recordSubscriptionEvent({
        company_id: companyId,
        event_type: 'CREDIT_ADJUSTMENT',
        reason: `Credit of ৳${amount} issued: ${reason}`,
        amount,
        currency: 'BDT',
        performed_by: actorId,
      })

      return { success: true, creditInvoiceId: invoice.id }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to issue credit adjustment.' }
    }
  }

  /**
   * Fetches all SaaS subscription invoices for a tenant company
   */
  static async getCompanyInvoices(companyId: string): Promise<SaasSubscriptionInvoiceRecord[]> {
    const admin = createAdminClient()
    try {
      if (isValidUuid(companyId)) {
        const { data: invs, error } = await (admin as any)
          .from('saas_subscription_invoices')
          .select('*, items:saas_subscription_invoice_items(*)')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (!error && invs && invs.length > 0) {
          return invs as SaasSubscriptionInvoiceRecord[]
        }
      }
    } catch {}

    // Check DataStore cache
    const memInvoices = PrintERPDataStore.get<SaasSubscriptionInvoiceRecord[]>(STORAGE_KEYS.SAAS_INVOICES) || []
    const tenantInvoices = memInvoices.filter((i) => i.company_id === companyId)
    if (tenantInvoices.length > 0) {
      return tenantInvoices
    }

    // Fallback: convert any gateway transactions into invoice representation
    const legacyInvoices = await SubscriptionService.getTenantInvoices(companyId)
    return legacyInvoices.map((leg) => ({
      id: leg.id,
      company_id: companyId,
      invoice_number: leg.invoice_number,
      plan_code: 'starter',
      plan_name: leg.plan_name,
      plan_version: 1,
      billing_interval: leg.billing_interval,
      billing_period_start: leg.billing_date,
      billing_period_end: leg.due_date,
      subtotal: leg.amount,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: leg.amount,
      currency: 'BDT',
      due_date: leg.due_date,
      status: leg.status as any,
      payment_method: leg.payment_method,
      paid_at: leg.status === 'paid' ? leg.billing_date : null,
      created_at: leg.billing_date,
      updated_at: leg.billing_date,
    }))
  }

  /**
   * Fetches single SaaS invoice by ID with line items
   */
  static async getInvoiceById(invoiceId: string): Promise<SaasSubscriptionInvoiceRecord | null> {
    const admin = createAdminClient()
    try {
      if (isValidUuid(invoiceId)) {
        const { data: inv, error } = await (admin as any)
          .from('saas_subscription_invoices')
          .select('*, items:saas_subscription_invoice_items(*), company:companies(name, slug)')
          .eq('id', invoiceId)
          .maybeSingle()

        if (!error && inv) {
          return inv as SaasSubscriptionInvoiceRecord
        }
      }
    } catch {}

    const memInvoices = PrintERPDataStore.get<SaasSubscriptionInvoiceRecord[]>(STORAGE_KEYS.SAAS_INVOICES) || []
    return memInvoices.find((i) => i.id === invoiceId || i.invoice_number === invoiceId) || null
  }
}

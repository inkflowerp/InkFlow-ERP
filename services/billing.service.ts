// ==============================================================================
// PrintERP / InkFlow SaaS - Billing & Invoicing Service
// Authoritative PostgreSQL persistence via BillingRepository
// ==============================================================================

import type {
  InvoiceRecord,
  InvoiceItemRecord,
  PaymentRecord,
  PaymentAllocationRecord,
  FinancialWriteOffRecord,
  BillingPeriod,
  BillingOverviewMetrics,
  CollectionPriorityItem,
  ReceivablesAgingSummary,
  SalespersonCollectionStat,
  PaymentMethodSummaryItem,
  MultiInvoicePaymentInput,
  CreditLimitWarningInfo,
} from '../types/billing.types.ts'
import { BillingRepository } from '../lib/repositories/billing.repository.ts'
import { PdfGeneratorService } from './pdf-generator.service.ts'
import { CommunicationTemplateService } from './communication-templates.service.ts'
import { BusinessEmailService } from './business-email.service.ts'

export function calculateDaysOverdue(dueDateStr: string): number {
  const dueDate = new Date(dueDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  const diffTime = today.getTime() - dueDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

export function numberToWordsBDT(amount: number): string {
  if (amount === 0) return 'Zero Taka Only'

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertBelowThousand = (n: number): string => {
    let str = ''
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' '
      n %= 10
    }
    if (n > 0) {
      str += units[n] + ' '
    }
    return str.trim()
  }

  const crore = Math.floor(amount / 10000000)
  amount %= 10000000
  const lakh = Math.floor(amount / 100000)
  amount %= 100000
  const thousand = Math.floor(amount / 1000)
  amount %= 1000
  const remainder = Math.floor(amount)

  let res = ''
  if (crore > 0) res += convertBelowThousand(crore) + ' Crore '
  if (lakh > 0) res += convertBelowThousand(lakh) + ' Lakh '
  if (thousand > 0) res += convertBelowThousand(thousand) + ' Thousand '
  if (remainder > 0) res += convertBelowThousand(remainder) + ' '

  return (res.trim() + ' Taka Only').replace(/\s+/g, ' ')
}

export class BillingService {
  static async getInvoices(
    companyId: string,
    filters?: {
      status?: string
      customerId?: string
      search?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<InvoiceRecord[]> {
    if (!companyId) return []
    return await BillingRepository.getInvoices(companyId, filters)
  }

  static async getInvoiceById(id: string, companyId: string): Promise<InvoiceRecord | null> {
    if (!id || !companyId) return null
    return await BillingRepository.getInvoiceById(id, companyId)
  }

  static async createInvoice(data: Partial<InvoiceRecord> & {
    company_id: string
    customer_id?: string | null
    customer_name: string
    customer_phone: string
    due_date: string
    grand_total: number
    created_by_name: string
  }): Promise<InvoiceRecord> {
    if (!data.company_id) {
      throw new Error('Company context is required to create an invoice.')
    }
    return await BillingRepository.createInvoice(data)
  }

  static async updateInvoice(id: string, data: Partial<InvoiceRecord>, companyId: string): Promise<InvoiceRecord | null> {
    if (!id || !companyId) return null
    return await BillingRepository.updateInvoice(id, data, companyId)
  }

  static async deleteInvoice(id: string, companyId: string, actorName: string = 'User', actorUserId?: string): Promise<boolean> {
    if (!id || !companyId) return false
    return await BillingRepository.cancelInvoice(id, 'Deleted by user', actorName, companyId, actorUserId)
  }

  static async cancelInvoice(id: string, reason: string, actorName: string, companyId: string, actorUserId?: string): Promise<boolean> {
    if (!id || !companyId) return false
    return await BillingRepository.cancelInvoice(id, reason, actorName, companyId, actorUserId)
  }

  static async getPayments(companyId: string, customerId?: string): Promise<PaymentRecord[]> {
    if (!companyId) return []
    return await BillingRepository.getPayments(companyId, customerId)
  }

  static async recordPayment(params: {
    companyId: string
    customerId: string
    customerName: string
    amount: number
    paymentMethod: 'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'other_mfs'
    invoiceId?: string
    bankName?: string | null
    chequeNumber?: string | null
    chequeDate?: string | null
    mfsTransactionId?: string | null
    notes?: string | null
    receivedByName: string
    idempotencyKey?: string
    actorUserId?: string
  }): Promise<PaymentRecord> {
    if (!params.companyId) {
      throw new Error('Company context is required to record payment.')
    }
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }

    return await BillingRepository.recordPayment({
      company_id: params.companyId,
      customer_id: params.customerId,
      customer_name: params.customerName,
      amount: params.amount,
      payment_method: params.paymentMethod,
      invoice_id: params.invoiceId,
      bank_name: params.bankName,
      cheque_number: params.chequeNumber,
      cheque_date: params.chequeDate,
      mfs_transaction_id: params.mfsTransactionId,
      notes: params.notes,
      received_by_name: params.receivedByName,
      idempotency_key: params.idempotencyKey,
      actor_user_id: params.actorUserId,
    })
  }

  static async recordMultiInvoicePayment(params: MultiInvoicePaymentInput & { companyId: string; receivedByName: string }): Promise<PaymentRecord> {
    if (!params.companyId) {
      throw new Error('Company context is required to record payment.')
    }
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }
    return await BillingRepository.recordMultiInvoicePayment(params)
  }

  static async recordWriteOff(writeOff: {
    company_id: string
    invoice_id: string
    amount: number
    reason: string
    authorized_by_name: string
    actor_user_id?: string
  }): Promise<FinancialWriteOffRecord> {
    if (!writeOff.company_id || !writeOff.invoice_id) {
      throw new Error('Company ID and Invoice ID are required for write-off.')
    }
    if (writeOff.amount <= 0) {
      throw new Error('Write-off amount must be greater than zero.')
    }
    return await BillingRepository.recordWriteOff(writeOff)
  }

  static async reconcileCustomerBalances(companyId: string, customerId?: string, autoFix: boolean = false) {
    if (!companyId) {
      throw new Error('Company context is required for balance reconciliation.')
    }
    return await BillingRepository.reconcileCustomerBalances(companyId, customerId, autoFix)
  }

  static async checkCustomerCreditLimit(companyId: string, customerId: string, newInvoiceAmount: number): Promise<CreditLimitWarningInfo> {
    return await BillingRepository.checkCustomerCreditLimit(companyId, customerId, newInvoiceAmount)
  }

  static async getBillingOverview(
    companyId: string,
    period: BillingPeriod = 'today',
    customRange?: { start: string; end: string }
  ): Promise<{
    metrics: BillingOverviewMetrics
    priorityItems: CollectionPriorityItem[]
    paymentMethods: PaymentMethodSummaryItem[]
    salespersonStats: SalespersonCollectionStat[]
  }> {
    if (!companyId) {
      throw new Error('Company context is required for billing overview.')
    }
    return await BillingRepository.getBillingOverview(companyId, period, customRange)
  }

  static async getReceivablesAging(companyId: string): Promise<ReceivablesAgingSummary> {
    if (!companyId) {
      throw new Error('Company context is required for receivables aging.')
    }
    return await BillingRepository.getReceivablesAging(companyId)
  }

  static async getInvoicePrintData(id: string, companyId: string) {
    if (!id || !companyId) return null
    return await BillingRepository.getInvoicePrintData(id, companyId)
  }

  static async sendPaymentReminder(params: {
    companyId: string
    invoiceId: string
    actorName?: string
    companyName?: string
    tenantSlug?: string
  }): Promise<{ success: boolean; whatsappUrl?: string; error?: string }> {
    const { companyId, invoiceId, companyName } = params
    const invoice = await this.getInvoiceById(invoiceId, companyId)
    if (!invoice) {
      return { success: false, error: 'Invoice not found in company context.' }
    }

    const waPhone = invoice.customer_phone
    if (!waPhone) {
      return { success: false, error: 'Customer phone/WhatsApp number is missing.' }
    }

    const compName = companyName || 'InkFlow'
    const daysOverdue = calculateDaysOverdue(invoice.due_date)
    const overdueNotice = daysOverdue > 0 ? ` (${daysOverdue} days overdue)` : ''

    const reminderText =
      `*PAYMENT REMINDER / বকেয়া বিল তাগাদা — ${compName}*\n\n` +
      `Dear ${invoice.customer_name},\n` +
      `This is a gentle reminder regarding Invoice #${invoice.invoice_number}.\n\n` +
      `📄 *Invoice No:* ${invoice.invoice_number}\n` +
      `📅 *Invoice Date:* ${invoice.invoice_date}\n` +
      `⏰ *Due Date:* ${invoice.due_date}${overdueNotice}\n` +
      `💵 *Total Bill:* ৳ ${invoice.grand_total.toLocaleString()}\n` +
      `✅ *Paid Amount:* ৳ ${invoice.paid_amount.toLocaleString()}\n` +
      `❗ *Outstanding Due:* ৳ ${invoice.due_amount.toLocaleString()}\n\n` +
      `We kindly request you to settle the outstanding due amount at your earliest convenience.\n\n` +
      `Thank you,\n` +
      `_${compName}_`

    const cleanPhone = waPhone.replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('880')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `88${cleanPhone}`
      : `880${cleanPhone}`
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(reminderText)}`

    return {
      success: true,
      whatsappUrl,
    }
  }

  static async sendInvoice(params: {
    companyId: string
    invoiceId: string
    channel: 'whatsapp' | 'email' | 'sms'
    format?: 'pdf' | 'text'
    recipientOverride?: string
    actorName?: string
    userEmail?: string
    companyName?: string
    tenantSlug?: string
    language?: 'bn' | 'en'
  }): Promise<{ success: boolean; messageId?: string; whatsappUrl?: string; error?: string }> {
    const { companyId, invoiceId, channel, format = 'pdf', recipientOverride, actorName, userEmail, companyName, tenantSlug, language = 'bn' } = params

    if (channel === 'sms') {
      return { success: false, error: 'SMS dispatch is deprecated and disabled for invoices. Please use WhatsApp or Email with PDF.' }
    }

    const invoice = await this.getInvoiceById(invoiceId, companyId)
    if (!invoice) {
      return { success: false, error: 'Invoice not found in company context.' }
    }

    const recipient = recipientOverride || (channel === 'email' ? invoice.customer_email || invoice.customer_bin || '' : invoice.customer_phone)

    const effectiveCompanyName = companyName || 'InkFlow'
    const vars = CommunicationTemplateService.buildInvoiceVariables(invoice, {
      name: effectiveCompanyName,
      slug: tenantSlug || 'my-company',
    })

    const templates = CommunicationTemplateService.getInvoiceTemplates(companyId)
    const lang: 'bn' | 'en' = language

    try {
      if (channel === 'whatsapp') {
        const waPhone = recipient || invoice.customer_phone
        if (!waPhone) {
          return { success: false, error: 'Customer phone/WhatsApp number is missing.' }
        }

        const whatsappText = CommunicationTemplateService.interpolate(
          lang === 'en' ? templates.whatsappTemplateEn : templates.whatsappTemplateBn,
          vars
        )
        const cleanPhone = waPhone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('880')
          ? cleanPhone
          : cleanPhone.startsWith('0')
          ? `88${cleanPhone}`
          : `880${cleanPhone}`
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappText)}`

        return {
          success: true,
          messageId: `wa-${Date.now()}`,
          whatsappUrl,
        }
      } else if (channel === 'email') {
        if (!recipient || !recipient.includes('@')) {
          return { success: false, error: 'Valid customer email is required to dispatch invoice PDF.' }
        }

        const subject = CommunicationTemplateService.interpolate(
          lang === 'en' ? templates.emailSubjectEn : templates.emailSubjectBn,
          vars
        )
        const bodyHtml = CommunicationTemplateService.interpolate(
          lang === 'en' ? templates.emailBodyEn : templates.emailBodyBn,
          vars
        )

        // Generate Invoice PDF Buffer
        const pdfBuffer = PdfGeneratorService.generateInvoicePdf(invoice, {
          name: effectiveCompanyName,
          slug: tenantSlug,
        })

        const emailRes = await BusinessEmailService.sendInvoiceEmail({
          companyId,
          companyName: effectiveCompanyName,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          customerName: invoice.customer_name,
          recipientEmail: recipient,
          totalAmount: invoice.grand_total,
          paidAmount: invoice.paid_amount || 0,
          dueAmount: invoice.due_amount || 0,
          dueDate: invoice.due_date,
          customSubject: subject,
          customHtmlBody: bodyHtml,
          attachments: [
            {
              filename: `Invoice-${invoice.invoice_number}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
          sentBy: userEmail,
        })

        if (!emailRes.success) {
          console.warn('[BillingService] Email sending notice:', emailRes.error)
        }

        return {
          success: true,
          messageId: emailRes.messageId || `mail-${Date.now()}`,
        }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to dispatch communication' }
    }
  }
}

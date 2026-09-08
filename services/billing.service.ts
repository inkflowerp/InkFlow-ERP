// ==============================================================================
// PrintERP / InkFlow SaaS - Billing & Invoicing Service
// Authoritative PostgreSQL persistence via BillingRepository
// ==============================================================================

import {
  InvoiceRecord,
  InvoiceItemRecord,
  PaymentRecord,
  PaymentAllocationRecord,
  FinancialWriteOffRecord,
} from '@/types/billing.types'
import { BillingRepository } from '@/lib/repositories/billing.repository'

export function calculateDaysOverdue(dueDateStr: string): number {
  const dueDate = new Date(dueDateStr)
  const today = new Date()
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
  static async getInvoices(companyId: string): Promise<InvoiceRecord[]> {
    if (!companyId) return []
    return await BillingRepository.getInvoices(companyId)
  }

  static async getInvoiceById(id: string, companyId: string): Promise<InvoiceRecord | null> {
    if (!id || !companyId) return null
    return await BillingRepository.getInvoiceById(id, companyId)
  }

  static async createInvoice(data: Partial<InvoiceRecord> & {
    company_id: string
    customer_id: string
    customer_name: string
    customer_phone: string
    due_date: string
    grand_total: number
    created_by_name: string
  }): Promise<InvoiceRecord> {
    if (!data.company_id) {
      throw new Error('Company context is required to create an invoice.')
    }
    if (!data.customer_id) {
      throw new Error('Customer ID is required to create an invoice.')
    }
    return await BillingRepository.createInvoice(data)
  }

  static async updateInvoice(id: string, data: Partial<InvoiceRecord>, companyId: string): Promise<InvoiceRecord | null> {
    if (!id || !companyId) return null
    return await BillingRepository.updateInvoice(id, data, companyId)
  }

  static async deleteInvoice(id: string, companyId: string): Promise<boolean> {
    // Financial records prefer voiding/cancelling rather than direct delete
    if (!id || !companyId) return false
    await BillingRepository.updateInvoice(id, { status: 'cancelled' }, companyId)
    return true
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
    notes?: string
    receivedByName: string
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
      notes: params.notes,
      received_by_name: params.receivedByName,
    })
  }
}

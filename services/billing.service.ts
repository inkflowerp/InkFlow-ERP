import {
  InvoiceRecord,
  InvoiceItemRecord,
  PaymentRecord,
  PaymentAllocationRecord,
  FinancialWriteOffRecord,
} from '@/types/billing.types'

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



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class BillingService {
  static async getInvoices(companyId: string = 'c-01'): Promise<InvoiceRecord[]> {
    const invoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    return invoices.filter((i) => !i.company_id || i.company_id === companyId)
  }

  static async getInvoiceById(id: string, companyId: string = 'c-01'): Promise<InvoiceRecord | null> {
    const invoices = await this.getInvoices(companyId)
    return invoices.find((i) => i.id === id || i.invoice_number === id) || null
  }

  static async createInvoice(data: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const id = data.id || `inv-${Date.now()}`
    const num = data.invoice_number || `INV-2024-00${Math.floor(Math.random() * 900) + 100}`
    const newInvoice: InvoiceRecord = {
      id,
      company_id: data.company_id || 'c-01',
      invoice_number: num,
      invoice_type: data.invoice_type || 'sales_invoice',
      sales_order_id: data.sales_order_id || `ord-${Date.now()}`,
      customer_id: data.customer_id || 'cust-01',
      customer_name: data.customer_name || 'Customer',
      customer_phone: data.customer_phone || '+8801711000000',
      customer_address: data.customer_address || 'Dhaka',
      invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
      due_date: data.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: data.status || 'unpaid',
      subtotal: data.subtotal || 0,
      discount_amount: data.discount_amount || 0,
      vat_percentage: data.vat_percentage || 7.5,
      vat_amount: data.vat_amount || 0,
      grand_total: data.grand_total || 0,
      paid_amount: data.paid_amount || 0,
      due_amount: data.due_amount || (data.grand_total || 0) - (data.paid_amount || 0),
      write_off_amount: data.write_off_amount || 0,
      created_by_name: data.created_by_name || 'Billing Officer',
      items: data.items || [],
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, newInvoice)
    return newInvoice
  }

  static async updateInvoice(id: string, data: Partial<InvoiceRecord>): Promise<InvoiceRecord | null> {
    return PrintERPDataStore.updateItem<InvoiceRecord>(STORAGE_KEYS.INVOICES, id, data)
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.INVOICES, id)
  }

  static async getPayments(customerId?: string): Promise<PaymentRecord[]> {
    const payments = PrintERPDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []
    if (customerId) return payments.filter((p) => p.customer_id === customerId)
    return payments
  }

  static async recordPayment(params: {
    customerId: string
    orderId?: string
    invoiceId?: string
    amount: number
    paymentMethod: string
    notes?: string
    receivedByName?: string
  }): Promise<PaymentRecord> {
    return PrintERPDataStore.recordPaymentCollection(params)
  }
}


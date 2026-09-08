import {
  QuotationRecord,
  QuotationActivityRecord,
  QuotationStatus,
} from '@/types/quotation.types'

export const DEFAULT_QUOTATION_TERMS = `1. Payment Terms: 50% advance with work order confirmation, balance upon delivery or invoice.
2. Proof Approval: Color tone and typography must be approved by the client via digital soft proof before production.
3. Delivery Timeline: Estimated delivery within 3 to 5 working days from final proof sign-off.
4. Tax Compliance: All rates are subject to standard NBR Value Added Tax (VAT) under Mushak-6.3.
5. Validity: This quotation remains valid for 15 days from the date of issuance.`

export const DEFAULT_QUOTATION_TERMS_BN = `১. মূল্য পরিশোধ: কার্যাদেশ নিশ্চিতের সাথে ৫০% অগ্রিম এবং ডেলিভারির সময় অবশিষ্ট বিল পরিশোধযোগ্য।
২. প্রুফ অনুমোদন: ডিজিটাল সফট প্রুফ দেখে ক্লায়েন্ট কর্তৃক বানান ও রঙের শেড নিশ্চিত করতে হবে।
৩. ডেলিভারির সময়: চূড়ান্ত প্রুফ অনুমোদনের পরবর্তী ৩ থেকে ৫ কার্যদিবসের মধ্যে সরবরাহ করা হবে।
৪. ট্যাক্স ও ভ্যাট: জাতীয় রাজস্ব বোর্ডের মূসক-৬.৩ চালান অনুযায়ী প্রযোজ্য ভ্যাট ধার্য করা হয়েছে।
৫. মেয়াদের শর্ত: এই উদ্ধৃতিপত্রটি জারির তারিখ হতে পরবর্তী ১৫ দিন পর্যন্ত বলবৎ থাকবে।`



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { SalesOrderRecord } from '@/types/order.types'

export class QuotationService {
  static async getQuotations(companyId: string = 'c-01'): Promise<QuotationRecord[]> {
    const quotes = PrintERPDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []
    return quotes.filter((q) => !q.company_id || q.company_id === companyId)
  }

  static async getQuotationById(id: string, companyId: string = 'c-01'): Promise<QuotationRecord | null> {
    const quotes = await this.getQuotations(companyId)
    return quotes.find((q) => q.id === id || q.quotation_number === id) || null
  }

  static async createQuotation(data: Partial<QuotationRecord>): Promise<QuotationRecord> {
    const id = data.id || `quo-${Date.now()}`
    const num = data.quotation_number || `QUO-0000${Math.floor(Math.random() * 900) + 100}`
    const newQuote: QuotationRecord = {
      id,
      company_id: data.company_id || 'c-01',
      quotation_number: num,
      customer_id: data.customer_id || 'cust-01',
      customer_name: data.customer_name || 'Customer',
      customer_name_bn: data.customer_name_bn || null,
      customer_phone: data.customer_phone || '+8801711000000',
      customer_email: data.customer_email || null,
      customer_address: data.customer_address || null,
      customer_bin: data.customer_bin || null,
      status: data.status || 'draft',
      quotation_date: data.quotation_date || new Date().toISOString().split('T')[0],
      valid_until: data.valid_until || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      salesperson_id: data.salesperson_id || 'usr-001',
      salesperson_name: data.salesperson_name || 'Sales Representative',
      language_mode: data.language_mode || 'bn',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      discount_amount: data.discount_amount || 0,
      vat_rate: data.vat_rate || 7.5,
      vat_amount: data.vat_amount || 0,
      grand_total: data.grand_total || 0,
      total_cost: data.total_cost || Math.round((data.grand_total || 0) * 0.65),
      margin_percent: data.margin_percent || 35,
      terms_and_conditions: data.terms_and_conditions || DEFAULT_QUOTATION_TERMS,
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, newQuote)
    return newQuote
  }

  static async updateQuotation(id: string, data: Partial<QuotationRecord>): Promise<QuotationRecord | null> {
    return PrintERPDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, id, data)
  }

  static async deleteQuotation(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.QUOTATIONS, id)
  }

  static async convertToOrder(quoteId: string): Promise<SalesOrderRecord | null> {
    return PrintERPDataStore.convertQuotationToSalesOrder(quoteId)
  }

  static async getActivities(quotationId: string): Promise<QuotationActivityRecord[]> {
    const activities = PrintERPDataStore.get<QuotationActivityRecord[]>(STORAGE_KEYS.QUOTATION_ACTIVITIES) || []
    return activities.filter((a) => a.quotation_id === quotationId)
  }

  static async addActivity(activity: QuotationActivityRecord): Promise<QuotationActivityRecord[]> {
    return PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATION_ACTIVITIES, activity)
  }
}


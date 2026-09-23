import type { SalesOrderRecord, OrderPriority, JobOrderRecord } from '@/types/order.types'
import type { InvoiceRecord } from '@/types/billing.types'

export type OrderStage =
  | 'all'
  | 'new_orders'
  | 'in_design'
  | 'in_production'
  | 'ready_delivery'
  | 'delivered'

export interface OrderItemSpec {
  id: string
  itemName: string
  dimensions?: string
  width?: number
  height?: number
  dimensionUnit?: string
  quantity: number
  unit: string
  unitPrice?: number
  totalPrice?: number
  materialSpec?: string
  finishing?: string
  itemKind?: 'service' | 'ready_product' | 'material' | 'outsource' | 'custom' | 'custom_manufacturing'
  workflowRouting?: 'ready_product' | 'design_required' | 'design_ok' | 'ready_production' | 'custom' | 'outsource' | string
  designRequired?: boolean
  notes?: string
}

export interface UnifiedOrderRecord {
  id: string
  orderNumber: string
  invoiceNumber?: string
  invoiceId?: string
  origin: 'invoice_created' | 'sales_order' | 'work_order' | 'quotation'
  customerId?: string
  customerName: string
  customerNameBn?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  customerType?: string
  isWalkIn?: boolean
  items: OrderItemSpec[]
  itemsCount: number
  priority: OrderPriority
  orderDate: string
  deliveryDate: string
  createdAt: string
  stage: OrderStage
  paymentStatus: 'paid' | 'partial' | 'unpaid'
  totalAmount: number
  advanceAmount: number
  dueAmount: number
  salespersonName?: string
  notes?: string
  rawOrder?: SalesOrderRecord
  rawInvoice?: InvoiceRecord
}

export type OrderWhatsAppTemplateKey =
  | 'order_confirmed'
  | 'design_proof'
  | 'ready_pickup'
  | 'payment_reminder'

export interface OrderWhatsAppTemplate {
  key: OrderWhatsAppTemplateKey
  title: string
  badge: string
}

export const ORDER_WHATSAPP_TEMPLATES: OrderWhatsAppTemplate[] = [
  { key: 'order_confirmed', title: '১. অর্ডার নিশ্চিতকরণ ও রসিদ', badge: 'অগ্রিম গ্রহণ' },
  { key: 'design_proof', title: '২. ডিজাইন প্রুফ প্রস্তুত', badge: 'অনুমোদন' },
  { key: 'ready_pickup', title: '৩. প্রিন্ট সম্পন্ন ও ডেলিভারি রেডি', badge: 'ডেলিভারি চালান' },
  { key: 'payment_reminder', title: '৪. বাকি টাকা ও ডেলিভারি নোটিশ', badge: 'বাকি আদায়' },
]

export function sanitizeBangladeshiPhone(rawPhone?: string | null): string {
  if (!rawPhone) return '8801700000000'
  let cleaned = rawPhone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = `88${cleaned}`
  } else if (!cleaned.startsWith('88') && cleaned.length > 0) {
    cleaned = `880${cleaned}`
  }
  return cleaned || '8801700000000'
}

export function buildBangladeshiOrderWhatsAppMessage({
  template,
  customerName,
  companyName,
  orderNumber,
  invoiceNumber,
  totalAmount,
  advanceAmount,
  dueAmount,
  deliveryDate,
  itemsSummary,
}: {
  template: OrderWhatsAppTemplateKey
  customerName: string
  companyName: string
  orderNumber: string
  invoiceNumber?: string | null
  totalAmount: number
  advanceAmount: number
  dueAmount: number
  deliveryDate?: string
  itemsSummary: string
}): string {
  const custName = customerName || 'সম্মানিত গ্রাহক'
  const comp = companyName || 'PrintERP Press Studio'
  const docNum = orderNumber || (invoiceNumber ? `#${invoiceNumber}` : 'ORD-001')
  const invStr = invoiceNumber ? ` (ইনভয়েস: #${invoiceNumber})` : ''

  if (template === 'design_proof') {
    return (
      `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
      `আপনার অর্ডার *${docNum}*${invStr}-এর কাজের ডিজাইন ড্রাফট প্রুফ প্রস্তুত হয়েছে।\n\n` +
      `📋 কাজের বিবরণ: ${itemsSummary}\n\n` +
      `দয়া করে বানান, সাইজ এবং কালার ভালো করে দেখে নিশ্চিত করুন। কোনো সংশোধন থাকলে এখনই জানান, আর সব ঠিক থাকলে *অনুমোদিত* অথবা *OK* লিখে জানান।\n\n` +
      `ধন্যবাদ,\n${comp}`
    )
  }

  if (template === 'ready_pickup') {
    return (
      `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
      `খুশির সংবাদ! আপনার অর্ডার *${docNum}*${invStr}-এর প্রিন্টিং ও ফিনিশিং সম্পন্ন হয়েছে এবং ডেলিভারির জন্য প্রস্তুত রয়েছে।\n\n` +
      `📦 কাজের বিবরণ: ${itemsSummary}\n` +
      `💰 মোট বিল: ৳${totalAmount.toLocaleString()}\n` +
      `💵 অগ্রিম প্রদান: ৳${advanceAmount.toLocaleString()}\n` +
      `⚠️ অবশিষ্ট বাকি: ৳${dueAmount.toLocaleString()}\n\n` +
      `কাউন্টার থেকে ডেলিভারি গ্রহণ করার সময় চালান ও বাকি টাকা পরিশোধের অনুরোধ করা হলো।\n\n` +
      `ধন্যবাদ,\n${comp}`
    )
  }

  if (template === 'payment_reminder') {
    return (
      `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
      `আপনার অর্ডার *${docNum}*${invStr}-এর কাজ প্রস্তুত রয়েছে।\n\n` +
      `💰 মোট বিল: ৳${totalAmount.toLocaleString()}\n` +
      `💵 পরিশোধিত: ৳${advanceAmount.toLocaleString()}\n` +
      `⚠️ বকেয়া বাকি: ৳${dueAmount.toLocaleString()}\n\n` +
      `অনুগ্রহ করে বকেয়া টাকা পরিশোধ করে ডেলিভারি বুঝে নেওয়ার অনুরোধ করা যাচ্ছে।\n\n` +
      `ধন্যবাদ,\n${comp}`
    )
  }

  // Default: 'order_confirmed'
  return (
    `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
    `${comp}-এ আপনার প্রিন্ট অর্ডার *${docNum}*${invStr} সফলভাবে বুকিং ও গ্রহণ করা হয়েছে।\n\n` +
    `📋 কাজের বিবরণ: ${itemsSummary}\n` +
    `📅 সম্ভাব্য ডেলিভারি: ${deliveryDate || 'শীঘ্রই'}\n` +
    `💰 মোট অর্ডার মূল্য: ৳${totalAmount.toLocaleString()}\n` +
    `💵 অগ্রিম গ্রহণ: ৳${advanceAmount.toLocaleString()}\n` +
    `⚠️ অবশিষ্ট বাকি: ৳${dueAmount.toLocaleString()}\n\n` +
    `কাজের অগ্রগতি সম্পর্কে হোয়াটসঅ্যাপে আপডেট প্রদান করা হবে।\n\n` +
    `ধন্যবাদ,\n${comp}`
  )
}

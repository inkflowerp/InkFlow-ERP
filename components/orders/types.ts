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

export type OrderLiveStatus =
  | 'design_queue'
  | 'design_running'
  | 'waiting_approval'
  | 'print_queue'
  | 'printing'
  | 'finishing_pending'
  | 'ready_delivery'
  | 'delivered'

export interface OrderLiveStatusConfig {
  id: OrderLiveStatus
  labelEn: string
  labelBn: string
  stage: OrderStage
  color: string
  dotColor: string
}

export const ORDER_LIVE_STATUSES: OrderLiveStatusConfig[] = [
  {
    id: 'design_queue',
    labelEn: 'Design Queue',
    labelBn: 'ডিজাইন কিউ',
    stage: 'in_design',
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'design_running',
    labelEn: 'Design Running',
    labelBn: 'ডিজাইন চলমান',
    stage: 'in_design',
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'waiting_approval',
    labelEn: 'Waiting for Design Approval',
    labelBn: 'ডিজাইন অনুমোদনের অপেক্ষায়',
    stage: 'in_design',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    dotColor: 'bg-indigo-500',
  },
  {
    id: 'print_queue',
    labelEn: 'Print Queue',
    labelBn: 'প্রিন্ট কিউ',
    stage: 'in_production',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
    dotColor: 'bg-cyan-500',
  },
  {
    id: 'printing',
    labelEn: 'Printing',
    labelBn: 'প্রিন্টিং চলমান',
    stage: 'in_production',
    color: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    dotColor: 'bg-violet-500',
  },
  {
    id: 'finishing_pending',
    labelEn: 'Finishing Pending',
    labelBn: 'ফিনিশিং পেন্ডিং',
    stage: 'in_production',
    color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    dotColor: 'bg-orange-500',
  },
  {
    id: 'ready_delivery',
    labelEn: 'Ready for Delivery',
    labelBn: 'ডেলিভারির জন্য প্রস্তুত',
    stage: 'ready_delivery',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'delivered',
    labelEn: 'Delivered',
    labelBn: 'ডেলিভারি সম্পন্ন',
    stage: 'delivered',
    color: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    dotColor: 'bg-slate-500',
  },
]

function toEnglishDigits(str: string): string {
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  }
  return str.replace(/[০-৯]/g, (d) => bnToEn[d] || d)
}

export function formatOrderItemQuantityAndUnit(
  item: OrderItemSpec,
  tBilingual: (en: string, bn: string) => string
): string {
  let width = Number(item.width) || 0
  let height = Number(item.height) || 0
  let dimUnit = (item.dimensionUnit || 'ft').toLowerCase()
  const qty = Number(item.quantity) || 1

  // Parse if width/height missing but dimensions string is like "30 × 5 sft" or "30x5"
  if ((!width || !height) && item.dimensions) {
    const normalized = toEnglishDigits(item.dimensions)
    const match = normalized.match(/([\d.]+)\s*(?:×|x|\*)\s*([\d.]+)(?:\s*([a-zA-Z]+))?/i)
    if (match) {
      width = parseFloat(match[1]) || 0
      height = parseFloat(match[2]) || 0
      if (match[3]) dimUnit = match[3].toLowerCase()
    } else {
      const singleAreaMatch = normalized.match(/^([\d.]+)\s*(?:sft|sqft|বর্গফুট)/i)
      if (singleAreaMatch) {
        const areaVal = parseFloat(singleAreaMatch[1]) || 0
        if (areaVal > 0) {
          const areaFormatted = Number.isInteger(areaVal) ? areaVal.toString() : areaVal.toFixed(1)
          const areaUnitStr = tBilingual('sft', 'বর্গফুট')
          const pcsStr = tBilingual('pcs', 'টি')
          return `${areaFormatted} ${areaUnitStr} (${qty} ${pcsStr})`
        }
      }
    }
  }

  if (width > 0 && height > 0) {
    // Dimensional area item (wide format banner, vinyl, sticker, pvc, etc.)
    let totalArea = 0
    if (dimUnit === 'inch' || dimUnit === 'in') {
      totalArea = (width * height * qty) / 144
    } else {
      totalArea = width * height * qty
    }

    const areaFormatted = Number.isInteger(totalArea) ? totalArea.toString() : totalArea.toFixed(1)
    const areaUnitStr = tBilingual('sft', 'বর্গফুট')
    const pcsStr = tBilingual('pcs', 'টি')

    return `${areaFormatted} ${areaUnitStr} (${qty} ${pcsStr})`
  }

  // Non-dimensional items (ready product, cards, books, etc.)
  let unitDisplay = item.unit || 'pcs'
  if (unitDisplay.toLowerCase() === 'pcs') unitDisplay = tBilingual('pcs', 'পিস')
  else if (unitDisplay.toLowerCase() === 'sft') unitDisplay = tBilingual('sft', 'বর্গফুট')
  else if (unitDisplay.toLowerCase() === 'set') unitDisplay = tBilingual('set', 'সেট')
  else if (unitDisplay.toLowerCase() === 'pack') unitDisplay = tBilingual('pack', 'প্যাক')
  else if (unitDisplay.toLowerCase() === 'box') unitDisplay = tBilingual('box', 'বক্স')

  return `${qty} ${unitDisplay}`
}

export interface UnifiedOrderRecord {
  id: string
  orderNumber: string
  invoiceNumber?: string
  invoiceId?: string
  jobNumber?: string
  jobOrderId?: string
  origin: 'invoice_created' | 'sales_order' | 'work_order' | 'quotation' | 'job_order'
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
  currentStatus?: OrderLiveStatus
  paymentStatus: 'paid' | 'partial' | 'unpaid'
  totalAmount: number
  advanceAmount: number
  dueAmount: number
  salespersonName?: string
  notes?: string
  rawOrder?: SalesOrderRecord
  rawInvoice?: InvoiceRecord
  rawJob?: JobOrderRecord
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
  titleEn: string
  titleBn: string
  badgeEn: string
  badgeBn: string
}

export const ORDER_WHATSAPP_TEMPLATES: OrderWhatsAppTemplate[] = [
  {
    key: 'order_confirmed',
    title: '১. অর্ডার নিশ্চিতকরণ ও রসিদ',
    badge: 'অগ্রিম গ্রহণ',
    titleEn: '1. Order Intake & Confirmation',
    titleBn: '১. অর্ডার নিশ্চিতকরণ ও রসিদ',
    badgeEn: 'Advance Received',
    badgeBn: 'অগ্রিম গ্রহণ',
  },
  {
    key: 'design_proof',
    title: '২. ডিজাইন প্রুফ প্রস্তুত',
    badge: 'অনুমোদন',
    titleEn: '2. Design Proof Ready',
    titleBn: '২. ডিজাইন প্রুফ প্রস্তুত',
    badgeEn: 'Proof Approval',
    badgeBn: 'অনুমোদন',
  },
  {
    key: 'ready_pickup',
    title: '৩. প্রিন্ট সম্পন্ন ও ডেলিভারি রেডি',
    badge: 'ডেলিভারি চালান',
    titleEn: '3. Print Complete & Delivery Ready',
    titleBn: '৩. প্রিন্ট সম্পন্ন ও ডেলিভারি রেডি',
    badgeEn: 'Ready for Dispatch',
    badgeBn: 'ডেলিভারি চালান',
  },
  {
    key: 'payment_reminder',
    title: '৪. বাকি টাকা ও ডেলিভারি নোটিশ',
    badge: 'বাকি আদায়',
    titleEn: '4. Due Balance & Delivery Notice',
    titleBn: '৪. বাকি টাকা ও ডেলিভারি নোটিশ',
    badgeEn: 'Due Recovery',
    badgeBn: 'বাকি আদায়',
  },
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

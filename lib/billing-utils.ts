// ==============================================================================
// PrintERP / InkFlow SaaS - Pure Client-Safe Billing Utilities & Formatters
// Zero server dependencies (safe for Client Components & SSR)
// ==============================================================================

import type { InvoiceRecord, InvoiceItemRecord } from '../types/billing.types'

export type IndustrialSector = 'digital_print' | 'offset_print' | 'signage_fabrication' | 'ready_merchandise' | 'custom'

/**
 * Resolves the primary industrial printing sector of an invoice
 * based on item categories, presets, and technical specifications.
 */
export function getSectorForInvoice(invoice: InvoiceRecord): IndustrialSector {
  if (!invoice.items || invoice.items.length === 0) return 'digital_print'

  const hasDigital = invoice.items.some(
    (it: any) =>
      it.category_preset === 'digital_print' ||
      it.category_preset === 'digital' ||
      it.category_preset === 'flex' ||
      (it.item_name && /(flex|banner|vinyl|sticker|mesh|eco-solvent|solvent|backlight vinyl|frosted|rollup|x-banner)/i.test(it.item_name)) ||
      (it.item_description && /(flex|banner|vinyl|sticker|mesh|eco-solvent|solvent|backlight vinyl|frosted|rollup|x-banner)/i.test(it.item_description))
  )

  const hasSignage = invoice.items.some(
    (it: any) =>
      it.category_preset === 'signage_fabrication' ||
      it.category_preset === 'signage' ||
      it.product_type === 'fabrication_service' ||
      Boolean(it.signage_specs) ||
      (it.item_name && /(acrylic|signboard|neon|3d letter|channel letter|box pipe|ss letter|metal letter|glow sign|light box)/i.test(it.item_name)) ||
      (it.item_description && /(acrylic|signboard|neon|3d letter|channel letter|box pipe|ss letter|metal letter|glow sign|light box)/i.test(it.item_description))
  )

  const hasOffset = invoice.items.some(
    (it: any) =>
      it.category_preset === 'offset_print' ||
      it.category_preset === 'offset' ||
      Boolean(it.offset_specs) ||
      (it.item_name && /(visiting card|cash memo|challan|pad|leaflet|flyer|brochure|carton|book|calendar|envelope|folder|gsm|ncr|ctp plate)/i.test(it.item_name)) ||
      (it.item_description && /(visiting card|cash memo|challan|pad|leaflet|flyer|brochure|carton|book|calendar|envelope|folder|gsm|ncr|ctp plate)/i.test(it.item_description))
  )

  const hasMerchandise = invoice.items.some(
    (it: any) =>
      it.category_preset === 'ready_merchandise' ||
      it.category_preset === 'merchandise' ||
      it.category_preset === 'ready' ||
      it.item_kind === 'ready_product' ||
      (it.item_name && /(mug|t-shirt|crest|trophy|id card|lanyard|cap|gift|wooden base)/i.test(it.item_name)) ||
      (it.item_description && /(mug|t-shirt|crest|trophy|id card|lanyard|cap|gift|wooden base)/i.test(it.item_description))
  )

  if (hasDigital && !Boolean(invoice.items.some((it: any) => Boolean(it.signage_specs)))) {
    return 'digital_print'
  }

  if (hasSignage) return 'signage_fabrication'
  if (hasOffset) return 'offset_print'
  if (hasMerchandise) return 'ready_merchandise'
  if (hasDigital) return 'digital_print'

  return 'digital_print'
}

/**
 * Generates customer-facing text message for WhatsApp Invoice Dispatch
 */
export function generateInvoiceTextMessage(
  invoice: InvoiceRecord,
  companyName: string | null = 'InkFlow',
  paymentAccounts?: { bkash?: string | null; nagad?: string | null; bank?: string | null }
): string {
  const effectiveCompanyName = companyName || 'InkFlow'
  const bkash = paymentAccounts?.bkash || '01700-000000'
  const nagad = paymentAccounts?.nagad || '01800-000000'
  const bank = paymentAccounts?.bank || 'Dutch-Bangla Bank / City Bank'

  const itemsSummary = (invoice.items || [])
    .slice(0, 4)
    .map((it, idx) => `  ${idx + 1}. ${it.item_name || it.item_description} (${it.quantity} ${it.unit || 'pcs'}) - ৳${(it.total_price || 0).toLocaleString('en-BD')}`)
    .join('\n')
  const moreItems = (invoice.items || []).length > 4 ? `\n  ...এবং আরও ${(invoice.items || []).length - 4}টি আইটেম` : ''

  return `আসসালামু আলাইকুম / আদাব ${invoice.customer_name} ভাই/ম্যাডাম,
*${effectiveCompanyName}* থেকে আপনার ইনভয়েস ও বিল কপি প্রস্তুত করা হয়েছে।

📄 *ইনভয়েস নম্বর (Invoice No):* #${invoice.invoice_number}
📅 *তারিখ (Date):* ${invoice.invoice_date}
⏰ *পরিশোধের শেষ তারিখ (Due Date):* ${invoice.due_date}

📦 *আইটেম ও স্পেসিফিকেশন:*
${itemsSummary}${moreItems}

━━━━━━━━━━━━━━━━━━━━
• উপমোট (Subtotal): ৳${Number(invoice.subtotal).toLocaleString('en-BD')}
${invoice.discount_amount > 0 ? `• বিশেষ ছাড় (Discount): -৳${Number(invoice.discount_amount).toLocaleString('en-BD')}\n` : ''}${invoice.vat_amount > 0 ? `• মূসক/ভ্যাট (${invoice.vat_percentage}%): +৳${Number(invoice.vat_amount).toLocaleString('en-BD')}\n` : ''}*• সর্বমোট বিল (Grand Total): ৳${Number(invoice.grand_total).toLocaleString('en-BD')} BDT*
• পরিশোধিত (Paid): ৳${Number(invoice.paid_amount || 0).toLocaleString('en-BD')}
*• প্রদেয় বকেয়া (Due Balance): ৳${Number(invoice.due_amount).toLocaleString('en-BD')} BDT*

📱 *মূল্য পরিশোধের অফিশিয়াল মাধ্যম:*
• bKash / Nagad: ${bkash} / ${nagad}
• Bank: ${bank}

ধন্যবাদান্তে,
*${effectiveCompanyName}*`
}

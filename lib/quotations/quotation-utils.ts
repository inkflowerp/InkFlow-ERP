// ==============================================================================
// PrintERP SaaS - Quotation Pure Business & Presentation Utilities
// Client-safe calculation, validation, formatting and status evaluation utilities.
// Free of any server/database/network dependencies.
// ==============================================================================

import type { QuotationRecord } from '../../types/quotation.types.ts'

/**
 * Timezone-safe local date parser preventing UTC midnight offset shifts
 */
export function parseDateSafe(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date()
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim()
    // Plain YYYY-MM-DD date format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-')
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day)
      }
    }
    // ISO timestamp with time or timezone
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate())
  }
  return new Date()
}

/**
 * Translates validity date into business meaning and visual urgency
 */
export function calculateExpiryUrgency(validUntil: string): {
  label: string
  urgency: 'critical' | 'warning' | 'normal' | 'expired'
  daysLeft: number
} {
  if (!validUntil) return { label: 'No validity date', urgency: 'normal', daysLeft: 999 }

  try {
    const trimmed = String(validUntil).trim()
    let targetDateStr = ''
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      targetDateStr = trimmed.slice(0, 10)
    } else {
      const d = new Date(trimmed)
      if (isNaN(d.getTime())) {
        return { label: 'No validity date', urgency: 'normal', daysLeft: 999 }
      }
      targetDateStr = d.toISOString().split('T')[0]
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const targetUtc = new Date(targetDateStr + 'T00:00:00Z')
    const todayUtc = new Date(todayStr + 'T00:00:00Z')

    if (isNaN(targetUtc.getTime()) || isNaN(todayUtc.getTime())) {
      return { label: 'No validity date', urgency: 'normal', daysLeft: 999 }
    }

    const diffTime = targetUtc.getTime() - todayUtc.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      const pastDays = Math.abs(diffDays)
      return {
        label: pastDays === 1 ? 'Expired yesterday' : `Expired ${pastDays} days ago`,
        urgency: 'expired',
        daysLeft: diffDays,
      }
    }
    if (diffDays === 0) {
      return { label: 'Expires today', urgency: 'critical', daysLeft: 0 }
    }
    if (diffDays === 1) {
      return { label: 'Expires tomorrow', urgency: 'critical', daysLeft: 1 }
    }
    if (diffDays <= 3) {
      return { label: `Expires in ${diffDays} days`, urgency: 'warning', daysLeft: diffDays }
    }
    return { label: `Expires in ${diffDays} days`, urgency: 'normal', daysLeft: diffDays }
  } catch {
    return { label: 'No validity date', urgency: 'normal', daysLeft: 999 }
  }
}

/**
 * Intelligently derives the Next Action for an active quotation
 */
export function calculateNextAction(quote: QuotationRecord): string {
  if (quote.status === 'converted') {
    if (quote.converted_order_id && quote.converted_invoice_id) {
      return 'Converted to Order & Invoice'
    }
    if (quote.converted_order_id) {
      return `Converted to Order #${quote.converted_order_id}`
    }
    return 'Converted to Invoice'
  }

  if (quote.status === 'approved') {
    return 'Approved — Convert to Job Order / Invoice'
  }

  if (quote.status === 'rejected') {
    return 'Rejected — Review client feedback'
  }

  const expiry = calculateExpiryUrgency(quote.valid_until)
  if (expiry.urgency === 'expired') {
    return 'Expired — Follow up for revised quote'
  }

  if (quote.follow_up_date) {
    const fDate = parseDateSafe(quote.follow_up_date)
    fDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (fDate <= today) {
      return 'Follow up today (Scheduled)'
    }
  }

  if (quote.status === 'negotiation') {
    return 'Customer is negotiating — Finalize price'
  }

  if (quote.status === 'viewed') {
    return 'Customer viewed proposal — Call for decision'
  }

  if (quote.status === 'sent') {
    return 'Waiting for customer response'
  }

  if (expiry.daysLeft <= 1) {
    return 'Expiring soon — Urgent follow-up'
  }

  return 'Draft — Complete & Send to Client'
}

/**
 * Aggregates 5 Commercial Sales-Control KPIs for Business Owners
 */
export function getKpiMetrics(quotes: QuotationRecord[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const safeQuotes = Array.isArray(quotes) ? quotes : []

  const activeQuotes = safeQuotes.filter(
    (q) => q.status !== 'converted' && q.status !== 'rejected' && q.status !== 'expired'
  )

  // 1. OPEN PIPELINE (Total Grand Total of active proposals)
  const openPipeline = activeQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)

  // 2. ACTIVE QUOTATIONS count
  const activeCount = activeQuotes.length

  // 3. FOLLOW-UP TODAY (Quotes with follow-up scheduled for today or overdue)
  const followUpToday = activeQuotes.filter((q) => {
    if (q.follow_up_date) {
      const d = parseDateSafe(q.follow_up_date)
      d.setHours(0, 0, 0, 0)
      return d <= today
    }
    return false
  }).length

  // 4. EXPIRING SOON (Active quotes expiring in <= 3 days)
  const expiringSoon = activeQuotes.filter((q) => {
    const exp = calculateExpiryUrgency(q.valid_until)
    return exp.urgency === 'critical' || exp.urgency === 'warning'
  }).length

  // 5. NEGOTIATING COUNT
  const negotiatingCount = quotes.filter((q) => q.status === 'negotiation').length

  // 6. CONVERTED / WON VALUE
  const wonQuotes = quotes.filter((q) => q.status === 'converted' || q.status === 'approved')
  const wonCount = wonQuotes.length
  const wonValue = wonQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0)

  return {
    openPipeline,
    activeCount,
    followUpToday,
    expiringSoon,
    negotiatingCount,
    wonCount,
    wonValue,
    totalQuotes: quotes.length,
  }
}

/**
 * Automatically identifies high-priority quotations that require owner / salesperson attention
 */
export function getNeedsAttentionQuotes(quotes: QuotationRecord[]): QuotationRecord[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const safeQuotes = Array.isArray(quotes) ? quotes : []

  return safeQuotes
    .filter((q) => {
      if (q.status === 'converted' || q.status === 'rejected') return false

      // 1. Approved but not converted
      if (q.status === 'approved') return true

      // 2. Follow-up scheduled today or overdue
      if (q.follow_up_date) {
        const fDate = parseDateSafe(q.follow_up_date)
        fDate.setHours(0, 0, 0, 0)
        if (fDate <= today) return true
      }

      // 3. Expiring today or within 3 days
      const exp = calculateExpiryUrgency(q.valid_until)
      if (exp.urgency === 'critical' || exp.urgency === 'warning') return true

      // 4. Sent for > 2 days with no follow up recorded
      if (q.status === 'sent' && !q.last_follow_up_at) {
        const sentDate = parseDateSafe(q.quotation_date || q.created_at)
        const daysOld = (today.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysOld >= 2) return true
      }

      // 5. Negotiation in progress
      if (q.status === 'negotiation') return true

      return false
    })
    .slice(0, 8)
}

/**
 * Generates customer-facing text message for WhatsApp or Email
 * Strictly shields internal notes, database IDs, and sensitive data.
 */
export function generateQuotationTextMessage(quote: QuotationRecord, companyName: string = 'InkFlow'): string {
  const itemsSummary = (quote.items || [])
    .map((it, idx) => {
      const dim = it.width > 0 && it.height > 0 ? ` (${it.width}ft × ${it.height}ft)` : ''
      return `${idx + 1}. ${it.description}${dim} - ৳${Number(it.item_total).toLocaleString('en-BD')}`
    })
    .slice(0, 4)
    .join('\n')

  const moreItems = quote.items && quote.items.length > 4 ? `\n...and ${quote.items.length - 4} more items` : ''

  return `*Quotation: ${quote.quotation_number}*
From: ${companyName}
Customer: ${quote.customer_name}${quote.customer_company ? ` (${quote.customer_company})` : ''}
Date: ${quote.quotation_date}
Valid Until: ${quote.valid_until}

*Items Summary:*
${itemsSummary}${moreItems}

Subtotal: ৳${Number(quote.subtotal).toLocaleString('en-BD')}
${quote.discount_amount > 0 ? `Discount: -৳${Number(quote.discount_amount).toLocaleString('en-BD')}\n` : ''}VAT (${quote.vat_rate}%): ৳${Number(quote.vat_amount).toLocaleString('en-BD')}
*Grand Total: ৳${Number(quote.grand_total).toLocaleString('en-BD')} BDT*

${quote.notes ? `*Notes:* ${quote.notes}\n` : ''}Thank you for your business.`
}

/**
 * Generates culturally-aware, respectful Bangladeshi WhatsApp quotation proposal
 * Includes universal greetings, BDT formatting, Advance Required (50%), and Payment Remittance Accounts
 */
export function generateBangladeshiQuotationWhatsAppMessage(
  quote: QuotationRecord,
  companyName: string = 'InkFlow Printing & Signage Solutions',
  options?: {
    bkashNumber?: string
    bankDetails?: string
  }
): string {
  const itemsSummary = (quote.items || [])
    .map((it, idx) => {
      const dim = it.width > 0 && it.height > 0 ? ` (${it.width}ft × ${it.height}ft)` : ''
      const specDetails: string[] = []
      if (it.material_spec) specDetails.push(it.material_spec)
      if ((it as any).offset_specs?.paper_gsm) specDetails.push(`${(it as any).offset_specs.paper_gsm} GSM`)
      if ((it as any).signage_specs?.frame_structure) specDetails.push((it as any).signage_specs.frame_structure)
      const specStr = specDetails.length > 0 ? ` [${specDetails.join(', ')}]` : ''
      return `${idx + 1}. ${it.description}${dim}${specStr} - ৳${Number(it.item_total).toLocaleString('en-BD')}`
    })
    .slice(0, 5)
    .join('\n')

  const moreItems = quote.items && quote.items.length > 5 ? `\n...এবং আরও ${quote.items.length - 5} টি আইটেম` : ''
  const advPct = quote.advance_percentage ?? 50
  const advAmt = quote.advance_amount ?? Math.round((quote.grand_total * advPct) / 100)
  const dueAmt = quote.due_on_delivery ?? Math.max(0, quote.grand_total - advAmt)

  const bkash = options?.bkashNumber || '01711-000000 (Merchant/Personal)'
  const bank = options?.bankDetails || 'City Bank / DBBL, A/C: 1102938471001'

  return `*আসসালামু আলাইকুম / আদাব*
সম্মানিত *${quote.customer_name}*${quote.customer_company ? ` (${quote.customer_company})` : ''},
আপনার চাহিদানুযায়ী *${companyName}*-এর বাণিজ্যিক প্রাক্কলন/কোটেশন পত্র নিম্নরূপ:

━━━━━━━━━━━━━━━━━━━━
📄 *কোটেশন নম্বর:* #${quote.quotation_number}
📅 *তারিখ:* ${quote.quotation_date}
⏳ *মেয়াদ (Valid Until):* ${quote.valid_until}
${quote.reference_no ? `📌 *রেফারেন্স/পিও:* ${quote.reference_no}\n` : ''}━━━━━━━━━━━━━━━━━━━━

📦 *আইটেম ও স্পেসিফিকেশন:*
${itemsSummary}${moreItems}

━━━━━━━━━━━━━━━━━━━━
• উপমোট (Subtotal): ৳${Number(quote.subtotal).toLocaleString('en-BD')}
${quote.discount_amount > 0 ? `• বিশেষ ছাড় (Discount): -৳${Number(quote.discount_amount).toLocaleString('en-BD')}\n` : ''}${quote.vat_amount > 0 ? `• ভ্যাট (${quote.vat_rate}%): +৳${Number(quote.vat_amount).toLocaleString('en-BD')}\n` : ''}*• সর্বমোট প্রাক্কলন: ৳${Number(quote.grand_total).toLocaleString('en-BD')} BDT*

💵 *পেমেন্ট ও অগ্রিম শর্তাবলী:*
• প্রয়োজনীয় অগ্রিম (${advPct}% Advance): *৳${Number(advAmt).toLocaleString('en-BD')}*
• অবশিষ্ট টাকা ডেলিভারির সময় প্রদেয়: ৳${Number(dueAmt).toLocaleString('en-BD')}

📱 *পেমেন্ট মাধ্যম (Official Payment Accounts):*
• bKash / Nagad: ${bkash}
• Bank: ${bank}

${quote.notes ? `📝 *বিশেষ দ্রষ্টব্য:* ${quote.notes}\n\n` : ''}উদ্ধৃতিটি পর্যালোচনা করে অনুগ্রহপূর্বক অর্ডারটি কনফার্ম করুন। আপনার ব্যবসার সার্বিক সাফল্য কামনায়—
*${companyName}*
বিক্রয় ও কাস্টমার সার্ভিস প্রতিনিধি: ${quote.salesperson_name}`
}

/**
 * Resolves the primary industrial printing sector of a quotation
 */
export function getSectorForQuotation(
  quote: QuotationRecord
): 'digital_print' | 'offset_print' | 'signage_fabrication' | 'ready_merchandise' | 'other' {
  if (!quote.items || quote.items.length === 0) return 'digital_print'
  
  // Check if any item matches specific sector
  const hasSignage = quote.items.some(
    (it) =>
      (it as any).category_preset === 'signage_fabrication' ||
      (it as any).category_preset === 'signage' ||
      it.product_type === 'fabrication_service' ||
      Boolean((it as any).signage_specs) ||
      (it.description && /(acrylic|signboard|led|letter|neon|3d|box pipe|ss letter)/i.test(it.description))
  )
  if (hasSignage) return 'signage_fabrication'

  const hasOffset = quote.items.some(
    (it) =>
      (it as any).category_preset === 'offset_print' ||
      (it as any).category_preset === 'offset' ||
      Boolean((it as any).offset_specs) ||
      (it.description && /(visiting card|cash memo|challan|pad|leaflet|flyer|brochure|carton|book|calendar|envelope|folder|gsm|ncr)/i.test(it.description))
  )
  if (hasOffset) return 'offset_print'

  const hasMerchandise = quote.items.some(
    (it) =>
      (it as any).category_preset === 'ready_merchandise' ||
      (it as any).category_preset === 'merchandise' ||
      (it as any).category_preset === 'ready' ||
      it.item_kind === 'ready_product' ||
      (it.description && /(mug|t-shirt|crest|trophy|id card|lanyard|cap|gift)/i.test(it.description))
  )
  if (hasMerchandise) return 'ready_merchandise'

  return 'digital_print'
}

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'negotiation'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted'

export type LanguageMode = 'en' | 'bn' | 'bilingual'

export type QuotationDeliveryMethod = 'customer_pickup' | 'company_delivery' | 'courier'

export type RateSource = 'custom' | 'last_invoice' | 'default' | 'override'

export interface QuotationItemRecord {
  id: string
  quotation_id?: string
  product_id?: string | null
  description: string
  description_bn?: string | null
  material_spec?: string | null
  width: number
  height: number
  dimension_unit: 'ft' | 'inch' | 'm'
  area_sft: number
  quantity: number
  unit: string
  unit_rate: number
  rate_source?: RateSource
  finishing?: string | null
  color_spec?: string | null
  artwork_required?: boolean
  installation_required?: boolean
  material_cost?: number
  labor_cost?: number
  finishing_cost?: number
  installation_cost?: number
  item_total: number
}

export interface QuotationRecord {
  id: string
  company_id: string
  quotation_number: string
  customer_id?: string | null
  customer_name: string
  customer_name_bn?: string | null
  customer_company?: string | null
  customer_phone: string
  customer_whatsapp?: string | null
  customer_email?: string | null
  customer_address?: string | null
  customer_bin?: string | null
  customer_type?: 'retail' | 'reseller' | 'corporate' | 'government' | string | null
  status: QuotationStatus
  quotation_date: string
  valid_until: string
  reference_no?: string | null // Reference / Customer PO No.
  salesperson_id?: string | null
  salesperson_name: string
  items: QuotationItemRecord[]
  subtotal: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  grand_total: number
  total_cost: number // Internal only - strictly shielded from client PDF
  margin_percent: number // Internal only
  language_mode: LanguageMode
  delivery_date?: string | null
  delivery_location?: string | null
  delivery_method?: QuotationDeliveryMethod | string | null
  installation_required?: boolean | null
  notes?: string | null // Customer-facing notes
  terms_and_conditions?: string | null // Terms & conditions
  internal_notes?: string | null // Internal notes (visible only to staff)
  follow_up_date?: string | null
  follow_up_status?: 'pending' | 'completed' | 'overdue' | null
  last_follow_up_method?: 'whatsapp' | 'phone' | 'email' | 'in_person' | 'other' | null
  last_follow_up_at?: string | null
  last_follow_up_note?: string | null
  next_action?: string | null
  follow_up_count?: number
  converted_order_id?: string | null
  converted_invoice_id?: string | null
  created_at: string
  updated_at: string
}

export type QuotationActivityAction =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'negotiated'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted'
  | 'follow_up'
  | 'status_change'

export interface QuotationActivityRecord {
  id: string
  quotation_id: string
  action: QuotationActivityAction
  details?: string | null
  actor_name: string
  created_at: string
}

export type FollowUpMethod = 'whatsapp' | 'phone' | 'email' | 'in_person' | 'other'

export type FollowUpOutcome =
  | 'interested'
  | 'negotiating'
  | 'approved'
  | 'price_high'
  | 'competitor_chosen'
  | 'postponed'
  | 'no_response'
  | 'other'

export interface RecordFollowUpPayload {
  quotationId: string
  method: FollowUpMethod
  note: string
  outcome?: FollowUpOutcome
  nextFollowUpDate?: string | null
  markResponded?: boolean
}

export interface ApplyNegotiationPayload {
  quotationId: string
  discountAmount: number
  notes?: string
}

export interface CreateQuotationItemInput {
  id?: string
  product_id?: string | null
  description: string
  description_bn?: string | null
  material_spec?: string | null
  width?: number
  height?: number
  dimension_unit?: 'ft' | 'inch' | 'm'
  area_sft?: number
  quantity: number
  unit?: string
  unit_rate: number
  rate_source?: RateSource
  finishing?: string | null
  color_spec?: string | null
  artwork_required?: boolean
  installation_required?: boolean
  material_cost?: number
  labor_cost?: number
  finishing_cost?: number
  installation_cost?: number
  item_total?: number
}

export interface CreateQuotationPayload {
  customer_id?: string | null
  new_customer?: {
    name: string
    company_name?: string
    mobile: string
    whatsapp?: string
    email?: string
    address: string
    customer_type?: 'retail' | 'reseller' | 'corporate' | 'government'
    save_customer?: boolean
  }
  customer_name?: string
  customer_name_bn?: string | null
  customer_company?: string | null
  customer_phone?: string
  customer_whatsapp?: string | null
  customer_email?: string | null
  customer_address?: string | null
  customer_bin?: string | null
  customer_type?: string | null
  quotation_date?: string
  valid_until?: string
  reference_no?: string | null
  salesperson_id?: string | null
  salesperson_name?: string
  items: CreateQuotationItemInput[]
  discount_amount?: number
  vat_rate?: number
  delivery_date?: string | null
  delivery_location?: string | null
  delivery_method?: QuotationDeliveryMethod | string | null
  installation_required?: boolean | null
  notes?: string | null
  terms_and_conditions?: string | null
  internal_notes?: string | null
  language_mode?: LanguageMode
}

export interface SendQuotationPayload {
  quotationId: string
  channel: 'whatsapp' | 'email' | 'sms'
  format: 'pdf' | 'text'
  recipientOverride?: string
}

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

/**
 * Normalizes any quotation data structure (legacy, partial, or DB) into a strongly-typed QuotationRecord.
 * Prevents missing/sparse fields from breaking filters, search, or table rendering.
 */
export function normalizeQuotationRecord(raw: any): QuotationRecord {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `quo-${Date.now()}`,
      company_id: 'c-01',
      quotation_number: 'QUO-UNKNOWN',
      customer_name: 'Unknown Customer',
      customer_phone: '',
      status: 'draft',
      quotation_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      salesperson_name: 'Sales Staff',
      items: [],
      subtotal: 0,
      discount_amount: 0,
      vat_rate: 7.5,
      vat_amount: 0,
      grand_total: 0,
      total_cost: 0,
      margin_percent: 0,
      language_mode: 'bn',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const id = String(raw.id || raw._id || raw.uuid || `quo-${raw.quotation_number || raw.quote_number || raw.number || Date.now()}`)
  const quotationNumber = String(raw.quotation_number || raw.quote_number || raw.number || raw.quotationNo || raw.reference_no || id)
  const customerName = String(raw.customer_name || raw.client_name || raw.customer || 'Valued Customer')
  const customerPhone = String(raw.customer_phone || raw.phone || raw.mobile || raw.contact || '')

  // Normalize items
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.line_items) ? raw.line_items : []
  const items: QuotationItemRecord[] = rawItems.map((it: any, idx: number) => {
    if (!it || typeof it !== 'object') {
      return {
        id: `qi-${id}-${idx + 1}`,
        quotation_id: id,
        description: 'Print Item',
        width: 0,
        height: 0,
        dimension_unit: 'ft',
        area_sft: 0,
        quantity: 1,
        unit: 'pcs',
        unit_rate: 0,
        item_total: 0,
      }
    }
    const w = Number(it.width) || 0
    const h = Number(it.height) || 0
    const qty = Math.max(1, Number(it.quantity) || 1)
    const rate = Math.max(0, Number(it.unit_rate || it.rate || it.price) || 0)
    const dimUnit = (it.dimension_unit || it.unit_dimension || 'ft') as 'ft' | 'inch' | 'm'
    let areaSft = Number(it.area_sft || it.area) || 0
    if (areaSft === 0 && w > 0 && h > 0) {
      if (dimUnit === 'inch') areaSft = Math.round(((w * h) / 144) * qty * 100) / 100
      else if (dimUnit === 'm') areaSft = Math.round(w * h * 10.7639 * qty * 100) / 100
      else areaSft = Math.round(w * h * qty * 100) / 100
    }
    const itemTotal =
      Number(it.item_total !== undefined ? it.item_total : (it.total !== undefined ? it.total : it.amount)) ||
      (areaSft > 0 ? Math.round(areaSft * rate) : Math.round(qty * rate))

    return {
      id: String(it.id || `qi-${id}-${idx + 1}`),
      quotation_id: id,
      product_id: it.product_id || null,
      description: String(it.description || it.product_name || it.name || it.title || 'Print Item'),
      description_bn: it.description_bn || null,
      material_spec: it.material_spec || it.spec || null,
      width: w,
      height: h,
      dimension_unit: dimUnit,
      area_sft: areaSft,
      quantity: qty,
      unit: it.unit || (areaSft > 0 ? 'sft' : 'pcs'),
      unit_rate: rate,
      rate_source: it.rate_source || 'default',
      finishing: it.finishing || null,
      color_spec: it.color_spec || null,
      artwork_required: Boolean(it.artwork_required),
      installation_required: Boolean(it.installation_required),
      material_cost: Number(it.material_cost) || 0,
      labor_cost: Number(it.labor_cost) || 0,
      finishing_cost: Number(it.finishing_cost) || 0,
      installation_cost: Number(it.installation_cost) || 0,
      item_total: itemTotal,
    }
  })

  // Normalize financials
  const subtotal =
    Number(raw.subtotal !== undefined ? raw.subtotal : (raw.total !== undefined ? raw.total : raw.sub_total)) ||
    items.reduce((acc, it) => acc + (it.item_total || 0), 0) ||
    Number(raw.grand_total) ||
    0
  const discountAmount = Number(raw.discount_amount || raw.discount) || 0
  const vatRate = typeof raw.vat_rate === 'number' ? raw.vat_rate : (typeof raw.vat_percentage === 'number' ? raw.vat_percentage : 7.5)
  const subAfterDiscount = Math.max(0, subtotal - discountAmount)
  const vatAmount = Number(raw.vat_amount || raw.vat) || Math.round((subAfterDiscount * vatRate) / 100)
  const grandTotal =
    Number(raw.grand_total !== undefined ? raw.grand_total : (raw.final_amount !== undefined ? raw.final_amount : raw.total_amount)) ||
    (subAfterDiscount + vatAmount)
  const totalCost = Number(raw.total_cost || raw.cost) || Math.round(subtotal * 0.55)
  const marginPercent = Number(raw.margin_percent) || (grandTotal > 0 ? Math.round(((grandTotal - totalCost) / grandTotal) * 100) : 40)

  // Normalize dates
  const createdAt = String(raw.created_at || raw.createdAt || raw.date || new Date().toISOString())
  const quotationDate = String(raw.quotation_date || raw.date || (createdAt ? createdAt.split('T')[0] : new Date().toISOString().split('T')[0]))
  const validUntil = String(raw.valid_until || raw.validUntil || raw.expiry_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0])

  // Normalize status
  const rawStatus = String(raw.status || 'draft').toLowerCase()
  const status: QuotationStatus = ['draft', 'sent', 'viewed', 'negotiation', 'approved', 'rejected', 'expired', 'converted'].includes(rawStatus)
    ? (rawStatus as QuotationStatus)
    : 'draft'

  return {
    id,
    company_id: String(raw.company_id || 'c-01'),
    quotation_number: quotationNumber,
    customer_id: raw.customer_id || null,
    customer_name: customerName,
    customer_name_bn: raw.customer_name_bn || null,
    customer_company: raw.customer_company || raw.company_name || null,
    customer_phone: customerPhone,
    customer_whatsapp: raw.customer_whatsapp || null,
    customer_email: raw.customer_email || raw.email || null,
    customer_address: raw.customer_address || raw.address || null,
    customer_bin: raw.customer_bin || raw.bin || null,
    customer_type: raw.customer_type || 'retail',
    status,
    quotation_date: quotationDate,
    valid_until: validUntil,
    reference_no: raw.reference_no || null,
    salesperson_id: raw.salesperson_id || null,
    salesperson_name: String(raw.salesperson_name || raw.salesperson || raw.created_by_name || 'Staff'),
    items,
    subtotal,
    discount_amount: discountAmount,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    grand_total: grandTotal,
    total_cost: totalCost,
    margin_percent: marginPercent,
    language_mode: (raw.language_mode as LanguageMode) || 'bn',
    delivery_date: raw.delivery_date || null,
    delivery_location: raw.delivery_location || null,
    delivery_method: raw.delivery_method || 'customer_pickup',
    installation_required: Boolean(raw.installation_required),
    notes: raw.notes || '',
    terms_and_conditions: raw.terms_and_conditions || null,
    internal_notes: raw.internal_notes || null,
    follow_up_date: raw.follow_up_date || null,
    follow_up_status: raw.follow_up_status || null,
    last_follow_up_method: raw.last_follow_up_method || null,
    last_follow_up_at: raw.last_follow_up_at || null,
    last_follow_up_note: raw.last_follow_up_note || null,
    next_action: raw.next_action || null,
    follow_up_count: Number(raw.follow_up_count) || 0,
    converted_order_id: raw.converted_order_id || null,
    converted_invoice_id: raw.converted_invoice_id || null,
    created_at: createdAt,
    updated_at: String(raw.updated_at || raw.updatedAt || createdAt),
  }
}

/**
 * Purged test/sample quotation numbers (QUO-000001 to QUO-000008)
 */
export const PURGED_QUOTATION_IDENTIFIERS = new Set<string>([
  'QUO-000001',
  'QUO-000002',
  'QUO-000003',
  'QUO-000004',
  'QUO-000005',
  'QUO-000006',
  'QUO-000007',
  'QUO-000008',
  'QUO-00001',
  'QUO-00002',
  'QUO-00003',
  'QUO-00004',
  'QUO-00005',
  'QUO-00006',
  'QUO-00007',
  'QUO-00008',
  'QUO-0001',
  'QUO-0002',
  'QUO-0003',
  'QUO-0004',
  'QUO-0005',
  'QUO-0006',
  'QUO-0007',
  'QUO-0008',
  'QUO-001',
  'QUO-002',
  'QUO-003',
  'QUO-004',
  'QUO-005',
  'QUO-006',
  'QUO-007',
  'QUO-008',
  'QUO-01',
  'QUO-02',
  'QUO-03',
  'QUO-04',
  'QUO-05',
  'QUO-06',
  'QUO-07',
  'QUO-08',
  'QUO-1',
  'QUO-2',
  'QUO-3',
  'QUO-4',
  'QUO-5',
  'QUO-6',
  'QUO-7',
  'QUO-8',
])

export function isPurgedQuotation(recordOrNumber: any): boolean {
  if (!recordOrNumber) return false
  if (typeof recordOrNumber === 'string') {
    const upper = recordOrNumber.trim().toUpperCase()
    if (!upper) return false
    if (PURGED_QUOTATION_IDENTIFIERS.has(upper)) return true
    if (/^QUO-0*([1-8])$/i.test(upper)) return true
    return false
  }

  if (typeof recordOrNumber === 'object') {
    const candidates = [
      recordOrNumber.quotation_number,
      recordOrNumber.quote_number,
      recordOrNumber.quotationNo,
      recordOrNumber.number,
      recordOrNumber.id,
      recordOrNumber.reference_no,
    ]
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        const upper = c.trim().toUpperCase()
        if (PURGED_QUOTATION_IDENTIFIERS.has(upper)) return true
        if (/^QUO-0*([1-8])$/i.test(upper)) return true
      }
    }
  }

  return false
}

/**
 * Recursively inspects any arbitrary JSON/array/object/draft/sync payload to extract quotation objects.
 */
export function extractQuotationsFromAny(input: any): any[] {
  if (!input) return []
  let parsed = input
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return []
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return []
    }
  }

  const results: any[] = []

  const inspect = (item: any) => {
    if (!item || typeof item !== 'object') return
    if (isPurgedQuotation(item)) return

    // Case A: Offline draft
    if ((item.formType === 'quotation' || item.type === 'quotation') && item.data && typeof item.data === 'object') {
      inspect(item.data)
      return
    }

    // Case B: Sync queue / Outbox payload
    if ((item.entity_type === 'quotation' || item.entityType === 'quotation') && item.payload && typeof item.payload === 'object') {
      inspect(item.payload)
      return
    }

    // Case C: Array wrappers (.data, .quotations, .quotes, .list, .items, .records)
    if (Array.isArray(item.data)) {
      item.data.forEach(inspect)
      return
    }
    if (Array.isArray(item.quotations)) {
      item.quotations.forEach(inspect)
      return
    }
    if (Array.isArray(item.quotes)) {
      item.quotes.forEach(inspect)
      return
    }
    if (Array.isArray(item.list)) {
      item.list.forEach(inspect)
      return
    }
    if (Array.isArray(item.records)) {
      item.records.forEach(inspect)
      return
    }
    if (item.state && typeof item.state === 'object') {
      inspect(item.state)
      return
    }

    // Case D: Direct quotation record
    const hasQuotationField =
      item.quotation_number ||
      item.quote_number ||
      item.quotationNo ||
      item.number ||
      item.valid_until ||
      item.validUntil ||
      item.expiry_date ||
      (item.customer_name && (item.items || item.subtotal !== undefined || item.grand_total !== undefined)) ||
      (typeof item.id === 'string' && (item.id.startsWith('quo-') || item.id.startsWith('quote-') || item.id.startsWith('q-')))

    if (hasQuotationField && !isPurgedQuotation(item)) {
      results.push(item)
    }
  }

  if (Array.isArray(parsed)) {
    parsed.forEach(inspect)
  } else if (parsed && typeof parsed === 'object') {
    inspect(parsed)
  }

  return results
}

/**
 * Deduplicates and normalizes a collection of quotation records by canonical ID and quotation number.
 */
export function deduplicateQuotations(rawList: any[], targetCompanyId?: string): QuotationRecord[] {
  const quoteMap = new Map<string, QuotationRecord>()
  const keyAliases = new Map<string, string>()

  for (const raw of rawList) {
    if (!raw || typeof raw !== 'object') continue
    if (isPurgedQuotation(raw)) continue

    const norm = normalizeQuotationRecord(raw)
    if (!norm) continue
    if (isPurgedQuotation(norm)) continue

    // Tenant isolation check: if targetCompanyId is specified and strict tenant boundary applies
    if (targetCompanyId && targetCompanyId !== 'c-01' && targetCompanyId !== 'default') {
      const cId = norm.company_id
      const isAllowed = !cId || cId === targetCompanyId || cId === 'c-01' || cId === 'default' || cId === ''
      if (!isAllowed) continue
    }

    const qNumKey = norm.quotation_number ? norm.quotation_number.toLowerCase().trim() : null
    const idKey = norm.id ? norm.id.toLowerCase().trim() : null

    // Find if either key is already registered to a canonical record
    let canonicalKey: string | null = null
    if (qNumKey && keyAliases.has(qNumKey)) {
      canonicalKey = keyAliases.get(qNumKey)!
    } else if (idKey && keyAliases.has(idKey)) {
      canonicalKey = keyAliases.get(idKey)!
    }

    if (canonicalKey && quoteMap.has(canonicalKey)) {
      const existing = quoteMap.get(canonicalKey)!
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(norm.id)
      const existingIsUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing.id)

      const timeNorm = new Date(norm.updated_at || norm.created_at || 0).getTime()
      const timeExisting = new Date(existing.updated_at || existing.created_at || 0).getTime()

      let preferred = existing
      if ((isUUID && !existingIsUUID) || ((norm.items?.length || 0) > (existing.items?.length || 0)) || (timeNorm >= timeExisting)) {
        preferred = {
          ...existing,
          ...norm,
          id: isUUID ? norm.id : (existingIsUUID ? existing.id : norm.id),
          items: (norm.items?.length || 0) >= (existing.items?.length || 0) ? norm.items : existing.items,
        }
      }

      quoteMap.set(canonicalKey, preferred)
      if (qNumKey) keyAliases.set(qNumKey, canonicalKey)
      if (idKey) keyAliases.set(idKey, canonicalKey)
    } else {
      const newCanonical = qNumKey || idKey || `quote-${Math.random()}`
      quoteMap.set(newCanonical, norm)
      if (qNumKey) keyAliases.set(qNumKey, newCanonical)
      if (idKey) keyAliases.set(idKey, newCanonical)
    }
  }

  return Array.from(quoteMap.values())
    .filter((q) => !isPurgedQuotation(q))
    .sort(
      (a, b) => new Date(b.created_at || b.quotation_date || 0).getTime() - new Date(a.created_at || a.quotation_date || 0).getTime()
    )
}



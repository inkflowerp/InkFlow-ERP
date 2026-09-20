export interface FinishingOptionItem {
  id: string
  name: string
  name_bn?: string
  rate: number
}

export interface AddOnOptionItem {
  id: string
  name: string
  name_bn?: string
  rate: number
}

export const STANDARD_FINISHING_OPTIONS: FinishingOptionItem[] = [
  { id: 'none', name: 'None', name_bn: 'কোনোটি নয়', rate: 0 },
  { id: 'eyelet', name: 'Eyelet / Grommets', name_bn: 'আইলেট / রিং পাঞ্চ', rate: 5 },
  { id: 'lam_gloss', name: 'Lamination (Gloss)', name_bn: 'গ্লসি লেমিনেশন', rate: 5 },
  { id: 'lam_matt', name: 'Lamination (Matt)', name_bn: 'ম্যাট লেমিনেশন', rate: 6 },
  { id: 'cutting', name: 'Cutting / Trim', name_bn: 'কাটিং ও ট্রিম', rate: 2 },
  { id: 'die_cutting', name: 'Die Cutting', name_bn: 'ডাই কাটিং', rate: 8 },
  { id: 'folding', name: 'Folding / Creasing', name_bn: 'ভাজ / ক্রিজিং', rate: 2 },
  { id: 'mounting_pvc', name: 'Mounting (PVC Board)', name_bn: 'পিভিসি বোর্ড মাউন্টিং', rate: 25 },
  { id: 'pocket_pipe', name: 'Pocket & Pipe', name_bn: 'পকেট ও পাইপ', rate: 10 },
  { id: 'hemming_border', name: 'Hemming / Border', name_bn: 'হেমিং ও বর্ডার', rate: 4 },
  { id: 'stitching', name: 'Stitching / Sewing', name_bn: 'সেলাই / স্টিচিং', rate: 4 },
  { id: 'perforation', name: 'Perforation', name_bn: 'ছিদ্র / পারফোরেশন', rate: 3 },
]

export const STANDARD_ADD_ON_OPTIONS: AddOnOptionItem[] = [
  { id: 'none', name: 'None', name_bn: 'কোনোটি নয়', rate: 0 },
  { id: 'pvc_pasting_3mm', name: '3mm PVC Pasting', name_bn: '৩মিমি পিভিসি পেস্টিং', rate: 45 },
  { id: 'pvc_pasting_5mm', name: '5mm PVC Pasting', name_bn: '৫মিমি পিভিসি পেস্টিং', rate: 70 },
  { id: 'acrylic_5mm', name: '5mm Acrylic Board', name_bn: '৫মিমি অ্যাক্রিলিক', rate: 180 },
  { id: 'x_stand', name: 'X-Stand Hardware', name_bn: 'এক্স-স্ট্যান্ড', rate: 50 },
  { id: 'roll_up_stand', name: 'Roll-up Stand', name_bn: 'রোল-আপ স্ট্যান্ড', rate: 100 },
  { id: 'double_tape', name: 'Double Tape / Paste', name_bn: 'ডাবল সাইড টেপ', rate: 4 },
  { id: 'corner_patch', name: 'Corner Patch Reinforce', name_bn: 'কর্নার রিইনফোর্স', rate: 5 },
  { id: 'uv_coating', name: 'UV Protective Coating', name_bn: 'ইউভি কোটিং', rate: 8 },
  { id: 'express_rush', name: 'Express / Same Day Rush', name_bn: 'জরুরি ডেলিভারি', rate: 10 },
]

export function getFinishingRate(
  nameOrId?: string | null,
  availableOptions?: Array<{ id: string; name: string; unit_price?: number; selling_price?: number }>
): number {
  if (!nameOrId || nameOrId === 'None' || nameOrId === 'none') return 0
  if (availableOptions && availableOptions.length > 0) {
    const matched = availableOptions.find((o) => o.name === nameOrId || o.id === nameOrId)
    if (matched && (matched.unit_price !== undefined || matched.selling_price !== undefined)) {
      return Number(matched.unit_price ?? matched.selling_price) || 0
    }
  }
  const std = STANDARD_FINISHING_OPTIONS.find((f) => f.name === nameOrId || f.id === nameOrId)
  return std ? std.rate : 0
}

export function getAddOnRate(
  nameOrId?: string | null,
  availableOptions?: Array<{ id: string; name: string; unit_price?: number; selling_price?: number }>
): number {
  if (!nameOrId || nameOrId === 'None' || nameOrId === 'none') return 0
  if (availableOptions && availableOptions.length > 0) {
    const matched = availableOptions.find((o) => o.name === nameOrId || o.id === nameOrId)
    if (matched && (matched.unit_price !== undefined || matched.selling_price !== undefined)) {
      return Number(matched.unit_price ?? matched.selling_price) || 0
    }
  }
  const std = STANDARD_ADD_ON_OPTIONS.find((a) => a.name === nameOrId || a.id === nameOrId)
  return std ? std.rate : 0
}

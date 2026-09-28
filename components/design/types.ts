import type { DesignJobRecord, DesignVersionRecord, DesignFormat, DesignPriority, DesignStatus } from '@/types/design.types'

export interface PreflightState {
  cmyk: boolean
  dpi300: boolean
  bleed: boolean
  curves: boolean
}

export interface PrintMachine {
  id: string
  name: string
  type: string
  specs: string
  location: string
  category: 'offset' | 'digital' | 'large_format' | 'uv' | 'finishing' | 'dtf'
}

export const PRINT_MACHINERY_LIST: PrintMachine[] = [
  {
    id: 'heidelberg_sm74',
    name: 'Heidelberg Speedmaster SM-74 (4-Color Offset)',
    type: 'Commercial Sheetfed Offset',
    specs: 'Max Sheet: 20×28 in / 28×40 in | 15,000 IPH | CTP Plates',
    location: 'Ground Floor - Main Offset Section',
    category: 'offset',
  },
  {
    id: 'konica_c1085',
    name: 'Konica Minolta AccurioPress C1085 (Digital Offset)',
    type: 'Production Digital Color',
    specs: '300-350 GSM Art Card | 13×19 in / Banner Sheet | Instant Proof',
    location: '1st Floor - Quick Digital Studio',
    category: 'digital',
  },
  {
    id: 'roland_truevis',
    name: 'Roland TrueVIS SG2-540 / 640 (Eco-Solvent Large Format)',
    type: 'Flex / Banner / Vinyl Sticker',
    specs: '10ft / 6ft Width | 1440 DPI Photo Print | Star Flex / Matte Vinyl',
    location: 'Ground Floor - Signage & Banner Section',
    category: 'large_format',
  },
  {
    id: 'docan_uv_flatbed',
    name: 'Docan / EFI Pro 24f UV Flatbed (8×4 ft Rigid)',
    type: 'UV Direct Board & Acrylic',
    specs: '8×4 ft Bed | Acrylic, PVC Foam Board, Wood, Metal | CMYK + White + Varnish',
    location: 'Signage Fabrication Floor',
    category: 'uv',
  },
  {
    id: 'graphtec_cutter',
    name: 'Graphtec FC9000 / JWEI Digital CNC Flatbed Cutter',
    type: 'Die-Cut Sticker & Creasing',
    specs: 'Optical Eye Contour Cut | Half Cut / Full Cut | Box Creasing',
    location: 'Post-Press Finishing Floor',
    category: 'finishing',
  },
  {
    id: 'epson_dtf',
    name: 'Epson SureColor F2100 DTF Textile Printer',
    type: 'Apparel & T-Shirt Direct-to-Film',
    specs: 'CMYK + White Ink | Hot Melt Powder Transfer | Apparel Printing',
    location: 'Textile Merchandise Section',
    category: 'dtf',
  },
]

export type WhatsAppTemplateKey = 'proof' | 'reminder' | 'production' | 'revision'

export interface WhatsAppTemplate {
  key: WhatsAppTemplateKey
  title: string
  badge: string
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  { key: 'proof', title: '১. ড্রাফট প্রুফ ও শর্তাবলী', badge: 'ডিজাইন প্রুফ' },
  { key: 'reminder', title: '২. জরুরি অনুমোদন তাগাদা', badge: 'দেরি হলে প্রিন্ট মিস' },
  { key: 'production', title: '৩. প্রেসে পাঠানো হয়েছে', badge: 'প্রিন্ট চালু' },
  { key: 'revision', title: '৪. সংশোধিত প্রুফ', badge: 'সংশোধিত ফাইল' },
]

export function sanitizeBangladeshiPhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = `88${cleaned}`
  } else if (!cleaned.startsWith('88') && cleaned.length > 0) {
    cleaned = `880${cleaned}`
  }
  return cleaned || '8801700000000'
}

export function buildBangladeshiWhatsAppMessage({
  template,
  customerName,
  companyName,
  jobTitle,
  jobNum,
  invoiceNum,
  dimensions,
  versionNumber,
  proofUrl,
  machineName,
}: {
  template: WhatsAppTemplateKey
  customerName: string
  companyName: string
  jobTitle: string
  jobNum: string
  invoiceNum?: string | null
  dimensions?: string | null
  versionNumber?: number
  proofUrl: string
  machineName?: string
}): string {
  const custName = customerName || 'সম্মানিত গ্রাহক'
  const comp = companyName || 'PrintERP Studio'
  const dims = dimensions || 'Standard Specification'
  const ver = versionNumber || 1
  const inv = invoiceNum ? `#${invoiceNum}` : `(Job #${jobNum})`
  const mach = machineName || 'High-Speed Commercial Press'

  if (template === 'reminder') {
    return (
      `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
      `আপনার *${jobTitle}* (জব নং: #${jobNum}) এর ডিজাইন প্রুফটি পূর্বে পাঠানো হয়েছিল।\n\n` +
      `⏰ সময়মতো প্রিন্ট ও ডেলিভারি সম্পন্ন করার জন্য অনুগ্রহ করে ডিজাইনটি দ্রুত দেখে অনুমোদন করুন অথবা কোনো পরিবর্তন থাকলে জানান।\n\n` +
      `🖼️ প্রুফ লিংক: ${proofUrl}\n\n` +
      `ধন্যবাদ,\n${comp}`
    )
  }

  if (template === 'production') {
    return (
      `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
      `খুশির সংবাদ! আপনার *${jobTitle}* (জব নং: #${jobNum}, ইনভয়েস: ${inv}) এর অনুমোদিত ডিজাইনটি সফলভাবে প্রিন্ট প্রোডাকশন ফ্লোরে পাঠানো হয়েছে।\n\n` +
      `🖨️ মেশিন ডিপার্টমেন্ট: ${mach}\n` +
      `📐 সাইজ: ${dims}\n\n` +
      `কাজটি প্রস্তুত হওয়া মাত্রই ডেলিভারি নোটিফিকেশন পাবেন ইনশাআল্লাহ।\n\n` +
      `ধন্যবাদ,\n${comp}`
    )
  }

  if (template === 'revision') {
    return (
      `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
      `আপনার নির্দেশনা মোতাবেক *${jobTitle}* (জব নং: #${jobNum}) এর ডিজাইন সংশোধন করে নতুন ভার্সন (v${ver}) প্রস্তুত করা হয়েছে।\n\n` +
      `📐 সাইজ: ${dims}\n` +
      `🖼️ সংশোধিত প্রুফ লিংক: ${proofUrl}\n\n` +
      `দয়া করে বানান, নম্বর ও সাইজ চেক করে দ্রুত কনফার্ম করুন।\n\n` +
      `ধন্যবাদ,\n${comp}`
    )
  }

  // Default: 'proof' with real-world BD legal disclaimer
  return (
    `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n` +
    `${comp}-এর পক্ষ থেকে আপনার *${jobTitle}* (জব নং: #${jobNum}) এর ডিজিটাল আর্টওয়ার্ক প্রুফ তৈরি হয়েছে।\n\n` +
    `📐 সাইজ: ${dims}\n` +
    `📄 ভার্সন: v${ver}\n` +
    `🖼️ ডিজিটাল প্রুফ দেখুন: ${proofUrl}\n\n` +
    `⚠️ *বিশেষ সতর্কবার্তা / দায়িত্ব:* \n` +
    `দয়া করে বানান, মোবাইল নম্বর, সাইজ এবং কালার ভালো করে দেখে নিশ্চিত করুন। অনুমোদনের পর কোনো ভুল থাকলে তার দায়ভার সম্পূর্ণ গ্রাহকের।\n\n` +
    `সব ঠিক থাকলে *অনুমোদিত* অথবা *OK* লিখে জানান অথবা কোনো পরিবর্তন প্রয়োজন হলে জানান।\n\n` +
    `ধন্যবাদ,\n${comp}`
  )
}

export function inferMaterialFromItemName(name?: string, fallback?: string): string | undefined {
  if (!name) return fallback || undefined
  const lower = name.toLowerCase()
  if (lower.includes('eco vinyl') || lower.includes('eco-vinyl')) return 'Eco Vinyl (ইকো ভিনাইল)'
  if (lower.includes('vinyl') || lower.includes('ভিনাইল')) return 'Vinyl Sticker (ভিনাইল স্টিকার)'
  if (lower.includes('star flex') || lower.includes('স্টার ফ্লেক্স')) return 'Star Flex Media (স্টার ফ্লেক্স)'
  if (lower.includes('flex') || lower.includes('ফ্লেক্স')) return 'Flex Banner (ফ্লেক্স ব্যানার)'
  if (lower.includes('backlit') || lower.includes('ব্যাকলিট')) return 'Backlit Film (ব্যাকলিট)'
  if (lower.includes('one way vision') || lower.includes('one-way') || lower.includes('ওয়ান ওয়ে')) return 'One Way Vision (ওয়ান ওয়ে ভিশন)'
  if (lower.includes('pvc') || lower.includes('foam')) return 'PVC Foam Board (পিভিসি বোর্ড)'
  if (lower.includes('canvas') || lower.includes('ক্যানভাস')) return 'Cotton Canvas (ক্যানভাস)'
  if (lower.includes('satin') || lower.includes('সিল্ক')) return 'Satin Fabric (সাটিন ফেব্রিক)'
  if (lower.includes('frost') || lower.includes('ফ্রস্টেড')) return 'Frosted Glass Film (ফ্রস্টেড ফিল্ম)'
  if (lower.includes('reflective') || lower.includes('রেডিয়াম')) return 'Reflective Vinyl (রেডিয়াম ভিনাইল)'
  if (lower.includes('cloth') || lower.includes('কাপড়')) return 'Cloth Media (কাপড় ব্যানার)'
  if (lower.includes('art card') || lower.includes('artcard')) return '300gsm Art Card'
  if (lower.includes('art paper') || lower.includes('artpaper')) return '150gsm Art Paper'
  if (lower.includes('visiting card') || lower.includes('business card') || lower.includes('ভিজিটিং কার্ড')) return '300gsm Matt Art Card'
  if (lower.includes('cash memo') || lower.includes('bill') || lower.includes('মেমো') || lower.includes('ক্যাশ মেমো')) return 'NCR Carbonless Paper (এনসিআর)'
  if (lower.includes('letterhead') || lower.includes('লেটারহেড')) return '100gsm Executive Bond Paper'
  if (lower.includes('envelope') || lower.includes('খাম')) return '100gsm Offset Paper'
  if (lower.includes('sticker') || lower.includes('স্টিকার')) return 'Vinyl Sticker (স্টিকার)'
  if (lower.includes('banner') || lower.includes('ব্যানার')) return 'Flex Banner (ব্যানার)'
  if (lower.includes('poster') || lower.includes('পোস্টার')) return '170gsm Art Paper'
  if (lower.includes('flyer') || lower.includes('leaflet') || lower.includes('লিফলেট')) return '120gsm Art Paper'
  if (lower.includes('brochure') || lower.includes('ব্রোশিউর')) return '150gsm Gloss Art Paper'
  if (lower.includes('id card') || lower.includes('আইডি কার্ড')) return 'PVC Card (পিভিসি কার্ড)'
  if (lower.includes('crest') || lower.includes('ক্রেস্ট')) return 'Acrylic & Wood Crest (ক্রেস্ট)'
  if (lower.includes('mug') || lower.includes('মগ')) return 'Ceramic Sublimation (সিরামিক মগ)'
  if (lower.includes('t-shirt') || lower.includes('tshirt') || lower.includes('টি-শার্ট')) return '100% Cotton Fabric (টি-শার্ট)'
  if (lower.includes('x-banner') || lower.includes('x banner')) return 'Star Flex Media (এক্স-ব্যানার)'
  if (lower.includes('rollup') || lower.includes('roll-up') || lower.includes('রোলআপ')) return 'Satin Media (রোলআপ ব্যানার)'
  return fallback || undefined
}

export interface ResolvedDesignJobSpecs {
  serviceName: string
  material: string
  size: string
  quantity: string
  finishing: string
  addOn: string
}

export function resolveDesignJobSpecs(
  job: DesignJobRecord,
  allInvoiceItems?: any[],
  tBilingual: (en: string, bn: string) => string = (en, _bn) => en
): ResolvedDesignJobSpecs {
  const itemsList: any[] =
    job.all_invoice_items && Array.isArray(job.all_invoice_items) && job.all_invoice_items.length > 0
      ? job.all_invoice_items
      : Array.isArray(allInvoiceItems)
        ? allInvoiceItems
        : []

  // Find candidate invoice item
  let matchedItem: any = null
  if (job.invoice_item_id) {
    matchedItem = itemsList.find((it: any) => it.id === job.invoice_item_id)
  }
  if (!matchedItem && job.title) {
    matchedItem = itemsList.find(
      (it: any) =>
        it.item_name === job.title ||
        it.item_description === job.title ||
        it.product_name === job.title ||
        it.description === job.title
    )
  }
  if (!matchedItem && itemsList.length === 1) {
    matchedItem = itemsList[0]
  }

  // 1. Service Name Resolution
  const isGenericTitle =
    !job.title ||
    job.title === 'Order Artwork Design' ||
    job.title === 'Design Required Item' ||
    job.title === 'Design Check Item' ||
    job.title === 'Customer Supplied File Check' ||
    job.title === 'Design Product' ||
    job.title === 'Print Item'

  let serviceName = ''
  if (matchedItem) {
    serviceName = (
      matchedItem.service_name ||
      matchedItem.item_name ||
      matchedItem.item_description ||
      matchedItem.product_name ||
      matchedItem.description ||
      ''
    ).trim()
  }
  if (!serviceName && !isGenericTitle) {
    serviceName = (job.title || job.product_name || '').trim()
  }
  if (!serviceName && job.product_name) {
    serviceName = job.product_name.trim()
  }
  if (!serviceName) {
    serviceName = job.title || tBilingual('Custom Printing Work', 'কাস্টম প্রিন্টিং কাজ')
  }

  // 2. Material Name Resolution
  let material = ''
  if (matchedItem) {
    material = (
      matchedItem.material_spec ||
      matchedItem.material ||
      matchedItem.printable_material_name ||
      ''
    ).trim()
  }
  if (!material && job.material && job.material !== job.title && job.material !== job.product_name) {
    material = job.material.trim()
  }
  if (!material) {
    material = inferMaterialFromItemName(serviceName) || ''
  }
  if (!material && matchedItem) {
    material = inferMaterialFromItemName(matchedItem.item_name || matchedItem.item_description) || ''
  }
  if (!material && job.product_name) {
    material = inferMaterialFromItemName(job.product_name) || ''
  }
  if (!material && job.instructions) {
    const match = job.instructions.match(/Material:\s*([^|\n;]+)/i)
    if (match) material = match[1].trim()
  }
  if (!material) {
    if (job.workflow_routing === 'ready_product' || matchedItem?.item_kind === 'ready_product') {
      material = tBilingual('Ready Product (In Stock)', 'রেডি পণ্য (ইন-স্টক)')
    } else if (job.workflow_routing === 'outsource' || matchedItem?.item_kind === 'outsource') {
      material = tBilingual('Outsourced Media', 'আউটসোর্স মিডিয়া')
    } else {
      material = tBilingual('Standard Media', 'স্ট্যান্ডার্ড মিডিয়া')
    }
  }

  // 3. Size / Dimensions Resolution
  let size = ''
  const w = Number(matchedItem?.width) || 0
  const h = Number(matchedItem?.height) || 0
  let dimUnit = (matchedItem?.dimension_unit || '').toLowerCase()
  if (!dimUnit || dimUnit === 'sft' || dimUnit === 'sqft' || dimUnit === 'বর্গফুট') {
    dimUnit = 'ft'
  }

  if (matchedItem?.dimensions_spec && matchedItem.dimensions_spec.trim()) {
    let cleaned = matchedItem.dimensions_spec.replace(
      /([\d.]+)\s*(?:×|x|\*)\s*([\d.]+)\s*(?:sft|sqft|বর্গফুট)/gi,
      '$1 × $2 ft'
    )
    if (/^[\d.]+\s*(?:×|x|\*)\s*[\d.]+$/.test(cleaned.trim())) {
      cleaned = `${cleaned.trim()} ${dimUnit}`
    }
    size = cleaned
  } else if (w > 0 && h > 0) {
    size = `${w} × ${h} ${dimUnit}`
  } else if (job.dimensions_spec && job.dimensions_spec.trim()) {
    let cleaned = job.dimensions_spec.replace(
      /([\d.]+)\s*(?:×|x|\*)\s*([\d.]+)\s*(?:sft|sqft|বর্গফুট)/gi,
      '$1 × $2 ft'
    )
    if (/^[\d.]+\s*(?:×|x|\*)\s*[\d.]+$/.test(cleaned.trim())) {
      cleaned = `${cleaned.trim()} ft`
    }
    size = cleaned
  } else if (matchedItem?.area_sft || job.area_sft) {
    const sftVal = matchedItem?.area_sft || job.area_sft
    size = `${sftVal} sft`
  }

  if (!size) {
    size = tBilingual('Standard Specification', 'স্ট্যান্ডার্ড সাইজ')
  }

  // 4. Quantity Resolution
  const rawQty = matchedItem?.quantity != null ? matchedItem.quantity : (job.quantity != null ? job.quantity : 1)
  const qty = Number(rawQty) || 1
  const rawUnit = matchedItem?.unit || job.unit || 'pcs'
  const unitLower = rawUnit.toLowerCase()

  let quantity = ''
  if (unitLower === 'sft' || unitLower === 'sqft') {
    quantity = `${qty} sft (1 pcs)`
  } else if (unitLower === 'pcs') {
    quantity = `${qty} ${tBilingual('pcs', 'পিস')}`
  } else {
    quantity = `${qty} ${rawUnit}`
  }

  // 5. Finishing Resolution
  let finishing = ''
  if (Array.isArray(job.selected_finishing) && job.selected_finishing.length > 0) {
    finishing = job.selected_finishing.map((f: any) => f.name || f.label || f.id || f).join(', ')
  } else if (job.finishing && job.finishing.trim()) {
    finishing = job.finishing.trim()
  } else if (Array.isArray(matchedItem?.selected_finishing) && matchedItem.selected_finishing.length > 0) {
    finishing = matchedItem.selected_finishing.map((f: any) => f.name || f.label || f.id || f).join(', ')
  } else if (matchedItem?.finishing && matchedItem.finishing.trim()) {
    finishing = matchedItem.finishing.trim()
  } else if (job.instructions) {
    const match = job.instructions.match(/Finishing:\s*([^|\n;]+)/i)
    if (match) finishing = match[1].trim()
  }
  if (!finishing || finishing.toLowerCase() === 'none' || finishing.toLowerCase() === 'null') {
    finishing = 'None'
  }

  // 6. Add-on Resolution
  let addOn = ''
  if (Array.isArray(job.selected_add_ons) && job.selected_add_ons.length > 0) {
    addOn = job.selected_add_ons.map((a: any) => a.name || a.label || a.id || a).join(', ')
  } else if ((job as any).add_on || (job as any).add_ons) {
    addOn = ((job as any).add_on || (job as any).add_ons).trim()
  } else if (Array.isArray(matchedItem?.selected_add_ons) && matchedItem.selected_add_ons.length > 0) {
    addOn = matchedItem.selected_add_ons.map((a: any) => a.name || a.label || a.id || a).join(', ')
  } else if (matchedItem?.add_on || matchedItem?.add_ons) {
    addOn = (matchedItem.add_on || matchedItem.add_ons).trim()
  } else if (job.instructions) {
    const match = job.instructions.match(/Add-?on:\s*([^|\n;]+)/i)
    if (match) addOn = match[1].trim()
  }
  if (!addOn || addOn.toLowerCase() === 'none' || addOn.toLowerCase() === 'null') {
    addOn = 'None'
  }

  return {
    serviceName,
    material,
    size,
    quantity,
    finishing,
    addOn,
  }
}

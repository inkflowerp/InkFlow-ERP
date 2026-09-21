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
    type: 'Commercial Sheetfed Offset (অফসেট)',
    specs: 'Max Sheet: 20×28 in / 28×40 in | 15,000 IPH | CTP Plates',
    location: 'Ground Floor - Main Offset Section',
    category: 'offset',
  },
  {
    id: 'konica_c1085',
    name: 'Konica Minolta AccurioPress C1085 (Digital Offset)',
    type: 'Production Digital Color (ডিজিটাল প্রিন্ট)',
    specs: '300-350 GSM Art Card | 13×19 in / Banner Sheet | Instant Proof',
    location: '1st Floor - Quick Digital Studio',
    category: 'digital',
  },
  {
    id: 'roland_truevis',
    name: 'Roland TrueVIS SG2-540 / 640 (Eco-Solvent Large Format)',
    type: 'Flex / Banner / Vinyl Sticker (লার্জ ফরম্যাট)',
    specs: '10ft / 6ft Width | 1440 DPI Photo Print | Star Flex / Matte Vinyl',
    location: 'Ground Floor - Signage & Banner Section',
    category: 'large_format',
  },
  {
    id: 'docan_uv_flatbed',
    name: 'Docan / EFI Pro 24f UV Flatbed (8×4 ft Rigid)',
    type: 'UV Direct Board & Acrylic (ইউভি ফ্ল্যাটবেড)',
    specs: '8×4 ft Bed | Acrylic, PVC Foam Board, Wood, Metal | CMYK + White + Varnish',
    location: 'Signage Fabrication Floor',
    category: 'uv',
  },
  {
    id: 'graphtec_cutter',
    name: 'Graphtec FC9000 / JWEI Digital CNC Flatbed Cutter',
    type: 'Die-Cut Sticker & Creasing (ডাই-কাটিং ও প্লটার)',
    specs: 'Optical Eye Contour Cut | Half Cut / Full Cut | Box Creasing',
    location: 'Post-Press Finishing Floor',
    category: 'finishing',
  },
  {
    id: 'epson_dtf',
    name: 'Epson SureColor F2100 DTF Textile Printer',
    type: 'Apparel & T-Shirt Direct-to-Film (টি-শার্ট ফেব্রিক)',
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
  { key: 'proof', title: '১. ড্রাফট প্রুফ (Draft Proof + Disclaimer)', badge: 'ডিজাইন প্রুফ' },
  { key: 'reminder', title: '২. জরুরী তাগাদা (Urgent Approval Reminder)', badge: 'দেরি হলে প্রিন্ট মিস' },
  { key: 'production', title: '৩. প্রেসে পাঠানো (Routed to Press)', badge: 'প্রিন্ট চালু' },
  { key: 'revision', title: '৪. সংশোধিত প্রুফ (Revision v+1)', badge: 'সংশোধিত ফাইল' },
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
      `⏰ সময়মতো প্রিন্ট ও ডেলিভারি সম্পন্ন করার জন্য অনুগ্রহ করে ডিজাইনটি দ্রুত দেখে অনুমোদন (Approve) করুন অথবা কোনো পরিবর্তন থাকলে জানান।\n\n` +
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
    `দয়া করে বানান (Spelling), মোবাইল নম্বর, সাইজ এবং কালার ভালো করে দেখে নিশ্চিত করুন। অনুমোদনের পর কোনো ভুল থাকলে তার দায়ভার সম্পূর্ণ গ্রাহকের।\n\n` +
    `সব ঠিক থাকলে *APPROVED* লিখে রিপ্লাই দিন অথবা কোনো পরিবর্তন প্রয়োজন হলে জানান।\n\n` +
    `ধন্যবাদ,\n${comp}`
  )
}

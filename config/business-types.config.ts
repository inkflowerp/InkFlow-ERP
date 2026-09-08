export interface BusinessType {
  code: string
  nameEn: string
  nameBn: string
  descriptionEn: string
  descriptionBn: string
  iconName: string
}

export const ONBOARDING_BUSINESS_TYPES: BusinessType[] = [
  {
    code: 'digital_printing',
    nameEn: 'Digital Printing',
    nameBn: 'ডিজিটাল প্রিন্টিং',
    descriptionEn: 'High-res laser & color print, brochures, business cards, documents',
    descriptionBn: 'উচ্চমানের লেজার ও কালার প্রিন্ট, ব্রোশিউর, ক্যাটালগ, ভিজিটিং কার্ড',
    iconName: 'Printer',
  },
  {
    code: 'offset_printing',
    nameEn: 'Offset Printing',
    nameBn: 'অফসেট প্রিন্টিং',
    descriptionEn: 'Books, publications, packaging boxes, memo, pad, envelopes',
    descriptionBn: 'বই, ম্যাগাজিন, প্রকাশনা, ক্যাশ মেমো, প্যাড, খাম',
    iconName: 'Layers',
  },
  {
    code: 'flex_banner',
    nameEn: 'Flex / Banner',
    nameBn: 'ফ্লেক্স / ব্যানার',
    descriptionEn: 'PVC flex, star flex, panaflex, rollup banners, vinyl',
    descriptionBn: 'পিভিসি ফ্লেক্স, স্টার ফ্লেক্স, প্যানাফ্লেক্স, রোলআপ ব্যানার',
    iconName: 'Maximize2',
  },
  {
    code: 'sticker',
    nameEn: 'Sticker & Label',
    nameBn: 'স্টিকার ও লেবেল',
    descriptionEn: 'Die-cut vinyl, paper stickers, reflective, product branding',
    descriptionBn: 'ডাই-কাট ভিনাইল, পেপার স্টিকার, রিফ্লেক্টিভ, প্রোডাক্ট ব্র্যান্ডিং',
    iconName: 'Tag',
  },
  {
    code: 'signage',
    nameEn: 'Signage & Neon',
    nameBn: 'সাইনেজ ও নিয়ন',
    descriptionEn: 'LED moving displays, 3D channel letters, backlit boards, neon signs',
    descriptionBn: 'এলইডি মুভিং ডিসপ্লে, থ্রিডি চ্যানেল লেটার, ব্যাকলিট সাইনবোর্ড',
    iconName: 'Sun',
  },
  {
    code: 'fabrication',
    nameEn: 'Fabrication & Metal',
    nameBn: 'ফেব্রিকেশন ও মেটাল',
    descriptionEn: 'MS/SS structure, truss, billboard frames, laser cutting, ACP cladding',
    descriptionBn: 'এমএস/এসএস স্ট্রাকচার, ট্রাস, বিলবোর্ড ফ্রেম, লেজার কাটিং, এসিপি ক্ল্যাডিং',
    iconName: 'Wrench',
  },
  {
    code: 'advertising_agency',
    nameEn: 'Advertising Agency',
    nameBn: 'বিজ্ঞাপনী সংস্থা (Agency)',
    descriptionEn: 'Media buying, outdoor branding, event setups, campaigns',
    descriptionBn: 'আউটডোর ব্র্যান্ডিং, ইভেন্ট সেটআপ, ক্যাম্পেইন ও প্রিন্ট ম্যানেজমেন্ট',
    iconName: 'Briefcase',
  },
  {
    code: 'hybrid',
    nameEn: 'Hybrid (Design + Print + Fabrication + Installation)',
    nameBn: 'হাইব্রিড (ডিজাইন + প্রিন্ট + ফেব্রিকেশন + ইনস্টলেশন)',
    descriptionEn: 'All-in-one comprehensive turnkey printing & installation company',
    descriptionBn: 'সম্পূর্ণ ওয়ান-স্টপ সমাধান: ডিজাইন থেকে শুরু করে সাইটে ইনস্টলেশন',
    iconName: 'Sparkles',
  },
]

// Also export alias for backwards compatibility
export const BUSINESS_TYPES = ONBOARDING_BUSINESS_TYPES

export interface DomainPreset {
  id: string
  name: string
  nameBn: string
  category: 'digital_print' | 'offset_print' | 'signage_fabrication' | 'ready_merchandise'
  categoryLabel: string
  categoryLabelBn: string
  icon: string
  description: string
  descriptionBn: string
  materialSpec: string
  itemKind: 'service' | 'ready_product' | 'material' | 'custom'
  width?: number
  height?: number
  dimensionUnit?: 'ft' | 'inch' | 'm'
  quantity: number
  unit: string
  defaultRate: number
  estimatedCostPerUnit?: number
  finishing?: string
  addOn?: string
  installationRequired?: boolean
  artworkRequired?: boolean
  offsetSpecs?: {
    paper_gsm?: number | string
    color_mode?: string
    binding_type?: string
    numbering_required?: boolean
    numbering_range?: string
    ncr_parts?: number
  }
  signageSpecs?: {
    letter_height_inch?: number
    led_module_type?: string
    led_count?: number
    power_supply_watts?: number
    frame_structure?: string
    installation_type?: string
  }
}

export const BANGLADESHI_PRINT_PRESETS: DomainPreset[] = [
  // 1. Digital & Large Format
  {
    id: 'preset-flex-frontlit',
    name: 'Pana Flex Banner (Frontlit)',
    nameBn: 'পানা ফ্লেক্স ব্যানার (ফ্রন্টলিট)',
    category: 'digital_print',
    categoryLabel: 'Large Format Digital',
    categoryLabelBn: 'লার্জ ফরম্যাট ডিজিটাল',
    icon: '🎨',
    description: 'Pana Flex Banner (Frontlit 280 GSM) with Eyelets & Hemming',
    descriptionBn: 'পানা ফ্লেক্স ব্যানার (২৮০ জিএসএম) রিং ও লাইকোনাসহ',
    materialSpec: '280 GSM Chinese Frontlit Flex',
    itemKind: 'service',
    width: 10,
    height: 4,
    dimensionUnit: 'ft',
    quantity: 1,
    unit: 'sft',
    defaultRate: 22,
    estimatedCostPerUnit: 12,
    finishing: 'Eyelets (রিং/আইলেট)',
    artworkRequired: false,
    installationRequired: false,
  },
  {
    id: 'preset-star-flex-backlit',
    name: 'Star Flex Backlit (Pana)',
    nameBn: 'স্টার ফ্লেক্স ব্যাকলিট (হেভি)',
    category: 'digital_print',
    categoryLabel: 'Large Format Digital',
    categoryLabelBn: 'লার্জ ফরম্যাট ডিজিটাল',
    icon: '✨',
    description: 'Star Backlit Flex Banner (Heavy Quality) with Framing Margin',
    descriptionBn: 'স্টার ব্যাকলিট ফ্লেক্স ব্যানার (উচ্চমানের হেভি পানা)',
    materialSpec: '380 GSM Heavy Star Backlit Flex',
    itemKind: 'service',
    width: 12,
    height: 5,
    dimensionUnit: 'ft',
    quantity: 1,
    unit: 'sft',
    defaultRate: 45,
    estimatedCostPerUnit: 24,
    finishing: 'Pocket Hemming (পাইপিং)',
    artworkRequired: false,
    installationRequired: false,
  },
  {
    id: 'preset-vinyl-matte-board',
    name: 'Vinyl Sticker on 5mm Board',
    nameBn: 'ভিনাইল স্টিকার ও ৫ মিমি বোর্ড',
    category: 'digital_print',
    categoryLabel: 'Large Format Digital',
    categoryLabelBn: 'লার্জ ফরম্যাট ডিজিটাল',
    icon: '🖼️',
    description: 'Vinyl Sticker with Matte Lamination Mounted on 5mm PVC Foam Board',
    descriptionBn: 'ম্যাট লেমিনেশনসহ ভিনাইল স্টিকার ও ৫ মিমি পিভিসি ফোম বোর্ড',
    materialSpec: '100 Micron Gloss Vinyl + 5mm PVC Board + Matte Cold Lamination',
    itemKind: 'service',
    width: 6,
    height: 4,
    dimensionUnit: 'ft',
    quantity: 1,
    unit: 'sft',
    defaultRate: 85,
    estimatedCostPerUnit: 48,
    finishing: 'Matte Lamination (ম্যাট লেমিনেশন)',
    addOn: '5mm PVC Board (৫ মিমি পিভিসি বোর্ড)',
    artworkRequired: false,
    installationRequired: false,
  },
  {
    id: 'preset-one-way-vision',
    name: 'One Way Vision (OWV)',
    nameBn: 'ওয়ান ওয়ে ভিশন গ্লাস স্টিকার',
    category: 'digital_print',
    categoryLabel: 'Large Format Digital',
    categoryLabelBn: 'লার্জ ফরম্যাট ডিজিটাল',
    icon: '🏢',
    description: 'Perforated One Way Vision Glass Sticker for Showroom / Office Glass',
    descriptionBn: 'শোরুম ও অফিসের কাঁচের জন্য ওয়ান ওয়ে ভিশন স্টিকার',
    materialSpec: '140 Micron Perforated OWV Vinyl',
    itemKind: 'service',
    width: 8,
    height: 6,
    dimensionUnit: 'ft',
    quantity: 1,
    unit: 'sft',
    defaultRate: 55,
    estimatedCostPerUnit: 30,
    finishing: 'None',
    artworkRequired: false,
    installationRequired: true,
  },
  {
    id: 'preset-rollup-banner-stand',
    name: 'Rollup Banner Stand (33"×78")',
    nameBn: 'রোলআপ ব্যানার স্ট্যান্ড সেট',
    category: 'digital_print',
    categoryLabel: 'Large Format Digital',
    categoryLabelBn: 'লার্জ ফরম্যাট ডিজিটাল',
    icon: '🎯',
    description: 'Aluminium Rollup Standee (33" × 78") with High-Res Synthetic / Star Flex Print',
    descriptionBn: 'অ্যালুমিনিয়াম রোলআপ স্ট্যান্ড (৩৩" × ৭৮") ও সিন্থেটিক প্রিন্ট সেট',
    materialSpec: 'Aluminium Stand Box + 220 GSM Synthetic Non-Tear Print',
    itemKind: 'ready_product',
    width: 0,
    height: 0,
    dimensionUnit: 'ft',
    quantity: 1,
    unit: 'set',
    defaultRate: 1650,
    estimatedCostPerUnit: 980,
    finishing: 'None',
    artworkRequired: false,
    installationRequired: false,
  },

  // 2. Offset & Commercial Packaging
  {
    id: 'preset-visiting-card-matte-spot',
    name: 'Visiting Card (Spot UV)',
    nameBn: 'ভিজিটিং কার্ড (ম্যাট + স্পট ইউভি)',
    category: 'offset_print',
    categoryLabel: 'Offset Commercial Print',
    categoryLabelBn: 'অফসেট কমার্শিয়াল প্রিন্ট',
    icon: '💳',
    description: 'Premium Visiting Cards: 300 GSM Art Card with Both-side Matte & Single-side Spot UV (1,000 pcs)',
    descriptionBn: 'উচ্চমানের ভিজিটিং কার্ড: ৩০০ জিএসএম আর্ট কার্ড, উভয় পাশে ম্যাট ও একপাশে স্পট ইউভি (১,০০০ পিস)',
    materialSpec: '300 GSM Swedish Art Card, 4/4 Color Print',
    itemKind: 'service',
    width: 0,
    height: 0,
    dimensionUnit: 'ft',
    quantity: 1000,
    unit: 'pcs',
    defaultRate: 1.4, // ৳1,400 for 1000 pcs
    estimatedCostPerUnit: 0.75,
    finishing: 'Thermal Matte + Spot UV',
    artworkRequired: false,
    offsetSpecs: {
      paper_gsm: 300,
      color_mode: '4/4 Both-side CMYK',
      binding_type: 'Box Packaging',
      numbering_required: false,
    },
  },
  {
    id: 'preset-cash-memo-3part',
    name: 'Cash Memo / Challan (3-Part)',
    nameBn: 'ক্যাশ মেমো / চালান বই (৩ পার্ট)',
    category: 'offset_print',
    categoryLabel: 'Offset Commercial Print',
    categoryLabelBn: 'অফসেট কমার্শিয়াল প্রিন্ট',
    icon: '📑',
    description: 'Cash Memo / Invoice Book (10 Books): 3-Part NCR Carbonless Paper, 1/0 Single Color Print, 50 sets per book (Serialized)',
    descriptionBn: 'ক্যাশ মেমো / ইনভয়েস বই (১০ বই): ৩ পার্ট কার্বনলেস এনসিআর পেপার, ১ রঙের প্রিন্ট, প্রতি বইয়ে ৫০ সেট (ধারাবাহিক নম্বরসহ)',
    materialSpec: '55 GSM NCR Carbonless Paper (White/Pink/Yellow), 10 Books',
    itemKind: 'service',
    width: 0,
    height: 0,
    dimensionUnit: 'ft',
    quantity: 10,
    unit: 'pcs',
    defaultRate: 180, // ৳180 per book = ৳1,800 total
    estimatedCostPerUnit: 105,
    finishing: 'Binding + Perforation + Numbering',
    artworkRequired: false,
    offsetSpecs: {
      paper_gsm: 55,
      color_mode: '1/0 Single Color',
      binding_type: 'Carbonless NCR Pad Binding',
      numbering_required: true,
      numbering_range: '0001 - 0500',
      ncr_parts: 3,
    },
  },
  {
    id: 'preset-leaflet-flyer-artpaper',
    name: 'Leaflet / Flyer (120 GSM)',
    nameBn: 'লিফলেট / হ্যান্ডবিল (৪ রঙ)',
    category: 'offset_print',
    categoryLabel: 'Offset Commercial Print',
    categoryLabelBn: 'অফসেট কমার্শিয়াল প্রিন্ট',
    icon: '📰',
    description: 'Promotional Leaflets / Flyers (5,000 pcs): A4/A5 Size, 120 GSM Imported Art Paper, 4/0 Single-side CMYK Color',
    descriptionBn: 'বিজ্ঞাপনী লিফলেট / হ্যান্ডবিল (৫,০০০ পিস): ১২০ জিএসএম আর্ট পেপার, ৪ রঙের পূর্ণাঙ্গ রঙিন প্রিন্ট',
    materialSpec: '120 GSM Imported Art Paper, 4/0 Color Print',
    itemKind: 'service',
    width: 0,
    height: 0,
    dimensionUnit: 'ft',
    quantity: 5000,
    unit: 'pcs',
    defaultRate: 1.6, // ৳1.60 per pc = ৳8,000 for 5,000 pcs
    estimatedCostPerUnit: 0.95,
    finishing: 'Cutting & Pack',
    artworkRequired: false,
    offsetSpecs: {
      paper_gsm: 120,
      color_mode: '4/0 Single-side CMYK',
      binding_type: 'Bundle Pack',
      numbering_required: false,
    },
  },
  {
    id: 'preset-letterhead-pad',
    name: 'Letterhead Pad (80 GSM)',
    nameBn: 'লেটারহেড প্যাড (৮০ জিএসএম)',
    category: 'offset_print',
    categoryLabel: 'Offset Commercial Print',
    categoryLabelBn: 'অফসেট কমার্শিয়াল প্রিন্ট',
    icon: '📜',
    description: 'Official Company Letterhead Pads (20 Pads): 80 GSM Imported Executive Offset Paper, 100 sheets per pad, 2/0 Color Print',
    descriptionBn: 'কোম্পানি লেটারহেড প্যাড (২০ প্যাড): ৮০ জিএসএম এক্সিকিউটিভ অফসেট পেপার, প্রতি প্যাডে ১০০ পাতা, ২ রঙের প্রিন্ট',
    materialSpec: '80 GSM Premium Executive Offset Paper, 2/0 Color',
    itemKind: 'service',
    width: 0,
    height: 0,
    dimensionUnit: 'ft',
    quantity: 20,
    unit: 'pcs',
    defaultRate: 220, // ৳220 per pad = ৳4,400 for 20 pads
    estimatedCostPerUnit: 125,
    finishing: 'Top Gumming Pad',
    artworkRequired: false,
    offsetSpecs: {
      paper_gsm: 80,
      color_mode: '2/0 Two Color',
      binding_type: 'Top Gumming',
      numbering_required: false,
    },
  },

  // 3. Signage & 3D Fabrication
  {
    id: 'preset-3d-acrylic-led-sign',
    name: '3D Acrylic LED Letter Sign',
    nameBn: '৩ডি এক্রিলিক এলইডি সাইনবোর্ড',
    category: 'signage_fabrication',
    categoryLabel: '3D Signage & Fabrication',
    categoryLabelBn: '৩ডি সাইনেজ ও মেটাল ফেব্রিকেশন',
    icon: '💡',
    description: '3D Acrylic Letter Frontlit LED Signboard (10ft × 3ft): 3mm Cast Acrylic, Korean Waterproof LED Modules, 12V 33A SMPS, 1" MS Box Pipe Sub-frame with On-site Installation',
    descriptionBn: '৩ডি এক্রিলিক ফ্রন্টলিট এলইডি সাইনবোর্ড (১০ ফুট × ৩ ফুট): ৩ মিমি এক্রিলিক, কোরিয়ান এলইডি মডিউল, ১২ ভোল্ট পাওয়ার সাপ্লাই, ১" এমএস পাইপ ফ্রেম ও ইনস্টলেশনসহ',
    materialSpec: '3mm Cast Acrylic Face + PVC Foam Return + 1" MS Pipe Frame',
    itemKind: 'service',
    width: 10,
    height: 3,
    dimensionUnit: 'ft',
    quantity: 1,
    unit: 'sft',
    defaultRate: 1150, // ৳1,150/sft = ৳34,500 for 30 sft
    estimatedCostPerUnit: 680,
    finishing: '3D Letter Fabrication',
    addOn: 'SMPS Power Supply 12V 33A',
    artworkRequired: true,
    installationRequired: true,
    signageSpecs: {
      letter_height_inch: 12,
      led_module_type: 'Korean High-Lumen 3-LED Module (White/Warm)',
      led_count: 120,
      power_supply_watts: 400,
      frame_structure: '1" × 1" MS Box Pipe Rust-Proof Painted Substructure',
      installation_type: 'Standard Wall Mount with Scaffolding',
    },
  },
  {
    id: 'preset-ss-3d-letters',
    name: 'SS (Stainless Steel) Letters',
    nameBn: 'এসএস ৩ডি মেটাল লেটার',
    category: 'signage_fabrication',
    categoryLabel: '3D Signage & Fabrication',
    categoryLabelBn: '৩ডি সাইনেজ ও মেটাল ফেব্রিকেশন',
    icon: '🔩',
    description: 'Mirror Gold / Silver Stainless Steel (SS 304 Grade) 3D Channel Letters for Reception / Facade',
    descriptionBn: 'গোল্ড/সিলভার মিরর স্টেইনলেস স্টিল (এসএস ৩০৪) ৩ডি লেটার ব্র্যান্ডিং',
    materialSpec: '0.8mm Grade 304 Mirror Gold Stainless Steel',
    itemKind: 'service',
    width: 8,
    height: 2,
    dimensionUnit: 'ft',
    quantity: 1,
    unit: 'sft',
    defaultRate: 1400,
    estimatedCostPerUnit: 820,
    finishing: 'SS Laser Cutting & Welding',
    artworkRequired: true,
    installationRequired: true,
    signageSpecs: {
      letter_height_inch: 10,
      frame_structure: 'Direct Wall Stud Mounting',
      installation_type: 'Indoor Reception Wall',
    },
  },
  {
    id: 'preset-custom-neon-sign',
    name: 'Custom Neon Flex Sign',
    nameBn: 'কাস্টম নিয়ন ফ্লেক্স লাইট সাইন',
    category: 'signage_fabrication',
    categoryLabel: '3D Signage & Fabrication',
    categoryLabelBn: '৩ডি সাইনেজ ও মেটাল ফেব্রিকেশন',
    icon: '⚡',
    description: 'Custom Flexible Silicon Neon LED Sign on 5mm Transparent Acrylic Base with 12V Adapter',
    descriptionBn: 'স্বচ্ছ ৫ মিমি এক্রিলিক বোর্ডের উপর কাস্টম নিয়ন ফ্লেক্স এলইডি সাইন ও ১২ ভোল্ট অ্যাডাপ্টার',
    materialSpec: '6mm Silicon Neon Flex + 5mm Laser-cut Clear Acrylic Base',
    itemKind: 'service',
    width: 3,
    height: 2,
    dimensionUnit: 'ft',
    quantity: 1,
    unit: 'sft',
    defaultRate: 950,
    estimatedCostPerUnit: 520,
    finishing: 'Laser Base Routering',
    addOn: '12V 5A Power Adapter + Dimmer',
    artworkRequired: true,
    installationRequired: false,
    signageSpecs: {
      led_module_type: 'Silicon Neon Flex 12V High-Density',
      power_supply_watts: 60,
      frame_structure: '5mm Clear Acrylic Backplate',
    },
  },

  // 4. Corporate Gifts & Ready Items
  {
    id: 'preset-id-card-ribbon-holder',
    name: 'ID Card + Ribbon + Holder',
    nameBn: 'আইডি কার্ড, রিবন ও হোল্ডার সেট',
    category: 'ready_merchandise',
    categoryLabel: 'Corporate Gifts & Ready Items',
    categoryLabelBn: 'কর্পোরেট গিফট ও রেডি আইটেম',
    icon: '🪪',
    description: 'Student / Employee ID Card Set (100 sets): PVC Plastic Card, Digital Sublimation Satin Ribbon with Logo, Transparent Card Holder & Clip',
    descriptionBn: 'ডিজিটাল পিভিসি আইডি কার্ড, সাটিন লোগো রিবন ও ক্লিপসহ হোল্ডার সেট (১০০ সেট)',
    materialSpec: '0.76mm Thermal PVC Plastic + 20mm Satin Sublimation Ribbon',
    itemKind: 'ready_product',
    width: 0,
    height: 0,
    dimensionUnit: 'ft',
    quantity: 100,
    unit: 'set',
    defaultRate: 85, // ৳85 per set = ৳8,500 for 100 sets
    estimatedCostPerUnit: 48,
    finishing: 'Sublimation Ribbon Printing',
    artworkRequired: false,
    installationRequired: false,
  },
  {
    id: 'preset-acrylic-crest-award',
    name: 'Acrylic Crest / Award',
    nameBn: 'এক্রিলিক ক্রেস্ট ও স্মারক',
    category: 'ready_merchandise',
    categoryLabel: 'Corporate Gifts & Ready Items',
    categoryLabelBn: 'কর্পোরেট গিফট ও রেডি আইটেম',
    icon: '🏆',
    description: 'Honorary Award Crest: 8" × 6" Acrylic Plate with Gold Foil Engraving & Polished Wooden / Metal Base',
    descriptionBn: 'সম্মাননা স্মারক ক্রেস্ট: ৮" × ৬" এক্রিলিক প্লেট, গোল্ড ফয়েল ও পলিশড কাঠের বেস',
    materialSpec: '8mm Cast Acrylic + Mahogany Polished Wooden Base + Gold Foil Plaque',
    itemKind: 'ready_product',
    width: 0,
    height: 0,
    dimensionUnit: 'ft',
    quantity: 10,
    unit: 'pcs',
    defaultRate: 650,
    estimatedCostPerUnit: 360,
    finishing: 'Gold Foil / UV Print Plaque',
    artworkRequired: false,
    installationRequired: false,
  },
]

export function getPresetsByCategory(category?: string): DomainPreset[] {
  if (!category || category === 'all') return BANGLADESHI_PRINT_PRESETS
  const cat = category.toLowerCase()
  return BANGLADESHI_PRINT_PRESETS.filter((p) => {
    if (p.category === cat) return true
    if (cat === 'digital' && p.category === 'digital_print') return true
    if (cat === 'offset' && p.category === 'offset_print') return true
    if (cat === 'signage' && p.category === 'signage_fabrication') return true
    if (cat === 'ready' && p.category === 'ready_merchandise') return true
    return false
  })
}


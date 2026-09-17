'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Wrench,
  Boxes,
  Sparkles,
  PlusCircle,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  Palette,
  RefreshCw,
  TrendingUp,
  Tag,
  Percent,
  Coins,
  Info,
  Maximize2,
  Sliders,
  Scissors,
  FileText,
  Building,
  CheckCircle2,
  ArrowRight,
  Search,
  Star,
  Layers3,
  Droplets,
  Calculator,
  RotateCcw,
  PieChart,
  Printer,
  Hammer,
  Truck,
  Layers,
} from 'lucide-react'
import type {
  ProductRecord,
  ProductCostBreakdown,
  ServiceConfiguration,
  ServiceDimensionPreset,
  ServiceRequiredMaterial,
  ServiceFinishingOption,
  ServiceAdditionalOption,
  ServiceInstallationOption,
  PricingMethod,
  UnitOfMeasure,
  ProductPriceTiers,
  LinkedInkChannel,
} from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import type { MaterialRecord } from '@/types/inventory.types'
import { formatBDT } from '@/lib/formatters'
import { calculateGrossMargin } from '@/lib/units'
import { cn } from '@/lib/utils'

interface ServiceConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (serviceData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
  availableMaterials?: MaterialRecord[]
  printingMethods?: Array<{ id: string; name: string; name_bn?: string | null }>
  finishingMasterOptions?: Array<{ id: string; name: string; pricing_method: string; selling_price: number; cost: number }>
  additionalMasterOptions?: Array<{ id: string; name: string; pricing_method: string; selling_price: number; cost: number }>
  installationMasterOptions?: Array<{ id: string; name: string; pricing_method: string; selling_price: number; cost: number }>
}

const COMMON_SELLING_UNITS: { value: string; label: string; defaultMethod: PricingMethod }[] = [
  { value: 'sft', label: 'Square Feet (sft / sqft) — বর্গফুট', defaultMethod: 'per_area' },
  { value: 'pcs', label: 'Piece (pcs) — পিস', defaultMethod: 'per_piece' },
  { value: 'rft', label: 'Running Feet (rft) — রানিং ফিট', defaultMethod: 'per_length' },
  { value: 'sheet', label: 'Sheet — শীট', defaultMethod: 'per_piece' },
  { value: 'meter', label: 'Meter (m) — মিটার', defaultMethod: 'per_length' },
  { value: 'sqm', label: 'Square Meter (sqm) — বর্গমিটার', defaultMethod: 'per_area' },
  { value: 'inch', label: 'Inch (in) — ইঞ্চি', defaultMethod: 'per_length' },
  { value: 'set', label: 'Set — সেট', defaultMethod: 'per_piece' },
  { value: 'job', label: 'Job / Project — এককালীন চার্জ', defaultMethod: 'per_job' },
  { value: 'hour', label: 'Hour — ঘণ্টা', defaultMethod: 'per_hour' },
]

export const SERVICE_TYPE_CATEGORIES: Record<
  'printing' | 'production' | 'finishing' | 'installation' | 'delivery' | 'general',
  Array<{ id: string; name: string; name_bn?: string; defaultUnit?: string; defaultMethod?: PricingMethod }>
> = {
  printing: [
    { id: 'wide_format_printing', name: 'Wide Format & Eco-Solvent Printing', name_bn: 'ওয়াইড ফরম্যাট ও ইকো-সলভেন্ট প্রিন্টিং', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'solvent_printing', name: 'Solvent Large Format Banner', name_bn: 'সলভেন্ট ব্যানার ও সাইনেজ প্রিন্ট', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'uv_printing', name: 'UV Flatbed & Roll Direct Print', name_bn: 'ইউভি ফ্ল্যাটবেড ও ডিরেক্ট প্রিন্ট', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'digital_print', name: 'Digital Press & Commercial Print', name_bn: 'ডিজিটাল কমার্শিয়াল ও লেজার প্রিন্ট', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
    { id: 'offset_printing', name: 'Commercial Sheetfed & Offset Packaging', name_bn: 'অফসেট প্যাকেজিং ও প্রিন্টিং', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
    { id: 'sublimation_printing', name: 'Dye Sublimation & Fabric Print', name_bn: 'সাবলিমেশন ও ফেব্রিক প্রিন্ট', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'dtf_printing', name: 'DTF Garment & Heat Transfer Print', name_bn: 'ডিটিএফ ও পোশাক প্রিন্ট', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'screen_printing', name: 'Screen Printing & Manual Mesh Print', name_bn: 'স্ক্রিন প্রিন্টিং ও ম্যানুয়াল মেশ', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
  ],
  production: [
    { id: 'signage_fabrication', name: 'Signboard & Metal Frame Fabrication', name_bn: 'সাইনবোর্ড ও মেটাল ফ্রেম স্ট্রাকচার', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'acrylic_3d_letters', name: '3D Acrylic, SS & Neon Letters', name_bn: 'এক্রিলিক ও ৩ডি নিয়ন লেটার', defaultUnit: 'inch', defaultMethod: 'per_length' },
    { id: 'lightbox_led', name: 'LED Backlit & Slim Lightboxes', name_bn: 'লাইটবক্স ও এলইডি ডিসপ্লে ফ্রেম', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'cnc_wood_fabrication', name: 'CNC Router & Laser Engraving', name_bn: 'সিএনসি ও লেজার কাটিং/খোদাই', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'display_kiosks', name: 'POS Displays, Kiosks & Gondolas', name_bn: 'ডিসপ্লে কিয়স্ক ও পিওএসএম বুথ', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
    { id: 'event_backdrops', name: 'Event Staging & Truss Structures', name_bn: 'ইভেন্ট ব্যাকড্রপ ও স্টেজ স্ট্রাকচার', defaultUnit: 'sft', defaultMethod: 'per_area' },
  ],
  finishing: [
    { id: 'thermal_lamination', name: 'Thermal Film Lamination (BOPP/PET)', name_bn: 'থার্মাল ফিল্ম ল্যামিনেশন', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'cold_lamination', name: 'Cold Pressure Sensitive Lamination', name_bn: 'কোল্ড প্রেসার ল্যামিনেশন', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'floor_anti_slip', name: 'Floor Anti-Slip & Heavy Overlaminate', name_bn: 'ফ্লোর এন্টি-স্লিপ ল্যামিনেশন', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'board_mounting', name: 'Foam & PVC Sunboard Mounting', name_bn: 'ফোম ও সানবোর্ড মাউন্টিং', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'eyelets_grommets', name: 'Brass & Metal Eyelet Punching', name_bn: 'আইলেট ও গ্রোমেট পাঞ্চিং', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
    { id: 'edge_hemming', name: 'Banner Edge Hemming & Seaming', name_bn: 'ব্যানার সেলাই ও এজিং', defaultUnit: 'rft', defaultMethod: 'per_length' },
    { id: 'die_cutting', name: 'Plotter & Flatbed Die-Cutting', name_bn: 'ডাই-কাটিং ও কনট্যুর কাটিং', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
    { id: 'binding_finishing', name: 'Spiral, Comb & Hardcover Binding', name_bn: 'স্পাইরাল ও হার্ডকভার বাইন্ডিং', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
    { id: 'spot_uv_foiling', name: 'Spot UV & Hot Foil Stamping', name_bn: 'স্পট ইউভি ও ফয়েল স্ট্যাম্পিং', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
  ],
  installation: [
    { id: 'site_pasting', name: 'Glass & Wall Vinyl Graphics Pasting', name_bn: 'গ্লাস স্টিকার ও ওয়াল পেস্টিং', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'billboard_erection', name: 'Rooftop Billboard & Unipole Fitting', name_bn: 'বিলবোর্ড ও ইউনিপোল স্থাপন', defaultUnit: 'job', defaultMethod: 'per_job' },
    { id: 'signboard_installation', name: 'Shopfront & Fascia Sign Fitting', name_bn: 'সাইনবোর্ড ও সাইন ফিটিং', defaultUnit: 'sft', defaultMethod: 'per_area' },
    { id: 'vehicle_branding', name: 'Vehicle Branding & Fleet Wrapping', name_bn: 'গাড়ি ব্র্যান্ডিং ও র‍্যাপিং ফিটিং', defaultUnit: 'job', defaultMethod: 'per_job' },
    { id: 'exhibition_setup', name: 'Stall Fabrication & Event Setup', name_bn: 'মেলা ও এক্সিবিশন সেটআপ', defaultUnit: 'job', defaultMethod: 'per_job' },
  ],
  delivery: [
    { id: 'local_city_delivery', name: 'Local City Van / Bike Delivery', name_bn: 'সিটি ডেলিভারি ও পরিবহন', defaultUnit: 'trip', defaultMethod: 'per_job' },
    { id: 'freight_transport', name: 'Inter-District Cargo & Freight Transport', name_bn: 'আন্তঃজেলা কার্গো ও কুরিয়ার', defaultUnit: 'job', defaultMethod: 'per_job' },
    { id: 'express_delivery', name: 'Priority Express Delivery', name_bn: 'জরুরি এক্সপ্রেস ডেলিভারি', defaultUnit: 'trip', defaultMethod: 'per_job' },
    { id: 'warehouse_handling', name: 'Packaging, Crating & Dispatch Handling', name_bn: 'প্যাকেজিং ও ওয়্যারহাউস হ্যান্ডলিং', defaultUnit: 'pcs', defaultMethod: 'per_piece' },
  ],
  general: [
    { id: 'graphic_design', name: 'Graphic Design & Color Separation', name_bn: 'গ্রাফিক ডিজাইন ও প্রি-প্রেস সার্ভিস', defaultUnit: 'job', defaultMethod: 'per_job' },
    { id: 'technical_survey', name: 'Site Measurement & Feasibility Survey', name_bn: 'সাইট ভিজিট ও মেজারমেন্ট', defaultUnit: 'job', defaultMethod: 'per_job' },
    { id: 'maintenance_repair', name: 'Signboard Maintenance & LED Repair', name_bn: 'সাইনবোর্ড মেরামত ও সার্ভিসিং', defaultUnit: 'job', defaultMethod: 'per_job' },
    { id: 'custom_job_service', name: 'Miscellaneous Custom Service Work', name_bn: 'কাস্টম সার্ভিস জব', defaultUnit: 'job', defaultMethod: 'per_job' },
  ],
}

const DEFAULT_PRINT_CATEGORIES: Array<{ id: string; name: string; name_bn: string; defaultInk: string }> = [
  { id: 'eco_solvent', name: 'Large Format Eco-Solvent Print', name_bn: 'লার্জ ফরম্যাট ইকো-সলভেন্ট প্রিন্ট', defaultInk: 'Eco-Solvent Ink' },
  { id: 'solvent', name: 'Solvent Heavy Duty Print (Banner & Flex)', name_bn: 'সলভেন্ট হেভি ডিউটি প্রিন্ট', defaultInk: 'Solvent Heavy Duty Ink' },
  { id: 'uv_roll', name: 'UV Roll-to-Roll Print', name_bn: 'ইউভি রোল-টু-রোল প্রিন্ট', defaultInk: 'UV Curable Ink' },
  { id: 'uv_flatbed', name: 'UV Flatbed Print (Rigid Substrate)', name_bn: 'ইউভি ফ্ল্যাটবেড প্রিন্ট', defaultInk: 'UV Curable Ink' },
  { id: 'latex', name: 'HP Latex Odorless Print', name_bn: 'এইচপি ল্যাটেক্স প্রিন্ট', defaultInk: 'HP Latex Ink' },
  { id: 'digital_press', name: 'Digital Laser Press (Toner)', name_bn: 'ডিজিটাল লেজার প্রেস', defaultInk: 'Digital Laser Toner' },
  { id: 'sublimation', name: 'Dye Sublimation Textile Print', name_bn: 'সাবলিমেশন টেক্সটাইল প্রিন্ট', defaultInk: 'Dye Sublimation Ink' },
  { id: 'dtf', name: 'DTF Direct to Film Print', name_bn: 'ডিটিএফ ফিল্ম প্রিন্ট', defaultInk: 'DTF Pigment Ink' },
  { id: 'offset', name: 'Commercial Offset Printing', name_bn: 'বাণিজ্যিক অফসেট প্রিন্ট', defaultInk: 'Offset Ink' },
  { id: 'screen_print', name: 'Screen Printing (Manual / Semi-Auto)', name_bn: 'স্ক্রিন প্রিন্ট', defaultInk: 'Screen Print Ink' },
]

const DEFAULT_INK_TYPES: Array<{ id: string; name: string; defaultRatePerLiter: number }> = [
  { id: 'eco_solvent', name: 'Eco-Solvent High Pigment Ink', defaultRatePerLiter: 2800 },
  { id: 'solvent', name: 'Solvent Heavy Duty Ink', defaultRatePerLiter: 2200 },
  { id: 'uv_curable', name: 'UV Curable / UV LED Ink', defaultRatePerLiter: 5500 },
  { id: 'latex', name: 'HP Latex Water-Based Ink', defaultRatePerLiter: 8000 },
  { id: 'sublimation', name: 'Dye Sublimation Ink', defaultRatePerLiter: 3200 },
  { id: 'dtf_pigment', name: 'DTF Textile Pigment Ink', defaultRatePerLiter: 4500 },
  { id: 'water_dye', name: 'Water-Based Dye / Pigment Ink', defaultRatePerLiter: 2000 },
  { id: 'laser_toner', name: 'Digital Laser Toner', defaultRatePerLiter: 4000 },
  { id: 'screen_ink', name: 'Screen Printing Plastisol / Water Ink', defaultRatePerLiter: 1800 },
  { id: 'offset_ink', name: 'Commercial Offset Process Ink', defaultRatePerLiter: 1500 },
]

export const DEFAULT_FINISHING_CATEGORIES: Array<{
  id: string
  name: string
  name_bn: string
  defaultUnit: string
  defaultRate: number
  defaultCost: number
  defaultMethod: string
}> = [
  { id: 'thermal_lamination', name: 'Thermal Film Lamination (গ্লস/ম্যাট থার্মাল)', name_bn: 'থার্মাল ফিল্ম ল্যামিনেশন', defaultUnit: 'sft', defaultRate: 8, defaultCost: 3.5, defaultMethod: 'per_sqft' },
  { id: 'cold_lamination', name: 'Cold Pressure Lamination (কোল্ড ল্যামিনেশন)', name_bn: 'কোল্ড ল্যামিনেশন', defaultUnit: 'sft', defaultRate: 6, defaultCost: 2.8, defaultMethod: 'per_sqft' },
  { id: 'floor_anti_slip', name: 'Floor & Vehicle Anti-Slip Overlaminate (ফ্লোর ল্যামিনেশন)', name_bn: 'ফ্লোর অ্যান্টি-স্লিপ ল্যামিনেশন', defaultUnit: 'sft', defaultRate: 15, defaultCost: 7.0, defaultMethod: 'per_sqft' },
  { id: 'board_mounting', name: 'Hardboard & Foam PVC Board Mounting (বোর্ড পেস্টিং)', name_bn: 'বোর্ড মাউন্টিং ও পেস্টিং', defaultUnit: 'sft', defaultRate: 25, defaultCost: 12.0, defaultMethod: 'per_sqft' },
  { id: 'eyelets_grommets', name: 'Eyelets & Grommets Punching (আইলেটস পাঞ্চিং)', name_bn: 'আইলেটস পাঞ্চিং', defaultUnit: 'pcs', defaultRate: 5, defaultCost: 1.5, defaultMethod: 'per_piece' },
  { id: 'edge_hemming', name: 'Edge Hemming & Banner Seaming (ব্যানার সিমিং)', name_bn: 'ব্যানার এজ সিমিং', defaultUnit: 'rft', defaultRate: 3, defaultCost: 1.0, defaultMethod: 'per_rft' },
  { id: 'die_cutting', name: 'Digital & Knife Contour Die-Cutting (ডাই-কাট)', name_bn: 'কনট্যুর ডাই-কাট', defaultUnit: 'pcs', defaultRate: 12, defaultCost: 4.0, defaultMethod: 'per_piece' },
  { id: 'spiral_binding', name: 'Spiral & Wiro Book Binding (স্পাইরাল বাইন্ডিং)', name_bn: 'স্পাইরাল বুক বাইন্ডিং', defaultUnit: 'pcs', defaultRate: 40, defaultCost: 18.0, defaultMethod: 'per_piece' },
  { id: 'perfect_binding', name: 'Hot Melt & Perfect Book Binding (হার্ড কভার বাইন্ডিং)', name_bn: 'পারফেক্ট বুক বাইন্ডিং', defaultUnit: 'pcs', defaultRate: 60, defaultCost: 25.0, defaultMethod: 'per_piece' },
  { id: 'spot_uv', name: 'Spot UV Varnish Coating (স্পট ইউভি)', name_bn: 'স্পট ইউভি কোটিং', defaultUnit: 'sft', defaultRate: 18, defaultCost: 8.0, defaultMethod: 'per_sqft' },
  { id: 'foil_stamping', name: 'Hot Foil Stamping (Gold/Silver ফয়েল প্রিন্ট)', name_bn: 'হট ফয়েল স্ট্যাম্পিং', defaultUnit: 'pcs', defaultRate: 20, defaultCost: 8.0, defaultMethod: 'per_piece' },
]

export const LAMINATION_MICRON_PRESETS = [
  { label: '25 Micron (Ultra Thin BOPP)', value: '25' },
  { label: '32 Micron (Standard Commercial)', value: '32' },
  { label: '50 Micron (Medium Heavy)', value: '50' },
  { label: '75 Micron (Stiff / Identity)', value: '75' },
  { label: '125 Micron (Rigid Pouch)', value: '125' },
  { label: '250 Micron (Heavy Duty Rigid)', value: '250' },
]

const INK_CHANNEL_PRESETS = {
  cmyk: [
    { channel: 'Cyan', color_code: '#00aeef', unit_price: 2800, unit: 'bottle' },
    { channel: 'Magenta', color_code: '#ec008c', unit_price: 2800, unit: 'bottle' },
    { channel: 'Yellow', color_code: '#fff200', unit_price: 2800, unit: 'bottle' },
    { channel: 'Black', color_code: '#231f20', unit_price: 2800, unit: 'bottle' },
  ],
  cmyk_lc_lm: [
    { channel: 'Cyan', color_code: '#00aeef', unit_price: 2800, unit: 'bottle' },
    { channel: 'Magenta', color_code: '#ec008c', unit_price: 2800, unit: 'bottle' },
    { channel: 'Yellow', color_code: '#fff200', unit_price: 2800, unit: 'bottle' },
    { channel: 'Black', color_code: '#231f20', unit_price: 2800, unit: 'bottle' },
    { channel: 'Light Cyan', color_code: '#80d6f7', unit_price: 2800, unit: 'bottle' },
    { channel: 'Light Magenta', color_code: '#f680c5', unit_price: 2800, unit: 'bottle' },
  ],
  cmyk_white: [
    { channel: 'Cyan', color_code: '#00aeef', unit_price: 3200, unit: 'bottle' },
    { channel: 'Magenta', color_code: '#ec008c', unit_price: 3200, unit: 'bottle' },
    { channel: 'Yellow', color_code: '#fff200', unit_price: 3200, unit: 'bottle' },
    { channel: 'Black', color_code: '#231f20', unit_price: 3200, unit: 'bottle' },
    { channel: 'White', color_code: '#ffffff', unit_price: 5500, unit: 'bottle' },
  ],
  cmyk_white_varnish: [
    { channel: 'Cyan', color_code: '#00aeef', unit_price: 3500, unit: 'bottle' },
    { channel: 'Magenta', color_code: '#ec008c', unit_price: 3500, unit: 'bottle' },
    { channel: 'Yellow', color_code: '#fff200', unit_price: 3500, unit: 'bottle' },
    { channel: 'Black', color_code: '#231f20', unit_price: 3500, unit: 'bottle' },
    { channel: 'White', color_code: '#ffffff', unit_price: 5800, unit: 'bottle' },
    { channel: 'Varnish / Clear', color_code: '#ffd700', unit_price: 5800, unit: 'bottle' },
  ],
}

export function ServiceConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
  availableMaterials = [],
  printingMethods = [],
  finishingMasterOptions = [],
  additionalMasterOptions = [],
  installationMasterOptions = [],
}: ServiceConfigModalProps) {
  // 5 Responsive Tabs (Dimensions Tab Removed)
  const [activeTab, setActiveTab] = useState<'basic' | 'materials' | 'finishing' | 'additionals' | 'pricing'>('basic')

  // 1. Basic Info
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [serviceType, setServiceType] = useState<'printing' | 'production' | 'finishing' | 'installation' | 'delivery' | 'general'>('printing')
  const [category, setCategory] = useState('printing_service')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // 1.1 Printing Configuration
  const [printCategory, setPrintCategory] = useState<string>('Large Format Eco-Solvent Print')
  const [selectedPrintingMethods, setSelectedPrintingMethods] = useState<string[]>(['Eco-Solvent Print'])
  const [printableMaterialId, setPrintableMaterialId] = useState<string>('')
  const [inkType, setInkType] = useState<string>('Eco-Solvent High Pigment Ink')
  const [selectedInks, setSelectedInks] = useState<LinkedInkChannel[]>(INK_CHANNEL_PRESETS.cmyk)
  const [consumePerUnitMl, setConsumePerUnitMl] = useState<number | string>(1.2)
  const [autoCalculateInkCost, setAutoCalculateInkCost] = useState<boolean>(true)
  const [inkCost, setInkCost] = useState<number | ''>(3.36)

  // 1.2 Finishing & Lamination Configuration (when serviceType === 'finishing')
  const [finishingCategory, setFinishingCategory] = useState<string>('Thermal Film Lamination (গ্লস/ম্যাট থার্মাল)')
  const [finishingMaterialId, setFinishingMaterialId] = useState<string>('')
  const [finishingMethod, setFinishingMethod] = useState<string>('Gloss Thermal Lamination')
  const [laminationMicron, setLaminationMicron] = useState<string | number>('32')
  const [laminationType, setLaminationType] = useState<string>('Gloss')

  // 1.3 Substrate & Auto-Inherited Print Sizes from Selected Printable Material
  const [availableRollWidths, setAvailableRollWidths] = useState<number[]>([3.25, 4.25, 5.25, 6, 10])
  const [standardRollLength, setStandardRollLength] = useState<number | string>(164)
  const [extraWidthAllowance, setExtraWidthAllowance] = useState<number | string>(0.25)
  const [availableSheetSizes, setAvailableSheetSizes] = useState<Array<{ width: number; length: number; label?: string }>>([
    { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
  ])

  // 1.4 Commercial Billing Units
  const [sellingUnit, setSellingUnit] = useState<string>('sft')
  const [purchaseUnit, setPurchaseUnit] = useState<string>('roll')
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('per_area')
  const [dimensionUnit, setDimensionUnit] = useState<string>('ft')
  const [minBillableQty, setMinBillableQty] = useState<number>(1)
  const [productionBleedInches, setProductionBleedInches] = useState<number>(0.5)
  const [allowCustomDimensions, setAllowCustomDimensions] = useState(true)

  // 2. Required Materials (BOM) & Wastage
  const [materialSearchQuery, setMaterialSearchQuery] = useState('')
  const [requiredMaterials, setRequiredMaterials] = useState<Array<ServiceRequiredMaterial & { is_primary?: boolean }>>([])
  const [defaultWastagePercent, setDefaultWastagePercent] = useState<number>(5)

  // 3. Finishing Options & Raw Materials Selection
  const [finishingOptions, setFinishingOptions] = useState<ServiceFinishingOption[]>([])
  const [finishingMaterialSearchQuery, setFinishingMaterialSearchQuery] = useState('')
  const [finishingFilterTab, setFinishingFilterTab] = useState<'finishing_only' | 'all_materials'>('finishing_only')
  const [showCustomFinishingForm, setShowCustomFinishingForm] = useState(false)
  const [customFinishingName, setCustomFinishingName] = useState('')
  const [customFinishingMaterialId, setCustomFinishingMaterialId] = useState('')
  const [customFinishingMethod, setCustomFinishingMethod] = useState('per_sqft')
  const [customFinishingPrice, setCustomFinishingPrice] = useState<number | ''>('')
  const [customFinishingCost, setCustomFinishingCost] = useState<number | ''>('')

  // 4. Additional Options & Installation
  const [additionalOptions, setAdditionalOptions] = useState<ServiceAdditionalOption[]>([])
  const [installationOptions, setInstallationOptions] = useState<ServiceInstallationOption[]>([])
  const [showCustomAddonForm, setShowCustomAddonForm] = useState(false)
  const [customAddonType, setCustomAddonType] = useState<'pasting' | 'installation'>('pasting')
  const [customAddonName, setCustomAddonName] = useState('')
  const [customAddonMethod, setCustomAddonMethod] = useState('per_sqft')
  const [customAddonPrice, setCustomAddonPrice] = useState<number | ''>('')
  const [customAddonCost, setCustomAddonCost] = useState<number | ''>('')

  // 5. Pricing, Customer Tiers & Margins
  const [sellingPrice, setSellingPrice] = useState<number | ''>('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [minimumCharge, setMinimumCharge] = useState<number | ''>('')
  const [baseCostEstimate, setBaseCostEstimate] = useState<number | ''>('')
  const [targetMargin, setTargetMargin] = useState<number>(35)
  const [minAllowedMargin, setMinAllowedMargin] = useState<number>(15)
  const [allowManualOverride, setAllowManualOverride] = useState(true)

  // 5.1 9-Point Direct Cost Breakdown
  const [materialCost, setMaterialCost] = useState<number | ''>('')
  const [machineCost, setMachineCost] = useState<number | ''>(1.5)
  const [laborCost, setLaborCost] = useState<number | ''>(1.0)
  const [finishingCost, setFinishingCost] = useState<number | ''>(0.5)
  const [fabricationCost, setFabricationCost] = useState<number | ''>(0)
  const [installationCost, setInstallationCost] = useState<number | ''>(0)
  const [deliveryCost, setDeliveryCost] = useState<number | ''>(0)
  const [otherDirectCost, setOtherDirectCost] = useState<number | ''>(0.25)

  // Multi-tier customer prices
  const [priceTiers, setPriceTiers] = useState<{
    retail: number | ''
    reseller: number | ''
    corporate: number | ''
    agency: number | ''
    regular: number | ''
    custom: number | ''
  }>({
    retail: '',
    reseller: '',
    corporate: '',
    agency: '',
    regular: '',
    custom: '',
  })

  // Tax & VAT
  const [vatApplicable, setVatApplicable] = useState(false)
  const [isTaxInclusive, setIsTaxInclusive] = useState(false)
  const [taxRate, setTaxRate] = useState<number>(7.5)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filter ink materials from inventory
  const inkMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      const cat = (m.category || '').toLowerCase()
      const n = (m.name || '').toLowerCase()
      const s = (m.sku || '').toLowerCase()
      const u = (m.unit || (m as any).purchase_unit || '').toLowerCase()
      return (
        cat.includes('ink') ||
        cat.includes('liquid') ||
        cat.includes('chemical') ||
        cat === 'inks' ||
        cat === 'ink_chemistry' ||
        n.includes('ink') ||
        n.includes('ইঙ্ক') ||
        n.includes('কালি') ||
        s.includes('ink') ||
        u === 'liter' ||
        u === 'ml' ||
        u === 'bottle' ||
        u === 'can'
      )
    })
  }, [availableMaterials])

  // Filter substrate materials from inventory
  const substrateMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      const cat = (m.category || '').toLowerCase()
      const u = (m.unit || (m as any).purchase_unit || '').toLowerCase()
      const isExplicitInkOnly = (cat === 'ink' || cat === 'inks' || cat === 'ink_chemistry') && (u === 'liter' || u === 'ml' || u === 'bottle')
      return !isExplicitInkOnly
    })
  }, [availableMaterials])

  // Filter finishing raw materials from inventory (Raw Product - Finishing)
  const finishingMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      const cat = (m.category || '').toLowerCase()
      const n = (m.name || '').toLowerCase()
      const s = (m.sku || '').toLowerCase()
      const entityType = ((m as any).entity_type || '').toLowerCase()
      const productType = ((m as any).product_type || '').toLowerCase()

      return (
        cat.includes('finishing') ||
        cat.includes('lamination') ||
        cat.includes('film') ||
        cat.includes('eyelet') ||
        cat.includes('grommet') ||
        cat.includes('tape') ||
        cat.includes('binding') ||
        cat.includes('glue') ||
        cat.includes('adhesive') ||
        cat.includes('hardware') ||
        cat.includes('board') ||
        cat.includes('sheet') ||
        cat.includes('rigid') ||
        entityType === 'finishing' ||
        productType === 'finishing' ||
        n.includes('lamination') ||
        n.includes('ল্যামিনেশন') ||
        n.includes('film') ||
        n.includes('ফিল্ম') ||
        n.includes('eyelet') ||
        n.includes('আইলেট') ||
        n.includes('grommet') ||
        n.includes('tape') ||
        n.includes('টেপ') ||
        n.includes('finishing') ||
        n.includes('ফিনিশিং') ||
        n.includes('seaming') ||
        n.includes('সেলাই') ||
        n.includes('binding') ||
        n.includes('বন্ডিং') ||
        n.includes('foam') ||
        n.includes('board') ||
        n.includes('বোর্ড')
      )
    })
  }, [availableMaterials])

  // Filtered Catalog Categories based strictly on the selected Service Type
  const filteredCatalogCategories = useMemo(() => {
    const builtIn = SERVICE_TYPE_CATEGORIES[serviceType] || SERVICE_TYPE_CATEGORIES.printing

    const custom = categories.filter((c) => {
      if (c.applies_to_product_types && Array.isArray(c.applies_to_product_types) && c.applies_to_product_types.length > 0) {
        return (
          c.applies_to_product_types.includes(serviceType) ||
          c.applies_to_product_types.includes('all') ||
          c.applies_to_product_types.includes('service')
        )
      }

      const n = (c.name || '').toLowerCase()
      const s = (c.slug || '').toLowerCase()

      if (serviceType === 'printing') {
        return (
          n.includes('print') ||
          n.includes('প্রিন্ট') ||
          s.includes('print') ||
          n.includes('solvent') ||
          n.includes('uv') ||
          n.includes('offset') ||
          n.includes('sublimation') ||
          n.includes('dtf')
        )
      }
      if (serviceType === 'finishing') {
        return (
          n.includes('finish') ||
          n.includes('ফিনিশ') ||
          s.includes('finish') ||
          n.includes('laminat') ||
          n.includes('ল্যামিনেশন') ||
          s.includes('laminat') ||
          n.includes('cut') ||
          n.includes('কাটিং') ||
          n.includes('eyelet') ||
          n.includes('আইলেট') ||
          n.includes('bind') ||
          n.includes('বাইন্ডিং') ||
          n.includes('mount') ||
          n.includes('মাউন্টিং') ||
          n.includes('foil') ||
          n.includes('uv')
        )
      }
      if (serviceType === 'production') {
        return (
          n.includes('fabricat') ||
          n.includes('প্রোডাকশন') ||
          s.includes('fabricat') ||
          n.includes('sign') ||
          n.includes('সাইনবোর্ড') ||
          n.includes('letter') ||
          n.includes('acrylic') ||
          n.includes('lightbox') ||
          n.includes('cnc') ||
          n.includes('wood') ||
          n.includes('frame') ||
          n.includes('কাঠামো')
        )
      }
      if (serviceType === 'installation') {
        return (
          n.includes('install') ||
          n.includes('ইন্সটল') ||
          s.includes('install') ||
          n.includes('fit') ||
          n.includes('ফিটিং') ||
          n.includes('paste') ||
          n.includes('পেস্টিং') ||
          n.includes('erect') ||
          n.includes('setup')
        )
      }
      if (serviceType === 'delivery') {
        return (
          n.includes('deliver') ||
          n.includes('ডেলিভারি') ||
          s.includes('deliver') ||
          n.includes('transport') ||
          n.includes('পরিবহন') ||
          n.includes('courier') ||
          n.includes('কুরিয়ার') ||
          s.includes('freight')
        )
      }
      if (serviceType === 'general') {
        return (
          n.includes('service') ||
          n.includes('সার্ভিস') ||
          n.includes('design') ||
          n.includes('ডিজাইন') ||
          n.includes('survey') ||
          n.includes('repair') ||
          n.includes('general')
        )
      }
      return false
    })

    const combined: Array<{ id: string; name: string; name_bn?: string | null }> = []
    const seenIds = new Set<string>()

    builtIn.forEach((b) => {
      seenIds.add(b.id)
      combined.push(b)
    })

    custom.forEach((c) => {
      const key = c.slug || c.id
      if (!seenIds.has(key)) {
        seenIds.add(key)
        combined.push({
          id: key,
          name: c.name,
          name_bn: c.name_bn,
        })
      }
    })

    return combined
  }, [serviceType, categories])

  // Handle switching Service Type and aligning Catalog Category & default parameters
  const handleSelectServiceType = (newType: 'printing' | 'production' | 'finishing' | 'installation' | 'delivery' | 'general') => {
    setServiceType(newType)
    const availableCats = SERVICE_TYPE_CATEGORIES[newType] || []
    if (availableCats.length > 0) {
      setCategory(availableCats[0].id)
      if (availableCats[0].defaultUnit) {
        setSellingUnit(availableCats[0].defaultUnit)
      }
      if (availableCats[0].defaultMethod) {
        setPricingMethod(availableCats[0].defaultMethod)
      }
    }
  }

  // Auto calculate average ink rate per ml and total ink cost per selling unit
  const autoCalculatedInkMetrics = useMemo(() => {
    if (!selectedInks || selectedInks.length === 0) {
      return { avgRatePerMl: 0.0028, unitInkCost: 3.36, totalInksCostPerLiter: 2800 }
    }
    let totalLiterPrice = 0
    selectedInks.forEach((ink) => {
      const price = Number(ink.unit_price) || 2800
      totalLiterPrice += price
    })
    const avgLiterPrice = totalLiterPrice / selectedInks.length
    const avgRatePerMl = avgLiterPrice / 1000 // 1 Liter = 1000 ml
    const cRate = Number(consumePerUnitMl) || 1.2
    const unitInkCost = parseFloat((cRate * avgRatePerMl).toFixed(2))
    return { avgRatePerMl, unitInkCost, totalInksCostPerLiter: avgLiterPrice }
  }, [selectedInks, consumePerUnitMl])

  // Keep inkCost in sync if auto calculate is enabled
  useEffect(() => {
    if (autoCalculateInkCost && serviceType === 'printing') {
      setInkCost(autoCalculatedInkMetrics.unitInkCost)
    }
  }, [autoCalculateInkCost, autoCalculatedInkMetrics.unitInkCost, serviceType])

  // When initialData changes (Editing Service)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'printing_service')
      const loadedSrvType = (initialData as any).service_type || (initialData.product_type === 'finishing' || (initialData as any).entity_type === 'finishing' ? 'finishing' : 'printing')
      setServiceType(loadedSrvType)
      setSellingUnit(initialData.selling_unit || initialData.unit || 'sft')
      setPurchaseUnit(initialData.purchase_unit || 'roll')
      setSellingPrice(initialData.selling_price || '')
      const cost = initialData.purchase_price ?? initialData.base_cost ?? ''
      setPurchasePrice(cost)
      setBaseCostEstimate(cost)
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')
      setPricingMethod((initialData.pricing_method as any) || 'per_area')
      setMinBillableQty(initialData.min_billable_quantity || 1)
      setDefaultWastagePercent(initialData.default_wastage_percentage || 5)
      setTargetMargin(initialData.target_margin_percentage || 35)
      setMinAllowedMargin(initialData.min_allowed_margin_percent || 15)
      setVatApplicable(Boolean(initialData.vat_applicable))
      setIsTaxInclusive(Boolean(initialData.is_tax_inclusive))
      setTaxRate(initialData.tax_rate ?? 7.5)
      setAllowManualOverride(initialData.allow_manual_override !== false)

      const cfg: ServiceConfiguration = initialData.service_config || {}
      
      // Print category & methods
      const loadedPrintCat = (initialData as any).print_category || cfg.print_category || 'Large Format Eco-Solvent Print'
      setPrintCategory(loadedPrintCat)

      // Finishing category & methods (when serviceType === 'finishing')
      const loadedFinCat = (initialData as any).finishing_category || cfg.finishing_category || 'Thermal Film Lamination (গ্লস/ম্যাট থার্মাল)'
      setFinishingCategory(loadedFinCat)
      const loadedFinMatId = (initialData as any).finishing_material_id || cfg.finishing_material_id || ''
      setFinishingMaterialId(loadedFinMatId)
      setFinishingMethod((initialData as any).finishing_method || cfg.finishing_method || 'Gloss Thermal Lamination')
      setLaminationMicron((initialData as any).lamination_micron || cfg.lamination_micron || '32')
      setLaminationType((initialData as any).lamination_type || cfg.lamination_type || 'Gloss')

      const loadedMethods: string[] = (initialData as any).printing_methods || 
        cfg.printing_methods ||
        ((initialData as any).printing_method_name ? (initialData as any).printing_method_name.split(',').map((s: string) => s.trim()).filter(Boolean) : []) ||
        ((initialData as any).printing_method ? [(initialData as any).printing_method] : []) ||
        (cfg.printing_method ? [cfg.printing_method] : ['Eco-Solvent Print'])
      setSelectedPrintingMethods(loadedMethods)

      // Printable material
      const primaryReq = (cfg.required_materials || []).find((m) => m.is_primary)
      const initialMatId = (initialData as any).printable_material_id || cfg.printable_material_id || primaryReq?.material_id || ''
      setPrintableMaterialId(initialMatId)

      // Ink type & selected inks
      setInkType((initialData as any).ink_type || cfg.ink_type || 'Eco-Solvent High Pigment Ink')
      if (cfg.selected_inks && Array.isArray(cfg.selected_inks) && cfg.selected_inks.length > 0) {
        setSelectedInks(cfg.selected_inks)
      } else {
        setSelectedInks(INK_CHANNEL_PRESETS.cmyk)
      }

      setConsumePerUnitMl(cfg.consume_per_unit_ml ?? cfg.ink_consumption_ml ?? (initialData as any).consume_per_unit_ml ?? 1.2)
      setAutoCalculateInkCost(cfg.auto_calculate_ink_cost !== false)

      const loadedInkCost = (initialData.cost_breakdown?.ink_cost ?? initialData.cost_breakdown?.ink ?? cfg.ink_cost ?? cfg.ink_cost_per_unit ?? (initialData as any).ink_cost) ?? ''
      setInkCost(loadedInkCost !== undefined && loadedInkCost !== null && loadedInkCost !== '' ? Number(loadedInkCost) : 3.36)

      // 9-Head Direct Cost Breakdown
      const cb = initialData.cost_breakdown || cfg.cost_breakdown || {}
      const loadedMatCost: any = cb.material_cost !== undefined ? cb.material_cost : (cb.material !== undefined ? cb.material : (initialData.purchase_price ?? initialData.base_cost ?? ''))
      const loadedMachineCost: any = (cb.machine_cost ?? cb.machine) ?? 1.5
      const loadedLaborCost: any = (cb.labor_cost ?? cb.labor) ?? 1.0
      const loadedFinishingCost: any = (cb.finishing_cost ?? cb.finishing) ?? 0.5
      const loadedFabricationCost: any = (cb.fabrication_cost ?? cb.fabrication) ?? 0
      const loadedInstallationCost: any = (cb.installation_cost ?? cb.installation) ?? 0
      const loadedDeliveryCost: any = (cb.delivery_cost ?? cb.delivery) ?? 0
      const loadedOtherCost: any = (cb.other_direct_cost ?? cb.other_direct) ?? 0.25

      setMaterialCost(loadedMatCost !== '' && loadedMatCost !== undefined ? Number(loadedMatCost) : '')
      setMachineCost(loadedMachineCost !== '' && loadedMachineCost !== undefined ? Number(loadedMachineCost) : 1.5)
      setLaborCost(loadedLaborCost !== '' && loadedLaborCost !== undefined ? Number(loadedLaborCost) : 1.0)
      setFinishingCost(loadedFinishingCost !== '' && loadedFinishingCost !== undefined ? Number(loadedFinishingCost) : 0.5)
      setFabricationCost(loadedFabricationCost !== '' && loadedFabricationCost !== undefined ? Number(loadedFabricationCost) : 0)
      setInstallationCost(loadedInstallationCost !== '' && loadedInstallationCost !== undefined ? Number(loadedInstallationCost) : 0)
      setDeliveryCost(loadedDeliveryCost !== '' && loadedDeliveryCost !== undefined ? Number(loadedDeliveryCost) : 0)
      setOtherDirectCost(loadedOtherCost !== '' && loadedOtherCost !== undefined ? Number(loadedOtherCost) : 0.25)

      setDimensionUnit(cfg.dimension_unit || 'ft')
      setAllowCustomDimensions(cfg.allow_custom_dimensions !== false)
      setAvailableRollWidths(cfg.available_widths_ft || initialData.available_widths_ft || [3.25, 4.25, 5.25, 6, 10])
      setExtraWidthAllowance(cfg.extra_width_allowance_ft ?? (initialData.production_width_allowance ?? 0.25))
      setStandardRollLength(cfg.standard_roll_length_ft || initialData.standard_roll_length_ft || 164)
      setAvailableSheetSizes(cfg.available_sheet_sizes || [
        { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
      ])
      setRequiredMaterials(cfg.required_materials || [])
      setFinishingOptions(cfg.finishing_options || [])
      setAdditionalOptions(cfg.additional_options || [])
      setInstallationOptions(cfg.installation_options || [])
      setMinimumCharge(cfg.minimum_charge || cfg.min_charge || '')

      const tiers = initialData.price_tiers || {}
      const sp = initialData.selling_price || ''
      setPriceTiers({
        retail: tiers.retail ?? sp,
        reseller: (tiers as any).reseller ?? tiers.dealer ?? tiers.wholesale ?? '',
        corporate: tiers.corporate ?? '',
        agency: (tiers as any).agency ?? '',
        regular: (tiers as any).regular ?? '',
        custom: tiers.custom ?? '',
      })
    } else {
      setName('')
      setNameBn('')
      setSku(`SRV-${Date.now().toString().slice(-5)}`)
      setCategory('wide_format_printing')
      setServiceType('printing')
      setPrintCategory('Large Format Eco-Solvent Print')
      setFinishingCategory('Thermal Film Lamination (গ্লস/ম্যাট থার্মাল)')
      setFinishingMaterialId('')
      setFinishingMethod('Gloss Thermal Lamination')
      setLaminationMicron('32')
      setLaminationType('Gloss')
      setSelectedPrintingMethods(['Eco-Solvent Print'])
      setPrintableMaterialId('')
      setInkType('Eco-Solvent High Pigment Ink')
      setSelectedInks(INK_CHANNEL_PRESETS.cmyk)
      setConsumePerUnitMl(1.2)
      setAutoCalculateInkCost(true)
      setInkCost(3.36)
      setMaterialCost('')
      setMachineCost(1.5)
      setLaborCost(1.0)
      setFinishingCost(0.5)
      setFabricationCost(0)
      setInstallationCost(0)
      setDeliveryCost(0)
      setOtherDirectCost(0.25)
      setSellingUnit('sft')
      setPurchaseUnit('roll')
      setSellingPrice('')
      setPurchasePrice('')
      setBaseCostEstimate('')
      setIsActive(true)
      setDescription('')
      setPricingMethod('per_area')
      setDimensionUnit('ft')
      setAllowCustomDimensions(true)
      setMinBillableQty(1)
      setProductionBleedInches(0.5)
      setDefaultWastagePercent(5)
      setAvailableRollWidths([3.25, 4.25, 5.25, 6, 10])
      setExtraWidthAllowance(0.25)
      setStandardRollLength(164)
      setAvailableSheetSizes([
        { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
      ])
      setRequiredMaterials([])
      setFinishingOptions([])
      setAdditionalOptions([])
      setInstallationOptions([])
      setMinimumCharge(150)
      setTargetMargin(35)
      setMinAllowedMargin(15)
      setVatApplicable(false)
      setIsTaxInclusive(false)
      setTaxRate(7.5)
      setAllowManualOverride(true)
      setPriceTiers({
        retail: '',
        reseller: '',
        corporate: '',
        agency: '',
        regular: '',
        custom: '',
      })
    }
    setActiveTab('basic')
    setErrorMessage(null)
  }, [initialData, isOpen])

  // Handle selecting Printable Material (Inventory Item) and Auto-Syncing its configured sizes and cost
  const handleSelectPrintableMaterial = (matId: string) => {
    setPrintableMaterialId(matId)
    if (!matId) return

    const mat = availableMaterials.find((m) => m.id === matId)
    if (!mat) return

    // 1. Roll Widths & Configured Roll Sizes
    const widths: number[] = mat.available_widths_ft || 
      (mat as any).material_config?.available_widths_ft || 
      (mat as any).roll_sizes?.map((r: any) => r.width) ||
      ((mat as any).width ? [(mat as any).width] : [3.25, 4.25, 5.25, 6, 10])

    if (widths && widths.length > 0) {
      setAvailableRollWidths(widths)
    }

    // 2. Standard Roll Length & Extra Width Allowance
    const rLength = mat.standard_roll_length_ft || (mat as any).material_config?.standard_roll_length_ft || (mat as any).length || 164
    setStandardRollLength(rLength)

    const extraAllowance = (mat as any).production_width_allowance ?? (mat as any).material_config?.extra_width_allowance_ft ?? 0.25
    setExtraWidthAllowance(extraAllowance)

    // 3. Available Sheet Sizes
    const sheetSizes = (mat as any).available_sheet_sizes || (mat as any).material_config?.available_sheet_sizes
    if (sheetSizes && Array.isArray(sheetSizes) && sheetSizes.length > 0) {
      setAvailableSheetSizes(sheetSizes)
    }

    // 4. Stock Unit & Purchase Unit
    const pUnit = (mat as any).purchase_unit || mat.unit || 'roll'
    setPurchaseUnit(pUnit)

    // 5. Material Direct Cost (Purchase Rate per SFT)
    const matCostVal = (mat as any).purchase_price_per_sft ?? (mat as any).base_cost ?? (mat as any).purchase_price ?? (mat as any).material_config?.purchase_price_per_sft
    if (matCostVal !== undefined && matCostVal !== null && matCostVal !== '' && Number(matCostVal) > 0) {
      setMaterialCost(Number(matCostVal))
      setPurchasePrice(Number(matCostVal))
      setBaseCostEstimate(Number(matCostVal))
    }
  }

  // Handle selecting Finishing Raw Material (when serviceType === 'finishing')
  const handleSelectFinishingMaterial = (matId: string) => {
    setFinishingMaterialId(matId)
    if (!matId) return

    const mat = availableMaterials.find((m) => m.id === matId)
    if (!mat) return

    const widths: number[] = mat.available_widths_ft || 
      (mat as any).material_config?.available_widths_ft || 
      (mat as any).roll_sizes?.map((r: any) => r.width) ||
      ((mat as any).width ? [(mat as any).width] : [3.25, 4.25, 5.25, 6])

    if (widths && widths.length > 0) {
      setAvailableRollWidths(widths)
    }

    const rLength = mat.standard_roll_length_ft || (mat as any).material_config?.standard_roll_length_ft || (mat as any).length || 164
    setStandardRollLength(rLength)

    const extraAllowance = (mat as any).production_width_allowance ?? (mat as any).material_config?.extra_width_allowance_ft ?? 0
    setExtraWidthAllowance(extraAllowance)

    const sheetSizes = (mat as any).available_sheet_sizes || (mat as any).material_config?.available_sheet_sizes
    if (sheetSizes && Array.isArray(sheetSizes) && sheetSizes.length > 0) {
      setAvailableSheetSizes(sheetSizes)
    }

    const pUnit = (mat as any).purchase_unit || mat.unit || 'roll'
    setPurchaseUnit(pUnit)

    const matCostVal = (mat as any).purchase_price_per_sft ?? (mat as any).base_cost ?? (mat as any).purchase_price ?? (mat as any).material_config?.purchase_price_per_sft
    if (matCostVal !== undefined && matCostVal !== null && matCostVal !== '' && Number(matCostVal) > 0) {
      setMaterialCost(Number(matCostVal))
      setPurchasePrice(Number(matCostVal))
      setBaseCostEstimate(Number(matCostVal))
    }
  }
  const handleApplyInkPreset = (presetKey: keyof typeof INK_CHANNEL_PRESETS) => {
    const preset = INK_CHANNEL_PRESETS[presetKey]
    if (preset) {
      setSelectedInks(preset.map((p) => ({ ...p })))
    }
  }

  // Handle Linking a specific Ink Channel to an Inventory Material
  const handleChannelInkChange = (index: number, matId: string) => {
    const next = [...selectedInks]
    if (!next[index]) return
    if (!matId) {
      next[index].material_id = undefined
      next[index].material_name = undefined
      next[index].unit_price = 2800
      setSelectedInks(next)
      return
    }
    const mat = availableMaterials.find((m) => m.id === matId)
    if (mat) {
      next[index].material_id = mat.id
      next[index].material_name = mat.name
      const price = Number((mat as any).purchase_price || mat.cost_per_unit || (mat as any).base_cost) || 2800
      next[index].unit_price = price
      next[index].unit = (mat as any).purchase_unit || mat.unit || 'bottle'
    }
    setSelectedInks(next)
  }

  // Add Custom Ink Channel
  const handleAddInkChannel = () => {
    if (selectedInks.length >= 8) return
    const channelNames = ['Special Spot', 'Light Black', 'Fluorescent Pink', 'Fluorescent Yellow', 'Primer', 'Custom Color']
    const name = channelNames[selectedInks.length - 4] || `Ink Channel ${selectedInks.length + 1}`
    setSelectedInks([...selectedInks, { channel: name, color_code: '#94a3b8', unit_price: 3500, unit: 'bottle' }])
  }

  // Remove Ink Channel
  const handleRemoveInkChannel = (index: number) => {
    if (selectedInks.length <= 1) return
    setSelectedInks(selectedInks.filter((_, i) => i !== index))
  }

  // Total Direct Unit Cost (Substrate + Ink + Machine + Labor + Finishing + Fabrication + Installation + Delivery + Other)
  const totalDirectCost = useMemo(() => {
    const mat = Number(materialCost !== '' ? materialCost : (purchasePrice !== '' ? purchasePrice : baseCostEstimate)) || 0
    const ink = Number(inkCost) || 0
    const mach = Number(machineCost) || 0
    const lab = Number(laborCost) || 0
    const fin = Number(finishingCost) || 0
    const fab = Number(fabricationCost) || 0
    const inst = Number(installationCost) || 0
    const del = Number(deliveryCost) || 0
    const oth = Number(otherDirectCost) || 0
    return mat + ink + mach + lab + fin + fab + inst + del + oth
  }, [materialCost, purchasePrice, baseCostEstimate, inkCost, machineCost, laborCost, finishingCost, fabricationCost, installationCost, deliveryCost, otherDirectCost])

  // Live Gross Margin Analysis
  const marginMetrics = useMemo(() => {
    const sp = Number(sellingPrice) || 0
    return calculateGrossMargin(totalDirectCost, sp)
  }, [totalDirectCost, sellingPrice])

  // Auto-fill price tiers based on standard industry percentages
  const handleAutoFillTiers = (discountStrategy: 'standard' | 'aggressive' | 'reset') => {
    const sp = Number(sellingPrice) || 0
    if (sp <= 0) return

    if (discountStrategy === 'reset') {
      setPriceTiers({
        retail: sp,
        reseller: sp,
        corporate: sp,
        agency: sp,
        regular: sp,
        custom: sp,
      })
      return
    }

    if (discountStrategy === 'aggressive') {
      setPriceTiers({
        retail: sp,
        reseller: Math.round(sp * 0.75), // 25% discount
        corporate: Math.round(sp * 0.85), // 15% discount
        agency: Math.round(sp * 0.70),    // 30% discount
        regular: Math.round(sp * 0.90),   // 10% discount
        custom: sp,
      })
      return
    }

    // Standard commercial print shop tiers in Bangladesh
    setPriceTiers({
      retail: sp,
      reseller: Math.round(sp * 0.85), // 15% wholesale discount
      corporate: Math.round(sp * 0.90), // 10% corporate contract discount
      agency: Math.round(sp * 0.80),    // 20% creative agency partner discount
      regular: Math.round(sp * 0.95),   // 5% loyal client discount
      custom: sp,
    })
  }

  // Material Toggle for Tab 2 (Additional BOM)
  const handleToggleMaterial = (mat: MaterialRecord) => {
    const exists = requiredMaterials.some((m) => m.material_id === mat.id)
    if (exists) {
      setRequiredMaterials(requiredMaterials.filter((m) => m.material_id !== mat.id))
    } else {
      setRequiredMaterials([
        ...requiredMaterials,
        {
          material_id: mat.id,
          material_name: mat.name,
          is_required: true,
          is_primary: requiredMaterials.length === 0,
          unit: mat.unit,
          waste_percent: 5,
        },
      ])
    }
  }

  // Finishing Options Handlers
  const handleToggleMasterFinishing = (fOption: { id: string; name: string; pricing_method: string; selling_price: number; cost: number }) => {
    const exists = finishingOptions.some((f) => f.name.toLowerCase() === fOption.name.toLowerCase())
    if (exists) {
      setFinishingOptions(finishingOptions.filter((f) => f.name.toLowerCase() !== fOption.name.toLowerCase()))
    } else {
      setFinishingOptions([
        ...finishingOptions,
        {
          id: `fin-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: fOption.name,
          pricing_method: fOption.pricing_method || 'per_sqft',
          unit_price: fOption.selling_price || 0,
          price: fOption.selling_price || 0,
          unit_cost: fOption.cost || 0,
          cost: fOption.cost || 0,
          is_default: false,
        },
      ])
    }
  }

  // Toggle linking a raw material from inventory (Raw Product - Finishing) directly into finishingOptions
  const handleToggleFinishingRawMaterial = (mat: MaterialRecord) => {
    const existsIdx = finishingOptions.findIndex(
      (f) => f.material_id === mat.id || f.name.toLowerCase() === mat.name.toLowerCase()
    )
    if (existsIdx >= 0) {
      setFinishingOptions(finishingOptions.filter((_, i) => i !== existsIdx))
      return
    }

    const pUnit = (mat.unit || (mat as any).purchase_unit || '').toLowerCase()
    const cat = (mat.category || '').toLowerCase()
    const n = (mat.name || '').toLowerCase()

    let pricing_method = 'per_sqft'
    if (
      pUnit === 'meter' ||
      pUnit === 'rft' ||
      cat.includes('seaming') ||
      cat.includes('hemming') ||
      n.includes('seaming') ||
      n.includes('tape') ||
      n.includes('rope')
    ) {
      pricing_method = 'per_rft'
    } else if (
      pUnit === 'piece' ||
      pUnit === 'box' ||
      pUnit === 'pack' ||
      cat.includes('eyelet') ||
      n.includes('eyelet') ||
      n.includes('grommet') ||
      n.includes('stand') ||
      n.includes('ring')
    ) {
      pricing_method = 'per_piece'
    }

    const cost = Number((mat as any).purchase_price_per_sft ?? (mat as any).purchase_price ?? mat.cost_per_unit ?? 0)
    const markup = cost > 0 ? (pricing_method === 'per_piece' ? Math.max(5, Math.ceil(cost * 2.5)) : Math.max(5, Math.ceil(cost * 1.5))) : 8

    setFinishingOptions([
      ...finishingOptions,
      {
        id: `fin-mat-${mat.id}-${Date.now()}`,
        name: mat.name,
        name_bn: (mat as any).name_bn || undefined,
        material_id: mat.id,
        material_name: mat.name,
        pricing_method,
        unit_price: markup,
        price: markup,
        unit_cost: cost,
        cost: cost,
        is_default: false,
      },
    ])
  }

  const handleAddCustomFinishing = () => {
    if (!customFinishingName.trim()) return
    const linkedMat = availableMaterials.find((m) => m.id === customFinishingMaterialId)

    setFinishingOptions([
      ...finishingOptions,
      {
        id: `custom-fin-${Date.now()}`,
        name: customFinishingName.trim(),
        material_id: customFinishingMaterialId || undefined,
        material_name: linkedMat?.name || undefined,
        pricing_method: customFinishingMethod,
        unit_price: Number(customFinishingPrice) || 0,
        price: Number(customFinishingPrice) || 0,
        unit_cost: Number(customFinishingCost) || 0,
        cost: Number(customFinishingCost) || 0,
        is_default: false,
      },
    ])
    setCustomFinishingName('')
    setCustomFinishingMaterialId('')
    setCustomFinishingPrice('')
    setCustomFinishingCost('')
    setShowCustomFinishingForm(false)
  }

  const handleRemoveFinishing = (idx: number) => {
    setFinishingOptions(finishingOptions.filter((_, i) => i !== idx))
  }

  // Additional / Add-ons Handlers
  const handleToggleMasterAdditional = (addOption: { id: string; name: string; pricing_method: string; selling_price: number; cost: number }) => {
    const exists = additionalOptions.some((a) => a.name.toLowerCase() === addOption.name.toLowerCase())
    if (exists) {
      setAdditionalOptions(additionalOptions.filter((a) => a.name.toLowerCase() !== addOption.name.toLowerCase()))
    } else {
      setAdditionalOptions([
        ...additionalOptions,
        {
          id: `addon-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: addOption.name,
          pricing_method: addOption.pricing_method || 'per_piece',
          unit_price: addOption.selling_price || 0,
          price: addOption.selling_price || 0,
          unit_cost: addOption.cost || 0,
          cost: addOption.cost || 0,
        },
      ])
    }
  }

  const handleToggleMasterInstallation = (instOption: { id: string; name: string; pricing_method: string; selling_price: number; cost: number }) => {
    const exists = installationOptions.some((i) => i.name.toLowerCase() === instOption.name.toLowerCase())
    if (exists) {
      setInstallationOptions(installationOptions.filter((i) => i.name.toLowerCase() !== instOption.name.toLowerCase()))
    } else {
      setInstallationOptions([
        ...installationOptions,
        {
          id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: instOption.name,
          pricing_method: instOption.pricing_method || 'per_sqft',
          unit_price: instOption.selling_price || 0,
          price: instOption.selling_price || 0,
          unit_cost: instOption.cost || 0,
          cost: instOption.cost || 0,
          creates_task: true,
        },
      ])
    }
  }

  const handleAddCustomAddon = () => {
    if (!customAddonName.trim()) return
    if (customAddonType === 'pasting') {
      setAdditionalOptions([
        ...additionalOptions,
        {
          id: `custom-addon-${Date.now()}`,
          name: customAddonName.trim(),
          pricing_method: customAddonMethod,
          unit_price: Number(customAddonPrice) || 0,
          price: Number(customAddonPrice) || 0,
          unit_cost: Number(customAddonCost) || 0,
          cost: Number(customAddonCost) || 0,
        },
      ])
    } else {
      setInstallationOptions([
        ...installationOptions,
        {
          id: `custom-inst-${Date.now()}`,
          name: customAddonName.trim(),
          pricing_method: customAddonMethod,
          unit_price: Number(customAddonPrice) || 0,
          price: Number(customAddonPrice) || 0,
          unit_cost: Number(customAddonCost) || 0,
          cost: Number(customAddonCost) || 0,
          creates_task: true,
        },
      ])
    }
    setCustomAddonName('')
    setCustomAddonPrice('')
    setCustomAddonCost('')
    setShowCustomAddonForm(false)
  }

  // Filtered raw materials for Tab 2
  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery) return substrateMaterials
    const q = materialSearchQuery.toLowerCase()
    return substrateMaterials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.sku && m.sku.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
    )
  }, [substrateMaterials, materialSearchQuery])

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setActiveTab('basic')
      setErrorMessage('Service name is required.')
      return
    }

    const sp = Number(sellingPrice) || 0
    if (sp <= 0) {
      setActiveTab('pricing')
      setErrorMessage('Selling price must be greater than 0.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const finalPriceTiers: ProductPriceTiers = {
        retail: priceTiers.retail !== '' ? Number(priceTiers.retail) : sp,
        corporate: priceTiers.corporate !== '' ? Number(priceTiers.corporate) : sp,
        dealer: priceTiers.reseller !== '' ? Number(priceTiers.reseller) : sp,
        wholesale: priceTiers.reseller !== '' ? Number(priceTiers.reseller) : sp,
        custom: priceTiers.custom !== '' ? Number(priceTiers.custom) : sp,
      }
      ;(finalPriceTiers as any).reseller = priceTiers.reseller !== '' ? Number(priceTiers.reseller) : sp
      ;(finalPriceTiers as any).agency = priceTiers.agency !== '' ? Number(priceTiers.agency) : sp
      ;(finalPriceTiers as any).regular = priceTiers.regular !== '' ? Number(priceTiers.regular) : sp

      const selectedMat = availableMaterials.find((m) => m.id === printableMaterialId)
      const primaryMethod = selectedPrintingMethods[0] || ''
      const matCostNum = Number(materialCost !== '' ? materialCost : (purchasePrice !== '' ? purchasePrice : (baseCostEstimate !== '' ? baseCostEstimate : 0))) || 0
      const inkCostNum = Number(inkCost) || 0
      const machineCostNum = Number(machineCost) || 0
      const laborCostNum = Number(laborCost) || 0
      const finishingCostNum = Number(finishingCost) || 0
      const fabricationCostNum = Number(fabricationCost) || 0
      const installationCostNum = Number(installationCost) || 0
      const deliveryCostNum = Number(deliveryCost) || 0
      const otherCostNum = Number(otherDirectCost) || 0
      const totalDirectCostNum = matCostNum + inkCostNum + machineCostNum + laborCostNum + finishingCostNum + fabricationCostNum + installationCostNum + deliveryCostNum + otherCostNum

      const costBreakdown: ProductCostBreakdown = {
        material_cost: matCostNum,
        ink_cost: inkCostNum,
        machine_cost: machineCostNum,
        labor_cost: laborCostNum,
        finishing_cost: finishingCostNum,
        fabrication_cost: fabricationCostNum,
        installation_cost: installationCostNum,
        delivery_cost: deliveryCostNum,
        other_direct_cost: otherCostNum,
        total_direct_cost: totalDirectCostNum,
        material: matCostNum,
        ink: inkCostNum,
        machine: machineCostNum,
        labor: laborCostNum,
        finishing: finishingCostNum,
        fabrication: fabricationCostNum,
        installation: installationCostNum,
        delivery: deliveryCostNum,
        other_direct: otherCostNum,
      }

      const serviceConfig: ServiceConfiguration = {
        dimension_unit: dimensionUnit,
        allow_custom_dimensions: allowCustomDimensions,
        available_widths_ft: purchaseUnit === 'roll' ? availableRollWidths : undefined,
        extra_width_allowance_ft: purchaseUnit === 'roll' ? (Number(extraWidthAllowance) || 0.25) : undefined,
        standard_roll_length_ft: purchaseUnit === 'roll' ? (Number(standardRollLength) || 164) : undefined,
        available_sheet_sizes: purchaseUnit === 'sheet' ? availableSheetSizes : undefined,
        required_materials: requiredMaterials,
        finishing_options: finishingOptions,
        additional_options: additionalOptions,
        installation_options: installationOptions,
        minimum_charge: minimumCharge !== '' ? Number(minimumCharge) : undefined,
        min_charge: minimumCharge !== '' ? Number(minimumCharge) : undefined,
        min_billable_qty: minBillableQty,
        pricing_method: pricingMethod,
        service_type: serviceType,
        print_category: serviceType === 'printing' ? printCategory : undefined,
        finishing_category: serviceType === 'finishing' ? finishingCategory : undefined,
        finishing_material_id: serviceType === 'finishing' ? (finishingMaterialId || undefined) : undefined,
        finishing_material_name: serviceType === 'finishing' ? (availableMaterials.find((m) => m.id === finishingMaterialId)?.name || undefined) : undefined,
        finishing_method: serviceType === 'finishing' ? finishingMethod : undefined,
        lamination_micron: serviceType === 'finishing' ? laminationMicron : undefined,
        lamination_type: serviceType === 'finishing' ? laminationType : undefined,
        printing_methods: selectedPrintingMethods,
        printing_method: primaryMethod,
        printable_material_id: printableMaterialId || undefined,
        printable_material_name: selectedMat?.name || undefined,
        ink_type: inkType,
        selected_inks: selectedInks,
        consume_per_unit_ml: Number(consumePerUnitMl) || 1.2,
        ink_consumption_ml: Number(consumePerUnitMl) || 1.2,
        auto_calculate_ink_cost: autoCalculateInkCost,
        linked_ink_id: selectedInks[0]?.material_id || undefined,
        linked_ink_name: selectedInks.map((i) => i.channel).join(', '),
        ink_cost: inkCostNum,
        ink_cost_per_unit: inkCostNum,
        cost_breakdown: costBreakdown,
      }

      const selectedFinishingMat = availableMaterials.find((m) => m.id === finishingMaterialId)

      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `SRV-${Date.now().toString().slice(-5)}`,
        category: category || (serviceType === 'finishing' ? 'finishing_service' : 'printing_service'),
        product_type: serviceType === 'finishing' ? 'finishing' : 'print_service',
        entity_type: serviceType === 'finishing' ? 'finishing' : 'service',
        commercial_type: 'service',
        is_service: true,
        service_type: serviceType,
        print_category: serviceType === 'printing' ? printCategory : undefined,
        finishing_category: serviceType === 'finishing' ? finishingCategory : undefined,
        finishing_material_id: serviceType === 'finishing' ? (finishingMaterialId || undefined) : undefined,
        finishing_material_name: serviceType === 'finishing' ? (selectedFinishingMat?.name || undefined) : undefined,
        finishing_method: serviceType === 'finishing' ? finishingMethod : undefined,
        lamination_micron: serviceType === 'finishing' ? laminationMicron : undefined,
        lamination_type: serviceType === 'finishing' ? laminationType : undefined,
        unit: sellingUnit as any,
        selling_unit: sellingUnit,
        purchase_unit: purchaseUnit,
        pricing_method: pricingMethod,
        printing_methods: selectedPrintingMethods,
        printing_method_name: selectedPrintingMethods.join(', '),
        printing_method: primaryMethod,
        printable_material_id: printableMaterialId || undefined,
        printable_material_name: selectedMat?.name || undefined,
        ink_type: inkType,
        selected_inks: selectedInks,
        consume_per_unit_ml: Number(consumePerUnitMl) || 1.2,
        ink_consumption_ml: Number(consumePerUnitMl) || 1.2,
        linked_ink_id: selectedInks[0]?.material_id || undefined,
        linked_ink_name: selectedInks.map((i) => i.channel).join(', '),
        ink_cost: inkCostNum,
        selling_price: sp,
        purchase_price: totalDirectCostNum,
        base_cost: totalDirectCostNum,
        cost_breakdown: costBreakdown,
        cost_basis_type: 'direct_cost',
        price_tiers: finalPriceTiers,
        target_margin_percentage: Number(targetMargin) || 35.0,
        min_allowed_margin_percent: Number(minAllowedMargin) || 15.0,
        min_billable_quantity: minBillableQty,
        default_wastage_percentage: defaultWastagePercent,
        available_widths_ft: purchaseUnit === 'roll' ? availableRollWidths : undefined,
        standard_roll_length_ft: purchaseUnit === 'roll' ? (Number(standardRollLength) || 164) : undefined,
        production_width_allowance: purchaseUnit === 'roll' ? (Number(extraWidthAllowance) || 0.25) : undefined,
        production_length_allowance: purchaseUnit === 'roll' ? (Number(extraWidthAllowance) || 0.25) : undefined,
        allowance_unit: 'ft',
        vat_applicable: vatApplicable,
        is_tax_inclusive: isTaxInclusive,
        tax_rate: Number(taxRate) || 0,
        allow_manual_override: allowManualOverride,
        is_active: isActive,
        description: description.trim() || undefined,
        service_config: serviceConfig,
        requires_production: true,
        requires_design: true,
        requires_approval: true,
        requires_finishing: finishingOptions.length > 0,
        requires_installation: installationOptions.length > 0,
      })
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save service configuration.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMaterialRecord = useMemo(() => {
    return availableMaterials.find((m) => m.id === printableMaterialId)
  }, [availableMaterials, printableMaterialId])

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0 ring-1 ring-blue-500/20">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Configure Service: ${initialData.name}` : 'New Printing & Production Service'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                {serviceType.toUpperCase()}
              </Badge>
              {sellingUnit && (
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  {sellingUnit} Billing
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure print category, raw material substrate, ink formulation, automated consumption & commercial cost breakdown.
            </p>
          </div>
        </div>
      }
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 font-medium shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 5-Tab Navigation Stepper Bar (Dimensions Tab Removed) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700/60">
          {[
            { id: 'basic', label: '1. Basic & Print Config', icon: Printer, count: name ? '✓' : null },
            { id: 'materials', label: '2. Additional BOM', icon: Boxes, count: requiredMaterials.length > 0 ? requiredMaterials.length : null },
            { id: 'finishing', label: '3. Finishing', icon: Sparkles, count: finishingOptions.length > 0 ? finishingOptions.length : null },
            { id: 'additionals', label: '4. Add-ons & Install', icon: PlusCircle, count: (additionalOptions.length + installationOptions.length) > 0 ? (additionalOptions.length + installationOptions.length) : null },
            { id: 'pricing', label: '5. Pricing & Margins', icon: DollarSign, count: sellingPrice ? '৳' : null },
          ].map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-2 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap text-xs relative',
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold ring-1 ring-slate-200 dark:ring-slate-600'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400')} />
                <span>{tab.label}</span>
                {tab.count && (
                  <span className={cn(
                    'text-[10px] px-1 py-0.2 rounded-full font-mono font-bold leading-tight',
                    isSelected ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: BASIC INFO & PRINTING SERVICE CONFIGURATION        */}
        {/* ======================================================== */}
        {activeTab === 'basic' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            {/* Section 1: Basic Identity */}
            <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Basic Info & Service Type
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Bilingual naming & category</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold mb-1 block">
                    Service Name (English) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. UV Vinyl Sticker Printing (High Density), Eco PVC Frontlit Banner Print..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 text-xs font-medium"
                    autoFocus
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Service Name (Bangla - বাংলা নাম)
                  </Label>
                  <Input
                    placeholder="যেমন: ইউভি ভিনাইল স্টিকার প্রিন্টিং, পিভিসি ব্যানার..."
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    className="h-9 text-xs font-bengali"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    SKU / Service Code
                  </Label>
                  <Input
                    placeholder="e.g. SRV-UV-VINYL-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Service Type & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Service Type (সার্ভিসের ধরন) <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={serviceType}
                    onChange={(e) => handleSelectServiceType(e.target.value as any)}
                    className="w-full h-9 text-xs rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 px-2.5 font-bold text-blue-900 dark:text-blue-200"
                  >
                    <option value="printing">🖨️ Printing Service (প্রিন্টিং সার্ভিস - Large Format, UV, Offset)</option>
                    <option value="production">🏗️ Production & Fabrication (প্রোডাকশন ও কাঠামো নির্মাণ)</option>
                    <option value="finishing">✂️ Finishing & Lamination (ফিনিশিং, কাটিং ও ল্যামিনেশন)</option>
                    <option value="installation">🔧 Installation & Fitting (সাইট ফিটিং ও ইন্সটলেশন)</option>
                    <option value="delivery">🚚 Delivery & Logistics (ডেলিভারি ও পরিবহন)</option>
                    <option value="general">⚙️ General Service (সাধারণ সার্ভিস)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold block text-slate-800 dark:text-slate-200">
                      Catalog Category (ক্যাটালগ ক্যাটাগরি) <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                      {filteredCatalogCategories.length} {serviceType} Categories
                    </span>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value
                      setCategory(val)
                      const match = (SERVICE_TYPE_CATEGORIES[serviceType] || []).find((c) => c.id === val)
                      if (match) {
                        if (match.defaultUnit) setSellingUnit(match.defaultUnit)
                        if (match.defaultMethod) setPricingMethod(match.defaultMethod)
                      }
                    }}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    {filteredCatalogCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.name_bn ? `(${c.name_bn})` : ''}
                      </option>
                    ))}
                    {category && !filteredCatalogCategories.some((c) => c.id === category) && (
                      <option value={category}>{category}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: If Service Type == 'printing' */}
            {serviceType === 'printing' && (
              <div className="space-y-4 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 pb-2 border-b border-blue-200/60 dark:border-blue-900/60">
                  <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Print Technology, Substrate & Inks Formulation
                  </h4>
                </div>

                {/* Print Category & Printable Material (Inventory Item) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Print Category (প্রিন্ট ক্যাটাগরি) <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={printCategory}
                      onChange={(e) => {
                        const val = e.target.value
                        setPrintCategory(val)
                        const matched = DEFAULT_PRINT_CATEGORIES.find((c) => c.name === val)
                        if (matched) {
                          setInkType(matched.defaultInk)
                          setSelectedPrintingMethods([matched.name_bn || matched.name])
                        }
                      }}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      {DEFAULT_PRINT_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.name_bn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold block">
                        Printable Material (Inventory Item) <span className="text-rose-500">*</span>
                      </Label>
                      {printableMaterialId && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Auto-Linked
                        </span>
                      )}
                    </div>
                    <select
                      value={printableMaterialId}
                      onChange={(e) => handleSelectPrintableMaterial(e.target.value)}
                      className={cn(
                        'w-full h-9 text-xs rounded-md border px-2.5 font-medium transition-colors',
                        printableMaterialId
                          ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <option value="">-- Select Raw Media Substrate / Paper --</option>
                      {substrateMaterials.map((mat) => {
                        const costStr = (mat as any).purchase_price_per_sft || (mat as any).purchase_price || (mat as any).cost_per_unit
                        return (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({mat.unit || (mat as any).purchase_unit || 'unit'}){costStr ? ` — ৳${costStr}/sft` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {/* Print size available: all size that configured and selected from Printable Material */}
                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Print Size Available (From Linked Printable Material)
                      </span>
                    </div>
                    {selectedMaterialRecord ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-mono py-0.5">
                        ✓ {selectedMaterialRecord.name}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        (Default roll media dimensions)
                      </span>
                    )}
                  </div>

                  {purchaseUnit === 'roll' ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                          Active Roll Sizes:
                        </span>
                        {availableRollWidths.map((w) => (
                          <span
                            key={w}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200 shadow-2xs"
                          >
                            <span>{w} ft Roll {extraWidthAllowance !== '' && Number(extraWidthAllowance) > 0 ? `(+${extraWidthAllowance}ft allowance)` : ''}</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        Roll length: <strong>{standardRollLength} ft</strong> • Machine nesting will match customer widths to these configured physical rolls with zero manual entry.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                          Active Sheet Sizes:
                        </span>
                        {availableSheetSizes.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200 shadow-2xs"
                          >
                            <span>{s.label || `${s.width}ft × ${s.length}ft`}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ink Type Selection */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Ink Type (কালির ধরন) <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={inkType}
                    onChange={(e) => setInkType(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    {DEFAULT_INK_TYPES.map((it) => (
                      <option key={it.id} value={it.name}>
                        {it.name} (Avg: ৳{it.defaultRatePerLiter}/L)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Ink (4-6 inks from inventory) */}
                <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                          Select Ink ({selectedInks.length} Inks from Inventory)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Link Cyan, Magenta, Yellow, Black (+ Light Colors/White) to raw inventory ink items
                        </span>
                      </div>
                    </div>

                    {/* Quick Ink Presets */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleApplyInkPreset('cmyk')}
                        className={cn(
                          'px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer',
                          selectedInks.length === 4 && !selectedInks.some((i) => i.channel.includes('White'))
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        4 Inks (CMYK)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyInkPreset('cmyk_lc_lm')}
                        className={cn(
                          'px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer',
                          selectedInks.length === 6 && selectedInks.some((i) => i.channel.includes('Light'))
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        6 Inks (CMYK+LC+LM)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyInkPreset('cmyk_white')}
                        className={cn(
                          'px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer',
                          selectedInks.length === 5 && selectedInks.some((i) => i.channel.includes('White'))
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        5 Inks (CMYK+White)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyInkPreset('cmyk_white_varnish')}
                        className={cn(
                          'px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer',
                          selectedInks.length === 6 && selectedInks.some((i) => i.channel.includes('Varnish'))
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        6 Inks (CMYK+W+V)
                      </button>
                    </div>
                  </div>

                  {/* Ink Channels Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedInks.map((ink, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: ink.color_code || '#64748b' }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                              {ink.channel}
                            </span>
                            <select
                              value={ink.material_id || ''}
                              onChange={(e) => handleChannelInkChange(idx, e.target.value)}
                              className="w-full mt-1 h-7 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 font-medium truncate"
                            >
                              <option value="">-- Link Inventory Ink Bottle/Can --</option>
                              {inkMaterials.length > 0 ? (
                                inkMaterials.map((im) => (
                                  <option key={im.id} value={im.id}>
                                    {im.name} (৳{(im as any).purchase_price || im.cost_per_unit || (im as any).base_cost || 2800}/L)
                                  </option>
                                ))
                              ) : (
                                availableMaterials.map((im) => (
                                  <option key={im.id} value={im.id}>
                                    {im.name}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white block">
                            ৳{ink.unit_price || 2800}/L
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            (৳{((ink.unit_price || 2800) / 1000).toFixed(2)}/ml)
                          </span>
                        </div>

                        {selectedInks.length > 4 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInkChannel(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Remove channel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedInks.length < 8 && (
                    <button
                      type="button"
                      onClick={handleAddInkChannel}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Additional Ink Channel (White, Varnish, Spot)
                    </button>
                  )}
                </div>

                {/* Consume per Unit [ ] (ml) & Inks Cost Auto Calculate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Consume per Unit (ml) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0.1"
                        placeholder="1.2"
                        value={consumePerUnitMl}
                        onChange={(e) => setConsumePerUnitMl(e.target.value)}
                        className="h-9 text-xs font-mono font-bold pr-12 bg-white dark:bg-slate-900"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                        ml / {sellingUnit || 'sft'}
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 mt-1 block font-medium">
                      ✓ Automatically reduces stock from linked ink inventory on job production runs.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold block text-slate-800 dark:text-slate-200">
                        Inks Cost Auto Calculate
                      </Label>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoCalculateInkCost}
                          onChange={(e) => setAutoCalculateInkCost(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-blue-600"
                        />
                        <span>Auto Calculate</span>
                      </label>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="3.36"
                        value={inkCost}
                        onChange={(e) => {
                          setInkCost(e.target.value === '' ? '' : parseFloat(e.target.value))
                          setAutoCalculateInkCost(false)
                        }}
                        className="h-9 text-xs font-mono font-bold pl-7 pr-12 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                        / {sellingUnit || 'sft'}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                      <Calculator className="w-3 h-3 shrink-0" />
                      <span>{Number(consumePerUnitMl) || 1.2} ml × ৳{(autoCalculatedInkMetrics.avgRatePerMl).toFixed(3)}/ml = ৳{Number(inkCost || 0).toFixed(2)}/{sellingUnit || 'sft'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2.1: If Service Type == 'finishing' (Finishing & Lamination) */}
            {serviceType === 'finishing' && (
              <div className="space-y-4 p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 animate-in fade-in-0">
                <div className="flex items-center gap-2 pb-2 border-b border-purple-200/60 dark:border-purple-900/60">
                  <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Finishing & Lamination Configuration
                  </h4>
                </div>

                {/* Finishing Category & Primary Finishing Raw Material (Raw Product - Finishing) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Finishing Category (ফিনিশিং ক্যাটাগরি) <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={finishingCategory}
                      onChange={(e) => {
                        const val = e.target.value
                        setFinishingCategory(val)
                        const match = DEFAULT_FINISHING_CATEGORIES.find((c) => c.name === val)
                        if (match) {
                          setFinishingMethod(match.name)
                          if (match.defaultUnit) {
                            setSellingUnit(match.defaultUnit)
                            const unitMatch = COMMON_SELLING_UNITS.find((u) => u.value === match.defaultUnit)
                            if (unitMatch) setPricingMethod(unitMatch.defaultMethod)
                          }
                          if (match.defaultRate && (!sellingPrice || Number(sellingPrice) === 0)) {
                            setSellingPrice(match.defaultRate)
                          }
                          if (match.defaultCost && (!materialCost || Number(materialCost) === 0)) {
                            setMaterialCost(match.defaultCost)
                          }
                        }
                      }}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      {DEFAULT_FINISHING_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.name_bn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold block">
                        Finishing Raw Material (Raw Product — Finishing) <span className="text-rose-500">*</span>
                      </Label>
                      {finishingMaterialId && (
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Auto-Linked
                        </span>
                      )}
                    </div>
                    <select
                      value={finishingMaterialId}
                      onChange={(e) => handleSelectFinishingMaterial(e.target.value)}
                      className={cn(
                        'w-full h-9 text-xs rounded-md border px-2.5 font-medium transition-colors',
                        finishingMaterialId
                          ? 'border-purple-400 dark:border-purple-700 bg-purple-50/40 dark:bg-purple-950/20 text-purple-950 dark:text-purple-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <option value="">-- Select Raw Finishing Media / Film / Hardware --</option>
                      {(finishingMaterials.length > 0 ? finishingMaterials : availableMaterials).map((mat) => {
                        const costStr = (mat as any).purchase_price_per_sft || (mat as any).purchase_price || (mat as any).cost_per_unit
                        return (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({mat.unit || (mat as any).purchase_unit || 'unit'}){costStr ? ` — ৳${costStr}/${mat.unit || 'unit'}` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {/* Finishing & Lamination Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Film Thickness / Micron (ফিল্মের পুরুত্ব)
                    </Label>
                    <select
                      value={laminationMicron}
                      onChange={(e) => setLaminationMicron(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      {LAMINATION_MICRON_PRESETS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Surface Finish / Texture (সারফেস ফিনিশ)
                    </Label>
                    <select
                      value={laminationType}
                      onChange={(e) => setLaminationType(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      <option value="Gloss">Gloss (চকচকে গ্লসি)</option>
                      <option value="Matt">Matt / Matte (ম্যাট ফিনিশ)</option>
                      <option value="Soft Touch">Soft Touch / Velvet (ভেলভেট)</option>
                      <option value="Satin">Satin (সাটিন ফিনিশ)</option>
                      <option value="Anti-Scratch">Anti-Scratch Heavy Duty (স্ক্র্যাচ-প্রুফ)</option>
                      <option value="3D Holographic">3D Holographic (হোলোগ্রাফিক)</option>
                      <option value="Sand Textured">Sand Textured (ফ্লোর স্যান্ড টেক্সচার)</option>
                    </select>
                  </div>
                </div>

                {/* Available Finishing Widths / Sheet Sizes from Linked Material */}
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/50 dark:bg-purple-950/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Available Finishing Sizes (From Linked Raw Material)
                      </span>
                    </div>
                    {finishingMaterialId ? (
                      <Badge className="bg-purple-600 text-white text-[10px] font-mono py-0.5">
                        ✓ Linked Material Configured
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        (Standard roll & sheet finishing widths)
                      </span>
                    )}
                  </div>

                  {purchaseUnit === 'roll' ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-purple-950 dark:text-purple-200">
                          Active Roll Sizes:
                        </span>
                        {availableRollWidths.map((w) => (
                          <span
                            key={w}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-xs font-mono font-bold text-purple-900 dark:text-purple-200 shadow-2xs"
                          >
                            <span>{w} ft Laminator Roll {extraWidthAllowance !== '' && Number(extraWidthAllowance) > 0 ? `(+${extraWidthAllowance}ft allowance)` : ''}</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-purple-800 dark:text-purple-300">
                        Roll length: <strong>{standardRollLength} ft</strong> • Automatic nesting will align jobs with these roll dimensions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-purple-950 dark:text-purple-200">
                          Active Sheet Sizes:
                        </span>
                        {availableSheetSizes.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-xs font-mono font-bold text-purple-900 dark:text-purple-200 shadow-2xs"
                          >
                            <span>{s.label || `${s.width}ft × ${s.length}ft`}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Commercial Billing Units & Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Selling Unit (বিলিং একক) <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={sellingUnit}
                  onChange={(e) => {
                    const u = e.target.value
                    setSellingUnit(u)
                    const match = COMMON_SELLING_UNITS.find((x) => x.value === u)
                    if (match) setPricingMethod(match.defaultMethod)
                  }}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                >
                  {COMMON_SELLING_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Min Billable Qty Floor
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min="0.1"
                    value={minBillableQty}
                    onChange={(e) => setMinBillableQty(parseFloat(e.target.value) || 1)}
                    className="h-9 text-xs font-mono pr-10"
                  />
                  <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400 uppercase">
                    {sellingUnit}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Trim Bleed Margin (Inches)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={productionBleedInches}
                    onChange={(e) => setProductionBleedInches(parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs font-mono pr-8"
                  />
                  <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">in</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Technical Scope & Service Description
              </Label>
              <textarea
                rows={2}
                placeholder="e.g. High resolution 1440 DPI outdoor UV curing print. UV resistant for up to 3 years without color fading..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Active in Quotations, POS & Job Orders Catalog</span>
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('materials')}
                className="h-8 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 gap-1"
              >
                <span>Next: Additional BOM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: COMPATIBLE RAW MEDIA & ADDITIONAL BOM              */}
        {/* ======================================================== */}
        {activeTab === 'materials' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Additional Consumables & BOM Media
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-amber-50 text-amber-700 border-amber-200">
                {requiredMaterials.length} Selected
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search additional materials / accessories..."
                    value={materialSearchQuery}
                    onChange={(e) => setMaterialSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Default Wastage Buffer:
                  </Label>
                  <div className="relative w-28">
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={defaultWastagePercent}
                      onChange={(e) => setDefaultWastagePercent(parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs font-mono font-bold pr-8"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredMaterials.length === 0 ? (
                  <div className="sm:col-span-2 py-8 text-center text-xs text-slate-500">
                    No matching materials found in inventory stock.
                  </div>
                ) : (
                  filteredMaterials.map((mat) => {
                    const reqItem = requiredMaterials.find((m) => m.material_id === mat.id)
                    const isSelected = Boolean(reqItem)
                    return (
                      <div
                        key={mat.id}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all flex items-center justify-between text-xs',
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        <div className="flex-1 cursor-pointer" onClick={() => handleToggleMaterial(mat)}>
                          <span className="font-bold">{mat.name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                            {mat.sku} • {(mat as any).purchase_unit || mat.unit || 'unit'}
                            {((mat as any).purchase_price || mat.cost_per_unit || mat.last_purchase_price) ? ` • ৳${(mat as any).purchase_price || mat.cost_per_unit || mat.last_purchase_price}` : ''}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleMaterial(mat)}
                          className={cn(
                            'p-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
                            isSelected ? 'text-blue-600' : 'text-slate-400'
                          )}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: FINISHING OPERATIONS & RAW MATERIALS               */}
        {/* ======================================================== */}
        {activeTab === 'finishing' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Post-Press Finishing Operations & Raw Materials
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select raw materials from inventory (Raw Product — Finishing) or add standard finishing operations.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-purple-50 text-purple-700 border-purple-200">
                {finishingOptions.length} Configured
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Section A: Available Raw Materials from Inventory (Raw Product - Finishing) */}
              <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                      Available Raw Materials (Raw Product — Finishing)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFinishingFilterTab('finishing_only')}
                      className={cn(
                        'px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer',
                        finishingFilterTab === 'finishing_only'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      Finishing Only ({finishingMaterials.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinishingFilterTab('all_materials')}
                      className={cn(
                        'px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer',
                        finishingFilterTab === 'all_materials'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      All Raw Materials ({availableMaterials.length})
                    </button>
                  </div>
                </div>

                {/* Search Bar for Raw Finishing Materials */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search raw finishing materials (Lamination film, eyelets, tapes, adhesives, boards...)"
                    value={finishingMaterialSearchQuery}
                    onChange={(e) => setFinishingMaterialSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Raw Finishing Materials Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {(() => {
                    const sourceList = finishingFilterTab === 'finishing_only'
                      ? (finishingMaterials.length > 0 ? finishingMaterials : availableMaterials)
                      : availableMaterials

                    const query = finishingMaterialSearchQuery.toLowerCase().trim()
                    const filtered = query
                      ? sourceList.filter(
                          (m) =>
                            m.name.toLowerCase().includes(query) ||
                            ((m as any).name_bn && (m as any).name_bn.toLowerCase().includes(query)) ||
                            (m.sku && m.sku.toLowerCase().includes(query)) ||
                            (m.category && m.category.toLowerCase().includes(query))
                        )
                      : sourceList

                    if (filtered.length === 0) {
                      return (
                        <div className="sm:col-span-3 py-6 text-center text-xs text-slate-500">
                          No matching raw finishing materials found in inventory.
                        </div>
                      )
                    }

                    return filtered.map((mat) => {
                      const isLinked = finishingOptions.some(
                        (f) => f.material_id === mat.id || f.name.toLowerCase() === mat.name.toLowerCase()
                      )
                      const costStr = (mat as any).purchase_price_per_sft || (mat as any).purchase_price || mat.cost_per_unit || (mat as any).base_cost
                      const pUnit = (mat as any).purchase_unit || mat.unit || 'unit'

                      return (
                        <div
                          key={mat.id}
                          className={cn(
                            'p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between gap-2',
                            isLinked
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-100 ring-1 ring-purple-500 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          )}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                                {mat.name}
                              </span>
                              <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 font-mono shrink-0">
                                {mat.category || 'material'}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                              {mat.sku} • {pUnit}{costStr ? ` • ৳${costStr}/${pUnit}` : ''}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                            <span className="text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300">
                              {costStr ? `Cost: ৳${costStr}` : 'Raw Item'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleFinishingRawMaterial(mat)}
                              className={cn(
                                'px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer',
                                isLinked
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/60 dark:text-purple-200'
                              )}
                            >
                              {isLinked ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Linked</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Add to Service</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Section B: Configured Finishing Options List */}
              {finishingOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Configured Finishing Operations for this Service ({finishingOptions.length})
                    </Label>
                    <span className="text-[11px] text-slate-500">
                      Customize billing rate & unit cost
                    </span>
                  </div>

                  <div className="space-y-2">
                    {finishingOptions.map((opt, idx) => (
                      <div
                        key={opt.id || idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {opt.name}
                            </span>
                            {opt.material_name && (
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                                🔗 {opt.material_name}
                              </Badge>
                            )}
                            {opt.is_default && (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <div>
                            <Label className="text-[10px] text-slate-500 block mb-0.5">Method</Label>
                            <select
                              value={opt.pricing_method}
                              onChange={(e) => {
                                const next = [...finishingOptions]
                                next[idx].pricing_method = e.target.value
                                setFinishingOptions(next)
                              }}
                              className="h-7 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 font-medium"
                            >
                              <option value="per_sqft">Per Sqft (৳/sft)</option>
                              <option value="per_rft">Per Rft (৳/rft)</option>
                              <option value="per_piece">Per Piece (৳/pc)</option>
                              <option value="fixed">Fixed Charge (৳)</option>
                              <option value="per_job">Per Job (৳)</option>
                            </select>
                          </div>

                          <div>
                            <Label className="text-[10px] text-slate-500 block mb-0.5">Selling Price (৳)</Label>
                            <Input
                              type="number"
                              value={opt.unit_price ?? opt.price ?? ''}
                              onChange={(e) => {
                                const next = [...finishingOptions]
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                                next[idx].unit_price = val
                                next[idx].price = val
                                setFinishingOptions(next)
                              }}
                              className="w-20 h-7 text-xs font-mono font-bold"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] text-slate-500 block mb-0.5">Unit Cost (৳)</Label>
                            <Input
                              type="number"
                              value={opt.unit_cost ?? opt.cost ?? ''}
                              onChange={(e) => {
                                const next = [...finishingOptions]
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                                next[idx].unit_cost = val
                                next[idx].cost = val
                                setFinishingOptions(next)
                              }}
                              className="w-20 h-7 text-xs font-mono"
                            />
                          </div>

                          <label className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-3">
                            <input
                              type="checkbox"
                              checked={Boolean(opt.is_default)}
                              onChange={(e) => {
                                const next = [...finishingOptions]
                                next[idx].is_default = e.target.checked
                                setFinishingOptions(next)
                              }}
                              className="w-3.5 h-3.5 rounded text-purple-600"
                            />
                            <span>Default</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveFinishing(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer pt-3"
                            title="Remove option"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section C: Preset Standard Finishing Options */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Quick Standard Finishing Presets:
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { id: 'f-1', name: 'Eyelets (আইলেটস)', pricing_method: 'per_piece', selling_price: 5, cost: 2 },
                    { id: 'f-2', name: 'Hemming / Edge Seaming (সেলাই)', pricing_method: 'per_perimeter_ft', selling_price: 3, cost: 1 },
                    { id: 'f-3', name: 'Gloss Lamination (গ্লস ল্যামিনেশন)', pricing_method: 'per_sqft', selling_price: 8, cost: 4 },
                    { id: 'f-4', name: 'Matt Lamination (ম্যাট ল্যামিনেশন)', pricing_method: 'per_sqft', selling_price: 8, cost: 4 },
                    { id: 'f-5', name: 'Die-Cutting / Contour Cut (ডাই-কাট)', pricing_method: 'per_piece', selling_price: 15, cost: 5 },
                    { id: 'f-6', name: 'Pocket / Pole Loop (পকেট সিমিং)', pricing_method: 'per_perimeter_ft', selling_price: 10, cost: 4 },
                    ...finishingMasterOptions,
                  ].map((opt) => {
                    const isSelected = finishingOptions.some((f) => f.name.toLowerCase() === opt.name.toLowerCase())
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleToggleMasterFinishing(opt)}
                        className={cn(
                          'p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between',
                          isSelected
                            ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 shadow-2xs font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        )}
                      >
                        <div>
                          <span className="block font-bold">{opt.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ৳{opt.selling_price}/{opt.pricing_method === 'per_piece' ? 'pc' : 'sft'}
                          </span>
                        </div>
                        <div className={cn('p-1 rounded-md', isSelected ? 'bg-purple-600 text-white' : 'text-slate-400')}>
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Section D: Custom Finishing Form */}
              <div className="pt-2">
                {showCustomFinishingForm ? (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
                      Add Custom Finishing Option
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] mb-1 block">Finishing Name <span className="text-rose-500">*</span></Label>
                        <Input
                          placeholder="e.g. 5mm Sunboard Mounting, Spot Foil..."
                          value={customFinishingName}
                          onChange={(e) => setCustomFinishingName(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="text-[11px] mb-1 block">Link Raw Inventory Item (Optional)</Label>
                        <select
                          value={customFinishingMaterialId}
                          onChange={(e) => {
                            const matId = e.target.value
                            setCustomFinishingMaterialId(matId)
                            if (matId) {
                              const mat = availableMaterials.find((m) => m.id === matId)
                              if (mat) {
                                if (!customFinishingName) setCustomFinishingName(mat.name)
                                const c = Number((mat as any).purchase_price_per_sft || (mat as any).purchase_price || mat.cost_per_unit || 0)
                                setCustomFinishingCost(c)
                                setCustomFinishingPrice(c > 0 ? Math.ceil(c * 1.6) : 15)
                              }
                            }
                          }}
                          className="w-full h-8 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                        >
                          <option value="">-- Optional: Link Raw Material --</option>
                          {availableMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] mb-1 block">Pricing Method</Label>
                        <select
                          value={customFinishingMethod}
                          onChange={(e) => setCustomFinishingMethod(e.target.value)}
                          className="w-full h-8 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                        >
                          <option value="per_sqft">Per Sqft (৳/sft)</option>
                          <option value="per_rft">Per Rft (৳/rft)</option>
                          <option value="per_piece">Per Piece (৳/pc)</option>
                          <option value="fixed">Fixed Rate (৳)</option>
                          <option value="per_job">Per Job (৳)</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] mb-1 block">Selling Price (৳)</Label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={customFinishingPrice}
                          onChange={(e) => setCustomFinishingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] mb-1 block">Unit Cost (৳)</Label>
                        <Input
                          type="number"
                          placeholder="15"
                          value={customFinishingCost}
                          onChange={(e) => setCustomFinishingCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomFinishingForm(false)} className="h-7 text-xs">
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={handleAddCustomFinishing} className="h-7 text-xs bg-purple-600 text-white font-bold hover:bg-purple-700">
                        Save Finishing Option
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomFinishingForm(true)}
                    className="text-xs border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 dark:text-purple-300 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Finishing Option
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ADD-ONS & SITE INSTALLATION                        */}
        {/* ======================================================== */}
        {activeTab === 'additionals' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Add-on Accessories & Site Installation
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-teal-50 text-teal-700 border-teal-200">
                {additionalOptions.length + installationOptions.length} Configured
              </Badge>
            </div>

            <div className="space-y-3">
              {/* Preset Master Options */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Select Standard Add-ons & Fitting Services:
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { id: 'a-1', name: 'X-Stand Hardware (এক্স-স্ট্যান্ড)', pricing_method: 'per_piece', selling_price: 350, cost: 220, type: 'addon' },
                    { id: 'a-2', name: 'Roll-up Banner Stand (রোল-আপ স্ট্যান্ড)', pricing_method: 'per_piece', selling_price: 850, cost: 550, type: 'addon' },
                    { id: 'i-1', name: 'Glass Wall Pasting (গ্লাস স্টিকার পেস্টিং)', pricing_method: 'per_sqft', selling_price: 15, cost: 8, type: 'install' },
                    { id: 'i-2', name: 'Rooftop Billboard Erection (বিলবোর্ড ফিটিং)', pricing_method: 'per_job', selling_price: 2500, cost: 1200, type: 'install' },
                    { id: 'i-3', name: 'Shop Front Signboard Fitting (দোকান সাইনবোর্ড)', pricing_method: 'per_sqft', selling_price: 25, cost: 12, type: 'install' },
                    { id: 'a-3', name: 'Dhaka City Transport / Delivery (ডেলিভারি)', pricing_method: 'fixed', selling_price: 300, cost: 150, type: 'addon' },
                  ].map((opt) => {
                    const isSelected = opt.type === 'addon'
                      ? additionalOptions.some((a) => a.name.toLowerCase() === opt.name.toLowerCase())
                      : installationOptions.some((i) => i.name.toLowerCase() === opt.name.toLowerCase())
                    return (
                      <div
                        key={opt.id}
                        onClick={() => opt.type === 'addon' ? handleToggleMasterAdditional(opt) : handleToggleMasterInstallation(opt)}
                        className={cn(
                          'p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between',
                          isSelected
                            ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 shadow-2xs font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        )}
                      >
                        <div>
                          <span className="block font-bold">{opt.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ৳{opt.selling_price}/{opt.pricing_method === 'per_piece' ? 'pc' : opt.pricing_method === 'fixed' ? 'job' : 'sft'}
                          </span>
                        </div>
                        <div className={cn('p-1 rounded-md', isSelected ? 'bg-teal-600 text-white' : 'text-slate-400')}>
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: PRICING, 9-HEAD DIRECT COST BREAKDOWN & MARGINS   */}
        {/* ======================================================== */}
        {activeTab === 'pricing' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  5
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Pricing, 9-Head Direct Cost Breakdown & Margins
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                Direct Unit Cost: ৳{totalDirectCost.toFixed(2)} / {sellingUnit || 'sft'}
              </Badge>
            </div>

            {/* Selling Price & Minimum Charge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <div>
                <Label className="text-xs font-bold mb-1 block text-slate-900 dark:text-white">
                  Base Selling Rate (৳ / {sellingUnit || 'sft'}) <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 45"
                    value={sellingPrice}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                      setSellingPrice(val)
                    }}
                    required
                    className="h-9 text-xs font-mono font-bold pl-7 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Minimum Job Charge (এককালীন ন্যূনতম বিল)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="150"
                    value={minimumCharge}
                    onChange={(e) => setMinimumCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="h-9 text-xs font-mono pl-7"
                  />
                </div>
              </div>
            </div>

            {/* 9-Point Direct Cost Breakdown Panel */}
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-blue-200/60 dark:border-blue-800/60">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Direct Unit Cost Breakdown (9 Cost Heads)
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-200">
                  Total Direct: ৳{totalDirectCost.toFixed(2)} / {sellingUnit || 'sft'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {/* 1. Substrate Material */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    1. Media Material
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={materialCost}
                      onChange={(e) => setMaterialCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4"
                    />
                  </div>
                </div>

                {/* 2. Ink Cost */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    2. Ink Cost
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={inkCost}
                      onChange={(e) => setInkCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4 text-blue-600 dark:text-blue-400 font-bold"
                    />
                  </div>
                </div>

                {/* 3. Machine & Power */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    3. Machine & Power
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={machineCost}
                      onChange={(e) => setMachineCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4"
                    />
                  </div>
                </div>

                {/* 4. Operator Labor */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    4. Operator Labor
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={laborCost}
                      onChange={(e) => setLaborCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4"
                    />
                  </div>
                </div>

                {/* 5. Finishing & Eyelets */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    5. Finishing
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={finishingCost}
                      onChange={(e) => setFinishingCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4"
                    />
                  </div>
                </div>

                {/* 6. Fabrication */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    6. Fabrication
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={fabricationCost}
                      onChange={(e) => setFabricationCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4"
                    />
                  </div>
                </div>

                {/* 7. Installation */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    7. Installation
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={installationCost}
                      onChange={(e) => setInstallationCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4"
                    />
                  </div>
                </div>

                {/* 8. Delivery */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    8. Delivery
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={deliveryCost}
                      onChange={(e) => setDeliveryCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4"
                    />
                  </div>
                </div>

                {/* 9. Other Direct */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    9. Other Direct
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[11px] text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={otherDirectCost}
                      onChange={(e) => setOtherDirectCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-7 text-xs font-mono pl-4"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Profit Margin Metrics Banner */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Gross Profit Margin: {marginMetrics.grossMarginPercent.toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    Unit Profit: ৳{(marginMetrics.grossProfit).toFixed(2)} / {sellingUnit || 'sft'} (Cost: ৳{totalDirectCost.toFixed(2)} | Sell: ৳{Number(sellingPrice || 0).toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoFillTiers('standard')}
                  className="h-8 text-xs font-bold border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
                >
                  Auto-Fill Price Tiers (15% Wholesale)
                </Button>
              </div>
            </div>

            {/* Multi-Tier Pricing Fields */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Customer Category Price Tiers (৳ / {sellingUnit || 'sft'}):
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                <div>
                  <Label className="text-[11px] mb-1 block">Retail (খুচরা)</Label>
                  <Input
                    type="number"
                    value={priceTiers.retail}
                    onChange={(e) => setPriceTiers({ ...priceTiers, retail: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block">Reseller (পাইকারি)</Label>
                  <Input
                    type="number"
                    value={priceTiers.reseller}
                    onChange={(e) => setPriceTiers({ ...priceTiers, reseller: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block">Corporate (কর্পোরেট)</Label>
                  <Input
                    type="number"
                    value={priceTiers.corporate}
                    onChange={(e) => setPriceTiers({ ...priceTiers, corporate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block">Agency (বিজ্ঞাপনী সংস্থা)</Label>
                  <Input
                    type="number"
                    value={priceTiers.agency}
                    onChange={(e) => setPriceTiers({ ...priceTiers, agency: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block">Regular (নিয়মিত)</Label>
                  <Input
                    type="number"
                    value={priceTiers.regular}
                    onChange={(e) => setPriceTiers({ ...priceTiers, regular: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block">Special / VIP</Label>
                  <Input
                    type="number"
                    value={priceTiers.custom}
                    onChange={(e) => setPriceTiers({ ...priceTiers, custom: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation & Submit Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeTab !== 'basic' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'materials') setActiveTab('basic')
                  else if (activeTab === 'finishing') setActiveTab('materials')
                  else if (activeTab === 'additionals') setActiveTab('finishing')
                  else if (activeTab === 'pricing') setActiveTab('additionals')
                }}
                className="h-10 px-3.5 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
            )}

            {activeTab !== 'pricing' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'basic') setActiveTab('materials')
                  else if (activeTab === 'materials') setActiveTab('finishing')
                  else if (activeTab === 'finishing') setActiveTab('additionals')
                  else if (activeTab === 'additionals') setActiveTab('pricing')
                }}
                className="h-10 px-4 rounded-xl font-bold border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 hover:bg-blue-50 gap-1"
              >
                <span>Next Tab</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Service...</span>
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" />
                  <span>{initialData ? 'Update Service' : 'Save Printing Service'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}

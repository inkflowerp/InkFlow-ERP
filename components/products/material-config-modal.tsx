'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Boxes,
  DollarSign,
  Layers,
  AlertCircle,
  Building,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Maximize2,
  Calculator,
  Percent,
  TrendingUp,
  Tag,
  Warehouse,
  FileText,
  Info,
  Sparkles,
  Wrench,
  ShieldCheck,
  Package,
  Calendar,
  Clock,
  Printer,
  Droplets,
  Coins,
  ChevronRight,
  Sliders,
  RotateCcw,
  CheckCircle2,
  Hash,
  Scale,
} from 'lucide-react'
import type {
  ProductRecord,
  MaterialConfiguration,
  UnitOfMeasure,
  MaterialRollSizeConfig,
  ProductPriceTiers,
} from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { formatBDT } from '@/lib/formatters'
import { calculateGrossMargin, calculateSuggestedSellingPrice } from '@/lib/units'
import { cn } from '@/lib/utils'

interface MaterialConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (materialData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
  suppliers?: Array<{ id: string; name: string; contact_person?: string; phone?: string }>
  printingMethods?: Array<{ id: string; name: string; name_bn?: string | null }>
}

export type MaterialPhysicalType = 'roll' | 'sheet' | 'liquid' | 'rigid' | 'accessory' | 'electrical'

export const PHYSICAL_FORM_CARDS: Array<{
  id: MaterialPhysicalType
  title: string
  titleBn: string
  subtitle: string
  icon: any
  badge: string
  accentColor: string
  borderClass: string
  badgeClass: string
  iconClass: string
}> = [
  {
    id: 'roll',
    title: 'Continuous Roll Media',
    titleBn: 'রোল মিডিয়া',
    subtitle: 'Vinyl, Flex Banner, Canvas, Synthetic Paper, Lamination Film',
    icon: Layers,
    badge: 'Roll Substrate',
    accentColor: 'blue',
    borderClass: 'border-blue-200 dark:border-blue-900/60 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    iconClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
  },
  {
    id: 'sheet',
    title: 'Rigid Sheet & Board',
    titleBn: 'শীট ও বোর্ড',
    subtitle: 'PVC Foam Board, Cast Acrylic, ACP, MDF, Sunboard, Coroplast',
    icon: Maximize2,
    badge: 'Flat Sheet',
    accentColor: 'emerald',
    borderClass: 'border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  },
  {
    id: 'liquid',
    title: 'Liquid & Inks',
    titleBn: 'কালি ও লিকুইড',
    subtitle: 'Eco-Solvent, Solvent, UV Curable LED, Sublimation Inks, Cleaners',
    icon: Droplets,
    badge: 'Chemical/Ink',
    accentColor: 'rose',
    borderClass: 'border-rose-200 dark:border-rose-900/60 hover:border-rose-500 hover:bg-rose-50/40 dark:hover:bg-rose-950/30',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    iconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
  },
  {
    id: 'rigid',
    title: 'Framing & Metal Profiles',
    titleBn: 'মেটাল ও পাইপ',
    subtitle: 'MS Box Pipe, Aluminum Channels, SS Strips, Angle Bars',
    icon: Wrench,
    badge: 'Linear Profile',
    accentColor: 'indigo',
    borderClass: 'border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    iconClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
  },
  {
    id: 'accessory',
    title: 'Hardware & Fasteners',
    titleBn: 'হার্ডওয়্যার ও আইলেট',
    subtitle: 'Brass Eyelets, VHB Foam Tapes, Standoffs, Roll-up Stands, Glue',
    icon: Package,
    badge: 'Accessories',
    accentColor: 'amber',
    borderClass: 'border-amber-200 dark:border-amber-900/60 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/30',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
  },
  {
    id: 'electrical',
    title: 'Electrical & Lighting',
    titleBn: 'এলইডি ও পাওয়ার',
    subtitle: 'LED Injection Modules, 12V SMPS Supplies, Neon Flex, Dimmers',
    icon: Sparkles,
    badge: 'Illumination',
    accentColor: 'cyan',
    borderClass: 'border-cyan-200 dark:border-cyan-900/60 hover:border-cyan-500 hover:bg-cyan-50/40 dark:hover:bg-cyan-950/30',
    badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    iconClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300',
  },
]

const COMMON_PURCHASE_UNITS: { value: string; label: string; defaultType: MaterialPhysicalType }[] = [
  { value: 'roll', label: 'Continuous Roll (রোল - Media Substrate)', defaultType: 'roll' },
  { value: 'sheet', label: 'Rigid Sheet / Board (শীট / বোর্ড)', defaultType: 'sheet' },
  { value: 'bottle', label: 'Bottle / Can (বোতল - Ink/Chemical)', defaultType: 'liquid' },
  { value: 'liter', label: 'Liter (লিটার)', defaultType: 'liquid' },
  { value: 'box', label: 'Box / Pack (বক্স / প্যাকেট)', defaultType: 'accessory' },
  { value: 'piece', label: 'Piece (পিস)', defaultType: 'accessory' },
  { value: 'kg', label: 'Kilogram (কেজি)', defaultType: 'rigid' },
  { value: 'meter', label: 'Meter (মিটার)', defaultType: 'rigid' },
  { value: 'pack', label: 'Packet (প্যাক)', defaultType: 'accessory' },
]

const COMMON_USAGE_UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'sft', label: 'Square Feet (sft) — স্কয়ার ফিট' },
  { value: 'sqin', label: 'Square Inch (sqin) — স্কয়ার ইঞ্চি' },
  { value: 'sqm', label: 'Square Meter (sqm) — বর্গমিটার' },
  { value: 'piece', label: 'Piece (পিস) — একক সংখ্যা' },
  { value: 'liter', label: 'Liter / ML (লিটার/মিলি)' },
  { value: 'rft', label: 'Running Feet (rft) — দৈর্ঘ্য' },
  { value: 'kg', label: 'Kilogram (কেজি)' },
]

export const MATERIAL_TYPE_CATEGORIES: Record<
  MaterialPhysicalType,
  Array<{ id: string; name: string; name_bn?: string; defaultPurchaseUnit: string; defaultUsageUnit: UnitOfMeasure }>
> = {
  roll: [
    { id: 'flex_banner', name: 'PVC Flex Banner (Frontlit / Backlit / Blackout)', name_bn: 'পিভিসি ব্যানার রোল (ফ্রন্টলিট / ব্যাকলিট)', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'sft' },
    { id: 'adhesive_vinyl', name: 'Self-Adhesive Vinyl (Gloss / Matt / Clear / Frosted)', name_bn: 'ভিনাইল স্টিকার রোল (গ্লস / ম্যাট / ফ্রস্টেড)', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'sft' },
    { id: 'one_way_vision', name: 'One-Way Vision Window Perforated Film', name_bn: 'ওয়ান-ওয়ে ভিশন গ্লাস ফিল্ম', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'sft' },
    { id: 'reflective_vinyl', name: 'Reflective & Specialty Vinyl Sheeting', name_bn: 'রিফ্লেক্টিভ স্টিকার রোল', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'sft' },
    { id: 'lamination_rolls', name: 'Thermal & Cold Lamination Film Rolls', name_bn: 'ল্যামিনেশন ফিল্ম রোল (থার্মাল / কোল্ড)', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'sft' },
    { id: 'canvas_fabrics', name: 'Canvas, Satin & Textile Print Fabrics', name_bn: 'ক্যানভাস ও টেক্সটাইল ফেব্রিক রোল', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'sft' },
    { id: 'photo_papers', name: 'High-Gloss Photo Paper & PP Synthetic Rolls', name_bn: 'ফটো পেপার ও সিন্থেটিক মিডিয়া রোল', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'sft' },
    { id: 'mesh_backlit', name: 'Mesh Banner & Backlit PET Film Rolls', name_bn: 'মেশ ও ব্যাকলিট ফিল্ম রোল', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'sft' },
  ],
  sheet: [
    { id: 'pvc_foam_board', name: 'PVC Foam Sheet & Sunboard (3mm–18mm)', name_bn: 'পিভিসি ফোম বোর্ড ও সানবোর্ড', defaultPurchaseUnit: 'sheet', defaultUsageUnit: 'sft' },
    { id: 'acrylic_sheets', name: 'Cast Acrylic Sheets (Clear / Opal / Color 2mm–12mm)', name_bn: 'কাস্ট এক্রিলিক শীট (স্বচ্ছ / কালার)', defaultPurchaseUnit: 'sheet', defaultUsageUnit: 'sft' },
    { id: 'acp_sheets', name: 'Aluminum Composite Panels (ACP 3mm, 4mm)', name_bn: 'অ্যালুমিনিয়াম কম্পোজিট প্যানেল (ACP)', defaultPurchaseUnit: 'sheet', defaultUsageUnit: 'sft' },
    { id: 'coroplast_sheets', name: 'PP Coroplast / Hollow Flute Board (3mm–5mm)', name_bn: 'করোপ্লাস্ট ও পিপি ফ্লুট শীট', defaultPurchaseUnit: 'sheet', defaultUsageUnit: 'sft' },
    { id: 'mdf_wood_boards', name: 'MDF, HDF & Plywood Craft Sheets', name_bn: 'এমডিএফ ও কাঠের বোর্ড শীট', defaultPurchaseUnit: 'sheet', defaultUsageUnit: 'sft' },
    { id: 'commercial_paper_cards', name: 'Art Paper, Art Card & Kraft Board Sheets', name_bn: 'আর্ট পেপার ও কার্ড শীট (১২০–৩৫০ জিএসএম)', defaultPurchaseUnit: 'sheet', defaultUsageUnit: 'piece' },
  ],
  liquid: [
    { id: 'eco_solvent_inks', name: 'Eco-Solvent Inks (CMYK + Light Colors)', name_bn: 'ইকো-সলভেন্ট কালি (বোতল)', defaultPurchaseUnit: 'bottle', defaultUsageUnit: 'liter' },
    { id: 'solvent_inks', name: 'Solvent Heavy Duty Inks (CMYK 5L / 1L)', name_bn: 'সলভেন্ট ব্যানার কালি (ক্যান/বোতল)', defaultPurchaseUnit: 'bottle', defaultUsageUnit: 'liter' },
    { id: 'uv_curable_inks', name: 'UV Curable LED Inks (CMYK + White + Varnish)', name_bn: 'ইউভি কিউরেবল এলইডি কালি', defaultPurchaseUnit: 'bottle', defaultUsageUnit: 'liter' },
    { id: 'textile_inks', name: 'Dye Sublimation & DTF Textile Inks', name_bn: 'সাবলিমেশন ও ডিটিএফ টেক্সটাইল কালি', defaultPurchaseUnit: 'bottle', defaultUsageUnit: 'liter' },
    { id: 'offset_process_inks', name: 'Commercial Offset Sheetfed Process Inks', name_bn: 'অফসেট প্রসেস পেস্ট কালি', defaultPurchaseUnit: 'kg', defaultUsageUnit: 'kg' },
    { id: 'screen_print_inks', name: 'Screen Printing Plastisol & Water Paste Inks', name_bn: 'স্ক্রিন প্রিন্ট পেস্ট ও কেমিক্যাল', defaultPurchaseUnit: 'kg', defaultUsageUnit: 'kg' },
    { id: 'cleaning_chemicals', name: 'Printhead Cleaning Solutions & Flushing Fluids', name_bn: 'হেড ক্লিনিং সলিউশন ও ফ্লাশিং ফ্লুইড', defaultPurchaseUnit: 'bottle', defaultUsageUnit: 'liter' },
  ],
  rigid: [
    { id: 'ms_pipes_bars', name: 'Mild Steel (MS) Box Pipes & Angle Bars', name_bn: 'এমএস স্কয়ার বক্স পাইপ ও এঙ্গেল বার', defaultPurchaseUnit: 'piece', defaultUsageUnit: 'rft' },
    { id: 'aluminum_profiles', name: 'Aluminum Extrusion Channels & Snap Profiles', name_bn: 'অ্যালুমিনিয়াম চ্যানেল ও ফ্রেম প্রোফাইল', defaultPurchaseUnit: 'piece', defaultUsageUnit: 'rft' },
    { id: 'ss_pipes_strips', name: 'Stainless Steel (SS 201/304) Pipes & Flat Strips', name_bn: 'এসএস পাইপ ও স্ট্রিপ', defaultPurchaseUnit: 'piece', defaultUsageUnit: 'rft' },
    { id: 'gi_pipes_truss', name: 'GI Pipes & Structural Billboard Truss Steel', name_bn: 'জিআই পাইপ ও হেভি ট্রাস মেটাল', defaultPurchaseUnit: 'piece', defaultUsageUnit: 'rft' },
  ],
  accessory: [
    { id: 'eyelets_grommets', name: 'Brass, Nickel & Metal Eyelets / Grommets', name_bn: 'আইলেট ও গ্রোমেট (বক্স/প্যাকেট)', defaultPurchaseUnit: 'box', defaultUsageUnit: 'piece' },
    { id: 'display_stands', name: 'Portable Display Stands (X-Banner, Roll-up, Pop-up)', name_bn: 'এক্স-ব্যানার ও রোল-আপ ডিসপ্লে স্ট্যান্ড', defaultPurchaseUnit: 'piece', defaultUsageUnit: 'piece' },
    { id: 'adhesives_tapes', name: 'Industrial VHB Foam Tapes & Double Tapes', name_bn: 'ভিএইচবি ফোম টেপ ও আঠা', defaultPurchaseUnit: 'piece', defaultUsageUnit: 'piece' },
    { id: 'standoff_studs', name: 'Acrylic & Signboard Standoff Spacer Studs', name_bn: 'স্টাড নাট-বোল্ট ও স্পেসার', defaultPurchaseUnit: 'box', defaultUsageUnit: 'piece' },
    { id: 'binding_spirals', name: 'Wiro Binding Coils, Spirals & Hard Covers', name_bn: 'স্পাইরাল কয়েল ও বাইন্ডিং মেটেরিয়াল', defaultPurchaseUnit: 'box', defaultUsageUnit: 'piece' },
    { id: 'packaging_materials', name: 'Protective Bubble Wrap, Stretch Film & Packaging', name_bn: 'বাবল র‍্যাপ ও প্যাকেজিং মেটেরিয়াল', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'piece' },
  ],
  electrical: [
    { id: 'led_modules', name: 'Injection LED Modules (1.2W / 1.5W Samsung/Epistar)', name_bn: 'ইনজেকশন এলইডি মডিউল (স্ট্রিং)', defaultPurchaseUnit: 'pack', defaultUsageUnit: 'piece' },
    { id: 'power_supplies', name: 'Rainproof Switching Power Supplies (12V / 24V SMPS)', name_bn: '১২ভি/২৪ভি পাওয়ার সাপ্লাই ট্রান্সফরমার', defaultPurchaseUnit: 'piece', defaultUsageUnit: 'piece' },
    { id: 'led_neon_strips', name: 'Flexible LED Neon Strips & Silicone Diffusers', name_bn: 'ফ্লেক্সিবল এলইডি নিয়ন স্ট্রিপ', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'rft' },
    { id: 'cables_controllers', name: 'Multi-Core Electrical Cables & Dimmers', name_bn: 'কপার কেবল, টাইমার ও কন্ট্রোলার', defaultPurchaseUnit: 'roll', defaultUsageUnit: 'rft' },
  ],
}

// Quick Preset Roll Widths
const QUICK_ROLL_WIDTH_PRESETS = [
  { width: 2, label: '2ft (24")' },
  { width: 3, label: '3ft (36")' },
  { width: 3.25, label: '3.25ft (39")' },
  { width: 4, label: '4ft (48")' },
  { width: 4.25, label: '4.25ft (51")' },
  { width: 5, label: '5ft (60")' },
  { width: 5.25, label: '5.25ft (63")' },
  { width: 6, label: '6ft (72")' },
  { width: 8.5, label: '8.5ft (102")' },
  { width: 10, label: '10ft (120")' },
  { width: 10.5, label: '10.5ft (126")' },
  { width: 10.66, label: '10.66ft (128")' },
  { width: 12, label: '12ft (144")' },
  { width: 16, label: '16ft (192")' },
]

// Quick Preset Roll Lengths
const QUICK_ROLL_LENGTH_PRESETS = [
  { length: 50, label: '50ft' },
  { length: 100, label: '100ft' },
  { length: 150, label: '150ft' },
  { length: 164, label: '164ft (50m)' },
  { length: 200, label: '200ft' },
  { length: 328, label: '328ft (100m)' },
  { length: 500, label: '500ft' },
]

// Quick Preset Sheet Sizes
const QUICK_SHEET_PRESETS = [
  { width: 4, length: 8, label: '4ft × 8ft (Standard Board)' },
  { width: 4, length: 6, label: '4ft × 6ft' },
  { width: 5, length: 10, label: '5ft × 10ft (Large Board)' },
  { width: 6, length: 10, label: '6ft × 10ft (Super Board)' },
  { width: 2, length: 4, label: '2ft × 4ft (Small Panel)' },
  { width: 3, length: 6, label: '3ft × 6ft' },
]

// Substrate Finish Options
const SUBSTRATE_FINISH_OPTIONS = [
  { value: 'gloss', label: 'Glossy / Shine (চকচকে)' },
  { value: 'matte', label: 'Matte / Non-Glare (ম্যাট / প্রতিফলনহীন)' },
  { value: 'satin', label: 'Satin / Semi-Gloss (সেমি-গ্লস)' },
  { value: 'clear', label: 'Ultra-Clear Transparent (স্বচ্ছ)' },
  { value: 'frosted', label: 'Frosted / Etched Glass (ফ্রস্টেড)' },
  { value: 'backlit', label: 'Translucent Backlit (ব্যাকলিট লাইটবক্স)' },
  { value: 'blockout', label: 'Blockout / 100% Blackout (ব্লকআউট)' },
  { value: 'metallic', label: 'Metallic / Chrome / Gold (মেটালিক)' },
  { value: 'textured', label: 'Textured Canvas / Embossed (টেক্সচার্ড)' },
]

// Durability Options
const DURABILITY_OPTIONS = [
  { value: 'indoor', label: 'Indoor Promo (অভ্যন্তরীণ ইনডোর)' },
  { value: 'outdoor_1yr', label: 'Outdoor 1-Year Standard (১ বছর আউটডোর)' },
  { value: 'outdoor_2yr', label: 'Outdoor 2-Year Medium Term (২ বছর আউটডোর)' },
  { value: 'outdoor_3yr', label: 'Outdoor 3-5 Year Heavy Duty (৩-৫ বছর আউটডোর)' },
  { value: 'cast_automotive', label: 'Cast / Automotive Grade 5-7 Years (প্রিমিয়াম কাস্ট)' },
]

// Production Role Options
const PRODUCTION_ROLE_OPTIONS = [
  { value: 'primary_substrate', label: 'Primary Print Substrate (মূল প্রিন্ট মিডিয়া)' },
  { value: 'lamination_film', label: 'Lamination Overcoat Film (ল্যামিনেশন ফিল্ম)' },
  { value: 'backing_board', label: 'Rigid Backing / Mounting Board (মাউন্টিং বোর্ড)' },
  { value: 'ink_consumable', label: 'Ink / Liquid Consumable (প্রিন্টার কালি)' },
  { value: 'structure_metal', label: 'Frame & Structure Metal (ফ্রেম মেটাল)' },
  { value: 'fastener_hardware', label: 'Fastener / Eyelet Hardware (আইলেট ও হার্ডওয়্যার)' },
  { value: 'illumination_led', label: 'LED & Electrical Module (এলইডি ও পাওয়ার)' },
  { value: 'packaging', label: 'Packaging & Protection (প্যাকেজিং)' },
]

// Default Printing Methods
const DEFAULT_PRINTING_METHODS = [
  'Eco-Solvent Print',
  'Solvent Large Format',
  'UV Flatbed Print',
  'UV Roll-to-Roll',
  'Latex Print',
  'Dye Sublimation',
  'DTF Textile Print',
  'Screen Printing',
  'Laser Cutting',
  'CNC Router Cutting',
  'Commercial Offset',
]

// Default Ink Types
const DEFAULT_INK_TYPES = [
  'Eco-Solvent High Pigment Ink',
  'Solvent Heavy Duty Ink',
  'UV LED Curable Flexible Ink',
  'UV LED Rigid Ink',
  'Water-based Pigment Ink',
  'Dye Sublimation Ink',
  'DTF Textile Ink',
]

export function MaterialConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
  suppliers = [],
  printingMethods = [],
}: MaterialConfigModalProps) {
  // Tab State
  const [activeTab, setActiveTab] = useState<'basic' | 'geometry' | 'costing' | 'inventory' | 'production'>('basic')

  // --------------------------------------------------------------------------
  // TAB 1: BASIC IDENTITY & SUBSTRATE SPECIFICATIONS
  // --------------------------------------------------------------------------
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('flex_banner')
  const [materialType, setMaterialType] = useState<MaterialPhysicalType>('roll')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')

  // Substrate Specifications
  const [brand, setBrand] = useState('')
  const [finish, setFinish] = useState('gloss')
  const [weightGsm, setWeightGsm] = useState<number | ''>('')
  const [durabilityGrade, setDurabilityGrade] = useState('outdoor_1yr')

  // --------------------------------------------------------------------------
  // TAB 2: PHYSICAL GEOMETRY & VARIATIONS MATRIX
  // --------------------------------------------------------------------------
  const [purchaseUnit, setPurchaseUnit] = useState('roll')
  const [usageUnit, setUsageUnit] = useState<UnitOfMeasure>('sft')
  const [dimensionUnit, setDimensionUnit] = useState<'ft' | 'inch' | 'mm' | 'm'>('ft')

  // Roll Geometry
  const [configuredRolls, setConfiguredRolls] = useState<MaterialRollSizeConfig[]>([
    { width: 10, extra_allowance: 0.25, length: 164 },
  ])
  const [standardRollLength, setStandardRollLength] = useState<number | string>(164)
  const [extraWidthAllowance, setExtraWidthAllowance] = useState<number | string>(0.25)
  const [newWidthInput, setNewWidthInput] = useState<string>('10')

  // Sheet Geometry
  const [availableSheetSizes, setAvailableSheetSizes] = useState<Array<{ width: number; length: number; label?: string }>>([
    { width: 4, length: 8, label: '4ft × 8ft (Standard Board)' },
  ])
  const [newSheetWidthInput, setNewSheetWidthInput] = useState<string>('4')
  const [newSheetLengthInput, setNewSheetLengthInput] = useState<string>('8')
  const [thicknessMm, setThicknessMm] = useState<number | ''>('')

  // Liquid Consumables Specs
  const [liquidVolumeMl, setLiquidVolumeMl] = useState<number | ''>(1000)
  const [inkChemistry, setInkChemistry] = useState('Eco-Solvent')
  const [coverageYieldSqft, setCoverageYieldSqft] = useState<number | ''>(1000)

  // Metal Profiles & Extrusions Specs
  const [profileLengthFt, setProfileLengthFt] = useState<number | ''>(20)
  const [profileSectionType, setProfileSectionType] = useState('1" MS Square Box Pipe (20 gauge)')

  // Fasteners & Accessories Specs
  const [packQuantity, setPackQuantity] = useState<number | ''>(1000)

  // --------------------------------------------------------------------------
  // TAB 3: COSTING, PURCHASING & RESALE PRICING
  // --------------------------------------------------------------------------
  const [purchasePricePerSft, setPurchasePricePerSft] = useState<number | ''>('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [wastePercent, setWastePercent] = useState<number>(5)
  const [landedCostMarkupPercent, setLandedCostMarkupPercent] = useState<number>(0)

  // Resale & Customer Price Tiers
  const [sellingPrice, setSellingPrice] = useState<number | ''>('')
  const [targetMargin, setTargetMargin] = useState<number>(35)
  const [minAllowedMargin, setMinAllowedMargin] = useState<number>(15)
  const [allowManualOverride, setAllowManualOverride] = useState(true)
  const [vatApplicable, setVatApplicable] = useState(false)
  const [isTaxInclusive, setIsTaxInclusive] = useState(false)
  const [taxRate, setTaxRate] = useState<number>(7.5)

  const [priceTiers, setPriceTiers] = useState<{
    retail: number | ''
    corporate: number | ''
    dealer: number | ''
    wholesale: number | ''
    custom: number | ''
  }>({
    retail: '',
    corporate: '',
    dealer: '',
    wholesale: '',
    custom: '',
  })

  // --------------------------------------------------------------------------
  // TAB 4: INVENTORY, STORAGE & REORDER INTELLIGENCE
  // --------------------------------------------------------------------------
  const [storageLocation, setStorageLocation] = useState('Main Store - Media Rack')
  const [reorderLevel, setReorderLevel] = useState<number>(5)
  const [reorderQuantity, setReorderQuantity] = useState<number | ''>(10)
  const [maxStockLevel, setMaxStockLevel] = useState<number | ''>('')
  const [leadTimeDays, setLeadTimeDays] = useState<number | ''>(2)
  const [barcode, setBarcode] = useState('')
  const [trackBatches, setTrackBatches] = useState(true)
  const [shelfLifeMonths, setShelfLifeMonths] = useState<number | ''>('')
  const [primarySupplierId, setPrimarySupplierId] = useState('')
  const [primarySupplierName, setPrimarySupplierName] = useState('')
  const [supplierSku, setSupplierSku] = useState('')
  const [supplierMoq, setSupplierMoq] = useState<number | ''>(1)

  // --------------------------------------------------------------------------
  // TAB 5: PRODUCTION & MACHINE COMPATIBILITY
  // --------------------------------------------------------------------------
  const [productionRole, setProductionRole] = useState('primary_substrate')
  const [compatiblePrintingMethods, setCompatiblePrintingMethods] = useState<string[]>([
    'Eco-Solvent Print',
    'Solvent Large Format',
  ])
  const [compatibleInkTypes, setCompatibleInkTypes] = useState<string[]>([
    'Eco-Solvent High Pigment Ink',
    'Solvent Heavy Duty Ink',
  ])
  const [machineSettingsNotes, setMachineSettingsNotes] = useState('')

  // Status & Error
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // --------------------------------------------------------------------------
  // DERIVED GEOMETRY CALCULATIONS
  // --------------------------------------------------------------------------
  const totalUnitArea = useMemo(() => {
    if (materialType === 'roll' || purchaseUnit === 'roll') {
      const parsedInput = parseFloat(newWidthInput)
      const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
      const currentLen = isNaN(parsedLen) || parsedLen <= 0 ? 164 : parsedLen

      const activeRoll = configuredRolls.find((r) => r.width === parsedInput && (r.length || 164) === currentLen)
        || configuredRolls.find((r) => r.width === parsedInput)
        || (configuredRolls.length > 0 ? configuredRolls[0] : null)

      const currentW = !isNaN(parsedInput) && parsedInput > 0
        ? parsedInput
        : (activeRoll?.width || 10)
      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
      const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? (activeRoll?.extra_allowance ?? 0.25) : parsedAllowance
      const len = currentLen
      const effectiveW = currentW + allowance
      return Number((effectiveW * len).toFixed(2))
    }
    if (materialType === 'sheet' || purchaseUnit === 'sheet') {
      const parsedW = parseFloat(newSheetWidthInput)
      const parsedL = parseFloat(newSheetLengthInput)
      const firstSheet = availableSheetSizes[0] || {
        width: !isNaN(parsedW) && parsedW > 0 ? parsedW : 4,
        length: !isNaN(parsedL) && parsedL > 0 ? parsedL : 8,
      }
      return (firstSheet.width || 4) * (firstSheet.length || 8)
    }
    if (purchaseUnit === 'box' || purchaseUnit === 'pack') {
      return Number(packQuantity) || 1000
    }
    return 1
  }, [materialType, purchaseUnit, configuredRolls, newWidthInput, extraWidthAllowance, standardRollLength, availableSheetSizes, newSheetWidthInput, newSheetLengthInput, packQuantity])

  // Filtered Catalog Categories based strictly on the selected Physical Form / Classification
  const filteredCatalogCategories = useMemo(() => {
    const builtIn = MATERIAL_TYPE_CATEGORIES[materialType as keyof typeof MATERIAL_TYPE_CATEGORIES] || MATERIAL_TYPE_CATEGORIES.roll

    const custom = categories.filter((c) => {
      if (c.applies_to_product_types && Array.isArray(c.applies_to_product_types) && c.applies_to_product_types.length > 0) {
        return (
          c.applies_to_product_types.includes(materialType) ||
          c.applies_to_product_types.includes('all') ||
          c.applies_to_product_types.includes('material') ||
          c.applies_to_product_types.includes('materials')
        )
      }

      const n = (c.name || '').toLowerCase()
      const s = (c.slug || '').toLowerCase()

      if (materialType === 'roll') {
        return (
          n.includes('roll') ||
          n.includes('রোল') ||
          s.includes('roll') ||
          n.includes('vinyl') ||
          n.includes('flex') ||
          n.includes('banner') ||
          n.includes('sticker') ||
          n.includes('film') ||
          n.includes('canvas') ||
          n.includes('paper')
        )
      }
      if (materialType === 'sheet') {
        return (
          n.includes('sheet') ||
          n.includes('শীট') ||
          s.includes('sheet') ||
          n.includes('board') ||
          n.includes('বোর্ড') ||
          n.includes('acrylic') ||
          n.includes('foam') ||
          n.includes('acp') ||
          n.includes('sunboard')
        )
      }
      if (materialType === 'liquid') {
        return (
          n.includes('ink') ||
          n.includes('কালি') ||
          s.includes('ink') ||
          n.includes('liquid') ||
          n.includes('chemical') ||
          n.includes('flush') ||
          n.includes('cleaning')
        )
      }
      if (materialType === 'rigid') {
        return (
          n.includes('pipe') ||
          n.includes('পাইপ') ||
          n.includes('profile') ||
          n.includes('metal') ||
          n.includes('channel') ||
          n.includes('steel') ||
          n.includes('aluminum') ||
          n.includes('frame')
        )
      }
      if (materialType === 'accessory') {
        return (
          n.includes('hardware') ||
          n.includes('accessory') ||
          n.includes('eyelet') ||
          n.includes('আইলেট') ||
          n.includes('stand') ||
          n.includes('tape') ||
          n.includes('glue') ||
          n.includes('stud')
        )
      }
      if (materialType === 'electrical') {
        return (
          n.includes('led') ||
          n.includes('এলইডি') ||
          n.includes('power') ||
          n.includes('supply') ||
          n.includes('smps') ||
          n.includes('neon') ||
          n.includes('light') ||
          n.includes('electric')
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
  }, [materialType, categories])

  // Handle switching Physical Form / Classification
  const handleSelectMaterialType = (t: MaterialPhysicalType) => {
    setMaterialType(t)
    const availableCats = MATERIAL_TYPE_CATEGORIES[t] || []
    if (availableCats.length > 0) {
      setCategory(availableCats[0].id)
      setPurchaseUnit(availableCats[0].defaultPurchaseUnit)
      setUsageUnit(availableCats[0].defaultUsageUnit)
    } else {
      if (t === 'roll') {
        setPurchaseUnit('roll')
        setUsageUnit('sft')
      } else if (t === 'sheet') {
        setPurchaseUnit('sheet')
        setUsageUnit('sft')
      } else if (t === 'liquid') {
        setPurchaseUnit('bottle')
        setUsageUnit('liter')
      } else if (t === 'rigid') {
        setPurchaseUnit('piece')
        setUsageUnit('rft')
      } else if (t === 'accessory') {
        setPurchaseUnit('box')
        setUsageUnit('piece')
      } else if (t === 'electrical') {
        setPurchaseUnit('pack')
        setUsageUnit('piece')
      }
    }

    // Adjust production role defaults
    if (t === 'roll') setProductionRole('primary_substrate')
    else if (t === 'sheet') setProductionRole('backing_board')
    else if (t === 'liquid') setProductionRole('ink_consumable')
    else if (t === 'rigid') setProductionRole('structure_metal')
    else if (t === 'accessory') setProductionRole('fastener_hardware')
    else if (t === 'electrical') setProductionRole('illumination_led')
  }

  // Populate data on open / change
  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'materials')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || initialData.material_spec || '')
      setPurchaseUnit(initialData.purchase_unit || 'roll')

      const formula = (typeof initialData.pricing_formula === 'object' && initialData.pricing_formula !== null ? initialData.pricing_formula : {}) as any
      const matCfg: MaterialConfiguration = initialData.material_config || formula.material_config || {}
      
      const pType = matCfg.material_type ||
        (initialData.purchase_unit === 'sheet'
          ? 'sheet'
          : initialData.purchase_unit === 'bottle' || initialData.purchase_unit === 'liter'
          ? 'liquid'
          : initialData.purchase_unit === 'box' || initialData.purchase_unit === 'piece'
          ? 'accessory'
          : 'roll')
      setMaterialType(pType as MaterialPhysicalType)
      
      setBrand(matCfg.brand || '')
      setFinish(matCfg.finish || 'gloss')
      setWeightGsm(matCfg.weight_gsm || '')
      setDurabilityGrade(matCfg.durability_grade || 'outdoor_1yr')
      setLandedCostMarkupPercent(matCfg.landed_cost_markup_percent || 0)

      const stdLen = matCfg.standard_roll_length_ft || initialData.standard_roll_length_ft || formula.standard_roll_length_ft || (initialData as any).roll_length_ft || 164
      const rawAllowance = matCfg.extra_width_allowance_ft !== undefined
        ? matCfg.extra_width_allowance_ft
        : initialData.production_width_allowance !== undefined
        ? initialData.production_width_allowance
        : formula.production_width_allowance !== undefined
        ? formula.production_width_allowance
        : 0.25

      // Unpack configured rolls with individual per-roll extra allowances and lengths
      let initialRolls: MaterialRollSizeConfig[] = []
      if (matCfg.roll_sizes && Array.isArray(matCfg.roll_sizes) && matCfg.roll_sizes.length > 0) {
        initialRolls = matCfg.roll_sizes
          .map((r: any) => ({
            width: Number(r.width),
            extra_allowance: r.extra_allowance !== undefined ? Number(r.extra_allowance) : Number(rawAllowance) || 0.25,
            length: r.length !== undefined ? Number(r.length) : Number(stdLen) || 164,
          }))
          .filter((r: MaterialRollSizeConfig) => !isNaN(r.width) && r.width > 0)
      } else if (formula.roll_sizes && Array.isArray(formula.roll_sizes) && formula.roll_sizes.length > 0) {
        initialRolls = formula.roll_sizes
          .map((r: any) => ({
            width: Number(r.width),
            extra_allowance: r.extra_allowance !== undefined ? Number(r.extra_allowance) : Number(rawAllowance) || 0.25,
            length: r.length !== undefined ? Number(r.length) : Number(stdLen) || 164,
          }))
          .filter((r: MaterialRollSizeConfig) => !isNaN(r.width) && r.width > 0)
      } else if ((initialData as any).roll_sizes && Array.isArray((initialData as any).roll_sizes) && (initialData as any).roll_sizes.length > 0) {
        initialRolls = (initialData as any).roll_sizes
          .map((r: any) => ({
            width: Number(r.width),
            extra_allowance: r.extra_allowance !== undefined ? Number(r.extra_allowance) : Number(rawAllowance) || 0.25,
            length: r.length !== undefined ? Number(r.length) : Number(stdLen) || 164,
          }))
          .filter((r: MaterialRollSizeConfig) => !isNaN(r.width) && r.width > 0)
      } else {
        const rawWidths: any[] = (matCfg.available_widths_ft && matCfg.available_widths_ft.length > 0)
          ? matCfg.available_widths_ft
          : (initialData.available_widths_ft && initialData.available_widths_ft.length > 0)
          ? initialData.available_widths_ft
          : (formula.available_widths_ft && formula.available_widths_ft.length > 0)
          ? formula.available_widths_ft
          : ((initialData as any).roll_width_ft ? [Number((initialData as any).roll_width_ft)] : [10])
        const parsedRawAllowance = typeof rawAllowance === 'number' ? rawAllowance : (parseFloat(rawAllowance) || 0.25)
        initialRolls = Array.from(new Set(rawWidths.map((w: any) => Number(w))))
          .filter((w: number) => !isNaN(w) && w > 0)
          .map((w: number) => ({
            width: w,
            extra_allowance: parsedRawAllowance,
            length: Number(stdLen) || 164,
          }))
      }

      if (initialRolls.length === 0) {
        initialRolls = [{ width: 10, extra_allowance: 0.25, length: 164 }]
      }

      initialRolls.sort((a, b) => a.width - b.width)
      setConfiguredRolls(initialRolls)

      const activeRoll = initialRolls[initialRolls.length - 1]
      setNewWidthInput(activeRoll.width.toString())
      setExtraWidthAllowance(activeRoll.extra_allowance ?? 0.25)
      setStandardRollLength(activeRoll.length ?? (Number(stdLen) || 164))

      const sheets = (matCfg.available_sheet_sizes && matCfg.available_sheet_sizes.length > 0)
        ? matCfg.available_sheet_sizes
        : (initialData.available_sheet_sizes && initialData.available_sheet_sizes.length > 0)
        ? initialData.available_sheet_sizes
        : (formula.available_sheet_sizes && formula.available_sheet_sizes.length > 0)
        ? formula.available_sheet_sizes
        : [
            { width: 4, length: 8, label: '4ft × 8ft (Standard Board)' },
          ]
      setAvailableSheetSizes(sheets)
      if (sheets.length > 0) {
        setNewSheetWidthInput(sheets[sheets.length - 1].width.toString())
        setNewSheetLengthInput(sheets[sheets.length - 1].length.toString())
      }

      setUsageUnit((matCfg.usage_unit as any) || initialData.unit || initialData.selling_unit || 'sft')
      setWastePercent(matCfg.waste_percent ?? initialData.default_wastage_percentage ?? 5)
      
      const reorder = matCfg.reorder_level !== undefined
        ? matCfg.reorder_level
        : formula.reorder_level !== undefined
        ? formula.reorder_level
        : (initialData.min_order_quantity !== undefined && Number(initialData.min_order_quantity) !== 1.0 ? Number(initialData.min_order_quantity) : 5)
      setReorderLevel(reorder)
      setReorderQuantity(matCfg.reorder_quantity || 10)
      setMaxStockLevel(matCfg.max_stock_level || '')
      setLeadTimeDays(matCfg.lead_time_days || 2)
      setBarcode(matCfg.barcode || '')
      setTrackBatches(matCfg.track_batches !== false)
      setShelfLifeMonths(matCfg.shelf_life_months || '')

      setPrimarySupplierId(matCfg.primary_supplier_id || '')
      setPrimarySupplierName(matCfg.primary_supplier_name || '')
      setSupplierSku(matCfg.supplier_sku || '')
      setSupplierMoq(matCfg.moq || 1)

      setProductionRole(matCfg.production_role || (pType === 'roll' ? 'primary_substrate' : pType === 'sheet' ? 'backing_board' : 'primary_substrate'))
      setCompatiblePrintingMethods(matCfg.compatible_printing_methods || ['Eco-Solvent Print', 'Solvent Large Format'])
      setCompatibleInkTypes(matCfg.compatible_ink_types || ['Eco-Solvent High Pigment Ink', 'Solvent Heavy Duty Ink'])

      setThicknessMm(matCfg.thickness_mm || '')
      setStorageLocation(matCfg.storage_location || 'Main Store - Media Rack')
      setPackQuantity(matCfg.pack_quantity || 1000)

      // Resale Pricing
      setSellingPrice(initialData.selling_price || '')
      setTargetMargin(initialData.target_margin_percentage ?? 35)
      setMinAllowedMargin(initialData.min_allowed_margin_percent ?? 15)
      setAllowManualOverride(initialData.allow_manual_override !== false)
      setVatApplicable(Boolean(initialData.vat_applicable))
      setIsTaxInclusive(Boolean(initialData.is_tax_inclusive))
      setTaxRate(initialData.tax_rate ?? 7.5)

      const tiers = initialData.price_tiers || matCfg.price_tiers || {}
      setPriceTiers({
        retail: tiers.retail ?? initialData.selling_price ?? '',
        corporate: tiers.corporate ?? '',
        dealer: tiers.dealer ?? '',
        wholesale: tiers.wholesale ?? '',
        custom: tiers.custom ?? '',
      })

      // Calculate initial purchase price and purchase price per SFT
      const activeEffectiveW = activeRoll.width + (activeRoll.extra_allowance ?? 0)
      const activeLen = activeRoll.length ?? (Number(stdLen) || 164)
      const rollArea = Number((activeEffectiveW * activeLen).toFixed(2))
      const area = (matCfg.material_type === 'sheet' || initialData.purchase_unit === 'sheet')
        ? ((sheets[0]?.width || 4) * (sheets[0]?.length || 8))
        : (initialData.purchase_unit === 'box' || initialData.purchase_unit === 'pack')
        ? (Number(matCfg.pack_quantity) || 1000)
        : rollArea

      const rawPerSftPrice = matCfg.purchase_price_per_sft ?? formula.purchase_price_per_sft
      const rawPurPrice = initialData.purchase_price ?? matCfg.purchase_price
      const rawBaseCost = initialData.base_cost ?? matCfg.effective_unit_cost

      if (rawPerSftPrice !== undefined && Number(rawPerSftPrice) > 0) {
        setPurchasePricePerSft(rawPerSftPrice)
        setPurchasePrice(Number((Number(rawPerSftPrice) * area).toFixed(2)))
      } else if (rawBaseCost !== undefined && Number(rawBaseCost) > 0) {
        setPurchasePricePerSft(rawBaseCost)
        setPurchasePrice(Number((Number(rawBaseCost) * area).toFixed(2)))
      } else if (rawPurPrice !== undefined && Number(rawPurPrice) > 0) {
        setPurchasePrice(rawPurPrice)
        if (area > 0) {
          setPurchasePricePerSft(Number((Number(rawPurPrice) / area).toFixed(2)))
        }
      } else {
        setPurchasePrice('')
        setPurchasePricePerSft('')
      }
    } else if (!initialData && isOpen) {
      setName('')
      setNameBn('')
      setSku(`MAT-${Date.now().toString().slice(-5)}`)
      setCategory('flex_banner')
      setMaterialType('roll')
      setIsActive(true)
      setDescription('')
      setBrand('')
      setFinish('gloss')
      setWeightGsm('')
      setDurabilityGrade('outdoor_1yr')
      setLandedCostMarkupPercent(0)

      setPurchaseUnit('roll')
      setPurchasePrice('')
      setPurchasePricePerSft('')
      setStandardRollLength(164)
      setConfiguredRolls([{ width: 10, extra_allowance: 0.25, length: 164 }])
      setNewWidthInput('10')
      setAvailableSheetSizes([
        { width: 4, length: 8, label: '4ft × 8ft (Standard Board)' },
      ])
      setNewSheetWidthInput('4')
      setNewSheetLengthInput('8')
      setExtraWidthAllowance(0.25)
      setUsageUnit('sft')
      setWastePercent(5)
      setReorderLevel(5)
      setReorderQuantity(10)
      setMaxStockLevel('')
      setLeadTimeDays(2)
      setBarcode('')
      setTrackBatches(true)
      setShelfLifeMonths('')
      setPrimarySupplierId('')
      setPrimarySupplierName('')
      setSupplierSku('')
      setSupplierMoq(1)
      setThicknessMm('')
      setStorageLocation('Main Store - Media Rack')
      setPackQuantity(1000)
      setLiquidVolumeMl(1000)
      setInkChemistry('Eco-Solvent')
      setCoverageYieldSqft(1000)
      setProfileLengthFt(20)
      setProfileSectionType('1" MS Square Box Pipe (20 gauge)')

      setSellingPrice('')
      setTargetMargin(35)
      setMinAllowedMargin(15)
      setAllowManualOverride(true)
      setVatApplicable(false)
      setIsTaxInclusive(false)
      setTaxRate(7.5)
      setPriceTiers({
        retail: '',
        corporate: '',
        dealer: '',
        wholesale: '',
        custom: '',
      })

      setProductionRole('primary_substrate')
      setCompatiblePrintingMethods(['Eco-Solvent Print', 'Solvent Large Format'])
      setCompatibleInkTypes(['Eco-Solvent High Pigment Ink', 'Solvent Heavy Duty Ink'])
      setMachineSettingsNotes('')
    }
    setActiveTab('basic')
    setErrorMessage(null)
  }, [initialData, isOpen])

  // Two-way interactive price syncing
  const handlePricePerSftChange = (val: string) => {
    if (val === '') {
      setPurchasePricePerSft('')
      setPurchasePrice('')
      return
    }
    const num = parseFloat(val)
    setPurchasePricePerSft(isNaN(num) ? '' : num)
    if (!isNaN(num) && totalUnitArea > 0) {
      setPurchasePrice(Number((num * totalUnitArea).toFixed(2)))
    }
  }

  const handleTotalPurchasePriceChange = (val: string) => {
    if (val === '') {
      setPurchasePrice('')
      setPurchasePricePerSft('')
      return
    }
    const num = parseFloat(val)
    setPurchasePrice(isNaN(num) ? '' : num)
    if (!isNaN(num) && totalUnitArea > 0) {
      setPurchasePricePerSft(Number((num / totalUnitArea).toFixed(2)))
    }
  }

  // Roll Selection & Editing Handlers
  const handleSelectRoll = (roll: MaterialRollSizeConfig) => {
    setNewWidthInput(roll.width.toString())
    setExtraWidthAllowance(roll.extra_allowance !== undefined ? roll.extra_allowance : 0.25)
    setStandardRollLength(roll.length ?? 164)

    const perSftCost = Number(purchasePricePerSft) || 0
    if (perSftCost > 0) {
      const effectiveW = roll.width + (roll.extra_allowance ?? 0.25)
      const len = roll.length ?? 164
      const physicalArea = Number((effectiveW * len).toFixed(2))
      setPurchasePrice(Number((perSftCost * physicalArea).toFixed(2)))
    }
  }

  const handleWidthInputChange = (val: string) => {
    setNewWidthInput(val)
    const parsedW = parseFloat(val)
    if (!isNaN(parsedW) && parsedW > 0) {
      const currentLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
      const matchedExact = configuredRolls.find((r) => r.width === parsedW && (r.length || 164) === currentLen)
      const matchedAny = matchedExact || configuredRolls.find((r) => r.width === parsedW)

      if (matchedAny) {
        setExtraWidthAllowance(matchedAny.extra_allowance ?? 0.25)
        if (matchedExact) {
          setStandardRollLength(matchedExact.length ?? 164)
        }
      }

      const allowance = matchedAny?.extra_allowance ?? (typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0.25))
      const len = matchedExact?.length ?? currentLen
      const perSftCost = Number(purchasePricePerSft) || 0
      if (perSftCost > 0) {
        const effectiveW = parsedW + (isNaN(allowance) || allowance < 0 ? 0 : allowance)
        const effectiveLen = isNaN(len) || len <= 0 ? 164 : len
        setPurchasePrice(Number((perSftCost * effectiveW * effectiveLen).toFixed(2)))
      }
    }
  }

  const handleAllowanceChange = (val: string) => {
    setExtraWidthAllowance(val)
    const parsedAllowance = parseFloat(val)
    const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance

    const parsedW = parseFloat(newWidthInput)
    const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
    const len = isNaN(parsedLen) || parsedLen <= 0 ? 164 : parsedLen

    if (!isNaN(parsedW) && parsedW > 0) {
      setConfiguredRolls((prev) =>
        prev.map((r) => (r.width === parsedW && (r.length || 164) === len ? { ...r, extra_allowance: allowance } : r))
      )

      const effectiveW = parsedW + allowance
      if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
        setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * len).toFixed(2)))
      } else if (purchasePrice !== '' && Number(purchasePrice) > 0) {
        const totalArea = effectiveW * len
        if (totalArea > 0) {
          setPurchasePricePerSft(Number((Number(purchasePrice) / totalArea).toFixed(2)))
        }
      }
    }
  }

  const handleRollLengthChange = (val: string) => {
    setStandardRollLength(val)
    const parsedLen = parseFloat(val)
    const len = isNaN(parsedLen) || parsedLen <= 0 ? 164 : parsedLen

    const parsedW = parseFloat(newWidthInput)
    const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0.25)
    const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance

    if (!isNaN(parsedW) && parsedW > 0) {
      const matched = configuredRolls.find((r) => r.width === parsedW && (r.length || 164) === len)
      if (matched && matched.extra_allowance !== undefined) {
        setExtraWidthAllowance(matched.extra_allowance)
      }

      const effectiveAllowance = matched?.extra_allowance ?? allowance
      const effectiveW = parsedW + effectiveAllowance
      if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
        setPurchasePrice(Number((Number(purchasePricePerSft) * effectiveW * len).toFixed(2)))
      } else if (purchasePrice !== '' && Number(purchasePrice) > 0) {
        const totalArea = effectiveW * len
        if (totalArea > 0) {
          setPurchasePricePerSft(Number((Number(purchasePrice) / totalArea).toFixed(2)))
        }
      }
    }
  }

  const handleAddRollSize = () => {
    const val = parseFloat(newWidthInput)
    if (isNaN(val) || val <= 0) return

    const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
    const len = isNaN(parsedLen) || parsedLen <= 0 ? 164 : parsedLen
    const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0.25)
    const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance

    setConfiguredRolls((prev) => {
      const idx = prev.findIndex((r) => r.width === val && (r.length || 164) === len)
      let next: MaterialRollSizeConfig[]
      if (idx >= 0) {
        next = [...prev]
        next[idx] = { width: val, extra_allowance: allowance, length: len }
      } else {
        next = [...prev, { width: val, extra_allowance: allowance, length: len }]
      }
      return next.sort((a, b) => a.width - b.width || (a.length || 0) - (b.length || 0))
    })

    const effectiveW = val + allowance
    const physicalArea = Number((effectiveW * len).toFixed(2))
    if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
      setPurchasePrice(Number((Number(purchasePricePerSft) * physicalArea).toFixed(2)))
    }
  }

  const handleQuickAddRollWidth = (width: number) => {
    setNewWidthInput(width.toString())
    const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
    const len = isNaN(parsedLen) || parsedLen <= 0 ? 164 : parsedLen
    const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0.25)
    const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0.25 : parsedAllowance

    setConfiguredRolls((prev) => {
      const exists = prev.some((r) => r.width === width && (r.length || 164) === len)
      if (exists) return prev
      return [...prev, { width, extra_allowance: allowance, length: len }].sort((a, b) => a.width - b.width || (a.length || 0) - (b.length || 0))
    })

    const effectiveW = width + allowance
    const physicalArea = Number((effectiveW * len).toFixed(2))
    if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
      setPurchasePrice(Number((Number(purchasePricePerSft) * physicalArea).toFixed(2)))
    }
  }

  const handleRemoveRoll = (w: number, len: number) => {
    const nextRolls = configuredRolls.filter((x) => !(x.width === w && (x.length || 164) === len))
    setConfiguredRolls(nextRolls)
    if (nextRolls.length > 0) {
      const activeW = parseFloat(newWidthInput)
      const activeL = parseFloat(standardRollLength.toString()) || 164
      const nextActive = nextRolls.find((r) => r.width === activeW && (r.length || 164) === activeL)
        || nextRolls.find((r) => r.width === activeW)
        || nextRolls[nextRolls.length - 1]
      setNewWidthInput(nextActive.width.toString())
      setExtraWidthAllowance(nextActive.extra_allowance ?? 0.25)
      setStandardRollLength(nextActive.length ?? 164)

      const perSftCost = Number(purchasePricePerSft) || 0
      if (perSftCost > 0) {
        const effectiveW = nextActive.width + (nextActive.extra_allowance ?? 0.25)
        const effLen = nextActive.length ?? 164
        setPurchasePrice(Number((perSftCost * effectiveW * effLen).toFixed(2)))
      }
    }
  }

  // Sheet Size Handlers
  const handleAddCustomSheetSize = () => {
    const w = parseFloat(newSheetWidthInput)
    const l = parseFloat(newSheetLengthInput)
    if (!isNaN(w) && w > 0 && !isNaN(l) && l > 0) {
      const exists = availableSheetSizes.some((x) => x.width === w && x.length === l)
      if (!exists) {
        const nextSheets = [...availableSheetSizes, { width: w, length: l, label: `${w}ft × ${l}ft` }]
        setAvailableSheetSizes(nextSheets)
        if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
          const firstSheet = nextSheets[0] || { width: w, length: l }
          setPurchasePrice(Number((Number(purchasePricePerSft) * firstSheet.width * firstSheet.length).toFixed(2)))
        }
      }
    }
  }

  const handleQuickAddSheetSize = (w: number, l: number, label: string) => {
    setNewSheetWidthInput(w.toString())
    setNewSheetLengthInput(l.toString())
    setAvailableSheetSizes((prev) => {
      const exists = prev.some((s) => s.width === w && s.length === l)
      if (exists) return prev
      return [...prev, { width: w, length: l, label }]
    })
  }

  const handleRemoveSheetSize = (index: number) => {
    const nextSheets = availableSheetSizes.filter((_, i) => i !== index)
    setAvailableSheetSizes(nextSheets)
    if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0 && nextSheets.length > 0) {
      const firstSheet = nextSheets[0]
      setPurchasePrice(Number((Number(purchasePricePerSft) * firstSheet.width * firstSheet.length).toFixed(2)))
    }
  }

  // Toggle compatible printing method
  const handleTogglePrintingMethod = (method: string) => {
    setCompatiblePrintingMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    )
  }

  // Toggle compatible ink type
  const handleToggleInkType = (ink: string) => {
    setCompatibleInkTypes((prev) =>
      prev.includes(ink) ? prev.filter((i) => i !== ink) : [...prev, ink]
    )
  }

  // Real-Time Cost Economics Calculations
  const calculatedEconomics = useMemo(() => {
    const perSftCost = Number(purchasePricePerSft) || 0
    const totalPkgCost = Number(purchasePrice) || 0
    const landedFactor = 1 + (Number(landedCostMarkupPercent) || 0) / 100

    if (perSftCost <= 0 && totalPkgCost <= 0) {
      return {
        unitCost: 0,
        effectiveCost: 0,
        yieldLabel: '0 sft',
        formulaText: 'Enter Purchase Price (Sft) or Total Package Price to calculate unit cost',
      }
    }

    if (materialType === 'roll' || purchaseUnit === 'roll') {
      const parsedInput = parseFloat(newWidthInput)
      const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
      const currentLen = isNaN(parsedLen) || parsedLen <= 0 ? 164 : parsedLen

      const activeRoll = configuredRolls.find((r) => r.width === parsedInput && (r.length || 164) === currentLen)
        || configuredRolls.find((r) => r.width === parsedInput)
        || (configuredRolls.length > 0 ? configuredRolls[0] : null)

      const currentW = !isNaN(parsedInput) && parsedInput > 0
        ? parsedInput
        : (activeRoll?.width || 10)

      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
      const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? (activeRoll?.extra_allowance ?? 0.25) : parsedAllowance

      const len = currentLen

      // Nominal Area (WITHOUT extra allowance) -> Usable & Sellable square footage
      const nominalRollArea = Number((currentW * len).toFixed(2))

      // Physical Area (WITH extra allowance) -> Purchased substrate package area
      const effectiveW = currentW + allowance
      const physicalRollArea = Number((effectiveW * len).toFixed(2))

      // Effective Package Cost
      const effectivePkgCost = (perSftCost > 0
        ? Number((perSftCost * physicalRollArea).toFixed(2))
        : (totalPkgCost > 0 ? totalPkgCost : 0)) * landedFactor

      const baseUnitCost = nominalRollArea > 0 && effectivePkgCost > 0
        ? effectivePkgCost / nominalRollArea
        : (perSftCost > 0 ? perSftCost * landedFactor : 0)

      const effCost = baseUnitCost * (1 + (wastePercent || 0) / 100)

      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${nominalRollArea.toLocaleString()} sft (${currentW}ft × ${len}ft roll)`,
        formulaText: effectivePkgCost > 0 && nominalRollArea > 0
          ? `৳${effectivePkgCost.toLocaleString()} (${currentW}ft roll) ÷ ${nominalRollArea.toLocaleString()} sft usable yield = ৳${baseUnitCost.toFixed(2)}/sft (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`
          : `৳${baseUnitCost.toFixed(2)}/sft × ${nominalRollArea.toLocaleString()} sft = ৳${(baseUnitCost * nominalRollArea).toFixed(0)}/roll (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`,
      }
    }

    const baseUnitCost = (perSftCost > 0 ? perSftCost : (totalUnitArea > 0 ? totalPkgCost / totalUnitArea : 0)) * landedFactor
    const effCost = baseUnitCost * (1 + (wastePercent || 0) / 100)

    if (materialType === 'sheet' || purchaseUnit === 'sheet') {
      const firstSheet = availableSheetSizes[0] || { width: 4, length: 8 }
      const sheetArea = firstSheet.width * firstSheet.length
      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${sheetArea} sft (${firstSheet.width}ft × ${firstSheet.length}ft)`,
        formulaText: `৳${baseUnitCost.toFixed(2)}/sft × ${sheetArea} sft = ৳${(baseUnitCost * sheetArea).toFixed(0)}/sheet (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`,
      }
    }

    if (purchaseUnit === 'box' || purchaseUnit === 'pack') {
      const count = Number(packQuantity) || 1000
      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${count.toLocaleString()} pcs / ${purchaseUnit}`,
        formulaText: `৳${(baseUnitCost * count).toFixed(0)} ÷ ${count.toLocaleString()} pcs = ৳${baseUnitCost.toFixed(2)}/pc`,
      }
    }

    return {
      unitCost: baseUnitCost,
      effectiveCost: effCost,
      yieldLabel: `1 ${usageUnit}`,
      formulaText: `৳${baseUnitCost.toFixed(2)} per ${usageUnit}`,
    }
  }, [purchasePricePerSft, purchasePrice, totalUnitArea, materialType, purchaseUnit, configuredRolls, newWidthInput, extraWidthAllowance, standardRollLength, availableSheetSizes, wastePercent, packQuantity, usageUnit, landedCostMarkupPercent])

  // Suggested selling price based on target margin
  const suggestedSellingPrice = useMemo(() => {
    const cost = calculatedEconomics.effectiveCost || calculatedEconomics.unitCost || 0
    if (cost <= 0) return 0
    return calculateSuggestedSellingPrice(cost, targetMargin)
  }, [calculatedEconomics, targetMargin])

  // Gross profit & margin calculation for selling price
  const marginMetrics = useMemo(() => {
    const cost = calculatedEconomics.effectiveCost || calculatedEconomics.unitCost || 0
    const sp = Number(sellingPrice) || 0
    if (cost <= 0 || sp <= 0) {
      return { grossProfit: 0, grossMarginPercent: 0, isBelowMin: false }
    }
    const margin = calculateGrossMargin(cost, sp)
    return {
      grossProfit: margin.grossProfit,
      grossMarginPercent: margin.grossMarginPercent,
      isBelowMin: margin.grossMarginPercent < minAllowedMargin,
    }
  }, [calculatedEconomics, sellingPrice, minAllowedMargin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Material name is required.')
      setActiveTab('basic')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const pp = purchasePrice !== '' ? Number(purchasePrice) : 0
      const baseDirectCost = calculatedEconomics.unitCost > 0 ? Number(calculatedEconomics.unitCost.toFixed(2)) : (pp > 0 ? pp : 0)
      
      const parsedInput = parseFloat(newWidthInput)
      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : parseFloat(extraWidthAllowance)
      const finalAllowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0.25 : parsedAllowance

      const parsedLength = typeof standardRollLength === 'number' ? standardRollLength : parseFloat(standardRollLength)
      const finalLength = isNaN(parsedLength) || parsedLength <= 0 ? 164 : parsedLength

      let finalRolls = [...configuredRolls]
      if (!isNaN(parsedInput) && parsedInput > 0) {
        const idx = finalRolls.findIndex((r) => r.width === parsedInput && (r.length || 164) === finalLength)
        if (idx >= 0) {
          finalRolls[idx] = { width: parsedInput, extra_allowance: finalAllowance, length: finalLength }
        } else if (finalRolls.length === 0) {
          finalRolls = [{ width: parsedInput, extra_allowance: finalAllowance, length: finalLength }]
        }
      }
      if (finalRolls.length === 0) {
        finalRolls = [{ width: 10, extra_allowance: 0.25, length: 164 }]
      }
      finalRolls.sort((a, b) => a.width - b.width || (a.length || 0) - (b.length || 0))
      const finalWidths = Array.from(new Set(finalRolls.map((r) => r.width)))

      const finalPriceTiers: ProductPriceTiers = {}
      if (priceTiers.retail !== '') finalPriceTiers.retail = Number(priceTiers.retail)
      if (priceTiers.corporate !== '') finalPriceTiers.corporate = Number(priceTiers.corporate)
      if (priceTiers.dealer !== '') finalPriceTiers.dealer = Number(priceTiers.dealer)
      if (priceTiers.wholesale !== '') finalPriceTiers.wholesale = Number(priceTiers.wholesale)
      if (priceTiers.custom !== '') finalPriceTiers.custom = Number(priceTiers.custom)

      const materialConfig: MaterialConfiguration = {
        material_type: materialType,
        roll_sizes: (materialType === 'roll' || purchaseUnit === 'roll') ? finalRolls : undefined,
        available_widths_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalWidths : undefined,
        standard_roll_length_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalLength : undefined,
        available_sheet_sizes: (materialType === 'sheet' || purchaseUnit === 'sheet') ? availableSheetSizes : undefined,
        extra_width_allowance_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalAllowance : undefined,
        purchase_unit: purchaseUnit,
        purchase_price: pp,
        purchase_price_per_sft: purchasePricePerSft !== '' ? Number(purchasePricePerSft) : undefined,
        usage_unit: usageUnit,
        waste_percent: wastePercent,
        effective_unit_cost: calculatedEconomics.effectiveCost,
        thickness_mm: thicknessMm !== '' ? Number(thicknessMm) : undefined,
        storage_location: storageLocation.trim() || undefined,
        pack_quantity: (purchaseUnit === 'box' || purchaseUnit === 'pack') ? Number(packQuantity) || 1000 : undefined,
        reorder_level: reorderLevel,
        // Extended specs
        brand: brand.trim() || undefined,
        finish: finish || undefined,
        weight_gsm: weightGsm !== '' ? Number(weightGsm) : undefined,
        durability_grade: durabilityGrade || undefined,
        landed_cost_markup_percent: landedCostMarkupPercent > 0 ? landedCostMarkupPercent : undefined,
        primary_supplier_id: primarySupplierId || undefined,
        primary_supplier_name: primarySupplierName.trim() || undefined,
        supplier_sku: supplierSku.trim() || undefined,
        moq: supplierMoq !== '' ? Number(supplierMoq) : undefined,
        lead_time_days: leadTimeDays !== '' ? Number(leadTimeDays) : undefined,
        reorder_quantity: reorderQuantity !== '' ? Number(reorderQuantity) : undefined,
        max_stock_level: maxStockLevel !== '' ? Number(maxStockLevel) : undefined,
        barcode: barcode.trim() || undefined,
        track_batches: trackBatches,
        shelf_life_months: shelfLifeMonths !== '' ? Number(shelfLifeMonths) : undefined,
        compatible_printing_methods: compatiblePrintingMethods.length > 0 ? compatiblePrintingMethods : undefined,
        compatible_ink_types: compatibleInkTypes.length > 0 ? compatibleInkTypes : undefined,
        production_role: productionRole || undefined,
        price_tiers: Object.keys(finalPriceTiers).length > 0 ? finalPriceTiers : undefined,
      }

      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `MAT-${Date.now().toString().slice(-5)}`,
        category: category || 'materials',
        product_type: 'material',
        entity_type: 'material',
        commercial_type: 'material',
        is_service: false,
        is_ready_product: false,
        unit: usageUnit,
        selling_unit: usageUnit,
        purchase_unit: purchaseUnit,
        purchase_price: pp,
        base_cost: baseDirectCost,
        selling_price: sellingPrice !== '' ? Number(sellingPrice) : 0,
        default_wastage_percentage: wastePercent,
        target_margin_percentage: Number(targetMargin) || 35.0,
        min_allowed_margin_percent: Number(minAllowedMargin) || 15.0,
        pricing_method: (materialType === 'roll' || materialType === 'sheet') ? 'per_area' : materialType === 'rigid' ? 'per_length' : 'per_piece',
        cost_basis_type: 'direct_cost',
        price_tiers: finalPriceTiers,
        allow_manual_override: allowManualOverride,
        vat_applicable: vatApplicable,
        is_tax_inclusive: isTaxInclusive,
        tax_rate: Number(taxRate) || 0,
        is_active: isActive,
        description: description.trim() || undefined,
        material_spec: description.trim() || undefined,
        min_order_quantity: reorderLevel,
        roll_sizes: (materialType === 'roll' || purchaseUnit === 'roll') ? finalRolls : undefined,
        available_widths_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalWidths : undefined,
        standard_roll_length_ft: (materialType === 'roll' || purchaseUnit === 'roll') ? finalLength : undefined,
        production_width_allowance: (materialType === 'roll' || purchaseUnit === 'roll') ? finalAllowance : undefined,
        material_config: materialConfig,
        requires_production: false,
      })
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save raw material master.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 font-bold shrink-0 ring-1 ring-amber-500/20">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Edit Raw Material: ${initialData.name}` : 'New Raw Material Master'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                Inventory Stock
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                {materialType.toUpperCase()}
              </Badge>
              {calculatedEconomics.unitCost > 0 && (
                <Badge variant="outline" className="text-[10px] font-mono py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  ৳{calculatedEconomics.unitCost.toFixed(2)} / {usageUnit}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Purchased raw printing substrate & consumables tracked by physical dimensions, yield formulas, and consumed in production.
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Material...</span>
                </>
              ) : (
                <>
                  <Boxes className="h-4 w-4" />
                  <span>{initialData ? 'Update Raw Material' : 'Save Raw Material Master'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 font-medium shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 5-Tab Navigation Stepper Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700/60">
          {[
            { id: 'basic', label: '1. Basic & Specs', icon: Layers, count: name ? '✓' : null },
            { id: 'geometry', label: '2. Geometry & Sizes', icon: Maximize2, count: materialType === 'roll' ? configuredRolls.length : materialType === 'sheet' ? availableSheetSizes.length : null },
            { id: 'costing', label: '3. Costing & Resale', icon: DollarSign, count: purchasePricePerSft || purchasePrice ? '৳' : null },
            { id: 'inventory', label: '4. Inventory & Reorder', icon: Warehouse, count: reorderLevel ? `${reorderLevel}` : null },
            { id: 'production', label: '5. Machine Specs', icon: Wrench, count: compatiblePrintingMethods.length > 0 ? compatiblePrintingMethods.length : null },
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
                <Icon className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-tight',
                    isSelected ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: BASIC IDENTITY & SUBSTRATE SPECIFICATIONS          */}
        {/* ======================================================== */}
        {activeTab === 'basic' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            {/* 1. Name & SKU */}
            <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Material Identity & Bilingual Naming
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Bilingual stock naming & SKU</span>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Material Name (English) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Star Frontlit Flex Banner 280 GSM, Glossy Self-Adhesive Vinyl 100 Micron..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs font-medium"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Bengali Name (বাংলা নাম - ঐচ্ছিক)
                  </Label>
                  <Input
                    placeholder="যেমন: স্টার ফ্রন্টলিট ফ্লেক্স ব্যানার"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    className="h-9 text-xs font-bengali"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Material SKU / Stock Code
                  </Label>
                  <Input
                    placeholder="e.g. MAT-FLEX-STAR-280"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* 2. Physical Classification Cards */}
            <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between pb-1.5">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Physical Form / Classification <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Determines geometry, tracking & costing formulas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {PHYSICAL_FORM_CARDS.map((card) => {
                  const Icon = card.icon
                  const isSelected = materialType === card.id
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleSelectMaterialType(card.id)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group shadow-2xs',
                        isSelected
                          ? 'bg-amber-50/50 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-400 dark:ring-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={cn('p-2 rounded-lg shrink-0', card.iconClass)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('font-bold text-xs', isSelected ? 'text-amber-900 dark:text-amber-200' : 'text-slate-900 dark:text-white')}>
                              {card.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bengali block">
                            {card.titleBn}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {card.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Catalog Category dropdown */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Catalog Category (ক্যাটালগ ক্যাটাগরি) <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      {filteredCatalogCategories.length} {materialType} Categories
                    </span>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value
                      setCategory(val)
                      const match = (MATERIAL_TYPE_CATEGORIES[materialType as keyof typeof MATERIAL_TYPE_CATEGORIES] || []).find((c) => c.id === val)
                      if (match) {
                        if (match.defaultPurchaseUnit) setPurchaseUnit(match.defaultPurchaseUnit)
                        if (match.defaultUsageUnit) setUsageUnit(match.defaultUsageUnit)
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

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Substrate Brand / Manufacturer
                  </Label>
                  <Input
                    placeholder="e.g. Star Flex, 3M, Avery Dennison, LG Hausys, Politape, Alucobond, Toyo Ink..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="h-9 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 3. Substrate Technical Attributes */}
            <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 pb-1">
                <Tag className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Technical Specifications & Surface Finish
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Finish */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Surface Finish
                  </Label>
                  <select
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    {SUBSTRATE_FINISH_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weight GSM / Caliper */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Weight / Density (GSM)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 280, 340, 440 GSM"
                      value={weightGsm}
                      onChange={(e) => setWeightGsm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-9 text-xs font-mono pr-12"
                    />
                    <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">GSM</span>
                  </div>
                </div>

                {/* Durability */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Outdoor Durability
                  </Label>
                  <select
                    value={durabilityGrade}
                    onChange={(e) => setDurabilityGrade(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    {DURABILITY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Technical Description & Application Notes
                </Label>
                <textarea
                  rows={2}
                  placeholder="e.g. 280 GSM heavy duty PVC substrate, matte finish, solvent/eco-solvent compatible, 1-year outdoor UV resistance, high tear strength..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PHYSICAL GEOMETRY & DIMENSIONS MATRIX             */}
        {/* ======================================================== */}
        {activeTab === 'geometry' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Measurement Units & Physical Dimensions Matrix
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Purchase units, roll widths & dimensions</span>
            </div>

            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3.5">
              {/* Units Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
                    Purchase Unit (ক্রয় একক) <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={purchaseUnit}
                    onChange={(e) => {
                      const u = e.target.value
                      setPurchaseUnit(u)
                      const match = COMMON_PURCHASE_UNITS.find((x) => x.value === u)
                      if (match) setMaterialType(match.defaultType)
                    }}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    {COMMON_PURCHASE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
                    Usage Unit (খরচ হিসাব একক) <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={usageUnit}
                    onChange={(e) => setUsageUnit(e.target.value as any)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    {COMMON_USAGE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
                    Dimension Unit (পরিমাপ একক)
                  </Label>
                  <select
                    value={dimensionUnit}
                    onChange={(e) => setDimensionUnit(e.target.value as any)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    <option value="ft">Feet (ft) — Standard Media</option>
                    <option value="inch">Inches (in)</option>
                    <option value="mm">Millimeters (mm)</option>
                    <option value="m">Meters (m)</option>
                  </select>
                </div>
              </div>

              {/* Geometry Case A: Continuous Roll Media */}
              {(materialType === 'roll' || purchaseUnit === 'roll') && (
                <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                  {/* Quick Preset Buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Quick Add Popular Roll Widths:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_ROLL_WIDTH_PRESETS.map((p) => {
                        const isConfigured = configuredRolls.some((r) => r.width === p.width)
                        return (
                          <button
                            key={p.width}
                            type="button"
                            onClick={() => handleQuickAddRollWidth(p.width)}
                            className={cn(
                              'px-2 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer border',
                              isConfigured
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500'
                            )}
                          >
                            +{p.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Roll Width & Allowance Input Row */}
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5">
                        <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                          Roll Width (Feet) + Extra Allowance
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="e.g. 10"
                              value={newWidthInput}
                              onChange={(e) => handleWidthInputChange(e.target.value)}
                              className="h-9 text-xs font-mono font-bold pr-7"
                            />
                            <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                          </div>
                          <span className="text-sm font-bold text-slate-400">+</span>
                          <div className="relative w-24">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.25"
                              value={extraWidthAllowance}
                              onChange={(e) => handleAllowanceChange(e.target.value)}
                              className="h-9 text-xs font-mono font-bold pr-7"
                            />
                            <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">ft</span>
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-5">
                        <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                          Roll Length (Feet)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g. 164"
                            value={standardRollLength}
                            onChange={(e) => handleRollLengthChange(e.target.value)}
                            className="h-9 text-xs font-mono font-bold pr-7"
                          />
                          <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          onClick={handleAddRollSize}
                          className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Size
                        </Button>
                      </div>
                    </div>

                    {/* Quick Preset Roll Length Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                        Preset Lengths:
                      </span>
                      {QUICK_ROLL_LENGTH_PRESETS.map((lp) => {
                        const isSelected = Number(standardRollLength) === lp.length
                        return (
                          <button
                            key={lp.length}
                            type="button"
                            onClick={() => handleRollLengthChange(lp.length.toString())}
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer border',
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                            )}
                          >
                            {lp.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Configured Roll Sizes Matrix */}
                  {configuredRolls.length > 0 && (
                    <div className="pt-2.5 border-t border-blue-200/40 dark:border-blue-900/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Active Configured Roll Sizes (Width × Length) & Discrete Economics:
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {configuredRolls.length} configured variant{configuredRolls.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {configuredRolls.map((roll) => {
                          const rollAllowance = roll.extra_allowance !== undefined ? roll.extra_allowance : 0.25
                          const rollLen = roll.length ?? 164
                          const effectiveW = roll.width + rollAllowance
                          const rollArea = effectiveW * rollLen
                          const perSftCost = Number(purchasePricePerSft) || 0
                          const rollPrice = perSftCost > 0 ? Number((perSftCost * rollArea).toFixed(0)) : null
                          const isCurrentActive =
                            parseFloat(newWidthInput) === roll.width &&
                            (parseFloat(standardRollLength.toString()) || 164) === rollLen

                          return (
                            <span
                              key={`${roll.width}x${rollLen}`}
                              onClick={() => handleSelectRoll(roll)}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs',
                                isCurrentActive
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400'
                                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-blue-400'
                              )}
                              title="Click to view & edit price and allowance for this roll size"
                            >
                              <span>
                                {roll.width}ft {rollAllowance > 0 ? `(+${rollAllowance}ft)` : ''} × {rollLen}ft
                              </span>
                              {rollPrice !== null && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded font-sans">
                                  ৳{rollPrice.toLocaleString()}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveRoll(roll.width, rollLen)
                                }}
                                className="ml-0.5 text-slate-400 hover:text-rose-600 cursor-pointer text-sm font-bold"
                                title={`Remove ${roll.width}ft × ${rollLen}ft roll`}
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Geometry Case B: Sheet Physical Dimensions */}
              {(materialType === 'sheet' || purchaseUnit === 'sheet') && (
                <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                  {/* Preset Sheet Sizes */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Quick Add Popular Sheet Sizes:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SHEET_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleQuickAddSheetSize(p.width, p.length, p.label)}
                          className="px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 cursor-pointer"
                        >
                          +{p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                        Sheet Width (Feet)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 4"
                          value={newSheetWidthInput}
                          onChange={(e) => setNewSheetWidthInput(e.target.value)}
                          className="h-9 text-xs font-mono font-bold pr-7"
                        />
                        <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                        Sheet Length (Feet)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 8"
                          value={newSheetLengthInput}
                          onChange={(e) => setNewSheetLengthInput(e.target.value)}
                          className="h-9 text-xs font-mono font-bold pr-7"
                        />
                        <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                        Board Thickness (mm / gauge)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 3mm or 5mm Board"
                        value={thicknessMm}
                        onChange={(e) => setThicknessMm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        onClick={handleAddCustomSheetSize}
                        className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>

                  {/* Configured Sheet Sizes List */}
                  {availableSheetSizes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1">
                        Configured Sheet Sizes:
                      </span>
                      {availableSheetSizes.map((s, index) => (
                        <span
                          key={`${s.width}x${s.length}-${index}`}
                          onClick={() => {
                            setNewSheetWidthInput(s.width.toString())
                            setNewSheetLengthInput(s.length.toString())
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white shadow-2xs hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
                        >
                          <span>{s.width}ft × {s.length}ft ({s.width * s.length} sft)</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveSheetSize(index)
                            }}
                            className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer text-sm font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Geometry Case C: Liquid Consumables & Inks */}
              {(materialType === 'liquid' || purchaseUnit === 'bottle' || purchaseUnit === 'liter') && (
                <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Bottle / Can Volume
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 1000"
                        value={liquidVolumeMl}
                        onChange={(e) => setLiquidVolumeMl(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="h-9 text-xs font-mono pr-8"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">ml</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Ink Chemistry Formulation
                    </Label>
                    <select
                      value={inkChemistry}
                      onChange={(e) => setInkChemistry(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      <option value="Eco-Solvent">Eco-Solvent Ink</option>
                      <option value="Solvent">Solvent Heavy Duty Ink</option>
                      <option value="UV LED">UV LED Curable Ink</option>
                      <option value="Sublimation">Dye Sublimation Ink</option>
                      <option value="DTF">DTF Textile Ink</option>
                      <option value="Flushing">Cleaning & Flush Solution</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Estimated Coverage Yield
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 1000"
                        value={coverageYieldSqft}
                        onChange={(e) => setCoverageYieldSqft(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="h-9 text-xs font-mono pr-12"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">sft/L</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Geometry Case D: Framing & Metal Profiles */}
              {(materialType === 'rigid') && (
                <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Standard Bar / Pipe Length (Feet)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 20"
                        value={profileLengthFt}
                        onChange={(e) => setProfileLengthFt(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="h-9 text-xs font-mono pr-7"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">ft</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Profile Cross-Section Spec
                    </Label>
                    <Input
                      placeholder="e.g. 1x1 inch MS Square Box Pipe (20 gauge)"
                      value={profileSectionType}
                      onChange={(e) => setProfileSectionType(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Geometry Case E: Fasteners / Accessories */}
              {(purchaseUnit === 'box' || purchaseUnit === 'pack' || materialType === 'accessory' || materialType === 'electrical') && (
                <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Items / Pieces per {purchaseUnit}
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 1000 Eyelets"
                      value={packQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1000
                        setPackQuantity(val)
                      }}
                      className="h-9 text-xs font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500">Auto-converts purchase pack price to unit cost per piece</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: COSTING, PURCHASING & RESALE PRICING               */}
        {/* ======================================================== */}
        {activeTab === 'costing' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Purchasing Rate, Direct Costing & Resale Pricing
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Purchase rate, wastage & multi-tier resale</span>
            </div>

            {/* Section A: Purchase Pricing */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Usage Unit Purchase Rate */}
                <div className="flex flex-col justify-between">
                  <div className="h-6 flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      Purchase Price (৳/{usageUnit.toUpperCase()}) <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded shrink-0">
                      {usageUnit.toUpperCase()} Rate
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 5.20"
                      value={purchasePricePerSft}
                      onChange={(e) => handlePricePerSftChange(e.target.value)}
                      className="pl-7 h-9 text-xs font-mono font-bold bg-blue-50/20 border-blue-200 dark:border-blue-800 focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block truncate">Direct material cost per {usageUnit}</span>
                </div>

                {/* Package Purchase Price */}
                <div className="flex flex-col justify-between">
                  <div className="h-6 flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Purchase Price (৳/{purchaseUnit})
                    </Label>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                      {materialType === 'roll' || purchaseUnit === 'roll'
                        ? `${parseFloat(newWidthInput) || 10}ft roll`
                        : `Total ${purchaseUnit}`}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 8500"
                      value={purchasePrice}
                      onChange={(e) => handleTotalPurchasePriceChange(e.target.value)}
                      className="pl-7 h-9 text-xs font-mono font-bold"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block truncate">
                    {materialType === 'roll' || purchaseUnit === 'roll'
                      ? `Package price for ${parseFloat(newWidthInput) || 10}ft roll`
                      : 'Supplier invoice package price'}
                  </span>
                </div>

                {/* Wastage Factor */}
                <div className="flex flex-col justify-between">
                  <div className="h-6 flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Expected Wastage (%)
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={wastePercent}
                      onChange={(e) => setWastePercent(parseFloat(e.target.value) || 0)}
                      className="pr-7 h-9 text-xs font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block truncate">Production scrap margin</span>
                </div>

                {/* Landed Cost Markup Factor */}
                <div className="flex flex-col justify-between">
                  <div className="h-6 flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Landed / Duty Markup (%)
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={landedCostMarkupPercent}
                      onChange={(e) => setLandedCostMarkupPercent(parseFloat(e.target.value) || 0)}
                      className="pr-7 h-9 text-xs font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block truncate">Freight & import duty surcharge</span>
                </div>
              </div>

              {/* Live Real-Time Cost Economics Card */}
              <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                      Calculated Production Direct Cost & Yield
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200">
                    Total Yield: {calculatedEconomics.yieldLabel}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/60">
                    <span className="text-[11px] font-medium text-slate-500 block">Direct Base Cost (৳ / {usageUnit})</span>
                    <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">
                      ৳{calculatedEconomics.unitCost.toFixed(2)} / {usageUnit}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/60">
                    <span className="text-[11px] font-medium text-slate-500 block">Effective Cost ({wastePercent}% Waste)</span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                      ৳{calculatedEconomics.effectiveCost.toFixed(2)} / {usageUnit}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/60">
                    <span className="text-[11px] font-medium text-slate-500 block">Suggested Selling Rate ({targetMargin}% Margin)</span>
                    <span className="text-sm font-bold font-mono text-blue-700 dark:text-blue-300">
                      ৳{suggestedSellingPrice.toFixed(2)} / {usageUnit}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md">
                  {calculatedEconomics.formulaText}
                </div>
              </div>

              {/* Section B: Direct Customer Resale & Pricing Tiers */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Direct Resale & Multi-Tier Customer Pricing (ঐচ্ছিক বিক্রয় মূল্য)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">When selling raw rolls/sheets directly</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Direct Selling Price (৳/{usageUnit})
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 8.50"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="pl-7 h-9 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Target Gross Margin (%)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 35)}
                        className="pr-7 h-9 text-xs font-mono"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Minimum Floor Margin (%)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={minAllowedMargin}
                        onChange={(e) => setMinAllowedMargin(parseFloat(e.target.value) || 15)}
                        className="pr-7 h-9 text-xs font-mono"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                    </div>
                  </div>
                </div>

                {/* Multi-tier Rate Grid */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Customer Tier Price List (৳ / {usageUnit}):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                        Retail (খুচরা)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Retail ৳"
                        value={priceTiers.retail}
                        onChange={(e) => setPriceTiers({ ...priceTiers, retail: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                        Corporate (কর্পোরেট)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Corporate ৳"
                        value={priceTiers.corporate}
                        onChange={(e) => setPriceTiers({ ...priceTiers, corporate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                        Dealer (ডিলার)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Dealer ৳"
                        value={priceTiers.dealer}
                        onChange={(e) => setPriceTiers({ ...priceTiers, dealer: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                        Wholesale (পাইকারি)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Wholesale ৳"
                        value={priceTiers.wholesale}
                        onChange={(e) => setPriceTiers({ ...priceTiers, wholesale: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax & VAT toggles */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={vatApplicable}
                      onChange={(e) => setVatApplicable(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>VAT Applicable (ভ্যাট প্রযোজ্য)</span>
                  </label>

                  {vatApplicable && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium">Tax Rate (%):</Label>
                      <Input
                        type="number"
                        step="any"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-xs font-mono"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={allowManualOverride}
                      onChange={(e) => setAllowManualOverride(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Allow manual price override on sales</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: INVENTORY, STORAGE & REORDER INTELLIGENCE          */}
        {/* ======================================================== */}
        {activeTab === 'inventory' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Inventory Storage, Reorder Thresholds & Suppliers
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Reorder intelligence & store bins</span>
            </div>

            <div className="space-y-3">
              {/* Storage & Reorder Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Warehouse / Storage Rack Location
                  </Label>
                  <Input
                    placeholder="e.g. Main Store - Media Rack B2 / Shelf 4"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Reorder Alert Level ({purchaseUnit}s)
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Low stock warning threshold</span>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Reorder Batch Qty ({purchaseUnit}s)
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={reorderQuantity}
                    onChange={(e) => setReorderQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Suggested purchase batch</span>
                </div>
              </div>

              {/* Barcode & Shelf Life */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Barcode / QR Stock Code
                  </Label>
                  <Input
                    placeholder="Scan or enter barcode..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Lead Time (Days)
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 2 days"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                    Shelf-Life / Expiry (Months)
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 12 (for inks/adhesives)"
                    value={shelfLifeMonths}
                    onChange={(e) => setShelfLifeMonths(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Primary Supplier Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pb-1">
                  <Building className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Primary Supplier & Procurement Metadata
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Primary Supplier Name
                    </Label>
                    {suppliers && suppliers.length > 0 ? (
                      <select
                        value={primarySupplierId}
                        onChange={(e) => {
                          const val = e.target.value
                          setPrimarySupplierId(val)
                          const matched = suppliers.find((s) => s.id === val)
                          if (matched) setPrimarySupplierName(matched.name)
                        }}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                      >
                        <option value="">-- Select Registered Supplier --</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        placeholder="e.g. Prime Media Importers Ltd."
                        value={primarySupplierName}
                        onChange={(e) => setPrimarySupplierName(e.target.value)}
                        className="h-9 text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Supplier SKU / Part No.
                    </Label>
                    <Input
                      placeholder="e.g. STAR-FL-280-50M"
                      value={supplierSku}
                      onChange={(e) => setSupplierSku(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Supplier Minimum Order (MOQ)
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 1 roll / 5 sheets"
                      value={supplierMoq}
                      onChange={(e) => setSupplierMoq(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={trackBatches}
                      onChange={(e) => setTrackBatches(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Track Physical Roll Codes & Lot Numbers (রোল কোড ট্র্যাকিং)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: PRODUCTION & MACHINE COMPATIBILITY                 */}
        {/* ======================================================== */}
        {activeTab === 'production' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300 flex items-center justify-center font-bold text-xs">
                  5
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Production Role & Machine Compatibility
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">BOM role & printer compatibility</span>
            </div>

            <div className="space-y-3.5">
              {/* Production Role in Service BOMs */}
              <div>
                <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                  Default Role in Production BOM (উৎপাদনে ভূমিকা)
                </Label>
                <select
                  value={productionRole}
                  onChange={(e) => setProductionRole(e.target.value)}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                >
                  {PRODUCTION_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compatible Printing Methods */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Compatible Printing Methods & Machinery (মেশিন সামঞ্জস্যতা)
                  </Label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {compatiblePrintingMethods.length} Selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(printingMethods.length > 0
                    ? printingMethods.map((m) => m.name)
                    : DEFAULT_PRINTING_METHODS
                  ).map((method) => {
                    const isSelected = compatiblePrintingMethods.includes(method)
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => handleTogglePrintingMethod(method)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5',
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        )}
                      >
                        <Printer className="w-3 h-3" />
                        <span>{method}</span>
                        {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Compatible Ink Formulations */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Compatible Inks & Chemistry (কালির ধরন)
                  </Label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {compatibleInkTypes.length} Selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_INK_TYPES.map((ink) => {
                    const isSelected = compatibleInkTypes.includes(ink)
                    return (
                      <button
                        key={ink}
                        type="button"
                        onClick={() => handleToggleInkType(ink)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5',
                          isSelected
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        )}
                      >
                        <Droplets className="w-3 h-3" />
                        <span>{ink}</span>
                        {isSelected && <Check className="w-3 h-3 text-rose-600" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Technical Machine Notes */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                  Machine Technical Settings & Calibration Notes
                </Label>
                <textarea
                  rows={2}
                  placeholder="e.g. Recommended Printhead Gap: 2.0mm, Pre-Heat: 40°C, Post-Heat: 45°C, Vacuum: Medium..."
                  value={machineSettingsNotes}
                  onChange={(e) => setMachineSettingsNotes(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active in Raw Material Inventory & Available for Service BOM Consumption</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  )
}

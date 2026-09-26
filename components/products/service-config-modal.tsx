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
  AlertTriangle,
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
  Zap,
  Cpu,
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
import type { MachineryRecord } from '@/types/machinery.types'
import { formatBDT } from '@/lib/formatters'
import { calculateGrossMargin } from '@/lib/units'
import { cn } from '@/lib/utils'
import { dispatchToast } from '@/components/shared/toast-feedback'

interface ServiceConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (serviceData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
  availableMaterials?: MaterialRecord[]
  machineries?: MachineryRecord[]
  printingMethods?: Array<{ id: string; name: string; name_bn?: string | null }>
  finishingMasterOptions?: Array<{ id: string; name: string; pricing_method: string; selling_price: number; cost: number }>
  additionalMasterOptions?: Array<{ id: string; name: string; pricing_method: string; selling_price: number; cost: number }>
  installationMasterOptions?: Array<{ id: string; name: string; pricing_method: string; selling_price: number; cost: number }>
}

export const COMMON_SELLING_UNITS: { value: string; label: string; label_bn: string; defaultMethod: PricingMethod }[] = [
  { value: 'sft', label: 'Square Feet (sft / sqft)', label_bn: 'বর্গফুট (স্কয়ার ফিট)', defaultMethod: 'per_area' },
  { value: 'pcs', label: 'Piece (pcs)', label_bn: 'পিস (সংখ্যা)', defaultMethod: 'per_piece' },
  { value: 'rft', label: 'Running Feet (rft)', label_bn: 'রানিং ফিট (দৈর্ঘ্য)', defaultMethod: 'per_length' },
  { value: 'sheet', label: 'Sheet', label_bn: 'শীট', defaultMethod: 'per_piece' },
  { value: 'meter', label: 'Meter (m)', label_bn: 'মিটার', defaultMethod: 'per_length' },
  { value: 'sqm', label: 'Square Meter (sqm)', label_bn: 'বর্গমিটার', defaultMethod: 'per_area' },
  { value: 'inch', label: 'Inch (in)', label_bn: 'ইঞ্চি', defaultMethod: 'per_length' },
  { value: 'set', label: 'Set', label_bn: 'সেট', defaultMethod: 'per_piece' },
  { value: 'job', label: 'Job / Project', label_bn: 'এককালীন কাজ বা প্রজেক্ট', defaultMethod: 'per_job' },
  { value: 'hour', label: 'Hour', label_bn: 'ঘণ্টা', defaultMethod: 'per_hour' },
]

export const COMMON_BOM_UNITS: { value: string; label: string; label_bn: string }[] = [
  { value: 'sft', label: 'sft (Square Feet)', label_bn: 'বর্গফুট (স্কয়ার ফিট)' },
  { value: 'sqft', label: 'sqft (Square Feet)', label_bn: 'বর্গফুট' },
  { value: 'sheet', label: 'sheet (Sheet)', label_bn: 'সম্পূর্ণ শীট' },
  { value: 'pcs', label: 'pcs (Pieces)', label_bn: 'পিস' },
  { value: 'piece', label: 'piece (Piece)', label_bn: 'পিস' },
  { value: 'rft', label: 'rft (Running Feet)', label_bn: 'রানিং ফিট' },
  { value: 'meter', label: 'meter (Meter)', label_bn: 'মিটার' },
  { value: 'inch', label: 'inch (Inch)', label_bn: 'ইঞ্চি' },
  { value: 'roll', label: 'roll (Roll)', label_bn: 'রোল' },
  { value: 'kg', label: 'kg (Kilogram)', label_bn: 'কেজি' },
  { value: 'gm', label: 'gm (Gram)', label_bn: 'গ্রাম' },
  { value: 'liter', label: 'liter (Liter)', label_bn: 'লিটার' },
  { value: 'ml', label: 'ml (Milliliter)', label_bn: 'মিলি' },
  { value: 'bottle', label: 'bottle (Bottle)', label_bn: 'বোতল' },
  { value: 'can', label: 'can (Can)', label_bn: 'ক্যান' },
  { value: 'box', label: 'box (Box)', label_bn: 'বক্স' },
  { value: 'pack', label: 'pack (Pack)', label_bn: 'প্যাকেট' },
  { value: 'set', label: 'set (Set)', label_bn: 'সেট' },
  { value: 'sqm', label: 'sqm (Square Meter)', label_bn: 'বর্গমিটার' },
  { value: 'job', label: 'job (Job / Flat)', label_bn: 'এককালীন' },
]


export const getMaterialCost = (mat: MaterialRecord | ProductRecord | any | null | undefined): number => {
  if (!mat) return 0

  // 1. Explicit per-SFT cost if specified
  const explicitSftCost =
    (mat as any).purchase_price_per_sft ??
    (mat as any).material_config?.purchase_price_per_sft ??
    (mat as any).cost_per_sqft ??
    (mat as any).unit_cost_sft

  if (explicitSftCost !== undefined && explicitSftCost !== null && Number(explicitSftCost) > 0) {
    return Number(explicitSftCost)
  }

  const rawStockUnit = ((mat as any).purchase_unit || mat.unit || (mat as any).stock_unit || '').toLowerCase()
  const rawPrice = Number(
    (mat as any).purchase_price ??
    (mat as any).base_cost ??
    (mat as any).cost_per_unit ??
    (mat as any).last_purchase_price ??
    (mat as any).manual_cost ??
    (mat as any).effective_unit_cost ??
    0
  )

  if (rawPrice <= 0) return 0

  const cat = (mat.category || '').toLowerCase()
  const name = (mat.name || '').toLowerCase()

  const isRollMedia =
    rawStockUnit === 'roll' ||
    Boolean(mat.is_roll) ||
    cat.includes('roll') ||
    cat.includes('vinyl') ||
    cat.includes('flex') ||
    cat.includes('banner') ||
    cat.includes('media') ||
    cat.includes('substrate') ||
    name.includes('flex') ||
    name.includes('vinyl') ||
    name.includes('banner') ||
    name.includes('sticker') ||
    name.includes('backlit') ||
    name.includes('canvas') ||
    name.includes('mesh') ||
    name.includes('one way')

  // If it's a roll of media and rawPrice is a whole roll price (> 100 BDT for roll media),
  // calculate unit cost per sft by dividing by the roll square footage!
  if (isRollMedia && rawPrice > 100) {
    const rollWidth = Number(mat.width || (mat.available_widths_ft && mat.available_widths_ft[0]) || 10) || 10
    const rollLength = Number(mat.length || mat.standard_roll_length_ft || 164) || 164
    const rollArea = Number(mat.roll_area_sqft) || (rollWidth * rollLength)
    if (rollArea > 0) {
      return parseFloat((rawPrice / rollArea).toFixed(2)) // e.g. 12054 / 1640 = 7.35 ৳/sft
    }
  }

  return rawPrice
}

export interface MaterialUnitDetails {
  stockUnit: string
  consumeUnit: string
  isRollMedia: boolean
  isSheet: boolean
  costVal: number
  rateDisplay: string
  stockSubtitle: string
}

export interface MaterialUnitDetails {
  stockUnit: string
  consumeUnit: string
  isRollMedia: boolean
  isSheet: boolean
  isInk: boolean
  isFastener: boolean
  costVal: number
  rawCost: number
  rateDisplay: string
  stockSubtitle: string
}

export const getMaterialUnitDetails = (mat: MaterialRecord | ProductRecord | any | null | undefined): MaterialUnitDetails => {
  if (!mat) {
    return {
      stockUnit: 'unit',
      consumeUnit: 'sft',
      isRollMedia: false,
      isSheet: false,
      isInk: false,
      isFastener: false,
      costVal: 0,
      rawCost: 0,
      rateDisplay: 'Raw Consumable',
      stockSubtitle: 'unit',
    }
  }

  const rawStockUnit = (mat as any).purchase_unit || mat.unit || (mat as any).stock_unit || 'unit'
  const rawConsumeUnit = (mat as any).usage_unit || (mat as any).consumption_unit || ''
  const cat = (mat.category || '').toLowerCase()
  const name = (mat.name || '').toLowerCase()
  const pUnitLower = rawStockUnit.toLowerCase()

  const isInk =
    pUnitLower === 'bottle' ||
    pUnitLower === 'liter' ||
    pUnitLower === 'litre' ||
    pUnitLower === 'can' ||
    pUnitLower === 'drum' ||
    pUnitLower === 'gallon' ||
    cat.includes('ink') ||
    cat.includes('solvent') ||
    cat.includes('chemistry') ||
    cat.includes('varnish') ||
    cat.includes('chemical') ||
    name.includes('ink') ||
    name.includes('solvent') ||
    name.includes('cyan') ||
    name.includes('magenta') ||
    name.includes('meganta') ||
    name.includes('yellow') ||
    name.includes('black ink') ||
    name.includes('flush')

  const isRollMedia =
    pUnitLower === 'roll' ||
    Boolean(mat.is_roll) ||
    cat.includes('roll') ||
    cat.includes('vinyl') ||
    cat.includes('flex') ||
    cat.includes('banner') ||
    cat.includes('media') ||
    cat.includes('substrate') ||
    name.includes('flex') ||
    name.includes('vinyl') ||
    name.includes('banner') ||
    name.includes('sticker') ||
    name.includes('backlit') ||
    name.includes('canvas') ||
    name.includes('mesh') ||
    name.includes('one way')

  const isSheet =
    pUnitLower === 'sheet' ||
    cat.includes('sheet') ||
    cat.includes('board') ||
    cat.includes('acrylic') ||
    cat.includes('foam') ||
    cat.includes('pvc board') ||
    name.includes('board') ||
    name.includes('sheet') ||
    name.includes('acrylic')

  const isFastener =
    pUnitLower === 'box' ||
    pUnitLower === 'pack' ||
    pUnitLower === 'packet' ||
    cat.includes('eyelet') ||
    cat.includes('grommet') ||
    cat.includes('screw') ||
    cat.includes('fastener') ||
    cat.includes('rivet') ||
    name.includes('eyelet') ||
    name.includes('grommet') ||
    name.includes('screw') ||
    name.includes('rivet')

  let consumeUnit = rawConsumeUnit
  if (!consumeUnit) {
    if (isInk) {
      consumeUnit = 'ml'
    } else if (isRollMedia) {
      consumeUnit = 'sft'
    } else if (isSheet) {
      consumeUnit = 'sft'
    } else if (isFastener) {
      consumeUnit = 'pcs'
    } else {
      consumeUnit = rawStockUnit
    }
  }

  const rawCost = getMaterialCost(mat)
  let costVal = rawCost

  // Normalize costVal to the consumption unit rate:
  // For ink purchased by bottle/liter (1000ml) where cost is total bottle rate (e.g. 1050),
  // convert to cost per ml (1050 / 1000 = 1.05 ৳/ml)
  if (isInk && consumeUnit.toLowerCase() === 'ml') {
    if (pUnitLower === 'bottle' || pUnitLower === 'liter' || pUnitLower === 'litre' || pUnitLower === 'can' || pUnitLower === 'drum' || rawCost >= 50) {
      costVal = parseFloat((rawCost / 1000).toFixed(4))
    }
  } else if (isFastener && consumeUnit.toLowerCase() === 'pcs') {
    if ((pUnitLower === 'box' || pUnitLower === 'pack') && rawCost >= 50) {
      costVal = parseFloat((rawCost / 1000).toFixed(4))
    }
  }

  const normalizedConsumeUnit = consumeUnit.toLowerCase()
  const normalizedStockUnit = rawStockUnit.toLowerCase()

  const rateDisplay = costVal > 0 ? `৳${costVal}/${normalizedConsumeUnit}` : 'Raw Consumable'

  let stockSubtitle = rawStockUnit
  if (costVal > 0) {
    if (normalizedConsumeUnit !== normalizedStockUnit) {
      stockSubtitle += ` • ৳${costVal}/${normalizedConsumeUnit}`
    } else {
      stockSubtitle += ` • ৳${costVal}/${normalizedStockUnit}`
    }
  }

  return {
    stockUnit: rawStockUnit,
    consumeUnit: normalizedConsumeUnit,
    isRollMedia,
    isSheet,
    isInk,
    isFastener,
    costVal,
    rawCost,
    rateDisplay,
    stockSubtitle,
  }
}

export const PRINT_TECHNOLOGIES = [
  'Eco-Solvent',
  'Solvent Heavy Duty',
  'UV Flatbed',
  'UV Roll-to-Roll',
  'HP Latex',
  'Digital Laser / Toner',
  'Offset Press',
  'DTF (Direct to Film)',
  'DTG (Direct to Garment)',
  'Dye Sublimation',
  'Screen Printing',
  'Laser / CNC Cutting',
  'Manual / Handcraft',
]

export const PRODUCTION_METHODS = [
  'Roll-to-Roll',
  'Flatbed',
  'Sheet-fed',
  'Direct-to-Garment',
  'Heat Transfer',
  'Sheet Processing',
  'Welding & Metal Assembly',
  'Channel Letter Bending',
  'Contour Plotter Cutting',
  'Manual Assembly / Fitting',
]

export const DEFAULT_DEPARTMENTS = [
  'Digital Printing',
  'UV Printing',
  'Offset Press',
  'Garment Printing',
  'Finishing & Lamination',
  'Fabrication & Welding',
  'Site Installation',
  'Logistics & Dispatch',
  'Design & Pre-Press',
]

export const BOM_CONSUMPTION_METHODS: Array<{ value: string; label: string; description: string }> = [
  { value: 'AREA_PRINT', label: 'AREA_PRINT (Job Production Area × Wastage)', description: 'Total printed square footage including production bleed & margins' },
  { value: 'PER_PIECE', label: 'PER_PIECE (Order Quantity × Formula)', description: 'Fixed units per finished ordered piece (e.g. 4 eyelets/pc)' },
  { value: 'PER_SQFT', label: 'PER_SQFT (Customer Billable Sqft × Rate)', description: 'Linear consumption per net square foot billed' },
  { value: 'PER_SQM', label: 'PER_SQM (Square Meters × Rate)', description: 'Metric square meter area consumption' },
  { value: 'PER_RFT', label: 'PER_RFT (Running Feet / Perimeter)', description: 'Banner edge hemming, framing pipe, seam tape' },
  { value: 'PER_INCH', label: 'PER_INCH (Linear Inches)', description: '3D letter strip border, acrylic perimeter' },
  { value: 'FIXED', label: 'FIXED (Fixed Quantity per Job)', description: 'Setup sheets, calibration test print, packaging box' },
  { value: 'FORMULA', label: 'FORMULA (Custom Expression)', description: 'e.g. ceil(width / 2) × 2, ceil(perimeter / 12)' },
]

export const QUANTITY_CALCULATION_METHODS = [
  { value: 'area', label: 'Area (Width × Height × Qty)', description: 'Billed per square foot or square meter' },
  { value: 'linear', label: 'Linear Length (Length × Qty)', description: 'Billed per running foot, meter or inch' },
  { value: 'piece', label: 'Piece / Unit Count (Quantity)', description: 'Billed per individual finished piece' },
  { value: 'weight', label: 'Weight (kg / lbs)', description: 'Billed by material weight' },
  { value: 'time', label: 'Machine Time (Hours / Mins)', description: 'Billed per operational production hour' },
  { value: 'fixed_job', label: 'Fixed Job / Project Rate', description: 'Single flat rate per job order' },
]

export const NESTING_RULES = [
  { value: 'optimal_roll_width', label: 'Optimal Roll Width Fit (Minimize roll trim waste)' },
  { value: 'sheet_grid', label: 'Sheet Nesting Grid (Max pieces per 4x8 sheet)' },
  { value: 'lengthwise_gang', label: 'Lengthwise Gang Run (Continuous roll feeding)' },
  { value: 'single_job_direct', label: 'Direct Single Job (No automated batch nesting)' },
]

export const INK_PROFILES: Array<{
  id: string
  name: string
  name_bn: string
  tech: string
  defaultMlPerSqft: number
  channels: Array<{ channel: string; color_code: string; unit_price: number; unit: string }>
}> = [
  {
    id: 'eco_solvent_cmyk',
    name: 'Eco-Solvent CMYK (4-Color Standard)',
    name_bn: 'ইকো-সলভেন্ট সিএমওয়াইকে ৪-কালার',
    tech: 'Eco-Solvent',
    defaultMlPerSqft: 1.2,
    channels: [
      { channel: 'Cyan', color_code: '#00aeef', unit_price: 2800, unit: 'bottle' },
      { channel: 'Magenta', color_code: '#ec008c', unit_price: 2800, unit: 'bottle' },
      { channel: 'Yellow', color_code: '#fff200', unit_price: 2800, unit: 'bottle' },
      { channel: 'Black', color_code: '#231f20', unit_price: 2800, unit: 'bottle' },
    ],
  },
  {
    id: 'eco_solvent_6c',
    name: 'Eco-Solvent CMYK + LC + LM (6-Color Photo High Density)',
    name_bn: 'ইকো-সলভেন্ট ৬-কালার ফটো প্রিন্ট',
    tech: 'Eco-Solvent',
    defaultMlPerSqft: 1.5,
    channels: [
      { channel: 'Cyan', color_code: '#00aeef', unit_price: 2800, unit: 'bottle' },
      { channel: 'Magenta', color_code: '#ec008c', unit_price: 2800, unit: 'bottle' },
      { channel: 'Yellow', color_code: '#fff200', unit_price: 2800, unit: 'bottle' },
      { channel: 'Black', color_code: '#231f20', unit_price: 2800, unit: 'bottle' },
      { channel: 'Light Cyan', color_code: '#80d6f7', unit_price: 2800, unit: 'bottle' },
      { channel: 'Light Magenta', color_code: '#f680c5', unit_price: 2800, unit: 'bottle' },
    ],
  },
  {
    id: 'uv_cmyk',
    name: 'UV LED CMYK (4-Color Process)',
    name_bn: 'ইউভি এলইডি সিএমওয়াইকে ৪-কালার',
    tech: 'UV Flatbed',
    defaultMlPerSqft: 1.4,
    channels: [
      { channel: 'Cyan', color_code: '#00aeef', unit_price: 5200, unit: 'bottle' },
      { channel: 'Magenta', color_code: '#ec008c', unit_price: 5200, unit: 'bottle' },
      { channel: 'Yellow', color_code: '#fff200', unit_price: 5200, unit: 'bottle' },
      { channel: 'Black', color_code: '#231f20', unit_price: 5200, unit: 'bottle' },
    ],
  },
  {
    id: 'uv_cmyk_white',
    name: 'UV LED CMYK + High Opacity White (5-Channel)',
    name_bn: 'ইউভি সিএমওয়াইকে + হাই অপাসিটি হোয়াইট',
    tech: 'UV Flatbed',
    defaultMlPerSqft: 2.2,
    channels: [
      { channel: 'Cyan', color_code: '#00aeef', unit_price: 5200, unit: 'bottle' },
      { channel: 'Magenta', color_code: '#ec008c', unit_price: 5200, unit: 'bottle' },
      { channel: 'Yellow', color_code: '#fff200', unit_price: 5200, unit: 'bottle' },
      { channel: 'Black', color_code: '#231f20', unit_price: 5200, unit: 'bottle' },
      { channel: 'White', color_code: '#ffffff', unit_price: 5800, unit: 'bottle' },
    ],
  },
  {
    id: 'uv_cmyk_white_varnish',
    name: 'UV LED CMYK + White + Gloss Varnish / Clear (6-Channel)',
    name_bn: 'ইউভি সিএমওয়াইকে + হোয়াইট + গ্লস বার্নিশ',
    tech: 'UV Flatbed',
    defaultMlPerSqft: 2.8,
    channels: [
      { channel: 'Cyan', color_code: '#00aeef', unit_price: 5200, unit: 'bottle' },
      { channel: 'Magenta', color_code: '#ec008c', unit_price: 5200, unit: 'bottle' },
      { channel: 'Yellow', color_code: '#fff200', unit_price: 5200, unit: 'bottle' },
      { channel: 'Black', color_code: '#231f20', unit_price: 5200, unit: 'bottle' },
      { channel: 'White', color_code: '#ffffff', unit_price: 5800, unit: 'bottle' },
      { channel: 'Varnish / Clear', color_code: '#ffd700', unit_price: 6200, unit: 'bottle' },
    ],
  },
  {
    id: 'dtf_cmyk_white',
    name: 'DTF Textile CMYK + White Backer',
    name_bn: 'ডিটিএফ টেক্সটাইল সিএমওয়াইকে + হোয়াইট',
    tech: 'DTF',
    defaultMlPerSqft: 2.0,
    channels: [
      { channel: 'Cyan', color_code: '#00aeef', unit_price: 4500, unit: 'bottle' },
      { channel: 'Magenta', color_code: '#ec008c', unit_price: 4500, unit: 'bottle' },
      { channel: 'Yellow', color_code: '#fff200', unit_price: 4500, unit: 'bottle' },
      { channel: 'Black', color_code: '#231f20', unit_price: 4500, unit: 'bottle' },
      { channel: 'White', color_code: '#ffffff', unit_price: 5200, unit: 'bottle' },
    ],
  },
  {
    id: 'solvent_cmyk',
    name: 'Solvent Heavy Duty CMYK (Banner Grade)',
    name_bn: 'সলভেন্ট হেভি ডিউটি ব্যানার কালি',
    tech: 'Solvent Heavy Duty',
    defaultMlPerSqft: 1.0,
    channels: [
      { channel: 'Cyan', color_code: '#00aeef', unit_price: 2200, unit: 'bottle' },
      { channel: 'Magenta', color_code: '#ec008c', unit_price: 2200, unit: 'bottle' },
      { channel: 'Yellow', color_code: '#fff200', unit_price: 2200, unit: 'bottle' },
      { channel: 'Black', color_code: '#231f20', unit_price: 2200, unit: 'bottle' },
    ],
  },
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


export const CATEGORY_SUBCATEGORY_MAP: Record<string, string[]> = {
  // Printing Categories
  wide_format_printing: [
    'PVC Frontlit Flex Banner (280gsm - 440gsm)',
    'PVC Backlit Banner (Translucent)',
    'Glossy Vinyl Sticker (Adhesive Back)',
    'Matte Vinyl Sticker (Non-Reflective)',
    'Frosted Glass Sticker (Sandblast Effect)',
    'One Way Vision (Perforated Vinyl)',
    'Reflective Vinyl Sticker (Commercial Grade)',
    'Canvas Fabric Print (High Texture)',
    'Mesh Vinyl Banner (Wind Resistant)',
    'Clear Transparent Sticker',
  ],
  large_format_printing: [
    'PVC Frontlit Flex Banner (280gsm - 440gsm)',
    'PVC Backlit Banner (Translucent)',
    'Glossy Vinyl Sticker (Adhesive Back)',
    'Matte Vinyl Sticker (Non-Reflective)',
    'Frosted Glass Sticker (Sandblast Effect)',
    'One Way Vision (Perforated Vinyl)',
    'Reflective Vinyl Sticker (Commercial Grade)',
    'Canvas Fabric Print (High Texture)',
    'Mesh Vinyl Banner (Wind Resistant)',
    'Clear Transparent Sticker',
  ],
  solvent_printing: [
    'Heavy Duty Billboard Flex (510gsm)',
    'Frontlit Event Banner',
    'Panagraphics Heavy Backlit',
    'Mesh Solvent Banner',
    'Blackout Blockout Banner (Double Sided)',
  ],
  uv_printing: [
    '3mm / 5mm Acrylic Sheet Direct UV Print',
    '3mm / 5mm PVC Foam Sunboard UV Print',
    'Wood / MDF Board Direct UV Print',
    'ACP (Aluminum Composite Panel) UV Print',
    'Leather & Rexine Texture UV Print',
    'Glass Backprint (Reverse UV)',
    'Fluted Corrugated Polycarbonate Sheet',
    'Metal & SS Sheet Direct UV Print',
  ],
  digital_print: [
    'Brochure & Leaflet (120gsm - 170gsm Art Paper)',
    'Business Card / Visiting Card (300gsm Art Card)',
    'Company Profile & Catalog Booklet',
    'Flyer & Poster (A4 / A3 / 13x19)',
    'Product Label & Die-Cut Sticker Sheet',
    'Invitation & Certificate Card',
  ],
  offset_printing: [
    'Corrugated Packaging Master Carton',
    'Duplex Board Product Monocarton Box',
    'Sweet & Food Grade Packaging Box',
    'Garments Hangtag & Price Tag',
    'Corporate Annual Report & Magazine',
    'Calendar (Wall & Desk Calendar)',
  ],
  sublimation_printing: [
    'Polyester Jersey & Sportswear Print',
    'Flag & Teardrop Beach Banner Fabric',
    'Satin Ribbon & Lanyard Strap',
    'Sublimation Mug / Ceramic Tile',
    'Fabric Pillow & Cushion Cover',
  ],
  dtf_printing: [
    'Cotton T-Shirt Direct-to-Film Print',
    'Hoodie & Sweatshirt Heat Transfer',
    'Cap & Hat DTF Transfer',
    'Canvas Tote Bag Print',
    'Leather Patch DTF Transfer',
  ],
  screen_printing: [
    'Non-Woven Shopping Bag Screen Print',
    'Jute Bag Promotional Print',
    'Cotton Fabric & Garment Screen Print',
    'Special Metallic Gold/Silver Screen Print',
    'Paper Bag & Envelope Print',
  ],

  // Production & Fabrication Categories
  signage_fabrication: [
    '1" MS Pipe Frame Signboard (Flex Face)',
    '1.5" Heavy MS Angle Signboard (Shopfront)',
    'ACP Sheet Cladding Signboard',
    'Double-Sided Projecting Wall Signbox',
    'Rooftop Heavy Steel Structure Signboard',
    'Unipole Highway Pillar Structure',
  ],
  acrylic_3d_letters: [
    'Frontlit 3D Acrylic Letter with LED',
    'Backlit / Halo Glow 3D Letter',
    'SS 304 Gold Mirror Finish Letter',
    'SS 304 Silver Hairline Finish Letter',
    'Full Acrylic Solid Crystal Letter',
    'Flexible Silicone Neon Sign (Custom Shape)',
    'ACP Cutout 2D Flat Letter with Standoff',
  ],
  lightbox_led: [
    'Slim Fabric Lightbox (SEG Silicone Edge)',
    'Snap Frame LED Lightbox (Ultra Thin)',
    'Backlit Acrylic Lightbox (4" Depth)',
    'Double-Sided Round/Square Projecting Lightbox',
    'Magnetic Acrylic Slim Lightbox',
  ],
  cnc_wood_fabrication: [
    '3D Jali Pattern CNC Cutting (MDF/PVC)',
    'Laser Engraved Acrylic Memento / Crest',
    'Wood Carving & Decorative Panel',
    'ACP Grooving & Bending Panel',
    'Metal Sheet Fiber Laser Cutting',
  ],
  display_kiosks: [
    'POS Counter Display Stand (Acrylic)',
    'Metal Retail Gondola & Rack',
    'Promotional Sampling Table / Pop-up Booth',
    'Roll-Up Standee (3x6ft / 2.5x6ft Aluminum)',
    'X-Banner Standee Stand',
  ],
  event_backdrops: [
    'Aluminum Truss Event Stage Backdrop',
    'Curved Pop-up Display Wall (3x3 / 4x3)',
    'Media Wall & Photo Booth Structure',
    'Self-Standing Wooden Stage Backdrop',
  ],

  // Finishing Categories
  thermal_lamination: [
    'Gloss Thermal Lamination (25-32 Micron)',
    'Matte Thermal Lamination (Non-Reflective)',
    'Soft Touch Velvet Lamination',
    'Anti-Scratch Matte Film Lamination',
  ],
  cold_lamination: [
    'Clear Gloss Cold Lamination Film',
    'Matte Satin Cold Lamination Film',
    'Sparkle / Glitter Specialty Cold Film',
  ],
  floor_anti_slip: [
    'Heavy Duty Textured Floor Graphic Overlaminate',
    'Vehicle Wrapping Anti-UV Clear Film',
  ],
  board_mounting: [
    '3mm PVC Foam Board Pasting',
    '5mm Heavy PVC Foam Board Pasting',
    '8mm / 10mm Extra Rigid PVC Foam Board',
    '3mm Acrylic Sheet Back Pasting',
    'Paper Foam Board Pasting (Lightweight)',
  ],
  eyelets_grommets: [
    'Brass Eyelets at 4 Corners',
    'Eyelets Every 2 Feet on All Sides',
    'Heavy Duty Nickel Grommets with Washers',
  ],
  edge_hemming: [
    'Double Fold Edge Hemming with Rope',
    'Ultrasonic / Hot Air Seaming Joint',
    'Pocket Seam for Pipe Insertion (Top & Bottom)',
  ],
  die_cutting: [
    'Kiss-Cut Vinyl Sticker Sheets',
    'Die-Cut Individual Shaped Stickers',
    'Cardboard Packaging Die-Cutting & Creasing',
  ],
  binding_finishing: [
    'Metal Wire-O Spiral Binding',
    'Plastic Comb Ring Binding',
    'Thermal Glue Hardcover Binding',
    'Center Pin Saddle Stitching',
  ],
  spot_uv_foiling: [
    'Spot Gloss UV Varnish on Matte Surface',
    'Gold Metallic Hot Foil Stamping',
    'Silver Metallic Hot Foil Stamping',
    'Embossing & Debossing',
  ],

  // Installation Categories
  site_pasting: [
    'Indoor Office Wall Sticker Pasting',
    'Shop Glass Frosted & Clear Sticker Pasting',
    'Vehicle Body Wrap Installation',
    'Floor Graphics Pasting with Edge Seal',
  ],
  billboard_erection: [
    'Rooftop Billboard Frame Mounting (Crane/Rope)',
    'Highway Unipole Banner Skin Replacement',
    'Building Facade Heavy Hoarding Erection',
  ],
  signboard_installation: [
    'Ground Floor Shopfront Sign Fitting (0-10 ft)',
    '1st / 2nd Floor Fascia Signboard Fitting (10-20 ft)',
    '3D Letter Mounting with Screw & Silicone',
  ],
  vehicle_branding: [
    'Delivery Van Full Body Wrap',
    'Sedan / SUV Door & Hood Branding',
    'Bus / Truck Fleet Vinyl Graphics',
  ],
  exhibition_setup: [
    'Trade Fair Stall Branding & Fitting',
    'Stage Backdrop & Light Truss Installation',
    'Directional Signage & Banner Stand Placement',
  ],

  // Delivery Categories
  local_city_delivery: [
    'Motorbike Courier (Small Parcel < 5kg)',
    'CNG / Easy Bike (Medium Rolls & Boards)',
    'Pickup Van / Tata Ace (Large Banners & Signs)',
  ],
  freight_transport: [
    'Inter-District Courier Booking (Sundarban/SA Paribahan)',
    'Dedicated Covered Truck (Nationwide Dispatch)',
  ],
  express_delivery: [
    'Same-Day Urgent Jet Delivery (Inside City)',
    'Overnight Priority Delivery',
  ],
  warehouse_handling: [
    'Standard Bubble Wrap Packaging',
    'Wooden Crate Protection for Acrylic/LED',
    'Heavy Carton Tube for Roll Media',
  ],

  // General Categories
  graphic_design: [
    'Vector Logo & Brand Identity Design',
    'Banner & Billboard Creative Layout',
    'Product Packaging 3D Dieline Design',
    'Color Separation & Pre-Press File Preparation',
  ],
  technical_survey: [
    'Site Measurement & Laser Distance Survey',
    'Structural Load & Electrical Assessment',
  ],
  maintenance_repair: [
    'LED Power Supply & Module Replacement',
    'Signboard Face Flex Skin Replacement',
    'Rust Treatment & Frame Welding Repair',
  ],
  custom_job_service: [
    'Custom CNC/Laser Cutting Job Work',
    'Job Order Consultation & Sample Prototyping',
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
  { id: 'thermal_lamination', name: 'Thermal Film Lamination', name_bn: 'থার্মাল ফিল্ম ল্যামিনেশন', defaultUnit: 'sft', defaultRate: 8, defaultCost: 3.5, defaultMethod: 'per_sqft' },
  { id: 'cold_lamination', name: 'Cold Pressure Lamination', name_bn: 'কোল্ড ল্যামিনেশন', defaultUnit: 'sft', defaultRate: 6, defaultCost: 2.8, defaultMethod: 'per_sqft' },
  { id: 'floor_anti_slip', name: 'Floor & Vehicle Anti-Slip Overlaminate', name_bn: 'ফ্লোর অ্যান্টি-স্লিপ ল্যামিনেশন', defaultUnit: 'sft', defaultRate: 15, defaultCost: 7.0, defaultMethod: 'per_sqft' },
  { id: 'board_mounting', name: 'Hardboard & Foam PVC Board Mounting', name_bn: 'বোর্ড মাউন্টিং ও পেস্টিং', defaultUnit: 'sft', defaultRate: 25, defaultCost: 12.0, defaultMethod: 'per_sqft' },
  { id: 'eyelets_grommets', name: 'Eyelets & Grommets Punching', name_bn: 'আইলেটস পাঞ্চিং', defaultUnit: 'pcs', defaultRate: 5, defaultCost: 1.5, defaultMethod: 'per_piece' },
  { id: 'edge_hemming', name: 'Edge Hemming & Banner Seaming', name_bn: 'ব্যানার এজ সিমিং', defaultUnit: 'rft', defaultRate: 3, defaultCost: 1.0, defaultMethod: 'per_rft' },
  { id: 'die_cutting', name: 'Digital & Knife Contour Die-Cutting', name_bn: 'কনট্যুর ডাই-কাট', defaultUnit: 'pcs', defaultRate: 12, defaultCost: 4.0, defaultMethod: 'per_piece' },
  { id: 'spiral_binding', name: 'Spiral & Wiro Book Binding', name_bn: 'স্পাইরাল বুক বাইন্ডিং', defaultUnit: 'pcs', defaultRate: 40, defaultCost: 18.0, defaultMethod: 'per_piece' },
  { id: 'perfect_binding', name: 'Hot Melt & Perfect Book Binding', name_bn: 'পারফেক্ট বুক বাইন্ডিং', defaultUnit: 'pcs', defaultRate: 60, defaultCost: 25.0, defaultMethod: 'per_piece' },
  { id: 'spot_uv', name: 'Spot UV Varnish Coating', name_bn: 'স্পট ইউভি কোটিং', defaultUnit: 'sft', defaultRate: 18, defaultCost: 8.0, defaultMethod: 'per_sqft' },
  { id: 'foil_stamping', name: 'Hot Foil Stamping', name_bn: 'হট ফয়েল স্ট্যাম্পিং', defaultUnit: 'pcs', defaultRate: 20, defaultCost: 8.0, defaultMethod: 'per_piece' },
]

export const LAMINATION_MICRON_PRESETS = [
  { label: '25 Micron (Ultra Thin BOPP)', value: '25' },
  { label: '32 Micron (Standard Commercial)', value: '32' },
  { label: '50 Micron (Medium Heavy)', value: '50' },
  { label: '75 Micron (Stiff / Identity)', value: '75' },
  { label: '125 Micron (Rigid Pouch)', value: '125' },
  { label: '250 Micron (Heavy Duty Rigid)', value: '250' },
]

export const DEFAULT_PRODUCTION_CATEGORIES: Array<{
  id: string
  name: string
  name_bn: string
  defaultUnit: string
  defaultMethod: PricingMethod
  defaultFrame: string
  defaultDepth: string
  defaultLighting: string
}> = [
  { id: 'signage_fabrication', name: 'Signboard & Metal Frame Fabrication', name_bn: 'সাইনবোর্ড ও মেটাল ফ্রেম স্ট্রাকচার', defaultUnit: 'sft', defaultMethod: 'per_area', defaultFrame: '1" MS Square Box Pipe (20 gauge)', defaultDepth: '2 inch', defaultLighting: 'none' },
  { id: 'acrylic_3d_letters', name: '3D Acrylic, SS & Neon Letters', name_bn: 'এক্রিলিক ও ৩ডি নিয়ন লেটার', defaultUnit: 'inch', defaultMethod: 'per_length', defaultFrame: 'SS 304 Mirror Gold/Silver Profile', defaultDepth: '2 inch', defaultLighting: 'led_backlit' },
  { id: 'lightbox_led', name: 'LED Backlit & Slim Lightboxes', name_bn: 'লাইটবক্স ও এলইডি ডিসপ্লে ফ্রেম', defaultUnit: 'sft', defaultMethod: 'per_area', defaultFrame: 'Aluminum Profile Snap Frame', defaultDepth: '4 inch', defaultLighting: 'led_backlit' },
  { id: 'cnc_wood_fabrication', name: 'CNC Router & Laser Engraving', name_bn: 'সিএনসি ও লেজার কাটিং বা খোদাই', defaultUnit: 'sft', defaultMethod: 'per_area', defaultFrame: 'Frameless ACP/MDF Backing', defaultDepth: '1 inch', defaultLighting: 'none' },
  { id: 'display_kiosks', name: 'POS Displays, Kiosks & Gondolas', name_bn: 'ডিসপ্লে কিয়স্ক ও পিওএসএম বুথ', defaultUnit: 'pcs', defaultMethod: 'per_piece', defaultFrame: '1.5" Heavy MS Angle Frame', defaultDepth: 'Custom Depth', defaultLighting: 'led_edgelit' },
  { id: 'event_backdrops', name: 'Event Staging & Truss Structures', name_bn: 'ইভেন্ট ব্যাকড্রপ ও স্টেজ স্ট্রাকচার', defaultUnit: 'sft', defaultMethod: 'per_area', defaultFrame: 'Heavy Truss & Pipe Structure', defaultDepth: '3 inch', defaultLighting: 'spotlight' },
]

export const STRUCTURE_FRAME_PRESETS = [
  { label: '1" MS Square Box Pipe (20 gauge)', value: '1" MS Square Box Pipe (20 gauge)' },
  { label: '1.5" Heavy MS Angle & Box Frame', value: '1.5" Heavy MS Angle & Box Frame' },
  { label: '2" Heavy Duty Structural Steel Pipe', value: '2" Heavy Duty Structural Steel Pipe' },
  { label: 'Aluminum Profile Snap & Fabric Frame', value: 'Aluminum Profile Snap & Fabric Frame' },
  { label: 'SS 304 Mirror Gold / Silver Finish Frame', value: 'SS 304 Mirror Gold / Silver Finish Frame' },
  { label: 'Frameless ACP / Foam Board Backing', value: 'Frameless ACP / Foam Board Backing' },
]

export const FRAME_DEPTH_PRESETS = [
  { label: '1 inch (Flat Wall Mounted)', value: '1 inch' },
  { label: '1.5 inch (Standard Signbox)', value: '1.5 inch' },
  { label: '2 inch (Medium 3D Depth)', value: '2 inch' },
  { label: '3 inch (Single-Side Lightbox)', value: '3 inch' },
  { label: '4 inch (Deep Backlit Lightbox)', value: '4 inch' },
  { label: '6 inch (Double-Sided Projecting Box)', value: '6 inch' },
  { label: 'Custom Depth Specification', value: 'Custom Depth' },
]

export const LIGHTING_TYPE_PRESETS = [
  { label: 'Non-lit', label_bn: 'আলোবিহীন সাধারণ স্ট্রাকচার', value: 'none' },
  { label: 'LED Backlit Injection Modules', label_bn: 'পিছন থেকে সমান্তরাল আলো', value: 'led_backlit' },
  { label: 'LED Edge-lit Perimeter Strip', label_bn: 'চারপাশ থেকে এজ-লাইট', value: 'led_edgelit' },
  { label: 'Flexible Silicone Neon Glow', label_bn: 'সিলিকন নিয়ন ফ্লেক্স', value: 'neon_flex' },
  { label: 'Frontlit Flood / Spot Light Arms', label_bn: 'সামনে থেকে ফ্লাডলাইট', value: 'spotlight' },
]

export const FABRICATION_METHOD_PRESETS = [
  { label: 'Welding, Metal Assembly & Rust-Proof Coating', value: 'Welding & Metal Assembly' },
  { label: 'Precision CNC Router Cutting & 3D Carving', value: 'CNC Router Cutting' },
  { label: 'High-Accuracy Acrylic Laser Cutting & Engraving', value: 'Laser Cutting & Engraving' },
  { label: '3D Letter Automated Channel Bending & Face Gluing', value: 'Letter Channel Bending' },
  { label: 'Woodwork, Carpentry & Duco Spray Paint Finish', value: 'Woodwork & Duco Paint' },
]

export const DEFAULT_INSTALLATION_CATEGORIES: Array<{
  id: string
  name: string
  name_bn: string
  defaultUnit: string
  defaultMethod: PricingMethod
  defaultHeight: string
  defaultCrew: number
}> = [
  { id: 'site_pasting', name: 'Glass & Wall Vinyl Graphics Pasting', name_bn: 'গ্লাস স্টিকার ও ওয়াল পেস্টিং', defaultUnit: 'sft', defaultMethod: 'per_area', defaultHeight: 'ground', defaultCrew: 2 },
  { id: 'billboard_erection', name: 'Rooftop Billboard & Unipole Fitting', name_bn: 'বিলবোর্ড ও ইউনিপোল স্থাপন', defaultUnit: 'job', defaultMethod: 'per_job', defaultHeight: 'high_elevation', defaultCrew: 4 },
  { id: 'signboard_installation', name: 'Shopfront & Fascia Sign Fitting', name_bn: 'সাইনবোর্ড ও সাইন ফিটিং', defaultUnit: 'sft', defaultMethod: 'per_area', defaultHeight: 'fascia_mid', defaultCrew: 2 },
  { id: 'vehicle_branding', name: 'Vehicle Branding & Fleet Wrapping', name_bn: 'গাড়ি ব্র্যান্ডিং ও র‍্যাপিং ফিটিং', defaultUnit: 'job', defaultMethod: 'per_job', defaultHeight: 'ground', defaultCrew: 2 },
  { id: 'exhibition_setup', name: 'Stall Fabrication & Event Setup', name_bn: 'মেলা ও এক্সিবিশন সেটআপ', defaultUnit: 'job', defaultMethod: 'per_job', defaultHeight: 'ground', defaultCrew: 3 },
]

export const HEIGHT_TIER_PRESETS = [
  { label: 'Ground Level / Indoor (0–10 ft)', label_bn: 'নিচতলা বা ঘরের ভেতর (০–১০ ফুট)', value: 'ground' },
  { label: 'Shopfront / Fascia 1st Floor (10–20 ft)', label_bn: 'দোকানের সামনে বা ১ম তলা (১০–২০ ফুট)', value: 'fascia_mid' },
  { label: 'Rooftop / High Elevation (> 20 ft)', label_bn: 'ছাদ বা উঁচু স্থান (২০ ফুটের বেশি)', value: 'high_elevation' },
]

export const DEFAULT_DELIVERY_CATEGORIES: Array<{
  id: string
  name: string
  name_bn: string
  defaultUnit: string
  defaultMethod: PricingMethod
  defaultVehicle: string
}> = [
  { id: 'local_city_delivery', name: 'Local City Van / Bike Delivery', name_bn: 'সিটি ডেলিভারি ও পরিবহন', defaultUnit: 'trip', defaultMethod: 'per_job', defaultVehicle: 'pickup_van' },
  { id: 'freight_transport', name: 'Inter-District Cargo & Freight Transport', name_bn: 'আন্তঃজেলা কার্গো ও কুরিয়ার', defaultUnit: 'job', defaultMethod: 'per_job', defaultVehicle: 'covered_van' },
  { id: 'express_delivery', name: 'Priority Express Delivery', name_bn: 'জরুরি এক্সপ্রেস ডেলিভারি', defaultUnit: 'trip', defaultMethod: 'per_job', defaultVehicle: 'bike_courier' },
  { id: 'warehouse_handling', name: 'Packaging, Crating & Dispatch Handling', name_bn: 'প্যাকেজিং ও ওয়্যারহাউস হ্যান্ডলিং', defaultUnit: 'pcs', defaultMethod: 'per_piece', defaultVehicle: 'pickup_van' },
]

export const VEHICLE_TYPE_PRESETS = [
  { label: 'Pickup Van / 1-Ton Truck', label_bn: 'পিকআপ ভ্যান বা ১-টন ট্রাক', value: 'pickup_van' },
  { label: 'Covered Van', label_bn: 'কাভার্ড ভ্যান', value: 'covered_van' },
  { label: 'Motorbike / Rider Courier', label_bn: 'মোটরসাইকেল কুরিয়ার', value: 'bike_courier' },
  { label: 'CNG Auto Rickshaw', label_bn: 'সিএনজি অটো রিকশা', value: 'cng_auto' },
]

export const DEFAULT_GENERAL_CATEGORIES: Array<{
  id: string
  name: string
  name_bn: string
  defaultUnit: string
  defaultMethod: PricingMethod
  defaultFormat: string
}> = [
  { id: 'graphic_design', name: 'Graphic Design & Pre-Press Color Separation', name_bn: 'গ্রাফিক ডিজাইন ও প্রি-প্রেস সার্ভিস', defaultUnit: 'job', defaultMethod: 'per_job', defaultFormat: 'vector_ai_pdf' },
  { id: 'technical_survey', name: 'Site Measurement & Feasibility Survey', name_bn: 'সাইট ভিজিট ও মেজারমেন্ট', defaultUnit: 'job', defaultMethod: 'per_job', defaultFormat: 'site_survey_cad' },
  { id: 'maintenance_repair', name: 'Signboard Maintenance & LED Repair', name_bn: 'সাইনবোর্ড মেরামত ও সার্ভিসিং', defaultUnit: 'job', defaultMethod: 'per_job', defaultFormat: 'on_site_repair' },
]

export const MATERIAL_FILTER_TABS: Array<{
  id: 'all' | 'roll' | 'sheet' | 'ink' | 'finishing' | 'metal_pipe' | 'electrical' | 'fasteners' | 'packaging'
  label: string
  label_bn: string
}> = [
  { id: 'all', label: 'All Raw Materials', label_bn: 'সকল কাঁচামাল' },
  { id: 'roll', label: 'Roll Media & Vinyl', label_bn: 'রোল মিডিয়া ও ভিনাইল' },
  { id: 'sheet', label: 'Rigid Sheets & Boards', label_bn: 'শীট ও বোর্ড' },
  { id: 'ink', label: 'Inks & Chemistry', label_bn: 'কালি ও লিকুইড' },
  { id: 'finishing', label: 'Finishing & Films', label_bn: 'ল্যামিনেশন ফিল্ম ও আইলেট' },
  { id: 'metal_pipe', label: 'Metals & Pipes', label_bn: 'মেটাল ও পাইপ কাঠামো' },
  { id: 'electrical', label: 'LEDs & Power', label_bn: 'এলইডি ও পাওয়ার সাপ্লাই' },
  { id: 'fasteners', label: 'Fasteners & Adhesives', label_bn: 'স্ক্রু ও সিলিকন' },
  { id: 'packaging', label: 'Packaging Consumables', label_bn: 'প্যাকেজিং কার্টুন ও বাবল' },
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
  machineries = [],
  printingMethods = [],
  finishingMasterOptions = [],
  additionalMasterOptions = [],
  installationMasterOptions = [],
}: ServiceConfigModalProps) {
  const safeCategories = Array.isArray(categories) ? categories : []
  const safeAvailableMaterials = Array.isArray(availableMaterials) ? availableMaterials : []
  const safeMachineries = Array.isArray(machineries) ? machineries : []
  const safePrintingMethods = Array.isArray(printingMethods) ? printingMethods : []
  const safeFinishingMasterOptions = Array.isArray(finishingMasterOptions) ? finishingMasterOptions : []
  const safeAdditionalMasterOptions = Array.isArray(additionalMasterOptions) ? additionalMasterOptions : []
  const safeInstallationMasterOptions = Array.isArray(installationMasterOptions) ? installationMasterOptions : []

  // 5 Responsive Tabs (Dimensions Tab Removed)
  const [activeTab, setActiveTab] = useState<'basic' | 'materials' | 'finishing' | 'additionals' | 'pricing'>('basic')

  // 1. Basic Info & 4-Level Canonical Classification
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [serviceType, setServiceType] = useState<'printing' | 'production' | 'finishing' | 'installation' | 'delivery' | 'general'>('printing')
  const [category, setCategory] = useState('wide_format_printing')
  const [subCategory, setSubCategory] = useState<string>('')
  const [printTechnology, setPrintTechnology] = useState<string>('Eco-Solvent')
  const [productionMethod, setProductionMethod] = useState<string>('Roll-to-Roll')
  const [defaultDepartment, setDefaultDepartment] = useState<string>('Digital Printing')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // 1.1 Printing Configuration & Fleet Machine Routing
  const [printCategory, setPrintCategory] = useState<string>('Large Format Eco-Solvent Print')
  const [selectedPrintingMethods, setSelectedPrintingMethods] = useState<string[]>(['Eco-Solvent Print'])
  const [selectedMachineId, setSelectedMachineId] = useState<string>('')
  const [machineHourlyRate, setMachineHourlyRate] = useState<number | ''>('')
  const [estimatedSpeed, setEstimatedSpeed] = useState<number | ''>('')
  const [speedUnit, setSpeedUnit] = useState<string>('sqft_per_hr')
  const [printableMaterialId, setPrintableMaterialId] = useState<string>('')
  const [selectedInkProfile, setSelectedInkProfile] = useState<string>('eco_solvent_cmyk')
  const [inkType, setInkType] = useState<string>('Eco-Solvent High Pigment Ink')
  const [selectedInks, setSelectedInks] = useState<LinkedInkChannel[]>(INK_PROFILES[0].channels)
  const [consumePerUnitMl, setConsumePerUnitMl] = useState<number | string>(1.2)
  const [autoCalculateInkCost, setAutoCalculateInkCost] = useState<boolean>(true)
  const [inkCost, setInkCost] = useState<number | ''>(3.36)

  // 1.2 Finishing & Lamination Configuration (when serviceType === 'finishing')
  const [finishingCategory, setFinishingCategory] = useState<string>('Thermal Film Lamination')
  const [finishingMaterialId, setFinishingMaterialId] = useState<string>('')
  const [finishingMethod, setFinishingMethod] = useState<string>('Gloss Thermal Lamination')
  const [laminationMicron, setLaminationMicron] = useState<string | number>('32')
  const [laminationType, setLaminationType] = useState<string>('Gloss')

  // 1.2.1 Production & Fabrication Configuration (when serviceType === 'production')
  const [productionCategory, setProductionCategory] = useState<string>('Signboard & Metal Frame Fabrication')
  const [productionMaterialId, setProductionMaterialId] = useState<string>('')
  const [structureFrameType, setStructureFrameType] = useState<string>('1" MS Square Box Pipe (20 gauge)')
  const [frameDepth, setFrameDepth] = useState<string>('2 inch')
  const [lightingType, setLightingType] = useState<string>('none')
  const [ledModuleMaterialId, setLedModuleMaterialId] = useState<string>('')
  const [powerSupplyMaterialId, setPowerSupplyMaterialId] = useState<string>('')
  const [fabricationMethod, setFabricationMethod] = useState<string>('Welding & Metal Assembly')

  // 1.2.2 Installation Configuration (when serviceType === 'installation')
  const [installationCategory, setInstallationCategory] = useState<string>('Glass & Wall Vinyl Graphics Pasting')
  const [installationHardwareId, setInstallationHardwareId] = useState<string>('')
  const [installationHeightTier, setInstallationHeightTier] = useState<string>('ground')
  const [installationCrewSize, setInstallationCrewSize] = useState<number>(2)
  const [safetyEquipmentRequired, setSafetyEquipmentRequired] = useState<boolean>(false)

  // 1.2.3 Delivery Configuration (when serviceType === 'delivery')
  const [deliveryCategory, setDeliveryCategory] = useState<string>('Local City Van / Bike Delivery')
  const [deliveryVehicleType, setDeliveryVehicleType] = useState<string>('pickup_van')
  const [packagingMaterialId, setPackagingMaterialId] = useState<string>('')
  const [deliveryDistanceZone, setDeliveryDistanceZone] = useState<string>('inside_city')

  // 1.2.4 General Configuration (when serviceType === 'general')
  const [generalCategory, setGeneralCategory] = useState<string>('Graphic Design & Pre-Press Color Separation')
  const [deliverableFormat, setDeliverableFormat] = useState<string>('vector_ai_pdf')
  const [turnaroundHours, setTurnaroundHours] = useState<number>(24)

  // 1.3 Substrate & Auto-Inherited Print Sizes from Selected Printable Material
  const [availableRollWidths, setAvailableRollWidths] = useState<number[]>([3.25, 4.25, 5.25, 6, 10])
  const [newRollWidth, setNewRollWidth] = useState<string>('')
  const [standardRollLength, setStandardRollLength] = useState<number | string>(164)
  const [extraWidthAllowance, setExtraWidthAllowance] = useState<number | string>(0.25)
  const [trimAllowanceIn, setTrimAllowanceIn] = useState<number>(0.25)
  const [nestingRule, setNestingRule] = useState<string>('optimal_roll_width')
  const [availableSheetSizes, setAvailableSheetSizes] = useState<Array<{ width: number; length: number; label?: string }>>([
    { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
  ])

  // 1.4 Commercial Billing Units & Calculation Method
  const [sellingUnit, setSellingUnit] = useState<string>('sft')
  const [purchaseUnit, setPurchaseUnit] = useState<string>('roll')
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('per_area')
  const [quantityCalculationMethod, setQuantityCalculationMethod] = useState<string>('area')
  const [dimensionUnit, setDimensionUnit] = useState<string>('ft')
  const [minBillableQty, setMinBillableQty] = useState<number>(1)
  const [productionBleedInches, setProductionBleedInches] = useState<number>(0.5)
  const [allowCustomDimensions, setAllowCustomDimensions] = useState(true)

  // 2. Required Materials (BOM) & Wastage
  const [materialSearchQuery, setMaterialSearchQuery] = useState('')
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<
    'all' | 'roll' | 'sheet' | 'ink' | 'finishing' | 'metal_pipe' | 'electrical' | 'fasteners' | 'packaging'
  >('all')
  const [requiredMaterials, setRequiredMaterials] = useState<Array<ServiceRequiredMaterial & { is_primary?: boolean }>>([])
  const [defaultWastagePercent, setDefaultWastagePercent] = useState<number>(5)

  // 3. Finishing Options & Raw Materials Selection
  const [finishingOptions, setFinishingOptions] = useState<ServiceFinishingOption[]>([])
  const [finishingMaterialSearchQuery, setFinishingMaterialSearchQuery] = useState('')
  const [finishingFilterTab, setFinishingFilterTab] = useState<'finishing_only' | 'all_materials'>('finishing_only')
  const [showCustomFinishingForm, setShowCustomFinishingForm] = useState(false)
  const [customFinishingName, setCustomFinishingName] = useState('')
  const [customFinishingMaterialId, setCustomFinishingMaterialId] = useState('')
  const [customFinishingRequirementType, setCustomFinishingRequirementType] = useState<'required' | 'optional' | 'customer_selectable'>('optional')
  const [customFinishingMethod, setCustomFinishingMethod] = useState('per_sqft')
  const [customFinishingPrice, setCustomFinishingPrice] = useState<number | ''>('')
  const [customFinishingCost, setCustomFinishingCost] = useState<number | ''>('')

  // 4. Additional Options, Installation & Delivery Required
  const [additionalOptions, setAdditionalOptions] = useState<ServiceAdditionalOption[]>([])
  const [installationOptions, setInstallationOptions] = useState<ServiceInstallationOption[]>([])
  const [isInstallationRequired, setIsInstallationRequired] = useState<boolean>(false)
  const [isDeliveryRequired, setIsDeliveryRequired] = useState<boolean>(false)
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Strict Raw Material check: excludes ready products, outsource items, and standalone services
  const isRawMaterial = (m: MaterialRecord) => {
    const itemType = ((m as any).item_type || (m as any).type || (m as any).commercial_type || '').toLowerCase()
    const prodType = ((m as any).product_type || (m as any).entity_type || '').toLowerCase()
    const isReady = Boolean((m as any).is_ready_product || (m as any).is_service)
    if (isReady) return false
    if (itemType === 'ready_product' || itemType === 'service' || itemType === 'outsource' || itemType === 'outsource_product') return false
    if (prodType === 'ready_product' || prodType === 'service' || prodType === 'outsource' || prodType === 'outsource_product') return false
    return true
  }

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

  // Helper check for ink/liquid chemistry
  const isInkMaterial = (m: MaterialRecord) => {
    const cat = (m.category || '').toLowerCase()
    const n = (m.name || '').toLowerCase()
    const s = (m.sku || '').toLowerCase()
    const u = (m.unit || (m as any).purchase_unit || '').toLowerCase()
    return (
      cat.includes('ink') ||
      cat.includes('liquid') ||
      cat.includes('chemistry') ||
      cat === 'inks' ||
      cat === 'ink_chemistry' ||
      n.includes('ink') ||
      n.includes('ইঙ্ক') ||
      n.includes('কালি') ||
      n.includes('cyan') ||
      n.includes('magenta') ||
      n.includes('meganta') ||
      n.includes('yellow') ||
      n.includes('black ink') ||
      s.includes('ink') ||
      u === 'liter' ||
      u === 'litre' ||
      u === 'ml' ||
      u === 'bottle' ||
      u === 'can'
    )
  }

  // Helper check for fasteners & finishing hardware
  const isFastenerOrFinishingHardware = (m: MaterialRecord) => {
    const cat = (m.category || '').toLowerCase()
    const n = (m.name || '').toLowerCase()
    const u = (m.unit || (m as any).purchase_unit || '').toLowerCase()
    return (
      cat.includes('fastener') ||
      cat.includes('hardware') ||
      cat.includes('screw') ||
      cat.includes('eyelet') ||
      cat.includes('grommet') ||
      n.includes('eyelet') ||
      n.includes('আইলেট') ||
      n.includes('grommet') ||
      n.includes('screw') ||
      n.includes('স্ক্রু') ||
      n.includes('rivet') ||
      n.includes('bolt') ||
      n.includes('nut') ||
      n.includes('নাট') ||
      n.includes('tape') ||
      n.includes('টেপ') ||
      n.includes('glue') ||
      n.includes('আঠা') ||
      n.includes('seaming')
    )
  }

  // Filter substrate materials from inventory - strictly printable media substrates
  const substrateMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      if (!isRawMaterial(m)) return false
      if (isInkMaterial(m)) return false
      if (isFastenerOrFinishingHardware(m)) return false
      return true
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

  // Filter production & fabrication materials from inventory
  const productionMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      const cat = (m.category || '').toLowerCase()
      const n = (m.name || '').toLowerCase()
      const s = (m.sku || '').toLowerCase()
      const u = (m.unit || (m as any).purchase_unit || '').toLowerCase()
      return (
        cat.includes('sheet') ||
        cat.includes('rigid') ||
        cat.includes('board') ||
        cat.includes('foam') ||
        cat.includes('acrylic') ||
        cat.includes('acp') ||
        cat.includes('metal') ||
        cat.includes('pipe') ||
        cat.includes('wood') ||
        cat.includes('mdf') ||
        cat.includes('hardware') ||
        cat.includes('structure') ||
        u === 'sheet' ||
        u === 'piece' ||
        u === 'kg' ||
        u === 'meter' ||
        u === 'rft' ||
        n.includes('acrylic') ||
        n.includes('এক্রিলিক') ||
        n.includes('foam') ||
        n.includes('ফোম') ||
        n.includes('acp') ||
        n.includes('board') ||
        n.includes('বোর্ড') ||
        n.includes('pipe') ||
        n.includes('পাইপ') ||
        n.includes('ss') ||
        n.includes('ms') ||
        n.includes('sheet') ||
        n.includes('শীট')
      )
    })
  }, [availableMaterials])

  // Filter electrical & lighting materials from inventory
  const electricalMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      const cat = (m.category || '').toLowerCase()
      const n = (m.name || '').toLowerCase()
      const s = (m.sku || '').toLowerCase()
      return (
        cat.includes('electric') ||
        cat.includes('led') ||
        cat.includes('light') ||
        cat.includes('power') ||
        cat.includes('smps') ||
        n.includes('led') ||
        n.includes('এলইডি') ||
        n.includes('module') ||
        n.includes('মডিউল') ||
        n.includes('smps') ||
        n.includes('power supply') ||
        n.includes('পাওয়ার সাপ্লাই') ||
        n.includes('neon') ||
        n.includes('নিয়ন') ||
        n.includes('driver')
      )
    })
  }, [availableMaterials])

  // Filter installation hardware & fasteners from inventory
  const installationHardwareMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      const cat = (m.category || '').toLowerCase()
      const n = (m.name || '').toLowerCase()
      return (
        cat.includes('hardware') ||
        cat.includes('fastener') ||
        cat.includes('screw') ||
        cat.includes('bolt') ||
        cat.includes('tape') ||
        cat.includes('adhesive') ||
        cat.includes('silicone') ||
        n.includes('screw') ||
        n.includes('bolt') ||
        n.includes('নাট') ||
        n.includes('স্ক্রু') ||
        n.includes('silicone') ||
        n.includes('সিলিকন') ||
        n.includes('tape') ||
        n.includes('টেপ') ||
        n.includes('anchor') ||
        n.includes('রয়্যাল প্লাগ')
      )
    })
  }, [availableMaterials])

  // Filter packaging consumables from inventory
  const packagingMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      const cat = (m.category || '').toLowerCase()
      const n = (m.name || '').toLowerCase()
      return (
        cat.includes('pack') ||
        cat.includes('box') ||
        cat.includes('carton') ||
        cat.includes('bubble') ||
        cat.includes('film') ||
        n.includes('bubble') ||
        n.includes('বাবল') ||
        n.includes('carton') ||
        n.includes('কার্টুন') ||
        n.includes('box') ||
        n.includes('বক্স') ||
        n.includes('stretch') ||
        n.includes('স্ট্র্যাপ')
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

  // Handle selecting a category and aligning sub-category suggestions, units, pricing methods & technical defaults
  const handleSelectCategory = (catId: string) => {
    setCategory(catId)

    // Find match in SERVICE_TYPE_CATEGORIES
    const catList = SERVICE_TYPE_CATEGORIES[serviceType] || []
    const match = catList.find((c) => c.id === catId)
    if (match) {
      if (match.defaultUnit) setSellingUnit(match.defaultUnit)
      if (match.defaultMethod) setPricingMethod(match.defaultMethod)
    }

    // Auto-suggest default sub-category from CATEGORY_SUBCATEGORY_MAP
    const suggestions = CATEGORY_SUBCATEGORY_MAP[catId] || []
    if (suggestions.length > 0) {
      if (!subCategory || !suggestions.includes(subCategory)) {
        setSubCategory(suggestions[0])
      }
    } else {
      setSubCategory('')
    }

    // Align technical configuration defaults according to category
    if (catId === 'wide_format_printing' || catId === 'large_format_printing') {
      setPrintCategory('Large Format Eco-Solvent Print')
      setPrintTechnology('Eco-Solvent')
      setProductionMethod('Roll-to-Roll')
      setDefaultDepartment('Digital Printing')
      setSelectedInkProfile('eco_solvent_cmyk')
      setInkType('Eco-Solvent High Pigment Ink')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'solvent_printing') {
      setPrintCategory('Solvent Heavy Duty Print (Banner & Flex)')
      setPrintTechnology('Solvent')
      setProductionMethod('Roll-to-Roll')
      setDefaultDepartment('Large Format Press')
      setSelectedInkProfile('solvent_cmyk')
      setInkType('Solvent Heavy Duty Ink')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'uv_printing') {
      setPrintCategory('UV Flatbed Rigid Direct Print')
      setPrintTechnology('UV LED')
      setProductionMethod('Flatbed Sheet')
      setDefaultDepartment('Digital Printing')
      setSelectedInkProfile('uv_cmyk_w_v')
      setInkType('UV LED Curable Ink')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('sheet')
    } else if (catId === 'digital_print') {
      setPrintCategory('Digital Press Commercial Print')
      setPrintTechnology('Digital Toner')
      setProductionMethod('Sheet-to-Sheet')
      setDefaultDepartment('Digital Printing')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pack')
    } else if (catId === 'offset_printing') {
      setPrintCategory('Commercial Offset Packaging')
      setPrintTechnology('Offset Lithography')
      setProductionMethod('Sheetfed Offset')
      setDefaultDepartment('Offset Press')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('sheet')
    } else if (catId === 'sublimation_printing') {
      setPrintCategory('Dye Sublimation Fabric Print')
      setPrintTechnology('Dye Sublimation')
      setProductionMethod('Heat Transfer Roll')
      setDefaultDepartment('Textile Printing')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'dtf_printing') {
      setPrintCategory('DTF Apparel Transfer Print')
      setPrintTechnology('Direct to Film (DTF)')
      setProductionMethod('Roll-to-Roll Heat Press')
      setDefaultDepartment('Textile Printing')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'screen_printing') {
      setPrintCategory('Screen Printing Manual/Auto')
      setPrintTechnology('Manual Screen Mesh')
      setProductionMethod('Platen Table')
      setDefaultDepartment('Screen Printing Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pcs')
    } else if (catId === 'signage_fabrication') {
      setProductionCategory('Signboard & Metal Frame Fabrication')
      setStructureFrameType('1" MS Square Box Pipe (20 gauge)')
      setFrameDepth('2 inch')
      setLightingType('none')
      setFabricationMethod('Welding & Metal Assembly')
      setDefaultDepartment('Metal Fabrication Workshop')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('sheet')
    } else if (catId === 'acrylic_3d_letters') {
      setProductionCategory('3D Acrylic, SS & Neon Letters')
      setStructureFrameType('Acrylic 3mm Sheet with 2" Return Edge')
      setFrameDepth('2 inch')
      setLightingType('backlit_led')
      setFabricationMethod('Laser Cutting & Acrylic Bending')
      setDefaultDepartment('Signage & Acrylic Workshop')
      setSellingUnit('inch')
      setPricingMethod('per_length')
      setPurchaseUnit('sheet')
    } else if (catId === 'lightbox_led') {
      setProductionCategory('LED Backlit & Slim Lightboxes')
      setStructureFrameType('Aluminum Slim Lightbox Extrusion Profile')
      setFrameDepth('4 inch')
      setLightingType('backlit_led')
      setFabricationMethod('Profile Assembly & LED Wiring')
      setDefaultDepartment('Signage & Acrylic Workshop')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('pcs')
    } else if (catId === 'cnc_wood_fabrication') {
      setProductionCategory('CNC Router & Laser Engraving')
      setStructureFrameType('MDF / Solid Wood / PVC Board')
      setFrameDepth('Flat (2D)')
      setFabricationMethod('CNC 3D Carving & Laser Engraving')
      setDefaultDepartment('CNC & Laser Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('sheet')
    } else if (catId === 'display_kiosks') {
      setProductionCategory('POS Displays, Kiosks & Gondolas')
      setStructureFrameType('Modular MS Frame & Acrylic Trays')
      setFrameDepth('12 inch')
      setFabricationMethod('Metal Welding & Acrylic Fabrication')
      setDefaultDepartment('Signage & Acrylic Workshop')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pcs')
    } else if (catId === 'event_backdrops') {
      setProductionCategory('Event Staging & Truss Structures')
      setStructureFrameType('Heavy Aluminum Truss / MS Box')
      setFrameDepth('6 inch')
      setFabricationMethod('Modular Truss Erection')
      setDefaultDepartment('Metal Fabrication Workshop')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('pcs')
    } else if (catId === 'thermal_lamination') {
      setFinishingCategory('Thermal Film Lamination (BOPP/PET)')
      setFinishingMethod('Gloss Thermal Lamination')
      setLaminationMicron('32')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'cold_lamination') {
      setFinishingCategory('Cold Pressure Sensitive Lamination')
      setFinishingMethod('Cold Film Lamination')
      setLaminationMicron('80')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'floor_anti_slip') {
      setFinishingCategory('Floor Anti-Slip & Heavy Overlaminate')
      setFinishingMethod('Textured Floor Lamination')
      setLaminationMicron('200')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('roll')
    } else if (catId === 'board_mounting') {
      setFinishingCategory('Rigid Board Mounting & Pasting')
      setFinishingMethod('PVC Foam Sunboard Pasting')
      setLaminationMicron('3mm')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('sheet')
    } else if (catId === 'eyelets_grommets') {
      setFinishingCategory('Eyelets & Brass Grommets')
      setFinishingMethod('Automatic Brass Eyeletting')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('box')
    } else if (catId === 'edge_hemming') {
      setFinishingCategory('Edge Hemming & Pocket Seaming')
      setFinishingMethod('Hot Air Seaming with Rope')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('rft')
      setPricingMethod('per_length')
      setPurchaseUnit('roll')
    } else if (catId === 'die_cutting') {
      setFinishingCategory('Die-Cutting, Kiss-Cut & Creasing')
      setFinishingMethod('Flatbed Plotter Kiss-Cut')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('sheet')
    } else if (catId === 'binding_finishing') {
      setFinishingCategory('Book Binding, Spiral & Stitching')
      setFinishingMethod('Wire-O Spiral Binding')
      setDefaultDepartment('Post-Press Binding Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pcs')
    } else if (catId === 'spot_uv_foiling') {
      setFinishingCategory('Spot UV Varnish & Foil Stamping')
      setFinishingMethod('Digital Spot UV & Gold Foil')
      setDefaultDepartment('Finishing & Lamination Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('sheet')
    } else if (catId === 'site_pasting') {
      setInstallationCategory('Indoor Wall & Glass Sticker Pasting')
      setInstallationHeightTier('ground')
      setInstallationCrewSize(2)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'billboard_erection') {
      setInstallationCategory('Rooftop Billboard & Highway Unipole Erection')
      setInstallationHeightTier('extreme')
      setInstallationCrewSize(4)
      setSafetyEquipmentRequired(true)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'signboard_installation') {
      setInstallationCategory('Shopfront Fascia & Building Sign Installation')
      setInstallationHeightTier('mid')
      setInstallationCrewSize(2)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'vehicle_branding') {
      setInstallationCategory('Commercial Vehicle Full Body Branding & Wrap')
      setInstallationHeightTier('ground')
      setInstallationCrewSize(2)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'exhibition_setup') {
      setInstallationCategory('Exhibition Fair Stall & Stage Fitting')
      setInstallationHeightTier('mid')
      setInstallationCrewSize(3)
      setDefaultDepartment('Site Installation Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    } else if (catId === 'local_city_delivery') {
      setDeliveryCategory('Local City Van / Bike Delivery')
      setDeliveryVehicleType('pickup_van')
      setDeliveryDistanceZone('inside_city')
      setDefaultDepartment('Logistics & Dispatch Dept')
      setSellingUnit('trip')
      setPricingMethod('per_job')
      setPurchaseUnit('trip')
    } else if (catId === 'freight_transport') {
      setDeliveryCategory('Inter-District Courier & Truck Freight')
      setDeliveryVehicleType('covered_truck')
      setDeliveryDistanceZone('nationwide')
      setDefaultDepartment('Logistics & Dispatch Dept')
      setSellingUnit('trip')
      setPricingMethod('per_job')
      setPurchaseUnit('trip')
    } else if (catId === 'express_delivery') {
      setDeliveryCategory('Express Urgent Delivery')
      setDeliveryVehicleType('motorbike')
      setDeliveryDistanceZone('inside_city')
      setDefaultDepartment('Logistics & Dispatch Dept')
      setSellingUnit('trip')
      setPricingMethod('per_job')
      setPurchaseUnit('trip')
    } else if (catId === 'warehouse_handling') {
      setDeliveryCategory('Packaging & Crate Boxing')
      setDeliveryVehicleType('pickup_van')
      setDeliveryDistanceZone('inside_city')
      setDefaultDepartment('Logistics & Dispatch Dept')
      setSellingUnit('pcs')
      setPricingMethod('per_piece')
      setPurchaseUnit('pcs')
    } else if (catId === 'graphic_design') {
      setGeneralCategory('Graphic Design & Pre-Press Color Separation')
      setDeliverableFormat('vector_ai_pdf')
      setTurnaroundHours(24)
      setDefaultDepartment('Creative Design Studio')
      setSellingUnit('job')
      setPricingMethod('per_job')
      setPurchaseUnit('job')
    } else if (catId === 'technical_survey') {
      setGeneralCategory('Site Measurement & Laser Survey')
      setDeliverableFormat('site_survey_report')
      setTurnaroundHours(12)
      setDefaultDepartment('Technical Survey Team')
      setSellingUnit('job')
      setPricingMethod('per_job')
      setPurchaseUnit('job')
    } else if (catId === 'maintenance_repair') {
      setGeneralCategory('Signboard Maintenance & LED Repair')
      setDeliverableFormat('onsite_maintenance')
      setTurnaroundHours(48)
      setDefaultDepartment('Field Operations Team')
      setSellingUnit('job')
      setPricingMethod('per_job')
      setPurchaseUnit('job')
    } else if (catId === 'custom_job_service') {
      setGeneralCategory('Custom CNC / Laser Job Work')
      setDeliverableFormat('vector_ai_pdf')
      setTurnaroundHours(24)
      setDefaultDepartment('CNC & Laser Dept')
      setSellingUnit('sft')
      setPricingMethod('per_area')
      setPurchaseUnit('job')
    }
  }

  // Handle switching Service Type and aligning Catalog Category & default parameters
  const handleSelectServiceType = (newType: 'printing' | 'production' | 'finishing' | 'installation' | 'delivery' | 'general') => {
    setServiceType(newType)
    const availableCats = SERVICE_TYPE_CATEGORIES[newType] || []
    if (availableCats.length > 0) {
      handleSelectCategory(availableCats[0].id)
    }
  }

  // Auto calculate ink channel consumption (total ml divided equally across active channels e.g. 4ch, 5ch, 6ch) and total cost
  const autoCalculatedInkMetrics = useMemo(() => {
    const totalMl = Number(consumePerUnitMl) > 0 ? Number(consumePerUnitMl) : 1.0
    const channelCount = selectedInks && selectedInks.length > 0 ? selectedInks.length : 4
    const perChannelMl = parseFloat((totalMl / channelCount).toFixed(4))

    if (!selectedInks || selectedInks.length === 0) {
      return {
        totalConsumeMl: totalMl,
        channelCount: 4,
        perChannelMl: 0.25,
        unitInkCost: 1.05,
        totalInksCostPerLiter: 2800,
        channelsBreakdown: [],
      }
    }

    let totalInkCost = 0
    const channelsBreakdown = selectedInks.map((ink) => {
      const literPrice = Number(ink.unit_price) || 2800
      const ratePerMl = literPrice / 1000 // 1 Liter = 1000 ml
      const channelCost = parseFloat((perChannelMl * ratePerMl).toFixed(4))
      totalInkCost += channelCost
      return {
        ...ink,
        allocatedMl: perChannelMl,
        ratePerMl,
        channelCost,
      }
    })

    const unitInkCost = parseFloat(totalInkCost.toFixed(2))

    return {
      totalConsumeMl: totalMl,
      channelCount,
      perChannelMl,
      unitInkCost,
      totalInksCostPerLiter: totalMl > 0 ? (totalInkCost / totalMl) * 1000 : 2800,
      channelsBreakdown,
    }
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
      const initialCat = initialData.category === 'large_format_printing' ? 'wide_format_printing' : (initialData.category || 'wide_format_printing')
      setCategory(initialCat)
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
      
      // 4-Level Classification & Production Routing
      setSubCategory(cfg.classification?.sub_category ?? (initialData as any).sub_category ?? cfg.sub_category ?? '')
      setPrintTechnology(cfg.classification?.technology ?? (initialData as any).print_technology ?? cfg.print_technology ?? 'Eco-Solvent')
      setProductionMethod(cfg.classification?.production_method ?? (initialData as any).production_method ?? cfg.production_method ?? 'Roll-to-Roll')
      setDefaultDepartment(cfg.classification?.department ?? (initialData as any).default_department ?? cfg.default_department ?? 'Digital Printing')
      setTrimAllowanceIn(cfg.substrate?.trim_allowance_in ?? (initialData as any).trim_allowance_in ?? cfg.trim_allowance_in ?? 0.25)
      setProductionBleedInches(cfg.substrate?.bleed_in ?? (initialData as any).production_bleed_inches ?? (initialData as any).production_width_allowance ?? 0.5)
      setNestingRule(cfg.substrate?.nesting_rule ?? (initialData as any).nesting_rule ?? cfg.nesting_rule ?? 'optimal_roll_width')
      setSelectedInkProfile(cfg.ink?.profile ?? (initialData as any).ink_profile ?? cfg.ink_profile ?? 'eco_solvent_cmyk')
      setQuantityCalculationMethod(cfg.billing?.calculation_method ?? (initialData as any).quantity_calculation_method ?? cfg.quantity_calculation_method ?? 'area')
      setIsInstallationRequired(cfg.addons?.is_installation_required ?? (initialData as any).is_installation_required ?? Boolean(cfg.is_installation_required))
      setIsDeliveryRequired(cfg.addons?.is_delivery_required ?? (initialData as any).is_delivery_required ?? Boolean(cfg.is_delivery_required))

      // Print category & methods
      const loadedPrintCat = (initialData as any).print_category || cfg.print_category || 'Large Format Eco-Solvent Print'
      setPrintCategory(loadedPrintCat)

      // Finishing category & methods (when serviceType === 'finishing')
      const loadedFinCat = (initialData as any).finishing_category || cfg.finishing_category || 'Thermal Film Lamination'
      setFinishingCategory(loadedFinCat)
      const loadedFinMatId = (initialData as any).finishing_material_id || cfg.finishing_material_id || ''
      setFinishingMaterialId(loadedFinMatId)
      setFinishingMethod((initialData as any).finishing_method || cfg.finishing_method || 'Gloss Thermal Lamination')
      setLaminationMicron((initialData as any).lamination_micron || cfg.lamination_micron || '32')
      setLaminationType((initialData as any).lamination_type || cfg.lamination_type || 'Gloss')

      // Production & Fabrication (when serviceType === 'production')
      const loadedProdCat = (initialData as any).production_category || cfg.production_category || 'Signboard & Metal Frame Fabrication'
      setProductionCategory(loadedProdCat)
      const loadedProdMatId = (initialData as any).production_material_id || cfg.production_material_id || ''
      setProductionMaterialId(loadedProdMatId)
      setStructureFrameType((initialData as any).structure_frame_type || cfg.structure_frame_type || '1" MS Square Box Pipe (20 gauge)')
      setFrameDepth((initialData as any).frame_depth || cfg.frame_depth || '2 inch')
      setLightingType((initialData as any).lighting_type || cfg.lighting_type || 'none')
      setLedModuleMaterialId((initialData as any).led_module_material_id || cfg.led_module_material_id || '')
      setPowerSupplyMaterialId((initialData as any).power_supply_material_id || cfg.power_supply_material_id || '')
      setFabricationMethod((initialData as any).fabrication_method || cfg.fabrication_method || 'Welding & Metal Assembly')

      // Installation & Fitting (when serviceType === 'installation')
      const loadedInstCat = (initialData as any).installation_category || cfg.installation_category || 'Glass & Wall Vinyl Graphics Pasting'
      setInstallationCategory(loadedInstCat)
      const loadedInstHwId = (initialData as any).installation_hardware_id || cfg.installation_hardware_id || ''
      setInstallationHardwareId(loadedInstHwId)
      setInstallationHeightTier((initialData as any).installation_height_tier || cfg.installation_height_tier || 'ground')
      setInstallationCrewSize((initialData as any).installation_crew_size || cfg.installation_crew_size || 2)
      setSafetyEquipmentRequired(Boolean((initialData as any).safety_equipment_required ?? cfg.safety_equipment_required))

      // Delivery & Logistics (when serviceType === 'delivery')
      const loadedDelCat = (initialData as any).delivery_category || cfg.delivery_category || 'Local City Van / Bike Delivery'
      setDeliveryCategory(loadedDelCat)
      setDeliveryVehicleType((initialData as any).delivery_vehicle_type || cfg.delivery_vehicle_type || 'pickup_van')
      const loadedPackMatId = (initialData as any).packaging_material_id || cfg.packaging_material_id || ''
      setPackagingMaterialId(loadedPackMatId)
      setDeliveryDistanceZone((initialData as any).delivery_distance_zone || cfg.delivery_distance_zone || 'inside_city')

      // General & Design Services (when serviceType === 'general')
      const loadedGenCat = (initialData as any).general_category || cfg.general_category || 'Graphic Design & Pre-Press Color Separation'
      setGeneralCategory(loadedGenCat)
      setDeliverableFormat((initialData as any).deliverable_format || cfg.deliverable_format || 'vector_ai_pdf')
      setTurnaroundHours((initialData as any).turnaround_hours || cfg.turnaround_hours || 24)

      const loadedMethods: string[] = (initialData as any).printing_methods || 
        cfg.printing_methods ||
        ((initialData as any).printing_method_name ? (initialData as any).printing_method_name.split(',').map((s: string) => s.trim()).filter(Boolean) : []) ||
        ((initialData as any).printing_method ? [(initialData as any).printing_method] : []) ||
        (cfg.printing_method ? [cfg.printing_method] : ['Eco-Solvent Print'])
      setSelectedPrintingMethods(loadedMethods)

      // Fleet Machine linkage
      const loadedMachId = (initialData as any).machine_id || cfg.machine_id || ''
      setSelectedMachineId(loadedMachId)
      const loadedMachRate = (initialData as any).machine_hourly_rate ?? cfg.machine_hourly_rate
      setMachineHourlyRate(loadedMachRate !== undefined && loadedMachRate !== null && loadedMachRate !== '' ? Number(loadedMachRate) : '')
      const loadedSpeed = (initialData as any).estimated_speed ?? cfg.estimated_speed
      setEstimatedSpeed(loadedSpeed !== undefined && loadedSpeed !== null && loadedSpeed !== '' ? Number(loadedSpeed) : '')
      setSpeedUnit((initialData as any).speed_unit || cfg.speed_unit || 'sqft_per_hr')

      // Printable material
      const primaryReq = (cfg.required_materials || []).find((m) => m.is_primary)
      const initialMatId = (initialData as any).printable_material_id || cfg.printable_material_id || primaryReq?.material_id || ''
      setPrintableMaterialId(initialMatId)

      // Ink type & selected inks
      setInkType((initialData as any).ink_type || cfg.ink_type || 'Eco-Solvent High Pigment Ink')
      if (cfg.selected_inks && Array.isArray(cfg.selected_inks) && cfg.selected_inks.length > 0) {
        setSelectedInks(cfg.selected_inks)
      } else {
        setSelectedInks(INK_PROFILES[0].channels)
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
      setExtraWidthAllowance(cfg.extra_width_allowance_ft != null ? cfg.extra_width_allowance_ft : (initialData.production_width_allowance != null ? initialData.production_width_allowance : 0.25))
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
      setSubCategory('')
      setPrintTechnology('Eco-Solvent')
      setProductionMethod('Roll-to-Roll')
      setDefaultDepartment('Digital Printing')
      setTrimAllowanceIn(0.25)
      setProductionBleedInches(0.5)
      setNestingRule('optimal_roll_width')
      setSelectedInkProfile('eco_solvent_cmyk')
      setQuantityCalculationMethod('area')
      setIsInstallationRequired(false)
      setIsDeliveryRequired(false)
      setServiceType('printing')
      setPrintCategory('Large Format Eco-Solvent Print')
      setFinishingCategory('Thermal Film Lamination')
      setFinishingMaterialId('')
      setFinishingMethod('Gloss Thermal Lamination')
      setLaminationMicron('32')
      setLaminationType('Gloss')

      setProductionCategory('Signboard & Metal Frame Fabrication')
      setProductionMaterialId('')
      setStructureFrameType('1" MS Square Box Pipe (20 gauge)')
      setFrameDepth('2 inch')
      setLightingType('none')
      setLedModuleMaterialId('')
      setPowerSupplyMaterialId('')
      setFabricationMethod('Welding & Metal Assembly')

      setInstallationCategory('Glass & Wall Vinyl Graphics Pasting')
      setInstallationHardwareId('')
      setInstallationHeightTier('ground')
      setInstallationCrewSize(2)
      setSafetyEquipmentRequired(false)

      setDeliveryCategory('Local City Van / Bike Delivery')
      setDeliveryVehicleType('pickup_van')
      setPackagingMaterialId('')
      setDeliveryDistanceZone('inside_city')

      setGeneralCategory('Graphic Design & Pre-Press Color Separation')
      setDeliverableFormat('vector_ai_pdf')
      setTurnaroundHours(24)

      setSelectedPrintingMethods(['Eco-Solvent Print'])
      setSelectedMachineId('')
      setMachineHourlyRate('')
      setEstimatedSpeed('')
      setSpeedUnit('sqft_per_hr')
      setPrintableMaterialId('')
      setInkType('Eco-Solvent High Pigment Ink')
      setSelectedInks(INK_PROFILES[0].channels)
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
  }, [initialData, isOpen])

  // Material Cost and Unit helpers defined at module level

  // Handle selecting fleet machine and auto-syncing speed, hourly cost and machine unit rate
  const handleFleetMachineSelect = (mId: string) => {
    setSelectedMachineId(mId)
    if (!mId) return
    const m = machineries.find((item) => item.id === mId)
    if (!m) return
    if (m.hourly_rate_bdt) {
      setMachineHourlyRate(m.hourly_rate_bdt)
    }
    const spd = m.speed_sqft_per_hour || m.speed_sheets_per_hour
    if (spd) {
      setEstimatedSpeed(spd)
      setSpeedUnit(m.speed_sheets_per_hour ? 'sheet_per_hr' : 'sqft_per_hr')
    }
    // Auto-compute unit machine & power cost: hourly_rate / speed_sqft_per_hour
    if (m.hourly_rate_bdt && m.speed_sqft_per_hour && m.speed_sqft_per_hour > 0) {
      const unitMachCost = Math.round((m.hourly_rate_bdt / m.speed_sqft_per_hour) * 100) / 100
      setMachineCost(unitMachCost)
    }
  }

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

    const extraAllowance = (mat as any).production_width_allowance !== undefined ? (mat as any).production_width_allowance : ((mat as any).material_config?.extra_width_allowance_ft !== undefined ? (mat as any).material_config.extra_width_allowance_ft : 0)
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
    const matCostVal = getMaterialCost(mat)
    if (matCostVal > 0) {
      setMaterialCost(matCostVal)
      setPurchasePrice(matCostVal)
      setBaseCostEstimate(matCostVal)
    }

    // Auto-sync into requiredMaterials (BOM)
    setRequiredMaterials((prev) => {
      const existingIdx = prev.findIndex((m) => m.material_id === mat.id)
      if (existingIdx >= 0) {
        return prev.map((m, i) => ({
          ...m,
          is_primary: i === existingIdx,
          unit_cost: m.unit_cost || matCostVal,
          subtotal_cost: parseFloat(((Number(m.quantity_per_unit) || 1) * (m.unit_cost || matCostVal) * (1 + (Number(m.waste_percent) || 0) / 100)).toFixed(2)),
        }))
      }
      const rawUnit = (mat as any).purchase_unit || mat.unit || (mat as any).stock_unit || 'sft'
      const defaultBomUnit = rawUnit === 'roll' ? 'sft' : rawUnit
      const newItem: ServiceRequiredMaterial & { is_primary?: boolean } = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        material_id: mat.id,
        material_name: mat.name,
        sku: mat.sku || undefined,
        category: mat.category || undefined,
        is_required: true,
        is_primary: true,
        quantity_per_unit: 1,
        quantity_required: 1,
        unit: defaultBomUnit,
        unit_cost: matCostVal,
        waste_percent: defaultWastagePercent,
        subtotal_cost: parseFloat((1 * matCostVal * (1 + defaultWastagePercent / 100)).toFixed(2)),
      }
      return [newItem, ...prev.map((m) => ({ ...m, is_primary: false }))]
    })
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

    const matCostVal = getMaterialCost(mat)
    if (matCostVal > 0) {
      setMaterialCost(matCostVal)
      setPurchasePrice(matCostVal)
      setBaseCostEstimate(matCostVal)
    }

    // Auto-sync into requiredMaterials
    setRequiredMaterials((prev) => {
      const existingIdx = prev.findIndex((m) => m.material_id === mat.id)
      if (existingIdx >= 0) {
        return prev.map((m, i) => ({
          ...m,
          is_primary: i === existingIdx,
          unit_cost: m.unit_cost || matCostVal,
          subtotal_cost: parseFloat(((Number(m.quantity_per_unit) || 1) * (m.unit_cost || matCostVal) * (1 + (Number(m.waste_percent) || 0) / 100)).toFixed(2)),
        }))
      }
      const rawUnit = (mat as any).purchase_unit || mat.unit || (mat as any).stock_unit || 'sft'
      const defaultBomUnit = rawUnit === 'roll' ? 'sft' : rawUnit
      const newItem: ServiceRequiredMaterial & { is_primary?: boolean } = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        material_id: mat.id,
        material_name: mat.name,
        sku: mat.sku || undefined,
        category: mat.category || undefined,
        is_required: true,
        is_primary: true,
        quantity_per_unit: 1,
        quantity_required: 1,
        unit: defaultBomUnit,
        unit_cost: matCostVal,
        waste_percent: defaultWastagePercent,
        subtotal_cost: parseFloat((1 * matCostVal * (1 + defaultWastagePercent / 100)).toFixed(2)),
      }
      return [newItem, ...prev.map((m) => ({ ...m, is_primary: false }))]
    })
  }

  // Handle selecting Production Raw Material (Base Substrate/Sheet/Pipe)
  const handleSelectProductionMaterial = (matId: string) => {
    setProductionMaterialId(matId)
    if (!matId) return
    const mat = availableMaterials.find((m) => m.id === matId)
    if (!mat) return
    const matCostVal = getMaterialCost(mat)
    if (matCostVal > 0) {
      setMaterialCost(matCostVal)
      setPurchasePrice(matCostVal)
      setBaseCostEstimate(matCostVal)
    }

    // Auto-sync into requiredMaterials
    setRequiredMaterials((prev) => {
      const existingIdx = prev.findIndex((m) => m.material_id === mat.id)
      if (existingIdx >= 0) {
        return prev.map((m, i) => ({
          ...m,
          is_primary: i === existingIdx,
          unit_cost: m.unit_cost || matCostVal,
          subtotal_cost: parseFloat(((Number(m.quantity_per_unit) || 1) * (m.unit_cost || matCostVal) * (1 + (Number(m.waste_percent) || 0) / 100)).toFixed(2)),
        }))
      }
      const rawUnit = (mat as any).purchase_unit || mat.unit || (mat as any).stock_unit || 'sheet'
      const defaultBomUnit = rawUnit === 'roll' ? 'sft' : rawUnit
      const newItem: ServiceRequiredMaterial & { is_primary?: boolean } = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        material_id: mat.id,
        material_name: mat.name,
        sku: mat.sku || undefined,
        category: mat.category || undefined,
        is_required: true,
        is_primary: true,
        quantity_per_unit: 1,
        quantity_required: 1,
        unit: defaultBomUnit,
        unit_cost: matCostVal,
        waste_percent: defaultWastagePercent,
        subtotal_cost: parseFloat((1 * matCostVal * (1 + defaultWastagePercent / 100)).toFixed(2)),
      }
      return [newItem, ...prev.map((m) => ({ ...m, is_primary: false }))]
    })
  }

  // Handle selecting Installation Hardware & Fasteners Material
  const handleSelectInstallationHardware = (matId: string) => {
    setInstallationHardwareId(matId)
    if (!matId) return
    const mat = availableMaterials.find((m) => m.id === matId)
    if (!mat) return
    const matCostVal = getMaterialCost(mat)

    // Auto-add to requiredMaterials
    setRequiredMaterials((prev) => {
      if (prev.some((m) => m.material_id === mat.id)) return prev
      const rawUnit = (mat as any).purchase_unit || mat.unit || 'pcs'
      const newItem: ServiceRequiredMaterial & { is_primary?: boolean } = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        material_id: mat.id,
        material_name: mat.name,
        sku: mat.sku || undefined,
        category: mat.category || undefined,
        is_required: true,
        is_primary: false,
        quantity_per_unit: 1,
        quantity_required: 1,
        unit: rawUnit,
        unit_cost: matCostVal,
        waste_percent: 0,
        subtotal_cost: matCostVal,
      }
      return [...prev, newItem]
    })
  }

  // Handle selecting Delivery Packaging Material
  const handleSelectPackagingMaterial = (matId: string) => {
    setPackagingMaterialId(matId)
    if (!matId) return
    const mat = availableMaterials.find((m) => m.id === matId)
    if (!mat) return
    const matCostVal = getMaterialCost(mat)

    // Auto-add to requiredMaterials
    setRequiredMaterials((prev) => {
      if (prev.some((m) => m.material_id === mat.id)) return prev
      const rawUnit = (mat as any).purchase_unit || mat.unit || 'pcs'
      const newItem: ServiceRequiredMaterial & { is_primary?: boolean } = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        material_id: mat.id,
        material_name: mat.name,
        sku: mat.sku || undefined,
        category: mat.category || undefined,
        is_required: true,
        is_primary: false,
        quantity_per_unit: 1,
        quantity_required: 1,
        unit: rawUnit,
        unit_cost: matCostVal,
        waste_percent: 0,
        subtotal_cost: matCostVal,
      }
      return [...prev, newItem]
    })
  }

  const handleApplyInkPreset = (presetKey: keyof typeof INK_CHANNEL_PRESETS) => {
    const preset = INK_CHANNEL_PRESETS[presetKey]
    if (preset) {
      setSelectedInks(preset.map((p) => ({ ...p })))
    }
  }

  const handleApplyInkProfile = (profileId: string) => {
    setSelectedInkProfile(profileId)
    const prof = INK_PROFILES.find((p) => p.id === profileId)
    if (prof) {
      setSelectedInks(prof.channels.map((c) => ({ ...c })))
      setConsumePerUnitMl(prof.defaultMlPerSqft)
      if (prof.tech) {
        setPrintTechnology(prof.tech)
      }
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

  // Total BOM Direct Material Cost (Sum of all line subtotals)
  const totalBOMCost = useMemo(() => {
    return requiredMaterials.reduce((acc, item) => {
      const qty = Number(item.quantity_per_unit ?? item.quantity_required) || 1
      const cost = Number(item.unit_cost) || 0
      const waste = Number(item.waste_percent) || 0
      const lineSubtotal = item.subtotal_cost !== undefined && !isNaN(item.subtotal_cost)
        ? item.subtotal_cost
        : qty * cost * (1 + waste / 100)
      return acc + lineSubtotal
    }, 0)
  }, [requiredMaterials])

  // Live Gross Margin Analysis
  const marginMetrics = useMemo(() => {
    const sp = Number(sellingPrice) || 0
    return calculateGrossMargin(totalDirectCost, sp)
  }, [totalDirectCost, sellingPrice])

  // Auto-fill price tiers based on standard industry percentages (MUST NEVER be less than Direct Unit Cost)
  const handleAutoFillTiers = (discountStrategy: 'standard' | 'aggressive' | 'reset') => {
    let sp = Number(sellingPrice) || 0
    const costFloor = Number(totalDirectCost) || 0

    // If selling price is not set OR is below direct unit cost (loss-making),
    // automatically calculate healthy selling price using target margin (whole integer)
    if (sp <= costFloor && costFloor > 0) {
      const margin = (targetMargin && targetMargin > 0) ? targetMargin : 35
      sp = Math.ceil(costFloor * (1 + margin / 100))
      setSellingPrice(sp)
    }

    if (sp <= 0 && costFloor <= 0) return

    const effectiveSp = sp > 0 ? sp : Math.ceil(costFloor)

    const clampToFloor = (calcVal: number) => {
      // Suggest clean whole integer pricing (no decimals)
      const rounded = Math.round(calcVal)
      // Strictly enforce that price tiers are integers and NEVER less than Direct Unit Cost
      const floored = Math.max(Math.ceil(costFloor), rounded)
      return floored
    }

    if (discountStrategy === 'reset') {
      const baseVal = Math.round(effectiveSp)
      setPriceTiers({
        retail: clampToFloor(baseVal),
        reseller: clampToFloor(baseVal),
        corporate: clampToFloor(baseVal),
        agency: clampToFloor(baseVal),
        regular: clampToFloor(baseVal),
        custom: clampToFloor(baseVal),
      })
      return
    }

    if (discountStrategy === 'aggressive') {
      setPriceTiers({
        retail: clampToFloor(effectiveSp),
        regular: clampToFloor(effectiveSp * 0.90),   // 10% loyal client discount
        corporate: clampToFloor(effectiveSp * 0.85), // 15% corporate contract discount
        reseller: clampToFloor(effectiveSp * 0.75),  // 25% wholesale discount
        agency: clampToFloor(effectiveSp * 0.70),    // 30% creative agency partner discount
        custom: clampToFloor(effectiveSp * 0.65),    // 35% Special / VIP discount
      })
      return
    }

    // Standard commercial print shop tiers in Bangladesh (clamped to Direct Unit Cost floor)
    setPriceTiers({
      retail: clampToFloor(effectiveSp),
      regular: clampToFloor(effectiveSp * 0.95),   // 5% loyal client discount
      corporate: clampToFloor(effectiveSp * 0.90), // 10% corporate contract discount
      reseller: clampToFloor(effectiveSp * 0.85),  // 15% wholesale discount
      agency: clampToFloor(effectiveSp * 0.80),    // 20% creative agency partner discount
      custom: clampToFloor(effectiveSp * 0.75),    // 25% Special / VIP discount
    })
  }

  // Auto-synchronize Direct Unit Cost Heads dynamically when BOM, Inks, Machine, Finishing, or Installation change
  useEffect(() => {
    // 1. Direct Material from BOM or primary selected material
    if (totalBOMCost > 0) {
      const bomCostRounded = parseFloat(totalBOMCost.toFixed(2))
      setMaterialCost(bomCostRounded)
      setPurchasePrice(bomCostRounded)
      setBaseCostEstimate(bomCostRounded)
    } else if (printableMaterialId || productionMaterialId || finishingMaterialId) {
      const primaryId = printableMaterialId || productionMaterialId || finishingMaterialId
      const mat = availableMaterials.find((m) => m.id === primaryId)
      if (mat) {
        const matCost = getMaterialCost(mat)
        if (matCost > 0) {
          setMaterialCost(matCost)
          setPurchasePrice(matCost)
          setBaseCostEstimate(matCost)
        }
      }
    }

    // 2. Machine & Power Cost auto-calculated from speed and hourly rate
    if (machineHourlyRate && estimatedSpeed && Number(estimatedSpeed) > 0) {
      const calcMach = Math.round((Number(machineHourlyRate) / Number(estimatedSpeed)) * 100) / 100
      if (calcMach > 0) {
        setMachineCost(calcMach)
      }
    }

    // 3. Finishing Direct Cost auto-calculated from active finishing options
    const defaultFinCosts = finishingOptions
      .filter((f) => f.is_default || f.pricing_method === 'per_sqft' || f.pricing_method === 'per_unit' || f.pricing_method === 'per_item')
      .reduce((acc, f) => acc + (Number(f.unit_cost ?? f.cost) || 0), 0)
    if (defaultFinCosts > 0) {
      setFinishingCost(parseFloat(defaultFinCosts.toFixed(2)))
    }

    // 4. Installation Direct Cost auto-calculated from active installation options
    const defaultInstCosts = installationOptions
      .filter((i) => i.pricing_method === 'per_sqft' || i.pricing_method === 'per_unit' || i.pricing_method === 'per_item')
      .reduce((acc, i) => acc + (Number(i.unit_cost ?? i.cost) || 0), 0)
    if (defaultInstCosts > 0) {
      setInstallationCost(parseFloat(defaultInstCosts.toFixed(2)))
    }
  }, [
    totalBOMCost,
    printableMaterialId,
    productionMaterialId,
    finishingMaterialId,
    availableMaterials,
    machineHourlyRate,
    estimatedSpeed,
    finishingOptions,
    installationOptions,
  ])

  // Material Toggle for Tab 2 (Add / Remove from BOM)
  const handleToggleMaterial = (mat: MaterialRecord) => {
    const exists = requiredMaterials.some((m) => m.material_id === mat.id)
    if (exists) {
      setRequiredMaterials(requiredMaterials.filter((m) => m.material_id !== mat.id))
    } else {
      const { consumeUnit, costVal, isInk } = getMaterialUnitDetails(mat)
      const cost = costVal
      const qty = isInk ? autoCalculatedInkMetrics.perChannelMl : 1
      const waste = defaultWastagePercent
      const subtotal = parseFloat((qty * cost * (1 + waste / 100)).toFixed(2))

      const defaultBomUnit = consumeUnit || 'sft'

      const newItem: ServiceRequiredMaterial & { is_primary?: boolean } = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        material_id: mat.id,
        material_name: mat.name,
        sku: mat.sku || undefined,
        category: mat.category || undefined,
        is_required: true,
        is_primary: requiredMaterials.length === 0,
        quantity_per_unit: qty,
        quantity_required: qty,
        unit: defaultBomUnit,
        unit_cost: cost,
        waste_percent: waste,
        subtotal_cost: subtotal,
      }
      setRequiredMaterials([...requiredMaterials, newItem])
    }
  }

  // Update specific BOM item line
  const handleUpdateBOMItem = (index: number, field: keyof ServiceRequiredMaterial, value: any) => {
    const next = [...requiredMaterials]
    if (!next[index]) return
    const item = { ...next[index], [field]: value }

    const qty = Number(item.quantity_per_unit ?? item.quantity_required) || 1
    const cost = Number(item.unit_cost) || 0
    const waste = Number(item.waste_percent) || 0
    item.subtotal_cost = parseFloat((qty * cost * (1 + waste / 100)).toFixed(2))
    item.quantity_required = qty
    item.quantity_per_unit = qty

    next[index] = item
    setRequiredMaterials(next)
  }

  // Toggle or Set Primary Material in BOM
  const handleSetPrimaryMaterial = (index: number) => {
    const next = requiredMaterials.map((m, i) => ({
      ...m,
      is_primary: i === index,
    }))
    setRequiredMaterials(next)

    const selected = next[index]
    if (selected && selected.material_id) {
      if (serviceType === 'printing') {
        handleSelectPrintableMaterial(selected.material_id)
      } else if (serviceType === 'production') {
        handleSelectProductionMaterial(selected.material_id)
      } else if (serviceType === 'finishing') {
        handleSelectFinishingMaterial(selected.material_id)
      }
    }
  }

  // Remove BOM Item
  const handleRemoveBOMItem = (index: number) => {
    setRequiredMaterials(requiredMaterials.filter((_, i) => i !== index))
  }

  // 1-Click Sync BOM Total to Direct Media Cost
  const handleSyncBOMToDirectCost = () => {
    const calcCost = parseFloat(totalBOMCost.toFixed(2))
    if (calcCost > 0) {
      setMaterialCost(calcCost)
      setPurchasePrice(calcCost)
      setBaseCostEstimate(calcCost)
    }
  }

  // 1-Click Auto-Calculate All Direct Costs across BOM, Inks, Finishing, Fabrication & Installation
  const handleAutoCalculateAllDirectCosts = () => {
    // 1. Direct Material from BOM or primary selected material
    let calcMat = totalBOMCost > 0 ? parseFloat(totalBOMCost.toFixed(2)) : (Number(materialCost) || 0)
    if (calcMat === 0 && (printableMaterialId || productionMaterialId || finishingMaterialId)) {
      const primaryId = printableMaterialId || productionMaterialId || finishingMaterialId
      const mat = availableMaterials.find((m) => m.id === primaryId)
      if (mat) calcMat = getMaterialCost(mat)
    }
    setMaterialCost(calcMat)
    setPurchasePrice(calcMat)
    setBaseCostEstimate(calcMat)

    // 2. Inks Cost
    if (serviceType === 'printing') {
      setInkCost(autoCalculatedInkMetrics.unitInkCost)
    } else {
      setInkCost(0)
    }

    // 3. Machine & Power Cost
    if (machineHourlyRate && estimatedSpeed && Number(estimatedSpeed) > 0) {
      const calcMach = Math.round((Number(machineHourlyRate) / Number(estimatedSpeed)) * 100) / 100
      setMachineCost(calcMach > 0 ? calcMach : 1.5)
    } else {
      setMachineCost(1.5)
    }

    // 4. Operator Labor
    if (laborCost === '' || Number(laborCost) <= 0) {
      setLaborCost(1.0)
    }

    // 5. Finishing Direct Cost
    const defaultFinCosts = finishingOptions
      .filter((f) => f.is_default || f.pricing_method === 'per_sqft' || f.pricing_method === 'per_unit' || f.pricing_method === 'per_item')
      .reduce((acc, f) => acc + (Number(f.unit_cost ?? f.cost) || 0), 0)
    setFinishingCost(parseFloat(defaultFinCosts.toFixed(2)))

    // 6. Fabrication Direct Cost
    if (fabricationCost === '') setFabricationCost(0)

    // 7. Installation Direct Cost
    const defaultInstCosts = installationOptions
      .filter((i) => i.pricing_method === 'per_sqft' || i.pricing_method === 'per_unit' || i.pricing_method === 'per_item')
      .reduce((acc, i) => acc + (Number(i.unit_cost ?? i.cost) || 0), 0)
    setInstallationCost(parseFloat(defaultInstCosts.toFixed(2)))

    // 8. Delivery Direct Cost
    if (deliveryCost === '') setDeliveryCost(0)

    // 9. Other Direct Overhead Allowance
    if (otherDirectCost === '' || Number(otherDirectCost) === 0) {
      setOtherDirectCost(0.25)
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

    const { consumeUnit, costVal, isFastener, isInk, isRollMedia, isSheet } = getMaterialUnitDetails(mat)
    const pUnit = (mat.unit || (mat as any).purchase_unit || (mat as any).selling_unit || '').toLowerCase()
    const cat = (mat.category || '').toLowerCase()
    const n = (mat.name || '').toLowerCase()
    const explicitMethod = ((mat as any).pricing_method || (mat as any).material_config?.pricing_method || '').toLowerCase()

    let pricing_method = 'per_sqft'
    if (
      explicitMethod === 'per_rft' ||
      explicitMethod === 'rft' ||
      explicitMethod === 'per_linear_ft' ||
      explicitMethod === 'per_length' ||
      explicitMethod === 'per_perimeter_ft'
    ) {
      pricing_method = 'per_rft'
    } else if (
      explicitMethod === 'per_piece' ||
      explicitMethod === 'piece' ||
      explicitMethod === 'per_unit' ||
      explicitMethod === 'pcs'
    ) {
      pricing_method = 'per_piece'
    } else if (
      explicitMethod === 'per_sqft' ||
      explicitMethod === 'sqft' ||
      explicitMethod === 'sft' ||
      explicitMethod === 'per_area'
    ) {
      pricing_method = 'per_sqft'
    } else if (
      explicitMethod === 'fixed' ||
      explicitMethod === 'per_job' ||
      explicitMethod === 'job'
    ) {
      pricing_method = 'fixed'
    } else if (
      pUnit === 'meter' ||
      pUnit === 'rft' ||
      pUnit === 'inch' ||
      pUnit === 'linear_ft' ||
      cat.includes('seaming') ||
      cat.includes('hemming') ||
      n.includes('seaming') ||
      n.includes('tape') ||
      n.includes('rope')
    ) {
      pricing_method = 'per_rft'
    } else if (
      isFastener ||
      consumeUnit === 'pcs' ||
      consumeUnit === 'piece' ||
      pUnit === 'piece' ||
      pUnit === 'pcs' ||
      pUnit === 'box' ||
      pUnit === 'pack' ||
      cat.includes('eyelet') ||
      n.includes('eyelet') ||
      n.includes('grommet') ||
      n.includes('stand') ||
      n.includes('ring') ||
      n.includes('die_cutting') ||
      n.includes('die cut') ||
      n.includes('punching')
    ) {
      pricing_method = 'per_piece'
    } else if (pUnit === 'job' || pUnit === 'fixed' || pUnit === 'trip') {
      pricing_method = 'fixed'
    } else {
      pricing_method = 'per_sqft'
    }

    const cost = costVal

    const rawSellingPrice =
      (mat as any).selling_price ??
      (mat as any).price ??
      (mat as any).material_config?.selling_price ??
      (mat as any).price_tiers?.retail

    let sellPrice = cost
    if (rawSellingPrice !== undefined && rawSellingPrice !== null && rawSellingPrice !== '' && Number(rawSellingPrice) > 0) {
      const numSp = Number(rawSellingPrice)
      if (isFastener && consumeUnit === 'pcs' && (pUnit === 'box' || pUnit === 'pack') && numSp >= 50) {
        sellPrice = parseFloat((numSp / 1000).toFixed(4))
      } else if (isInk && consumeUnit === 'ml' && numSp >= 50) {
        sellPrice = parseFloat((numSp / 1000).toFixed(4))
      } else {
        sellPrice = numSp
      }
    }

    setFinishingOptions([
      ...finishingOptions,
      {
        id: `fin-mat-${mat.id}-${Date.now()}`,
        name: mat.name,
        name_bn: (mat as any).name_bn || undefined,
        material_id: mat.id,
        material_name: mat.name,
        unit: consumeUnit || mat.unit || (mat as any).purchase_unit || (mat as any).selling_unit || undefined,
        pricing_method,
        unit_price: sellPrice,
        price: sellPrice,
        unit_cost: cost,
        cost: cost,
        is_default: false,
      },
    ])
  }

  const handleAddRollWidth = () => {
    const w = parseFloat(newRollWidth)
    if (!isNaN(w) && w > 0 && !availableRollWidths.includes(w)) {
      setAvailableRollWidths([...availableRollWidths, w].sort((a, b) => a - b))
      setNewRollWidth('')
    }
  }

  const handleRemoveRollWidth = (wToRemove: number) => {
    if (availableRollWidths.length <= 1) return
    setAvailableRollWidths(availableRollWidths.filter((w) => w !== wToRemove))
  }

  const handleAddCustomFinishing = () => {
    if (!customFinishingName.trim()) return
    const linkedMat = availableMaterials.find((m) => m.id === customFinishingMaterialId)

    setFinishingOptions([
      ...finishingOptions,
      {
        id: `custom-fin-${Date.now()}`,
        name: customFinishingName.trim(),
        finishing_operation: customFinishingName.trim(),
        requirement_type: customFinishingRequirementType,
        material_id: customFinishingMaterialId || undefined,
        material_name: linkedMat?.name || undefined,
        unit: linkedMat ? (getMaterialUnitDetails(linkedMat).consumeUnit || linkedMat.unit) : undefined,
        pricing_method: customFinishingMethod,
        unit_price: Number(customFinishingPrice) || 0,
        price: Number(customFinishingPrice) || 0,
        unit_cost: Number(customFinishingCost) || 0,
        cost: Number(customFinishingCost) || 0,
        is_default: customFinishingRequirementType === 'required',
      },
    ])
    setCustomFinishingName('')
    setCustomFinishingMaterialId('')
    setCustomFinishingPrice('')
    setCustomFinishingCost('')
    setCustomFinishingRequirementType('optional')
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

  // Filtered raw materials for Tab 2 with rich multi-category quick filters
  const filteredMaterials = useMemo(() => {
    let list = availableMaterials
    if (materialCategoryFilter === 'roll') {
      list = availableMaterials.filter((m) => {
        const u = (m.unit || (m as any).purchase_unit || '').toLowerCase()
        const c = (m.category || '').toLowerCase()
        const n = (m.name || '').toLowerCase()
        return u === 'roll' || c.includes('roll') || c.includes('vinyl') || c.includes('banner') || c.includes('media') || c.includes('flex') || n.includes('vinyl') || n.includes('banner') || n.includes('flex')
      })
    } else if (materialCategoryFilter === 'sheet') {
      list = availableMaterials.filter((m) => {
        const u = (m.unit || (m as any).purchase_unit || '').toLowerCase()
        const c = (m.category || '').toLowerCase()
        const n = (m.name || '').toLowerCase()
        return u === 'sheet' || u === 'piece' || c.includes('sheet') || c.includes('board') || c.includes('foam') || c.includes('acrylic') || c.includes('acp') || c.includes('rigid') || n.includes('sheet') || n.includes('board') || n.includes('foam') || n.includes('acrylic') || n.includes('acp')
      })
    } else if (materialCategoryFilter === 'ink') {
      list = inkMaterials
    } else if (materialCategoryFilter === 'finishing') {
      list = finishingMaterials.length > 0 ? finishingMaterials : availableMaterials.filter((m) => {
        const c = (m.category || '').toLowerCase()
        const n = (m.name || '').toLowerCase()
        return c.includes('finish') || c.includes('laminat') || c.includes('film') || c.includes('tape') || c.includes('eyelet') || n.includes('laminat') || n.includes('film') || n.includes('tape')
      })
    } else if (materialCategoryFilter === 'metal_pipe') {
      list = productionMaterials.length > 0 ? productionMaterials : availableMaterials.filter((m) => {
        const c = (m.category || '').toLowerCase()
        const n = (m.name || '').toLowerCase()
        return c.includes('pipe') || c.includes('metal') || c.includes('steel') || c.includes('frame') || n.includes('pipe') || n.includes('ss') || n.includes('ms') || n.includes('frame')
      })
    } else if (materialCategoryFilter === 'electrical') {
      list = electricalMaterials
    } else if (materialCategoryFilter === 'fasteners') {
      list = installationHardwareMaterials
    } else if (materialCategoryFilter === 'packaging') {
      list = packagingMaterials
    }

    if (!materialSearchQuery) return list
    const q = materialSearchQuery.toLowerCase().trim()
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        ((m as any).name_bn && (m as any).name_bn.toLowerCase().includes(q)) ||
        (m.sku && m.sku.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
    )
  }, [availableMaterials, materialCategoryFilter, materialSearchQuery, inkMaterials, finishingMaterials, productionMaterials, electricalMaterials, installationHardwareMaterials, packagingMaterials])

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setActiveTab('basic')
      setFieldErrors({ name: 'Service name is required before proceeding.' })
      dispatchToast({
        type: 'warning',
        title: 'Service Name Required',
        message: 'Service name is required before proceeding.',
      })
      return
    }

    const sp = Number(sellingPrice) || 0
    if (sp <= 0) {
      setActiveTab('pricing')
      setFieldErrors({ sellingPrice: 'Selling price must be greater than 0.' })
      dispatchToast({
        type: 'warning',
        title: 'Selling Price Required',
        message: 'Selling price must be greater than 0.',
      })
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})

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
        identity: {
          name_en: name.trim(),
          name_bn: nameBn.trim() || undefined,
          code: sku.trim() || `SRV-${Date.now().toString().slice(-5)}`,
          description: description.trim() || undefined,
          active: isActive,
        },
        classification: {
          service_type: serviceType,
          category: category,
          sub_category: subCategory.trim() || undefined,
          technology: printTechnology,
          production_method: productionMethod,
          department: defaultDepartment,
        },
        substrate: {
          material_id: printableMaterialId || undefined,
          material_name: selectedMat?.name || undefined,
          supported_widths: purchaseUnit === 'roll' ? availableRollWidths : undefined,
          sheet_sizes: purchaseUnit === 'sheet' ? availableSheetSizes : undefined,
          trim_allowance_in: Number(trimAllowanceIn) || 0,
          bleed_in: Number(productionBleedInches) || 0,
          print_allowance_ft: purchaseUnit === 'roll' ? (extraWidthAllowance !== '' && !isNaN(Number(extraWidthAllowance)) ? Number(extraWidthAllowance) : 0) : undefined,
          nesting_rule: nestingRule,
        },
        ink: {
          ink_type: inkType,
          profile: selectedInkProfile,
          channels: selectedInks,
          total_ml_per_sqft: Number(consumePerUnitMl) || 1.2,
          auto_calculate_cost: autoCalculateInkCost,
          unit_cost: inkCostNum,
        },
        billing: {
          selling_unit: sellingUnit,
          calculation_method: quantityCalculationMethod,
          minimum_billable_qty: minBillableQty,
          minimum_job_charge: minimumCharge !== '' ? Number(minimumCharge) : undefined,
        },
        production: {
          required: true,
          machine_ids: selectedMachineId ? [selectedMachineId] : undefined,
          default_machine_id: selectedMachineId || undefined,
          machine_hourly_rate: Number(machineHourlyRate) || undefined,
          estimated_speed: Number(estimatedSpeed) || undefined,
          speed_unit: speedUnit || undefined,
          production_time_minutes: undefined,
          design_required: true,
          approval_required: true,
          qc_required: true,
        },
        bom: {
          required_materials: requiredMaterials,
          consumption_groups: {
            print_media: selectedMat ? {
              material_id: selectedMat.id,
              material_name: selectedMat.name,
              consumption_method: 'area_print',
              waste_percent: defaultWastagePercent,
              unit_cost: getMaterialCost(selectedMat),
              subtotal_cost: getMaterialCost(selectedMat) * (1 + defaultWastagePercent / 100),
            } : undefined,
            ink: {
              profile: selectedInkProfile,
              channels: selectedInks,
              consume_per_unit_ml: Number(consumePerUnitMl) || 1.2,
              total_ml_per_sqft: Number(consumePerUnitMl) || 1.2,
              unit_cost: inkCostNum,
              auto_calculate_cost: autoCalculateInkCost,
            },
            finishing_materials: requiredMaterials.filter((m) =>
              (m.category || '').toLowerCase().includes('finish') || (m.material_name || '').toLowerCase().includes('laminat')
            ),
            additional_consumables: requiredMaterials.filter((m) =>
              !(m.category || '').toLowerCase().includes('finish') && !(m.material_name || '').toLowerCase().includes('laminat') && !m.is_primary
            ),
          },
          default_wastage_percent: defaultWastagePercent,
          total_bom_cost: totalBOMCost,
        },
        finishing: {
          options: finishingOptions,
        },
        addons: {
          additional_options: additionalOptions,
          is_installation_required: isInstallationRequired,
          installation_options: installationOptions,
          is_delivery_required: isDeliveryRequired,
          delivery_options: [],
        },
        costing: {
          breakdown: costBreakdown,
          total_direct_cost: totalDirectCostNum,
        },
        pricing: {
          base_price: sp,
          minimum_charge: minimumCharge !== '' ? Number(minimumCharge) : undefined,
          price_tiers: finalPriceTiers,
          target_margin: Number(targetMargin) || 35.0,
          min_allowed_margin: Number(minAllowedMargin) || 15.0,
        },
        sub_category: subCategory.trim() || undefined,
        print_technology: printTechnology,
        production_method: productionMethod,
        default_department: defaultDepartment,
        trim_allowance_in: Number(trimAllowanceIn) || 0,
        bleed_in: Number(productionBleedInches) || 0,
        nesting_rule: nestingRule,
        ink_profile: selectedInkProfile,
        quantity_calculation_method: quantityCalculationMethod,
        is_installation_required: isInstallationRequired,
        is_delivery_required: isDeliveryRequired,
        dimension_unit: dimensionUnit,
        allow_custom_dimensions: allowCustomDimensions,
        available_widths_ft: purchaseUnit === 'roll' ? availableRollWidths : undefined,
        extra_width_allowance_ft: purchaseUnit === 'roll' ? (extraWidthAllowance !== '' && !isNaN(Number(extraWidthAllowance)) ? Number(extraWidthAllowance) : 0) : undefined,
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
        production_category: serviceType === 'production' ? productionCategory : undefined,
        production_material_id: serviceType === 'production' ? (productionMaterialId || undefined) : undefined,
        production_material_name: serviceType === 'production' ? (availableMaterials.find((m) => m.id === productionMaterialId)?.name || undefined) : undefined,
        structure_frame_type: serviceType === 'production' ? structureFrameType : undefined,
        frame_depth: serviceType === 'production' ? frameDepth : undefined,
        lighting_type: serviceType === 'production' ? lightingType : undefined,
        led_module_material_id: serviceType === 'production' ? (ledModuleMaterialId || undefined) : undefined,
        power_supply_material_id: serviceType === 'production' ? (powerSupplyMaterialId || undefined) : undefined,
        fabrication_method: serviceType === 'production' ? fabricationMethod : undefined,
        installation_category: serviceType === 'installation' ? installationCategory : undefined,
        installation_hardware_id: serviceType === 'installation' ? (installationHardwareId || undefined) : undefined,
        installation_hardware_name: serviceType === 'installation' ? (availableMaterials.find((m) => m.id === installationHardwareId)?.name || undefined) : undefined,
        installation_height_tier: serviceType === 'installation' ? installationHeightTier : undefined,
        installation_crew_size: serviceType === 'installation' ? Number(installationCrewSize) || 2 : undefined,
        safety_equipment_required: serviceType === 'installation' ? safetyEquipmentRequired : undefined,
        delivery_category: serviceType === 'delivery' ? deliveryCategory : undefined,
        delivery_vehicle_type: serviceType === 'delivery' ? deliveryVehicleType : undefined,
        packaging_material_id: serviceType === 'delivery' ? (packagingMaterialId || undefined) : undefined,
        packaging_material_name: serviceType === 'delivery' ? (availableMaterials.find((m) => m.id === packagingMaterialId)?.name || undefined) : undefined,
        delivery_distance_zone: serviceType === 'delivery' ? deliveryDistanceZone : undefined,
        general_category: serviceType === 'general' ? generalCategory : undefined,
        deliverable_format: serviceType === 'general' ? deliverableFormat : undefined,
        turnaround_hours: serviceType === 'general' ? Number(turnaroundHours) || 24 : undefined,
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
        machine_id: selectedMachineId || undefined,
      }
      const selectedFinishingMat = availableMaterials.find((m) => m.id === finishingMaterialId)
      const selectedProductionMat = availableMaterials.find((m) => m.id === productionMaterialId)
      const selectedInstallationHardwareMat = availableMaterials.find((m) => m.id === installationHardwareId)
      const selectedPackagingMat = availableMaterials.find((m) => m.id === packagingMaterialId)
      const selectedFleetMach = machineries.find((m) => m.id === selectedMachineId)

      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `SRV-${Date.now().toString().slice(-5)}`,
        category: category || (serviceType === 'finishing' ? 'finishing_service' : (serviceType === 'production' ? 'production_service' : 'printing_service')),
        sub_category: subCategory.trim() || undefined,
        product_type: serviceType === 'finishing' ? 'finishing' : (serviceType === 'production' ? 'fabrication' : 'print_service'),
        entity_type: serviceType === 'finishing' ? 'finishing' : 'service',
        commercial_type: 'service',
        is_service: true,
        service_type: serviceType,
        print_technology: printTechnology,
        production_method: productionMethod,
        default_department: defaultDepartment,
        trim_allowance_in: Number(trimAllowanceIn) || 0,
        production_bleed_inches: Number(productionBleedInches) || 0,
        nesting_rule: nestingRule,
        ink_profile: selectedInkProfile,
        quantity_calculation_method: quantityCalculationMethod,
        is_installation_required: isInstallationRequired,
        is_delivery_required: isDeliveryRequired,
        machine_id: selectedMachineId || undefined,
        machine_name: selectedFleetMach?.name || undefined,
        machine_code: selectedFleetMach?.code || undefined,
        machine_hourly_rate: Number(machineHourlyRate) || undefined,
        estimated_speed: Number(estimatedSpeed) || undefined,
        speed_unit: speedUnit || undefined,
        print_category: serviceType === 'printing' ? printCategory : undefined,
        finishing_category: serviceType === 'finishing' ? finishingCategory : undefined,
        finishing_material_id: serviceType === 'finishing' ? (finishingMaterialId || undefined) : undefined,
        finishing_material_name: serviceType === 'finishing' ? (selectedFinishingMat?.name || undefined) : undefined,
        finishing_method: serviceType === 'finishing' ? finishingMethod : undefined,
        lamination_micron: serviceType === 'finishing' ? laminationMicron : undefined,
        lamination_type: serviceType === 'finishing' ? laminationType : undefined,
        production_category: serviceType === 'production' ? productionCategory : undefined,
        production_material_id: serviceType === 'production' ? (productionMaterialId || undefined) : undefined,
        production_material_name: serviceType === 'production' ? (selectedProductionMat?.name || undefined) : undefined,
        structure_frame_type: serviceType === 'production' ? structureFrameType : undefined,
        frame_depth: serviceType === 'production' ? frameDepth : undefined,
        lighting_type: serviceType === 'production' ? lightingType : undefined,
        led_module_material_id: serviceType === 'production' ? (ledModuleMaterialId || undefined) : undefined,
        power_supply_material_id: serviceType === 'production' ? (powerSupplyMaterialId || undefined) : undefined,
        fabrication_method: serviceType === 'production' ? fabricationMethod : undefined,
        installation_category: serviceType === 'installation' ? installationCategory : undefined,
        installation_hardware_id: serviceType === 'installation' ? (installationHardwareId || undefined) : undefined,
        installation_hardware_name: serviceType === 'installation' ? (selectedInstallationHardwareMat?.name || undefined) : undefined,
        installation_height_tier: serviceType === 'installation' ? installationHeightTier : undefined,
        installation_crew_size: serviceType === 'installation' ? Number(installationCrewSize) || 2 : undefined,
        safety_equipment_required: serviceType === 'installation' ? safetyEquipmentRequired : undefined,
        delivery_category: serviceType === 'delivery' ? deliveryCategory : undefined,
        delivery_vehicle_type: serviceType === 'delivery' ? deliveryVehicleType : undefined,
        packaging_material_id: serviceType === 'delivery' ? (packagingMaterialId || undefined) : undefined,
        packaging_material_name: serviceType === 'delivery' ? (selectedPackagingMat?.name || undefined) : undefined,
        delivery_distance_zone: serviceType === 'delivery' ? deliveryDistanceZone : undefined,
        general_category: serviceType === 'general' ? generalCategory : undefined,
        deliverable_format: serviceType === 'general' ? deliverableFormat : undefined,
        turnaround_hours: serviceType === 'general' ? Number(turnaroundHours) || 24 : undefined,
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
        production_width_allowance: purchaseUnit === 'roll' ? (extraWidthAllowance !== '' && !isNaN(Number(extraWidthAllowance)) ? Number(extraWidthAllowance) : 0) : undefined,
        production_length_allowance: purchaseUnit === 'roll' ? (extraWidthAllowance !== '' && !isNaN(Number(extraWidthAllowance)) ? Number(extraWidthAllowance) : 0) : undefined,
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
      dispatchToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save service configuration.',
      })
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
      onSubmit={handleSubmit}
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
              <Badge variant="outline" className="text-2xs uppercase font-mono py-0.5 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                {serviceType.toUpperCase()}
              </Badge>
              {sellingUnit && (
                <Badge variant="outline" className="text-2xs uppercase font-mono py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
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
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div>
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
                className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'pricing' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'basic') {
                    if (!name.trim()) {
                      setFieldErrors({ name: 'Service name is required before proceeding.' })
                      dispatchToast({
                        type: 'warning',
                        title: 'Service Name Required',
                        message: 'Service name is required before proceeding.',
                      })
                      return
                    }
                    setFieldErrors({})
                    setActiveTab('materials')
                  }
                  else if (activeTab === 'materials') setActiveTab('finishing')
                  else if (activeTab === 'finishing') setActiveTab('additionals')
                  else if (activeTab === 'additionals') setActiveTab('pricing')
                }}
                className="h-10 px-4 rounded-xl font-bold border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1.5 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            {activeTab === 'pricing' && (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
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
                    'text-2xs px-1 py-0.2 rounded-full font-mono font-bold leading-tight',
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
        {/* STEP 1: BASIC & PRINT CONFIG                             */}
        {/* ======================================================== */}
        {activeTab === 'basic' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            {/* 1.1 Basic Information */}
            <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Basic Information & Classification
                  </h3>
                </div>
                <span className="text-2xs text-slate-400 font-medium">Bilingual naming & 4-level classification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold mb-1 block">
                    Service Name (English) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. UV Vinyl Sticker Printing (High Density), Eco PVC Frontlit Banner Print..."
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    required
                    className={cn(
                      'h-9 text-xs font-medium transition-colors',
                      fieldErrors.name && 'border-rose-500 focus-visible:ring-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                    )}
                    autoFocus
                  />
                  {fieldErrors.name && (
                    <p className="text-2xs text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.name}</span>
                    </p>
                  )}
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
                    Service Code / SKU <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. SRV-UV-VINYL-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Service Type, Category & Sub-category */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Service Type <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={serviceType}
                      onChange={(e) => handleSelectServiceType(e.target.value as any)}
                      className="w-full h-9 text-xs rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 px-2.5 font-bold text-blue-900 dark:text-blue-200"
                    >
                      <option value="printing">🖨️ Printing & Production Service</option>
                      <option value="production">🏗️ Fabrication & Assembly</option>
                      <option value="finishing">✂️ Finishing & Lamination</option>
                      <option value="installation">🔧 Installation & Fitting</option>
                      <option value="delivery">🚚 Delivery & Logistics</option>
                      <option value="general">⚙️ General Service</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold block text-slate-800 dark:text-slate-200">
                        Category <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-2xs text-blue-600 dark:text-blue-400 font-semibold uppercase">
                        {filteredCatalogCategories.length} Options
                      </span>
                    </div>
                    <select
                      value={category === 'large_format_printing' ? 'wide_format_printing' : category}
                      onChange={(e) => handleSelectCategory(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      {filteredCatalogCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.name_bn ? `(${c.name_bn})` : ''}
                        </option>
                      ))}
                      {category && !filteredCatalogCategories.some((c) => c.id === category || (category === 'large_format_printing' && c.id === 'wide_format_printing')) && (
                        <option value={category}>
                          {category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Sub-category (উপ-ক্যাটাগরি)
                    </Label>
                    <Input
                      list="subcat-options"
                      placeholder="e.g. Flex Printing, Rigid UV, Acrylic Letters..."
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <datalist id="subcat-options">
                      {(CATEGORY_SUBCATEGORY_MAP[category] || []).map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Sub-category Clickable Suggestions Pills */}
                {(CATEGORY_SUBCATEGORY_MAP[category] || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-2xs text-slate-400 font-semibold uppercase mr-1">Suggestions:</span>
                    {(CATEGORY_SUBCATEGORY_MAP[category] || []).slice(0, 5).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSubCategory(preset)}
                        className={cn(
                          'px-2 py-0.5 rounded text-2xs font-medium border transition-colors cursor-pointer',
                          subCategory === preset
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* DYNAMIC TECHNICAL CONFIGURATION PANEL (ADAPTS TO SERVICE TYPE)           */}
            {/* ========================================================================= */}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 1: PRINTING & PRODUCTION SERVICE                                     */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'printing' && (
              <>
                {/* 1.2 Print & Production Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-200/60 dark:border-blue-900/60">
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Print & Production Configuration
                      </h4>
                    </div>
                    <span className="text-2xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                      Large Format & Digital Press
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Print Category <span className="text-rose-500">*</span>
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
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_PRINT_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Technology (প্রযুক্তি) <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={printTechnology}
                        onChange={(e) => setPrintTechnology(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {PRINT_TECHNOLOGIES.map((tech) => (
                          <option key={tech} value={tech}>
                            {tech}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Production Method <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={productionMethod}
                        onChange={(e) => setProductionMethod(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {PRODUCTION_METHODS.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Machinery Fleet Pre-selection */}
                  {machineries.length > 0 && (
                    <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-lg border border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-blue-600" />
                          Assigned Machinery Fleet Routing
                        </Label>
                        <span className="text-2xs text-blue-600 dark:text-blue-400 font-medium">Auto-populates speed & machine cost</span>
                      </div>
                      <select
                        value={selectedMachineId}
                        onChange={(e) => handleFleetMachineSelect(e.target.value)}
                        className="w-full h-8 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 font-medium"
                      >
                        <option value="">-- Auto-Match Best Available Machine --</option>
                        {safeMachineries.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.code || 'NO-CODE'}) — {m.category} {m.max_print_width_inches ? `[Max: ${m.max_print_width_inches}"]` : ''} • Rate: ৳{m.hourly_rate_bdt || 0}/hr • Speed: {m.speed_sqft_per_hour || m.speed_sheets_per_hour || 'N/A'} {m.speed_sheets_per_hour ? 'sheets/hr' : 'sqft/hr'}
                          </option>
                        ))}
                      </select>

                      {selectedMachineId && (
                        <div className="flex items-center gap-3 text-2xs text-slate-600 dark:text-slate-400 pt-0.5">
                          <span>Hourly Rate: <strong className="text-slate-900 dark:text-white font-mono">৳{machineHourlyRate || 0}/hr</strong></span>
                          <span>Speed: <strong className="text-blue-600 dark:text-blue-400 font-mono">{estimatedSpeed || 'Auto'} {speedUnit === 'sheet_per_hr' ? 'Sheets/hr' : 'Sqft/hr'}</strong></span>
                          <span>Unit Machine Cost: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">৳{machineCost || 0}/sft</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 1.3 Primary Substrate & Material Info Card */}
                <div className="space-y-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60 dark:border-emerald-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Primary Substrate (Raw Material Isolation)
                      </h4>
                    </div>
                    {printableMaterialId && (
                      <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked (item_type = raw_material)
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Raw Material Substrate <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={printableMaterialId}
                      onChange={(e) => handleSelectPrintableMaterial(e.target.value)}
                      className={cn(
                        'w-full h-9 text-xs rounded-md border px-2.5 font-medium transition-colors',
                        printableMaterialId
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <option value="">-- Select Inventory Raw Material Substrate / Media --</option>
                      {substrateMaterials.map((mat) => {
                        const unitCost = getMaterialCost(mat)
                        const { consumeUnit } = getMaterialUnitDetails(mat)
                        return (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({mat.unit || (mat as any).purchase_unit || 'roll'}) — ৳{unitCost}/{consumeUnit}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* Substrate Details Card */}
                  {selectedMaterialRecord && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-300 dark:border-emerald-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div>
                        <span className="text-2xs text-slate-500 uppercase block font-medium">Material / SKU</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block">{selectedMaterialRecord.name}</span>
                        <span className="text-2xs font-mono text-slate-400">{selectedMaterialRecord.sku}</span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 uppercase block font-medium">Purchase / Stock Unit</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                          {purchaseUnit} / {selectedMaterialRecord.unit || 'roll'}
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 uppercase block font-medium">Roll Widths</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {availableRollWidths.join(', ')} ft
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 uppercase block font-medium">Roll Length</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {standardRollLength} ft
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-500 uppercase block font-medium">Average Cost</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{getMaterialCost(selectedMaterialRecord)} / {getMaterialUnitDetails(selectedMaterialRecord).consumeUnit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 1.4 Dimension Rules & Nesting */}
                <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Dimension Rules & Media Nesting
                      </h4>
                    </div>
                  </div>

                  {/* Supported Roll Widths Pills + Inline Add */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Supported Roll Widths (ফিট প্রস্থ)
                    </Label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {availableRollWidths.map((w) => (
                        <span
                          key={w}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 shadow-2xs"
                        >
                          <span>{w} ft</span>
                          {availableRollWidths.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRollWidth(w)}
                              className="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}

                      <div className="inline-flex items-center gap-1">
                        <Input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="+ Width (ft)"
                          value={newRollWidth}
                          onChange={(e) => setNewRollWidth(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRollWidth())}
                          className="h-7 w-24 text-xs font-mono"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddRollWidth}
                          className="h-7 px-2 text-xs font-bold"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Trim, Bleed, Print Allowance & Nesting Rule */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Trim Allowance (Inches)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={trimAllowanceIn}
                          onChange={(e) => setTrimAllowanceIn(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs font-mono pr-8"
                        />
                        <span className="absolute right-3 top-2 text-2xs font-bold text-slate-400">in</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Production Bleed (Inches)
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
                        <span className="absolute right-3 top-2 text-2xs font-bold text-slate-400">in</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Print Allowance (Feet)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={extraWidthAllowance}
                          onChange={(e) => setExtraWidthAllowance(e.target.value)}
                          className="h-9 text-xs font-mono pr-8"
                        />
                        <span className="absolute right-3 top-2 text-2xs font-bold text-slate-400">ft</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Nesting Rule <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={nestingRule}
                        onChange={(e) => setNestingRule(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {NESTING_RULES.map((rule) => (
                          <option key={rule.value} value={rule.value}>
                            {rule.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1.5 Ink Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200/60 dark:border-indigo-900/60">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Ink Configuration & Chemistry
                      </h4>
                    </div>
                    <span className="text-2xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                      Ink Cost: <strong className="text-indigo-600 dark:text-indigo-400">৳{inkCost || 0}/sft</strong>
                    </span>
                  </div>

                  {/* Quick Ink Profile Selectors */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Ink Technology & Channel Profile
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {INK_PROFILES.map((prof) => {
                        const isSel = selectedInkProfile === prof.id
                        return (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => handleApplyInkProfile(prof.id)}
                            className={cn(
                              'p-2 rounded-lg border text-left text-xs transition-all cursor-pointer',
                              isSel
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                            )}
                          >
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {prof.name.split(' (')[0]}
                            </div>
                            <div className="text-2xs text-slate-500 font-mono mt-0.5">
                              {prof.channels.length} Channels ({prof.channels.map((c) => c.channel[0]).join('')})
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Ink Channels Grid with Distributed ml/sft Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Configured Channels ({selectedInks.length}) & Inventory Links
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleAddInkChannel}
                        className="h-6 px-2 text-2xs text-indigo-600 dark:text-indigo-400"
                      >
                        + Add Custom Channel
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {selectedInks.map((ink, idx) => {
                        const brk = autoCalculatedInkMetrics.channelsBreakdown[idx]
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-full border shrink-0"
                                  style={{ backgroundColor: ink.color_code }}
                                />
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {ink.channel}
                                </span>
                              </div>
                              {selectedInks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInkChannel(idx)}
                                  className="text-slate-400 hover:text-rose-500 text-xs"
                                >
                                  ×
                                </button>
                              )}
                            </div>

                            <select
                              value={ink.material_id || ''}
                              onChange={(e) => handleChannelInkChange(idx, e.target.value)}
                              className="w-full h-7 text-2xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 font-medium"
                            >
                              <option value="">-- Generic ৳{ink.unit_price || 2800}/L --</option>
                              {inkMaterials.map((im) => {
                                const literPrice = Number((im as any).purchase_price || (im as any).cost_per_unit || (im as any).base_cost || 2800)
                                return (
                                  <option key={im.id} value={im.id}>
                                    {im.name} (৳{literPrice}/L)
                                  </option>
                                )
                              })}
                            </select>

                            <div className="flex items-center justify-between text-2xs text-slate-500 font-mono pt-0.5 border-t border-slate-100 dark:border-slate-800">
                              <span>Allocation: <strong>{brk ? brk.allocatedMl : autoCalculatedInkMetrics.perChannelMl} ml</strong></span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">৳{brk ? brk.channelCost.toFixed(3) : 0}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Total Ink Consumption & Per-Channel Equal Distribution Formula Banner */}
                  <div className="p-2.5 bg-indigo-100/50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-900/50 text-2xs text-indigo-950 dark:text-indigo-200 space-y-1">
                    <div className="flex items-center justify-between font-medium">
                      <span>💡 <strong>Ink Channel Consumption Formula:</strong> Total ml/sft divided equally across active channels (Qi = total_ml / {selectedInks.length || 4})</span>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{autoCalculatedInkMetrics.perChannelMl} ml / channel / sft</span>
                    </div>
                    <div className="text-2xs text-indigo-800/80 dark:text-indigo-300/80 font-mono">
                      Formula: {selectedInks.map((c) => `${c.channel} (${autoCalculatedInkMetrics.perChannelMl}ml)`).join(' + ')} = {consumePerUnitMl || 1.2} ml/sft
                    </div>
                  </div>

                  {/* Consumption & Inks Cost Auto-Calculation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Total Ink Consumption (ml/sft) <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={consumePerUnitMl}
                          onChange={(e) => setConsumePerUnitMl(e.target.value)}
                          className="h-9 text-xs font-mono pr-12 font-bold"
                        />
                        <span className="absolute right-3 top-2 text-2xs font-bold text-slate-400">ml/sft</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Calculated Inks Cost (৳/sft)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={inkCost}
                          disabled={autoCalculateInkCost}
                          onChange={(e) => setInkCost(parseFloat(e.target.value) || '')}
                          className={cn(
                            'h-9 text-xs font-mono pr-8 font-bold',
                            autoCalculateInkCost
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800'
                              : 'bg-white dark:bg-slate-900'
                          )}
                        />
                        <span className="absolute right-3 top-2 text-2xs font-bold text-slate-400">৳</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoCalculateInkCost}
                          onChange={(e) => setAutoCalculateInkCost(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Auto-calculate ink cost from channels</span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 2: FABRICATION & ASSEMBLY SERVICE                                    */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'production' && (
              <>
                {/* 1.2 Fabrication & Structural Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/60">
                    <div className="flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Fabrication & Structural Configuration
                      </h4>
                    </div>
                    <span className="text-2xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                      Signage, 3D Letters & Metal Structure
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Fabrication Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={productionCategory}
                        onChange={(e) => setProductionCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value='Signboard & Metal Frame Fabrication'>Signboard & MS Metal Frame</option>
                        <option value='3D Acrylic, SS & Neon Letters'>3D Acrylic, SS & Neon Letters</option>
                        <option value='LED Backlit & Slim Lightboxes'>LED Backlit & Slim Lightbox</option>
                        <option value='CNC Router & Laser Engraving'>CNC Router & Laser Cutting</option>
                        <option value='POS Displays, Kiosks & Gondolas'>POS Displays, Kiosks & Racks</option>
                        <option value='Event Staging & Truss Structures'>Event Staging & Truss</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Structural Framework Method <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={structureFrameType}
                        onChange={(e) => setStructureFrameType(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value='1" MS Square Box Pipe (20 gauge)'>1" MS Square Box Pipe (20 gauge)</option>
                        <option value='1.5" Heavy MS Angle Steel'>1.5" Heavy MS Angle Steel Frame</option>
                        <option value='ACP Sheet Grooved Cladding'>ACP Sheet Grooved Paneling</option>
                        <option value='Aluminum Extrusion Profile Frame'>Aluminum Slim Extrusion Profile</option>
                        <option value='Wooden / Timber Stage Frame'>Wooden / Timber Frame</option>
                        <option value='Solid Acrylic 3mm-10mm Crystal'>Solid Acrylic 3mm-10mm CNC Cut</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Frame Depth / Return (ইঞ্চি) <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={frameDepth}
                        onChange={(e) => setFrameDepth(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Flat (2D)">Flat (2D Cutout)</option>
                        <option value="1 inch">1 inch (Slim Profile)</option>
                        <option value="2 inch">2 inch (Standard Letter / Box)</option>
                        <option value="3 inch">3 inch (Deep Return)</option>
                        <option value="4 inch">4 inch (Standard Lightbox)</option>
                        <option value="6 inch">6 inch (Double Sided Box)</option>
                        <option value="8 inch">8 inch (Heavy Signboard)</option>
                        <option value="12 inch">12 inch (Large Pylon / Kiosk)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Lighting & Electrical <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={lightingType}
                        onChange={(e) => setLightingType(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="none">Non-Lit (No Illumination)</option>
                        <option value="backlit_led">Backlit Samsung LED Modules (1.5W)</option>
                        <option value="frontlit_edge">Frontlit / Edge LED Strip</option>
                        <option value="neon_silicone">12V Flexible Silicone Neon</option>
                        <option value="floodlight">High-Power 50W/100W Floodlight</option>
                      </select>
                    </div>
                  </div>

                  {/* Workshop Machinery & Equipment Pre-selection */}
                  {machineries.length > 0 && (
                    <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-lg border border-amber-200/80 dark:border-amber-900/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-amber-600" />
                          Assigned Workshop Machinery (CNC / Laser / Welding)
                        </Label>
                        <span className="text-2xs text-amber-700 dark:text-amber-300 font-medium">Auto-populates hourly rate & tool cost</span>
                      </div>
                      <select
                        value={selectedMachineId}
                        onChange={(e) => handleFleetMachineSelect(e.target.value)}
                        className="w-full h-8 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 font-medium"
                      >
                        <option value="">-- Auto-Match Workshop Equipment --</option>
                        {safeMachineries.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.code || 'NO-CODE'}) — {m.category} • Rate: ৳{m.hourly_rate_bdt || 0}/hr
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 1.3 Primary Structural Material (Raw Material Isolation) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Primary Structural Raw Material (Pipe / Sheet / Acrylic)
                      </h4>
                    </div>
                    {productionMaterialId && (
                      <span className="text-2xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Structural Material <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={productionMaterialId}
                      onChange={(e) => handleSelectProductionMaterial(e.target.value)}
                      className={cn(
                        'w-full h-9 text-xs rounded-md border px-2.5 font-medium transition-colors',
                        productionMaterialId
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <option value="">-- Select Structural Material (MS Pipe, SS Sheet, Acrylic, ACP) --</option>
                      {productionMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || 'sheet/pc'}) — ৳{getMaterialCost(mat)}/{mat.unit || 'unit'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 1.4 Structural Dimensions & Wastage Rules */}
                <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Structural Dimensions & Fabrication Rules
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Fabrication Method <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={fabricationMethod}
                        onChange={(e) => setFabricationMethod(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Welding & Metal Assembly">Welding & Metal Assembly</option>
                        <option value="Laser Cutting & Acrylic Bending">Laser Cutting & Acrylic Bending</option>
                        <option value="CNC Router 3D Grooving">CNC Router 3D Grooving</option>
                        <option value="Modular Profile Screwing">Modular Profile Screwing</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Cutting & Scrap Wastage (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={defaultWastagePercent}
                        onChange={(e) => setDefaultWastagePercent(parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Minimum Job Charge (BDT)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={minimumCharge}
                        onChange={(e) => setMinimumCharge(parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 3: FINISHING & LAMINATION SERVICE                                    */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'finishing' && (
              <>
                {/* 1.2 Post-Press Finishing & Surface Treatment Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60 dark:border-rose-900/60">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Post-Press Finishing & Surface Treatment Configuration
                      </h4>
                    </div>
                    <span className="text-2xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-900/40 px-2 py-0.5 rounded">
                      Lamination, Binding & Post-Press
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Finishing Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={finishingCategory}
                        onChange={(e) => setFinishingCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Thermal Film Lamination (BOPP/PET)">Thermal Film Lamination</option>
                        <option value="Cold Pressure Sensitive Lamination">Cold Pressure Lamination</option>
                        <option value="Floor Anti-Slip & Heavy Overlaminate">Floor Anti-Slip Overlaminate</option>
                        <option value="Rigid Board Mounting & Pasting">Rigid Board Mounting / Pasting</option>
                        <option value="Eyelets & Brass Grommets">Eyelets & Brass Grommets</option>
                        <option value="Edge Hemming & Pocket Seaming">Edge Hemming & Pocket Seam</option>
                        <option value="Die-Cutting, Kiss-Cut & Creasing">Die-Cutting & Kiss-Cut</option>
                        <option value="Book Binding, Spiral & Stitching">Book Binding & Spiral</option>
                        <option value="Spot UV Varnish & Foil Stamping">Spot UV & Foil Stamping</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Application Method <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={finishingMethod}
                        onChange={(e) => setFinishingMethod(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Gloss Thermal Lamination">Gloss Thermal Lamination</option>
                        <option value="Matte Thermal Lamination">Matte Thermal Lamination</option>
                        <option value="Cold Film Lamination">Cold Roll Lamination</option>
                        <option value="PVC Foam Sunboard Pasting">Foam Board Flatbed Pasting</option>
                        <option value="Automatic Brass Eyeletting">Automatic Eyelet Press</option>
                        <option value="Hot Air Seaming with Rope">Hot Air Seaming with Rope</option>
                        <option value="Flatbed Plotter Kiss-Cut">Flatbed Plotter Kiss-Cut</option>
                        <option value="Wire-O Spiral Binding">Wire-O Spiral Binding</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Micron / Grade Spec <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. 32 Micron / 80 Micron / 3mm Board"
                        value={laminationMicron}
                        onChange={(e) => setLaminationMicron(e.target.value)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1.3 Primary Finishing Consumable (Raw Material Isolation) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60 dark:border-rose-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Primary Finishing Film / Consumable (Raw Material Isolation)
                      </h4>
                    </div>
                    {finishingMaterialId && (
                      <span className="text-2xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Finishing Consumable <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={finishingMaterialId}
                      onChange={(e) => handleSelectFinishingMaterial(e.target.value)}
                      className={cn(
                        'w-full h-9 text-xs rounded-md border px-2.5 font-medium transition-colors',
                        finishingMaterialId
                          ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <option value="">-- Select Finishing Raw Material (Thermal Film, Cold Lam, Eyelets, Sunboard) --</option>
                      {finishingMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || 'unit'}) — ৳{getMaterialCost(mat)}/{getMaterialUnitDetails(mat).consumeUnit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 4: INSTALLATION & FITTING SERVICE                                    */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'installation' && (
              <>
                {/* 1.2 Site Installation & Field Operations Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/60 dark:border-teal-900/60">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Site Installation & Field Operations Configuration
                      </h4>
                    </div>
                    <span className="text-2xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-900/40 px-2 py-0.5 rounded">
                      Pasting, Fitting & Site Mounting
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Installation Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={installationCategory}
                        onChange={(e) => setInstallationCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Indoor Wall & Glass Sticker Pasting">Wall & Glass Sticker Pasting</option>
                        <option value="Rooftop Billboard & Highway Unipole Erection">Rooftop Billboard Erection</option>
                        <option value="Shopfront Fascia & Building Sign Installation">Shopfront Sign Fitting</option>
                        <option value="Commercial Vehicle Full Body Branding & Wrap">Vehicle Branding & Wrap</option>
                        <option value="Exhibition Fair Stall & Stage Fitting">Exhibition Stall & Stage</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Height & Access Tier <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={installationHeightTier}
                        onChange={(e) => setInstallationHeightTier(e.target.value as any)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="ground">Ground Level (0-10 ft)</option>
                        <option value="mid">Mid Elevation (10-20 ft with Ladder)</option>
                        <option value="high">High Elevation (20-50 ft with Scaffolding)</option>
                        <option value="extreme">Extreme Height (50ft+ Crane / Spider Rope)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Standard Crew Size <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={installationCrewSize}
                        onChange={(e) => setInstallationCrewSize(parseInt(e.target.value) || 2)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value={1}>1 Technician (Solo Pasting)</option>
                        <option value={2}>2 Technicians (Standard Pair)</option>
                        <option value={3}>3 Technicians (Sign Fitting)</option>
                        <option value={4}>4 Technicians (Heavy Frame)</option>
                        <option value={6}>6+ Crew (Billboard / Crane Team)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1.3 Fasteners, Anchors & Adhesives (Raw Material Isolation) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/60 dark:border-teal-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Fasteners, Anchors & Adhesives (Raw Material Isolation)
                      </h4>
                    </div>
                    {installationHardwareId && (
                      <span className="text-2xs text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Fastener / Mounting Material
                    </Label>
                    <select
                      value={installationHardwareId}
                      onChange={(e) => handleSelectInstallationHardware(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      <option value="">-- Select Fasteners / Silicone / Tape (Optional) --</option>
                      {installationHardwareMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || 'pcs'}) — ৳{getMaterialCost(mat)}/{mat.unit || 'unit'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 5: DELIVERY & LOGISTICS SERVICE                                      */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'delivery' && (
              <>
                {/* 1.2 Logistics, Packaging & Transport Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-sky-200/60 dark:border-sky-900/60">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Logistics, Packaging & Transport Configuration
                      </h4>
                    </div>
                    <span className="text-2xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/60 dark:bg-sky-900/40 px-2 py-0.5 rounded">
                      Courier, Van & Freight Dispatch
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Logistics Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={deliveryCategory}
                        onChange={(e) => setDeliveryCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Local City Van / Bike Delivery">City Local Delivery</option>
                        <option value="Inter-District Courier & Truck Freight">Inter-District Freight</option>
                        <option value="Express Urgent Delivery">Express Urgent Jet</option>
                        <option value="Packaging & Crate Boxing">Packaging & Crating</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Vehicle / Transport Mode <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={deliveryVehicleType}
                        onChange={(e) => setDeliveryVehicleType(e.target.value as any)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="motorbike">Motorbike (Small Parcels & Documents)</option>
                        <option value="cng">CNG / Easy Bike (Medium Rolls & Boards)</option>
                        <option value="pickup_van">1-Ton Pickup Van / Tata Ace (Banners & Signs)</option>
                        <option value="covered_truck">Covered Van / Truck (Nationwide Bulk)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Distance Zone <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={deliveryDistanceZone}
                        onChange={(e) => setDeliveryDistanceZone(e.target.value as any)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="inside_city">Inside Dhaka Metro</option>
                        <option value="suburbs">Greater Suburbs (Gazipur / Narayanganj / Savar)</option>
                        <option value="nationwide">Inter-District / Nationwide Hub</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1.3 Primary Packaging Consumable (Raw Material Isolation) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-sky-200/60 dark:border-sky-900/60">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Packaging Consumables (Bubble Wrap / Carton / Stretch Film)
                      </h4>
                    </div>
                    {packagingMaterialId && (
                      <span className="text-2xs text-sky-700 dark:text-sky-300 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Inventory Linked
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Primary Packaging Material
                    </Label>
                    <select
                      value={packagingMaterialId}
                      onChange={(e) => handleSelectPackagingMaterial(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      <option value="">-- Select Packaging Raw Material (Optional) --</option>
                      {packagingMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || 'pcs'}) — ৳{getMaterialCost(mat)}/{mat.unit || 'unit'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------------- */}
            {/* CASE 6: GENERAL & CREATIVE SERVICE                                        */}
            {/* ------------------------------------------------------------------------- */}
            {serviceType === 'general' && (
              <>
                {/* 1.2 Creative Design & Technical Service Configuration */}
                <div className="space-y-3 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-purple-200/60 dark:border-purple-900/60">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Creative Design & Technical Service Configuration
                      </h4>
                    </div>
                    <span className="text-2xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-900/40 px-2 py-0.5 rounded">
                      Graphic Design, Survey & Maintenance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Service Category <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={generalCategory}
                        onChange={(e) => setGeneralCategory(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="Graphic Design & Pre-Press Color Separation">Graphic Design & Pre-Press</option>
                        <option value="Site Measurement & Laser Survey">Site Laser Survey</option>
                        <option value="Signboard Maintenance & LED Repair">Maintenance & LED Repair</option>
                        <option value="Custom CNC / Laser Job Work">Custom Job Work</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Deliverable Format <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={deliverableFormat}
                        onChange={(e) => setDeliverableFormat(e.target.value as any)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        <option value="vector_ai_pdf">Vector File (AI / EPS / PDF)</option>
                        <option value="raster_tiff_psd">High-Res Print TIFF / PSD</option>
                        <option value="site_survey_report">Physical Site Survey Report</option>
                        <option value="onsite_maintenance">On-site Maintenance Service</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Turnaround Time (Hours) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={turnaroundHours}
                        onChange={(e) => setTurnaroundHours(parseInt(e.target.value) || 24)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Default Department <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={defaultDepartment}
                        onChange={(e) => setDefaultDepartment(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {DEFAULT_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}


            {/* 1.6 Commercial Billing & Scope */}
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Commercial Billing & Scope
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                    Quantity Calculation Method <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={quantityCalculationMethod}
                    onChange={(e) => setQuantityCalculationMethod(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    {QUANTITY_CALCULATION_METHODS.map((q) => (
                      <option key={q.value} value={q.value}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Minimum Billable Qty Floor
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
                    <span className="absolute right-3 top-2 text-2xs font-bold text-slate-400 uppercase">
                      {sellingUnit}
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Minimum Job Charge (৳)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={minimumCharge}
                      onChange={(e) => setMinimumCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-9 text-xs font-mono pl-7"
                    />
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
            </div>

            {/* Step 1 Footer Actions */}
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
                className="h-8 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 gap-1 cursor-pointer"
              >
                <span>Next: Additional BOM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CONNECTED RAW MATERIALS & BILL OF MATERIALS (BOM)  */}
        {/* ======================================================== */}
        {activeTab === 'materials' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            {/* Header with Title and Summary Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Raw Materials & Bill of Materials (BOM) — কাঁচামাল ও রেসিপি কাঠামো
                  </h3>
                  <p className="text-2xs text-slate-500 dark:text-slate-400">
                    Connect substrate media, rigid sheets, inks, structural metals & hardware to build the production recipe.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-2xs font-mono uppercase bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                  {requiredMaterials.length} In Recipe
                </Badge>
                <Badge className="bg-emerald-600 text-white text-2xs font-mono py-0.5">
                  BOM Direct Cost: ৳{totalBOMCost.toFixed(2)} / {sellingUnit || 'sft'}
                </Badge>
              </div>
            </div>

            {/* Section 1: Interactive Configured Bill of Materials (BOM) Table */}
            {requiredMaterials.length > 0 && (
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                      Configured BOM Recipe Components ({requiredMaterials.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSyncBOMToDirectCost}
                      className="h-7 text-2xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1 shadow-2xs cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Sync BOM Total (৳{totalBOMCost.toFixed(2)}) to Media Cost</span>
                    </Button>
                  </div>
                </div>

                {/* BOM Table */}
                <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-amber-100 dark:border-slate-800 bg-amber-50/60 dark:bg-slate-800/50 text-2xs uppercase font-bold text-slate-600 dark:text-slate-400">
                        <th className="py-2 px-2 text-center w-10">Primary</th>
                        <th className="py-2 px-3">Raw Material / Substrate</th>
                        <th className="py-2 px-2 w-28">Qty / {sellingUnit || 'Unit'}</th>
                        <th className="py-2 px-2 w-28">Material Unit</th>
                        <th className="py-2 px-2 w-28">Unit Cost (৳)</th>
                        <th className="py-2 px-2 w-20">Wastage %</th>
                        <th className="py-2 px-3 text-right w-28">Subtotal (৳)</th>
                        <th className="py-2 px-2 text-center w-10">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {requiredMaterials.map((item, idx) => {
                        const isPrimary = Boolean(item.is_primary)
                        const qty = Number(item.quantity_per_unit ?? item.quantity_required) || 1
                        const cost = Number(item.unit_cost) || 0
                        const waste = Number(item.waste_percent) || 0
                        const lineSubtotal = item.subtotal_cost !== undefined ? item.subtotal_cost : (qty * cost * (1 + waste / 100))

                        return (
                          <tr
                            key={item.id || idx}
                            className={cn(
                              'hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
                              isPrimary && 'bg-amber-50/30 dark:bg-amber-950/20 font-medium'
                            )}
                          >
                            {/* Primary Toggle */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryMaterial(idx)}
                                title={isPrimary ? 'Primary Base Substrate' : 'Click to set as Primary Substrate'}
                                className={cn(
                                  'p-1 rounded-md transition-colors cursor-pointer',
                                  isPrimary
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-slate-300 hover:text-amber-400'
                                )}
                              >
                                <Star className={cn('w-4 h-4', isPrimary && 'fill-amber-500')} />
                              </button>
                            </td>

                            {/* Material Name & SKU */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {item.material_name}
                                </span>
                                {item.sku && (
                                  <span className="text-2xs text-slate-400 font-mono">
                                    [{item.sku}]
                                  </span>
                                )}
                                {isPrimary && (
                                  <Badge className="bg-amber-500 text-white text-2xs px-1.5 py-0">
                                    Primary Base
                                  </Badge>
                                )}
                              </div>
                            </td>

                            {/* Quantity Input */}
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                step="any"
                                min="0.0001"
                                value={item.quantity_per_unit ?? 1}
                                onChange={(e) => handleUpdateBOMItem(idx, 'quantity_per_unit', parseFloat(e.target.value) || 0)}
                                className="h-7 text-xs font-mono font-bold px-1.5 text-center"
                              />
                            </td>

                            {/* Material Unit (Editable Dropdown) */}
                            <td className="py-2 px-2">
                              <select
                                value={item.unit || 'sft'}
                                onChange={(e) => handleUpdateBOMItem(idx, 'unit', e.target.value)}
                                className="h-7 w-full text-2xs font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 uppercase cursor-pointer"
                              >
                                {COMMON_BOM_UNITS.map((u) => (
                                  <option key={u.value} value={u.value}>
                                    {u.label}
                                  </option>
                                ))}
                                {item.unit && !COMMON_BOM_UNITS.some((u) => u.value.toLowerCase() === item.unit?.toLowerCase()) && (
                                  <option value={item.unit}>
                                    {item.unit}
                                  </option>
                                )}
                              </select>
                            </td>

                            {/* Unit Cost */}
                            <td className="py-2 px-2">
                              <div className="relative">
                                <span className="absolute left-1.5 top-1.5 text-2xs text-slate-400">৳</span>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.unit_cost ?? 0}
                                  onChange={(e) => handleUpdateBOMItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs font-mono pl-4 pr-1 text-right"
                                />
                              </div>
                            </td>

                            {/* Wastage % */}
                            <td className="py-2 px-2">
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max="50"
                                  value={item.waste_percent ?? 5}
                                  onChange={(e) => handleUpdateBOMItem(idx, 'waste_percent', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs font-mono pr-4 text-center"
                                />
                                <span className="absolute right-1.5 top-1.5 text-2xs text-slate-400 font-bold">%</span>
                              </div>
                            </td>

                            {/* Subtotal Contribution */}
                            <td className="py-2 px-3 text-right">
                              <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                                ৳{Number(lineSubtotal).toFixed(2)}
                              </span>
                            </td>

                            {/* Remove Action */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveBOMItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                                title="Remove component"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-amber-200 dark:border-slate-700 bg-amber-50/80 dark:bg-slate-800/80 font-bold text-xs">
                        <td colSpan={6} className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                          Total Direct Material BOM Cost (per {sellingUnit || 'sft'}):
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-emerald-700 dark:text-emerald-300">
                          ৳{totalBOMCost.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Section 2: Multi-Category Raw Material Explorer & Quick Filters */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Raw Materials Inventory Catalog (কাঁচামাল ক্যাটালগ ব্রাউজার)
                </Label>
                <span className="text-2xs text-slate-500 font-medium">
                  {filteredMaterials.length} materials matching filter
                </span>
              </div>

              {/* 9-Pill Category Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {MATERIAL_FILTER_TABS.map((tab) => {
                  const isSelected = materialCategoryFilter === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMaterialCategoryFilter(tab.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-2xs font-bold border transition-all cursor-pointer flex items-center gap-1',
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      )}
                    >
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Search Bar & Default Wastage Buffer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search raw materials by name, SKU or category (e.g. Vinyl, Backlit, Acrylic, MS Pipe, SMPS, Foam...)"
                    value={materialSearchQuery}
                    onChange={(e) => setMaterialSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Default Wastage:
                  </Label>
                  <div className="relative w-full">
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={defaultWastagePercent}
                      onChange={(e) => setDefaultWastagePercent(parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs font-mono font-bold pr-8 bg-white dark:bg-slate-900"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Material Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredMaterials.length === 0 ? (
                  <div className="sm:col-span-3 py-10 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No matching raw materials found in this category.
                  </div>
                ) : (
                  filteredMaterials.map((mat) => {
                    const reqItem = requiredMaterials.find((m) => m.material_id === mat.id)
                    const isSelected = Boolean(reqItem)
                    const isPrimary = Boolean(reqItem?.is_primary)
                    const { stockUnit, consumeUnit, costVal, rateDisplay, stockSubtitle } = getMaterialUnitDetails(mat)

                    return (
                      <div
                        key={mat.id}
                        className={cn(
                          'p-3 rounded-xl border text-xs transition-all flex flex-col justify-between gap-2',
                          isSelected
                            ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {mat.name}
                            </span>
                            <Badge variant="outline" className="text-2xs uppercase px-1 py-0 font-mono shrink-0">
                              {mat.category || 'material'}
                            </Badge>
                          </div>

                          {(mat as any).name_bn && (
                            <span className="text-2xs text-slate-500 font-bengali block">
                              {(mat as any).name_bn}
                            </span>
                          )}

                          <span className="text-2xs text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                            {mat.sku} • {stockSubtitle}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-2xs font-mono font-bold text-amber-700 dark:text-amber-300">
                            {rateDisplay}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleMaterial(mat)}
                            className={cn(
                              'px-2 py-1 rounded text-2xs font-bold transition-all flex items-center gap-1 cursor-pointer',
                              isSelected
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200'
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>{isPrimary ? 'Primary In BOM' : 'In BOM'}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Add to BOM</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Bottom Nav */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-2xs text-slate-500 font-medium">
                {requiredMaterials.length > 0 ? `✓ ${requiredMaterials.length} raw materials connected to this service recipe.` : 'Select raw materials from the catalog above.'}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('finishing')}
                className="h-8 text-xs font-bold border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 gap-1"
              >
                <span>Next: Finishing Operations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
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
                  <p className="text-2xs text-slate-500 dark:text-slate-400">
                    Select raw materials from inventory (Raw Product — Finishing) or add custom finishing operations.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-2xs font-mono uppercase bg-purple-50 text-purple-700 border-purple-200">
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
                        'px-2 py-1 rounded text-2xs font-bold border transition-colors cursor-pointer',
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
                        'px-2 py-1 rounded text-2xs font-bold border transition-colors cursor-pointer',
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
                      const { stockUnit, consumeUnit, costVal, rateDisplay, stockSubtitle } = getMaterialUnitDetails(mat)
                      const rawSellVal = Number((mat as any).selling_price || (mat as any).price || (mat as any).material_config?.selling_price || (mat as any).price_tiers?.retail || 0)
                      const sellVal = rawSellVal > 0 ? rawSellVal : 0

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
                              <Badge variant="outline" className="text-2xs uppercase px-1 py-0 font-mono shrink-0">
                                {mat.category || 'material'}
                              </Badge>
                            </div>
                            <span className="text-2xs text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                              {mat.sku} • {stockSubtitle}{sellVal > 0 ? ` • Sell: ৳${sellVal}/${consumeUnit}` : ''}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                            <div className="flex items-center gap-1.5 font-mono text-2xs font-bold">
                              <span className="text-purple-700 dark:text-purple-300">
                                {costVal > 0 ? `Cost: ৳${costVal}/${consumeUnit}` : 'Raw Item'}
                              </span>
                              {sellVal > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 text-2xs">
                                  • Sell: ৳{sellVal}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleFinishingRawMaterial(mat)}
                              className={cn(
                                'px-2 py-1 rounded text-2xs font-bold transition-all flex items-center gap-1 cursor-pointer',
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
                    <span className="text-2xs text-slate-500">
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
                              <Badge variant="outline" className="text-2xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                                🔗 {opt.material_name}
                              </Badge>
                            )}
                            {opt.unit && (
                              <Badge variant="outline" className="text-2xs bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                                Unit: {opt.unit}
                              </Badge>
                            )}
                            {opt.is_default && (
                              <Badge className="bg-emerald-600 text-white text-2xs px-1.5 py-0">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <div>
                            <Label className="text-2xs text-slate-500 block mb-0.5">Method</Label>
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
                            <Label className="text-2xs text-slate-500 block mb-0.5">Selling Price (৳)</Label>
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
                            <Label className="text-2xs text-slate-500 block mb-0.5">Unit Cost (৳)</Label>
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

                          <label className="flex items-center gap-1 text-2xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-3">
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

              {/* Section D: Custom Finishing Form */}
              <div className="pt-2">
                {showCustomFinishingForm ? (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
                      Add Custom Finishing Option
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                      <div className="sm:col-span-2">
                        <Label className="text-2xs mb-1 block">Finishing Name <span className="text-rose-500">*</span></Label>
                        <Input
                          placeholder="e.g. 5mm Sunboard Mounting, Spot Foil..."
                          value={customFinishingName}
                          onChange={(e) => setCustomFinishingName(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="text-2xs mb-1 block">Link Raw Inventory Item (Optional)</Label>
                        <select
                          value={customFinishingMaterialId}
                          onChange={(e) => {
                            const matId = e.target.value
                            setCustomFinishingMaterialId(matId)
                            if (matId) {
                              const mat = availableMaterials.find((m) => m.id === matId)
                              if (mat) {
                                if (!customFinishingName) setCustomFinishingName(mat.name)
                                const { consumeUnit, costVal, isFastener, isInk } = getMaterialUnitDetails(mat)
                                const c = costVal
                                const rawSp = Number((mat as any).selling_price ?? (mat as any).price ?? (mat as any).material_config?.selling_price ?? (mat as any).price_tiers?.retail ?? 0)
                                let sp = c
                                if (rawSp > 0) {
                                  if (isFastener && consumeUnit === 'pcs' && rawSp >= 50) {
                                    sp = parseFloat((rawSp / 1000).toFixed(4))
                                  } else if (isInk && consumeUnit === 'ml' && rawSp >= 50) {
                                    sp = parseFloat((rawSp / 1000).toFixed(4))
                                  } else {
                                    sp = rawSp
                                  }
                                }
                                setCustomFinishingCost(c > 0 ? c : '')
                                setCustomFinishingPrice(sp > 0 ? sp : (c > 0 ? c : ''))

                                const pUnit = (mat.unit || (mat as any).purchase_unit || (mat as any).selling_unit || '').toLowerCase()
                                const explicitMethod = ((mat as any).pricing_method || (mat as any).material_config?.pricing_method || '').toLowerCase()
                                if (
                                  explicitMethod === 'per_rft' ||
                                  explicitMethod === 'rft' ||
                                  explicitMethod === 'per_linear_ft' ||
                                  explicitMethod === 'per_length'
                                ) {
                                  setCustomFinishingMethod('per_rft')
                                } else if (
                                  explicitMethod === 'per_piece' ||
                                  explicitMethod === 'piece' ||
                                  explicitMethod === 'pcs' ||
                                  explicitMethod === 'per_unit'
                                ) {
                                  setCustomFinishingMethod('per_piece')
                                } else if (
                                  explicitMethod === 'per_sqft' ||
                                  explicitMethod === 'sqft' ||
                                  explicitMethod === 'sft'
                                ) {
                                  setCustomFinishingMethod('per_sqft')
                                } else if (pUnit === 'meter' || pUnit === 'rft' || pUnit === 'linear_ft' || pUnit === 'inch') {
                                  setCustomFinishingMethod('per_rft')
                                } else if (isFastener || consumeUnit === 'pcs' || pUnit === 'piece' || pUnit === 'pcs' || pUnit === 'box' || pUnit === 'pack' || pUnit === 'sheet' || pUnit === 'unit' || pUnit === 'set' || pUnit === 'item') {
                                  setCustomFinishingMethod('per_piece')
                                } else if (pUnit === 'job' || pUnit === 'fixed') {
                                  setCustomFinishingMethod('fixed')
                                } else if (pUnit === 'sft' || pUnit === 'sqft' || pUnit === 'sqm') {
                                  setCustomFinishingMethod('per_sqft')
                                }
                              }
                            }
                          }}
                          className="w-full h-8 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                        >
                          <option value="">-- Optional: Link Raw Material --</option>
                          {safeAvailableMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-2xs mb-1 block">Pricing Method</Label>
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
                        <Label className="text-2xs mb-1 block">Selling Price (৳)</Label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={customFinishingPrice}
                          onChange={(e) => setCustomFinishingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <Label className="text-2xs mb-1 block">Unit Cost (৳)</Label>
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
              <Badge variant="outline" className="text-2xs font-mono uppercase bg-teal-50 text-teal-700 border-teal-200">
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
                    { id: 'a-1', name: 'X-Stand Hardware', name_bn: 'এক্স-স্ট্যান্ড হার্ডওয়্যার', pricing_method: 'per_piece', selling_price: 350, cost: 220, type: 'addon' },
                    { id: 'a-2', name: 'Roll-up Banner Stand', name_bn: 'রোল-আপ ব্যানার স্ট্যান্ড', pricing_method: 'per_piece', selling_price: 850, cost: 550, type: 'addon' },
                    { id: 'i-1', name: 'Glass Wall Pasting', name_bn: 'গ্লাস স্টিকার পেস্টিং', pricing_method: 'per_sqft', selling_price: 15, cost: 8, type: 'install' },
                    { id: 'i-2', name: 'Rooftop Billboard Erection', name_bn: 'বিলবোর্ড স্থাপন ফিটিং', pricing_method: 'per_job', selling_price: 2500, cost: 1200, type: 'install' },
                    { id: 'i-3', name: 'Shop Front Signboard Fitting', name_bn: 'দোকান সাইনবোর্ড ফিটিং', pricing_method: 'per_sqft', selling_price: 25, cost: 12, type: 'install' },
                    { id: 'a-3', name: 'Dhaka City Transport Delivery', name_bn: 'সিটি ডেলিভারি পরিবহন', pricing_method: 'fixed', selling_price: 300, cost: 150, type: 'addon' },
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
                          <span className="text-2xs text-slate-500 font-mono">
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
              <Badge variant="outline" className="text-2xs font-mono uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
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
                      if (fieldErrors.sellingPrice) setFieldErrors((prev) => ({ ...prev, sellingPrice: '' }))
                    }}
                    required
                    className={cn(
                      'h-9 text-xs font-mono font-bold pl-7 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 transition-colors',
                      fieldErrors.sellingPrice && 'border-rose-500 focus-visible:ring-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                    )}
                  />
                </div>
                {fieldErrors.sellingPrice && (
                  <p className="text-2xs text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.sellingPrice}</span>
                  </p>
                )}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-blue-200/60 dark:border-blue-800/60 gap-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                      Direct Unit Cost Breakdown (9 Cost Heads)
                    </span>
                    <span className="text-2xs text-slate-500">
                      Material BOM, ink chemistry, machinery & labor contributions
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAutoCalculateAllDirectCosts}
                    className="h-7 text-2xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-Calculate Direct Costs from BOM</span>
                  </Button>

                  <span className="text-2xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-blue-200 shadow-2xs">
                    Total: ৳{totalDirectCost.toFixed(2)} / {sellingUnit || 'sft'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {/* 1. Substrate Material */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    1. Media Material
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    2. Ink Cost
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    3. Machine & Power
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    4. Operator Labor
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    5. Finishing
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    6. Fabrication
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    7. Installation
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    8. Delivery
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
                  <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                    9. Other Direct
                  </Label>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-2xs text-slate-400">৳</span>
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
            <div className={cn(
              "p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-colors",
              marginMetrics.grossMarginPercent < 0
                ? "border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30"
                : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
            )}>
              <div className="flex items-center gap-3">
                {marginMetrics.grossMarginPercent < 0 ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className={cn(
                    "font-bold block",
                    marginMetrics.grossMarginPercent < 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-900 dark:text-white"
                  )}>
                    Gross Profit Margin: {marginMetrics.grossMarginPercent.toFixed(1)}%
                    {marginMetrics.grossMarginPercent < 0 && (
                      <span className="ml-2 text-2xs px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold uppercase">
                        Selling at a Loss
                      </span>
                    )}
                  </span>
                  <span className="text-2xs text-slate-600 dark:text-slate-400 font-mono">
                    Unit Profit: ৳{(marginMetrics.grossProfit).toFixed(2)} / {sellingUnit || 'sft'} (Cost: ৳{totalDirectCost.toFixed(2)} | Sell: ৳{Number(sellingPrice || 0).toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {totalDirectCost > 0 && Number(sellingPrice || 0) <= totalDirectCost && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const margin = (targetMargin && targetMargin > 0) ? targetMargin : 35
                      const suggested = Math.ceil(totalDirectCost * (1 + margin / 100))
                      setSellingPrice(suggested)
                      handleAutoFillTiers('standard')
                    }}
                    className="h-8 text-xs font-bold border-rose-300 text-rose-800 dark:text-rose-200 bg-rose-100/60 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 cursor-pointer"
                  >
                    ⚡ Fix Base Rate to ৳{Math.ceil(totalDirectCost * (1 + (targetMargin || 35) / 100))} ({targetMargin || 35}% Margin)
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoFillTiers('standard')}
                  className="h-8 text-xs font-bold border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  Auto-Fill Price Tiers (15% Wholesale)
                </Button>
              </div>
            </div>

            {/* Multi-Tier Pricing Fields with Cost Floor Indicator & Warnings */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Customer Category Price Tiers (৳ / {sellingUnit || 'sft'}):
                </Label>
                {totalDirectCost > 0 && (
                  <span className="text-2xs text-slate-500 font-medium">
                    Break-Even Floor: <strong className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">≥ ৳{totalDirectCost.toFixed(2)}</strong> (Prevents Selling at a Loss)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-2xs">Retail (খুচরা)</Label>
                    {priceTiers.retail !== '' && Number(priceTiers.retail) < totalDirectCost && totalDirectCost > 0 && (
                      <span className="text-2xs font-bold text-rose-600 dark:text-rose-400">Below Cost</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={priceTiers.retail}
                    onChange={(e) => setPriceTiers({ ...priceTiers, retail: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className={`h-8 text-xs font-mono ${
                      priceTiers.retail !== '' && Number(priceTiers.retail) < totalDirectCost && totalDirectCost > 0
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-bold'
                        : ''
                    }`}
                  />
                  {priceTiers.retail !== '' && Number(priceTiers.retail) < totalDirectCost && totalDirectCost > 0 && (
                    <span className="text-2xs text-rose-500 block mt-0.5 leading-tight">
                      Min: ৳{totalDirectCost.toFixed(2)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-2xs">Reseller (পাইকারি)</Label>
                    {priceTiers.reseller !== '' && Number(priceTiers.reseller) < totalDirectCost && totalDirectCost > 0 && (
                      <span className="text-2xs font-bold text-rose-600 dark:text-rose-400">Below Cost</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={priceTiers.reseller}
                    onChange={(e) => setPriceTiers({ ...priceTiers, reseller: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className={`h-8 text-xs font-mono ${
                      priceTiers.reseller !== '' && Number(priceTiers.reseller) < totalDirectCost && totalDirectCost > 0
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-bold'
                        : ''
                    }`}
                  />
                  {priceTiers.reseller !== '' && Number(priceTiers.reseller) < totalDirectCost && totalDirectCost > 0 && (
                    <span className="text-2xs text-rose-500 block mt-0.5 leading-tight">
                      Min: ৳{totalDirectCost.toFixed(2)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-2xs">Corporate (কর্পোরেট)</Label>
                    {priceTiers.corporate !== '' && Number(priceTiers.corporate) < totalDirectCost && totalDirectCost > 0 && (
                      <span className="text-2xs font-bold text-rose-600 dark:text-rose-400">Below Cost</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={priceTiers.corporate}
                    onChange={(e) => setPriceTiers({ ...priceTiers, corporate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className={`h-8 text-xs font-mono ${
                      priceTiers.corporate !== '' && Number(priceTiers.corporate) < totalDirectCost && totalDirectCost > 0
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-bold'
                        : ''
                    }`}
                  />
                  {priceTiers.corporate !== '' && Number(priceTiers.corporate) < totalDirectCost && totalDirectCost > 0 && (
                    <span className="text-2xs text-rose-500 block mt-0.5 leading-tight">
                      Min: ৳{totalDirectCost.toFixed(2)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-2xs">Agency (বিজ্ঞাপনী সংস্থা)</Label>
                    {priceTiers.agency !== '' && Number(priceTiers.agency) < totalDirectCost && totalDirectCost > 0 && (
                      <span className="text-2xs font-bold text-rose-600 dark:text-rose-400">Below Cost</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={priceTiers.agency}
                    onChange={(e) => setPriceTiers({ ...priceTiers, agency: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className={`h-8 text-xs font-mono ${
                      priceTiers.agency !== '' && Number(priceTiers.agency) < totalDirectCost && totalDirectCost > 0
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-bold'
                        : ''
                    }`}
                  />
                  {priceTiers.agency !== '' && Number(priceTiers.agency) < totalDirectCost && totalDirectCost > 0 && (
                    <span className="text-2xs text-rose-500 block mt-0.5 leading-tight">
                      Min: ৳{totalDirectCost.toFixed(2)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-2xs">Regular (নিয়মিত)</Label>
                    {priceTiers.regular !== '' && Number(priceTiers.regular) < totalDirectCost && totalDirectCost > 0 && (
                      <span className="text-2xs font-bold text-rose-600 dark:text-rose-400">Below Cost</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={priceTiers.regular}
                    onChange={(e) => setPriceTiers({ ...priceTiers, regular: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className={`h-8 text-xs font-mono ${
                      priceTiers.regular !== '' && Number(priceTiers.regular) < totalDirectCost && totalDirectCost > 0
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-bold'
                        : ''
                    }`}
                  />
                  {priceTiers.regular !== '' && Number(priceTiers.regular) < totalDirectCost && totalDirectCost > 0 && (
                    <span className="text-2xs text-rose-500 block mt-0.5 leading-tight">
                      Min: ৳{totalDirectCost.toFixed(2)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-2xs">Special / VIP</Label>
                    {priceTiers.custom !== '' && Number(priceTiers.custom) < totalDirectCost && totalDirectCost > 0 && (
                      <span className="text-2xs font-bold text-rose-600 dark:text-rose-400">Below Cost</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={priceTiers.custom}
                    onChange={(e) => setPriceTiers({ ...priceTiers, custom: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className={`h-8 text-xs font-mono ${
                      priceTiers.custom !== '' && Number(priceTiers.custom) < totalDirectCost && totalDirectCost > 0
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-bold'
                        : ''
                    }`}
                  />
                  {priceTiers.custom !== '' && Number(priceTiers.custom) < totalDirectCost && totalDirectCost > 0 && (
                    <span className="text-2xs text-rose-500 block mt-0.5 leading-tight">
                      Min: ৳{totalDirectCost.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </ModalDialog>
  )
}

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
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
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
} from 'lucide-react'
import type { ProductRecord, MaterialConfiguration, UnitOfMeasure, MaterialRollSizeConfig } from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface MaterialConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (materialData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
}

const COMMON_PURCHASE_UNITS: { value: string; label: string; defaultType: 'roll' | 'sheet' | 'liquid' | 'rigid' | 'accessory' }[] = [
  { value: 'roll', label: 'Continuous Roll (রোল - Media Substrate)', defaultType: 'roll' },
  { value: 'sheet', label: 'Rigid Sheet / Board (শীট / বোর্ড)', defaultType: 'sheet' },
  { value: 'bottle', label: 'Bottle / Can (বোতল - Ink/Chemical)', defaultType: 'liquid' },
  { value: 'liter', label: 'Liter (লিটার)', defaultType: 'liquid' },
  { value: 'box', label: 'Box / Pack (বক্স / প্যাকেট)', defaultType: 'accessory' },
  { value: 'piece', label: 'Piece (পিস)', defaultType: 'accessory' },
  { value: 'kg', label: 'Kilogram (কেজি)', defaultType: 'rigid' },
  { value: 'meter', label: 'Meter (মিটার)', defaultType: 'rigid' },
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
  'roll' | 'sheet' | 'liquid' | 'rigid' | 'accessory' | 'electrical',
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

export function MaterialConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
}: MaterialConfigModalProps) {
  // 1. Material Identity
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('flex_banner')
  const [materialType, setMaterialType] = useState<'roll' | 'sheet' | 'liquid' | 'rigid' | 'hardware' | 'accessory' | 'electrical'>('roll')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')

  // 2. Measurement & Physical Dimensions
  const [purchaseUnit, setPurchaseUnit] = useState('roll')
  const [usageUnit, setUsageUnit] = useState<UnitOfMeasure>('sft')
  const [dimensionUnit, setDimensionUnit] = useState<'ft' | 'inch' | 'mm' | 'm'>('ft')
  
  // Roll Geometry & Configured Roll Sizes (supporting individual extra allowances)
  const [configuredRolls, setConfiguredRolls] = useState<MaterialRollSizeConfig[]>([
    { width: 10, extra_allowance: 0, length: 164 },
  ])
  const [standardRollLength, setStandardRollLength] = useState<number | string>(164)
  const [extraWidthAllowance, setExtraWidthAllowance] = useState<number | string>(0)
  const [newWidthInput, setNewWidthInput] = useState<string>('10')

  // Sheet Geometry
  const [availableSheetSizes, setAvailableSheetSizes] = useState<Array<{ width: number; length: number; label?: string }>>([
    { width: 4, length: 8, label: '4ft × 8ft' },
  ])
  const [newSheetWidthInput, setNewSheetWidthInput] = useState<string>('4')
  const [newSheetLengthInput, setNewSheetLengthInput] = useState<string>('8')
  const [thicknessMm, setThicknessMm] = useState<number | ''>('')

  // Liquid & Accessory Specs
  const [packQuantity, setPackQuantity] = useState<number | ''>(1000)
  const [liquidVolumeMl, setLiquidVolumeMl] = useState<number | ''>(1000)

  // 3. Purchasing, Costing & Reorder (Direct SFT & Package Rate)
  const [purchasePricePerSft, setPurchasePricePerSft] = useState<number | ''>('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [wastePercent, setWastePercent] = useState<number>(5)
  const [reorderLevel, setReorderLevel] = useState<number>(5)
  const [storageLocation, setStorageLocation] = useState('Main Store - Media Rack')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Derived total package area or count
  const totalUnitArea = useMemo(() => {
    if (materialType === 'roll' || purchaseUnit === 'roll') {
      const parsedInput = parseFloat(newWidthInput)
      const activeRoll = configuredRolls.find((r) => r.width === parsedInput)
      const currentW = !isNaN(parsedInput) && parsedInput > 0
        ? parsedInput
        : (activeRoll?.width || (configuredRolls.length > 0 ? configuredRolls[0].width : 10))
      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
      const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? (activeRoll?.extra_allowance ?? 0) : parsedAllowance
      const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
      const len = isNaN(parsedLen) || parsedLen <= 0 ? (activeRoll?.length ?? 164) : parsedLen
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

  // Handle switching Physical Form / Classification and aligning Catalog Category & default purchase units
  const handleSelectMaterialType = (t: 'roll' | 'sheet' | 'liquid' | 'rigid' | 'accessory' | 'electrical') => {
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
        setPurchaseUnit('piece')
        setUsageUnit('piece')
      }
    }
  }

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
      setMaterialType(
        matCfg.material_type ||
          (initialData.purchase_unit === 'sheet'
            ? 'sheet'
            : initialData.purchase_unit === 'bottle' || initialData.purchase_unit === 'liter'
            ? 'liquid'
            : initialData.purchase_unit === 'box' || initialData.purchase_unit === 'piece'
            ? 'accessory'
            : 'roll')
      )
      
      const stdLen = matCfg.standard_roll_length_ft || initialData.standard_roll_length_ft || formula.standard_roll_length_ft || (initialData as any).roll_length_ft || 164
      const rawAllowance = matCfg.extra_width_allowance_ft !== undefined
        ? matCfg.extra_width_allowance_ft
        : initialData.production_width_allowance !== undefined
        ? initialData.production_width_allowance
        : formula.production_width_allowance !== undefined
        ? formula.production_width_allowance
        : 0

      // Unpack configured rolls with individual per-roll extra allowances and lengths
      let initialRolls: MaterialRollSizeConfig[] = []
      if (matCfg.roll_sizes && Array.isArray(matCfg.roll_sizes) && matCfg.roll_sizes.length > 0) {
        initialRolls = matCfg.roll_sizes
          .map((r: any) => ({
            width: Number(r.width),
            extra_allowance: r.extra_allowance !== undefined ? Number(r.extra_allowance) : Number(rawAllowance) || 0,
            length: r.length !== undefined ? Number(r.length) : Number(stdLen) || 164,
          }))
          .filter((r: MaterialRollSizeConfig) => !isNaN(r.width) && r.width > 0)
      } else if (formula.roll_sizes && Array.isArray(formula.roll_sizes) && formula.roll_sizes.length > 0) {
        initialRolls = formula.roll_sizes
          .map((r: any) => ({
            width: Number(r.width),
            extra_allowance: r.extra_allowance !== undefined ? Number(r.extra_allowance) : Number(rawAllowance) || 0,
            length: r.length !== undefined ? Number(r.length) : Number(stdLen) || 164,
          }))
          .filter((r: MaterialRollSizeConfig) => !isNaN(r.width) && r.width > 0)
      } else if ((initialData as any).roll_sizes && Array.isArray((initialData as any).roll_sizes) && (initialData as any).roll_sizes.length > 0) {
        initialRolls = (initialData as any).roll_sizes
          .map((r: any) => ({
            width: Number(r.width),
            extra_allowance: r.extra_allowance !== undefined ? Number(r.extra_allowance) : Number(rawAllowance) || 0,
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
        const parsedRawAllowance = typeof rawAllowance === 'number' ? rawAllowance : (parseFloat(rawAllowance) || 0)
        initialRolls = Array.from(new Set(rawWidths.map((w: any) => Number(w))))
          .filter((w: number) => !isNaN(w) && w > 0)
          .map((w: number) => ({
            width: w,
            extra_allowance: parsedRawAllowance,
            length: Number(stdLen) || 164,
          }))
      }

      if (initialRolls.length === 0) {
        initialRolls = [{ width: 10, extra_allowance: 0, length: 164 }]
      }

      initialRolls.sort((a, b) => a.width - b.width)
      setConfiguredRolls(initialRolls)

      const activeRoll = initialRolls[initialRolls.length - 1]
      setNewWidthInput(activeRoll.width.toString())
      setExtraWidthAllowance(activeRoll.extra_allowance ?? 0)
      setStandardRollLength(activeRoll.length ?? (Number(stdLen) || 164))

      const sheets = (matCfg.available_sheet_sizes && matCfg.available_sheet_sizes.length > 0)
        ? matCfg.available_sheet_sizes
        : (initialData.available_sheet_sizes && initialData.available_sheet_sizes.length > 0)
        ? initialData.available_sheet_sizes
        : (formula.available_sheet_sizes && formula.available_sheet_sizes.length > 0)
        ? formula.available_sheet_sizes
        : [
            { width: 4, length: 8, label: '4ft × 8ft' },
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
      setThicknessMm(matCfg.thickness_mm || '')
      setStorageLocation(matCfg.storage_location || 'Main Store - Media Rack')
      setPackQuantity(matCfg.pack_quantity || 1000)

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
      setCategory('materials')
      setMaterialType('roll')
      setIsActive(true)
      setDescription('')
      setPurchaseUnit('roll')
      setPurchasePrice('')
      setPurchasePricePerSft('')
      setStandardRollLength(164)
      setConfiguredRolls([{ width: 10, extra_allowance: 0, length: 164 }])
      setNewWidthInput('10')
      setAvailableSheetSizes([
        { width: 4, length: 8, label: '4ft × 8ft' },
      ])
      setNewSheetWidthInput('4')
      setNewSheetLengthInput('8')
      setExtraWidthAllowance(0)
      setUsageUnit('sft')
      setWastePercent(5)
      setReorderLevel(5)
      setThicknessMm('')
      setStorageLocation('Main Store - Media Rack')
      setPackQuantity(1000)
      setLiquidVolumeMl(1000)
    }
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
    setExtraWidthAllowance(roll.extra_allowance ?? 0)
    setStandardRollLength(roll.length ?? 164)

    const perSftCost = Number(purchasePricePerSft) || 0
    if (perSftCost > 0) {
      const effectiveW = roll.width + (roll.extra_allowance ?? 0)
      const len = roll.length ?? 164
      const physicalArea = Number((effectiveW * len).toFixed(2))
      setPurchasePrice(Number((perSftCost * physicalArea).toFixed(2)))
    }
  }

  const handleWidthInputChange = (val: string) => {
    setNewWidthInput(val)
    const parsed = parseFloat(val)
    if (!isNaN(parsed) && parsed > 0) {
      const matched = configuredRolls.find((r) => r.width === parsed)
      const allowance = matched !== undefined ? (matched.extra_allowance ?? 0) : (typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0))
      const len = matched !== undefined ? (matched.length ?? 164) : (typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164))

      if (matched) {
        setExtraWidthAllowance(allowance)
        setStandardRollLength(len)
      }

      const perSftCost = Number(purchasePricePerSft) || 0
      if (perSftCost > 0) {
        const effectiveW = parsed + (isNaN(allowance) || allowance < 0 ? 0 : allowance)
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
        prev.map((r) => (r.width === parsedW ? { ...r, extra_allowance: allowance, length: len } : r))
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
    const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
    const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance

    if (!isNaN(parsedW) && parsedW > 0) {
      setConfiguredRolls((prev) =>
        prev.map((r) => (r.width === parsedW ? { ...r, length: len, extra_allowance: allowance } : r))
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

  const handleAddCustomWidth = () => {
    const val = parseFloat(newWidthInput)
    if (isNaN(val) || val <= 0) return

    const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
    const len = isNaN(parsedLen) || parsedLen <= 0 ? 164 : parsedLen
    const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
    const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance

    setConfiguredRolls((prev) => {
      const idx = prev.findIndex((r) => r.width === val)
      let next: MaterialRollSizeConfig[]
      if (idx >= 0) {
        next = [...prev]
        next[idx] = { width: val, extra_allowance: allowance, length: len }
      } else {
        next = [...prev, { width: val, extra_allowance: allowance, length: len }]
      }
      return next.sort((a, b) => a.width - b.width)
    })

    const effectiveW = val + allowance
    const physicalArea = Number((effectiveW * len).toFixed(2))
    if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
      setPurchasePrice(Number((Number(purchasePricePerSft) * physicalArea).toFixed(2)))
    }
  }

  const handleRemoveWidth = (w: number) => {
    const nextRolls = configuredRolls.filter((x) => x.width !== w)
    setConfiguredRolls(nextRolls)
    if (nextRolls.length > 0) {
      const activeW = parseFloat(newWidthInput)
      const nextActive = nextRolls.find((r) => r.width === activeW) || nextRolls[nextRolls.length - 1]
      setNewWidthInput(nextActive.width.toString())
      setExtraWidthAllowance(nextActive.extra_allowance ?? 0)
      setStandardRollLength(nextActive.length ?? 164)

      const perSftCost = Number(purchasePricePerSft) || 0
      if (perSftCost > 0) {
        const effectiveW = nextActive.width + (nextActive.extra_allowance ?? 0)
        const len = nextActive.length ?? 164
        setPurchasePrice(Number((perSftCost * effectiveW * len).toFixed(2)))
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

  const handleRemoveSheetSize = (index: number) => {
    const nextSheets = availableSheetSizes.filter((_, i) => i !== index)
    setAvailableSheetSizes(nextSheets)
    if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0 && nextSheets.length > 0) {
      const firstSheet = nextSheets[0]
      setPurchasePrice(Number((Number(purchasePricePerSft) * firstSheet.width * firstSheet.length).toFixed(2)))
    }
  }

  // Real-Time Cost Economics Calculations
  const calculatedEconomics = useMemo(() => {
    const perSftCost = Number(purchasePricePerSft) || 0
    const totalPkgCost = Number(purchasePrice) || 0

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
      const activeRoll = configuredRolls.find((r) => r.width === parsedInput)
      const currentW = !isNaN(parsedInput) && parsedInput > 0
        ? parsedInput
        : (activeRoll?.width || (configuredRolls.length > 0 ? configuredRolls[0].width : 10))

      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : (parseFloat(extraWidthAllowance) || 0)
      const allowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? (activeRoll?.extra_allowance ?? 0) : parsedAllowance

      const parsedLen = typeof standardRollLength === 'number' ? standardRollLength : (parseFloat(standardRollLength) || 164)
      const len = isNaN(parsedLen) || parsedLen <= 0 ? (activeRoll?.length ?? 164) : parsedLen

      // Nominal Area (WITHOUT extra allowance) -> Usable & Sellable square footage for active roll width
      const nominalRollArea = Number((currentW * len).toFixed(2))

      // Physical Area (WITH extra allowance) -> Purchased substrate package area for active roll width
      const effectiveW = currentW + allowance
      const physicalRollArea = Number((effectiveW * len).toFixed(2))

      // Effective Package Cost for active roll width
      const effectivePkgCost = perSftCost > 0
        ? Number((perSftCost * physicalRollArea).toFixed(2))
        : (totalPkgCost > 0 ? totalPkgCost : 0)

      // Direct Base Cost (৳ / SFT) calculated WITHOUT extra allowance:
      // Package Cost divided by Nominal Usable Area
      const baseUnitCost = nominalRollArea > 0 && effectivePkgCost > 0
        ? effectivePkgCost / nominalRollArea
        : (perSftCost > 0 ? perSftCost : 0)

      const effCost = baseUnitCost * (1 + (wastePercent || 0) / 100)

      return {
        unitCost: baseUnitCost,
        effectiveCost: effCost,
        yieldLabel: `${nominalRollArea.toLocaleString()} sft (${currentW}ft × ${len}ft roll)`,
        formulaText: effectivePkgCost > 0 && nominalRollArea > 0
          ? `৳${effectivePkgCost.toLocaleString()} (${currentW}ft roll) ÷ ${nominalRollArea.toLocaleString()} sft (nominal yield) = ৳${baseUnitCost.toFixed(2)}/sft (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`
          : `৳${baseUnitCost.toFixed(2)}/sft × ${nominalRollArea.toLocaleString()} sft = ৳${(baseUnitCost * nominalRollArea).toFixed(0)}/roll (+ ${wastePercent}% waste = ৳${effCost.toFixed(2)}/sft)`,
      }
    }

    const baseUnitCost = perSftCost > 0 ? perSftCost : (totalUnitArea > 0 ? totalPkgCost / totalUnitArea : 0)
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

    // Default 1:1
    return {
      unitCost: baseUnitCost,
      effectiveCost: effCost,
      yieldLabel: `1 ${usageUnit}`,
      formulaText: `৳${baseUnitCost.toFixed(2)} per ${usageUnit}`,
    }
  }, [purchasePricePerSft, purchasePrice, totalUnitArea, materialType, purchaseUnit, configuredRolls, newWidthInput, extraWidthAllowance, standardRollLength, availableSheetSizes, wastePercent, packQuantity, usageUnit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Material name is required.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const pp = purchasePrice !== '' ? Number(purchasePrice) : 0
      const baseDirectCost = calculatedEconomics.unitCost > 0 ? Number(calculatedEconomics.unitCost.toFixed(2)) : (pp > 0 ? pp : 0)
      
      const parsedInput = parseFloat(newWidthInput)
      const parsedAllowance = typeof extraWidthAllowance === 'number' ? extraWidthAllowance : parseFloat(extraWidthAllowance)
      const finalAllowance = isNaN(parsedAllowance) || parsedAllowance < 0 ? 0 : parsedAllowance

      const parsedLength = typeof standardRollLength === 'number' ? standardRollLength : parseFloat(standardRollLength)
      const finalLength = isNaN(parsedLength) || parsedLength <= 0 ? 164 : parsedLength

      let finalRolls = [...configuredRolls]
      if (!isNaN(parsedInput) && parsedInput > 0) {
        const idx = finalRolls.findIndex((r) => r.width === parsedInput)
        if (idx >= 0) {
          finalRolls[idx] = { width: parsedInput, extra_allowance: finalAllowance, length: finalLength }
        } else if (finalRolls.length === 0) {
          finalRolls = [{ width: parsedInput, extra_allowance: finalAllowance, length: finalLength }]
        }
      }
      if (finalRolls.length === 0) {
        finalRolls = [{ width: 10, extra_allowance: 0, length: 164 }]
      }
      finalRolls.sort((a, b) => a.width - b.width)
      const finalWidths = finalRolls.map((r) => r.width)

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
        selling_price: initialData?.selling_price || 0,
        default_wastage_percentage: wastePercent,
        target_margin_percentage: initialData?.target_margin_percentage || 35.0,
        min_allowed_margin_percent: initialData?.min_allowed_margin_percent || 15.0,
        pricing_method: initialData?.pricing_method || 'per_piece',
        cost_basis_type: 'direct_cost',
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
      setErrorMessage(err.message || 'Failed to save material configuration.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 font-bold shrink-0">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Edit Material: ${initialData.name}` : 'New Raw Material Master'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                Inventory Stock
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                {materialType.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Purchased raw printing substrate & consumables tracked by physical dimensions and consumed in production.
            </p>
          </div>
        </div>
      }
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 1: MATERIAL IDENTITY & PHYSICAL FORM */}
        {/* ======================================================== */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Material Identity & Physical Classification
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Bilingual naming & substrate category</span>
          </div>

          <div className="space-y-3">
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
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Bengali Name (বাংলা নাম - ঐচ্ছিক)
                  </Label>
                </div>
                <Input
                  placeholder="যেমন: স্টার ফ্রন্টলিট ফ্লেক্স ব্যানার"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  className="h-9 text-xs font-bengali"
                />
              </div>

              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Material SKU / Stock Code
                  </Label>
                </div>
                <Input
                  placeholder="e.g. MAT-FLEX-STAR-280"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Physical Form / Classification <span className="text-rose-500">*</span>
                  </Label>
                </div>
                <select
                  value={materialType}
                  onChange={(e) => handleSelectMaterialType(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 px-2.5 font-bold text-amber-900 dark:text-amber-200"
                >
                  <option value="roll">📜 Continuous Roll Media (Vinyl, Flex Banner, Paper, Canvas)</option>
                  <option value="sheet">🔲 Rigid Sheet & Flat Board (PVC Board, Acrylic, ACP, Foam Board)</option>
                  <option value="liquid">🧪 Liquid Consumable (Solvent / UV / Eco Inks, Cleaning Fluid)</option>
                  <option value="rigid">🏗️ Framing & Metal Profile (MS Pipe, Aluminum Channel, Angle Bar)</option>
                  <option value="accessory">🔩 Hardware & Fasteners (Eyelet, Double Tape, Standee, Standoff)</option>
                  <option value="electrical">⚡ Electrical & Lighting (LED Modules, 12V SMPS Power, Neon Strip)</option>
                </select>
              </div>

              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Catalog Category (ক্যাটালগ ক্যাটাগরি) <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
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
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Technical Specification & Description
              </Label>
              <textarea
                rows={2}
                placeholder="e.g. 280 GSM heavy duty PVC substrate, matte finish, solvent/eco-solvent compatible, 1-year outdoor UV resistance..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: MEASUREMENT UNITS & PHYSICAL DIMENSIONS */}
        {/* ======================================================== */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Measurement Units & Physical Dimensions
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Purchase units, roll widths & sheet boards</span>
          </div>

          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3.5">
            {/* Units Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Purchase Unit (ক্রয় একক) <span className="text-rose-500">*</span>
                  </Label>
                </div>
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

              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Usage Unit (খরচ হিসাব একক) <span className="text-rose-500">*</span>
                  </Label>
                </div>
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

              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Dimension Unit (পরিমাপ একক)
                  </Label>
                </div>
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

            {/* Geometry Case A: Roll Physical Dimensions: Roll Width [ ] + [ ]    Roll Length [ ]  Add */}
            {(materialType === 'roll' || purchaseUnit === 'roll') && (
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Roll Width [ ] + [ ] */}
                  <div className="sm:col-span-6">
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
                          placeholder="0"
                          value={extraWidthAllowance}
                          onChange={(e) => handleAllowanceChange(e.target.value)}
                          className="h-9 text-xs font-mono font-bold pr-7"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">ft</span>
                      </div>
                    </div>
                  </div>

                  {/* Roll Length [ ] */}
                  <div className="sm:col-span-4">
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Roll Length (Feet)
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
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
                      <button
                        type="button"
                        onClick={() => handleRollLengthChange('100')}
                        className={cn(
                          'h-9 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer shrink-0',
                          Number(standardRollLength) === 100
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        100ft
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRollLengthChange('164')}
                        className={cn(
                          'h-9 px-2 rounded-md text-[11px] font-bold border transition-colors cursor-pointer shrink-0',
                          Number(standardRollLength) === 164
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        164ft
                      </button>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      onClick={handleAddCustomWidth}
                      className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Configured Roll Sizes List */}
                {configuredRolls.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1">
                      Configured Roll Sizes:
                    </span>
                    {configuredRolls.map((roll) => {
                      const rollAllowance = roll.extra_allowance ?? 0
                      const rollLen = roll.length ?? 164
                      const effectiveW = roll.width + rollAllowance
                      const rollArea = effectiveW * rollLen
                      const perSftCost = Number(purchasePricePerSft) || 0
                      const rollPrice = perSftCost > 0 ? Number((perSftCost * rollArea).toFixed(0)) : null
                      const isCurrentActive = parseFloat(newWidthInput) === roll.width

                      return (
                        <span
                          key={roll.width}
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
                              handleRemoveWidth(roll.width)
                            }}
                            className="ml-0.5 text-slate-400 hover:text-rose-600 cursor-pointer text-sm font-bold"
                            title="Remove width"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Geometry Case B: Sheet Physical Dimensions */}
            {(materialType === 'sheet' || purchaseUnit === 'sheet') && (
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Sheet Width [ ] */}
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
                        onChange={(e) => {
                          const val = e.target.value
                          setNewSheetWidthInput(val)
                          const w = parseFloat(val)
                          const l = parseFloat(newSheetLengthInput) || 8
                          if (!isNaN(w) && w > 0 && purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                            setPurchasePrice(Number((Number(purchasePricePerSft) * w * l).toFixed(2)))
                          }
                        }}
                        className="h-9 text-xs font-mono font-bold pr-7"
                      />
                      <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                    </div>
                  </div>

                  {/* Sheet Length [ ] */}
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
                        onChange={(e) => {
                          const val = e.target.value
                          setNewSheetLengthInput(val)
                          const l = parseFloat(val)
                          const w = parseFloat(newSheetWidthInput) || 4
                          if (!isNaN(l) && l > 0 && purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                            setPurchasePrice(Number((Number(purchasePricePerSft) * w * l).toFixed(2)))
                          }
                        }}
                        className="h-9 text-xs font-mono font-bold pr-7"
                      />
                      <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                    </div>
                  </div>

                  {/* Board Thickness */}
                  <div className="sm:col-span-4">
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Board Thickness (mm / gsm)
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

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      onClick={handleAddCustomSheetSize}
                      className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
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
                        title="Click to edit this sheet size"
                      >
                        <span>{s.width}ft × {s.length}ft</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveSheetSize(index)
                          }}
                          className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer text-sm font-bold"
                          title="Remove sheet size"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Geometry Case C: Box / Pack Quantity */}
            {(purchaseUnit === 'box' || purchaseUnit === 'pack') && (
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Items / Pieces per {purchaseUnit}</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 1000 Eyelets"
                    value={packQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1000
                      setPackQuantity(val)
                      if (purchasePricePerSft !== '' && Number(purchasePricePerSft) > 0) {
                        setPurchasePrice(Number((Number(purchasePricePerSft) * val).toFixed(2)))
                      }
                    }}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500">Auto-converts purchase pack price to piece cost</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: PURCHASING, DIRECT COSTING & INVENTORY REORDER */}
        {/* ======================================================== */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Purchasing, Direct Costing & Inventory Reorder
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Purchase rate & automatic unit cost calculation</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Usage Unit Purchase Rate Input */}
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

              {/* Package Purchase Price Input */}
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

              {/* Reorder Level */}
              <div className="flex flex-col justify-between">
                <div className="h-6 flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Reorder Alert Level ({purchaseUnit}s)
                  </Label>
                </div>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value, 10) || 0)}
                  className="h-9 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block truncate">Min stock warning threshold</span>
              </div>
            </div>

            {/* Live Real-Time Cost Economics Card */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                    Calculated Production Direct Cost
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200">
                  Total Yield: {calculatedEconomics.yieldLabel}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/60">
                  <span className="text-[11px] font-medium text-slate-500 block">Direct Base Cost (৳ / {usageUnit})</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    ৳{calculatedEconomics.unitCost.toFixed(2)} / {usageUnit}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/60">
                  <span className="text-[11px] font-medium text-slate-500 block">Effective Cost with {wastePercent}% Wastage</span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                    ৳{calculatedEconomics.effectiveCost.toFixed(2)} / {usageUnit}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 px-2.5 py-1 rounded-md">
                {calculatedEconomics.formulaText}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Warehouse / Storage Location
              </Label>
              <Input
                placeholder="e.g. Main Warehouse - Rack B2 / Shelf 4"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Active in Raw Material Inventory & Production Consumption</span>
              </label>
            </div>
          </div>
        </div>

        {/* Standardized Bottom Action Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
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
      </form>
    </ModalDialog>
  )
}

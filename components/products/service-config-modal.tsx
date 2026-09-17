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

  // 1.2 Substrate & Auto-Inherited Print Sizes from Selected Printable Material
  const [availableRollWidths, setAvailableRollWidths] = useState<number[]>([3.25, 4.25, 5.25, 6, 10])
  const [standardRollLength, setStandardRollLength] = useState<number | string>(164)
  const [extraWidthAllowance, setExtraWidthAllowance] = useState<number | string>(0.25)
  const [availableSheetSizes, setAvailableSheetSizes] = useState<Array<{ width: number; length: number; label?: string }>>([
    { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
  ])

  // 1.3 Commercial Billing Units
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

  // 3. Finishing Options
  const [finishingOptions, setFinishingOptions] = useState<ServiceFinishingOption[]>([])
  const [showCustomFinishingForm, setShowCustomFinishingForm] = useState(false)
  const [customFinishingName, setCustomFinishingName] = useState('')
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
      setServiceType((initialData as any).service_type || (initialData.product_type === 'print_service' ? 'printing' : 'printing'))
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
      setCategory('printing_service')
      setServiceType('printing')
      setPrintCategory('Large Format Eco-Solvent Print')
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

  // Handle Preset Ink Channel Selection (4 Inks, 6 Inks, etc.)
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

  const handleAddCustomFinishing = () => {
    if (!customFinishingName.trim()) return
    setFinishingOptions([
      ...finishingOptions,
      {
        id: `custom-fin-${Date.now()}`,
        name: customFinishingName.trim(),
        pricing_method: customFinishingMethod,
        unit_price: Number(customFinishingPrice) || 0,
        price: Number(customFinishingPrice) || 0,
        unit_cost: Number(customFinishingCost) || 0,
        cost: Number(customFinishingCost) || 0,
        is_default: false,
      },
    ])
    setCustomFinishingName('')
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
        print_category: printCategory,
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

      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `SRV-${Date.now().toString().slice(-5)}`,
        category: category || 'printing_service',
        product_type: 'print_service',
        entity_type: 'service',
        commercial_type: 'service',
        is_service: true,
        service_type: serviceType,
        print_category: printCategory,
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
                    onChange={(e) => setServiceType(e.target.value as any)}
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
                  <Label className="text-xs font-semibold mb-1 block">
                    Catalog Category
                  </Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    <option value="printing_service">Wide Format Printing</option>
                    <option value="solvent_printing">Solvent / Eco-Solvent</option>
                    <option value="uv_printing">UV Flatbed & Roll</option>
                    <option value="digital_print">Digital Press & Offset</option>
                    <option value="fabrication">Signage & Fabrication</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug || c.id}>
                        {c.name}
                      </option>
                    ))}
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
        {/* TAB 3: FINISHING OPERATIONS                               */}
        {/* ======================================================== */}
        {activeTab === 'finishing' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Post-Press Finishing Operations
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-purple-50 text-purple-700 border-purple-200">
                {finishingOptions.length} Configured
              </Badge>
            </div>

            <div className="space-y-3">
              {/* Preset Master Finishing Options */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Select Standard Finishing Options:
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

              {/* Custom Finishing Form Button & List */}
              <div className="pt-2">
                {showCustomFinishingForm ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
                      Add Custom Finishing Option
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] mb-1 block">Finishing Name</Label>
                        <Input
                          placeholder="e.g. 5mm Sunboard Mounting"
                          value={customFinishingName}
                          onChange={(e) => setCustomFinishingName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] mb-1 block">Selling Price (৳)</Label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={customFinishingPrice}
                          onChange={(e) => setCustomFinishingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] mb-1 block">Unit Cost (৳)</Label>
                        <Input
                          type="number"
                          placeholder="15"
                          value={customFinishingCost}
                          onChange={(e) => setCustomFinishingCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomFinishingForm(false)} className="h-7 text-xs">
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={handleAddCustomFinishing} className="h-7 text-xs bg-purple-600 text-white font-bold">
                        Save Finishing
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
                    <Plus className="w-3.5 h-3.5" /> Add Custom Finishing
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

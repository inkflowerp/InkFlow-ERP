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
  ShieldCheck,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Palette,
  RefreshCw,
  Layers,
  TrendingUp,
  Tag,
  Percent,
  Coins,
  Info,
  Settings2,
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

const COMMON_PURCHASE_UNITS: { value: string; label: string }[] = [
  { value: 'roll', label: 'Continuous Roll (রোল - Media Substrate)' },
  { value: 'sheet', label: 'Rigid Sheet / Board (শীট)' },
  { value: 'box', label: 'Box (বক্স)' },
  { value: 'pack', label: 'Pack / Packet (প্যাকেট)' },
  { value: 'pcs', label: 'Piece / Item (পিস)' },
  { value: 'set', label: 'Set (সেট)' },
  { value: 'bottle', label: 'Bottle / Can (বোতল)' },
  { value: 'liter', label: 'Liter (লিটার)' },
  { value: 'kg', label: 'Kilogram (কেজি)' },
  { value: 'meter', label: 'Meter (মিটার)' },
  { value: 'rft', label: 'Running Feet (rft)' },
  { value: 'job', label: 'Job (জব)' },
]

const STANDARD_SHEET_SIZES: { width: number; length: number; label: string }[] = [
  { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
  { width: 4, length: 6, label: '4ft × 6ft' },
  { width: 3, length: 6, label: '3ft × 6ft' },
  { width: 2, length: 4, label: '2ft × 4ft' },
  { width: 4, length: 4, label: '4ft × 4ft' },
  { width: 2, length: 2, label: '2ft × 2ft' },
]

const DEFAULT_PRINTING_METHODS: Array<{ id: string; name: string; name_bn?: string | null }> = [
  { id: 'eco_solvent', name: 'Eco-Solvent Print', name_bn: 'ইকো-সলভেন্ট প্রিন্ট' },
  { id: 'solvent', name: 'Solvent Print (Heavy Duty)', name_bn: 'সলভেন্ট প্রিন্ট' },
  { id: 'uv_roll', name: 'UV Roll-to-Roll Print', name_bn: 'ইউভি রোল প্রিন্ট' },
  { id: 'uv_flatbed', name: 'UV Flatbed Print', name_bn: 'ইউভি ফ্ল্যাটবেড প্রিন্ট' },
  { id: 'latex', name: 'HP Latex Print', name_bn: 'এইচপি ল্যাটেক্স প্রিন্ট' },
  { id: 'digital_press', name: 'Digital Press (Laser/Toner)', name_bn: 'ডিজিটাল প্রেস' },
  { id: 'offset', name: 'Commercial Offset', name_bn: 'অফসেট প্রিন্টিং' },
  { id: 'sublimation', name: 'Dye Sublimation', name_bn: 'সাবলিমেশন' },
  { id: 'dtf', name: 'DTF Printing', name_bn: 'ডিটিএফ প্রিন্ট' },
]

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
  const [activeTab, setActiveTab] = useState<'basic' | 'dimensions' | 'materials' | 'finishing' | 'additionals' | 'pricing'>('basic')

  const availableMethodsList = useMemo(() => {
    if (printingMethods && printingMethods.length > 0) return printingMethods
    return DEFAULT_PRINTING_METHODS
  }, [printingMethods])

  // 1. Basic Information
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('printing_service')
  const [selectedPrintingMethods, setSelectedPrintingMethods] = useState<string[]>(['Eco-Solvent Print'])
  const [printableMaterialId, setPrintableMaterialId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // 1.1 Ink Linking & Consumables State
  const [linkedInkId, setLinkedInkId] = useState<string>('')
  const [linkedInkName, setLinkedInkName] = useState<string>('')
  const [inkCost, setInkCost] = useState<number | ''>('')
  const [inkCostMode, setInkCostMode] = useState<'method' | 'inventory' | 'custom'>('method')

  // Ink materials filter from inventory
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

  // Substrate materials (media rolls, boards, etc.)
  const substrateMaterials = useMemo(() => {
    return availableMaterials.filter((m) => {
      const cat = (m.category || '').toLowerCase()
      const u = (m.unit || (m as any).purchase_unit || '').toLowerCase()
      const isExplicitInkOnly = (cat === 'ink' || cat === 'inks' || cat === 'ink_chemistry') && (u === 'liter' || u === 'ml' || u === 'bottle')
      return !isExplicitInkOnly
    })
  }, [availableMaterials])

  // 2. Commercial Units & Dimensions
  const [sellingUnit, setSellingUnit] = useState<string>('sft')
  const [purchaseUnit, setPurchaseUnit] = useState<string>('roll')
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('per_area')
  const [dimensionUnit, setDimensionUnit] = useState<string>('ft')
  const [allowCustomDimensions, setAllowCustomDimensions] = useState(true)
  const [minBillableQty, setMinBillableQty] = useState<number>(1)
  const [productionBleedInches, setProductionBleedInches] = useState<number>(0.5)

  // 2.1 Roll Physical Dimensions
  const [availableRollWidths, setAvailableRollWidths] = useState<number[]>([2, 2.5, 3, 3.5, 4, 4.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10])
  const [extraWidthAllowance, setExtraWidthAllowance] = useState<number | string>(0.25)
  const [standardRollLength, setStandardRollLength] = useState<number | string>(164)
  const [newRollWidthInput, setNewRollWidthInput] = useState<string>('')

  // 2.2 Sheet Physical Dimensions
  const [availableSheetSizes, setAvailableSheetSizes] = useState<Array<{ width: number; length: number; label?: string }>>([
    { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
    { width: 4, length: 6, label: '4ft × 6ft' },
    { width: 3, length: 6, label: '3ft × 6ft' },
    { width: 2, length: 4, label: '2ft × 4ft' },
  ])
  const [newSheetWidthInput, setNewSheetWidthInput] = useState<string>('')
  const [newSheetLengthInput, setNewSheetLengthInput] = useState<string>('')
  const [newSheetLabelInput, setNewSheetLabelInput] = useState<string>('')

  // 3. Required Materials & Geometry Allowances
  const [materialSearchQuery, setMaterialSearchQuery] = useState('')
  const [requiredMaterials, setRequiredMaterials] = useState<Array<ServiceRequiredMaterial & { is_primary?: boolean }>>([])
  const [defaultWastagePercent, setDefaultWastagePercent] = useState<number>(5)

  // 4. Finishing Options
  const [finishingOptions, setFinishingOptions] = useState<ServiceFinishingOption[]>([])
  const [showCustomFinishingForm, setShowCustomFinishingForm] = useState(false)
  const [customFinishingName, setCustomFinishingName] = useState('')
  const [customFinishingMethod, setCustomFinishingMethod] = useState('per_sqft')
  const [customFinishingPrice, setCustomFinishingPrice] = useState<number | ''>('')
  const [customFinishingCost, setCustomFinishingCost] = useState<number | ''>('')

  // 5. Additional Options (Pasting & Installation)
  const [additionalOptions, setAdditionalOptions] = useState<ServiceAdditionalOption[]>([])
  const [installationOptions, setInstallationOptions] = useState<ServiceInstallationOption[]>([])
  const [showCustomAddonForm, setShowCustomAddonForm] = useState(false)
  const [customAddonType, setCustomAddonType] = useState<'pasting' | 'installation'>('pasting')
  const [customAddonName, setCustomAddonName] = useState('')
  const [customAddonMethod, setCustomAddonMethod] = useState('per_sqft')
  const [customAddonPrice, setCustomAddonPrice] = useState<number | ''>('')
  const [customAddonCost, setCustomAddonCost] = useState<number | ''>('')

  // 6. Pricing, Customer Tiers & Margins
  const [sellingPrice, setSellingPrice] = useState<number | ''>('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [minimumCharge, setMinimumCharge] = useState<number | ''>('')
  const [baseCostEstimate, setBaseCostEstimate] = useState<number | ''>('')
  const [targetMargin, setTargetMargin] = useState<number>(35)
  const [minAllowedMargin, setMinAllowedMargin] = useState<number>(15)
  const [allowManualOverride, setAllowManualOverride] = useState(true)

  // 6.1 Direct Unit Cost Breakdown Elements
  const [materialCost, setMaterialCost] = useState<number | ''>('')
  const [machineCost, setMachineCost] = useState<number | ''>('')
  const [laborCost, setLaborCost] = useState<number | ''>('')
  const [finishingCost, setFinishingCost] = useState<number | ''>('')
  const [fabricationCost, setFabricationCost] = useState<number | ''>('')
  const [installationCost, setInstallationCost] = useState<number | ''>('')
  const [deliveryCost, setDeliveryCost] = useState<number | ''>('')
  const [otherDirectCost, setOtherDirectCost] = useState<number | ''>('')

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

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'printing_service')
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
      
      // Load printing methods
      const loadedMethods: string[] = (initialData as any).printing_methods || 
        cfg.printing_methods ||
        ((initialData as any).printing_method_name ? (initialData as any).printing_method_name.split(',').map((s: string) => s.trim()).filter(Boolean) : []) ||
        ((initialData as any).printing_method ? [(initialData as any).printing_method] : []) ||
        (cfg.printing_method ? [cfg.printing_method] : [])

      setSelectedPrintingMethods(
        loadedMethods.length > 0
          ? loadedMethods
          : [availableMethodsList[0]?.name || 'Eco-Solvent Print']
      )

      // Load printable material
      const primaryReq = (cfg.required_materials || []).find((m) => m.is_primary)
      const initialMatId = (initialData as any).printable_material_id || cfg.printable_material_id || primaryReq?.material_id || ''
      setPrintableMaterialId(initialMatId)

      // Load linked ink configuration
      const loadedInkId = (initialData as any).linked_ink_id || cfg.linked_ink_id || ''
      const loadedInkName = (initialData as any).linked_ink_name || cfg.linked_ink_name || ''
      const loadedInkCost = (initialData.cost_breakdown?.ink_cost ?? initialData.cost_breakdown?.ink ?? cfg.ink_cost ?? cfg.ink_cost_per_unit ?? (initialData as any).ink_cost) ?? ''
      setLinkedInkId(loadedInkId)
      setLinkedInkName(loadedInkName)
      setInkCost(loadedInkCost !== undefined && loadedInkCost !== null && loadedInkCost !== '' ? Number(loadedInkCost) : '')
      if (loadedInkId) {
        setInkCostMode('inventory')
      } else if (loadedInkCost !== '' && Number(loadedInkCost) > 0) {
        setInkCostMode('custom')
      } else {
        setInkCostMode('method')
      }

      // Load 9-point Direct Cost Breakdown
      const cb = initialData.cost_breakdown || cfg.cost_breakdown || {}
      const loadedMatCost: any = cb.material_cost !== undefined ? cb.material_cost : (cb.material !== undefined ? cb.material : (initialData.purchase_price ?? initialData.base_cost ?? ''))
      const loadedMachineCost: any = (cb.machine_cost ?? cb.machine) ?? ''
      const loadedLaborCost: any = (cb.labor_cost ?? cb.labor) ?? ''
      const loadedFinishingCost: any = (cb.finishing_cost ?? cb.finishing) ?? ''
      const loadedFabricationCost: any = (cb.fabrication_cost ?? cb.fabrication) ?? ''
      const loadedInstallationCost: any = (cb.installation_cost ?? cb.installation) ?? ''
      const loadedDeliveryCost: any = (cb.delivery_cost ?? cb.delivery) ?? ''
      const loadedOtherCost: any = (cb.other_direct_cost ?? cb.other_direct) ?? ''

      setMaterialCost(loadedMatCost !== '' && loadedMatCost !== undefined ? Number(loadedMatCost) : '')
      setMachineCost(loadedMachineCost !== '' && loadedMachineCost !== undefined ? Number(loadedMachineCost) : '')
      setLaborCost(loadedLaborCost !== '' && loadedLaborCost !== undefined ? Number(loadedLaborCost) : '')
      setFinishingCost(loadedFinishingCost !== '' && loadedFinishingCost !== undefined ? Number(loadedFinishingCost) : '')
      setFabricationCost(loadedFabricationCost !== '' && loadedFabricationCost !== undefined ? Number(loadedFabricationCost) : '')
      setInstallationCost(loadedInstallationCost !== '' && loadedInstallationCost !== undefined ? Number(loadedInstallationCost) : '')
      setDeliveryCost(loadedDeliveryCost !== '' && loadedDeliveryCost !== undefined ? Number(loadedDeliveryCost) : '')
      setOtherDirectCost(loadedOtherCost !== '' && loadedOtherCost !== undefined ? Number(loadedOtherCost) : '')

      setDimensionUnit(cfg.dimension_unit || 'ft')
      setAllowCustomDimensions(cfg.allow_custom_dimensions !== false)
      setAvailableRollWidths(cfg.available_widths_ft || initialData.available_widths_ft || [2, 2.5, 3, 3.5, 4, 4.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10])
      setExtraWidthAllowance(cfg.extra_width_allowance_ft ?? (initialData.production_width_allowance ?? 0.25))
      setStandardRollLength(cfg.standard_roll_length_ft || initialData.standard_roll_length_ft || 164)
      setAvailableSheetSizes(cfg.available_sheet_sizes || [
        { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
        { width: 4, length: 6, label: '4ft × 6ft' },
        { width: 3, length: 6, label: '3ft × 6ft' },
        { width: 2, length: 4, label: '2ft × 4ft' },
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
      setSelectedPrintingMethods([availableMethodsList[0]?.name || 'Eco-Solvent Print'])
      setPrintableMaterialId('')
      setLinkedInkId('')
      setLinkedInkName(availableMethodsList[0]?.name ? `${availableMethodsList[0].name} Ink` : 'Eco-Solvent Ink')
      setInkCost(3.5)
      setInkCostMode('method')
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
      setAvailableRollWidths([2, 2.5, 3, 3.5, 4, 4.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10])
      setExtraWidthAllowance(0.25)
      setStandardRollLength(164)
      setAvailableSheetSizes([
        { width: 4, length: 8, label: '4ft × 8ft (Standard Sheet Board)' },
        { width: 4, length: 6, label: '4ft × 6ft' },
        { width: 3, length: 6, label: '3ft × 6ft' },
        { width: 2, length: 4, label: '2ft × 4ft' },
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
  }, [initialData, isOpen, availableMethodsList])

  const handleSelectInkMaterial = (matId: string) => {
    setLinkedInkId(matId)
    if (!matId) {
      setLinkedInkName('')
      return
    }
    const mat = availableMaterials.find((m) => m.id === matId)
    if (mat) {
      setLinkedInkName(mat.name)
      const cost = (mat as any).base_cost || (mat as any).material_config?.effective_unit_cost || (mat as any).cost_per_unit || (mat as any).purchase_price
      if (cost !== undefined && cost !== null && cost !== '' && Number(cost) > 0) {
        setInkCost(Number(cost))
      }
      setInkCostMode('inventory')
    }
  }

  const handleApplyMethodInkRate = (methodName?: string) => {
    const targetName = methodName || selectedPrintingMethods[0] || availableMethodsList[0]?.name || 'Eco-Solvent Print'
    const targetMethod = availableMethodsList.find((m) => m.name === targetName)
    setLinkedInkId('')
    setLinkedInkName(targetMethod?.name_bn ? `${targetMethod.name} (${targetMethod.name_bn})` : (targetMethod?.name || 'Standard Ink'))
    const rate = (targetMethod as any)?.cost_per_sqft !== undefined ? Number((targetMethod as any).cost_per_sqft) : 3.5
    const realisticRate = rate > 20 ? 8.0 : (rate > 0 ? rate : 3.5)
    setInkCost(realisticRate)
    setInkCostMode('method')
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

  // Live Gross Margin Analysis factoring in all Direct Cost Breakdown components
  const marginMetrics = useMemo(() => {
    const sp = Number(sellingPrice) || 0
    return calculateGrossMargin(totalDirectCost, sp)
  }, [totalDirectCost, sellingPrice])

  const handleApplyCostPreset = (preset: 'standard_roll' | 'uv_rigid' | 'signage_fabrication' | 'zero_extras') => {
    if (preset === 'standard_roll') {
      setMachineCost(1.5)
      setLaborCost(1.0)
      setFinishingCost(0.5)
      setFabricationCost(0)
      setInstallationCost(0)
      setDeliveryCost(0)
      setOtherDirectCost(0.25)
    } else if (preset === 'uv_rigid') {
      setMachineCost(3.5)
      setLaborCost(2.0)
      setFinishingCost(1.0)
      setFabricationCost(0)
      setInstallationCost(0)
      setDeliveryCost(0.5)
      setOtherDirectCost(0.5)
    } else if (preset === 'signage_fabrication') {
      setMachineCost(4.0)
      setLaborCost(5.0)
      setFinishingCost(2.0)
      setFabricationCost(8.0)
      setInstallationCost(4.0)
      setDeliveryCost(2.0)
      setOtherDirectCost(1.0)
    } else if (preset === 'zero_extras') {
      setMachineCost(0)
      setLaborCost(0)
      setFinishingCost(0)
      setFabricationCost(0)
      setInstallationCost(0)
      setDeliveryCost(0)
      setOtherDirectCost(0)
    }
  }

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

  // Roll Width Handlers
  const handleToggleRollWidth = (w: number) => {
    if (availableRollWidths.includes(w)) {
      setAvailableRollWidths(availableRollWidths.filter((x) => x !== w))
    } else {
      setAvailableRollWidths([...availableRollWidths, w].sort((a, b) => a - b))
    }
  }

  const handleAddCustomRollWidth = () => {
    const val = parseFloat(newRollWidthInput)
    if (!isNaN(val) && val > 0 && !availableRollWidths.includes(val)) {
      setAvailableRollWidths([...availableRollWidths, val].sort((a, b) => a - b))
      setNewRollWidthInput('')
    }
  }

  // Sheet Size Handlers
  const handleToggleSheetSize = (s: { width: number; length: number; label: string }) => {
    const exists = availableSheetSizes.some((x) => x.width === s.width && x.length === s.length)
    if (exists) {
      setAvailableSheetSizes(availableSheetSizes.filter((x) => !(x.width === s.width && x.length === s.length)))
    } else {
      setAvailableSheetSizes([...availableSheetSizes, s])
    }
  }

  const handleAddCustomSheetSize = () => {
    const w = parseFloat(newSheetWidthInput)
    const l = parseFloat(newSheetLengthInput)
    if (!isNaN(w) && w > 0 && !isNaN(l) && l > 0) {
      const exists = availableSheetSizes.some((x) => x.width === w && x.length === l)
      if (!exists) {
        const label = newSheetLabelInput.trim() || `${w}ft × ${l}ft Sheet`
        setAvailableSheetSizes([...availableSheetSizes, { width: w, length: l, label }])
        setNewSheetWidthInput('')
        setNewSheetLengthInput('')
        setNewSheetLabelInput('')
      }
    }
  }

  const handleRemoveSheetSize = (idx: number) => {
    setAvailableSheetSizes(availableSheetSizes.filter((_, i) => i !== idx))
  }

  const handleToggleMaterial = (mat: MaterialRecord) => {
    const exists = requiredMaterials.find((m) => m.material_id === mat.id)
    if (exists) {
      setRequiredMaterials(requiredMaterials.filter((m) => m.material_id !== mat.id))
    } else {
      setRequiredMaterials([
        ...requiredMaterials,
        {
          material_id: mat.id,
          material_name: mat.name,
          allowance_per_side_in: productionBleedInches,
          is_required: true,
          is_primary: requiredMaterials.length === 0,
          waste_percent: defaultWastagePercent,
        },
      ])
    }
  }

  const handleTogglePrintingMethod = (methodName: string) => {
    if (selectedPrintingMethods.includes(methodName)) {
      if (selectedPrintingMethods.length === 1) {
        setSelectedPrintingMethods([])
      } else {
        setSelectedPrintingMethods(selectedPrintingMethods.filter((m) => m !== methodName))
      }
    } else {
      setSelectedPrintingMethods([...selectedPrintingMethods, methodName])
    }
  }

  const handleSelectAllPrintingMethods = () => {
    setSelectedPrintingMethods(availableMethodsList.map((m) => m.name))
  }

  const handleClearPrintingMethods = () => {
    setSelectedPrintingMethods([])
  }

  const handleSelectPrintableMaterial = (matId: string) => {
    setPrintableMaterialId(matId)
    if (!matId) return

    const selectedMat = availableMaterials.find((m) => m.id === matId)
    if (selectedMat) {
      const exists = requiredMaterials.find((m) => m.material_id === matId)
      if (exists) {
        setRequiredMaterials(
          requiredMaterials.map((m) => ({
            ...m,
            is_primary: m.material_id === matId,
          }))
        )
      } else {
        setRequiredMaterials([
          {
            material_id: selectedMat.id,
            material_name: selectedMat.name,
            allowance_per_side_in: productionBleedInches,
            is_required: true,
            is_primary: true,
            waste_percent: defaultWastagePercent,
          },
          ...requiredMaterials.map((m) => ({ ...m, is_primary: false })),
        ])
      }

      // Auto-sync physical geometry & units from substrate
      const matCfg = (selectedMat as any).material_config || {}
      const matPurUnit = (selectedMat as any).purchase_unit || selectedMat.unit
      if (matPurUnit && (matPurUnit === 'roll' || matPurUnit === 'sheet')) {
        setPurchaseUnit(matPurUnit)
      }

      if (matCfg.available_widths_ft && matCfg.available_widths_ft.length > 0) {
        setAvailableRollWidths(matCfg.available_widths_ft)
      } else if ((selectedMat as any).available_widths_ft && (selectedMat as any).available_widths_ft.length > 0) {
        setAvailableRollWidths((selectedMat as any).available_widths_ft)
      }

      if (matCfg.standard_roll_length_ft) {
        setStandardRollLength(matCfg.standard_roll_length_ft)
      } else if ((selectedMat as any).standard_roll_length_ft) {
        setStandardRollLength((selectedMat as any).standard_roll_length_ft)
      }

      if (matCfg.available_sheet_sizes && matCfg.available_sheet_sizes.length > 0) {
        setAvailableSheetSizes(matCfg.available_sheet_sizes)
      }

      // Auto-populate direct purchase rate per sft/usage unit
      const matBaseCost = (selectedMat as any).base_cost || matCfg.effective_unit_cost || (selectedMat as any).purchase_price || (selectedMat as any).cost_per_unit
      if (matBaseCost && (purchasePrice === '' || Number(purchasePrice) === 0 || materialCost === '' || Number(materialCost) === 0)) {
        setPurchasePrice(matBaseCost)
        setBaseCostEstimate(matBaseCost)
        setMaterialCost(Number(matBaseCost))
      }
    }
  }

  const handleSetPrimaryMaterial = (materialId: string) => {
    setRequiredMaterials(
      requiredMaterials.map((m) => ({
        ...m,
        is_primary: m.material_id === materialId,
      }))
    )
  }

  const handleToggleFinishing = (f: { id: string; name: string; pricing_method: string; selling_price: number; cost: number }) => {
    const exists = finishingOptions.find((x) => x.name === f.name)
    if (exists) {
      setFinishingOptions(finishingOptions.filter((x) => x.name !== f.name))
    } else {
      setFinishingOptions([
        ...finishingOptions,
        {
          id: f.id,
          name: f.name,
          pricing_method: f.pricing_method || 'per_sqft',
          price: f.selling_price || 0,
          cost: f.cost || 0,
          is_default: false,
        },
      ])
    }
  }

  const updateFinishingOption = (name: string, updates: Partial<ServiceFinishingOption>) => {
    setFinishingOptions(
      finishingOptions.map((f) => (f.name === name ? { ...f, ...updates } : f))
    )
  }

  const updateAdditionalOption = (name: string, updates: Partial<ServiceAdditionalOption>) => {
    setAdditionalOptions(
      additionalOptions.map((a) => (a.name === name ? { ...a, ...updates } : a))
    )
  }

  const updateInstallationOption = (name: string, updates: Partial<ServiceInstallationOption>) => {
    setInstallationOptions(
      installationOptions.map((inst) => (inst.name === name ? { ...inst, ...updates } : inst))
    )
  }

  const handleAddCustomFinishing = () => {
    if (!customFinishingName.trim()) return
    const id = `fin-custom-${Date.now()}`
    setFinishingOptions([
      ...finishingOptions,
      {
        id,
        name: customFinishingName.trim(),
        pricing_method: customFinishingMethod,
        price: Number(customFinishingPrice) || 0,
        cost: Number(customFinishingCost) || 0,
        is_default: false,
      },
    ])
    setCustomFinishingName('')
    setCustomFinishingPrice('')
    setCustomFinishingCost('')
    setShowCustomFinishingForm(false)
  }

  const handleToggleAdditional = (a: { id: string; name: string; pricing_method: string; selling_price: number; cost: number }) => {
    const exists = additionalOptions.find((x) => x.name === a.name)
    if (exists) {
      setAdditionalOptions(additionalOptions.filter((x) => x.name !== a.name))
    } else {
      setAdditionalOptions([
        ...additionalOptions,
        {
          id: a.id,
          name: a.name,
          pricing_method: a.pricing_method || 'per_sqft',
          price: a.selling_price || 0,
          cost: a.cost || 0,
        },
      ])
    }
  }

  const handleToggleInstallation = (inst: { id: string; name: string; pricing_method: string; selling_price: number; cost: number }) => {
    const exists = installationOptions.find((x) => x.name === inst.name)
    if (exists) {
      setInstallationOptions(installationOptions.filter((x) => x.name !== inst.name))
    } else {
      setInstallationOptions([
        ...installationOptions,
        {
          id: inst.id,
          name: inst.name,
          pricing_method: inst.pricing_method || 'per_job',
          price: inst.selling_price || 0,
          cost: inst.cost || 0,
        },
      ])
    }
  }

  const handleAddCustomAddon = () => {
    if (!customAddonName.trim()) return
    const id = `addon-custom-${Date.now()}`
    if (customAddonType === 'pasting') {
      setAdditionalOptions([
        ...additionalOptions,
        {
          id,
          name: customAddonName.trim(),
          pricing_method: customAddonMethod,
          price: Number(customAddonPrice) || 0,
          cost: Number(customAddonCost) || 0,
        },
      ])
    } else {
      setInstallationOptions([
        ...installationOptions,
        {
          id,
          name: customAddonName.trim(),
          pricing_method: customAddonMethod,
          price: Number(customAddonPrice) || 0,
          cost: Number(customAddonCost) || 0,
        },
      ])
    }
    setCustomAddonName('')
    setCustomAddonPrice('')
    setCustomAddonCost('')
    setShowCustomAddonForm(false)
  }

  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return availableMaterials
    const q = materialSearchQuery.toLowerCase()
    return availableMaterials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.sku && m.sku.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
    )
  }, [availableMaterials, materialSearchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Service name is required.')
      setActiveTab('basic')
      return
    }
    if (sellingPrice === '' || Number(sellingPrice) < 0) {
      setErrorMessage('Please enter a valid base selling rate.')
      setActiveTab('pricing')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const sp = Number(sellingPrice) || 0
      const finalPriceTiers: ProductPriceTiers = {
        retail: priceTiers.retail !== '' ? Number(priceTiers.retail) : sp,
        corporate: priceTiers.corporate !== '' ? Number(priceTiers.corporate) : sp,
        dealer: priceTiers.reseller !== '' ? Number(priceTiers.reseller) : sp,
        wholesale: priceTiers.reseller !== '' ? Number(priceTiers.reseller) : sp,
        custom: priceTiers.custom !== '' ? Number(priceTiers.custom) : sp,
      }
      // Attach extended pricing tiers supported by pricing engine
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
        // Shorthands
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
        printing_methods: selectedPrintingMethods,
        printing_method: primaryMethod,
        printable_material_id: printableMaterialId || undefined,
        printable_material_name: selectedMat?.name || undefined,
        linked_ink_id: linkedInkId || undefined,
        linked_ink_name: linkedInkName || undefined,
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
        unit: sellingUnit as any,
        selling_unit: sellingUnit,
        purchase_unit: purchaseUnit,
        pricing_method: pricingMethod,
        printing_methods: selectedPrintingMethods,
        printing_method_name: selectedPrintingMethods.join(', '),
        printing_method: primaryMethod,
        printable_material_id: printableMaterialId || undefined,
        printable_material_name: selectedMat?.name || undefined,
        linked_ink_id: linkedInkId || undefined,
        linked_ink_name: linkedInkName || undefined,
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

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold shrink-0 ring-1 ring-emerald-500/20">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Configure Service: ${initialData.name}` : 'New Printing & Production Service'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                Custom Production
              </Badge>
              {sellingUnit && (
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                  {sellingUnit} Billing
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multi-step configuration for wide format print technology, physical media dimensions, post-press finishing & commercial pricing.
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

        {/* Tab Navigation Stepper Bar - 6 Responsive Full-Width Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700/60">
          {[
            { id: 'basic', label: '1. Basic Info', icon: Wrench, count: name ? '✓' : null },
            { id: 'dimensions', label: '2. Dimensions', icon: Maximize2, count: purchaseUnit === 'roll' ? `${availableRollWidths.length} rolls` : purchaseUnit === 'sheet' ? `${availableSheetSizes.length} sheets` : '✓' },
            { id: 'materials', label: '3. Media & Bleed', icon: Boxes, count: requiredMaterials.length > 0 ? requiredMaterials.length : null },
            { id: 'finishing', label: '4. Finishing', icon: Sparkles, count: finishingOptions.length > 0 ? finishingOptions.length : null },
            { id: 'additionals', label: '5. Add-ons & Install', icon: PlusCircle, count: (additionalOptions.length + installationOptions.length) > 0 ? (additionalOptions.length + installationOptions.length) : null },
            { id: 'pricing', label: '6. Pricing & Margins', icon: DollarSign, count: sellingPrice ? '৳' : null },
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
        {/* TAB 1: BASIC INFORMATION & SERVICE IDENTITY */}
        {/* ======================================================== */}
        {activeTab === 'basic' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Service Identity & Machine Technology
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Bilingual naming & catalog scope</span>
            </div>

            <div className="space-y-3.5">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Service Name (English) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. UV Vinyl Sticker Printing (High Density), Eco PVC Frontlit Flex..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs font-medium"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Bengali Name (বাংলা নাম - ঐচ্ছিক)
                  </Label>
                  <Input
                    placeholder="যেমন: ইউভি ভিনাইল স্টিকার প্রিন্টিং"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    className="h-9 text-xs font-bengali"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Service SKU / Item Code
                  </Label>
                  <Input
                    placeholder="e.g. SRV-UV-VINYL-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Row: Catalog Category & Printable Material (Inventory Item) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold block">
                      Printable Material (Inventory Item)
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
                        ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                    )}
                  >
                    <option value="">-- Select Raw Media Substrate / Paper --</option>
                    {availableMaterials.map((mat) => {
                      const costStr = (mat as any).purchase_price || (mat as any).cost_per_unit || (mat as any).last_purchase_price
                      return (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit || (mat as any).purchase_unit || 'unit'}){costStr ? ` — ৳${costStr}` : ''}
                        </option>
                      )
                    })}
                  </select>
                  {printableMaterialId && (() => {
                    const selectedSub = availableMaterials.find((m) => m.id === printableMaterialId)
                    if (!selectedSub) return null
                    const unitCost = (selectedSub as any).base_cost || (selectedSub as any).material_config?.effective_unit_cost || (selectedSub as any).purchase_price
                    return (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          Stock Unit: {(selectedSub as any).purchase_unit || selectedSub.unit || 'roll'}
                        </span>
                        {unitCost ? (
                          <span className="bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-bold">
                            Direct Cost: ৳{unitCost}/{selectedSub.unit || 'sft'}
                          </span>
                        ) : null}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Multi-Select Printing Method (Technology) */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Printing Method (Technology) <span className="text-slate-400 font-normal">/ প্রিন্টিং প্রযুক্তি</span>
                    </Label>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-300">
                      {selectedPrintingMethods.length} Selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPrintingMethods}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleClearPrintingMethods}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableMethodsList.map((pm) => {
                    const isSelected = selectedPrintingMethods.includes(pm.name)
                    return (
                      <button
                        key={pm.id || pm.name}
                        type="button"
                        onClick={() => handleTogglePrintingMethod(pm.name)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs font-semibold ring-2 ring-blue-400/40'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800'
                        )}
                      >
                        {isSelected ? (
                          <Check className="w-3 h-3 text-white shrink-0" />
                        ) : (
                          <Plus className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span>{pm.name}</span>
                        {pm.name_bn && (
                          <span className={cn('text-[10px] font-bengali opacity-80', isSelected ? 'text-blue-100' : 'text-slate-500')}>
                            ({pm.name_bn})
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {selectedPrintingMethods.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Please select at least one printing method for production routing.
                  </p>
                )}
              </div>

              {/* Link Ink & Consumables Cost (কালি ও ইঙ্ক খরচ সংযুক্তি) */}
              <div className="rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-200/60 dark:border-blue-800/60">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      <Droplets className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Link Ink & Consumables Cost (কালি ও ইঙ্ক খরচ)
                        </span>
                        {inkCost !== '' && Number(inkCost) > 0 && (
                          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                            ৳{Number(inkCost).toFixed(2)}/{sellingUnit || 'sft'}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Link ink chemistry from inventory or set technology consumption rate per {sellingUnit || 'sft'}.
                      </span>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-blue-200 dark:border-blue-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleApplyMethodInkRate()}
                      className={cn(
                        'px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer',
                        inkCostMode === 'method'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                      )}
                    >
                      Method Default
                    </button>
                    <button
                      type="button"
                      onClick={() => setInkCostMode('inventory')}
                      className={cn(
                        'px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer',
                        inkCostMode === 'inventory'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                      )}
                    >
                      Stock Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setInkCostMode('custom')}
                      className={cn(
                        'px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer',
                        inkCostMode === 'custom'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                      )}
                    >
                      Custom Rate
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Ink Selection or Method Source */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {inkCostMode === 'inventory'
                        ? 'Select Ink from Inventory Stock (ইনভেন্টরি ইঙ্ক/কালি)'
                        : 'Linked Ink Description / Formulation Name'}
                    </Label>
                    {inkCostMode === 'inventory' ? (
                      <select
                        value={linkedInkId}
                        onChange={(e) => handleSelectInkMaterial(e.target.value)}
                        className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                      >
                        <option value="">-- Choose Stock Ink Item --</option>
                        {inkMaterials.length > 0 ? (
                          inkMaterials.map((ink) => (
                            <option key={ink.id} value={ink.id}>
                              {ink.name} ({ink.unit || (ink as any).purchase_unit || 'bottle'}) — ৳{(ink as any).purchase_price || ink.cost_per_unit || (ink as any).base_cost || 0}
                            </option>
                          ))
                        ) : (
                          availableMaterials.map((mat) => (
                            <option key={mat.id} value={mat.id}>
                              {mat.name} ({mat.unit || (mat as any).purchase_unit})
                            </option>
                          ))
                        )}
                      </select>
                    ) : (
                      <Input
                        placeholder="e.g. Eco-Solvent High Pigment CMYK, UV Flexible 4-Color Ink..."
                        value={linkedInkName}
                        onChange={(e) => {
                          setLinkedInkName(e.target.value)
                          setLinkedInkId('')
                          setInkCostMode('custom')
                        }}
                        className="h-9 text-xs bg-white dark:bg-slate-900"
                      />
                    )}
                  </div>

                  {/* Ink Rate Field (৳ / SFT) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        Ink Rate (৳ / {sellingUnit || 'sft'})
                      </Label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 3.50"
                        value={inkCost}
                        onChange={(e) => {
                          setInkCost(e.target.value === '' ? '' : parseFloat(e.target.value))
                          setInkCostMode('custom')
                        }}
                        className="h-9 text-xs font-mono font-bold pl-6 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Ink Rate Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                    Quick Rates:
                  </span>
                  {[
                    { label: 'Eco-Solvent (৳3.5/sft)', rate: 3.5, name: 'Eco-Solvent CMYK Ink' },
                    { label: 'Solvent Flex (৳2.5/sft)', rate: 2.5, name: 'Heavy Solvent Ink' },
                    { label: 'UV Flexible (৳6.5/sft)', rate: 6.5, name: 'UV Flexible Ink' },
                    { label: 'UV Flatbed (৳8.0/sft)', rate: 8.0, name: 'UV Curable Ink' },
                    { label: 'HP Latex (৳10.0/sft)', rate: 10.0, name: 'HP Latex Ink' },
                    { label: 'DTF Textile (৳7.0/sft)', rate: 7.0, name: 'DTF Textile Ink' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setLinkedInkId('')
                        setLinkedInkName(preset.name)
                        setInkCost(preset.rate)
                        setInkCostMode('custom')
                      }}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all cursor-pointer',
                        Number(inkCost) === preset.rate
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Live Combined Cost Helper Banner */}
                {(() => {
                  const subCost = Number(purchasePrice !== '' ? purchasePrice : baseCostEstimate) || 0
                  const inkC = Number(inkCost) || 0
                  const combined = subCost + inkC
                  return (
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span>Substrate: <strong className="text-slate-900 dark:text-white">৳{subCost.toFixed(2)}</strong></span>
                        <span>+</span>
                        <span>Ink: <strong className="text-blue-600 dark:text-blue-400">৳{inkC.toFixed(2)}</strong></span>
                        <span>=</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          Direct Base Cost: ৳{combined.toFixed(2)} / {sellingUnit || 'sft'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Auto-synchronizes with Tab 6 pricing & margins
                      </span>
                    </div>
                  )
                })()}
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Service Scope & Technical Description
                </Label>
                <textarea
                  rows={3}
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
                  <span>Active in Quotation, Invoice & POS Services Catalog</span>
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('dimensions')}
                  className="h-8 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 gap-1"
                >
                  <span>Configure Dimensions & Units</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: COMMERCIAL MEASUREMENT UNITS & PHYSICAL DIMENSIONS */}
        {/* ======================================================== */}
        {activeTab === 'dimensions' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Commercial Measurement Units & Physical Dimensions
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Selling unit, roll widths & sheet sizes</span>
            </div>

            <div className="space-y-3.5">
              {/* 1. Commercial Measurement Units Card (Moved to Dimensions Tab) */}
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Commercial Measurement & Billing Units
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">
                    Pricing & Inventory Sync
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col justify-between">
                    <Label className="text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200 min-h-[34px] flex items-end">
                      <span>Selling Unit (গ্রাহক বিলিং একক) <span className="text-rose-500">*</span></span>
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

                  <div className="flex flex-col justify-between">
                    <Label className="text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200 min-h-[34px] flex items-end">
                      <span>Purchase / Stock Unit (ক্রয় ও স্টক একক) <span className="text-rose-500">*</span></span>
                    </Label>
                    <select
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
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
                    <Label className="text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200 min-h-[34px] flex items-end">
                      <span>Dimension Input Unit (কাস্টমার ইনপুট একক)</span>
                    </Label>
                    <select
                      value={dimensionUnit}
                      onChange={(e) => setDimensionUnit(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                    >
                      <option value="ft">Feet (ft) — Billboard & Signage</option>
                      <option value="inch">Inches (in) — Fine Format & Stickers</option>
                      <option value="meter">Meters (m) — Architectural</option>
                      <option value="mm">Millimeters (mm) — Precision Fab</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Customer Area & Billing Rules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col justify-between">
                  <Label className="text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200 min-h-[20px] flex items-end">
                    Min Billable Area / Qty Floor
                  </Label>
                  <div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0.1"
                        value={minBillableQty}
                        onChange={(e) => setMinBillableQty(parseFloat(e.target.value) || 1)}
                        className="h-9 text-xs font-mono pr-12"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-slate-400 font-bold uppercase">
                        {sellingUnit}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Minimum billable threshold protects against losing money on micro-prints.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <Label className="text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200 min-h-[20px] flex items-end">
                    Default Bleed / Edge Cut Margin
                  </Label>
                  <div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={productionBleedInches}
                        onChange={(e) => setProductionBleedInches(parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs font-mono pr-10"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-slate-400 font-bold">in</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Extra trim allowance per side added for production cutting.
                    </span>
                  </div>
                </div>
              </div>

              {/* Arbitrary Dimensions Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Allow Arbitrary Customer Dimensions
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Salesperson can enter any custom Width × Height (e.g. 4.5ft × 11.25ft) during quote creation
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowCustomDimensions}
                  onChange={(e) => setAllowCustomDimensions(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* ============================================================ */}
              {/* CONDITION A: PURCHASE UNIT = ROLL (AVAILABLE ROLL WIDTHS)   */}
              {/* ============================================================ */}
              {purchaseUnit === 'roll' && (
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-blue-200/60 dark:border-blue-800/60">
                    <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      <Boxes className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                        Roll Media Stock Widths, Length & Machine Extra Width (+0.25 ft)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Roll widths available in workshop stock. Nesting engine selects the optimal roll with minimum offcut waste.
                      </span>
                    </div>
                  </div>

                  {/* Inline Roll Width [ ] + [ ]    Roll Length [ ]    Add */}
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
                            value={newRollWidthInput}
                            onChange={(e) => setNewRollWidthInput(e.target.value)}
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
                            onChange={(e) => setExtraWidthAllowance(e.target.value)}
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
                            onChange={(e) => setStandardRollLength(e.target.value)}
                            className="h-9 text-xs font-mono font-bold pr-7"
                          />
                          <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">ft</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStandardRollLength('100')}
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
                          onClick={() => setStandardRollLength('164')}
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
                        onClick={handleAddCustomRollWidth}
                        className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>

                  {/* Configured Roll Sizes List */}
                  {availableRollWidths.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1">
                        Configured Roll Sizes:
                      </span>
                      {availableRollWidths.map((w) => (
                        <span
                          key={w}
                          onClick={() => setNewRollWidthInput(w.toString())}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white shadow-2xs hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
                          title="Click to edit this width"
                        >
                          <span>{w}ft {extraWidthAllowance !== '' && Number(extraWidthAllowance) > 0 ? `(+${extraWidthAllowance}ft)` : ''} × {standardRollLength}ft</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleRollWidth(w)
                            }}
                            className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer text-sm font-bold"
                            title="Remove width"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* CONDITION B: PURCHASE UNIT = SHEET (AVAILABLE SHEET SIZES)  */}
              {/* ============================================================ */}
              {purchaseUnit === 'sheet' && (
                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-indigo-200/60 dark:border-indigo-800/60">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        <Layers3 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                          Available Sheet / Board Dimensions (শীট সাইজ ও মাত্রা)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Select available rigid sheet stock sizes (e.g. 4ft × 8ft, 4ft × 6ft) for sheet nesting.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Standard Sheet Size Toggle Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wider block">
                      Standard Sheet Dimensions (Click to toggle):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {STANDARD_SHEET_SIZES.map((s, idx) => {
                        const isSelected = availableSheetSizes.some((x) => x.width === s.width && x.length === s.length)
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleToggleSheetSize(s)}
                            className={cn(
                              'text-xs px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1 cursor-pointer',
                              isSelected
                                ? 'bg-indigo-600 text-white font-bold border-indigo-700 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                            <span>{s.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Add Custom Sheet Size Form */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
                      Add Custom Sheet Size
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <Label className="text-[11px] mb-1 block">Width (ft)</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g. 4"
                          value={newSheetWidthInput}
                          onChange={(e) => setNewSheetWidthInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] mb-1 block">Length (ft)</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g. 8"
                          value={newSheetLengthInput}
                          onChange={(e) => setNewSheetLengthInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] mb-1 block">Sheet Label (Optional)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. 4ft x 8ft PVC Board"
                            value={newSheetLabelInput}
                            onChange={(e) => setNewSheetLabelInput(e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddCustomSheetSize}
                            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Sheet
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configured Sheet Sizes Summary */}
                  {availableSheetSizes.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        Configured Sheet Sizes ({availableSheetSizes.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availableSheetSizes.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {s.label || `${s.width}ft × ${s.length}ft`} <span className="text-[11px] text-slate-400 font-mono">({s.width * s.length} sqft)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSheetSize(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: COMPATIBLE RAW MEDIA & BLEEDS */}
        {/* ======================================================== */}
        {activeTab === 'materials' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Compatible Stock Media & Wastage Allowance
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
                    placeholder="Search raw material substrates..."
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
                    No matching substrates found in inventory stock.
                  </div>
                ) : (
                  filteredMaterials.map((mat) => {
                    const reqItem = requiredMaterials.find((m) => m.material_id === mat.id)
                    const isSelected = Boolean(reqItem)
                    const isPrimary = reqItem?.is_primary
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{mat.name}</span>
                            {isPrimary && (
                              <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 uppercase">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                            {mat.sku} • {(mat as any).purchase_unit || mat.unit || 'roll'}
                            {((mat as any).purchase_price || mat.cost_per_unit || mat.last_purchase_price) ? ` • ৳${(mat as any).purchase_price || mat.cost_per_unit || mat.last_purchase_price}/${(mat as any).purchase_unit || mat.unit || 'roll'}` : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && (
                            <button
                              type="button"
                              title={isPrimary ? 'Primary substrate' : 'Set as primary substrate'}
                              onClick={() => handleSetPrimaryMaterial(mat.id)}
                              className={cn(
                                'p-1.5 rounded-lg text-xs font-bold transition-all',
                                isPrimary ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' : 'text-slate-400 hover:text-amber-600'
                              )}
                            >
                              <Star className={cn('w-4 h-4', isPrimary && 'fill-amber-500')} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleMaterial(mat)}
                            className={cn(
                              'p-1.5 rounded-lg text-xs font-bold transition-all',
                              isSelected ? 'text-blue-600' : 'text-slate-400'
                            )}
                          >
                            {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Linked Ink & Consumables Formulation Summary */}
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-600/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Linked Ink & Consumables Formulation
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {linkedInkName || 'Default Printing Method Ink'} • Rate: ৳{Number(inkCost || 0).toFixed(2)} / {sellingUnit || 'sft'}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('basic')}
                  className="h-7 text-xs border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 cursor-pointer"
                >
                  Configure Ink in Tab 1
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: POST-PRESS FINISHING OPERATIONS */}
        {/* ======================================================== */}
        {activeTab === 'finishing' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Post-Press Finishing Operations
                </h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCustomFinishingForm(!showCustomFinishingForm)}
                className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Custom Finishing
              </Button>
            </div>

            {/* Inline Custom Finishing Form */}
            {showCustomFinishingForm && (
              <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2.5">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block uppercase">
                  Add Custom Finishing Option
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] mb-1 block">Finishing Name</Label>
                    <Input
                      placeholder="e.g. 50 Micron Matte Lamination, Ring Eyelet Every 2ft"
                      value={customFinishingName}
                      onChange={(e) => setCustomFinishingName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] mb-1 block">Pricing Method</Label>
                    <select
                      value={customFinishingMethod}
                      onChange={(e) => setCustomFinishingMethod(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-purple-300 bg-white dark:bg-slate-900 px-2"
                    >
                      <option value="per_sqft">Per Sqft</option>
                      <option value="per_piece">Per Piece</option>
                      <option value="per_rft">Per RFT</option>
                      <option value="fixed">Fixed Charge</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] mb-1 block">Price (৳)</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        placeholder="e.g. 8"
                        value={customFinishingPrice}
                        onChange={(e) => setCustomFinishingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCustomFinishing}
                        className="h-8 bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 text-xs"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {finishingMasterOptions.map((f) => {
                const selected = finishingOptions.find((x) => x.name === f.name)
                const isSelected = Boolean(selected)
                if (isSelected && selected) {
                  return (
                    <div
                      key={f.id}
                      className="p-2.5 rounded-xl border border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-1 ring-purple-500/50 shadow-xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{f.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleFinishing(f)}
                          className="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer rounded"
                          title="Remove finishing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline Price & Unit Customization */}
                      <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-purple-200/80 dark:border-purple-800/80" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <Label className="text-[10px] font-bold text-purple-900 dark:text-purple-200 mb-0.5 block uppercase">
                            Price (৳)
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-slate-400 font-bold text-[11px]">৳</span>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={selected.price}
                              onChange={(e) => updateFinishingOption(f.name, { price: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs pl-5 font-mono font-bold bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-[10px] font-bold text-purple-900 dark:text-purple-200 mb-0.5 block uppercase">
                            Billing Unit
                          </Label>
                          <select
                            value={selected.pricing_method || 'per_sqft'}
                            onChange={(e) => updateFinishingOption(f.name, { pricing_method: e.target.value })}
                            className="w-full h-7 text-xs rounded-md border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 px-1.5 font-medium text-purple-900 dark:text-purple-100"
                          >
                            <option value="per_sqft">Per Sqft (৳/sft)</option>
                            <option value="per_piece">Per Piece (৳/pcs)</option>
                            <option value="per_linear_ft">Per Linear Ft (৳/rft)</option>
                            <option value="per_rft">Per RFT (৳/rft)</option>
                            <option value="fixed">Fixed Charge (৳)</option>
                            <option value="per_job">Per Job (৳/job)</option>
                            <option value="per_hour">Per Hour (৳/hr)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={f.id}
                    onClick={() => handleToggleFinishing(f)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-400 dark:hover:border-purple-700 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{f.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatBDT(f.selling_price)} / {f.pricing_method || 'per_sqft'}
                      </span>
                    </div>
                    <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )
              })}

              {/* Custom Finishing Options */}
              {finishingOptions
                .filter((fo) => !finishingMasterOptions.some((m) => m.name === fo.name))
                .map((fo) => (
                  <div
                    key={fo.id || fo.name}
                    className="p-2.5 rounded-xl border border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-1 ring-purple-500/50 shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{fo.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFinishingOptions(finishingOptions.filter((x) => x.name !== fo.name))}
                        className="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-purple-200/80 dark:border-purple-800/80">
                      <div>
                        <Label className="text-[10px] font-bold text-purple-900 dark:text-purple-200 mb-0.5 block uppercase">
                          Price (৳)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 font-bold text-[11px]">৳</span>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={fo.price}
                            onChange={(e) => updateFinishingOption(fo.name, { price: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs pl-5 font-mono font-bold bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-purple-900 dark:text-purple-200 mb-0.5 block uppercase">
                          Billing Unit
                        </Label>
                        <select
                          value={fo.pricing_method || 'per_sqft'}
                          onChange={(e) => updateFinishingOption(fo.name, { pricing_method: e.target.value })}
                          className="w-full h-7 text-xs rounded-md border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 px-1.5 font-medium"
                        >
                          <option value="per_sqft">Per Sqft (৳/sft)</option>
                          <option value="per_piece">Per Piece (৳/pcs)</option>
                          <option value="per_linear_ft">Per Linear Ft (৳/rft)</option>
                          <option value="fixed">Fixed Charge (৳)</option>
                          <option value="per_job">Per Job (৳/job)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: PASTING & INSTALLATION ADD-ONS */}
        {/* ======================================================== */}
        {activeTab === 'additionals' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300 flex items-center justify-center font-bold text-xs">
                  5
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Board Pasting, Mounting & Site Installation
                </h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCustomAddonForm(!showCustomAddonForm)}
                className="h-7 text-xs border-cyan-300 text-cyan-700 hover:bg-cyan-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Custom Add-on
              </Button>
            </div>

            {/* Inline Custom Addon Form */}
            {showCustomAddonForm && (
              <div className="p-3.5 bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-xl space-y-2.5">
                <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200 block uppercase">
                  Add Custom Pasting or Installation Add-on
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <Label className="text-[11px] mb-1 block">Category</Label>
                    <select
                      value={customAddonType}
                      onChange={(e) => setCustomAddonType(e.target.value as any)}
                      className="w-full h-8 text-xs rounded-md border border-cyan-300 bg-white dark:bg-slate-900 px-2"
                    >
                      <option value="pasting">Board Pasting / Mounting</option>
                      <option value="installation">Site Installation</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] mb-1 block">Add-on Name</Label>
                    <Input
                      placeholder="e.g. 5mm Foam Board Pasting, Night Fitting"
                      value={customAddonName}
                      onChange={(e) => setCustomAddonName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] mb-1 block">Pricing Method</Label>
                    <select
                      value={customAddonMethod}
                      onChange={(e) => setCustomAddonMethod(e.target.value)}
                      className="w-full h-8 text-xs rounded-md border border-cyan-300 bg-white dark:bg-slate-900 px-2"
                    >
                      <option value="per_sqft">Per Sqft</option>
                      <option value="per_piece">Per Piece</option>
                      <option value="per_job">Per Job</option>
                      <option value="fixed">Fixed Charge</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] mb-1 block">Price (৳)</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        placeholder="e.g. 25"
                        value={customAddonPrice}
                        onChange={(e) => setCustomAddonPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCustomAddon}
                        className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-3 text-xs"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase mb-1.5">
                  Substrate Board Mounting & Pasting
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {additionalMasterOptions.map((a) => {
                    const selected = additionalOptions.find((x) => x.name === a.name)
                    const isSelected = Boolean(selected)
                    if (isSelected && selected) {
                      return (
                        <div
                          key={a.id}
                          className="p-2.5 rounded-xl border border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 ring-1 ring-cyan-500/50 shadow-xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-md bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white text-xs">{a.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleAdditional(a)}
                              className="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer rounded"
                              title="Remove mounting option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-cyan-200/80 dark:border-cyan-800/80" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <Label className="text-[10px] font-bold text-cyan-900 dark:text-cyan-200 mb-0.5 block uppercase">
                                Price (৳)
                              </Label>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-slate-400 font-bold text-[11px]">৳</span>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={selected.price}
                                  onChange={(e) => updateAdditionalOption(a.name, { price: parseFloat(e.target.value) || 0 })}
                                  className="h-7 text-xs pl-5 font-mono font-bold bg-white dark:bg-slate-900 border-cyan-300 dark:border-cyan-700 text-cyan-900 dark:text-cyan-100"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold text-cyan-900 dark:text-cyan-200 mb-0.5 block uppercase">
                                Billing Unit
                              </Label>
                              <select
                                value={selected.pricing_method || 'per_sqft'}
                                onChange={(e) => updateAdditionalOption(a.name, { pricing_method: e.target.value })}
                                className="w-full h-7 text-xs rounded-md border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-slate-900 px-1.5 font-medium text-cyan-900 dark:text-cyan-100"
                              >
                                <option value="per_sqft">Per Sqft (৳/sft)</option>
                                <option value="per_piece">Per Piece (৳/pcs)</option>
                                <option value="per_rft">Per RFT (৳/rft)</option>
                                <option value="fixed">Fixed Charge (৳)</option>
                                <option value="per_job">Per Job (৳/job)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={a.id}
                        onClick={() => handleToggleAdditional(a)}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-400 dark:hover:border-cyan-700 transition-all cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{a.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatBDT(a.selling_price)} / {a.pricing_method}
                          </span>
                        </div>
                        <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )
                  })}

                  {/* Custom Additional Options */}
                  {additionalOptions
                    .filter((ao) => !additionalMasterOptions.some((m) => m.name === ao.name))
                    .map((ao) => (
                      <div
                        key={ao.id || ao.name}
                        className="p-2.5 rounded-xl border border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 ring-1 ring-cyan-500/50 shadow-xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-md bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{ao.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdditionalOptions(additionalOptions.filter((x) => x.name !== ao.name))}
                            className="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-cyan-200/80 dark:border-cyan-800/80">
                          <div>
                            <Label className="text-[10px] font-bold text-cyan-900 dark:text-cyan-200 mb-0.5 block uppercase">
                              Price (৳)
                            </Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400 font-bold text-[11px]">৳</span>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={ao.price}
                                onChange={(e) => updateAdditionalOption(ao.name, { price: parseFloat(e.target.value) || 0 })}
                                className="h-7 text-xs pl-5 font-mono font-bold bg-white dark:bg-slate-900 border-cyan-300 dark:border-cyan-700"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-cyan-900 dark:text-cyan-200 mb-0.5 block uppercase">
                              Billing Unit
                            </Label>
                            <select
                              value={ao.pricing_method || 'per_sqft'}
                              onChange={(e) => updateAdditionalOption(ao.name, { pricing_method: e.target.value })}
                              className="w-full h-7 text-xs rounded-md border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-slate-900 px-1.5 font-medium"
                            >
                              <option value="per_sqft">Per Sqft (৳/sft)</option>
                              <option value="per_piece">Per Piece (৳/pcs)</option>
                              <option value="per_rft">Per RFT (৳/rft)</option>
                              <option value="fixed">Fixed Charge (৳)</option>
                              <option value="per_job">Per Job (৳/job)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase mb-1.5">
                  Site Installation, Fitting & Delivery
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {installationMasterOptions.map((inst) => {
                    const selected = installationOptions.find((x) => x.name === inst.name)
                    const isSelected = Boolean(selected)
                    if (isSelected && selected) {
                      return (
                        <div
                          key={inst.id}
                          className="p-2.5 rounded-xl border border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-500/50 shadow-xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white text-xs">{inst.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleInstallation(inst)}
                              className="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer rounded"
                              title="Remove installation option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-indigo-200/80 dark:border-indigo-800/80" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <Label className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 mb-0.5 block uppercase">
                                Price (৳)
                              </Label>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-slate-400 font-bold text-[11px]">৳</span>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={selected.price}
                                  onChange={(e) => updateInstallationOption(inst.name, { price: parseFloat(e.target.value) || 0 })}
                                  className="h-7 text-xs pl-5 font-mono font-bold bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 mb-0.5 block uppercase">
                                Billing Unit
                              </Label>
                              <select
                                value={selected.pricing_method || 'fixed'}
                                onChange={(e) => updateInstallationOption(inst.name, { pricing_method: e.target.value })}
                                className="w-full h-7 text-xs rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-1.5 font-medium text-indigo-900 dark:text-indigo-100"
                              >
                                <option value="fixed">Fixed Charge (৳)</option>
                                <option value="per_sqft">Per Sqft (৳/sft)</option>
                                <option value="per_piece">Per Piece (৳/pcs)</option>
                                <option value="per_job">Per Job (৳/job)</option>
                                <option value="per_hour">Per Hour (৳/hr)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={inst.id}
                        onClick={() => handleToggleInstallation(inst)}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-700 transition-all cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{inst.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatBDT(inst.selling_price)} / {inst.pricing_method}
                          </span>
                        </div>
                        <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )
                  })}

                  {/* Custom Installation Options */}
                  {installationOptions
                    .filter((io) => !installationMasterOptions.some((m) => m.name === io.name))
                    .map((io) => (
                      <div
                        key={io.id || io.name}
                        className="p-2.5 rounded-xl border border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-500/50 shadow-xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{io.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInstallationOptions(installationOptions.filter((x) => x.name !== io.name))}
                            className="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-indigo-200/80 dark:border-indigo-800/80">
                          <div>
                            <Label className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 mb-0.5 block uppercase">
                              Price (৳)
                            </Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400 font-bold text-[11px]">৳</span>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={io.price}
                                onChange={(e) => updateInstallationOption(io.name, { price: parseFloat(e.target.value) || 0 })}
                                className="h-7 text-xs pl-5 font-mono font-bold bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 mb-0.5 block uppercase">
                              Billing Unit
                            </Label>
                            <select
                              value={io.pricing_method || 'fixed'}
                              onChange={(e) => updateInstallationOption(io.name, { pricing_method: e.target.value })}
                              className="w-full h-7 text-xs rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-1.5 font-medium"
                            >
                              <option value="fixed">Fixed Charge (৳)</option>
                              <option value="per_sqft">Per Sqft (৳/sft)</option>
                              <option value="per_piece">Per Piece (৳/pcs)</option>
                              <option value="per_job">Per Job (৳/job)</option>
                              <option value="per_hour">Per Hour (৳/hr)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: COMMERCIAL PRICING, CUSTOMER TIERS & MARGINS */}
        {/* ======================================================== */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 animate-in fade-in-0">
            {/* 1. Base Rates & Commercial Selling Price */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Commercial Selling Rate & Job Floor
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono py-0.5 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                  Billing Unit: {sellingUnit ? sellingUnit.toUpperCase() : 'SFT'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex flex-col justify-between">
                  <Label className="text-xs font-semibold mb-1 text-slate-900 dark:text-white min-h-[20px] flex items-end">
                    <span>Base Selling Rate (৳ / {sellingUnit ? sellingUnit.toUpperCase() : 'SFT'}) <span className="text-rose-500">*</span></span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 45.00"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      required
                      className="pl-7 h-9 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <Label className="text-xs font-semibold mb-1 text-slate-900 dark:text-white min-h-[20px] flex items-end">
                    <span>Minimum Order Charge (৳ Floor)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 150.00"
                      value={minimumCharge}
                      onChange={(e) => setMinimumCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-7 h-9 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <Label className="text-xs font-semibold mb-1 text-slate-900 dark:text-white min-h-[20px] flex items-end">
                    <span>Target Gross Margin (%)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 35)}
                      className="h-9 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <Label className="text-xs font-semibold mb-1 text-slate-900 dark:text-white min-h-[20px] flex items-end">
                    <span>Minimum Allowed Margin (%)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={minAllowedMargin}
                      onChange={(e) => setMinAllowedMargin(parseFloat(e.target.value) || 15)}
                      className="h-9 text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">%</span>
                  </div>
                </div>
              </div>

              {/* Tax & VAT settings inline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <input
                    type="checkbox"
                    id="vat-check-service"
                    checked={vatApplicable}
                    onChange={(e) => setVatApplicable(e.target.checked)}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                  <Label htmlFor="vat-check-service" className="text-xs font-medium cursor-pointer">
                    VAT Applicable
                  </Label>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <input
                    type="checkbox"
                    id="tax-inc-check-service"
                    checked={isTaxInclusive}
                    onChange={(e) => setIsTaxInclusive(e.target.checked)}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                  <Label htmlFor="tax-inc-check-service" className="text-xs font-medium cursor-pointer">
                    Tax-Inclusive Price
                  </Label>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <Label className="text-xs font-medium whitespace-nowrap">Tax Rate:</Label>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      disabled={!vatApplicable && !isTaxInclusive}
                      className="h-7 text-xs font-mono font-bold"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-400 text-xs">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Comprehensive Direct Cost Breakdown (প্রত্যক্ষ উৎপাদন খরচ বিশ্লেষণ) */}
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900/80 p-4 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Direct Unit Cost Breakdown (প্রত্যক্ষ উৎপাদন খরচ বিশ্লেষণ)
                      </h3>
                      <Badge variant="outline" className="text-[10px] font-mono py-0.5 px-2 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300">
                        9 Cost Heads
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Configure granular cost components for substrate, ink, machine depreciation, labor & post-press per {sellingUnit || 'unit'}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-right">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold uppercase tracking-wider">Total Direct Cost</span>
                    <span className="text-sm font-mono font-bold text-emerald-800 dark:text-emerald-200">
                      ৳{totalDirectCost.toFixed(2)} / {sellingUnit || 'sft'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Cost Breakdown Preset Bar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs">
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cost Presets:</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyCostPreset('standard_roll')}
                  className="h-6 text-[10px] px-2 font-semibold bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer"
                >
                  Standard Flex/Vinyl Roll
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyCostPreset('uv_rigid')}
                  className="h-6 text-[10px] px-2 font-semibold bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer"
                >
                  UV Flatbed / Rigid Board
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyCostPreset('signage_fabrication')}
                  className="h-6 text-[10px] px-2 font-semibold bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer"
                >
                  Signage & Lightbox Fabrication
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyCostPreset('zero_extras')}
                  className="h-6 text-[10px] px-2 font-semibold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Extra Heads
                </Button>
              </div>

              {/* 9 Interactive Direct Cost Input Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Substrate Media Cost */}
                <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-indigo-950 dark:text-indigo-200">
                      <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                      <Label className="text-xs font-bold">1. Substrate Media (মিডিয়া)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={materialCost !== '' ? materialCost : (purchasePrice !== '' ? purchasePrice : baseCostEstimate)}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                        setMaterialCost(val)
                        setPurchasePrice(val)
                        setBaseCostEstimate(val)
                      }}
                      className="pl-6 h-8 text-xs font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Roll media or board raw substrate cost
                  </p>
                </div>

                {/* 2. Ink & Liquid Consumables */}
                <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/30 dark:bg-blue-950/20 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-950 dark:text-blue-200">
                      <Droplets className="w-3.5 h-3.5 text-blue-600" />
                      <Label className="text-xs font-bold">2. Linked Ink (কালি ও লিকুইড)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={inkCost}
                      onChange={(e) => {
                        setInkCost(e.target.value === '' ? '' : parseFloat(e.target.value))
                        setInkCostMode('custom')
                      }}
                      className="pl-6 h-8 text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Eco-Solvent / UV ink & primer per unit
                  </p>
                </div>

                {/* 3. Machine Depreciation & Power */}
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/20 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-950 dark:text-amber-200">
                      <Settings2 className="w-3.5 h-3.5 text-amber-600" />
                      <Label className="text-xs font-bold">3. Machine Depr. (মেশিন অবচয়)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={machineCost}
                      onChange={(e) => setMachineCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-6 h-8 text-xs font-mono font-bold text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Printhead amortization, electricity & maintenance
                  </p>
                </div>

                {/* 4. Direct Labor & Operator */}
                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-950 dark:text-emerald-200">
                      <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                      <Label className="text-xs font-bold">4. Operator Labor (মজুরি)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={laborCost}
                      onChange={(e) => setLaborCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-6 h-8 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Technician & printer helper direct wages
                  </p>
                </div>

                {/* 5. Base Finishing & Post-Press */}
                <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/30 dark:bg-purple-950/20 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-purple-950 dark:text-purple-200">
                      <Scissors className="w-3.5 h-3.5 text-purple-600" />
                      <Label className="text-xs font-bold">5. Base Finishing (ফিনিশিং)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={finishingCost}
                      onChange={(e) => setFinishingCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-6 h-8 text-xs font-mono font-bold text-purple-800 dark:text-purple-300 bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Eyelet, hemming, trim cutting included in base
                  </p>
                </div>

                {/* 6. Fabrication & Structure */}
                <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800/80 bg-orange-50/30 dark:bg-orange-950/20 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-orange-950 dark:text-orange-200">
                      <Building className="w-3.5 h-3.5 text-orange-600" />
                      <Label className="text-xs font-bold">6. Fabrication (ফ্যাব্রিকেশন)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={fabricationCost}
                      onChange={(e) => setFabricationCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-6 h-8 text-xs font-mono font-bold text-orange-800 dark:text-orange-300 bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    MS frame, acrylic bending & channel work
                  </p>
                </div>

                {/* 7. Site Installation & Mounting */}
                <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/30 dark:bg-sky-950/20 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sky-950 dark:text-sky-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      <Label className="text-xs font-bold">7. Site Install (ইনস্টলেশন)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={installationCost}
                      onChange={(e) => setInstallationCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-6 h-8 text-xs font-mono font-bold text-sky-800 dark:text-sky-300 bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Field installation, scaffolding & mounting
                  </p>
                </div>

                {/* 8. Delivery & Packaging */}
                <div className="p-3 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/30 dark:bg-teal-950/20 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-teal-950 dark:text-teal-200">
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <Label className="text-xs font-bold">8. Delivery & Pack (প্যাকিং)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={deliveryCost}
                      onChange={(e) => setDeliveryCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-6 h-8 text-xs font-mono font-bold text-teal-800 dark:text-teal-300 bg-white dark:bg-slate-900 border-teal-200 dark:border-teal-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Bubble wrap, carton packing & local cartage
                  </p>
                </div>

                {/* 9. Other Direct Overhead */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-200">
                      <Coins className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <Label className="text-xs font-bold">9. Other Direct (অন্যান্য)</Label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">৳/{sellingUnit || 'sft'}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={otherDirectCost}
                      onChange={(e) => setOtherDirectCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-6 h-8 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Wipers, solvent cleaners & shop consumables
                  </p>
                </div>
              </div>

              {/* Dynamic Visual Proportional Breakdown Bar & Formula Summary */}
              {(() => {
                const subCost = Number(materialCost !== '' ? materialCost : (purchasePrice !== '' ? purchasePrice : baseCostEstimate)) || 0
                const inkC = Number(inkCost) || 0
                const machC = Number(machineCost) || 0
                const labC = Number(laborCost) || 0
                const finC = Number(finishingCost) || 0
                const fabC = Number(fabricationCost) || 0
                const instC = Number(installationCost) || 0
                const delC = Number(deliveryCost) || 0
                const othC = Number(otherDirectCost) || 0
                const total = subCost + inkC + machC + labC + finC + fabC + instC + delC + othC

                const items = [
                  { name: 'Substrate', bn: 'মিডিয়া', amount: subCost, color: 'bg-indigo-500', textColor: 'text-indigo-700 dark:text-indigo-300', bgBadge: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800' },
                  { name: 'Ink', bn: 'কালি', amount: inkC, color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300', bgBadge: 'bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:border-blue-800' },
                  { name: 'Machine', bn: 'মেশিন', amount: machC, color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300', bgBadge: 'bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800' },
                  { name: 'Labor', bn: 'মজুরি', amount: labC, color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-300', bgBadge: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800' },
                  { name: 'Finishing', bn: 'ফিনিশিং', amount: finC, color: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-300', bgBadge: 'bg-purple-50 border-purple-200 dark:bg-purple-950/60 dark:border-purple-800' },
                  { name: 'Fabrication', bn: 'ফ্যাব্রিকেশন', amount: fabC, color: 'bg-orange-500', textColor: 'text-orange-700 dark:text-orange-300', bgBadge: 'bg-orange-50 border-orange-200 dark:bg-orange-950/60 dark:border-orange-800' },
                  { name: 'Installation', bn: 'ইনস্টলেশন', amount: instC, color: 'bg-sky-500', textColor: 'text-sky-700 dark:text-sky-300', bgBadge: 'bg-sky-50 border-sky-200 dark:bg-sky-950/60 dark:border-sky-800' },
                  { name: 'Delivery', bn: 'ডেলিভারি', amount: delC, color: 'bg-teal-500', textColor: 'text-teal-700 dark:text-teal-300', bgBadge: 'bg-teal-50 border-teal-200 dark:bg-teal-950/60 dark:border-teal-800' },
                  { name: 'Other', bn: 'অন্যান্য', amount: othC, color: 'bg-slate-500', textColor: 'text-slate-700 dark:text-slate-300', bgBadge: 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
                ].filter((x) => x.amount > 0)

                return (
                  <div className="space-y-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                    {/* Visual Proportional Multi-Segment Progress Bar */}
                    {total > 0 && items.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                            Cost Distribution Share (%)
                          </span>
                          <span className="font-mono text-slate-600 dark:text-slate-400">
                            {items.length} active cost head{items.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex ring-1 ring-slate-200 dark:ring-slate-700">
                          {items.map((it, idx) => {
                            const pct = (it.amount / total) * 100
                            return (
                              <div
                                key={idx}
                                style={{ width: `${pct}%` }}
                                className={cn('h-full transition-all duration-300', it.color)}
                                title={`${it.name}: ৳${it.amount.toFixed(2)} (${pct.toFixed(1)}%)`}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Proportional Cost Breakdown Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      {items.map((it, idx) => {
                        const pct = total > 0 ? (it.amount / total) * 100 : 0
                        return (
                          <span
                            key={idx}
                            className={cn(
                              'px-2 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1',
                              it.bgBadge,
                              it.textColor
                            )}
                          >
                            <span>{it.name}:</span>
                            <span className="font-bold">৳{it.amount.toFixed(2)}</span>
                            <span className="text-[10px] opacity-75">({pct.toFixed(0)}%)</span>
                          </span>
                        )
                      })}

                      <span className="ml-auto bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold text-xs flex items-center gap-1">
                        <span>Total Direct Cost:</span>
                        <span>৳{total.toFixed(2)} / {sellingUnit || 'sft'}</span>
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* 3. Live Profitability & Margin Economics */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Live Profitability & Margin Economics (লাভ ও মার্জিন বিশ্লেষণ)</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-mono uppercase px-2 py-0.5 font-bold',
                    marginMetrics.grossMarginPercent >= targetMargin
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : marginMetrics.grossMarginPercent >= minAllowedMargin
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                      : marginMetrics.grossMarginPercent < 0
                      ? 'bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-200'
                      : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                  )}
                >
                  {marginMetrics.grossMarginPercent >= targetMargin
                    ? `✓ Target Margin Met (≥ ${targetMargin}%)`
                    : marginMetrics.grossMarginPercent >= minAllowedMargin
                    ? `Acceptable Margin (≥ ${minAllowedMargin}%)`
                    : marginMetrics.grossMarginPercent < 0
                    ? `⚠ Loss Warning (${marginMetrics.grossMarginPercent.toFixed(1)}%)`
                    : `⚠ Low Margin Risk (< ${minAllowedMargin}%)`}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Est. Gross Profit</span>
                  <span className={cn(
                    'text-sm font-mono font-bold block mt-0.5',
                    marginMetrics.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {formatBDT(marginMetrics.grossProfit)} / {sellingUnit || 'sft'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Gross Margin</span>
                  <span className={cn(
                    'text-sm font-mono font-bold block mt-0.5',
                    marginMetrics.grossMarginPercent >= targetMargin
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : marginMetrics.grossMarginPercent >= minAllowedMargin
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {marginMetrics.grossMarginPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Markup Ratio</span>
                  <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400 block mt-0.5">
                    {marginMetrics.markupPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Min Job Floor</span>
                  <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {formatBDT(Number(minimumCharge) || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Customer Segment Tier Pricing */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Customer Segment Tier Pricing (গ্রাহক শ্রেণিভিত্তিক রেট)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Auto-applied when selecting customer during Quotation, Invoice & POS creation.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAutoFillTiers('standard')}
                    className="h-7 text-[11px] px-2.5 font-bold border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300"
                  >
                    <Sparkles className="w-3 h-3 mr-1" /> Standard Discounts
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAutoFillTiers('reset')}
                    className="h-7 text-[11px] px-2 text-slate-500 hover:text-slate-800"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Retail */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Retail / Walk-in (খুচরা)
                    </Label>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                      Catalog
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Base price"
                      value={priceTiers.retail}
                      onChange={(e) => setPriceTiers({ ...priceTiers, retail: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="pl-6 h-8 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Reseller / Subcontractor */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Reseller / Press Sub (রিসেলার)
                    </Label>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase bg-blue-50 text-blue-700 border-blue-200">
                      -15%
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Reseller rate"
                      value={priceTiers.reseller}
                      onChange={(e) => setPriceTiers({ ...priceTiers, reseller: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="pl-6 h-8 text-xs font-mono font-bold text-blue-600"
                    />
                  </div>
                </div>

                {/* Corporate Account */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Corporate (কর্পোরেট)
                    </Label>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase bg-purple-50 text-purple-700 border-purple-200">
                      -10%
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Corporate rate"
                      value={priceTiers.corporate}
                      onChange={(e) => setPriceTiers({ ...priceTiers, corporate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="pl-6 h-8 text-xs font-mono font-bold text-purple-600"
                    />
                  </div>
                </div>

                {/* Agency & Design Partner */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Agency (বিজ্ঞাপন সংস্থা)
                    </Label>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase bg-amber-50 text-amber-700 border-amber-200">
                      -20%
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Agency partner rate"
                      value={priceTiers.agency}
                      onChange={(e) => setPriceTiers({ ...priceTiers, agency: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="pl-6 h-8 text-xs font-mono font-bold text-amber-600"
                    />
                  </div>
                </div>

                {/* Regular / Loyal */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Regular Client (নিয়মিত খদ্দের)
                    </Label>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase bg-indigo-50 text-indigo-700 border-indigo-200">
                      -5%
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Regular rate"
                      value={priceTiers.regular}
                      onChange={(e) => setPriceTiers({ ...priceTiers, regular: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="pl-6 h-8 text-xs font-mono font-bold text-indigo-600"
                    />
                  </div>
                </div>

                {/* Custom / Tender */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tender / Special Rate
                    </Label>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase bg-rose-50 text-rose-700 border-rose-200">
                      Special
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Special contract rate"
                      value={priceTiers.custom}
                      onChange={(e) => setPriceTiers({ ...priceTiers, custom: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="pl-6 h-8 text-xs font-mono font-bold text-rose-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Tax & Sales Override Rules */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  NBR Tax, VAT & Salesperson Governance
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      VAT Applicable
                    </Label>
                    <span className="text-[10px] text-slate-500">Add VAT to invoices</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={vatApplicable}
                    onChange={(e) => setVatApplicable(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Price Includes VAT
                    </Label>
                    <span className="text-[10px] text-slate-500">Tax inclusive pricing</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isTaxInclusive}
                    onChange={(e) => setIsTaxInclusive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Salesperson Override
                    </Label>
                    <span className="text-[10px] text-slate-500">Allow manual rate change</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowManualOverride}
                    onChange={(e) => setAllowManualOverride(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STANDARDIZED BOTTOM ACTION BAR WITH STEPPER NAVIGATION */}
        {/* ======================================================== */}
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeTab !== 'basic' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'dimensions') setActiveTab('basic')
                  else if (activeTab === 'materials') setActiveTab('dimensions')
                  else if (activeTab === 'finishing') setActiveTab('materials')
                  else if (activeTab === 'additionals') setActiveTab('finishing')
                  else if (activeTab === 'pricing') setActiveTab('additionals')
                }}
                className="h-10 px-3.5 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1"
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
                  if (activeTab === 'basic') setActiveTab('dimensions')
                  else if (activeTab === 'dimensions') setActiveTab('materials')
                  else if (activeTab === 'materials') setActiveTab('finishing')
                  else if (activeTab === 'finishing') setActiveTab('additionals')
                  else if (activeTab === 'additionals') setActiveTab('pricing')
                }}
                className="h-10 px-4 rounded-xl font-bold border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1"
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
                  <span>{initialData ? 'Update Printing Service' : 'Save Printing Service'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}

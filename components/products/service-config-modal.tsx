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
} from 'lucide-react'
import type {
  ProductRecord,
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

const POPULAR_PRINT_PRESETS: { width: number; length: number; label: string }[] = [
  { width: 4, length: 12, label: '4ft × 12ft (Shop Signboard)' },
  { width: 2.5, length: 6, label: '2.5ft × 6ft (X-Stand Banner)' },
  { width: 3, length: 2, label: '3ft × 2ft (Standard Poster)' },
  { width: 8, length: 4, label: '8ft × 4ft (Full Sheet Board)' },
  { width: 10, length: 20, label: '10ft × 20ft (Mega Billboard)' },
  { width: 6, length: 3, label: '6ft × 3ft (Trade Fair Backdrop)' },
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

  // 1. Basic Information
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('printing_service')
  const [printingMethodName, setPrintingMethodName] = useState('')
  const [sellingUnit, setSellingUnit] = useState<string>('sft')
  const [purchaseUnit, setPurchaseUnit] = useState<string>('roll')
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('per_area')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // 2. Customer Dimensions & Presets
  const [dimensionUnit, setDimensionUnit] = useState<string>('ft')
  const [allowCustomDimensions, setAllowCustomDimensions] = useState(true)
  const [minBillableQty, setMinBillableQty] = useState<number>(1)
  const [productionBleedInches, setProductionBleedInches] = useState<number>(0.5)
  const [presets, setPresets] = useState<ServiceDimensionPreset[]>([])
  const [newPresetWidth, setNewPresetWidth] = useState<number | ''>('')
  const [newPresetLength, setNewPresetLength] = useState<number | ''>('')
  const [newPresetLabel, setNewPresetLabel] = useState('')

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
  const [minimumCharge, setMinimumCharge] = useState<number | ''>('')
  const [baseCostEstimate, setBaseCostEstimate] = useState<number | ''>('')
  const [targetMargin, setTargetMargin] = useState<number>(35)
  const [minAllowedMargin, setMinAllowedMargin] = useState<number>(15)
  const [allowManualOverride, setAllowManualOverride] = useState(true)

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
      setBaseCostEstimate(initialData.base_cost || '')
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
      setPrintingMethodName((initialData as any).printing_method_name || (initialData as any).printing_method || '')
      setDimensionUnit(cfg.dimension_unit || 'ft')
      setAllowCustomDimensions(cfg.allow_custom_dimensions !== false)
      setPresets(cfg.dimension_presets || cfg.presets || [])
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
      setPrintingMethodName(printingMethods[0]?.name || 'Eco-Solvent')
      setSellingUnit('sft')
      setPurchaseUnit('roll')
      setSellingPrice('')
      setBaseCostEstimate('')
      setIsActive(true)
      setDescription('')
      setPricingMethod('per_area')
      setDimensionUnit('ft')
      setAllowCustomDimensions(true)
      setMinBillableQty(1)
      setProductionBleedInches(0.5)
      setDefaultWastagePercent(5)
      setPresets([
        { width: 4, length: 12, label: '4ft × 12ft (Shop Signboard)' },
        { width: 2.5, length: 6, label: '2.5ft × 6ft (X-Stand Banner)' },
        { width: 3, length: 2, label: '3ft × 2ft (Standard Poster)' },
        { width: 8, length: 4, label: '8ft × 4ft (Full Board)' },
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
  }, [initialData, isOpen, printingMethods])

  // Live Gross Margin Analysis
  const marginMetrics = useMemo(() => {
    const cost = Number(baseCostEstimate) || 0
    const sp = Number(sellingPrice) || 0
    return calculateGrossMargin(cost, sp)
  }, [baseCostEstimate, sellingPrice])

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

  const handleAddPreset = () => {
    if (newPresetWidth === '' || newPresetLength === '') return
    const w = Number(newPresetWidth)
    const l = Number(newPresetLength)
    const label = newPresetLabel.trim() || `${w}ft × ${l}ft`
    setPresets([...presets, { width: w, length: l, label }])
    setNewPresetWidth('')
    setNewPresetLength('')
    setNewPresetLabel('')
  }

  const handleAddQuickPreset = (p: { width: number; length: number; label: string }) => {
    const exists = presets.some((x) => x.width === p.width && x.length === p.length)
    if (!exists) {
      setPresets([...presets, { width: p.width, length: p.length, label: p.label }])
    }
  }

  const handleRemovePreset = (idx: number) => {
    setPresets(presets.filter((_, i) => i !== idx))
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

      const serviceConfig: ServiceConfiguration = {
        dimension_unit: dimensionUnit,
        allow_custom_dimensions: allowCustomDimensions,
        dimension_presets: presets,
        presets: presets,
        required_materials: requiredMaterials,
        finishing_options: finishingOptions,
        additional_options: additionalOptions,
        installation_options: installationOptions,
        minimum_charge: minimumCharge !== '' ? Number(minimumCharge) : undefined,
        min_charge: minimumCharge !== '' ? Number(minimumCharge) : undefined,
        min_billable_qty: minBillableQty,
        pricing_method: pricingMethod,
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
        selling_price: sp,
        base_cost: baseCostEstimate !== '' ? Number(baseCostEstimate) : 0,
        cost_basis_type: 'direct_cost',
        price_tiers: finalPriceTiers,
        target_margin_percentage: Number(targetMargin) || 35.0,
        min_allowed_margin_percent: Number(minAllowedMargin) || 15.0,
        min_billable_quantity: minBillableQty,
        default_wastage_percentage: defaultWastagePercent,
        production_width_allowance: productionBleedInches,
        production_length_allowance: productionBleedInches,
        allowance_unit: 'inch',
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
              Multi-step configuration for wide format print technology, size rules, substrate feeds, post-press finishing & commercial tiers.
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
            { id: 'dimensions', label: '2. Dimensions', icon: Maximize2, count: presets.length > 0 ? presets.length : null },
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
              <span className="text-[11px] text-slate-400 font-medium">Bilingual naming & units</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Printing Method (Technology)
                  </Label>
                  <select
                    value={printingMethodName}
                    onChange={(e) => setPrintingMethodName(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium"
                  >
                    <option value="">-- Select Printing Method --</option>
                    {printingMethods.map((pm) => (
                      <option key={pm.id} value={pm.name}>
                        {pm.name} {pm.name_bn ? `(${pm.name_bn})` : ''}
                      </option>
                    ))}
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

              {/* Selling & Purchase Unit Dual Mapping */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Commercial Measurement Units
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 border-blue-200">
                    Pricing & Inventory Sync
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Selling Unit (গ্রাহক বিলিং একক) <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={sellingUnit}
                      onChange={(e) => {
                        const u = e.target.value
                        setSellingUnit(u)
                        const match = COMMON_SELLING_UNITS.find((x) => x.value === u)
                        if (match) setPricingMethod(match.defaultMethod)
                      }}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                    >
                      {COMMON_SELLING_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-slate-800 dark:text-slate-200">
                      Purchase / Stock Media Unit (ক্রয় ও স্টক একক)
                    </Label>
                    <select
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                    >
                      {COMMON_PURCHASE_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Service Scope & Technical Description
                </Label>
                <textarea
                  rows={2}
                  placeholder="e.g. High resolution 1440 DPI outdoor UV curing print. UV resistant for up to 3 years without color fading..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
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
                  <span>Active in Quotation, Invoice & POS Services Catalog</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CUSTOMER DIMENSIONS, MIN BILLABLE & PRESETS */}
        {/* ======================================================== */}
        {activeTab === 'dimensions' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs animate-in fade-in-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Customer Dimension Rules & Size Presets
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Area thresholds & quick sizes</span>
            </div>

            <div className="space-y-3.5">
              {/* Rules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Dimension Input Unit</Label>
                  <select
                    value={dimensionUnit}
                    onChange={(e) => setDimensionUnit(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                  >
                    <option value="ft">Feet (ft) — Billboard & Signage</option>
                    <option value="inch">Inches (in) — Fine Format & Stickers</option>
                    <option value="meter">Meters (m) — Architectural</option>
                    <option value="mm">Millimeters (mm) — Precision Fab</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Min Billable Area / Qty
                  </Label>
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
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Default Bleed / Edge Cut
                  </Label>
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

              {/* Quick Template Picker */}
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 block uppercase">
                  Popular Standard Print Sizes (Click to add)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_PRINT_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddQuickPreset(p)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 hover:border-blue-400 text-slate-800 dark:text-slate-200 font-medium transition-all shadow-2xs hover:bg-blue-50 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-blue-600" />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Size Preset Creator */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
                  Add Custom Size Preset
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <Label className="text-[11px] mb-1 block">Width ({dimensionUnit})</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 4"
                      value={newPresetWidth}
                      onChange={(e) => setNewPresetWidth(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] mb-1 block">Length ({dimensionUnit})</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 12"
                      value={newPresetLength}
                      onChange={(e) => setNewPresetLength(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] mb-1 block">Preset Label (Optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="e.g. 4ft x 12ft Billboard"
                        value={newPresetLabel}
                        onChange={(e) => setNewPresetLabel(e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddPreset}
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </div>

                {presets.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Configured Presets ({presets.length}):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {presets.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.label} <span className="text-[11px] text-slate-400 font-mono">({p.width}×{p.length} {dimensionUnit})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePreset(idx)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {finishingMasterOptions.map((f) => {
                const isSelected = finishingOptions.some((x) => x.name === f.name)
                return (
                  <div
                    key={f.id}
                    onClick={() => handleToggleFinishing(f)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs',
                      isSelected
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-1 ring-purple-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    )}
                  >
                    <div>
                      <span className="font-bold block">{f.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatBDT(f.selling_price)} / {f.pricing_method}
                      </span>
                    </div>
                    {isSelected ? <Check className="w-4 h-4 text-purple-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                  </div>
                )
              })}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {additionalMasterOptions.map((a) => {
                    const isSelected = additionalOptions.some((x) => x.name === a.name)
                    return (
                      <div
                        key={a.id}
                        onClick={() => handleToggleAdditional(a)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs',
                          isSelected
                            ? 'border-cyan-600 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 ring-1 ring-cyan-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        )}
                      >
                        <div>
                          <span className="font-bold block">{a.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatBDT(a.selling_price)} / {a.pricing_method}
                          </span>
                        </div>
                        {isSelected ? <Check className="w-4 h-4 text-cyan-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase mb-1.5">
                  Site Installation, Fitting & Delivery
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {installationMasterOptions.map((inst) => {
                    const isSelected = installationOptions.some((x) => x.name === inst.name)
                    return (
                      <div
                        key={inst.id}
                        onClick={() => handleToggleInstallation(inst)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        )}
                      >
                        <div>
                          <span className="font-bold block">{inst.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatBDT(inst.selling_price)} / {inst.pricing_method}
                          </span>
                        </div>
                        {isSelected ? <Check className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                      </div>
                    )
                  })}
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
            {/* 1. Base Rates & Job Floor */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Commercial Selling Rate & Job Floor
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Base Selling Rate (৳ / {sellingUnit ? sellingUnit.toUpperCase() : 'SFT'}) <span className="text-rose-500">*</span>
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

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Minimum Order Charge (৳ Floor)
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
                      className="pl-7 h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Base Material Cost Basis (৳ / {sellingUnit})
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 24.00"
                      value={baseCostEstimate}
                      onChange={(e) => setBaseCostEstimate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-7 h-9 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Live Yield & Margin Economics */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Live Profitability & Margin Economics</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono uppercase px-2 py-0.5',
                      marginMetrics.grossMarginPercent >= targetMargin
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : marginMetrics.grossMarginPercent >= minAllowedMargin
                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                    )}
                  >
                    {marginMetrics.grossMarginPercent >= targetMargin
                      ? 'Target Margin Met'
                      : marginMetrics.grossMarginPercent >= minAllowedMargin
                      ? 'Acceptable Margin'
                      : 'Low Margin Risk'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block uppercase">Est. Gross Profit</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(marginMetrics.grossProfit)} / {sellingUnit}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block uppercase">Gross Margin</span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {marginMetrics.grossMarginPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block uppercase">Markup Ratio</span>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      {marginMetrics.markupPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block uppercase">Min Job Floor</span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatBDT(Number(minimumCharge) || 0)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Target Gross Margin (%)</Label>
                    <Input
                      type="number"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 35)}
                      className="h-8 text-xs font-mono text-emerald-600 font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Minimum Allowed Margin (%)</Label>
                    <Input
                      type="number"
                      value={minAllowedMargin}
                      onChange={(e) => setMinAllowedMargin(parseFloat(e.target.value) || 15)}
                      className="h-8 text-xs font-mono text-rose-600 font-bold"
                    />
                  </div>
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

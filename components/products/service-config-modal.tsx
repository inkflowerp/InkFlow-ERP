'use client'

import React, { useState, useEffect } from 'react'
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
  HelpCircle,
  Palette,
  RefreshCw,
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
} from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import type { MaterialRecord } from '@/types/inventory.types'
import { formatBDT } from '@/lib/formatters'
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
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // 2. Customer Dimensions & Presets
  const [dimensionUnit, setDimensionUnit] = useState<string>('ft')
  const [allowCustomDimensions, setAllowCustomDimensions] = useState(true)
  const [presets, setPresets] = useState<ServiceDimensionPreset[]>([])
  const [newPresetWidth, setNewPresetWidth] = useState<number | ''>('')
  const [newPresetLength, setNewPresetLength] = useState<number | ''>('')
  const [newPresetLabel, setNewPresetLabel] = useState('')

  // 3. Required Materials & Geometry Allowances
  const [requiredMaterials, setRequiredMaterials] = useState<ServiceRequiredMaterial[]>([])

  // 4. Finishing Options
  const [finishingOptions, setFinishingOptions] = useState<ServiceFinishingOption[]>([])

  // 5. Additional Options
  const [additionalOptions, setAdditionalOptions] = useState<ServiceAdditionalOption[]>([])

  // 6. Installation / Fulfillment
  const [installationOptions, setInstallationOptions] = useState<ServiceInstallationOption[]>([])

  // 7. Pricing & Margins
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('per_area')
  const [sellingPrice, setSellingPrice] = useState<number | ''>('')
  const [minimumCharge, setMinimumCharge] = useState<number | ''>('')
  const [targetMargin, setTargetMargin] = useState<number>(35)
  const [minAllowedMargin, setMinAllowedMargin] = useState<number>(15)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'printing_service')
      setSellingPrice(initialData.selling_price || '')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')
      setPricingMethod((initialData.pricing_method as any) || 'per_area')

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
      setTargetMargin(initialData.target_margin_percentage || 35)
      setMinAllowedMargin(initialData.min_allowed_margin_percent || 15)
    } else {
      setName('')
      setNameBn('')
      setSku(`SRV-${Date.now().toString().slice(-5)}`)
      setCategory('printing_service')
      setPrintingMethodName(printingMethods[0]?.name || 'Eco-Solvent')
      setSellingPrice('')
      setIsActive(true)
      setDescription('')
      setPricingMethod('per_area')
      setDimensionUnit('ft')
      setAllowCustomDimensions(true)
      setPresets([
        { width: 4, length: 12, label: '4ft × 12ft (Billboard / Shop Front)' },
        { width: 2.5, length: 6, label: '2.5ft × 6ft (X-Stand / Roll-up)' },
      ])
      setRequiredMaterials([])
      setFinishingOptions([])
      setAdditionalOptions([])
      setInstallationOptions([])
      setMinimumCharge('')
      setTargetMargin(35)
      setMinAllowedMargin(15)
    }
    setActiveTab('basic')
    setErrorMessage(null)
  }, [initialData, isOpen, printingMethods])

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
          allowance_per_side_in: mat.default_allowance_per_side_in ?? 1.0,
          is_required: true,
        },
      ])
    }
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
          pricing_method: f.pricing_method || 'per_piece',
          price: f.selling_price || 0,
          cost: f.cost || 0,
          is_default: false,
        },
      ])
    }
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
        unit: pricingMethod === 'per_area' ? 'sft' : 'piece',
        selling_unit: pricingMethod === 'per_area' ? 'sft' : 'piece',
        pricing_method: pricingMethod,
        selling_price: Number(sellingPrice),
        base_cost: 0,
        cost_basis_type: 'direct_cost',
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
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Configure Service: ${initialData.name}` : 'New Printing & Production Service'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                Custom Production
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure printing method, media bleeds, finishing, additional pasting, and area tariffs.
            </p>
          </div>
        </div>
      }
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigation Pill Bar - All 6 tabs visible */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
          {[
            { id: 'basic', label: '1. Basic Info', icon: Wrench },
            { id: 'dimensions', label: '2. Dimensions', icon: Boxes },
            { id: 'materials', label: '3. Media & Bleed', icon: Boxes },
            { id: 'finishing', label: '4. Finishing', icon: Sparkles },
            { id: 'additionals', label: '5. Add-ons & Install', icon: PlusCircle },
            { id: 'pricing', label: '6. Pricing & Margins', icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-2 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap text-xs',
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* TAB 1: BASIC INFORMATION */}
        {activeTab === 'basic' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Service Identity & Technology
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Service Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. UV Vinyl Sticker Printing, Eco PVC Banner Print..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Bengali Name (ঐচ্ছিক)
                  </Label>
                  <Input
                    placeholder="যেমন: ইউভি ভিনাইল প্রিন্টিং"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    className="h-9 text-xs font-bengali"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Service Code / SKU
                  </Label>
                  <Input
                    placeholder="e.g. SRV-UV-VINYL"
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
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                  >
                    <option value="">-- Select Configured Printing Method --</option>
                    {printingMethods.map((pm) => (
                      <option key={pm.id} value={pm.name}>
                        {pm.name} {pm.name_bn ? `(${pm.name_bn})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Category
                  </Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                  >
                    <option value="printing_service">Wide Format Printing</option>
                    <option value="solvent_printing">Solvent / Eco-Solvent</option>
                    <option value="uv_printing">UV Flatbed & Roll</option>
                    <option value="digital_print">Digital & Offset</option>
                    <option value="fabrication">Signage & Fabrication</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Service Description & Commercial Scope
                </Label>
                <textarea
                  rows={2}
                  placeholder="e.g. Outdoor durable high-resolution UV print on 120 GSM self-adhesive vinyl..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active in Quotation & Invoice Catalog</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIMENSIONS & PRESETS */}
        {activeTab === 'dimensions' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Customer Dimension Rules & Size Presets
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Allow Arbitrary Customer Dimensions
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Salesperson can enter custom Width × Height (e.g. 4.5ft × 11.25ft)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowCustomDimensions}
                  onChange={(e) => setAllowCustomDimensions(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Add Standard Size Presets */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
                  Add Quick Select Size Preset
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <Label className="text-[11px] mb-1 block">Width (ft)</Label>
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
                    <Label className="text-[11px] mb-1 block">Length (ft)</Label>
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
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Configured Presets:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {presets.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.label} <span className="text-[11px] text-slate-400 font-mono">({p.width}×{p.length} ft)</span>
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

        {/* TAB 3: REQUIRED MATERIALS & BLEEDS */}
        {activeTab === 'materials' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Compatible Roll Media & Production Allowance
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              Select stock materials that this service can be printed onto. Production geometry will check roll widths in real-time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {availableMaterials.map((mat) => {
                const isSelected = requiredMaterials.some((m) => m.material_id === mat.id)
                return (
                  <div
                    key={mat.id}
                    onClick={() => handleToggleMaterial(mat)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs',
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div>
                      <span className="font-bold block">{mat.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {mat.sku} • {mat.unit || 'sft'}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 4: FINISHING OPTIONS */}
        {activeTab === 'finishing' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Compatible Finishing Operations
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              Select available post-press finishing options for this service (Lamination, Eyelet, MS Frame).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {finishingMasterOptions.map((f) => {
                const isSelected = finishingOptions.some((x) => x.name === f.name)
                return (
                  <div
                    key={f.id}
                    onClick={() => handleToggleFinishing(f)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs',
                      isSelected
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-1 ring-purple-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    )}
                  >
                    <div>
                      <span className="font-bold block">{f.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {formatBDT(f.selling_price)} / {f.pricing_method}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 5: ADD-ONS & INSTALLATION */}
        {activeTab === 'additionals' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Additional Work (Board Pasting & Installation)
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase mb-1.5">
                  Pasting / Substrate Mounting Add-ons
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          <span className="text-[11px] text-slate-500">
                            {formatBDT(a.selling_price)} / {a.pricing_method}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-600" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase mb-1.5">
                  Installation & Delivery Options
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          <span className="text-[11px] text-slate-500">
                            {formatBDT(inst.selling_price)} / {inst.pricing_method}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PRICING & MARGINS */}
        {activeTab === 'pricing' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                6
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Selling Tariffs & Target Profit Margins
              </h3>
            </div>

            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Base Selling Rate (৳ / {pricingMethod === 'per_area' ? 'SFT' : 'Piece'}) <span className="text-rose-500">*</span>
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
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Minimum Order Charge (৳) <span className="text-[10px] text-slate-400">(Job Floor)</span>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-200/60 dark:border-blue-800/60">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Target Gross Margin (%)
                  </Label>
                  <Input
                    type="number"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 35)}
                    className="h-9 text-xs font-mono font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Minimum Allowed Margin (%)
                  </Label>
                  <Input
                    type="number"
                    value={minAllowedMargin}
                    onChange={(e) => setMinAllowedMargin(parseFloat(e.target.value) || 15)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1"
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
                  <span>{initialData ? 'Update Service' : 'Save Service'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}

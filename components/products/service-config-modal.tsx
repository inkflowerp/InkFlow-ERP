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
import { cn } from '@/lib/utils'

interface ServiceConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (serviceData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
  availableMaterials?: MaterialRecord[]
}

export function ServiceConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
  availableMaterials = [],
}: ServiceConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'dimensions' | 'materials' | 'finishing' | 'additionals' | 'pricing'>('basic')

  // 1. Basic Information
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('printing_service')
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

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'printing_service')
      setDescription(initialData.description || '')
      setIsActive(initialData.is_active !== false)
      setPricingMethod(initialData.pricing_method || 'per_area')
      setSellingPrice(initialData.selling_price || '')
      setMinimumCharge(initialData.minimum_charge || '')
      setTargetMargin(initialData.target_margin_percentage || 35)
      setMinAllowedMargin(initialData.min_allowed_margin_percent || 15)

      const cfg: ServiceConfiguration = initialData.service_config || {}
      setDimensionUnit(cfg.dimension_unit || 'ft')
      setAllowCustomDimensions(cfg.allow_custom_dimensions !== false)
      setPresets(cfg.presets || [])
      setRequiredMaterials(cfg.required_materials || [])
      setFinishingOptions(cfg.finishing_options || [])
      setAdditionalOptions(cfg.additional_options || [])
      setInstallationOptions(cfg.installation_options || [])
    } else {
      // Default initial service configuration (e.g. Reference UV Vinyl)
      setName('')
      setNameBn('')
      setSku(`SRV-${Date.now().toString().slice(-5)}`)
      setCategory('printing_service')
      setDescription('')
      setIsActive(true)
      setDimensionUnit('ft')
      setAllowCustomDimensions(true)
      setPresets([
        { id: 'p1', width: 3, length: 10, label: '3 × 10 ft' },
        { id: 'p2', width: 4, length: 10, label: '4 × 10 ft' },
        { id: 'p3', width: 5, length: 10, label: '5 × 10 ft' },
      ])
      setRequiredMaterials([
        {
          id: 'mat-1',
          material_name: 'Vinyl Sticker / PVC',
          is_required: true,
          consumption_rule: 'roll_linear_length',
          allowance_per_side_in: 1.0,
          compatible_widths_ft: [3, 4, 5],
          consumption_unit: 'sqft',
        },
        {
          id: 'mat-2',
          material_name: 'UV Ink / Eco Solvent Ink',
          is_required: true,
          consumption_rule: 'area_sqft',
          allowance_per_side_in: 0,
          consumption_unit: 'ml',
        },
      ])
      setFinishingOptions([
        { id: 'f-none', name: 'None (কাটিং ছাড়া)', pricing_method: 'per_piece', unit_price: 0 },
        { id: 'f-glossy', name: 'Glossy Lamination', pricing_method: 'per_sqft', unit_price: 5.0 },
        { id: 'f-matte', name: 'Matte Lamination', pricing_method: 'per_sqft', unit_price: 6.0 },
        { id: 'f-sparkle', name: 'Sparkle Lamination', pricing_method: 'per_sqft', unit_price: 8.0 },
      ])
      setAdditionalOptions([
        { id: 'a-pvc-3mm', name: '3mm PVC Board Pasting', pricing_method: 'per_sqft', unit_price: 25.0 },
        { id: 'a-xstand', name: 'X-Stand Hardware', pricing_method: 'per_piece', unit_price: 350.0 },
      ])
      setInstallationOptions([
        { id: 'inst-shop', name: 'Shop Delivery / Dispatch', fulfillment_type: 'delivery', pricing_method: 'per_piece', unit_price: 0 },
        { id: 'inst-onsite', name: 'On-Site Installation', fulfillment_type: 'installation', pricing_method: 'per_sqft', unit_price: 15.0 },
      ])
      setPricingMethod('per_area')
      setSellingPrice('')
      setMinimumCharge('')
      setTargetMargin(35)
      setMinAllowedMargin(15)
    }
    setActiveTab('basic')
    setErrorMessage(null)
  }, [initialData, isOpen])

  // Presets Handlers
  const handleAddPreset = () => {
    if (!newPresetWidth || !newPresetLength) return
    const w = Number(newPresetWidth)
    const l = Number(newPresetLength)
    const label = newPresetLabel.trim() || `${w} × ${l} ${dimensionUnit}`
    setPresets([...presets, { id: crypto.randomUUID(), width: w, length: l, label }])
    setNewPresetWidth('')
    setNewPresetLength('')
    setNewPresetLabel('')
  }

  const handleRemovePreset = (id: string) => {
    setPresets(presets.filter((p) => p.id !== id))
  }

  // Required Materials Handlers
  const handleAddMaterialRow = () => {
    setRequiredMaterials([
      ...requiredMaterials,
      {
        id: crypto.randomUUID(),
        material_name: 'Raw Material',
        is_required: true,
        consumption_rule: 'roll_linear_length',
        allowance_per_side_in: 1.0,
        compatible_widths_ft: [3, 4, 5],
        consumption_unit: 'sqft',
      },
    ])
  }

  const handleUpdateMaterialRow = (idx: number, updates: Partial<ServiceRequiredMaterial>) => {
    const updated = [...requiredMaterials]
    updated[idx] = { ...updated[idx], ...updates }
    setRequiredMaterials(updated)
  }

  const handleRemoveMaterialRow = (idx: number) => {
    setRequiredMaterials(requiredMaterials.filter((_, i) => i !== idx))
  }

  // Finishing Handlers
  const handleAddFinishingRow = () => {
    setFinishingOptions([
      ...finishingOptions,
      {
        id: crypto.randomUUID(),
        name: 'New Finishing',
        pricing_method: 'per_sqft',
        unit_price: 0,
      },
    ])
  }

  const handleUpdateFinishingRow = (idx: number, updates: Partial<ServiceFinishingOption>) => {
    const updated = [...finishingOptions]
    updated[idx] = { ...updated[idx], ...updates }
    setFinishingOptions(updated)
  }

  const handleRemoveFinishingRow = (idx: number) => {
    setFinishingOptions(finishingOptions.filter((_, i) => i !== idx))
  }

  // Additional Handlers
  const handleAddAdditionalRow = () => {
    setAdditionalOptions([
      ...additionalOptions,
      {
        id: crypto.randomUUID(),
        name: 'New Additional',
        pricing_method: 'per_sqft',
        unit_price: 0,
      },
    ])
  }

  const handleUpdateAdditionalRow = (idx: number, updates: Partial<ServiceAdditionalOption>) => {
    const updated = [...additionalOptions]
    updated[idx] = { ...updated[idx], ...updates }
    setAdditionalOptions(updated)
  }

  const handleRemoveAdditionalRow = (idx: number) => {
    setAdditionalOptions(additionalOptions.filter((_, i) => i !== idx))
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Service name is required.')
      setActiveTab('basic')
      return
    }
    if (sellingPrice === '' || Number(sellingPrice) < 0) {
      setErrorMessage('Please enter a valid selling price.')
      setActiveTab('pricing')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const serviceConfig: ServiceConfiguration = {
        dimension_unit: dimensionUnit,
        allow_custom_dimensions: allowCustomDimensions,
        presets: presets,
        required_materials: requiredMaterials,
        finishing_options: finishingOptions,
        additional_options: additionalOptions,
        installation_options: installationOptions,
        pricing_method: pricingMethod,
        minimum_charge: minimumCharge !== '' ? Number(minimumCharge) : 0,
      }

      const payload: Partial<ProductRecord> = {
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim().toUpperCase() || `SRV-${Date.now().toString().slice(-5)}`,
        category: category.trim() || 'printing_service',
        entity_type: 'service',
        product_type: 'print_service',
        commercial_type: 'service',
        measurement_type: pricingMethod === 'per_area' ? 'area' : 'piece',
        pricing_method: pricingMethod,
        unit: dimensionUnit === 'ft' ? 'sft' : 'piece',
        selling_unit: dimensionUnit === 'ft' ? 'sft' : 'piece',
        selling_price: Number(sellingPrice) || 0,
        minimum_charge: minimumCharge !== '' ? Number(minimumCharge) : 0,
        target_margin_percentage: targetMargin || 35,
        min_allowed_margin_percent: minAllowedMargin || 15,
        is_active: isActive,
        is_service: true,
        is_ready_product: false,
        service_config: serviceConfig,
        description: description.trim() || undefined,
        requires_production: true,
      }

      await onSave(payload)
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
      title={initialData ? `Configure Service: ${initialData.name}` : 'New Print / Production Service'}
      description="Configure customer dimensions, required materials with bleed rules, finishing, and installation."
      size="3xl"
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border/80 overflow-x-auto gap-1 pb-1 scrollbar-none text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={cn(
              'px-3 py-2 rounded-t-lg transition-colors cursor-pointer shrink-0',
              activeTab === 'basic' ? 'bg-primary/10 text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            1. Basic
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dimensions')}
            className={cn(
              'px-3 py-2 rounded-t-lg transition-colors cursor-pointer shrink-0',
              activeTab === 'dimensions' ? 'bg-primary/10 text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            2. Dimensions & Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={cn(
              'px-3 py-2 rounded-t-lg transition-colors cursor-pointer shrink-0',
              activeTab === 'materials' ? 'bg-primary/10 text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            3. Materials & Allowance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('finishing')}
            className={cn(
              'px-3 py-2 rounded-t-lg transition-colors cursor-pointer shrink-0',
              activeTab === 'finishing' ? 'bg-primary/10 text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            4. Finishing & Add-ons
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={cn(
              'px-3 py-2 rounded-t-lg transition-colors cursor-pointer shrink-0',
              activeTab === 'pricing' ? 'bg-primary/10 text-primary border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            5. Pricing & Margins
          </button>
        </div>

        {/* TAB 1: BASIC INFORMATION */}
        {activeTab === 'basic' && (
          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="srv-name" className="text-sm font-medium">
                Service Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="srv-name"
                placeholder="e.g. UV Vinyl Print, Eco PVC Banner Print"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="srv-name-bn" className="text-xs text-muted-foreground">
                  Bengali Name (ঐচ্ছিক)
                </Label>
                <Input
                  id="srv-name-bn"
                  placeholder="যেমন: ইউভি ভিনাইল প্রিন্ট"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="srv-sku" className="text-xs text-muted-foreground">
                  Service Code / SKU
                </Label>
                <Input
                  id="srv-sku"
                  placeholder="e.g. SRV-UV-VINYL"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="mt-1 uppercase text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="srv-category" className="text-sm font-medium">
                  Category
                </Label>
                <select
                  id="srv-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="printing_service">Large Format Printing</option>
                  <option value="uv_printing">UV Flatbed & Roll Print</option>
                  <option value="eco_solvent">Eco Solvent Banner Print</option>
                  <option value="signage_fabrication">Signage & Fabrication</option>
                  <option value="cnc_laser">Laser / CNC Cutting</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="srv-pricing-method" className="text-sm font-medium">
                  Charging Method
                </Label>
                <select
                  id="srv-pricing-method"
                  value={pricingMethod}
                  onChange={(e) => setPricingMethod(e.target.value as PricingMethod)}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="per_area">Per Square Foot (প্রতি বর্গফুট - sqft)</option>
                  <option value="per_piece">Per Piece / Unit (প্রতি পিস)</option>
                  <option value="per_length">Per Running Foot (প্রতি রানিং ফুট - rft)</option>
                  <option value="per_job">Per Job / Fixed (ফিক্সড চার্জ)</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="srv-desc" className="text-xs text-muted-foreground">
                Customer-Facing Description
              </Label>
              <textarea
                id="srv-desc"
                rows={2}
                placeholder="High-resolution 1440dpi outdoor print with 2-year color durability..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md bg-background text-xs focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="srv-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
              <Label htmlFor="srv-active" className="text-sm font-medium cursor-pointer">
                Active in Service Catalog
              </Label>
            </div>
          </div>
        )}

        {/* TAB 2: DIMENSIONS & PRESETS */}
        {activeTab === 'dimensions' && (
          <div className="space-y-4 py-1">
            <div className="p-3 bg-card border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Customer Dimensions</h4>
                  <p className="text-xs text-muted-foreground">
                    Customers enter variable width × length for this service.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Unit:</span>
                  <select
                    value={dimensionUnit}
                    onChange={(e) => setDimensionUnit(e.target.value as any)}
                    className="px-2 py-1 border rounded text-xs bg-background font-semibold"
                  >
                    <option value="ft">Feet (ft)</option>
                    <option value="inch">Inches (in)</option>
                    <option value="cm">Centimeters (cm)</option>
                    <option value="mm">Millimeters (mm)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allow-custom"
                  checked={allowCustomDimensions}
                  onChange={(e) => setAllowCustomDimensions(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
                <Label htmlFor="allow-custom" className="text-xs font-medium cursor-pointer">
                  Allow Custom Dimensions (Customers can order any custom size like 4 × 12, 3 × 5.5, etc.)
                </Label>
              </div>
            </div>

            {/* Size Presets for Speed */}
            <div className="p-3 bg-card border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Common Size Presets</h4>
                  <p className="text-xs text-muted-foreground">
                    Quick-selection buttons for salespeople in Fast Quote & Quotations.
                  </p>
                </div>
              </div>

              {/* Existing Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold"
                  >
                    <span>{preset.label || `${preset.width} × ${preset.length} ${dimensionUnit}`}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePreset(preset.id || '')}
                      className="hover:text-destructive p-0.5 rounded-full"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {presets.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No presets configured yet.</span>
                )}
              </div>

              {/* Add New Preset Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Input
                  type="number"
                  step="any"
                  placeholder="Width"
                  value={newPresetWidth}
                  onChange={(e) => setNewPresetWidth(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-20 text-xs"
                />
                <span className="text-muted-foreground text-xs font-bold">×</span>
                <Input
                  type="number"
                  step="any"
                  placeholder="Length"
                  value={newPresetLength}
                  onChange={(e) => setNewPresetLength(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-20 text-xs"
                />
                <Input
                  placeholder="Label (e.g. 3×10 Banner)"
                  value={newPresetLabel}
                  onChange={(e) => setNewPresetLabel(e.target.value)}
                  className="flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPreset}
                  disabled={!newPresetWidth || !newPresetLength}
                  className="text-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Preset
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REQUIRED MATERIALS & ALLOWANCE */}
        {activeTab === 'materials' && (
          <div className="space-y-3 py-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Required Materials & Allowance Rules</h4>
                <p className="text-xs text-muted-foreground">
                  Stores production allowance (e.g. 1-inch on each side) and compatible physical roll widths.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMaterialRow} className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Material
              </Button>
            </div>

            <div className="space-y-2.5">
              {requiredMaterials.map((mat, idx) => (
                <div key={mat.id || idx} className="p-3 border rounded-xl bg-card space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      placeholder="Material Name (e.g. Vinyl Sticker, PVC, UV Ink)"
                      value={mat.material_name}
                      onChange={(e) => handleUpdateMaterialRow(idx, { material_name: e.target.value })}
                      className="font-medium text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterialRow(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Consumption Rule</Label>
                      <select
                        value={mat.consumption_rule}
                        onChange={(e) => handleUpdateMaterialRow(idx, { consumption_rule: e.target.value as any })}
                        className="w-full mt-1 p-1.5 border rounded bg-background text-xs"
                      >
                        <option value="roll_linear_length">Physical Roll Linear Length</option>
                        <option value="area_sqft">Exact Printed Area (sqft)</option>
                        <option value="fixed_per_piece">Fixed Per Piece</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Production Bleed / Allowance</Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          step="any"
                          value={mat.allowance_per_side_in ?? 1.0}
                          onChange={(e) =>
                            handleUpdateMaterialRow(idx, {
                              allowance_per_side_in: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs pr-12"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-semibold">
                          in / side
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Compatible Widths (ft)</Label>
                      <Input
                        placeholder="e.g. 3, 4, 5 or 3.25, 4.25, 5.25"
                        value={Array.isArray(mat.compatible_widths_ft) ? mat.compatible_widths_ft.join(', ') : ''}
                        onChange={(e) => {
                          const parsed = e.target.value
                            .split(',')
                            .map((s) => parseFloat(s.trim()))
                            .filter((n) => !isNaN(n))
                          handleUpdateMaterialRow(idx, { compatible_widths_ft: parsed })
                        }}
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      Example for 4×12ft: Production dimension = 4ft 2in × 12ft 2in (+{((mat.allowance_per_side_in ?? 1.0) * 2).toFixed(0)}in total).
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FINISHING & ADD-ONS */}
        {activeTab === 'finishing' && (
          <div className="space-y-4 py-1">
            {/* Finishing Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Finishing Options</h4>
                  <p className="text-xs text-muted-foreground">
                    Optional finishing (Glossy Lamination, Matte Lamination, Eyelet, MS Frame).
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddFinishingRow} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Finishing
                </Button>
              </div>

              <div className="space-y-2">
                {finishingOptions.map((fin, idx) => (
                  <div key={fin.id || idx} className="p-2.5 border rounded-lg bg-card flex items-center gap-2">
                    <Input
                      placeholder="Finishing Name (e.g. Glossy Lamination)"
                      value={fin.name}
                      onChange={(e) => handleUpdateFinishingRow(idx, { name: e.target.value })}
                      className="text-xs flex-1"
                    />
                    <select
                      value={fin.pricing_method}
                      onChange={(e) => handleUpdateFinishingRow(idx, { pricing_method: e.target.value as any })}
                      className="p-1.5 border rounded text-xs bg-background"
                    >
                      <option value="per_sqft">Per sqft</option>
                      <option value="per_piece">Per piece</option>
                      <option value="per_length">Per rft</option>
                    </select>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">৳</span>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={fin.unit_price}
                        onChange={(e) => handleUpdateFinishingRow(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="text-xs pl-5 font-semibold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFinishingRow(idx)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Additional Work & Hardware</h4>
                  <p className="text-xs text-muted-foreground">
                    Optional additions (3mm PVC Board Pasting, X-Stand Standee, Foam Board).
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddAdditionalRow} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Additional
                </Button>
              </div>

              <div className="space-y-2">
                {additionalOptions.map((add, idx) => (
                  <div key={add.id || idx} className="p-2.5 border rounded-lg bg-card flex items-center gap-2">
                    <Input
                      placeholder="Additional Name (e.g. 3mm PVC Board Pasting)"
                      value={add.name}
                      onChange={(e) => handleUpdateAdditionalRow(idx, { name: e.target.value })}
                      className="text-xs flex-1"
                    />
                    <select
                      value={add.pricing_method}
                      onChange={(e) => handleUpdateAdditionalRow(idx, { pricing_method: e.target.value as any })}
                      className="p-1.5 border rounded text-xs bg-background"
                    >
                      <option value="per_sqft">Per sqft</option>
                      <option value="per_piece">Per piece</option>
                    </select>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">৳</span>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={add.unit_price}
                        onChange={(e) => handleUpdateAdditionalRow(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="text-xs pl-5 font-semibold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalRow(idx)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRICING & MARGINS */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 py-1">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Base Commercial Selling Price</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="srv-price" className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <span>Base Selling Rate (৳)</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">৳</span>
                    <Input
                      id="srv-price"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      required
                      className="pl-7 font-semibold text-base"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Charged {pricingMethod === 'per_area' ? 'per square foot (sqft)' : 'per piece'}
                  </span>
                </div>

                <div>
                  <Label htmlFor="srv-min-charge" className="text-sm text-muted-foreground">
                    Minimum Job Charge (৳)
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">৳</span>
                    <Input
                      id="srv-min-charge"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 150.00"
                      value={minimumCharge}
                      onChange={(e) => setMinimumCharge(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-7 text-sm"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Small orders are billed at least this minimum charge.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-primary/10">
                <div>
                  <Label htmlFor="srv-target-margin" className="text-xs text-muted-foreground">
                    Target Gross Margin (%)
                  </Label>
                  <Input
                    id="srv-target-margin"
                    type="number"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 35)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="srv-min-margin" className="text-xs text-muted-foreground">
                    Minimum Allowed Margin (%)
                  </Label>
                  <Input
                    id="srv-min-margin"
                    type="number"
                    value={minAllowedMargin}
                    onChange={(e) => setMinAllowedMargin(parseFloat(e.target.value) || 15)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {activeTab !== 'pricing' ? (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'basic') setActiveTab('dimensions')
                  else if (activeTab === 'dimensions') setActiveTab('materials')
                  else if (activeTab === 'materials') setActiveTab('finishing')
                  else if (activeTab === 'finishing') setActiveTab('pricing')
                }}
                className="text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Next Section</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span>Ready to save service configuration</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? 'Saving...' : initialData ? 'Update Service' : 'Save Service'}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}

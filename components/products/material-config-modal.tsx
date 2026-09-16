'use client'

import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import type { ProductRecord, MaterialConfiguration, UnitOfMeasure } from '@/types/product.types'
import type { MaterialRecord } from '@/types/inventory.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { cn } from '@/lib/utils'

interface MaterialConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (materialData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
}

export function MaterialConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
}: MaterialConfigModalProps) {
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('materials')
  const [materialType, setMaterialType] = useState<'roll' | 'sheet' | 'liquid' | 'rigid' | 'hardware' | 'accessory'>('roll')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')

  // Purchase & Geometry
  const [purchaseUnit, setPurchaseUnit] = useState('roll')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [standardRollLength, setStandardRollLength] = useState<number>(164)
  const [availableWidths, setAvailableWidths] = useState<number[]>([3, 4, 5])
  const [newWidthInput, setNewWidthInput] = useState<string>('')

  // Usage & Production
  const [usageUnit, setUsageUnit] = useState<UnitOfMeasure>('sft')
  const [allowancePerSide, setAllowancePerSide] = useState<number>(1.0)
  const [reorderLevel, setReorderLevel] = useState<number>(5)
  const [locationName, setLocationName] = useState('Main Store')

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'materials')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')
      setPurchaseUnit(initialData.purchase_unit || 'roll')
      setPurchasePrice(initialData.purchase_price || '')

      const matCfg: MaterialConfiguration = initialData.material_config || {}
      setMaterialType(matCfg.material_type || (initialData.purchase_unit === 'roll' ? 'roll' : 'sheet'))
      setStandardRollLength(matCfg.standard_roll_length_ft || initialData.standard_roll_length_ft || 164)
      setAvailableWidths(matCfg.available_widths_ft || initialData.available_widths_ft || [3, 4, 5])
      setUsageUnit((matCfg.usage_unit as any) || initialData.unit || 'sft')
      setAllowancePerSide(matCfg.default_allowance_per_side_in ?? 1.0)
      setReorderLevel(initialData.min_order_quantity || 5)
    } else {
      setName('')
      setNameBn('')
      setSku(`MAT-${Date.now().toString().slice(-5)}`)
      setCategory('materials')
      setMaterialType('roll')
      setIsActive(true)
      setDescription('')
      setPurchaseUnit('roll')
      setPurchasePrice('')
      setStandardRollLength(164)
      setAvailableWidths([3, 4, 5])
      setUsageUnit('sft')
      setAllowancePerSide(1.0)
      setReorderLevel(5)
      setLocationName('Main Store')
    }
    setErrorMessage(null)
  }, [initialData, isOpen])

  const handleAddWidth = () => {
    const val = parseFloat(newWidthInput.trim())
    if (!isNaN(val) && val > 0 && !availableWidths.includes(val)) {
      setAvailableWidths([...availableWidths, val].sort((a, b) => a - b))
      setNewWidthInput('')
    }
  }

  const handleRemoveWidth = (w: number) => {
    setAvailableWidths(availableWidths.filter((item) => item !== w))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Material name is required.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const matConfig: MaterialConfiguration = {
        material_type: materialType,
        available_widths_ft: materialType === 'roll' ? availableWidths : undefined,
        standard_roll_length_ft: materialType === 'roll' ? Number(standardRollLength) || 164 : undefined,
        usage_unit: usageUnit,
        default_allowance_per_side_in: Number(allowancePerSide) || 0,
        purchase_unit: purchaseUnit,
        purchase_price: purchasePrice !== '' ? Number(purchasePrice) : 0,
      }

      const primaryWidth = availableWidths.length > 0 ? availableWidths[0] : 4
      const rollArea = Math.round(primaryWidth * standardRollLength * 100) / 100

      const payload: Partial<ProductRecord> = {
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim().toUpperCase() || `MAT-${Date.now().toString().slice(-5)}`,
        category: category.trim() || 'materials',
        entity_type: 'material',
        product_type: 'material',
        commercial_type: 'material',
        measurement_type: materialType === 'roll' ? 'area' : 'piece',
        pricing_method: materialType === 'roll' ? 'per_area' : 'per_piece',
        unit: usageUnit,
        selling_unit: usageUnit,
        purchase_unit: purchaseUnit,
        purchase_price: purchasePrice !== '' ? Number(purchasePrice) : 0,
        conversion_ratio: materialType === 'roll' ? rollArea : 1.0,
        selling_price: purchasePrice !== '' ? Math.round((Number(purchasePrice) / (rollArea || 1)) * 1.35 * 100) / 100 : 0,
        is_active: isActive,
        is_service: false,
        is_ready_product: false,
        material_config: matConfig,
        available_widths_ft: availableWidths,
        standard_roll_length_ft: standardRollLength,
        description: description.trim() || undefined,
        min_order_quantity: reorderLevel,
        requires_production: false,
      }

      await onSave(payload)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save material.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={initialData ? `Edit Material: ${initialData.name}` : 'New Inventory Material'}
      description="Stock materials purchased in rolls/bulk and consumed during job production."
      size="2xl"
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="mat-name" className="text-sm font-medium">
              Material Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mat-name"
              placeholder="e.g. Vinyl Sticker, PVC Frontlit, Glossy Lamination Film"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mat-name-bn" className="text-xs text-muted-foreground">
                Bengali Name (ঐচ্ছিক)
              </Label>
              <Input
                id="mat-name-bn"
                placeholder="যেমন: ভিনাইল স্টিকার রোল"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="mat-sku" className="text-xs text-muted-foreground">
                SKU / Material Code
              </Label>
              <Input
                id="mat-sku"
                placeholder="e.g. MAT-VINYL-WHITE"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 uppercase text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mat-type" className="text-sm font-medium">
                Physical Form / Type
              </Label>
              <select
                id="mat-type"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
              >
                <option value="roll">Roll Material (Physical Width × Length)</option>
                <option value="sheet">Flat Sheet / Board (PVC, Acrylic, Foam)</option>
                <option value="liquid">Liquid / Inks (UV Ink, Eco Solvent, Flush)</option>
                <option value="rigid">Rigid Profile (MS Pipe, Aluminum Channel)</option>
                <option value="hardware">Hardware / Accessories (Eyelets, Screws)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="mat-category" className="text-sm font-medium">
                Category
              </Label>
              <select
                id="mat-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="materials">Print Media & Rolls</option>
                <option value="inks">Inks & Solvents</option>
                <option value="lamination_media">Lamination & Overlays</option>
                <option value="boards_sheets">Boards & Substrates</option>
                <option value="hardware_acc">Display Hardware & Acc</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roll Dimensions & Purchase Configuration (for roll materials) */}
          {materialType === 'roll' && (
            <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Physical Roll Specifications</span>
              </h4>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Available Purchase Widths (ft)
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {availableWidths.map((w) => (
                    <div
                      key={w}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300"
                    >
                      <span>{w} ft roll</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWidth(w)}
                        className="hover:text-destructive text-sm leading-none p-0.5"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 5.25"
                      value={newWidthInput}
                      onChange={(e) => setNewWidthInput(e.target.value)}
                      className="w-24 h-7 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddWidth}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-0.5" /> Add
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-500/15">
                <div>
                  <Label htmlFor="mat-roll-len" className="text-xs font-medium text-muted-foreground">
                    Standard Roll Length (ft)
                  </Label>
                  <Input
                    id="mat-roll-len"
                    type="number"
                    step="any"
                    value={standardRollLength}
                    onChange={(e) => setStandardRollLength(parseFloat(e.target.value) || 164)}
                    className="mt-1 text-sm font-semibold"
                  />
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Standard roll is typically 50m (~164 ft).
                  </span>
                </div>

                <div>
                  <Label htmlFor="mat-price" className="text-xs font-medium text-muted-foreground">
                    Purchase Price per Roll (৳)
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-muted-foreground text-sm font-semibold">৳</span>
                    <Input
                      id="mat-price"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 8500.00"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-7 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  When receiving goods (GRN), discrete rolls with these width/length specs will be spawned into inventory.
                </span>
              </div>
            </div>
          )}

          {/* Usage & Allowance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mat-usage-unit" className="text-sm font-medium">
                Consumption / Usage Unit
              </Label>
              <select
                id="mat-usage-unit"
                value={usageUnit}
                onChange={(e) => setUsageUnit(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="sft">Square Feet (sqft)</option>
                <option value="rft">Running Feet (rft)</option>
                <option value="piece">Piece / Unit</option>
                <option value="meter">Meter</option>
                <option value="roll">Roll</option>
              </select>
            </div>

            <div>
              <Label htmlFor="mat-allowance" className="text-sm font-medium">
                Production Allowance per Side (in)
              </Label>
              <div className="relative mt-1">
                <Input
                  id="mat-allowance"
                  type="number"
                  step="any"
                  value={allowancePerSide}
                  onChange={(e) => setAllowancePerSide(parseFloat(e.target.value) || 0)}
                  className="pr-12 text-sm"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">inches</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Active in Inventory Catalog</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[110px]">
            {isSubmitting ? 'Saving...' : initialData ? 'Update Material' : 'Save Material'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

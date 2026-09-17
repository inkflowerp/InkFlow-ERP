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
  Check,
  RefreshCw,
} from 'lucide-react'
import type { ProductRecord, MaterialConfiguration, UnitOfMeasure } from '@/types/product.types'
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
    const val = parseFloat(newWidthInput)
    if (!isNaN(val) && val > 0 && !availableWidths.includes(val)) {
      setAvailableWidths([...availableWidths, val].sort((a, b) => a - b))
      setNewWidthInput('')
    }
  }

  const handleRemoveWidth = (w: number) => {
    setAvailableWidths(availableWidths.filter((x) => x !== w))
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
      const materialConfig: MaterialConfiguration = {
        material_type: materialType,
        available_widths_ft: materialType === 'roll' ? availableWidths : undefined,
        standard_roll_length_ft: materialType === 'roll' ? standardRollLength : undefined,
        usage_unit: usageUnit,
        default_allowance_per_side_in: allowancePerSide,
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
        unit: usageUnit,
        selling_unit: usageUnit,
        purchase_unit: purchaseUnit,
        purchase_price: purchasePrice !== '' ? Number(purchasePrice) : 0,
        base_cost: purchasePrice !== '' && standardRollLength > 0 && availableWidths.length > 0
          ? Number((Number(purchasePrice) / (availableWidths[0] * standardRollLength)).toFixed(2))
          : 0,
        selling_price: 0,
        target_margin_percentage: 35.0,
        min_allowed_margin_percent: 15.0,
        pricing_method: 'per_piece',
        cost_basis_type: 'direct_cost',
        is_active: isActive,
        description: description.trim() || undefined,
        available_widths_ft: materialType === 'roll' ? availableWidths : undefined,
        standard_roll_length_ft: materialType === 'roll' ? standardRollLength : undefined,
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
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                Inventory Stock
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Purchased roll/sheet stock tracked by physical dimensions and consumed in production.
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

        {/* Section 1: Material Identity */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Material Identity & Physical Form
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Material Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Self-Adhesive Vinyl Sticker White Glossy, Frontlit Flex 280 GSM..."
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
                  placeholder="যেমন: ভিনাইল স্টিকার গ্লসি"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  className="h-9 text-xs font-bengali"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  SKU / Material Code
                </Label>
                <Input
                  placeholder="e.g. MAT-VINYL-GLOSS"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Physical Form / Type
                </Label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                >
                  <option value="roll">Continuous Roll Media (Vinyl, Flex, Paper)</option>
                  <option value="sheet">Rigid Sheet / Board (PVC Board, Acrylic)</option>
                  <option value="liquid">Liquid Consumable (Solvent / UV Ink, Lube)</option>
                  <option value="rigid">Framing & Metal (MS Pipe, Aluminum Channel)</option>
                  <option value="accessory">Accessory (Eyelet, Double Tape, Rope)</option>
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
                  <option value="materials">Raw Materials & Substrates</option>
                  <option value="roll_media">Roll Media</option>
                  <option value="rigid_sheets">Rigid Sheets</option>
                  <option value="inks">Inks & Chemicals</option>
                  <option value="hardware_stock">Hardware Stock</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Purchase vs Usage Dimensions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Purchase Unit vs. Usage Dimensions
            </h3>
          </div>

          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Purchase Unit</Label>
                <select
                  value={purchaseUnit}
                  onChange={(e) => setPurchaseUnit(e.target.value)}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                >
                  <option value="roll">Roll (রোল)</option>
                  <option value="sheet">Sheet / Board (শীট)</option>
                  <option value="bottle">Bottle / Liter (বোতল)</option>
                  <option value="box">Box / Pack (বক্স)</option>
                  <option value="piece">Piece (পিস)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Usage / Billing Unit</Label>
                <select
                  value={usageUnit}
                  onChange={(e) => setUsageUnit(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                >
                  <option value="sft">Square Feet (SFT)</option>
                  <option value="sqin">Square Inch (SQIN)</option>
                  <option value="piece">Piece (পিস)</option>
                  <option value="liter">Liter / ML (লিটার)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Purchase Price (৳ / {purchaseUnit})
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 8500"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="pl-7 h-9 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Roll Dimensions */}
            {materialType === 'roll' && (
              <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block uppercase">
                    Quick Toggle Standard Stock Roll Widths:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 10.0, 10.5, 12.0].map((w) => {
                      const isSelected = availableWidths.includes(w)
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setAvailableWidths(availableWidths.filter((x) => x !== w))
                            } else {
                              setAvailableWidths([...availableWidths, w].sort((a, b) => a - b))
                            }
                          }}
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-md border font-mono transition-all flex items-center gap-1 cursor-pointer',
                            isSelected
                              ? 'bg-blue-600 text-white font-bold border-blue-700 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                          <span>{w} ft</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-200/60 dark:border-blue-800/60">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Standard Roll Length (Feet)
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      value={standardRollLength}
                      onChange={(e) => setStandardRollLength(parseFloat(e.target.value) || 164)}
                      className="h-9 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Standard 50m roll = 164 ft</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Add Custom Physical Width (Feet)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 3.25, 10.5"
                        value={newWidthInput}
                        onChange={(e) => setNewWidthInput(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddWidth}
                        className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Width
                      </Button>
                    </div>
                  </div>
                </div>

                {availableWidths.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Configured Roll Widths:</span>
                    {availableWidths.map((w) => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      >
                        <span>{w} ft</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWidth(w)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                <span>{initialData ? 'Update Material' : 'Save Material'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

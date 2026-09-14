'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialCategory, MaterialUnit } from '@/types/inventory.types'
import { createMaterialAction } from '@/actions/inventory.actions'

interface NewMaterialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (material: any) => void
  companyId?: string
}

export function NewMaterialModal({
  open,
  onOpenChange,
  onSuccess,
  companyId,
}: NewMaterialModalProps) {
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [category, setCategory] = useState<MaterialCategory>('flex')
  const [brand, setBrand] = useState('')
  const [specification, setSpecification] = useState('')
  const [color, setColor] = useState('')
  const [thickness, setThickness] = useState('')
  const [unit, setUnit] = useState<MaterialUnit>('roll')
  const [isRoll, setIsRoll] = useState(true)
  const [width, setWidth] = useState<number>(0)
  const [length, setLength] = useState<number>(0)
  const [dimensionUnit, setDimensionUnit] = useState('ft')
  const [cost, setCost] = useState<number>(0)
  const [reorderLevel, setReorderLevel] = useState<number>(5)
  const [minStock, setMinStock] = useState<number>(2)
  const [coverageRate, setCoverageRate] = useState<number>(850)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await createMaterialAction(
        {
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          name_bn: nameBn.trim() || null,
          category,
          brand: brand.trim() || null,
          specification: specification.trim() || null,
          color: color.trim() || null,
          thickness: thickness.trim() || null,
          unit,
          base_unit: unit,
          is_roll: isRoll,
          width: isRoll ? width : null,
          length: isRoll ? length : null,
          dimension_unit: dimensionUnit,
          roll_width_ft: isRoll && dimensionUnit === 'ft' ? width : null,
          roll_length_ft: isRoll && dimensionUnit === 'ft' ? length : null,
          reorder_level: Number(reorderLevel) || 0,
          min_stock_level: Number(minStock) || 0,
          average_cost: Number(cost) || 0,
          last_purchase_price: Number(cost) || 0,
          coverage_rate_sft_per_unit: category === 'ink' || category === 'ink_chemistry' ? Number(coverageRate) : null,
          notes: notes.trim() || null,
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to create material.')
        return
      }

      onSuccess?.(res.data)
      onOpenChange(false)
      // Reset form
      setSku('')
      setName('')
      setNameBn('')
      setNotes('')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Material Master"
      description="Register raw substrate, roll media, ink, hardware or packaging material into InkFlow inventory."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mSku" required>
              SKU / Code
            </Label>
            <Input
              id="mSku"
              placeholder="e.g. FLEX-440-WHITE"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mCat" required>
              Material Category
            </Label>
            <select
              id="mCat"
              value={category}
              onChange={(e) => {
                const val = e.target.value
                setCategory(val)
                setIsRoll(['flex', 'vinyl', 'roll_media', 'sticker_paper', 'fabric', 'lamination_film'].includes(val))
                if (['flex', 'vinyl', 'roll_media', 'lamination_film'].includes(val)) setUnit('roll')
                else if (['acrylic', 'pvc', 'acp', 'foam_board', 'rigid_sheet', 'paper'].includes(val)) setUnit('sheet')
                else if (['ink', 'ink_chemistry'].includes(val)) setUnit('liter')
                else if (['metal', 'wood', 'metal_framing'].includes(val)) setUnit('feet')
                else setUnit('pcs')
              }}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="flex">Flex / Banner</option>
              <option value="vinyl">Vinyl / Sticker</option>
              <option value="sticker_paper">Sticker Paper</option>
              <option value="pvc">PVC Board / Sheet</option>
              <option value="acrylic">Acrylic Sheet</option>
              <option value="acp">ACP Sheet (Aluminum Composite)</option>
              <option value="foam_board">Foam Board</option>
              <option value="paper">Paper / Cardstock</option>
              <option value="fabric">Fabric / Canvas</option>
              <option value="ink">Ink & Solvents</option>
              <option value="lamination_film">Lamination Film</option>
              <option value="led">LED & Electrical</option>
              <option value="channel_letter">Channel Letter Material</option>
              <option value="metal">Metal & MS Pipe</option>
              <option value="wood">Wood / MDF</option>
              <option value="adhesive">Adhesive & Glue</option>
              <option value="packaging">Packaging Material</option>
              <option value="other">Other Custom Material</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mName" required>
            Material Name (English)
          </Label>
          <Input
            id="mName"
            placeholder="e.g. Star Frontlit Flex 440 GSM Gloss"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mNameBn">Bengali Name (বাংলা নাম - Unicode)</Label>
          <Input
            id="mNameBn"
            placeholder="e.g. স্টার ফ্রন্টলিট ফ্লেক্স ৪৪০ জিএসএম"
            value={nameBn}
            onChange={(e) => setNameBn(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mBrand">Brand / Manufacturer</Label>
            <Input id="mBrand" placeholder="e.g. Star / Avery / 3M" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mColor">Color / Finish</Label>
            <Input id="mColor" placeholder="e.g. Pure White Gloss" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mThk">Thickness / GSM</Label>
            <Input id="mThk" placeholder="e.g. 440 GSM / 3mm" value={thickness} onChange={(e) => setThickness(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mUnit" required>
              Inventory Unit
            </Label>
            <select
              id="mUnit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as MaterialUnit)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="roll">roll</option>
              <option value="sheet">sheet</option>
              <option value="pcs">pcs</option>
              <option value="square_feet">square_feet (sft)</option>
              <option value="meter">meter</option>
              <option value="feet">feet</option>
              <option value="liter">liter</option>
              <option value="kg">kg</option>
              <option value="box">box</option>
              <option value="packet">packet</option>
              <option value="set">set</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mCost" required>
              Standard / Avg Cost (৳ BDT)
            </Label>
            <Input id="mCost" type="number" step="0.01" value={cost} onChange={(e) => setCost(Number(e.target.value))} required />
          </div>
        </div>

        {/* Roll / Sheet Dimension Configuration */}
        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 dark:text-blue-200">Roll / Sheet Dimensions (Area Tracking):</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={isRoll} onChange={(e) => setIsRoll(e.target.checked)} className="rounded" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Is Continuous Roll?</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="dimW">Width</Label>
              <Input id="dimW" type="number" step="0.1" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="dimL">Length</Label>
              <Input id="dimL" type="number" step="0.1" value={length} onChange={(e) => setLength(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="dimU">Dimension Unit</Label>
              <select
                id="dimU"
                value={dimensionUnit}
                onChange={(e) => setDimensionUnit(e.target.value)}
                className="w-full h-10 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="ft">Feet (ft)</option>
                <option value="meter">Meters (m)</option>
                <option value="inch">Inches (in)</option>
                <option value="mm">Millimeters (mm)</option>
              </select>
            </div>
          </div>
          {width > 0 && length > 0 && (
            <div className="text-[11px] text-blue-800 dark:text-blue-300 font-mono">
              Calculated Area: <strong>{width * length} {dimensionUnit}²</strong> per {unit}
            </div>
          )}
        </div>

        {/* Reorder & Minimum Stock Thresholds */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reorderLvl" required>
              Reorder Level Threshold
            </Label>
            <Input
              id="reorderLvl"
              type="number"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="minStk" required>
              Minimum Stock Safety Floor
            </Label>
            <Input id="minStk" type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} required />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[40px]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {loading ? 'Creating...' : 'Create Material'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Palette, AlertCircle, RefreshCw, Sparkles, Zap, Droplets, Layers, Cpu } from 'lucide-react'
import type { PrintingMethod } from '@/types/product.types'
import type { MachineryRecord } from '@/types/machinery.types'
import { cn } from '@/lib/utils'

interface PrintingMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  method?: PrintingMethod | null
  machineries?: MachineryRecord[]
  onSave: (data: Partial<PrintingMethod>) => Promise<void>
}

const COMMON_PRINT_TECH_PRESETS = [
  {
    name: 'Eco-Solvent Print (1440 DPI)',
    name_bn: 'ইকো-সলভেন্ট প্রিন্ট (১৪৪০ ডিপিআই)',
    code: 'ECO_SOLVENT_1440',
    cost_per_sqft: 4.5,
    default_ink_type: 'Eco-Solvent DX5 / XP600 Ink',
    compatible_types: ['roll'],
    description: 'High-resolution indoor/outdoor prints for vinyl stickers, canvas, and photo paper.',
  },
  {
    name: 'Solvent Heavy-Duty (720 DPI)',
    name_bn: 'সলভেন্ট ব্যানার প্রিন্ট (৭২০ ডিপিআই)',
    code: 'SOLVENT_HEAVY_720',
    cost_per_sqft: 2.2,
    default_ink_type: 'Industrial Solvent Konica 512i / StarFire Ink',
    compatible_types: ['roll'],
    description: 'High-speed long-distance outdoor advertising billboard flex banners.',
  },
  {
    name: 'UV LED Curable Flatbed (1440 DPI)',
    name_bn: 'ইউভি ফ্ল্যাটবেড প্রিন্ট (১৪৪০ ডিপিআই)',
    code: 'UV_FLATBED_1440',
    cost_per_sqft: 14.0,
    default_ink_type: 'UV Curable Hard/Flexible CMYK+White Ink',
    compatible_types: ['roll', 'sheet', 'rigid'],
    description: 'Instant-cure direct printing on acrylic sheets, PVC foam boards, wood, glass, and leather.',
  },
  {
    name: 'Sublimation / DTF Textile Print',
    name_bn: 'সাবলিমেশন ও ডিটিএফ প্রিন্ট',
    code: 'SUBLIMATION_DTF',
    cost_per_sqft: 8.0,
    default_ink_type: 'Disperse Sublimation / DTF Pigment Ink',
    compatible_types: ['roll', 'hardware'],
    description: 'Heat-transfer disperse dye printing for flags, sportswear, satin banners, and apparel.',
  },
]

export function PrintingMethodModal({
  open,
  onOpenChange,
  method,
  machineries = [],
  onSave,
}: PrintingMethodModalProps) {
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [costPerSqft, setCostPerSqft] = useState('0')
  const [defaultInkType, setDefaultInkType] = useState('')
  const [compatibleTypes, setCompatibleTypes] = useState<string[]>(['roll'])
  const [defaultMachineId, setDefaultMachineId] = useState('')
  const [estimatedSpeed, setEstimatedSpeed] = useState('')
  const [speedUnit, setSpeedUnit] = useState('sqft_per_hr')
  const [machineHourlyRate, setMachineHourlyRate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (method) {
      setName(method.name || '')
      setNameBn(method.name_bn || '')
      setCode(method.code || '')
      setDescription(method.description || '')
      setCostPerSqft(String(method.cost_per_sqft || 0))
      setDefaultInkType(method.default_ink_type || '')
      setCompatibleTypes(method.compatible_material_types || ['roll'])
      setDefaultMachineId(method.default_machine_id || '')
      setEstimatedSpeed(method.estimated_speed ? String(method.estimated_speed) : '')
      setSpeedUnit(method.speed_unit || 'sqft_per_hr')
      setMachineHourlyRate(method.machine_hourly_rate ? String(method.machine_hourly_rate) : '')
      setIsActive(method.is_active !== undefined ? method.is_active : true)
    } else {
      setName('')
      setNameBn('')
      setCode('')
      setDescription('')
      setCostPerSqft('0')
      setDefaultInkType('')
      setCompatibleTypes(['roll'])
      setDefaultMachineId('')
      setEstimatedSpeed('')
      setSpeedUnit('sqft_per_hr')
      setMachineHourlyRate('')
      setIsActive(true)
    }
    setError(null)
  }, [method, open])

  const toggleMaterialType = (type: string) => {
    setCompatibleTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleMachineSelect = (mId: string) => {
    setDefaultMachineId(mId)
    const m = machineries.find((item) => item.id === mId)
    if (m) {
      if (m.hourly_rate_bdt) setMachineHourlyRate(String(m.hourly_rate_bdt))
      if (m.speed_sqft_per_hour) {
        setEstimatedSpeed(String(m.speed_sqft_per_hour))
        setSpeedUnit('sqft_per_hr')
      } else if (m.speed_sheets_per_hour) {
        setEstimatedSpeed(String(m.speed_sheets_per_hour))
        setSpeedUnit('sheet_per_hr')
      }
    }
  }

  const handleApplyPreset = (preset: typeof COMMON_PRINT_TECH_PRESETS[0]) => {
    setName(preset.name)
    setNameBn(preset.name_bn)
    setCode(preset.code)
    setCostPerSqft(String(preset.cost_per_sqft))
    setDefaultInkType(preset.default_ink_type)
    setCompatibleTypes(preset.compatible_types)
    setDescription(preset.description)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Printing method name is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const selectedMachine = machineries.find((m) => m.id === defaultMachineId)
      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        code: code.trim() || name.toUpperCase().replace(/\s+/g, '_'),
        description: description.trim() || undefined,
        cost_per_sqft: Number(costPerSqft) || 0,
        default_ink_type: defaultInkType.trim() || undefined,
        compatible_material_types: compatibleTypes,
        default_machine_id: defaultMachineId || undefined,
        default_machine_name: selectedMachine?.name || undefined,
        default_machine_code: selectedMachine?.code || undefined,
        machine_hourly_rate: Number(machineHourlyRate) || undefined,
        estimated_speed: Number(estimatedSpeed) || undefined,
        speed_unit: speedUnit || undefined,
        is_active: isActive,
      })
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to save printing method')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 font-bold shrink-0">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {method ? 'Edit Printing Technology' : 'Add Printing Technology'}
              </span>
              <Badge variant="outline" className="text-2xs uppercase font-mono py-0.5 px-1.5 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                Technology Master
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure dynamic print technologies (Eco-Solvent, UV, DTF, Latex) and consumable ink rates.
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Presets Picker */}
        {!method && (
          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                Popular Printing Method Templates:
              </span>
              <span className="text-2xs text-rose-600 dark:text-rose-400 font-medium">Click to fill tech specs</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PRINT_TECH_PRESETS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium text-2xs hover:border-rose-500 hover:text-rose-600 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{p.name.split('(')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Technology Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!method && !code) {
                    setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))
                  }
                }}
                placeholder="e.g. UV Flatbed Print, Latex Print"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Technology Name (Bengali)
              </Label>
              <Input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমন: ইউভি ফ্ল্যাটবেড প্রিন্ট"
                className="h-9 text-xs font-bengali"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Method Code / Key
              </Label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="e.g. UV_FLATBED, LATEX"
                className="h-9 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Estimated Ink/Running Cost (৳ / sqft)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costPerSqft}
                onChange={(e) => setCostPerSqft(e.target.value)}
                placeholder="e.g. 14.00"
                className="h-9 text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Default Consumable / Ink Type
            </Label>
            <Input
              type="text"
              value={defaultInkType}
              onChange={(e) => setDefaultInkType(e.target.value)}
              placeholder="e.g. UV Curable CMYK+White Ink, Eco-Solvent DX5 Ink"
              className="h-9 text-xs"
            />
          </div>

          {/* Fleet Machinery Linkage */}
          {machineries.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  Primary Fleet Machine / Equipment
                </Label>
                <span className="text-2xs text-slate-500 font-medium">Auto-fills speed & hourly cost</span>
              </div>
              <select
                value={defaultMachineId}
                onChange={(e) => handleMachineSelect(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="">-- Standalone (No Default Fleet Machine) --</option>
                {machineries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code || 'NO-CODE'}) — {m.category} {m.max_print_width_inches ? `[Max ${m.max_print_width_inches}"]` : ''} • Rate: ৳{m.hourly_rate_bdt || 0}/hr
                  </option>
                ))}
              </select>

              {defaultMachineId && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label className="text-2xs text-slate-500 mb-1 block">Machine Hourly Rate (৳/hr)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={machineHourlyRate}
                      onChange={(e) => setMachineHourlyRate(e.target.value)}
                      placeholder="e.g. 500"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-2xs text-slate-500 mb-1 block">Speed ({speedUnit === 'sheet_per_hr' ? 'Sheets/hr' : 'Sqft/hr'})</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={estimatedSpeed}
                      onChange={(e) => setEstimatedSpeed(e.target.value)}
                      placeholder="e.g. 120"
                      className="h-8 text-xs font-mono font-bold text-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold mb-2 block">
              Compatible Material Formats
            </Label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'roll', label: 'Roll Substrates (Vinyl, PVC, Fabric)' },
                { id: 'sheet', label: 'Flat Sheets (Paper, Sunboard)' },
                { id: 'rigid', label: 'Rigid Boards (Acrylic, MDF, Metal)' },
                { id: 'hardware', label: 'Direct Products / Hardware' },
              ].map((fmt) => (
                <button
                  type="button"
                  key={fmt.id}
                  onClick={() => toggleMaterialType(fmt.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                    compatibleTypes.includes(fmt.id)
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  )}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Description / Production Guidelines
            </Label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical details, pass speeds, drying rules..."
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
              <span>Active for commercial job & service assignment</span>
            </label>
          </div>
        </div>

        {/* Standardized Bottom Action Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Method...</span>
              </>
            ) : (
              <>
                <Palette className="h-4 w-4" />
                <span>{method ? 'Update Technology' : 'Save Printing Technology'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

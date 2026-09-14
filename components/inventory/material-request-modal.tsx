'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { MaterialRecord, InventoryLocationRecord, MaterialRequestPriority } from '@/types/inventory.types'
import { ProductionTaskRecord } from '@/types/production.types'
import { createMaterialRequestAction } from '@/actions/inventory.actions'

interface MaterialRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  tasks?: ProductionTaskRecord[]
  selectedTaskId?: string
  onSuccess?: () => void
  companyId?: string
}

export function MaterialRequestModal({
  open,
  onOpenChange,
  materials,
  locations,
  tasks = [],
  selectedTaskId,
  onSuccess,
  companyId,
}: MaterialRequestModalProps) {
  const [taskId, setTaskId] = useState(selectedTaskId || '')
  const [sourceLocationId, setSourceLocationId] = useState(locations[0]?.id || '')
  const [priority, setPriority] = useState<MaterialRequestPriority>('normal')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Array<{ material_id: string; requested_quantity: number; unit: string }>>([
    { material_id: materials[0]?.id || '', requested_quantity: 1, unit: materials[0]?.unit || 'pcs' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddItem = () => {
    const defaultMat = materials[0]
    setItems([
      ...items,
      { material_id: defaultMat?.id || '', requested_quantity: 1, unit: defaultMat?.unit || 'pcs' },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'material_id') {
      const mat = materials.find((m) => m.id === value)
      if (mat) updated[index].unit = mat.unit
    }
    setItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0 || items.some((it) => !it.material_id || it.requested_quantity <= 0)) {
      setError('Please provide valid materials and quantities (> 0).')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await createMaterialRequestAction(
        {
          production_task_id: taskId || null,
          source_location_id: sourceLocationId || null,
          priority,
          notes: notes.trim() || null,
          items: items.map((it) => ({
            material_id: it.material_id,
            requested_quantity: Number(it.requested_quantity),
            unit: it.unit,
          })),
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to create material request.')
        return
      }

      onSuccess?.()
      onOpenChange(false)
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
      title="Create Material Request Requisition"
      description="Request raw materials from store warehouse for floor production tasks."
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
            <Label htmlFor="reqTask">Target Production Task (Optional)</Label>
            <select
              id="reqTask"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="">-- General Store Requisition --</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.task_number || t.id.slice(0, 8)} - {t.task_name || 'Task'} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reqPri" required>
              Priority Level
            </Label>
            <select
              id="reqPri"
              value={priority}
              onChange={(e) => setPriority(e.target.value as MaterialRequestPriority)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase"
            >
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent / Rush Job</option>
              <option value="low">Low / Buffer</option>
            </select>
          </div>
        </div>

        {/* Requisition Items List */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <Label required className="font-bold text-slate-800 dark:text-slate-200">
              Requested Materials List
            </Label>
            <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((it, idx) => {
              const selectedMat = materials.find((m) => m.id === it.material_id)
              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(idx)}
                        className="h-6 w-6 p-0 text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <Label>Material</Label>
                      <select
                        value={it.material_id}
                        onChange={(e) => handleItemChange(idx, 'material_id', e.target.value)}
                        className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.sku} - {m.name} ({m.current_stock} {m.unit} on hand)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Quantity ({selectedMat?.unit || 'unit'})</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={it.requested_quantity}
                        onChange={(e) => handleItemChange(idx, 'requested_quantity', Number(e.target.value))}
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reqNotes">Requisition Notes / Remarks</Label>
          <Input
            id="reqNotes"
            placeholder="e.g. Needed for urgent customer billboard campaign."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[40px]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {loading ? 'Submitting...' : 'Submit Material Request'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Package, Plus, Trash2, Send, CheckCircle2 } from 'lucide-react'
import { TaskMaterialRequirementRecord, MaterialRecord } from '@/types/inventory.types'
import { addTaskRequirementAction, removeTaskRequirementAction } from '@/actions/inventory.actions'

interface TaskMaterialRequirementsCardProps {
  taskId: string
  requirements: TaskMaterialRequirementRecord[]
  materials: MaterialRecord[]
  onRequestMaterial?: () => void
  onRefresh?: () => void
  companyId?: string
}

export function TaskMaterialRequirementsCard({
  taskId,
  requirements,
  materials,
  onRequestMaterial,
  onRefresh,
  companyId,
}: TaskMaterialRequirementsCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [materialId, setMaterialId] = useState(materials[0]?.id || '')
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const activeMat = materials.find((m) => m.id === materialId)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialId || quantity <= 0) return
    setLoading(true)
    try {
      await addTaskRequirementAction(
        {
          production_task_id: taskId,
          material_id: materialId,
          estimated_quantity: Number(quantity),
          unit: activeMat?.unit || 'pcs',
          notes: notes.trim() || null,
        },
        companyId
      )
      setIsAdding(false)
      setNotes('')
      onRefresh?.()
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id: string) => {
    await removeTaskRequirementAction(id, companyId)
    onRefresh?.()
  }

  return (
    <Card className="p-4 border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-emerald-600" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
            Material Requirements ({requirements.length})
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(!isAdding)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Requirement
          </Button>
          {onRequestMaterial && (
            <Button
              size="sm"
              onClick={onRequestMaterial}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-3 w-3 mr-1" /> Request from Store
            </Button>
          )}
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border space-y-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Label required>Material Substrate</Label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.sku} - {m.name} ({m.current_stock} {m.unit} on hand)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label required>Est. Qty ({activeMat?.unit || 'unit'})</Label>
              <Input
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="h-8 text-xs"
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <Input
              placeholder="e.g. 100 sft for front banner printing"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button type="submit" size="sm" disabled={loading} className="h-8 text-xs bg-emerald-600 text-white">
              Save
            </Button>
          </div>
        </form>
      )}

      {requirements.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No material requirements configured for this task.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {requirements.map((req) => (
            <div key={req.id} className="py-2 flex items-center justify-between gap-2 text-xs">
              <div>
                <strong className="text-slate-900 dark:text-white">
                  {req.material?.sku} - {req.material?.name || 'Material'}
                </strong>
                <div className="text-[11px] text-slate-500">
                  Estimated: <strong>{req.estimated_quantity} {req.unit}</strong>
                  {req.notes && ` — ${req.notes}`}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(req.id)}
                className="h-6 w-6 p-0 text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

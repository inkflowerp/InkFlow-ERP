'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocationType } from '@/types/inventory.types'
import { createLocationAction } from '@/actions/inventory.actions'

interface NewLocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  companyId?: string
}

export function NewLocationModal({
  open,
  onOpenChange,
  onSuccess,
  companyId,
}: NewLocationModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [locationType, setLocationType] = useState<LocationType>('raw_material_store')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !name) {
      setError('Location code and name are required.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await createLocationAction(
        {
          location_code: code.trim().toUpperCase(),
          location_name: name.trim(),
          location_type: locationType,
          description: description.trim() || null,
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to create location.')
        return
      }

      onSuccess?.()
      onOpenChange(false)
      setCode('')
      setName('')
      setDescription('')
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
      title="Create Warehouse Inventory Location"
      description="Add a new physical warehouse store, staging rack, press floor area or scrap bin."
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
            <Label htmlFor="locCode" required>
              Location Code
            </Label>
            <Input
              id="locCode"
              placeholder="e.g. LOC-MAIN-01"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="locType" required>
              Location Type
            </Label>
            <select
              id="locType"
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as LocationType)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="main_store">Main Store Warehouse</option>
              <option value="raw_material_store">Raw Material Store</option>
              <option value="ink_store">Ink & Chemistry Room</option>
              <option value="production_floor">Production Floor Staging</option>
              <option value="remnant_rack">Remnant Rack / Usable Leftovers</option>
              <option value="scrap_area">Scrap / Wastage Area</option>
              <option value="finished_goods">Finished Goods Area</option>
              <option value="branch_store">Branch Store</option>
              <option value="other">Other Area</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="locName" required>
            Location Name
          </Label>
          <Input
            id="locName"
            placeholder="e.g. Ground Floor Main Substrate Store"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="locDesc">Description / Floor Details</Label>
          <Input
            id="locDesc"
            placeholder="e.g. Aisle 3, Heavy Roll Stacking Area"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
            {loading ? 'Creating...' : 'Create Location'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

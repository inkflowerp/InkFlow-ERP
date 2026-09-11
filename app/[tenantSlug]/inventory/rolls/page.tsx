'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  Disc,
  ArrowLeft,
  Printer,
  Layers,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Gauge,
  Sparkles,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { FeatureGate } from '@/components/shared/feature-gate'
import { InventoryRollRecord, StockLedgerRecord, MaterialRecord } from '@/types/inventory.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

interface MountedRollsPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default function MountedRollsPage({ params }: MountedRollsPageProps) {
  const resolvedParams = use(params)
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [rolls, setRolls] = useDataStore<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS, [])
  const [selectedRollForCut, setSelectedRollForCut] = useState<InventoryRollRecord | null>(null)
  const [consumedCutSft, setConsumedCutSft] = useState<number>(50)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleApplyConsumption = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRollForCut) return

    const newConsumed = selectedRollForCut.consumed_area_sft + consumedCutSft
    const newRemaining = Math.max(0, selectedRollForCut.initial_area_sft - newConsumed)

    PrintERPDataStore.updateItem<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, selectedRollForCut.id, {
      consumed_area_sft: newConsumed,
      remaining_area_sft: newRemaining,
    })

    const mat = PrintERPDataStore.findItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, selectedRollForCut.material_id)

    const ledgerEntry: StockLedgerRecord = {
      id: `stl-${Date.now()}`,
      company_id: 'c-01',
      material_id: selectedRollForCut.material_id,
      material_name: mat?.name || selectedRollForCut.roll_tag,
      transaction_type: 'consumption',
      quantity_change: -consumedCutSft,
      balance_after: newRemaining,
      unit: 'sft',
      unit_cost: mat?.average_cost || 0,
      total_cost: (mat?.average_cost || 0) * consumedCutSft,
      reference_id: selectedRollForCut.roll_tag,
      performed_by_name: 'Press Operator',
      notes: `Machine Cut: ${consumedCutSft} SFT pulled from active roll`,
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<StockLedgerRecord>(STORAGE_KEYS.STOCK_LEDGER, ledgerEntry)

    setSelectedRollForCut(null)
    showNotification(
      `Recorded ${consumedCutSft} SFT cut on ${selectedRollForCut.roll_tag}. Remaining: ${newRemaining} SFT.`
    )
  }

  return (
    <FeatureGate feature="inventory_rolls">
      <div className="space-y-6 max-w-6xl">
        {/* Header & Back Link */}
      <div>
        <Link
          href={`/${slug}/inventory`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3 bangla-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tBilingual('Back to Materials Hub', 'ম্যাটেরিয়াল হাব-এ ফিরুন')}
        </Link>

        <PageHeader
          titleEn="Active Mounted Rolls Tracker"
          titleBn="মেশিনে লোডকৃত রোল ট্র্যাকার"
          descriptionEn="Real-time square-footage monitoring for active rolls loaded on factory wide-format presses."
          descriptionBn="কারখানার ওয়াইড-ফরম্যাট মেশিনে লোডকৃত রোলের রিয়েল-টাইম ব্যবহার ও স্কয়ার-ফিট পর্যবেক্ষণ।"
          icon={Disc}
          iconColor="text-blue-600"
        />
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Roll Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rolls.map((roll: InventoryRollRecord) => {
          const percentRemaining = Math.round((roll.remaining_area_sft / roll.initial_area_sft) * 100)

          return (
            <Card key={roll.id} className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {roll.roll_tag}
                  </span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold capitalize">
                    {roll.status}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-1 text-slate-900 dark:text-white">
                  {roll.mounted_press_name}
                </CardTitle>
                <div className="text-[11px] text-slate-400">
                  Roll Spec: <strong>{roll.width_ft} ft</strong> Width × <strong>{roll.initial_length_ft} ft</strong> Length
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Visual Gauge Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-500">Remaining Area:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {roll.remaining_area_sft} / {roll.initial_area_sft} SFT ({percentRemaining}%)
                    </strong>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        percentRemaining > 40
                          ? 'bg-emerald-500'
                          : percentRemaining > 20
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${percentRemaining}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400">Total Consumed:</span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {roll.consumed_area_sft} SFT
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Loaded On:</span>
                    <div className="text-slate-600 dark:text-slate-400 font-mono">
                      {roll.created_at.split(' ')[0]}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRollForCut(roll)
                      setConsumedCutSft(50)
                    }}
                    className="w-full text-xs font-semibold"
                  >
                    <Minus className="h-3 w-3 mr-1 text-red-600" />
                    Log Press Run Cut (SFT)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* MODAL: LOG ROLL CONSUMPTION */}
      <ModalDialog
        open={Boolean(selectedRollForCut)}
        onOpenChange={(open) => !open && setSelectedRollForCut(null)}
        title="Log Roll Cut & Footage Consumption"
        description="Deduct printed square footage from the active mounted roll feeder."
      >
        {selectedRollForCut && (
          <form onSubmit={handleApplyConsumption} className="space-y-4 pt-1">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
              <span className="text-blue-700 dark:text-blue-300 font-bold">Feeder Roll: </span>
              <strong>{selectedRollForCut.roll_tag}</strong> ({selectedRollForCut.mounted_press_name})
              <div className="text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                Current Remaining: {selectedRollForCut.remaining_area_sft} SFT
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cutSft" required>Printed Area to Deduct (SFT)</Label>
              <Input
                id="cutSft"
                type="number"
                value={consumedCutSft}
                onChange={(e) => setConsumedCutSft(Number(e.target.value))}
                required
              />
            </div>

            <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-mono flex justify-between">
              <span>Remaining After Cut:</span>
              <strong className="text-emerald-600">
                {Math.max(0, selectedRollForCut.remaining_area_sft - consumedCutSft)} SFT
              </strong>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setSelectedRollForCut(null)} className="w-full sm:w-auto min-h-[40px]">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Deduct & Update Roll
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>
      </div>
    </FeatureGate>
  )
}

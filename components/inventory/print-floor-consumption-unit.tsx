'use client'

import React, { useState, useMemo } from 'react'
import {
 Flame,
 Scissors,
 Layers,
 Search,
 Plus,
 RefreshCw,
 AlertTriangle,
 CheckCircle2,
 Cpu,
 Printer,
 User,
 ArrowRightLeft,
 RotateCcw,
 Sparkles,
 TrendingDown,
 Clock,
 Building,
 FileText,
 Percent,
 CheckCheck,
 ChevronDown,
 ChevronRight,
 ShieldAlert,
 SlidersHorizontal,
 Disc,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import {
 FloorConsumptionRecord,
 MaterialRecord,
 InventoryLocationRecord,
 MaterialIssueRecord,
 MaterialIssueItemRecord,
 InventoryRollRecord,
 MaterialRequestRecord,
} from '@/types/inventory.types'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { returnFloorStockToStoreAction } from '@/actions/inventory.actions'
import { IssueMasterRollModal } from '@/components/inventory/issue-master-roll-modal'
import { formatFloorPieceDisplay } from '@/lib/units'

export interface PrintFloorConsumptionUnitProps {
 floorConsumptions: FloorConsumptionRecord[]
 materials?: MaterialRecord[]
 locations?: InventoryLocationRecord[]
 issues?: MaterialIssueRecord[]
 rolls?: InventoryRollRecord[]
 requests?: MaterialRequestRecord[]
 onRequestMaterial?: () => void
 onOpenLogConsumption: (item?: FloorConsumptionRecord | null) => void
 onRefresh: () => void
 companyId?: string
}

export function PrintFloorConsumptionUnit({
 floorConsumptions = [],
 materials = [],
 locations = [],
 issues = [],
 rolls = [],
 requests = [],
 onRequestMaterial,
 onOpenLogConsumption,
 onRefresh,
 companyId,
}: PrintFloorConsumptionUnitProps) {
 const { locale, tBilingual } = useI18n()
 const isBn = locale === 'bn'

  // Filter States
 const [selectedStatus, setSelectedStatus] = useState<string>('all')
 const [search, setSearch] = useState<string>('')

  // Return to Store Modal State
 const [returnItem, setReturnItem] = useState<FloorConsumptionRecord | null>(null)
 const [returnQty, setReturnQty] = useState<number>(1)
 const [returnLocationId, setReturnLocationId] = useState<string>(locations[0]?.id || '')
 const [returnNotes, setReturnNotes] = useState<string>('')
 const [returnLoading, setReturnLoading] = useState<boolean>(false)
 const [returnError, setReturnError] = useState<string | null>(null)
 const [returnSuccess, setReturnSuccess] = useState<string | null>(null)

  // Issue Master Roll to Floor State
 const [isIssueRollOpen, setIsIssueRollOpen] = useState<boolean>(false)

  // Strictly filter only rolls actually mounted or on the print floor (excludes unissued warehouse stock)
 const activeFloorRolls = useMemo(() => {
 return (rolls || []).filter(
      (r) =>
 r.status === 'mounted' ||
 r.status === 'in_use' ||
 r.status === 'on_floor' ||
 r.location_name === 'Print Floor' ||
 Boolean(r.mounted_machine_id) ||
 Boolean(r.mounted_machine_name)
    )
  }, [rolls])

  // Pending store requisitions requested by floor operators
 const pendingRequests = useMemo(() => {
 return (requests || []).filter((req) => req.status === 'requested' || req.status === 'pending')
  }, [requests])

  // Filtered Floor Consumptions
 const filteredRecords = useMemo(() => {
 return floorConsumptions.filter((rec) => {
 const matchStatus = selectedStatus === 'all' || rec.status === selectedStatus

 const q = search.trim().toLowerCase()
 const matchSearch =
        !q ||
 rec.material_name.toLowerCase().includes(q) ||
        (rec.sku && rec.sku.toLowerCase().includes(q)) ||
        (rec.issue_number && rec.issue_number.toLowerCase().includes(q)) ||
        (rec.operator_name && rec.operator_name.toLowerCase().includes(q)) ||
        (rec.machine_name && rec.machine_name.toLowerCase().includes(q)) ||
        (rec.job_reference && rec.job_reference.toLowerCase().includes(q))

 return matchStatus && matchSearch
    })
  }, [floorConsumptions, selectedStatus, search])

  // Aggregate KPI Calculations
 const kpis = useMemo(() => {
 let totalDispatchedQty = 0
 let totalConsumedQty = 0
 let totalWastageQty = 0
 let totalRemainingQty = 0
 let activeFloorItemsCount = 0

 for (const rec of floorConsumptions) {
 const issued = Number(rec.issued_quantity) || 0
 const consumed = Number(rec.consumed_quantity) || 0
 const wastage = Number(rec.wastage_quantity) || 0
 const remaining = Number(rec.remaining_floor_balance) || 0

 totalDispatchedQty += issued
 totalConsumedQty += consumed
 totalWastageQty += wastage
 totalRemainingQty += remaining

 if (remaining > 0) {
 activeFloorItemsCount++
      }
    }

 const scrapRatePercent =
 totalDispatchedQty > 0 ? Math.round((totalWastageQty / totalDispatchedQty) * 1000) / 10 : 0

 return {
 totalDispatchedQty,
 totalConsumedQty,
 totalWastageQty,
 totalRemainingQty,
 activeFloorItemsCount,
 scrapRatePercent,
    }
  }, [floorConsumptions])

  // Scrap Reasons Breakdown Aggregation
 const scrapReasonsBreakdown = useMemo(() => {
 const map: Record<string, { count: number; qty: number }> = {}
 for (const rec of floorConsumptions) {
 if (rec.wastage_quantity > 0) {
 const reason = rec.wastage_reason || 'General Cutting / Margin Loss'
 if (!map[reason]) {
 map[reason] = { count: 0, qty: 0 }
        }
 map[reason].count++
 map[reason].qty += Number(rec.wastage_quantity) || 0
      }
    }
 return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty)
  }, [floorConsumptions])

 const handleOpenReturnModal = (item: FloorConsumptionRecord) => {
 setReturnItem(item)
 setReturnQty(item.remaining_floor_balance > 0 ? item.remaining_floor_balance : 1)
 setReturnLocationId(locations[0]?.id || '')
 setReturnNotes('')
 setReturnError(null)
 setReturnSuccess(null)
  }

 const handleConfirmReturn = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!returnItem) return
 if (returnQty <= 0) {
 setReturnError('Return quantity must be greater than zero.')
 return
    }
 if (returnQty > returnItem.remaining_floor_balance) {
 setReturnError(`Return quantity exceeds remaining floor balance (${returnItem.remaining_floor_balance} ${returnItem.unit}).`)
 return
    }
 if (!returnLocationId) {
 setReturnError('Please select a target store location.')
 return
    }

 setReturnLoading(true)
 setReturnError(null)
 try {
 const res = await returnFloorStockToStoreAction(
        {
 issue_id: returnItem.issue_id || returnItem.id,
 material_id: returnItem.material_id,
 quantity: Number(returnQty),
 return_location_id: returnLocationId,
 notes: returnNotes.trim() || null,
        },
 companyId
      )

 if (!res.success) {
 setReturnError(res.error || 'Failed to return material to store.')
 return
      }

 setReturnSuccess('Material returned to warehouse store successfully!')
 setTimeout(() => {
 setReturnItem(null)
 onRefresh()
      }, 700)
    } catch (err: any) {
 setReturnError(err.message || 'Error executing return.')
    } finally {
 setReturnLoading(false)
    }
  }

 return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 4-KPI SUMMARY HUD BAR */}
      {/* ========================================================= */}
      <KpiGrid columns={4}>
        <KpiCard
 titleEn="Dispatched to Floor"titleBn="ফ্লোরে বরাদ্দকৃত মাল"value={kpis.totalDispatchedQty}
 icon={Layers}
 colorVariant="indigo"subtitleEn={`${floorConsumptions.length} lines`}
 subtitleBn={`${floorConsumptions.length}টি লাইন`}
        />

        <KpiCard
 titleEn="Actual Consumed"titleBn="প্রকৃত ব্যবহৃত"value={kpis.totalConsumedQty}
 icon={CheckCircle2}
 colorVariant="emerald"subtitleEn={`${kpis.totalDispatchedQty > 0 ? Math.round((kpis.totalConsumedQty / kpis.totalDispatchedQty) * 100) : 0}% consumed`}
 subtitleBn={`${kpis.totalDispatchedQty > 0 ? Math.round((kpis.totalConsumedQty / kpis.totalDispatchedQty) * 100) : 0}% ব্যবহৃত`}
        />

        <KpiCard
 titleEn="Floor Stock Balance"titleBn="মেশিনে অবশিষ্ট মাল"value={kpis.totalRemainingQty}
 icon={Printer}
 colorVariant="blue"badge={`${kpis.activeFloorItemsCount} active`}
 badgeColor="blue"/>

        <KpiCard
 titleEn="Scrap & Wastage"titleBn="অপচয় / স্ক্র্যাপ"value={kpis.totalWastageQty}
 icon={Flame}
 colorVariant="rose"badge={`${kpis.scrapRatePercent}% rate`}
 badgeColor="rose"/>
      </KpiGrid>

      {/* ========================================================= */}
      {/* ACTIVE MASTER ROLLS ON PRINT FLOOR SECTION */}
      {/* ========================================================= */}
      <Card className="p-3.5 border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Disc className="h-4 w-4 text-blue-600 dark:text-blue-400"/>
            <span className="text-xs font-black uppercase text-blue-900 dark:text-blue-200 tracking-wider">
              {tBilingual('Active Physical Rolls & Substrates on Print Floor', 'প্রিন্ট ফ্লোরে সক্রিয় পিস ও রোল বহর')} ({activeFloorRolls.length} Pcs)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onRequestMaterial && (
              <Button
 size="sm"variant="outline"onClick={onRequestMaterial}
 className="border-border text-foreground hover:bg-muted text-xs font-bold h-7.5 px-3 cursor-pointer shadow-xs gap-1.5 transition-colors">
                <Plus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"/>
                <span>{tBilingual('Request Material from Store', 'স্টোর থেকে রিকুইজিশন')}</span>
              </Button>
            )}
            <Button
 size="sm"onClick={() => setIsIssueRollOpen(true)}
 className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold h-7.5 px-3 cursor-pointer shadow-xs gap-1 transition-colors">
              <Plus className="h-3.5 w-3.5"/>
              <span>{tBilingual('Direct Issue to Floor', '+ সরাসরি ফ্লোরে ইস্যু')}</span>
            </Button>
          </div>
        </div>

        {/* Pending Store Requisitions Banner */}
        {pendingRequests.length > 0 && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse"/>
              <span className="font-semibold text-2xs">
                {tBilingual(
                  `${pendingRequests.length} Material Request(s) submitted — Awaiting Inventory & Warehouse Operations acceptance before floor delivery.`,
                  `${pendingRequests.length}টি মেটেরিয়াল রিকুইজিশন পেন্ডিং — স্টোর থেকে অনুমোদন ও ইস্যু সম্পন্ন হলে স্বয়ংক্রিয়ভাবে ফ্লোরে যুক্ত হবে।`
                )}
              </span>
            </div>
            <Badge variant="outline"className="bg-amber-100 dark:bg-amber-900/50 border-amber-300 text-amber-800 dark:text-amber-200 text-2xs font-bold">
              {pendingRequests.length} Pending
            </Badge>
          </div>
        )}

        {/* Piece-Level Fleet Overview Ribbon */}
        {activeFloorRolls.length > 0 && (
          <div className="p-2.5 bg-blue-100/60 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/60 flex items-center gap-2 overflow-x-auto text-2xs tabular-nums text-blue-900 dark:text-blue-200 scrollbar-thin">
            <span className="font-bold shrink-0 uppercase text-2xs tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Layers className="h-3 w-3"/>
 Floor Pieces:
            </span>
            {activeFloorRolls.map((r) => (
              <Badge
 key={r.id}
 variant="outline"className="bg-card/90 shrink-0 font-bold border-blue-300 text-blue-900 dark:text-blue-200 text-2xs py-0.5">
                {formatFloorPieceDisplay(r)}
              </Badge>
            ))}
          </div>
        )}

        {activeFloorRolls.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-card/60">
            <span>No master rolls currently mounted or active on the floor. Click &quot;Issue Master Roll to Floor&quot; to mount a roll.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeFloorRolls.map((roll) => {
 const currentLen = Number(roll.current_length_ft ?? (roll.remaining_area_sft / (roll.width_ft || 1)))
 const initialLen = Number(roll.initial_length_ft || 164)
 const percentLeft = initialLen > 0 ? Math.round((currentLen / initialLen) * 100) : 0
 const remainingArea = Number(roll.remaining_area_sft ?? (currentLen * (roll.width_ft || 1)))

 return (
                <div
 key={roll.id}
 className="p-3 bg-card rounded-xl border border-border shadow-xs flex flex-col justify-between space-y-2.5 hover:border-blue-400 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-foreground tabular-nums">
                          {roll.roll_code || roll.roll_tag}
                        </span>
                        <Badge className="text-2xs bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold py-0">
                          {roll.width_ft} ft Wide
                        </Badge>
                        <Badge variant="outline"className="text-2xs tabular-nums font-bold py-0 text-muted-foreground">
                          1 Pcs
                        </Badge>
                      </div>
                      <span className="text-2xs text-muted-foreground block mt-0.5 font-medium">
                        {roll.material?.name || 'Raw Material Roll'}
                      </span>
                    </div>

                    <Badge
 variant="outline"className={`text-2xs uppercase font-bold py-0 shrink-0 ${
 roll.status === 'mounted'
                          ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40'
                      }`}
                    >
                      {roll.status}
                    </Badge>
                  </div>

                  {/* Machine Mount / Staging */}
                  <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                    <span className="truncate font-medium">
                      {roll.mounted_machine_name || roll.location_name || 'General Press Workstation'}
                    </span>
                  </div>

                  {/* Length Ticker & Progress Bar */}
                  <div className="space-y-1 pt-1.5 border-t border-border">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="text-muted-foreground text-2xs">Available Length:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                        {currentLen.toFixed(2)} ft — 1 Pcs
                      </strong>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
 className={`h-full ${percentLeft < 20 ? 'bg-rose-500' : percentLeft < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
 style={{ width: `${percentLeft}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-2xs tabular-nums text-muted-foreground pt-0.5">
                      <span>Area: <strong>{remainingArea.toFixed(2)} SFT</strong></span>
                      <span>{percentLeft}% remaining ({initialLen}ft initial)</span>
                    </div>
                  </div>

                  {/* Action Button: Consume from this Piece */}
                  <Button
 size="sm"onClick={() => {
 const matchingFloorRec = floorConsumptions.find(
                        (fc) => fc.material_id === roll.material_id && fc.remaining_floor_balance > 0
                      )
 onOpenLogConsumption(
 matchingFloorRec || ({
 id: roll.id,
 material_id: roll.material_id,
 material_name: roll.material?.name || 'Substrate',
 sku: roll.material?.sku,
 machine_name: roll.mounted_machine_name,
 machine_id: roll.mounted_machine_id,
 remaining_floor_balance: currentLen,
 issued_quantity: initialLen,
 consumed_quantity: initialLen - currentLen,
 unit: 'ft',
 status: 'on_floor',
                        } as any)
                      )
                    }}
 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-7.5 cursor-pointer shadow-xs gap-1 mt-1">
                    <Scissors className="h-3.5 w-3.5"/>
                    <span>{tBilingual('Consume from this Piece', 'এই রোল থেকে কনজাম্পশন করুন')}</span>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>


      {/* ========================================================= */}
      {/* FILTER & SEARCH BAR */}
      {/* ========================================================= */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input
 placeholder={tBilingual(
                'Search material substrate, SKU, issue #, operator, machine, or job reference...',
                'কাঁচামাল, SKU, ভাউচার নং, অপারেটর, মেশিন বা জব দিয়ে খুঁজুন...'
              )}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 text-xs h-9"/>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 shrink-0 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'All Floor Items' },
              { id: 'on_floor', label: 'In Use / Active' },
              { id: 'partially_consumed', label: 'Partial' },
              { id: 'fully_consumed', label: 'Reconciled' },
            ].map((st) => (
              <Button
 key={st.id}
 size="sm"variant={selectedStatus === st.id ? 'secondary' : 'ghost'}
 onClick={() => setSelectedStatus(st.id)}
 className={cn(
                  'text-2xs h-7 px-2 font-medium cursor-pointer',
 selectedStatus === st.id
                    ? 'font-bold bg-muted text-foreground '
                    : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                )}
              >
                {st.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* MAIN TRACKER TABLE */}
      {/* ========================================================= */}
      <Card className="overflow-hidden border border-border shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground border-b font-bold">
              <tr>
                <th className="p-3">Issue Ref & Date</th>
                <th className="p-3">Material Substrate</th>
                <th className="p-3">Machine & Operator</th>
                <th className="p-3 text-right">Issued Qty</th>
                <th className="p-3 text-right">Consumed</th>
                <th className="p-3 text-right">Scrap / Wastage</th>
                <th className="p-3 text-right">Floor Balance</th>
                <th className="p-3 text-center">Progress</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    <Flame className="h-8 w-8 mx-auto mb-2 text-muted-foreground"/>
                    <p className="font-bold">No print floor consumption records match your filter.</p>
                    <p className="text-xs text-muted-foreground mt-1">
 Issue raw materials from the store to the floor or click below to log direct consumption.
                    </p>
                    <Button
 size="sm"onClick={() => setIsIssueRollOpen(true)}
 className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold cursor-pointer shadow-xs gap-1">
                      <Plus className="h-3.5 w-3.5 mr-1"/>
                      {tBilingual('Direct Issue to Floor', 'সরাসরি ফ্লোরে রোল ইস্যু করুন')}
                    </Button>
                  </td>
                </tr>
              ) : (
 filteredRecords.map((rec) => {
 const issued = Number(rec.issued_quantity) || 0
 const consumed = Number(rec.consumed_quantity) || 0
 const wastage = Number(rec.wastage_quantity) || 0
 const returned = Number(rec.returned_quantity) || 0
 const balance = Number(rec.remaining_floor_balance) || 0

 const consumedPercent = issued > 0 ? Math.min(100, Math.round((consumed / issued) * 100)) : 0
 const wastagePercent = issued > 0 ? Math.min(100, Math.round((wastage / issued) * 100)) : 0
 const balancePercent = issued > 0 ? Math.max(0, 100 - consumedPercent - wastagePercent) : 0

 return (
                    <tr
 key={rec.id}
 className={cn(
                        'hover:bg-muted dark:hover:bg-muted/30 transition-colors',
 balance > 0 ? 'bg-card ' : 'opacity-85'
                      )}
                    >
                      {/* Issue Ref & Date */}
                      <td className="p-3 tabular-nums">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-500"/>
                          <span>{rec.issue_number || 'DIR-FLOOR'}</span>
                        </div>
                        <span className="text-2xs text-muted-foreground block mt-0.5">
                          {new Date(rec.created_at).toLocaleDateString('en-GB', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Material Substrate */}
                      <td className="p-3">
                        <div className="font-bold text-foreground">
                          {rec.material_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {rec.sku && (
                            <Badge variant="outline"className="text-2xs tabular-nums py-0 px-1">
                              {rec.sku}
                            </Badge>
                          )}
                          {rec.roll_code && (
                            <Badge variant="outline"className="text-2xs tabular-nums py-0 px-1 bg-amber-50 text-amber-700 border-amber-300">
 Roll: {rec.roll_code}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Machine & Operator */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-foreground font-semibold truncate max-w-[160px]">
                          <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                          <span className="truncate">{rec.machine_name || 'General Floor'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-2xs text-muted-foreground mt-0.5">
                          <User className="h-3 w-3 text-muted-foreground shrink-0"/>
                          <span className="truncate">{rec.operator_name || 'Press Operator'}</span>
                          {rec.job_reference && (
                            <span className="text-2xs tabular-nums text-indigo-600 ml-1 truncate">
                              [{rec.job_reference}]
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Issued Qty */}
                      <td className="p-3 text-right">
                        <div className="font-bold tabular-nums text-foreground">
                          {issued.toLocaleString()} {rec.unit}
                        </div>
                      </td>

                      {/* Consumed Qty */}
                      <td className="p-3 text-right">
                        <div className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {consumed.toLocaleString()} {rec.unit}
                        </div>
                      </td>

                      {/* Scrap / Wastage */}
                      <td className="p-3 text-right">
                        {wastage > 0 ? (
                          <div>
                            <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                              {wastage.toLocaleString()} {rec.unit}
                            </span>
                            {rec.wastage_reason && (
                              <div className="text-2xs text-rose-500 font-semibold truncate max-w-[140px]"title={rec.wastage_reason}>
                                {rec.wastage_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground tabular-nums">0 {rec.unit}</span>
                        )}
                      </td>

                      {/* Remaining Floor Balance */}
                      <td className="p-3 text-right tabular-nums">
                        <div className={cn('font-bold', balance > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground')}>
                          {balance.toLocaleString()} {rec.unit}
                        </div>
                      </td>

                      {/* Visual Progress Bar */}
                      <td className="p-3 w-28">
                        <div className="w-full bg-muted rounded-full h-2 flex overflow-hidden">
                          <div
 className="bg-emerald-500 h-full"style={{ width: `${consumedPercent}%` }}
 title={`Consumed: ${consumedPercent}%`}
                          />
                          <div
 className="bg-rose-500 h-full"style={{ width: `${wastagePercent}%` }}
 title={`Scrap: ${wastagePercent}%`}
                          />
                          <div
 className="bg-blue-400 h-full"style={{ width: `${balancePercent}%` }}
 title={`On Floor: ${balancePercent}%`}
                          />
                        </div>
                        <div className="flex justify-between text-2xs tabular-nums text-muted-foreground mt-1">
                          <span>{consumedPercent}%</span>
                          <span>{balance > 0 ? `${balancePercent}% rem` : 'Done'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        {balance > 0 ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 text-2xs font-bold">
 On Floor ({balance})
                          </Badge>
                        ) : returned > 0 ? (
                          <Badge variant="outline"className="bg-amber-50 text-amber-800 border-amber-300 text-2xs font-bold">
 Returned ({returned})
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 text-2xs font-bold">
 Reconciled
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
 size="sm"variant="outline"onClick={() => onOpenLogConsumption(rec)}
 className="h-7 text-xs font-bold text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-700 cursor-pointer px-2"title="Log actual consumption or scrap for this item">
                            <Scissors className="h-3 w-3 mr-1"/>
 Log Run
                          </Button>

                          {balance > 0 && (
                            <Button
 size="sm"variant="ghost"onClick={() => handleOpenReturnModal(rec)}
 className="h-7 text-2xs font-semibold text-muted-foreground hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer px-1.5"title="Return leftover stock to store">
                              <RotateCcw className="h-3 w-3"/>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* ROOT CAUSE SCRAP & WASTAGE BREAKDOWN DIAGNOSTICS */}
      {/* ========================================================= */}
      {scrapReasonsBreakdown.length > 0 && (
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400"/>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              {tBilingual('Print Floor Scrap & Root Cause Analysis', 'ফ্লোর অপচয়ের কারণ ও বিশ্লেষণ')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {scrapReasonsBreakdown.map(([reason, stats]) => (
              <div
 key={reason}
 className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground truncate">{reason}</span>
                  <Badge variant="outline"className="text-2xs tabular-nums bg-rose-100 text-rose-800 border-rose-300">
                    {stats.count} events
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-black text-rose-700 dark:text-rose-400 tabular-nums">
                    {stats.qty.toLocaleString()} units
                  </span>
                  <span className="text-2xs tabular-nums text-muted-foreground font-semibold">
                    {stats.count} {tBilingual('records', 'লগ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* RETURN LEFTOVER MATERIAL MODAL */}
      {/* ========================================================= */}
      {returnItem && (
        <ModalDialog
 open={!!returnItem}
 onOpenChange={(v) => !v && setReturnItem(null)}
 title="Return Unused Floor Stock to Warehouse Store"description={`Return leftover ${returnItem.material_name} back to store inventory.`}
 onSubmit={handleConfirmReturn}
        >
          <div className="space-y-4 pt-1 text-xs">
            {returnSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600"/>
                <span>{returnSuccess}</span>
              </div>
            )}
            {returnError && (
              <div className="p-3 bg-rose-50 text-rose-900 rounded-lg border border-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600"/>
                <span>{returnError}</span>
              </div>
            )}

            <div className="p-3 bg-muted rounded-lg border space-y-1 text-xs">
              <div>
 Item: <strong>{returnItem.material_name}</strong> ({returnItem.sku})
              </div>
              <div>
 Available on Floor: <strong className="text-blue-600">{returnItem.remaining_floor_balance} {returnItem.unit}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
 Return Quantity ({returnItem.unit}) <span className="text-rose-500">*</span>
                </Label>
                <Input
 type="number"step="any"min="0.01"max={returnItem.remaining_floor_balance}
 value={returnQty}
 onChange={(e) => setReturnQty(Number(e.target.value))}
 required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
 Target Store Location <span className="text-rose-500">*</span>
                </Label>
                <select
 value={returnLocationId}
 onChange={(e) => setReturnLocationId(e.target.value)}
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium"required
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name} ({loc.location_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Return Reason / Notes</Label>
              <Input
 placeholder="e.g. Job finished early; returning remaining unused roll stock"value={returnNotes}
 onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button"variant="outline"onClick={() => setReturnItem(null)}>
 Cancel
              </Button>
              <Button type="submit"disabled={returnLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                {returnLoading ? 'Returning...' : 'Confirm Return to Store'}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* ========================================================= */}
      {/* UPGRADED ISSUE MASTER ROLL TO PRINT FLOOR MODAL */}
      {/* ========================================================= */}
      <IssueMasterRollModal
 open={isIssueRollOpen}
 onOpenChange={setIsIssueRollOpen}
 materials={materials}
 locations={locations}
 companyId={companyId}
 onSuccess={() => onRefresh()}
      />
    </div>
  )
}

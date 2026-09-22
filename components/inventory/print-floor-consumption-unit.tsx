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
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import {
  FloorConsumptionRecord,
  MaterialRecord,
  InventoryLocationRecord,
  MaterialIssueRecord,
  MaterialIssueItemRecord,
  InventoryRollRecord,
} from '@/types/inventory.types'
import { formatBDT } from '@/lib/formatters'
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
  onOpenLogConsumption: (item?: FloorConsumptionRecord | null) => void
  onRefresh: () => void
  companyId?: string
}

const PRODUCTION_MACHINES = [
  { id: 'all', name: 'All Workstations' },
  { id: 'roland', name: 'Roland Eco-Solvent (64")' },
  { id: 'mimaki', name: 'Mimaki UV Flatbed 2513' },
  { id: 'hp', name: 'HP Latex 570 (64")' },
  { id: 'laser', name: 'Laser Cutting Bay' },
  { id: 'cnc', name: 'CNC Router Workstation' },
  { id: 'screen', name: 'Screen Print Table' },
  { id: 'finishing', name: 'Finishing & Grommeting' },
]

export function PrintFloorConsumptionUnit({
  floorConsumptions = [],
  materials = [],
  locations = [],
  issues = [],
  rolls = [],
  onOpenLogConsumption,
  onRefresh,
  companyId,
}: PrintFloorConsumptionUnitProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  // Filter States
  const [selectedMachine, setSelectedMachine] = useState<string>('all')
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

  const activeFloorRolls = useMemo(() => {
    return (rolls || []).filter((r) => r.status === 'mounted' || r.status === 'available' || r.status === 'in_use')
  }, [rolls])

  // Filtered Floor Consumptions
  const filteredRecords = useMemo(() => {
    return floorConsumptions.filter((rec) => {
      const matchMachine =
        selectedMachine === 'all' ||
        (rec.machine_name && rec.machine_name.toLowerCase().includes(selectedMachine.toLowerCase())) ||
        (rec.machine_id && rec.machine_id.toLowerCase().includes(selectedMachine.toLowerCase()))

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

      return matchMachine && matchStatus && matchSearch
    })
  }, [floorConsumptions, selectedMachine, selectedStatus, search])

  // Aggregate KPI Calculations
  const kpis = useMemo(() => {
    let totalDispatchedValue = 0
    let totalConsumedValue = 0
    let totalWastageValue = 0
    let totalRemainingFloorValue = 0
    let totalDispatchedQty = 0
    let totalConsumedQty = 0
    let totalWastageQty = 0
    let totalRemainingQty = 0
    let activeFloorItemsCount = 0

    for (const rec of floorConsumptions) {
      const cost = Number(rec.unit_cost) || 0
      const issued = Number(rec.issued_quantity) || 0
      const consumed = Number(rec.consumed_quantity) || 0
      const wastage = Number(rec.wastage_quantity) || 0
      const remaining = Number(rec.remaining_floor_balance) || 0

      totalDispatchedQty += issued
      totalConsumedQty += consumed
      totalWastageQty += wastage
      totalRemainingQty += remaining

      totalDispatchedValue += issued * cost
      totalConsumedValue += consumed * cost
      totalWastageValue += wastage * cost
      totalRemainingFloorValue += remaining * cost

      if (remaining > 0) {
        activeFloorItemsCount++
      }
    }

    const scrapRatePercent =
      totalDispatchedQty > 0 ? Math.round((totalWastageQty / totalDispatchedQty) * 1000) / 10 : 0

    return {
      totalDispatchedValue,
      totalConsumedValue,
      totalWastageValue,
      totalRemainingFloorValue,
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
    const map: Record<string, { count: number; qty: number; cost: number }> = {}
    for (const rec of floorConsumptions) {
      if (rec.wastage_quantity > 0) {
        const reason = rec.wastage_reason || 'General Cutting / Margin Loss'
        if (!map[reason]) {
          map[reason] = { count: 0, qty: 0, cost: 0 }
        }
        map[reason].count++
        map[reason].qty += Number(rec.wastage_quantity) || 0
        map[reason].cost += Number(rec.wastage_cost) || (Number(rec.wastage_quantity) * Number(rec.unit_cost))
      }
    }
    return Object.entries(map).sort((a, b) => b[1].cost - a[1].cost)
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
      {/* 5-KPI SUMMARY HUD BAR */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Dispatched to Floor */}
        <Card className="p-3.5 bg-linear-to-br from-indigo-50/70 to-indigo-100/40 dark:from-indigo-950/40 dark:to-indigo-900/20 border-indigo-200 dark:border-indigo-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">
              {tBilingual('Dispatched to Floor', 'ফ্লোরে বরাদ্দকৃত মাল')}
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {formatBDT(kpis.totalDispatchedValue)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold font-mono">
              {kpis.totalDispatchedQty.toLocaleString()} units
            </span>
          </div>
        </Card>

        {/* KPI 2: Actually Consumed */}
        <Card className="p-3.5 bg-linear-to-br from-emerald-50/70 to-emerald-100/40 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
              {tBilingual('Actual Consumed', 'প্রকৃত ব্যবহৃত')}
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {formatBDT(kpis.totalConsumedValue)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold font-mono">
              {kpis.totalConsumedQty.toLocaleString()} units
            </span>
          </div>
        </Card>

        {/* KPI 3: Floor Balance (Remaining at Machines) */}
        <Card className="p-3.5 bg-linear-to-br from-blue-50/70 to-blue-100/40 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200 dark:border-blue-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-400 tracking-wider">
              {tBilingual('Floor Stock Balance', 'মেশিনে অবশিষ্ট মাল')}
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Printer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono">
              {formatBDT(kpis.totalRemainingFloorValue)}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700">
              {kpis.activeFloorItemsCount} active lines
            </Badge>
          </div>
        </Card>

        {/* KPI 4: Scrap & Wastage Loss */}
        <Card className="p-3.5 bg-linear-to-br from-rose-50/70 to-rose-100/40 dark:from-rose-950/40 dark:to-rose-900/20 border-rose-200 dark:border-rose-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400 tracking-wider">
              {tBilingual('Scrap & Wastage Loss', 'অপচয় / স্ক্র্যাপ ক্ষতি')}
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-black text-rose-700 dark:text-rose-400 font-mono">
              {formatBDT(kpis.totalWastageValue)}
            </span>
            <span className="text-[11px] font-bold text-rose-600 font-mono">
              {kpis.scrapRatePercent}% rate
            </span>
          </div>
        </Card>

        {/* KPI 5: Action Button / Reconcile */}
        <Card className="p-3.5 bg-linear-to-br from-purple-50/70 to-purple-100/40 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200 dark:border-purple-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-purple-700 dark:text-purple-400 tracking-wider">
              {tBilingual('Quick Floor Run', 'দ্রুত কনজাম্পশন')}
            </span>
            <Scissors className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <Button
            size="sm"
            onClick={() => onOpenLogConsumption(null)}
            className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-8 cursor-pointer shadow-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{tBilingual('Log Consumption', 'কনজাম্পশন এন্ট্রি')}</span>
          </Button>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* ACTIVE MASTER ROLLS ON PRINT FLOOR SECTION */}
      {/* ========================================================= */}
      <Card className="p-3.5 border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Disc className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-black uppercase text-blue-900 dark:text-blue-200 tracking-wider">
              {tBilingual('Active Physical Rolls & Substrates on Print Floor', 'প্রিন্ট ফ্লোরে সক্রিয় পিস ও রোল বহর')} ({activeFloorRolls.length} Pcs)
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsIssueRollOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-7.5 px-3 cursor-pointer shadow-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{tBilingual('Issue Master Roll to Floor', '+ নতুন রোল ইস্যু করুন')}</span>
          </Button>
        </div>

        {/* Piece-Level Fleet Overview Ribbon */}
        {activeFloorRolls.length > 0 && (
          <div className="p-2.5 bg-blue-100/60 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/60 flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-blue-900 dark:text-blue-200 scrollbar-thin">
            <span className="font-bold shrink-0 uppercase text-[10px] tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Floor Pieces:
            </span>
            {activeFloorRolls.map((r) => (
              <Badge
                key={r.id}
                variant="outline"
                className="bg-white/90 dark:bg-slate-900/90 shrink-0 font-bold border-blue-300 text-blue-900 dark:text-blue-200 text-[10px] py-0.5"
              >
                {formatFloorPieceDisplay(r)}
              </Badge>
            ))}
          </div>
        )}

        {activeFloorRolls.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 border border-dashed rounded-lg bg-white/60 dark:bg-slate-900/60">
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
                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2.5 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-slate-900 dark:text-white font-mono">
                          {roll.roll_code || roll.roll_tag}
                        </span>
                        <Badge className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold py-0">
                          {roll.width_ft} ft Wide
                        </Badge>
                        <Badge variant="outline" className="text-[9px] font-mono font-bold py-0 text-slate-600 dark:text-slate-400">
                          1 Pcs
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-0.5 font-medium">
                        {roll.material?.name || 'Raw Material Roll'}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-bold py-0 shrink-0 ${
                        roll.status === 'mounted'
                          ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40'
                      }`}
                    >
                      {roll.status}
                    </Badge>
                  </div>

                  {/* Machine Mount / Staging */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <Cpu className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">
                      {roll.mounted_machine_name || roll.location_name || 'General Press Workstation'}
                    </span>
                  </div>

                  {/* Length Ticker & Progress Bar */}
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 text-[11px]">Available Length:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                        {currentLen.toFixed(2)} ft — 1 Pcs
                      </strong>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${percentLeft < 20 ? 'bg-rose-500' : percentLeft < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${percentLeft}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                      <span>Area: <strong>{remainingArea.toFixed(2)} SFT</strong></span>
                      <span>{percentLeft}% remaining ({initialLen}ft initial)</span>
                    </div>
                  </div>

                  {/* Action Button: Consume from this Piece */}
                  <Button
                    size="sm"
                    onClick={() => {
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
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-7.5 cursor-pointer shadow-xs gap-1 mt-1"
                  >
                    <Scissors className="h-3.5 w-3.5" />
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder={tBilingual(
                'Search material substrate, SKU, issue #, operator, machine, or job reference...',
                'কাঁচামাল, SKU, ভাউচার নং, অপারেটর, মেশিন বা জব দিয়ে খুঁজুন...'
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Machine Workstation Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-thin">
            {PRODUCTION_MACHINES.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant={selectedMachine === m.id ? 'default' : 'outline'}
                onClick={() => setSelectedMachine(m.id)}
                className="text-xs h-8 px-2.5 cursor-pointer shrink-0 font-semibold"
              >
                {m.name}
              </Button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'all', label: 'All Floor Items' },
              { id: 'on_floor', label: 'In Use / Active' },
              { id: 'partially_consumed', label: 'Partial' },
              { id: 'fully_consumed', label: 'Reconciled' },
            ].map((st) => (
              <Button
                key={st.id}
                size="sm"
                variant={selectedStatus === st.id ? 'secondary' : 'ghost'}
                onClick={() => setSelectedStatus(st.id)}
                className={cn(
                  'text-[11px] h-7 px-2 font-medium cursor-pointer',
                  selectedStatus === st.id ? 'font-bold bg-slate-200 dark:bg-slate-800' : ''
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
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b font-bold">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    <Flame className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-bold">No print floor consumption records match your filter.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Issue raw materials from the store to the floor or click below to log direct consumption.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => onOpenLogConsumption(null)}
                      className="mt-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Log Floor Consumption
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
                        'hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors',
                        balance > 0 ? 'bg-white dark:bg-slate-950/20' : 'opacity-85'
                      )}
                    >
                      {/* Issue Ref & Date */}
                      <td className="p-3 font-mono">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{rec.issue_number || 'DIR-FLOOR'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(rec.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Material Substrate */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {rec.material_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {rec.sku && (
                            <Badge variant="outline" className="text-[9px] font-mono py-0 px-1">
                              {rec.sku}
                            </Badge>
                          )}
                          {rec.roll_code && (
                            <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 bg-amber-50 text-amber-700 border-amber-300">
                              Roll: {rec.roll_code}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Machine & Operator */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[160px]">
                          <Printer className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{rec.machine_name || 'General Floor'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{rec.operator_name || 'Press Operator'}</span>
                          {rec.job_reference && (
                            <span className="text-[10px] font-mono text-indigo-600 ml-1 truncate">
                              [{rec.job_reference}]
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Issued Qty */}
                      <td className="p-3 text-right">
                        <div className="font-bold font-mono text-slate-900 dark:text-white">
                          {issued.toLocaleString()} {rec.unit}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {formatBDT(rec.total_cost)}
                        </div>
                      </td>

                      {/* Consumed Qty */}
                      <td className="p-3 text-right">
                        <div className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                          {consumed.toLocaleString()} {rec.unit}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {formatBDT(consumed * rec.unit_cost)}
                        </div>
                      </td>

                      {/* Scrap / Wastage */}
                      <td className="p-3 text-right">
                        {wastage > 0 ? (
                          <div>
                            <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                              {wastage.toLocaleString()} {rec.unit}
                            </span>
                            <div className="text-[10px] text-rose-500 font-semibold truncate max-w-[120px]" title={rec.wastage_reason || ''}>
                              {rec.wastage_reason || 'Scrap Loss'} ({formatBDT(rec.wastage_cost)})
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">0 {rec.unit}</span>
                        )}
                      </td>

                      {/* Remaining Floor Balance */}
                      <td className="p-3 text-right font-mono">
                        <div className={cn('font-bold', balance > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400')}>
                          {balance.toLocaleString()} {rec.unit}
                        </div>
                        {balance > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {formatBDT(balance * rec.unit_cost)}
                          </span>
                        )}
                      </td>

                      {/* Visual Progress Bar */}
                      <td className="p-3 w-28">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 flex overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${consumedPercent}%` }}
                            title={`Consumed: ${consumedPercent}%`}
                          />
                          <div
                            className="bg-rose-500 h-full"
                            style={{ width: `${wastagePercent}%` }}
                            title={`Scrap: ${wastagePercent}%`}
                          />
                          <div
                            className="bg-blue-400 h-full"
                            style={{ width: `${balancePercent}%` }}
                            title={`On Floor: ${balancePercent}%`}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                          <span>{consumedPercent}%</span>
                          <span>{balance > 0 ? `${balancePercent}% rem` : 'Done'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        {balance > 0 ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-bold">
                            On Floor ({balance})
                          </Badge>
                        ) : returned > 0 ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
                            Returned ({returned})
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold">
                            Reconciled
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenLogConsumption(rec)}
                            className="h-7 text-xs font-bold text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-700 cursor-pointer px-2"
                            title="Log actual consumption or scrap for this item"
                          >
                            <Scissors className="h-3 w-3 mr-1" />
                            Log Run
                          </Button>

                          {balance > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReturnModal(rec)}
                              className="h-7 text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer px-1.5"
                              title="Return leftover stock to store"
                            >
                              <RotateCcw className="h-3 w-3" />
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
        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Print Floor Scrap & Root Cause Cost Analysis', 'ফ্লোর অপচয়ের কারণ ও ক্ষতি বিশ্লেষণ')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {scrapReasonsBreakdown.map(([reason, stats]) => (
              <div
                key={reason}
                className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs flex flex-col justify-between space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{reason}</span>
                  <Badge variant="outline" className="text-[9px] font-mono bg-rose-100 text-rose-800 border-rose-300">
                    {stats.count} events
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-black text-rose-700 dark:text-rose-400 font-mono">
                    {formatBDT(stats.cost)}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    {stats.qty.toLocaleString()} units scrap
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
          title="Return Unused Floor Stock to Warehouse Store"
          description={`Return leftover ${returnItem.material_name} back to store inventory.`}
          onSubmit={handleConfirmReturn}
        >
          <div className="space-y-4 pt-1 text-xs">
            {returnSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{returnSuccess}</span>
              </div>
            )}
            {returnError && (
              <div className="p-3 bg-rose-50 text-rose-900 rounded-lg border border-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>{returnError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border space-y-1 text-xs">
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
                  type="number"
                  step="any"
                  min="0.01"
                  max={returnItem.remaining_floor_balance}
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
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  required
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
                placeholder="e.g. Job finished early; returning remaining unused roll stock"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setReturnItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={returnLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
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

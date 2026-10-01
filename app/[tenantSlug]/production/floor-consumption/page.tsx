'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Flame,
  Plus,
  RefreshCw,
  Printer,
  Scissors,
  Layers,
  Sparkles,
  ArrowRightLeft,
  AlertTriangle,
  RotateCcw,
  Clock,
  Cpu,
  ChevronRight,
  TrendingDown,
  ShieldCheck,
  Disc,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { Card, CardContent } from '@/components/ui/card'
import { PrintFloorConsumptionUnit } from '@/components/inventory/print-floor-consumption-unit'
import { LogConsumptionModal } from '@/components/inventory/log-consumption-modal'
import { IssueMasterRollModal } from '@/components/inventory/issue-master-roll-modal'
import { MaterialRequestModal } from '@/components/inventory/material-request-modal'
import {
  getInventoryDashboardDataAction,
  getFloorConsumptionsAction,
} from '@/actions/inventory.actions'
import {
  FloorConsumptionRecord,
  MaterialRecord,
  InventoryLocationRecord,
  MaterialIssueRecord,
  InventoryRollRecord,
  MaterialRequestRecord,
} from '@/types/inventory.types'
import { ProductionTaskRecord } from '@/types/production.types'
import { getProductionTasksAction } from '@/actions/production-planning.actions'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export default function FloorConsumptionPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id || 'default'

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data States
  const [floorConsumptions, setFloorConsumptions] = useState<FloorConsumptionRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [locations, setLocations] = useState<InventoryLocationRecord[]>([])
  const [issues, setIssues] = useState<MaterialIssueRecord[]>([])
  const [rolls, setRolls] = useState<InventoryRollRecord[]>([])
  const [requests, setRequests] = useState<MaterialRequestRecord[]>([])
  const [tasks, setTasks] = useState<ProductionTaskRecord[]>([])

  // Modal States
  const [isLogConsumptionOpen, setIsLogConsumptionOpen] = useState(false)
  const [selectedFloorRecord, setSelectedFloorRecord] = useState<FloorConsumptionRecord | null>(null)
  const [selectedRollId, setSelectedRollId] = useState<string | undefined>(undefined)
  const [isIssueMasterRollOpen, setIsIssueMasterRollOpen] = useState(false)
  const [isMaterialRequestOpen, setIsMaterialRequestOpen] = useState(false)

  const loadFloorData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [invRes, taskRes] = await Promise.all([
        getInventoryDashboardDataAction(companyId),
        getProductionTasksAction({}, companyId),
      ])

      if (invRes.success && invRes.data) {
        setFloorConsumptions(invRes.data.floorConsumptions || [])
        setMaterials(invRes.data.materials || [])
        setLocations(invRes.data.locations || [])
        setIssues(invRes.data.issues || [])
        setRolls(invRes.data.rolls || [])
        setRequests(invRes.data.requests || [])
      } else if (!invRes.success) {
        setError(invRes.error || 'Failed to load floor inventory data')
      }

      if (taskRes.success && taskRes.data) {
        setTasks(taskRes.data)
      }
    } catch (err: any) {
      setError(err?.message || 'Network error fetching floor consumption')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    setMounted(true)
    loadFloorData()
  }, [loadFloorData])

  // Realtime Broadcast Synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSync = () => {
      loadFloorData()
    }

    window.addEventListener('printerp_table_synced:floor_consumption', handleSync)
    window.addEventListener('printerp_table_synced:stock_ledger', handleSync)
    window.addEventListener('printerp_table_synced:materials', handleSync)
    window.addEventListener('printerp_table_synced:physical_rolls', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:floor_consumption', handleSync)
      window.removeEventListener('printerp_table_synced:stock_ledger', handleSync)
      window.removeEventListener('printerp_table_synced:materials', handleSync)
      window.removeEventListener('printerp_table_synced:physical_rolls', handleSync)
    }
  }, [loadFloorData])

  if (!mounted) return null

  return (
    <PanelAccessGuard
      module="production"
      action="view"
      panelTitle="Materials & Consumption"
      panelTitleBn="কাঁচামাল ও খরচ"
    >
      <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Page Header */}
      <PageHeader
        titleEn="Materials & Consumption"
        titleBn="কাঁচামাল ও ফ্লোর খরচ"
        descriptionEn="Real-time press floor material usage, physical roll off-cut tracking, job-linked substrate consumption & live scrap telemetry"
        descriptionBn="প্রিন্ট ফ্লোর রিয়েল-টাইম মেটেরিয়াল ব্যবহার, রোল কাটিং ট্র্যাকিং, জব ভিত্তিক মেটেরিয়াল কনজাম্পশন ও স্ক্র্যাপ অডিট"
        icon={Flame}
        iconColor="text-amber-500"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFloorData()}
              disabled={loading}
              className="h-9 w-9 p-0 flex items-center justify-center shrink-0 border-input hover:bg-muted text-foreground shadow-xs cursor-pointer transition-colors"
              title={isBn ? 'রিফ্রেশ' : 'Refresh'}
              aria-label={isBn ? 'রিফ্রেশ' : 'Refresh'}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMaterialRequestOpen(true)}
              className="gap-2 border-amber-300 dark:border-amber-700/60 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{isBn ? 'স্টোর থেকে রিকুইজিশন পাঠান' : 'Request Material'}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsIssueMasterRollOpen(true)}
              className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Disc className="h-4 w-4 text-white shrink-0" />
              <span>{isBn ? 'সরাসরি রোল ইস্যু করুন' : 'Direct Issue to Floor'}</span>
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <Card className="border-red-500/30 bg-red-950/20 text-red-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadFloorData()}
              className="text-red-300 hover:bg-red-900/40"
            >
              {isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interactive Floor Workstation */}
      <PrintFloorConsumptionUnit
        floorConsumptions={floorConsumptions}
        materials={materials}
        locations={locations}
        issues={issues}
        rolls={rolls}
        requests={requests}
        onRequestMaterial={() => setIsMaterialRequestOpen(true)}
        onOpenLogConsumption={(record) => {
          if (record && (record as any).width_ft) {
            // It's a roll piece
            setSelectedRollId(record.id)
            setSelectedFloorRecord(null)
          } else {
            setSelectedFloorRecord(record || null)
            setSelectedRollId(undefined)
          }
          setIsLogConsumptionOpen(true)
        }}
        onRefresh={() => loadFloorData()}
        companyId={companyId}
      />

      {/* Operator Material Requisition Modal */}
      {isMaterialRequestOpen && (
        <MaterialRequestModal
          open={isMaterialRequestOpen}
          onOpenChange={setIsMaterialRequestOpen}
          materials={materials}
          locations={locations}
          tasks={tasks}
          onSuccess={() => {
            setIsMaterialRequestOpen(false)
            loadFloorData()
          }}
          companyId={companyId}
        />
      )}

      {/* Log Floor Consumption Modal */}
      {isLogConsumptionOpen && (
        <LogConsumptionModal
          open={isLogConsumptionOpen}
          onOpenChange={(open) => {
            setIsLogConsumptionOpen(open)
            if (!open) {
              setSelectedFloorRecord(null)
              setSelectedRollId(undefined)
            }
          }}
          materials={materials}
          locations={locations}
          tasks={tasks}
          rolls={rolls}
          selectedRollId={selectedRollId}
          selectedFloorRecord={selectedFloorRecord}
          onSuccess={() => {
            setIsLogConsumptionOpen(false)
            setSelectedFloorRecord(null)
            setSelectedRollId(undefined)
            loadFloorData()
          }}
          companyId={companyId}
        />
      )}

      {/* Issue Master Roll Modal */}
      {isIssueMasterRollOpen && (
        <IssueMasterRollModal
          open={isIssueMasterRollOpen}
          onOpenChange={setIsIssueMasterRollOpen}
          materials={materials}
          locations={locations}
          onSuccess={() => {
            setIsIssueMasterRollOpen(false)
            loadFloorData()
          }}
          companyId={companyId}
        />
      )}
    </div>
    </PanelAccessGuard>
  )
}

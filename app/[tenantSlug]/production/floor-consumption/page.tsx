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
import { Card, CardContent } from '@/components/ui/card'
import { PrintFloorConsumptionUnit } from '@/components/inventory/print-floor-consumption-unit'
import { LogConsumptionModal } from '@/components/inventory/log-consumption-modal'
import { IssueMasterRollModal } from '@/components/inventory/issue-master-roll-modal'
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
  const [tasks, setTasks] = useState<ProductionTaskRecord[]>([])

  // Modal States
  const [isLogConsumptionOpen, setIsLogConsumptionOpen] = useState(false)
  const [selectedFloorRecord, setSelectedFloorRecord] = useState<FloorConsumptionRecord | null>(null)
  const [selectedRollId, setSelectedRollId] = useState<string | undefined>(undefined)
  const [isIssueMasterRollOpen, setIsIssueMasterRollOpen] = useState(false)

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
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Page Header */}
      <PageHeader
        titleEn="Factory Floor Consumption & Tracking"
        titleBn="কারখানা ফ্লোর কনজাম্পশন ও মেটেরিয়াল ট্র্যাকিং"
        descriptionEn="Real-time press floor material usage, physical roll off-cut tracking, job-linked substrate consumption & live scrap telemetry"
        descriptionBn="প্রিন্ট ফ্লোর রিয়েল-টাইম মেটেরিয়াল ব্যবহার, রোল কাটিং ট্র্যাকিং, জব ভিত্তিক মেটেরিয়াল কনজাম্পশন ও স্ক্র্যাপ অডিট"
        icon={Flame}
        iconColor="text-amber-500"
        badge={
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-normal text-xs">
            Factory &amp; Floor
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFloorData()}
              disabled={loading}
              className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsIssueMasterRollOpen(true)}
              className="gap-2 border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50"
            >
              <Disc className="h-4 w-4 text-cyan-400" />
              <span>{isBn ? 'মাস্টার রোল ইস্যু করুন' : 'Issue Master Roll'}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setSelectedFloorRecord(null)
                setIsLogConsumptionOpen(true)
              }}
              className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium shadow-md shadow-orange-950/40"
            >
              <Flame className="h-4 w-4" />
              <span>{isBn ? 'কনজাম্পশন এন্ট্রি' : 'Log Consumption'}</span>
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
  )
}

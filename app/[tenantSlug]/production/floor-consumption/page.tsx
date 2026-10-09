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
import { PageContainer } from '@/components/ui/page-container'
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
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

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

 const hydrateFromLocalStore = useCallback(() => {
    try {
      const localFloor = [
        ...(PrintFlowDataStore.getAll<FloorConsumptionRecord>(STORAGE_KEYS.FLOOR_CONSUMPTIONS, companyId) || []),
        ...(slug && slug !== companyId ? PrintFlowDataStore.getAll<FloorConsumptionRecord>(STORAGE_KEYS.FLOOR_CONSUMPTIONS, slug) || [] : []),
        ...(PrintFlowDataStore.getAll<FloorConsumptionRecord>(STORAGE_KEYS.FLOOR_CONSUMPTIONS) || []),
      ]
      if (localFloor.length > 0) {
        const floorMap = new Map<string, FloorConsumptionRecord>()
        for (const item of localFloor) {
          if (item?.id) floorMap.set(item.id, item)
        }
        setFloorConsumptions(Array.from(floorMap.values()))
      }

      const localRolls = [
        ...(PrintFlowDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []),
        ...(slug && slug !== companyId ? PrintFlowDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, slug) || [] : []),
        ...(PrintFlowDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS) || []),
      ]
      if (localRolls.length > 0) {
        const rollMap = new Map<string, InventoryRollRecord>()
        for (const r of localRolls) {
          if (r?.id) rollMap.set(r.id, r)
        }
        setRolls(Array.from(rollMap.values()))
      }

      const localMats = [
        ...(PrintFlowDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || []),
        ...(PrintFlowDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS) || []),
      ]
      if (localMats.length > 0) {
        const matMap = new Map<string, MaterialRecord>()
        for (const m of localMats) {
          if (m?.id) matMap.set(m.id, m)
        }
        setMaterials(Array.from(matMap.values()))
      }

      const localLocs = [
        ...(PrintFlowDataStore.getAll<InventoryLocationRecord>(STORAGE_KEYS.LOCATIONS, companyId) || []),
        ...(PrintFlowDataStore.getAll<InventoryLocationRecord>(STORAGE_KEYS.LOCATIONS) || []),
      ]
      if (localLocs.length > 0) {
        const locMap = new Map<string, InventoryLocationRecord>()
        for (const l of localLocs) {
          if (l?.id) locMap.set(l.id, l)
        }
        setLocations(Array.from(locMap.values()))
      }
    } catch (err) {
      console.error('[FloorConsumptionPage] Error hydrating from local store:', err)
    }
  }, [companyId, slug])

  const loadFloorData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      setError(null)
      const [invRes, taskRes] = await Promise.all([
        getInventoryDashboardDataAction(companyId),
        getProductionTasksAction({}, companyId),
      ])

      if (invRes.success && invRes.data) {
        const serverFloor = invRes.data.floorConsumptions || []
        const serverRolls = invRes.data.rolls || []

        // Non-destructive merge for floor consumptions
        setFloorConsumptions((prev) => {
          const map = new Map<string, FloorConsumptionRecord>()
          for (const item of prev) {
            if (item?.id) map.set(item.id, item)
          }
          const localStored = [
            ...(PrintFlowDataStore.getAll<FloorConsumptionRecord>(STORAGE_KEYS.FLOOR_CONSUMPTIONS, companyId) || []),
            ...(PrintFlowDataStore.getAll<FloorConsumptionRecord>(STORAGE_KEYS.FLOOR_CONSUMPTIONS) || []),
          ]
          for (const item of localStored) {
            if (item?.id && !map.has(item.id)) map.set(item.id, item)
          }
          for (const item of serverFloor) {
            if (!item?.id) continue
            const existing = map.get(item.id)
            map.set(item.id, existing ? { ...existing, ...item } : item)
          }
          const merged = Array.from(map.values())
          try {
            PrintFlowDataStore.set(STORAGE_KEYS.FLOOR_CONSUMPTIONS, merged, false, companyId)
            PrintFlowDataStore.set(STORAGE_KEYS.FLOOR_CONSUMPTIONS, merged, false)
          } catch {}
          return merged
        })

        // Non-destructive merge for rolls
        setRolls((prev) => {
          const map = new Map<string, InventoryRollRecord>()
          for (const r of prev) {
            if (r?.id) map.set(r.id, r)
          }
          const localStoredRolls = [
            ...(PrintFlowDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []),
            ...(PrintFlowDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS) || []),
          ]
          for (const r of localStoredRolls) {
            if (r?.id && !map.has(r.id)) map.set(r.id, r)
          }
          for (const r of serverRolls) {
            if (!r?.id) continue
            const existing = map.get(r.id)
            map.set(r.id, existing ? { ...existing, ...r } : r)
          }
          const merged = Array.from(map.values())
          try {
            PrintFlowDataStore.set(STORAGE_KEYS.MOUNTED_ROLLS, merged, false, companyId)
            PrintFlowDataStore.set(STORAGE_KEYS.MOUNTED_ROLLS, merged, false)
          } catch {}
          return merged
        })

        if (invRes.data.materials?.length) setMaterials(invRes.data.materials)
        if (invRes.data.locations?.length) setLocations(invRes.data.locations)
        if (invRes.data.issues?.length) setIssues(invRes.data.issues)
        if (invRes.data.requests) setRequests(invRes.data.requests)
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
    hydrateFromLocalStore()
    loadFloorData(false)
  }, [hydrateFromLocalStore, loadFloorData])

  // Realtime Broadcast Synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSync = () => {
      hydrateFromLocalStore()
      loadFloorData(true)
    }

    window.addEventListener('printflow_table_synced:floor_consumption', handleSync)
    window.addEventListener('printflow_table_synced:mounted_rolls', handleSync)
    window.addEventListener('printflow_table_synced:stock_ledger', handleSync)
    window.addEventListener('printflow_table_synced:materials', handleSync)
    window.addEventListener('printflow_table_synced:physical_rolls', handleSync)
    window.addEventListener('printflow_data_sync', handleSync)

    return () => {
      window.removeEventListener('printflow_table_synced:floor_consumption', handleSync)
      window.removeEventListener('printflow_table_synced:mounted_rolls', handleSync)
      window.removeEventListener('printflow_table_synced:stock_ledger', handleSync)
      window.removeEventListener('printflow_table_synced:materials', handleSync)
      window.removeEventListener('printflow_table_synced:physical_rolls', handleSync)
      window.removeEventListener('printflow_data_sync', handleSync)
    }
  }, [hydrateFromLocalStore, loadFloorData])

  if (!mounted) return null

 return (
    <PanelAccessGuard
 module="production"action="view"panelTitle="Materials & Consumption"panelTitleBn="কাঁচামাল ও খরচ">
      <PageContainer className="space-y-6">
      {/* Page Header */}
      <PageHeader
 titleEn="Materials & Consumption"titleBn="কাঁচামাল ও ফ্লোর খরচ"descriptionEn="Real-time press floor material usage, physical roll off-cut tracking, job-linked substrate consumption & live scrap telemetry"descriptionBn="প্রিন্ট ফ্লোর রিয়েল-টাইম মেটেরিয়াল ব্যবহার, রোল কাটিং ট্র্যাকিং, জব ভিত্তিক মেটেরিয়াল কনজাম্পশন ও স্ক্র্যাপ অডিট"icon={Flame}
 iconColor="text-warning"actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
 variant="outline"size="sm"onClick={() => loadFloorData()}
 disabled={loading}
 className="h-9 w-9 p-0 flex items-center justify-center shrink-0 border-input hover:bg-muted text-foreground shadow-xs cursor-pointer transition-colors"title={isBn ? 'রিফ্রেশ' : 'Refresh'}
 aria-label={isBn ? 'রিফ্রেশ' : 'Refresh'}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
 variant="outline"size="sm"onClick={() => setIsMaterialRequestOpen(true)}
 className="gap-2 border-border text-foreground hover:bg-muted font-semibold shadow-xs cursor-pointer transition-colors">
              <Plus className="h-4 w-4 text-warning shrink-0"/>
              <span>{isBn ? 'স্টোর থেকে রিকুইজিশন পাঠান' : 'Request Material'}</span>
            </Button>

            <Button
 size="sm"onClick={() => setIsIssueMasterRollOpen(true)}
 className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer transition-colors">
              <Disc className="h-4 w-4 text-primary-foreground shrink-0"/>
              <span>{isBn ? 'সরাসরি রোল ইস্যু করুন' : 'Direct Issue to Floor'}</span>
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <Card className="border-danger-border/30 bg-danger-surface text-destructive">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0"/>
              <p className="text-sm">{error}</p>
            </div>
            <Button
 variant="ghost"size="sm"onClick={() => loadFloorData()}
 className="text-destructive hover:bg-destructive/40">
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
    </PageContainer>
    </PanelAccessGuard>
  )
}

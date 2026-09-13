'use client'

import React from 'react'
import Link from 'next/link'
import {
  Cpu,
  Clock,
  User,
  AlertTriangle,
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  Flame,
  ArrowRight,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  MachineQueueGroup,
  MachineQueueItem,
} from '@/types/production.types'

interface MachineQueueViewProps {
  queues: MachineQueueGroup[]
  tenantSlug: string
  onScheduleClick?: (machineId?: string) => void
}

export function MachineQueueView({
  queues,
  tenantSlug,
  onScheduleClick,
}: MachineQueueViewProps) {
  const { tBilingual } = useI18n()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300">Available</Badge>
      case 'in_use':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300">In Use</Badge>
      case 'maintenance':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">Maintenance</Badge>
      case 'breakdown':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300">Breakdown</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getUtilizationColor = (percent: number) => {
    if (percent > 90) return 'bg-rose-500'
    if (percent > 70) return 'bg-amber-500'
    return 'bg-blue-500'
  }

  if (queues.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Cpu className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {tBilingual('No Machines Found in Fleet', 'ফ্লিটে কোনো মেশিন পাওয়া যায়নি')}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {tBilingual(
            'Zero machines registered. All production operates in Manual/Hand mode.',
            'কোনো মেশিন নিবন্ধিত নেই। সকল প্রোডাকশন ম্যানুয়াল পদ্ধতিতে পরিচালিত হচ্ছে।'
          )}
        </p>
        <div className="mt-4">
          <Link href={`/${tenantSlug}/production/machineries`}>
            <Button size="sm" variant="outline" className="text-xs">
              {tBilingual('Manage Machineries Fleet', 'মেশিনারি বহর পরিচালনা')}
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {queues.map((group) => {
        const isBlocked = group.operating_status === 'breakdown' || group.operating_status === 'maintenance'

        return (
          <Card
            key={group.machine_id}
            className={`border transition-shadow hover:shadow-md ${
              isBlocked ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10' : ''
            }`}
          >
            <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {group.machine_name}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {group.machine_code}
                  </Badge>
                  {getStatusBadge(group.operating_status)}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="capitalize">{group.machine_type.replace('_', ' ')}</span>
                  <span>•</span>
                  <span className="capitalize">{group.department}</span>
                </div>
              </div>

              {/* Utilization Indicator */}
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 justify-end">
                  <span>{(group.total_scheduled_minutes_today / 60).toFixed(1)} hrs booked</span>
                  <span className="text-[11px] text-slate-400">({group.daily_utilization_percent}%)</span>
                </div>
                <div className="w-28 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getUtilizationColor(group.daily_utilization_percent)}`}
                    style={{ width: `${Math.min(100, group.daily_utilization_percent)}%` }}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* NOW SLOT */}
              <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <Flame className="h-3 w-3 text-blue-600 animate-pulse" />
                    NOW (চলমান কাজ)
                  </span>
                  {group.now && (
                    <Badge variant="outline" className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                      Job #{group.now.job_number}
                    </Badge>
                  )}
                </div>

                {group.now ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {group.now.task_name}
                    </p>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {group.now.operator_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {group.now.estimated_duration_minutes} min est.
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No job currently running on machine.</p>
                )}
              </div>

              {/* NEXT SLOT */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    NEXT (পরবর্তী কাজ)
                  </span>
                  {group.next && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Job #{group.next.job_number}
                    </Badge>
                  )}
                </div>

                {group.next ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {group.next.task_name}
                    </p>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {group.next.operator_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {new Date(group.next.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({group.next.estimated_duration_minutes}m)
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Queue is clear after current job.</p>
                )}
              </div>

              {/* LATER QUEUE */}
              {group.later.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    LATER IN QUEUE ({group.later.length} Jobs)
                  </span>
                  <div className="mt-1.5 space-y-1 max-h-24 overflow-y-auto pr-1">
                    {group.later.map((later) => (
                      <div
                        key={later.task_id}
                        className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <span className="font-medium truncate max-w-[160px]">
                          #{later.job_number}: {later.task_name}
                        </span>
                        <span className="text-slate-500 shrink-0">
                          {new Date(later.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

'use client'

import React from 'react'
import {
  Calendar,
  Clock,
  Cpu,
  User,
  AlertTriangle,
  Play,
  Pause,
  CheckCircle2,
  RotateCcw,
  AlertOctagon,
  Lock,
  MoreVertical,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ProductionTaskRecord,
  HOLD_REASON_LABELS,
} from '@/types/production.types'

interface ProductionBoardCardProps {
  task: ProductionTaskRecord
  onSchedule?: (task: ProductionTaskRecord) => void
  onStart?: (task: ProductionTaskRecord) => void
  onPause?: (task: ProductionTaskRecord) => void
  onComplete?: (task: ProductionTaskRecord) => void
  onHold?: (task: ProductionTaskRecord) => void
  onResume?: (task: ProductionTaskRecord) => void
  onRework?: (task: ProductionTaskRecord) => void
}

export function ProductionBoardCard({
  task,
  onSchedule,
  onStart,
  onPause,
  onComplete,
  onHold,
  onResume,
  onRework,
}: ProductionBoardCardProps) {
  const { tBilingual } = useI18n()

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'very_urgent':
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 text-[10px] font-bold">
            URGENT
          </Badge>
        )
      case 'low':
        return (
          <Badge variant="outline" className="text-slate-500 text-[10px]">
            Low
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-200 text-[10px]">
            Normal
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-blue-600 text-white text-[10px] animate-pulse">Running</Badge>
      case 'ready':
        return <Badge className="bg-emerald-600 text-white text-[10px]">Ready</Badge>
      case 'scheduled':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-300 text-[10px]">Scheduled</Badge>
      case 'on_hold':
        return <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-[10px]">On Hold</Badge>
      case 'rework':
        return <Badge className="bg-rose-600 text-white text-[10px]">Rework</Badge>
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Completed</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>
    }
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-shadow">
      <CardContent className="p-3.5 space-y-2.5">
        {/* Top Header: Priority & Job ID */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {getPriorityBadge(task.priority)}
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Job #{task.job_number || 'N/A'}
            </span>
          </div>
          {getStatusBadge(task.status)}
        </div>

        {/* Task Title & Product */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {task.task_name}
          </h4>
          <p className="text-[11px] text-slate-500 truncate">
            {task.customer_name} • {task.product_name || 'Standard Print'}
          </p>
        </div>

        {/* Blocking Warning Banners */}
        {task.is_blocked_by_commercial_gate && task.status !== 'completed' && (
          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded text-[11px] text-rose-900 dark:text-rose-200 flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">COMMERCIAL HOLD:</span>{' '}
              {task.commercial_gate_reason || 'Invoice required before production can start.'}
            </div>
          </div>
        )}

        {task.is_blocked_by_design_gate && !task.is_blocked_by_commercial_gate && task.status !== 'completed' && (
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">DESIGN HOLD:</span>{' '}
              {task.design_gate_reason || 'Customer design approval required.'}
            </div>
          </div>
        )}

        {task.is_blocked_by_dependency && task.status !== 'completed' && (
          <div className="p-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="truncate">
              Waiting for <strong className="font-semibold">{task.blocking_dependency_task_name}</strong> to complete.
            </span>
          </div>
        )}

        {task.status === 'on_hold' && task.hold_reason && (
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ON HOLD:</span>{' '}
              {HOLD_REASON_LABELS[task.hold_reason]?.labelEn || task.hold_reason}
              {task.hold_notes && <p className="text-[10px] opacity-90 mt-0.5">{task.hold_notes}</p>}
            </div>
          </div>
        )}

        {/* Machine & Operator Details */}
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1 truncate max-w-[130px]">
            <Cpu className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate font-medium">
              {task.assigned_machine_name || 'Manual (No Machine)'}
            </span>
          </div>

          <div className="flex items-center gap-1 truncate max-w-[110px]">
            <User className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate">
              {task.assigned_operator_name || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Schedule & Quantity Footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{task.estimated_duration_minutes || 30}m</span>
            {task.scheduled_start && (
              <span>• {new Date(task.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {task.quantity} {task.unit}
          </span>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
          {task.status === 'on_hold' && onResume && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResume(task)}
              className="h-7 text-[11px] px-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:border-amber-700"
            >
              Resume Task
            </Button>
          )}

          {task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'on_hold' && onHold && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onHold(task)}
              className="h-7 text-[11px] px-2 text-slate-500 hover:text-amber-600"
            >
              Hold
            </Button>
          )}

          {task.status === 'queued' && onSchedule && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSchedule(task)}
              className="h-7 text-[11px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Schedule
            </Button>
          )}

          {(task.status === 'scheduled' || task.status === 'ready' || task.status === 'queued') && onStart && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onStart(task)}
              disabled={task.is_blocked_by_dependency || task.is_blocked_by_commercial_gate || task.is_blocked_by_design_gate}
              className="h-7 text-[11px] px-2 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-3 w-3 fill-current" />
              Start
            </Button>
          )}

          {task.status === 'in_progress' && (
            <>
              {onPause && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPause(task)}
                  className="h-7 text-[11px] px-2 text-amber-700 border-amber-200"
                >
                  <Pause className="h-3 w-3" />
                  Pause
                </Button>
              )}
              {onComplete && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onComplete(task)}
                  className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-semibold"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </Button>
              )}
            </>
          )}

          {task.status === 'completed' && onRework && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRework(task)}
              className="h-7 text-[11px] px-2 text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Rework
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

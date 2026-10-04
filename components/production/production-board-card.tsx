'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
 ExternalLink,
 FileCheck2,
 MessageSquare,
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
 onPrintTicket?: (task: ProductionTaskRecord) => void
 onSendWhatsApp?: (task: ProductionTaskRecord) => void
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
 onPrintTicket,
 onSendWhatsApp,
}: ProductionBoardCardProps) {
 const pathname = usePathname() || ''
 const { company } = useTenant()
 const tenantSlug = company?.slug || 'my-company'
 const { tBilingual } = useI18n()

 const jobTargetId = task.job_order_id || task.production_job_id || task.job_number || task.id
 const jobHref = getTenantNavHref(`/production/${jobTargetId}`, pathname, tenantSlug)

 const getPriorityBadge = (priority: string) => {
 switch (priority) {
 case 'urgent':
 case 'very_urgent':
 return (
          <Badge className="bg-danger-surface text-destructive bg-danger-surface/60 text-destructive border-danger-border text-xs font-bold">
 URGENT
          </Badge>
        )
 case 'low':
 return (
          <Badge variant="outline"className="text-muted-foreground text-xs">
 Low
          </Badge>
        )
 default:
 return (
          <Badge variant="outline"className="text-primary border-primary/20 text-xs">
 Normal
          </Badge>
        )
    }
  }

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'in_progress':
 return <Badge className="bg-primary text-white text-xs animate-pulse">Running</Badge>
 case 'ready':
 return <Badge className="bg-success text-white text-xs">Ready</Badge>
 case 'scheduled':
 return <Badge className="bg-primary/10 text-primary bg-primary/10 text-primary border-primary/20 text-xs">Scheduled</Badge>
 case 'on_hold':
 return <Badge className="bg-warning-surface text-warning bg-warning-surface/60 text-warning border-warning-border text-xs">On Hold</Badge>
 case 'rework':
 return <Badge className="bg-destructive text-white text-xs">Rework</Badge>
 case 'completed':
 return <Badge className="bg-success-surface text-success border-success-border text-xs">Completed</Badge>
 default:
 return <Badge variant="outline"className="text-xs capitalize">{status}</Badge>
    }
  }

 return (
    <Card className="border border-border bg-card shadow-xs hover:shadow-xs transition-shadow">
      <CardContent className="p-3.5 space-y-2.5">
        {/* Top Header: Priority & Job ID */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {getPriorityBadge(task.priority)}
            <Link
 href={jobHref}
 className="text-xs font-bold text-foreground hover:text-primary dark:hover:text-primary hover:underline inline-flex items-center gap-0.5">
              <span>Job #{task.job_number || 'N/A'}</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-60"/>
            </Link>
          </div>
          {getStatusBadge(task.status)}
        </div>

        {/* Task Title & Product */}
        <div>
          <h4 className="text-xs font-bold text-foreground leading-snug">
            <Link href={jobHref} className="hover:text-primary dark:hover:text-primary transition-colors">
              {task.task_name}
            </Link>
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {task.customer_name} • {task.product_name || 'Standard Print'}
          </p>
        </div>

        {/* Blocking Warning Banners */}
        {task.is_blocked_by_commercial_gate && task.status !== 'completed' && (
          <div className="p-2 bg-danger-surface bg-danger-surface border border-danger-border border-danger-border rounded text-xs text-destructive text-destructive flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5"/>
            <div>
              <span className="font-bold">COMMERCIAL HOLD:</span>{' '}
              {task.commercial_gate_reason || 'Invoice required before production can start.'}
            </div>
          </div>
        )}

        {task.is_blocked_by_design_gate && !task.is_blocked_by_commercial_gate && task.status !== 'completed' && (
          <div className="p-2 bg-warning-surface bg-warning-surface border border-warning-border border-warning-border rounded text-xs text-warning text-warning flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5"/>
            <div>
              <span className="font-bold">DESIGN HOLD:</span>{' '}
              {task.design_gate_reason || 'Customer design approval required.'}
            </div>
          </div>
        )}

        {task.is_blocked_by_dependency && task.status !== 'completed' && (
          <div className="p-2 bg-muted border border-input rounded text-xs text-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
            <span className="truncate">
 Waiting for <strong className="font-semibold">{task.blocking_dependency_task_name}</strong> to complete.
            </span>
          </div>
        )}

        {task.status === 'on_hold' && task.hold_reason && (
          <div className="p-2 bg-warning-surface bg-warning-surface border border-warning-border border-warning-border rounded text-xs text-warning text-warning flex items-start gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5"/>
            <div>
              <span className="font-bold">ON HOLD:</span>{' '}
              {HOLD_REASON_LABELS[task.hold_reason]?.labelEn || task.hold_reason}
              {task.hold_notes && <p className="text-xs opacity-90 mt-0.5">{task.hold_notes}</p>}
            </div>
          </div>
        )}

        {/* Machine & Operator Details */}
        <div className="pt-1.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1 truncate max-w-[130px]">
            <Cpu className="h-3 w-3 text-muted-foreground shrink-0"/>
            <span className="truncate font-medium">
              {task.assigned_machine_name || 'Manual (No Machine)'}
            </span>
          </div>

          <div className="flex items-center gap-1 truncate max-w-[110px]">
            <User className="h-3 w-3 text-muted-foreground shrink-0"/>
            <span className="truncate">
              {task.assigned_operator_name || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Schedule & Quantity Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground"/>
            <span>{task.estimated_duration_minutes || 30}m</span>
            {task.scheduled_start && (
              <span>• {new Date(task.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          <span className="font-semibold text-foreground">
            {task.quantity} {task.unit}
          </span>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            {onPrintTicket && (
              <Button
 size="sm"variant="ghost"onClick={() => onPrintTicket(task)}
 title="Print Job Ticket"className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0">
                <FileCheck2 className="h-3.5 w-3.5"/>
              </Button>
            )}
            {onSendWhatsApp && (
              <Button
 size="sm"variant="ghost"onClick={() => onSendWhatsApp(task)}
 title="Send WhatsApp Update"className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success-surface shrink-0">
                <MessageSquare className="h-3.5 w-3.5"/>
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 ml-auto">
          {task.status === 'on_hold' && onResume && (
            <Button
 size="sm"variant="outline"onClick={() => onResume(task)}
 className="h-7 text-xs px-2 text-warning border-warning-border hover:bg-warning-surface border-warning-border rounded-lg shrink-0">
 Resume
            </Button>
          )}

          {task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'on_hold' && onHold && (
            <Button
 size="sm"variant="ghost"onClick={() => onHold(task)}
 className="h-7 text-xs px-1.5 text-muted-foreground hover:text-warning rounded-lg shrink-0">
 Hold
            </Button>
          )}

          {task.status === 'queued' && onSchedule && (
            <Button
 size="sm"variant="outline"onClick={() => onSchedule(task)}
 className="h-7 text-xs px-2 text-primary border-primary/20 hover:bg-primary/10 rounded-lg shrink-0">
 Schedule
            </Button>
          )}

          {(task.status === 'scheduled' || task.status === 'ready' || task.status === 'queued') && onStart && (
            <Button
 size="sm"variant="default"onClick={() => onStart(task)}
 disabled={task.is_blocked_by_dependency || task.is_blocked_by_commercial_gate || task.is_blocked_by_design_gate}
 className="h-7 text-xs px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1 font-semibold rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
              <Play className="h-3 w-3 fill-current"/>
              <span>Start</span>
            </Button>
          )}

          {task.status === 'in_progress' && (
            <>
              {onPause && (
                <Button
 size="sm"variant="outline"onClick={() => onPause(task)}
 className="h-7 text-xs px-2 text-warning border-warning-border">
                  <Pause className="h-3 w-3"/>
 Pause
                </Button>
              )}
              {onComplete && (
                <Button
 size="sm"variant="default"onClick={() => onComplete(task)}
 className="h-7 text-xs px-2 bg-success hover:bg-success text-white flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3"/>
 Complete
                </Button>
              )}
            </>
          )}

          {task.status === 'completed' && onRework && (
            <Button
 size="sm"variant="outline"onClick={() => onRework(task)}
 className="h-7 text-xs px-2 text-destructive border-danger-border hover:bg-danger-surface flex items-center gap-1">
              <RotateCcw className="h-3 w-3"/>
 Rework
            </Button>
          )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

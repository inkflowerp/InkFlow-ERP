'use client'

import React from 'react'
import Link from 'next/link'
import {
 CheckCircle2,
 Clock,
 AlertTriangle,
 ArrowRight,
 ExternalLink,
 ShieldAlert,
 Sparkles,
 PackageCheck,
 Truck,
 Palette,
 FileCheck,
 Scissors,
 Check,
 Lock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import type {
 OrderWorkflowResolution,
 WorkflowStageItem,
 CanonicalWorkflowStageId,
} from '@/lib/workflow/workflow-engine'

interface JobFlowStepperProps {
 workflow: OrderWorkflowResolution
 tenantSlug: string
 className?: string
}

export function JobFlowStepper({ workflow, tenantSlug, className = '' }: JobFlowStepperProps) {
 const { locale, tBilingual } = useI18n()

 const getStepIcon = (stage: WorkflowStageItem, index: number) => {
 if (stage.status === 'completed') {
 return <Check className="h-3.5 w-3.5 stroke-[3]"/>
    }
 if (stage.status === 'blocked') {
 return <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]"/>
    }
 if (stage.status === 'in_progress') {
 return <span className="text-xs font-black">{index + 1}</span>
    }
 if (stage.status === 'skipped') {
 return <span className="text-xs opacity-60">—</span>
    }
 return <span className="text-xs font-semibold">{index + 1}</span>
  }

 return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Master Stepper Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {tBilingual('Order-to-Delivery Journey', 'কাজের সামগ্রিক অগ্রগতি')}
              </span>
              <Badge
 variant="outline"className={`text-xs font-bold ${
 workflow.isBlocked
                    ? 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive'
                    : workflow.overallStage === 'completed'
                    ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                    : 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                }`}
              >
                {tBilingual(workflow.overallStageLabelEn, workflow.overallStageLabelBn)}
              </Badge>
              {workflow.isPartiallyDelivered && (
                <Badge className="bg-warning text-white text-xs font-bold">
                  {tBilingual('Partial Dispatch', 'আংশিক ডেলিভারি')}
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-bold text-foreground mt-1">
              {tBilingual('Active Phase:', 'বর্তমান ধাপ:')}{' '}
              <span className="text-primary text-primary">
                {tBilingual(workflow.overallStageLabelEn, workflow.overallStageLabelBn)}
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-muted-foreground block">
                {tBilingual('Stage Completion', 'সম্পন্নতার হার')}
              </span>
              <span className="text-sm font-black text-foreground tabular-nums">
                {workflow.progressPercentage}%
              </span>
            </div>
            {/* Circular or mini progress bar */}
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
 className={`h-full transition-all duration-500 ${
 workflow.isBlocked
                    ? 'bg-destructive'
                    : workflow.progressPercentage === 100
                    ? 'bg-success'
                    : 'bg-primary'
                }`}
 style={{ width: `${workflow.progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stepper Horizontal Scroll Container */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center min-w-[760px] justify-between relative px-2">
            {/* Connecting Track Line */}
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-muted -z-0"/>

            {workflow.stepperStages.map((stage, idx) => {
 const isCompleted = stage.status === 'completed'
 const isInProgress = stage.status === 'in_progress'
 const isBlocked = stage.status === 'blocked'
 const isSkipped = stage.status === 'skipped'

 return (
                <div key={stage.id} className="flex flex-col items-center z-10 text-center px-1 flex-1">
                  <div
 className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
 isBlocked
                        ? 'bg-destructive text-white ring-4 focus:ring-ring dark:focus:ring-ring animate-pulse'
                        : isCompleted
                        ? 'bg-success text-white shadow-xs'
                        : isInProgress
                        ? 'bg-primary text-white ring-4 focus:ring-ring dark:focus:ring-ring shadow-xs'
                        : isSkipped
                        ? 'bg-muted text-muted-foreground border border-dashed border-input '
                        : 'bg-muted text-muted-foreground border border-border '
                    }`}
                  >
                    {getStepIcon(stage, idx)}
                  </div>
                  <span
 className={`text-xs mt-2 font-semibold whitespace-nowrap block ${
 isBlocked
                        ? 'text-destructive text-destructive font-bold'
                        : isInProgress
                        ? 'text-primary text-primary font-bold'
                        : isCompleted
                        ? 'text-foreground '
                        : isSkipped
                        ? 'text-muted-foreground line-through'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {tBilingual(stage.labelEn, stage.labelBn)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 2. Explicit Blocker Alert Banner */}
      {workflow.isBlocked && (
        <div className="p-4 rounded-xl border border-danger-border border-danger-border bg-danger-surface/80 bg-danger-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in-0 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-danger-surface bg-destructive/60 text-destructive text-destructive rounded-lg shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-destructive text-destructive">
                  {tBilingual('Workflow Gate Blocked', 'কাজের প্রবাহ সাময়িক স্থগিত')}
                </h4>
                <Badge variant="outline"className="text-xs bg-danger-surface text-destructive border-danger-border font-black">
 ACTION REQUIRED
                </Badge>
              </div>
              <p className="text-xs text-destructive text-destructive mt-0.5">
                {tBilingual(workflow.blockedReasonEn || '', workflow.blockedReasonBn || '')}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link href={workflow.nextActionHref}>
              <Button
 size="sm"className="bg-destructive hover:bg-destructive text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <span>{tBilingual(workflow.nextActionEn, workflow.nextActionBn)}</span>
                <ArrowRight className="h-3.5 w-3.5"/>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Recommended Next Step Banner (When not blocked and not completed) */}
      {!workflow.isBlocked && workflow.overallStage !== 'completed' && (
        <div className="p-3.5 rounded-xl border border-primary/20 border-border/80 bg-primary/10/60 bg-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 bg-primary/60 text-primary text-primary rounded-lg shrink-0">
              <Sparkles className="h-4 w-4"/>
            </div>
            <div>
              <span className="text-xs font-bold text-primary text-primary uppercase tracking-wide block">
                {tBilingual('Next Operational Step', 'পরবর্তী করণীয়')}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {tBilingual(workflow.nextActionEn, workflow.nextActionBn)}
              </span>
            </div>
          </div>

          <Link href={workflow.nextActionHref}>
            <Button
 size="sm"variant="outline"className="text-xs font-bold border-border text-foreground hover:bg-muted shrink-0">
              <span>{tBilingual(workflow.nextActionEn, workflow.nextActionBn)}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1.5"/>
            </Button>
          </Link>
        </div>
      )}

      {/* 4. Settlement Notice (When completed & fully paid) */}
      {workflow.overallStage === 'completed' && workflow.isFullyPaid && (
        <div className="p-3.5 rounded-xl border border-success-border border-success-border bg-success-surface/60 bg-success-surface flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-success-surface bg-success/60 text-success text-success rounded-lg shrink-0">
              <CheckCircle2 className="h-4 w-4"/>
            </div>
            <div>
              <span className="text-xs font-bold text-success text-success block">
                {tBilingual('Order Fully Delivered & Settled', 'অর্ডার সম্পূর্ণ ডেলিভারি ও পরিশোধিত')}
              </span>
              <span className="text-xs text-success text-success">
                {tBilingual('All items dispatched and payment fully cleared.', 'সকল পণ্য সরবরাহ সম্পন্ন ও বিল পরিশোধিত।')}
              </span>
            </div>
          </div>
          <Link href={`/${tenantSlug}/billing`}>
            <Button size="sm"variant="outline"className="text-xs font-bold border-border text-foreground hover:bg-muted">
              {tBilingual('View Bill & Payments', 'লেজার দেখুন')}
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

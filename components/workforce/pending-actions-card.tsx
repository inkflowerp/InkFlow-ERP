'use client'

import React from 'react'
import Link from 'next/link'
import {
  Clock,
  Clock4,
  Coins,
  Wallet,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export interface PendingActionItem {
  id: string
  type: 'overtime' | 'correction' | 'advance' | 'salary_due'
  title: string
  titleBn: string
  subtitle: string
  actionLabel: string
  actionLabelBn: string
  actionHref: string
  dateOrTime?: string
}

export interface PendingActionsCardProps {
  items: PendingActionItem[]
  isLoading?: boolean
  tenantSlug: string
}

export function PendingActionsCard({
  items,
  isLoading = false,
  tenantSlug,
}: PendingActionsCardProps) {
  if (isLoading) {
    return (
      <Card className="p-5 bg-white border-slate-200 shadow-none">
        <Skeleton className="h-6 w-52 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    )
  }

  const getActionVisual = (type: PendingActionItem['type']) => {
    switch (type) {
      case 'overtime':
        return {
          icon: Clock4,
          iconColor: 'text-indigo-600',
          bgColor: 'bg-indigo-50 border-indigo-100',
          badgeText: 'Overtime',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        }
      case 'correction':
        return {
          icon: Clock,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50 border-amber-100',
          badgeText: 'Correction',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        }
      case 'advance':
        return {
          icon: Coins,
          iconColor: 'text-emerald-600',
          bgColor: 'bg-emerald-50 border-emerald-100',
          badgeText: 'Advance',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        }
      case 'salary_due':
        return {
          icon: Wallet,
          iconColor: 'text-rose-600',
          bgColor: 'bg-rose-50 border-rose-100',
          badgeText: 'Payroll',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        }
    }
  }

  return (
    <Card className="bg-white border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl">
      <CardHeader className="pb-3 border-b border-slate-100 px-5 pt-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>Pending Approvals & Actions</span>
            <span className="text-xs font-normal text-slate-500">অপেক্ষমান কার্যক্রম</span>
            {items.length > 0 && (
              <Badge variant="outline" className="ml-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
                {items.length} pending
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational approvals requiring immediate manager or accounts decision
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <div className="p-2.5 rounded-full bg-emerald-50 border border-emerald-200 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">All caught up!</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              No pending overtime, attendance corrections, or advances awaiting review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {items.map((action) => {
              const visual = getActionVisual(action.type)
              const Icon = visual.icon
              const targetHref = action.actionHref.startsWith('http') || action.actionHref.startsWith(`/${tenantSlug}`)
                ? action.actionHref
                : `/${tenantSlug}${action.actionHref}`

              return (
                <div
                  key={action.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${visual.bgColor}`}>
                        <Icon className={`w-4 h-4 ${visual.iconColor}`} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{action.title}</div>
                        <div className="text-[11px] text-slate-400">{action.titleBn}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold px-1.5 py-0 ${visual.badgeClass}`}>
                      {visual.badgeText}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 font-medium my-1.5 line-clamp-1">
                    {action.subtitle}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <span className="text-[11px] text-slate-400">
                      {action.dateOrTime || 'Immediate'}
                    </span>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs font-medium text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 min-h-[32px] touch-manipulation"
                    >
                      <Link href={targetHref}>
                        <span>{action.actionLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

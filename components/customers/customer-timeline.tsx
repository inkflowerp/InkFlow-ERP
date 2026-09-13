'use client'

import React from 'react'
import {
  UserPlus,
  UserCheck,
  FileText,
  CreditCard,
  PhoneCall,
  ShoppingBag,
  Sparkles,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react'
import { CustomerTimelineEvent } from '@/types/crm.types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CustomerTimelineProps {
  events: CustomerTimelineEvent[]
  isLoading?: boolean
}

export function CustomerTimeline({ events, isLoading = false }: CustomerTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-950">
        <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No Activity Logged Yet
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Invoices, payments, quotations, and communications will appear chronologically here.
        </p>
      </Card>
    )
  }

  const getEventIcon = (type: CustomerTimelineEvent['type']) => {
    switch (type) {
      case 'customer_created':
        return <UserPlus className="h-3.5 w-3.5 text-blue-600" />
      case 'customer_updated':
        return <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
      case 'rate_updated':
        return <Tag className="h-3.5 w-3.5 text-purple-600" />
      case 'quotation_created':
      case 'quotation_sent':
        return <Send className="h-3.5 w-3.5 text-amber-600" />
      case 'invoice_created':
        return <FileText className="h-3.5 w-3.5 text-blue-600" />
      case 'payment_received':
        return <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
      case 'order_created':
      case 'job_started':
        return <ShoppingBag className="h-3.5 w-3.5 text-cyan-600" />
      case 'delivery_completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      case 'communication_logged':
        return <PhoneCall className="h-3.5 w-3.5 text-sky-600" />
      default:
        return <Clock className="h-3.5 w-3.5 text-slate-500" />
    }
  }

  const getEventBadge = (type: CustomerTimelineEvent['type'], status?: string | null) => {
    switch (type) {
      case 'invoice_created':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 text-[10px]">
            Invoice
          </Badge>
        )
      case 'payment_received':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]">
            Payment
          </Badge>
        )
      case 'quotation_created':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 text-[10px]">
            Quotation
          </Badge>
        )
      case 'communication_logged':
        return (
          <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 text-[10px]">
            Comm
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {events.map((evt) => (
        <div key={evt.id} className="relative group">
          {/* Node Icon */}
          <div className="absolute -left-6 top-1 h-5 w-5 rounded-full border-2 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
            {getEventIcon(evt.type)}
          </div>

          {/* Event Content Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <CardContent className="p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {evt.title}
                  </span>
                  {getEventBadge(evt.type, evt.status)}
                </div>

                <div className="text-[11px] text-slate-400 font-medium shrink-0">
                  {new Date(evt.timestamp).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {evt.description && (
                <div className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  {evt.description}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                {evt.actorName && (
                  <span>By: <strong className="text-slate-600 dark:text-slate-300 font-medium">{evt.actorName}</strong></span>
                )}
                {evt.amount !== undefined && evt.amount !== null && (
                  <span className="font-bold text-slate-700 dark:text-slate-300 ml-auto">
                    Amount: ৳{evt.amount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}

'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  PlayCircle,
  Clock,
  Wrench,
  AlertTriangle,
  PowerOff,
  Archive,
} from 'lucide-react'
import { MachineryStatus } from '@/types/machinery.types'

interface MachineryStatusBadgeProps {
  status: MachineryStatus | string
  className?: string
  showIcon?: boolean
}

export function MachineryStatusBadge({
  status,
  className = '',
  showIcon = true,
}: MachineryStatusBadgeProps) {
  switch (status) {
    case 'available':
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-semibold inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <CheckCircle2 className="h-3 w-3" />}
          <span>Available</span>
        </Badge>
      )
    case 'in_use':
      return (
        <Badge
          variant="outline"
          className={`bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 font-semibold inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <PlayCircle className="h-3 w-3" />}
          <span>In Use</span>
        </Badge>
      )
    case 'scheduled':
      return (
        <Badge
          variant="outline"
          className={`bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800 font-semibold inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <Clock className="h-3 w-3" />}
          <span>Scheduled</span>
        </Badge>
      )
    case 'maintenance':
      return (
        <Badge
          variant="outline"
          className={`bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-semibold inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <Wrench className="h-3 w-3" />}
          <span>Maintenance</span>
        </Badge>
      )
    case 'breakdown':
      return (
        <Badge
          variant="outline"
          className={`bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 font-bold inline-flex items-center gap-1 animate-pulse ${className}`}
        >
          {showIcon && <AlertTriangle className="h-3 w-3" />}
          <span>Breakdown</span>
        </Badge>
      )
    case 'offline':
      return (
        <Badge
          variant="outline"
          className={`bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <PowerOff className="h-3 w-3" />}
          <span>Offline</span>
        </Badge>
      )
    case 'retired':
      return (
        <Badge
          variant="outline"
          className={`bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800 font-medium inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <Archive className="h-3 w-3" />}
          <span>Retired</span>
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className={`font-medium ${className}`}>
          {status}
        </Badge>
      )
  }
}

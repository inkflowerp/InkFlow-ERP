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
 variant="outline"className={`bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border font-semibold inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <CheckCircle2 className="h-3 w-3"/>}
          <span>Available</span>
        </Badge>
      )
 case 'in_use':
 return (
        <Badge
 variant="outline"className={`bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border font-semibold inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <PlayCircle className="h-3 w-3"/>}
          <span>In Use</span>
        </Badge>
      )
 case 'scheduled':
 return (
        <Badge
 variant="outline"className={`bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border font-semibold inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <Clock className="h-3 w-3"/>}
          <span>Scheduled</span>
        </Badge>
      )
 case 'maintenance':
 return (
        <Badge
 variant="outline"className={`bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning border-warning-border font-semibold inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <Wrench className="h-3 w-3"/>}
          <span>Maintenance</span>
        </Badge>
      )
 case 'breakdown':
 return (
        <Badge
 variant="outline"className={`bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive border-danger-border font-bold inline-flex items-center gap-1 animate-pulse ${className}`}
        >
          {showIcon && <AlertTriangle className="h-3 w-3"/>}
          <span>Breakdown</span>
        </Badge>
      )
 case 'offline':
 return (
        <Badge
 variant="outline"className={`bg-muted text-foreground border-input font-medium inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <PowerOff className="h-3 w-3"/>}
          <span>Offline</span>
        </Badge>
      )
 case 'retired':
 return (
        <Badge
 variant="outline"className={`bg-muted text-muted-foreground border-input font-medium inline-flex items-center gap-1 ${className}`}
        >
          {showIcon && <Archive className="h-3 w-3"/>}
          <span>Retired</span>
        </Badge>
      )
 default:
 return (
        <Badge variant="outline"className={`font-medium ${className}`}>
          {status}
        </Badge>
      )
  }
}

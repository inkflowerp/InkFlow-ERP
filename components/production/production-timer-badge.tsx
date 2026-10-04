'use client'

import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function formatElapsedSeconds(totalSec: number): string {
 const m = Math.floor(totalSec / 60)
 const s = totalSec % 60
 if (m >= 60) {
 const h = Math.floor(m / 60)
 const remM = m % 60
 return `${h}h ${remM.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
  }
 return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatDurationSummary(totalSec: number): string {
 if (totalSec < 60) return `${totalSec}s`
 const m = Math.floor(totalSec / 60)
 const s = totalSec % 60
 if (m >= 60) {
 const h = Math.floor(m / 60)
 const remM = m % 60
 return `${h}h ${remM}m`
  }
 return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function ProductionTimerBadge({
 startedAt,
 completedAt,
 durationSeconds,
 isRunning,
 className,
}: {
 startedAt?: string | null
 completedAt?: string | null
 durationSeconds?: number | null
 isRunning: boolean
 className?: string
}) {
 const [elapsed, setElapsed] = useState<number>(() => {
 if (!startedAt) return durationSeconds || 0
 if (!isRunning && completedAt) {
 return Math.max(1, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000))
    }
 if (durationSeconds) return durationSeconds
 return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  })

 useEffect(() => {
 if (!isRunning || !startedAt) return

 const calculate = () => {
 const startTime = new Date(startedAt).getTime()
 if (isNaN(startTime)) return
 setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)))
    }

 calculate()
 const timer = setInterval(calculate, 1000)
 return () => clearInterval(timer)
  }, [isRunning, startedAt])

 if (isRunning) {
 return (
      <div
 className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs tabular-nums font-bold bg-warning/10 text-warning text-warning border border-warning-border/25 animate-pulse shadow-2xs',
 className
        )}
 title="Print timer is actively running">
        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-ping shrink-0"/>
        <Clock className="w-3 h-3 text-warning shrink-0"/>
        <span>{formatElapsedSeconds(elapsed)}</span>
      </div>
    )
  }

 if (durationSeconds || (startedAt && completedAt)) {
 const sec = durationSeconds || Math.max(1, Math.round((new Date(completedAt!).getTime() - new Date(startedAt!).getTime()) / 1000))
 return (
      <div
 className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs tabular-nums font-medium bg-success/10 text-success text-success border border-success-border/20 shadow-2xs',
 className
        )}
 title={`Printing completed in ${formatDurationSummary(sec)}`}
      >
        <Clock className="w-3 h-3 text-success shrink-0"/>
        <span>{formatDurationSummary(sec)}</span>
      </div>
    )
  }

 return null
}

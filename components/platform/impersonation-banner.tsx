'use client'

import React from 'react'
import { AlertTriangle, LogOut, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

export interface ImpersonationBannerProps {
  tenantName: string
  tenantId?: string
  adminEmail?: string
  expiresIn?: string
  onExit: () => void
  className?: string
}

export function ImpersonationBanner({
  tenantName,
  tenantId,
  adminEmail,
  expiresIn,
  onExit,
  className,
}: ImpersonationBannerProps) {
  const { tBilingual } = useI18n()

  return (
    <aside
      aria-label={tBilingual('Viewing as Client', 'ক্লায়েন্ট হিসেবে দেখা হচ্ছে')}
      className={cn(
        'sticky top-0 z-50 w-full px-4 py-2 bg-warning-surface border-b border-warning/30 text-foreground flex items-center justify-between gap-3 text-xs backdrop-blur-xs',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-6 w-6 rounded-md bg-warning/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="font-semibold text-foreground">
            {tBilingual('Viewing as Client:', 'ক্লায়েন্ট হিসেবে দেখা হচ্ছে:')}
          </span>
          <div className="flex items-center gap-1.5 font-medium truncate">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{tenantName}</span>
          </div>
          {tenantId && (
            <Badge variant="outline" className="text-xs font-mono py-0 px-1.5 h-4.5 bg-background/50">
              {tenantId}
            </Badge>
          )}
          {adminEmail && (
            <span className="text-muted-foreground hidden sm:inline">
              ({adminEmail})
            </span>
          )}
          {expiresIn && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              • {tBilingual('Ends in', 'বাকি')} {expiresIn}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={onExit}
        className="h-7 text-xs px-2.5 gap-1.5 shrink-0 shadow-xs cursor-pointer font-medium"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>{tBilingual('Exit Client', 'বের হন')}</span>
      </Button>
    </aside>
  )
}

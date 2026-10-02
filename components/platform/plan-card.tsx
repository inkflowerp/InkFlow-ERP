'use client'

import React from 'react'
import { Check, X, MoreHorizontal, Edit2, Copy, Archive, Trash2, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

export interface PlanFeature {
  text: string
  included?: boolean
}

export interface PlanLimit {
  label: string
  value: string | number
}

export interface PlanCardProps {
  id?: string
  code?: string
  name: string
  description?: string
  price: string | number
  currency?: string
  billingCycle?: string
  isPopular?: boolean
  status?: 'active' | 'draft' | 'archived' | string
  subscriberCount?: number
  features?: (string | PlanFeature)[]
  limits?: PlanLimit[]
  onEdit?: () => void
  onDuplicate?: () => void
  onArchive?: () => void
  onDelete?: () => void
  onAssign?: () => void
  actionSlot?: React.ReactNode
  className?: string
}

export function PlanCard({
  code,
  name,
  description,
  price,
  currency = '৳',
  billingCycle = '/month',
  isPopular,
  status = 'active',
  subscriberCount,
  features = [],
  limits = [],
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onAssign,
  actionSlot,
  className,
}: PlanCardProps) {
  const { tBilingual } = useI18n()
  const isStatusActive = status === 'active'

  return (
    <Card
      className={cn(
        'relative rounded-xl border border-border bg-card text-card-foreground p-5 flex flex-col justify-between shadow-xs transition-colors',
        isPopular && 'border-primary ring-1 ring-primary/30',
        className
      )}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-foreground">{name}</span>
            {code && (
              <Badge variant="outline" className="text-2xs font-mono uppercase tracking-wider py-0 px-1.5 h-4.5">
                {code}
              </Badge>
            )}
            {isPopular && (
              <Badge className="bg-primary text-primary-foreground text-2xs py-0 px-2 h-4.5 font-medium">
                {tBilingual('Popular', 'জনপ্রিয়')}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Badge
              variant={isStatusActive ? 'default' : 'secondary'}
              className={cn(
                'text-2xs py-0 px-2 h-5 font-normal capitalize',
                isStatusActive
                  ? 'bg-success-surface text-success-foreground border-border'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {status}
            </Badge>

            {(onEdit || onDuplicate || onArchive || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">{tBilingual('Actions', 'কাজ')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit} className="text-xs cursor-pointer">
                      <Edit2 className="h-3.5 w-3.5 mr-2" />
                      {tBilingual('Edit', 'এডিট')}
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={onDuplicate} className="text-xs cursor-pointer">
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      {tBilingual('Copy', 'কপি')}
                    </DropdownMenuItem>
                  )}
                  {onAssign && (
                    <DropdownMenuItem onClick={onAssign} className="text-xs cursor-pointer">
                      <Users className="h-3.5 w-3.5 mr-2" />
                      {tBilingual('Assign Clients', 'ক্লায়েন্ট যুক্ত')}
                    </DropdownMenuItem>
                  )}
                  {(onArchive || onDelete) && <DropdownMenuSeparator />}
                  {onArchive && (
                    <DropdownMenuItem onClick={onArchive} className="text-xs cursor-pointer">
                      <Archive className="h-3.5 w-3.5 mr-2" />
                      {tBilingual('Archive', 'আর্কাইভ')}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-xs text-destructive focus:text-destructive cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      {tBilingual('Delete', 'মুছে ফেলুন')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {description}
          </p>
        )}

        {/* Pricing */}
        <div className="py-3 border-y border-border mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{currency}</span>
            <span className="text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
              {price}
            </span>
            <span className="text-xs text-muted-foreground">{billingCycle}</span>
          </div>
          {subscriberCount !== undefined && (
            <div className="text-2xs text-muted-foreground mt-1 flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{subscriberCount} {tBilingual('clients', 'ক্লায়েন্ট')}</span>
            </div>
          )}
        </div>

        {/* Limits */}
        {limits.length > 0 && (
          <div className="mb-4 space-y-1.5 bg-muted/40 p-2.5 rounded-lg border border-border/50">
            <div className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tBilingual('Limits', 'সীমা')}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {limits.map((limit, idx) => (
                <div key={idx} className="text-xs">
                  <div className="text-muted-foreground text-2xs truncate">{limit.label}</div>
                  <div className="font-semibold text-foreground tabular-nums">{limit.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features list */}
        {features.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tBilingual('Features', 'ফিচার')}
            </div>
            <ul className="space-y-1.5">
              {features.map((item, idx) => {
                const text = typeof item === 'string' ? item : item.text
                const included = typeof item === 'string' ? true : item.included !== false
                return (
                  <li key={idx} className="text-xs flex items-start gap-2">
                    {included ? (
                      <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                    )}
                    <span className={cn('text-xs', included ? 'text-foreground' : 'text-muted-foreground/60 line-through')}>
                      {text}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="pt-2 mt-auto">
        {actionSlot ? (
          actionSlot
        ) : (
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="w-full text-xs h-8">
                {tBilingual('Edit', 'এডিট')}
              </Button>
            )}
            {onAssign && (
              <Button variant="default" size="sm" onClick={onAssign} className="w-full text-xs h-8">
                {tBilingual('Assign', 'যুক্ত')}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

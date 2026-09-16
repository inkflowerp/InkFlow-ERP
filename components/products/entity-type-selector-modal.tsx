'use client'

import React from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Package, Wrench, Boxes, Sparkles, PlusCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EntityTypeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'product' | 'service' | 'material' | 'finishing' | 'additional' | 'installation') => void
}

export function EntityTypeSelectorModal({ isOpen, onClose, onSelect }: EntityTypeSelectorModalProps) {
  const options = [
    {
      id: 'product' as const,
      title: 'Ready Product',
      subtitle: 'X-Stand, Roll-up Banner Stand, Display Frames, Ready Promo Items',
      description: 'Physical items sold ready-to-use by piece/pack. No roll formulas or production bleeds.',
      icon: Package,
      badge: 'Ready to Sell',
      color: 'blue',
      borderClass: 'border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/5',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'service' as const,
      title: 'Print / Production Service',
      subtitle: 'UV Vinyl Print, Eco PVC Banner, Acrylic Signage, CNC Laser Cutting',
      description: 'Custom work configured by dimensions, required materials, finishing, and allowance geometry.',
      icon: Wrench,
      badge: 'Custom Jobs',
      color: 'emerald',
      borderClass: 'border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'material' as const,
      title: 'Raw Material',
      subtitle: 'Vinyl Sticker Rolls (3/4/5ft), PVC Rolls (3.25/4.25/5.25ft), UV Ink Bottles',
      description: 'Stock materials purchased in bulk/rolls, tracked by roll length, and consumed during production.',
      icon: Boxes,
      badge: 'Inventory Stock',
      color: 'amber',
      borderClass: 'border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  ]

  const auxiliaryOptions = [
    {
      id: 'finishing' as const,
      title: 'Finishing Operation',
      description: 'Glossy/Matte Lamination, Eyelet, MS Frame',
      icon: Sparkles,
      colorClass: 'hover:border-purple-500 hover:bg-purple-500/5',
    },
    {
      id: 'additional' as const,
      title: 'Additional Work / Pasting',
      description: '3mm PVC Board Pasting, Foam Board, Framing',
      icon: PlusCircle,
      colorClass: 'hover:border-cyan-500 hover:bg-cyan-500/5',
    },
    {
      id: 'installation' as const,
      title: 'Installation / Fulfillment',
      description: 'On-Site Installation, Shop Delivery, Dispatch',
      icon: ShieldCheck,
      colorClass: 'hover:border-indigo-500 hover:bg-indigo-500/5',
    },
  ]

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="What would you like to add?"
      description="Select the appropriate entity type to open the dedicated configuration form."
      size="2xl"
      hideFooter={true}
    >
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-1 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onSelect(opt.id)
                  onClose()
                }}
                className={cn(
                  'w-full text-left p-4 rounded-xl border-2 transition-all duration-150 flex items-start justify-between group bg-card shadow-sm hover:shadow-md cursor-pointer',
                  opt.borderClass
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className={cn('p-3 rounded-lg mt-0.5 shrink-0 transition-transform group-hover:scale-105', opt.iconClass)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                        {opt.title}
                      </span>
                      <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full border', opt.badgeClass)}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      {opt.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-full text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            )
          })}
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Reusable Operations & Add-ons:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {auxiliaryOptions.map((aux) => {
              const AuxIcon = aux.icon
              return (
                <button
                  key={aux.id}
                  type="button"
                  onClick={() => {
                    onSelect(aux.id)
                    onClose()
                  }}
                  className={cn(
                    'p-2.5 rounded-lg border border-border/70 text-left transition-all hover:shadow-xs group cursor-pointer bg-card/60',
                    aux.colorClass
                  )}
                >
                  <div className="flex items-center gap-2 text-foreground font-medium text-xs">
                    <AuxIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    <span>{aux.title}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {aux.description}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}

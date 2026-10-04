'use client'

import React from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Package, Wrench, Boxes, ArrowRight, Layers, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EntityTypeSelectorModalProps {
 isOpen: boolean
 onClose: () => void
 onSelect: (type: 'product' | 'service' | 'material' | 'outsource') => void
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
 borderClass: 'border-primary/20 border-border/60 hover:border-primary/20 hover:bg-primary/10/50 dark:hover:bg-primary/10',
 badgeClass: 'bg-primary/10 text-primary bg-primary/60 text-primary border-primary/20 border-border',
 iconClass: 'bg-primary/10 text-primary bg-primary/60 text-primary',
    },
    {
 id: 'service' as const,
 title: 'Print / Production Service',
 subtitle: 'UV Vinyl Print, Eco PVC Banner, Acrylic Signage, CNC Laser Cutting',
 description: 'Custom work configured by dimensions, required materials, finishing, and allowance geometry.',
 icon: Wrench,
 badge: 'Custom Jobs',
 borderClass: 'border-success-border border-success-border/60 hover:border-success-border hover:bg-success-surface/50 dark:hover:bg-success-surface',
 badgeClass: 'bg-success-surface text-success bg-success/60 text-success border-success-border border-success-border',
 iconClass: 'bg-success-surface text-success bg-success/60 text-success',
    },
    {
 id: 'material' as const,
 title: 'Raw Material',
 subtitle: 'Vinyl Sticker Rolls (3/4/5ft), PVC Rolls (3.25/4.25/5.25ft), UV Ink Bottles',
 description: 'Stock materials purchased in bulk/rolls, tracked by roll length, and consumed during production.',
 icon: Boxes,
 badge: 'Inventory Stock',
 borderClass: 'border-warning-border border-warning-border/60 hover:border-warning-border hover:bg-warning-surface/50 dark:hover:bg-warning-surface',
 badgeClass: 'bg-warning-surface text-warning bg-warning/60 text-warning border-warning-border border-warning-border',
 iconClass: 'bg-warning-surface text-warning bg-warning/60 text-warning',
    },
    {
 id: 'outsource' as const,
 title: 'Outsource Product',
 subtitle: 'Offset Printing, Neon Flex Signs, Computer Embroidery, Gold Foil Stamping',
 description: 'Jobs & items contracted to third-party vendors. Direct vendor costing, lead times, and zero stock depletion.',
 icon: Share2,
 badge: 'Non-Inventory',
 borderClass: 'border-primary/20 border-border/60 hover:border-primary/20 hover:bg-primary/10/50 dark:hover:bg-primary/10',
 badgeClass: 'bg-primary/10 text-primary bg-primary/60 text-primary border-primary/20 border-border',
 iconClass: 'bg-primary/10 text-primary bg-primary/60 text-primary',
    },
  ]

 return (
    <ModalDialog
 open={isOpen}
 onOpenChange={(open) => !open && onClose()}
 size="2xl"title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0">
            <Layers className="h-5 w-5"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">
 What would you like to add?
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
 Select the appropriate entity type to open the dedicated commercial configuration form.
            </p>
          </div>
        </div>
      }
 hideFooter={true}
    >
      <div className="space-y-4 py-1">
        <div className="grid grid-cols-1 gap-3">
          {options.map((opt) => {
 const Icon = opt.icon
 return (
              <button
 key={opt.id}
 type="button"onClick={() => {
 onSelect(opt.id)
 onClose()
                }}
 className={cn(
                  'w-full text-left p-4 rounded-xl border bg-card transition-all duration-150 flex items-start justify-between group shadow-xs hover:shadow-xs cursor-pointer',
 opt.borderClass
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className={cn('p-2.5 rounded-xl mt-0.5 shrink-0 transition-transform group-hover:scale-105', opt.iconClass)}>
                    <Icon className="w-5 h-5"/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm group-hover:text-primary dark:group-hover:text-primary transition-colors">
                        {opt.title}
                      </span>
                      <span className={cn('px-2 py-0.5 text-xs font-bold rounded-md border', opt.badgeClass)}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      {opt.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-full text-muted-foreground group-hover:text-primary dark:group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">
                  <ArrowRight className="w-4 h-4"/>
                </div>
              </button>
            )
          })}
        </div>

        {/* Standardized Bottom Action */}
        <div className="pt-3 border-t border-border flex justify-end">
          <Button
 type="button"variant="outline"onClick={onClose}
 className="h-10 px-4 rounded-xl font-bold border-input text-foreground hover:bg-muted dark:hover:bg-muted">
 Cancel
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}

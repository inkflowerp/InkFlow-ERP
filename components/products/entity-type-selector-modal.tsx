'use client'

import React from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Package, Wrench, Boxes, Sparkles, PlusCircle, ArrowRight, ShieldCheck, Palette, Layers, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EntityTypeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'product' | 'service' | 'material' | 'outsource' | 'finishing' | 'additional' | 'installation' | 'printing_method') => void
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
      borderClass: 'border-blue-200 dark:border-blue-900/60 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30',
      badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      iconClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    },
    {
      id: 'service' as const,
      title: 'Print / Production Service',
      subtitle: 'UV Vinyl Print, Eco PVC Banner, Acrylic Signage, CNC Laser Cutting',
      description: 'Custom work configured by dimensions, required materials, finishing, and allowance geometry.',
      icon: Wrench,
      badge: 'Custom Jobs',
      borderClass: 'border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    },
    {
      id: 'material' as const,
      title: 'Raw Material',
      subtitle: 'Vinyl Sticker Rolls (3/4/5ft), PVC Rolls (3.25/4.25/5.25ft), UV Ink Bottles',
      description: 'Stock materials purchased in bulk/rolls, tracked by roll length, and consumed during production.',
      icon: Boxes,
      badge: 'Inventory Stock',
      borderClass: 'border-amber-200 dark:border-amber-900/60 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30',
      badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    },
    {
      id: 'outsource' as const,
      title: 'Outsource Product',
      subtitle: 'Offset Printing, Neon Flex Signs, Computer Embroidery, Gold Foil Stamping',
      description: 'Jobs & items contracted to third-party vendors. Direct vendor costing, lead times, and zero stock depletion.',
      icon: Share2,
      badge: 'Non-Inventory',
      borderClass: 'border-purple-200 dark:border-purple-900/60 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30',
      badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      iconClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
    },
  ]

  const auxiliaryOptions = [
    {
      id: 'finishing' as const,
      title: 'Finishing Operation',
      description: 'Glossy/Matte Lamination, Eyelet, MS Frame',
      icon: Sparkles,
      colorClass: 'hover:border-purple-400 hover:bg-purple-50/40 dark:hover:bg-purple-950/30',
    },
    {
      id: 'additional' as const,
      title: 'Additional Work / Pasting',
      description: '3mm PVC Board Pasting, Foam Board, Framing',
      icon: PlusCircle,
      colorClass: 'hover:border-cyan-400 hover:bg-cyan-50/40 dark:hover:bg-cyan-950/30',
    },
    {
      id: 'installation' as const,
      title: 'Installation / Fulfillment',
      description: 'On-Site Installation, Shop Delivery, Dispatch',
      icon: ShieldCheck,
      colorClass: 'hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30',
    },
    {
      id: 'printing_method' as const,
      title: 'Printing Method',
      description: 'Eco-Solvent, UV Flatbed, DTF, Latex',
      icon: Palette,
      colorClass: 'hover:border-rose-400 hover:bg-rose-50/40 dark:hover:bg-rose-950/30',
    },
  ]

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                What would you like to add?
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
                type="button"
                onClick={() => {
                  onSelect(opt.id)
                  onClose()
                }}
                className={cn(
                  'w-full text-left p-4 rounded-xl border bg-white dark:bg-slate-900 transition-all duration-150 flex items-start justify-between group shadow-xs hover:shadow-md cursor-pointer',
                  opt.borderClass
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className={cn('p-2.5 rounded-xl mt-0.5 shrink-0 transition-transform group-hover:scale-105', opt.iconClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {opt.title}
                      </span>
                      <span className={cn('px-2 py-0.5 text-[10px] font-bold rounded-md border', opt.badgeClass)}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                      {opt.subtitle}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-full text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            )
          })}
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Reusable Operations & Add-ons
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    'p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition-all hover:shadow-xs group cursor-pointer bg-white dark:bg-slate-900',
                    aux.colorClass
                  )}
                >
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                    <AuxIcon className="w-4 h-4 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    <span>{aux.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {aux.description}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Standardized Bottom Action */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}

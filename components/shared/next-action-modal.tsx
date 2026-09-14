'use client'

import React from 'react'
import {
  CheckCircle2,
  ArrowRight,
  Printer,
  FileText,
  DollarSign,
  MessageSquare,
  Truck,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'

export interface NextActionItem {
  labelEn: string
  labelBn: string
  icon?: React.ElementType
  onClick: () => void
  variant?: 'default' | 'outline' | 'secondary'
}

export interface NextActionConfig {
  titleEn: string
  titleBn: string
  descriptionEn?: string
  descriptionBn?: string
  primaryAction: NextActionItem
  secondaryActions?: NextActionItem[]
}

interface NextActionModalProps {
  isOpen: boolean
  onClose: () => void
  config: NextActionConfig
}

export function NextActionModal({ isOpen, onClose, config }: NextActionModalProps) {
  const { tBilingual } = useI18n()

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual(config.titleEn, config.titleBn)}
      hideFooter={true}
      size="md"
    >
      <div className="space-y-5 text-center py-2">
        {/* Success Icon */}
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-sm animate-in zoom-in-50 duration-200">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {tBilingual(config.titleEn, config.titleBn)}
          </h3>
          {(config.descriptionEn || config.descriptionBn) && (
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {tBilingual(config.descriptionEn || '', config.descriptionBn || '')}
            </p>
          )}
        </div>

        {/* Question Prompt */}
        <div className="py-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900">
            {tBilingual('What would you like to do next?', 'পরবর্তী কোন কাজটি করতে চান?')}
          </span>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          <Button
            type="button"
            size="lg"
            onClick={() => {
              config.primaryAction.onClick()
              onClose()
            }}
            className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center gap-2"
          >
            {config.primaryAction.icon && React.createElement(config.primaryAction.icon, { className: 'h-5 w-5' })}
            <span>{tBilingual(config.primaryAction.labelEn, config.primaryAction.labelBn)}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Secondary Action Buttons */}
        {config.secondaryActions && config.secondaryActions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            {config.secondaryActions.map((sec, idx) => (
              <Button
                key={idx}
                type="button"
                variant={sec.variant || 'outline'}
                size="sm"
                onClick={() => {
                  sec.onClick()
                  onClose()
                }}
                className="h-10 text-xs font-semibold justify-start text-left px-3 truncate"
              >
                {sec.icon && React.createElement(sec.icon, { className: 'h-4 w-4 mr-1.5 shrink-0 text-slate-500' })}
                <span className="truncate">{tBilingual(sec.labelEn, sec.labelBn)}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </ModalDialog>
  )
}

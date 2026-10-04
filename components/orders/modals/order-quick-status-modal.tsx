'use client'

import React, { useState } from 'react'
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import {
 type UnifiedOrderRecord,
 type OrderStage,
 type OrderLiveStatus,
 ORDER_LIVE_STATUSES,
} from '../types'

interface OrderQuickStatusModalProps {
 isOpen: boolean
 onClose: () => void
 order: UnifiedOrderRecord | null
 onUpdateStage: (orderId: string, newStage: OrderStage, note?: string) => Promise<void>
 onUpdateLiveStatus?: (orderId: string, newStatus: OrderLiveStatus, note?: string, expectedVersion?: number) => Promise<void>
 onShowNotification?: (msg: string, type?: 'success' | 'warning' | 'info') => void
}

export const OrderQuickStatusModal = React.memo(function OrderQuickStatusModal({
 isOpen,
 onClose,
 order,
 onUpdateStage,
 onUpdateLiveStatus,
 onShowNotification,
}: OrderQuickStatusModalProps) {
 const { tBilingual } = useI18n()
 const initialStatus: OrderLiveStatus =
 order?.currentStatus ||
 ORDER_LIVE_STATUSES.find((s) => s.stage === order?.stage)?.id ||
    'print_queue'

 const [selectedStatus, setSelectedStatus] = useState<OrderLiveStatus>(initialStatus)
 const [stageNote, setStageNote] = useState('')
 const [isSubmitting, setIsSubmitting] = useState(false)

 if (!order) return null

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setIsSubmitting(true)
 try {
 const cfg = ORDER_LIVE_STATUSES.find((s) => s.id === selectedStatus)
 if (onUpdateLiveStatus) {
 await onUpdateLiveStatus(order.id, selectedStatus, stageNote, order.version)
      } else if (cfg) {
 await onUpdateStage(order.id, cfg.stage, stageNote)
      }
 onShowNotification?.(
 tBilingual(
          `Order #${order.orderNumber} status updated to ${cfg ? cfg.labelEn : selectedStatus}!`,
          `অর্ডার #${order.orderNumber}-এর স্ট্যাটাস সফলভাবে আপডেট হয়েছে!`
        ),
        'success'
      )
 onClose()
    } catch (err: any) {
 onShowNotification?.(err.message || tBilingual('Failed to update status', 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে'), 'warning')
    } finally {
 setIsSubmitting(false)
    }
  }

 return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-card border border-border text-foreground p-6 shadow-lg">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary text-primary">
            <ArrowRight className="h-5 w-5"/>
            <span>{tBilingual('Update Order Live Status', 'অর্ডারের লাইভ স্ট্যাটাস আপডেট করুন')}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {tBilingual('Order #:', 'অর্ডার নং:')}{' '}
            <span className="tabular-nums font-bold text-primary">#{order.orderNumber}</span> |{' '}
            {tBilingual('Customer:', 'কাস্টমার:')} {order.customerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-foreground mb-2 block">
              {tBilingual('Select Live Current Status:', 'বর্তমান অবস্থা নির্বাচন করুন:')}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ORDER_LIVE_STATUSES.map((opt) => {
 const isSelected = selectedStatus === opt.id
 return (
                  <button
 key={opt.id}
 type="button"onClick={() => setSelectedStatus(opt.id)}
 className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
 isSelected
                        ? 'bg-primary/10 border-primary/20 text-primary bg-primary/10 text-primary shadow-sm ring-1 focus:ring-ring/30'
                        : 'bg-muted border-border text-foreground hover:border-input'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dotColor}`} />
                      <div className="text-xs font-bold truncate">
                        {tBilingual(opt.labelEn, opt.labelBn)}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary text-primary shrink-0"/>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Button
 type="button"variant="outline"size="sm"onClick={onClose}
 className="text-xs text-muted-foreground">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
 type="submit"size="sm"disabled={isSubmitting}
 className="text-xs bg-primary hover:bg-primary text-white font-bold shadow-xs">
              <span>{isSubmitting ? tBilingual('Updating...', 'আপডেট হচ্ছে...') : tBilingual('Save Status', 'স্ট্যাটাস সংরক্ষণ করুন')}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})

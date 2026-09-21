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
import { CheckCircle2, ArrowRight, Printer, Sparkles, Truck, PackageCheck, AlertTriangle } from 'lucide-react'
import type { UnifiedOrderRecord, OrderStage } from '../types'

interface OrderQuickStatusModalProps {
  isOpen: boolean
  onClose: () => void
  order: UnifiedOrderRecord | null
  onUpdateStage: (orderId: string, newStage: OrderStage, note?: string) => Promise<void>
  onShowNotification?: (msg: string, type?: 'success' | 'warning' | 'info') => void
}

export const OrderQuickStatusModal = React.memo(function OrderQuickStatusModal({
  isOpen,
  onClose,
  order,
  onUpdateStage,
  onShowNotification,
}: OrderQuickStatusModalProps) {
  const [selectedStage, setSelectedStage] = useState<OrderStage>(order?.stage || 'new_orders')
  const [stageNote, setStageNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!order) return null

  const stageOptions: Array<{ id: OrderStage; label: string; icon: any; color: string; desc: string }> = [
    {
      id: 'new_orders',
      label: '১. নতুন অর্ডার (New Intake)',
      icon: Sparkles,
      color: 'text-amber-600',
      desc: 'অর্ডার গ্রহণ ও প্রাথমিক স্পেক যাচাই',
    },
    {
      id: 'in_design',
      label: '২. ডিজাইন ও প্রি-প্রেস (In Design)',
      icon: Sparkles,
      color: 'text-blue-600',
      desc: 'ডিজাইন তৈরি বা কাস্টমার ফাইল চেক ও হোয়াটসঅ্যাপ প্রুফ',
    },
    {
      id: 'in_production',
      label: '৩. মেশিন প্রোডাকশন (In Production Floor)',
      icon: Printer,
      color: 'text-indigo-600',
      desc: 'অফসেট/ডিজিটাল প্রিন্টিং, ল্যামিনেশন ও কাটিং চলমান',
    },
    {
      id: 'ready_delivery',
      label: '৪. ডেলিভারি রেডি (Ready for Delivery)',
      icon: Truck,
      color: 'text-purple-600',
      desc: 'কাউন্টার প্যাকিং সম্পন্ন ও চালানের জন্য প্রস্তুত',
    },
    {
      id: 'delivered',
      label: '৫. ডেলিভারি সম্পন্ন (Delivered & Closed)',
      icon: PackageCheck,
      color: 'text-emerald-600',
      desc: 'গ্রাহককে পণ্য হস্তান্তর ও বাকী সমন্বয় সম্পন্ন',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onUpdateStage(order.id, selectedStage, stageNote)
      onShowNotification?.(`অর্ডার #${order.orderNumber}-এর স্ট্যাটাস সফলভাবে পরিবর্তন হয়েছে!`, 'success')
      onClose()
    } catch (err: any) {
      onShowNotification?.(err.message || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে', 'warning')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <ArrowRight className="h-5 w-5" />
            <span>অর্ডারের অগ্রগতি পরিবর্তন করুন (Advance Order Stage)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            অর্ডার নং: <span className="font-mono font-bold text-indigo-600">#{order.orderNumber}</span> | কাস্টমার: {order.customerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              নতুন স্ট্যাটাস বা পর্যায় নির্বাচন করুন:
            </Label>
            <div className="space-y-2">
              {stageOptions.map((opt) => {
                const Icon = opt.icon
                const isSelected = selectedStage === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedStage(opt.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${opt.color}`} />
                      <div>
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] opacity-75">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-600 dark:text-slate-400"
            >
              বাতিল (Cancel)
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
            >
              <span>{isSubmitting ? 'আপডেট হচ্ছে...' : 'স্ট্যাটাস আপডেট করুন'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})

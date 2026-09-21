'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MessageSquare, Phone, Copy, Check, ExternalLink, Sparkles, Send } from 'lucide-react'
import {
  ORDER_WHATSAPP_TEMPLATES,
  type OrderWhatsAppTemplateKey,
  type UnifiedOrderRecord,
  sanitizeBangladeshiPhone,
  buildBangladeshiOrderWhatsAppMessage,
} from '../types'

interface OrderWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  order: UnifiedOrderRecord | null
  companyName?: string
  initialTemplate?: OrderWhatsAppTemplateKey
  onShowNotification?: (msg: string, type?: 'success' | 'warning' | 'info') => void
}

export const OrderWhatsAppModal = React.memo(function OrderWhatsAppModal({
  isOpen,
  onClose,
  order,
  companyName,
  initialTemplate = 'order_confirmed',
  onShowNotification,
}: OrderWhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<OrderWhatsAppTemplateKey>(initialTemplate)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [messageText, setMessageText] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (order && isOpen) {
      setSelectedTemplate(initialTemplate)
      const raw = order.customerPhone || '01711000000'
      setPhoneNumber(raw)

      const itemsSummary = order.items
        .map((it) => `${it.itemName} (${it.dimensions || `${it.quantity} ${it.unit}`})`)
        .join(', ') || 'Printing Services'

      const generated = buildBangladeshiOrderWhatsAppMessage({
        template: initialTemplate,
        customerName: order.customerName,
        companyName: companyName || 'PrintERP Press Studio',
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        totalAmount: order.totalAmount,
        advanceAmount: order.advanceAmount,
        dueAmount: order.dueAmount,
        deliveryDate: order.deliveryDate,
        itemsSummary,
      })
      setMessageText(generated)
      setIsCopied(false)
    }
  }, [order, isOpen, companyName, initialTemplate])

  const handleTemplateChange = (tpl: OrderWhatsAppTemplateKey) => {
    setSelectedTemplate(tpl)
    if (!order) return
    const itemsSummary = order.items
      .map((it) => `${it.itemName} (${it.dimensions || `${it.quantity} ${it.unit}`})`)
      .join(', ') || 'Printing Services'

    const generated = buildBangladeshiOrderWhatsAppMessage({
      template: tpl,
      customerName: order.customerName,
      companyName: companyName || 'PrintERP Press Studio',
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoiceNumber,
      totalAmount: order.totalAmount,
      advanceAmount: order.advanceAmount,
      dueAmount: order.dueAmount,
      deliveryDate: order.deliveryDate,
      itemsSummary,
    })
    setMessageText(generated)
  }

  const handleCopy = () => {
    if (!messageText) return
    navigator.clipboard.writeText(messageText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2500)
    onShowNotification?.('WhatsApp বার্তা সফলভাবে কপি হয়েছে!', 'success')
  }

  const handleOpenWhatsAppWeb = () => {
    if (!phoneNumber) return
    const clean = sanitizeBangladeshiPhone(phoneNumber)
    const encoded = encodeURIComponent(messageText)
    window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank')
  }

  if (!order) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <MessageSquare className="h-5 w-5" />
            <span>Order WhatsApp Communication Hub (অর্ডার নোটিফিকেশন ও আপডেট)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            অর্ডার নং: <span className="font-mono font-bold text-indigo-600">#{order.orderNumber}</span> | কাস্টমার: <span className="font-semibold text-slate-800 dark:text-slate-200">{order.customerName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Template Selector Pills */}
          <div>
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
              মেসেজ টেমপ্লেট নির্বাচন করুন (Select Message Purpose):
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ORDER_WHATSAPP_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTemplateChange(t.key)}
                  className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-all flex flex-col justify-between ${
                    selectedTemplate === t.key
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-200 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                  }`}
                >
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] font-normal opacity-70 mt-1">{t.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>গ্রাহকের হোয়াটসঅ্যাপ নম্বর (WhatsApp Phone):</span>
              </Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01711-XXXXXX বা +8801..."
                className="font-mono text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-md border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-700 dark:text-slate-300">অটো ৮৮ ফরম্যাট:</span> +{sanitizeBangladeshiPhone(phoneNumber)}
            </div>
          </div>

          {/* Editable WhatsApp Text Preview */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>মেসেজ প্রিভিউ ও এডিটর (Message Preview):</span>
              </Label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{isCopied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
              </button>
            </div>
            <Textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="text-xs font-sans leading-relaxed bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-600 dark:text-slate-400"
            >
              বন্ধ করুন (Close)
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                <span>{isCopied ? 'কপি সম্পন্ন' : 'টেক্সট কপি করুন'}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenWhatsAppWeb}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                <span>হোয়াটসঅ্যাপে পাঠান (Open WhatsApp)</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})

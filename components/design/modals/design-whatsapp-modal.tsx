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
import { MessageSquare, Phone, Copy, Check, ExternalLink, Sparkles, AlertTriangle } from 'lucide-react'
import type { DesignJobRecord } from '@/types/design.types'
import {
  WHATSAPP_TEMPLATES,
  type WhatsAppTemplateKey,
  sanitizeBangladeshiPhone,
  buildBangladeshiWhatsAppMessage,
} from '../types'

interface DesignWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  job: DesignJobRecord | null
  customerPhone?: string | null
  companyName?: string
  initialTemplate?: WhatsAppTemplateKey
  onShowNotification?: (msg: string, type?: 'success' | 'warning' | 'info') => void
}

export const DesignWhatsAppModal = React.memo(function DesignWhatsAppModal({
  isOpen,
  onClose,
  job,
  customerPhone,
  companyName,
  initialTemplate = 'proof',
  onShowNotification,
}: DesignWhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateKey>(initialTemplate)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [messageText, setMessageText] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (job && isOpen) {
      setSelectedTemplate(initialTemplate)
      const raw = customerPhone || job.customer_phone || '01711000000'
      setPhoneNumber(raw)
      const latestVer = job.versions?.[job.versions.length - 1]
      const proofUrl = latestVer?.proof_file_url || 'https://inkflow-erp.vercel.app/proof'
      const generated = buildBangladeshiWhatsAppMessage({
        template: initialTemplate,
        customerName: job.customer_name,
        companyName: companyName || 'PrintERP Studio',
        jobTitle: job.title,
        jobNum: job.design_number,
        invoiceNum: job.invoice_number,
        dimensions: job.dimensions_spec,
        versionNumber: job.current_version || 1,
        proofUrl,
      })
      setMessageText(generated)
      setIsCopied(false)
    }
  }, [job, isOpen, customerPhone, companyName, initialTemplate])

  const handleTemplateChange = (tpl: WhatsAppTemplateKey) => {
    setSelectedTemplate(tpl)
    if (!job) return
    const latestVer = job.versions?.[job.versions.length - 1]
    const proofUrl = latestVer?.proof_file_url || 'https://inkflow-erp.vercel.app/proof'
    const generated = buildBangladeshiWhatsAppMessage({
      template: tpl,
      customerName: job.customer_name,
      companyName: companyName || 'PrintERP Studio',
      jobTitle: job.title,
      jobNum: job.design_number,
      invoiceNum: job.invoice_number,
      dimensions: job.dimensions_spec,
      versionNumber: job.current_version || 1,
      proofUrl,
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

  if (!job) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <MessageSquare className="h-5 w-5" />
            <span>Bangladeshi WhatsApp Communication Hub (গ্রাহক যোগাযোগ ও প্রুফ)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            কাজের নাম: <span className="font-semibold text-slate-800 dark:text-slate-200">{job.title}</span> | জব নং: <span className="font-mono font-bold text-indigo-600">#{job.design_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Template Selector Pills */}
          <div>
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
              মেসেজ টেমপ্লেট নির্বাচন করুন (Select Standard BD Press Template):
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {WHATSAPP_TEMPLATES.map((t) => (
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
                  <span className="text-2xs font-normal opacity-70 mt-1">{t.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>গ্রাহকের হোয়াটসঅ্যাপ নম্বর (WhatsApp Number):</span>
              </Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01711-XXXXXX বা +8801..."
                className="font-mono text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="text-2xs text-slate-500 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-md border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-700 dark:text-slate-300">অটো ৮৮ ফরম্যাট:</span> +{sanitizeBangladeshiPhone(phoneNumber)}
            </div>
          </div>

          {/* Legal Disclaimer Box for Draft Proof */}
          {selectedTemplate === 'proof' && (
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">আইনগত সুরক্ষা ক্লজ সংযুক্ত:</span> এই টেমপ্লেটে প্রেস স্ট্যান্ডার্ড শর্তাবলী আছে যাতে ভুল বানানের কারণে প্রিন্টিং লস হলে গ্রাহক দায় স্বীকার করেন।
              </div>
            </div>
          )}

          {/* Editable WhatsApp Text Preview */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>মেসেজ প্রিভিউ ও এডিটর (Message Body):</span>
              </Label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-2xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
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
                <span>হোয়াটসঅ্যাপে পাঠান (Send WhatsApp Web)</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})

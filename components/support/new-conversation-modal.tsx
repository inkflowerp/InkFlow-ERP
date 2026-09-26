'use client'

// ==============================================================================
// InkFlow SaaS - New Support Conversation Modal
// Standardized modal for ticket creation using unified ModalDialog design system.
// ==============================================================================

import React, { useState, useEffect } from 'react'
import {
  Send,
  Paperclip,
  Sparkles,
  HelpCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Loader2,
  X,
  LifeBuoy,
} from 'lucide-react'
import {
  SupportCategory,
  SupportPriority,
  SUPPORT_CATEGORIES,
  CreateConversationInput,
  SupportAttachmentMeta,
} from '@/types/support.types'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateConversationInput) => Promise<{ success: boolean; error?: string }>
  initialContext?: Record<string, any>
}

export function NewConversationModal({
  isOpen,
  onClose,
  onSubmit,
  initialContext,
}: NewConversationModalProps) {
  const { tBilingual } = useI18n()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<SupportCategory>('general')
  const [priority, setPriority] = useState<SupportPriority>('normal')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<SupportAttachmentMeta[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setSubmitting(false)
    }
  }, [isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newAttachments: SupportAttachmentMeta[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.size > 10 * 1024 * 1024) {
        setError(`File ${f.name} exceeds maximum allowed size (10MB)`)
        continue
      }
      newAttachments.push({
        id: `att-${Date.now()}-${i}`,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        path: `support/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      })
    }
    setAttachments((prev) => [...prev, ...newAttachments])
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setError('Please provide both a subject and details for your request.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await onSubmit({
        subject: subject.trim(),
        category,
        priority,
        initialMessage: message.trim(),
        attachments,
        contextMetadata: initialContext || {},
      })

      if (res.success) {
        setSubject('')
        setMessage('')
        setAttachments([])
        onClose()
      } else {
        setError(res.error || 'Failed to submit support request.')
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Start Support Conversation', 'সহায়তা বার্তা শুরু করুন')}
              </span>
              <Badge variant="outline" className="text-2xs uppercase font-mono py-0.5 px-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                Helpdesk
              </Badge>
            </div>
            <p className="text-2xs text-slate-500 dark:text-slate-400">
              {tBilingual('Our support team is online and ready to assist', 'আমাদের সাপোর্ট টিম আপনাকে সহায়তা করতে প্রস্তুত')}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Classification */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Request Classification', 'অনুরোধের বিবরণ')}
            </h3>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              {tBilingual('Subject / What do you need help with?', 'বিষয় / কী ধরণের সহায়তা প্রয়োজন?')} <span className="text-rose-500">*</span>
            </Label>
            <Input
              required
              placeholder={tBilingual('e.g. Issue with Flex invoice calculation or WhatsApp alerts', 'যেমন: ইনভয়েস তৈরি অথবা হোয়াটসঅ্যাপ নোটিফিকেশন সমস্যা')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Category', 'ক্যাটাগরি')}
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportCategory)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                {SUPPORT_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.labelEn} ({cat.labelBn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Priority', 'অগ্রাধিকার')}
              </Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SupportPriority)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                <option value="low">{tBilingual('Low - General question', 'নিম্ন - সাধারণ প্রশ্ন')}</option>
                <option value="normal">{tBilingual('Normal - Routine assistance', 'স্বাভাবিক - সাধারণ সহায়তা')}</option>
                <option value="high">{tBilingual('High - Work impacted', 'উচ্চ - কাজে বিঘ্ন ঘটছে')}</option>
                <option value="urgent">{tBilingual('Urgent - Critical business stoppage', 'জরুরী - কাজ পুরোপুরি বন্ধ')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Message & Details */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Detailed Message', 'বিস্তারিত বার্তা')}
            </h3>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              {tBilingual('Message Description', 'বিস্তারিত বার্তা')} <span className="text-rose-500">*</span>
            </Label>
            <textarea
              required
              rows={4}
              placeholder={tBilingual(
                'Describe the issue in detail. If this relates to a specific invoice, order, or customer, mention it here.',
                'বিস্তারিত লিখুন। কোনো নির্দিষ্ট অর্ডার বা ইনভয়েস সম্পর্কিত হলে উল্লেখ করুন।'
              )}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-y min-h-[90px]"
            />
          </div>
        </div>

        {/* Section 3: Attachments */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Attachments (Optional)', 'ফাইল বা স্ক্রিনশট')}
              </h3>
            </div>
            <span className="text-2xs text-slate-400 font-mono">Max 10MB</span>
          </div>

          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer transition-colors text-xs text-slate-600 dark:text-slate-400">
            <Paperclip className="w-4 h-4 text-slate-400" />
            <span>{tBilingual('Upload screenshot, error log, or invoice PDF', 'স্ক্রিনশট বা পিডিএফ ফাইল আপলোড করুন')}</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {attachments.length > 0 && (
            <div className="space-y-1.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-2 truncate">
                    {att.type.startsWith('image/') ? (
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span className="truncate max-w-[240px]">{att.name}</span>
                    <span className="text-2xs text-slate-400">
                      ({Math.round(att.size / 1024)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={submitting || !subject.trim() || !message.trim()}
            className="w-full sm:w-auto min-h-[40px] text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>{tBilingual('Submitting...', 'পাঠানো হচ্ছে...')}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span>{tBilingual('Send Request', 'বার্তা পাঠান')}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

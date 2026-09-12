'use client'

// ==============================================================================
// InkFlow SaaS - New Support Conversation Modal
// Simple, clean, modern SaaS ticket composer asking only necessary information.
// ==============================================================================

import React, { useState } from 'react'
import {
  X,
  Send,
  Paperclip,
  Sparkles,
  HelpCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import {
  SupportCategory,
  SupportPriority,
  SUPPORT_CATEGORIES,
  CreateConversationInput,
  SupportAttachmentMeta,
} from '@/types/support.types'
import { useI18n } from '@/i18n/context'

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

  if (!isOpen) return null

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {tBilingual('Start Support Conversation', 'সহায়তা বার্তা শুরু করুন')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual('Our support team is online and ready to assist', 'আমাদের সাপোর্ট টিম আপনাকে সহায়তা করতে প্রস্তুত')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {tBilingual('Subject / What do you need help with?', 'বিষয় / কী ধরণের সহায়তা প্রয়োজন?')} *
            </label>
            <input
              type="text"
              required
              placeholder={tBilingual('e.g. Issue with Flex invoice calculation or WhatsApp alerts', 'যেমন: ইনভয়েস তৈরি অথবা হোয়াটসঅ্যাপ নোটিফিকেশন সমস্যা')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {tBilingual('Category', 'ক্যাটাগরি')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportCategory)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {SUPPORT_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.labelEn} ({cat.labelBn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {tBilingual('Priority', 'অগ্রাধিকার')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SupportPriority)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="low">{tBilingual('Low - General question', 'নিম্ন - সাধারণ প্রশ্ন')}</option>
                <option value="normal">{tBilingual('Normal - Routine assistance', 'স্বাভাবিক - সাধারণ সহায়তা')}</option>
                <option value="high">{tBilingual('High - Work impacted', 'উচ্চ - কাজে বিঘ্ন ঘটছে')}</option>
                <option value="urgent">{tBilingual('Urgent - Critical business stoppage', 'জরুরী - কাজ পুরোপুরি বন্ধ')}</option>
              </select>
            </div>
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {tBilingual('Message / Detailed Description', 'বিস্তারিত বার্তা')} *
            </label>
            <textarea
              required
              rows={5}
              placeholder={tBilingual('Describe the issue in detail. If this relates to a specific invoice, order, or customer, mention it here.', 'বিস্তারিত লিখুন। কোনো নির্দিষ্ট অর্ডার বা ইনভয়েস সম্পর্কিত হলে উল্লেখ করুন।')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-y min-h-[110px]"
            />
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {tBilingual('Attachments (Optional)', 'ফাইল বা স্ক্রিনশট যুক্ত করুন')}
              </label>
              <span className="text-[11px] text-slate-400">Max 10MB (Images, PDF, Logs)</span>
            </div>

            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer transition-colors text-xs text-slate-600 dark:text-slate-400">
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
              <div className="mt-2 space-y-1.5">
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
                      <span className="truncate max-w-[280px]">{att.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ({Math.round(att.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </button>
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{tBilingual('Submitting...', 'পাঠানো হচ্ছে...')}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{tBilingual('Send Request', 'বার্তা পাঠান')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

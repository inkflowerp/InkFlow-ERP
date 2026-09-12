'use client'

// ==============================================================================
// InkFlow SaaS - Tenant Support Chat View Component
// Modern, lightweight real-time conversation timeline, attachment viewer & composer.
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  RotateCcw,
  Sparkles,
  Wifi,
  WifiOff,
  ChevronLeft,
} from 'lucide-react'
import {
  SupportConversationRecord,
  SupportMessageRecord,
  SupportAttachmentMeta,
  SUPPORT_STATUS_CONFIG,
  SUPPORT_PRIORITY_CONFIG,
} from '@/types/support.types'
import { formatDate, formatTime, formatDateTime } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { ChatConnectionState } from '@/hooks/use-support-chat'
import { cn } from '@/lib/utils'

interface TenantChatViewProps {
  conversation: SupportConversationRecord | null
  messages: SupportMessageRecord[]
  loading: boolean
  connectionState: ChatConnectionState
  onSendMessage: (body: string, isInternal: boolean, attachments: any[]) => Promise<void>
  onCloseTicket: () => Promise<void>
  onReopenTicket: (reason?: string) => Promise<void>
  onBackToList?: () => void
}

export function TenantChatView({
  conversation,
  messages,
  loading,
  connectionState,
  onSendMessage,
  onCloseTicket,
  onReopenTicket,
  onBackToList,
}: TenantChatViewProps) {
  const { tBilingual } = useI18n()
  const [inputText, setInputText] = useState('')
  const [attachments, setAttachments] = useState<SupportAttachmentMeta[]>([])
  const [sending, setSending] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isClosed = conversation?.status === 'closed'

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = async () => {
    if ((!inputText.trim() && attachments.length === 0) || sending || isClosed) return

    setSending(true)
    const textToSend = inputText
    const attsToSend = attachments
    setInputText('')
    setAttachments([])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await onSendMessage(textToSend, false, attsToSend)
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newAttachments: SupportAttachmentMeta[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.size > 10 * 1024 * 1024) continue

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

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <Sparkles className="w-8 h-8 text-indigo-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {tBilingual('Select a Support Conversation', 'একটি সহায়তা বার্তা নির্বাচন করুন')}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
          {tBilingual('Choose a ticket from the left or create a new request to chat live with our support team.', 'বাম পাশ থেকে টিকেট বাছাই করুন অথবা নতুন রিকোয়েস্ট তৈরি করুন।')}
        </p>
      </div>
    )
  }

  const statusConfig = SUPPORT_STATUS_CONFIG[conversation.status]
  const priorityConfig = SUPPORT_PRIORITY_CONFIG[conversation.priority]

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/40 dark:bg-slate-950/40 overflow-hidden">
      {/* Conversation Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/50">
                {conversation.ticket_number}
              </span>
              <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-medium border', statusConfig.badgeClass)}>
                {statusConfig.labelEn}
              </span>
              <span className={cn('hidden sm:inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border', priorityConfig.badgeClass)}>
                {priorityConfig.labelEn}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {conversation.subject}
            </h2>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Connection Pill */}
          <div
            className={cn(
              'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border',
              connectionState === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/80'
                : connectionState === 'connecting' || connectionState === 'reconnecting'
                ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/80'
                : 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/80'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                connectionState === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : connectionState === 'connecting' || connectionState === 'reconnecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              )}
            />
            <span className="capitalize">{connectionState}</span>
          </div>

          {isClosed ? (
            <button
              onClick={() => onReopenTicket()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{tBilingual('Reopen', 'পুনরায় চালু')}</span>
            </button>
          ) : (
            <button
              onClick={onCloseTicket}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{tBilingual('Mark Resolved', 'মীমাংসিত করুন')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs">{tBilingual('Loading messages...', 'বার্তা লোড হচ্ছে...')}</span>
          </div>
        ) : (
          messages.map((msg) => {
            // System Event Bubble
            if (msg.message_type === 'system_event') {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800/70 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700/40 flex items-center gap-1.5 shadow-xs">
                    <Clock className="w-3 h-3" />
                    <span>{msg.body}</span>
                    <span className="text-[10px] text-slate-400">· {formatTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            }

            const isMe = msg.sender_type === 'tenant_user'

            return (
              <div
                key={msg.id}
                className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
              >
                {/* Sender Tag */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                  {isMe ? (
                    <span>{tBilingual('You', 'আপনি')}</span>
                  ) : (
                    <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{msg.sender_name}</span>
                    </div>
                  )}
                  <span>· {formatTime(msg.created_at)}</span>
                </div>

                {/* Bubble Container */}
                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs transition-all',
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-800'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.body}</p>

                  {/* Attachments within Message */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-indigo-500/30 dark:border-slate-800 space-y-1.5">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className={cn(
                            'flex items-center justify-between gap-2 p-2 rounded-xl text-xs',
                            isMe
                              ? 'bg-indigo-700/60 text-indigo-50'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {att.type.startsWith('image/') ? (
                              <ImageIcon className="w-4 h-4 shrink-0 text-blue-300" />
                            ) : (
                              <FileText className="w-4 h-4 shrink-0 text-amber-300" />
                            )}
                            <span className="truncate">{att.name}</span>
                            <span className="text-[10px] opacity-75">
                              ({Math.round(att.size / 1024)} KB)
                            </span>
                          </div>
                          {att.signedUrl && (
                            <a
                              href={att.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Upload Preview Bar */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-indigo-50/50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
            >
              <Paperclip className="w-3 h-3 text-indigo-500" />
              <span className="max-w-[150px] truncate">{att.name}</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                className="p-0.5 text-slate-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Composer */}
      {isClosed ? (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/80 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{tBilingual('This support ticket is closed.', 'এই টিকেটটি সমাপ্ত করা হয়েছে।')}</span>
          <button
            onClick={() => onReopenTicket()}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
          >
            {tBilingual('Click here to reopen conversation', 'পুনরায় বার্তা পাঠাতে এখানে ক্লিক করুন')}
          </button>
        </div>
      ) : (
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-end gap-2 shrink-0">
          <label
            title="Attach file"
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
          >
            <Paperclip className="w-5 h-5" />
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 px-3 py-1.5 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={tBilingual('Type your reply... (Press Enter to send, Shift+Enter for new line)', 'আপনার বার্তা লিখুন... (পাঠাতে Enter চাপুন)')}
              className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none resize-none placeholder:text-slate-400 py-1"
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={(!inputText.trim() && attachments.length === 0) || sending}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm shadow-indigo-500/20 transition-all shrink-0 cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}

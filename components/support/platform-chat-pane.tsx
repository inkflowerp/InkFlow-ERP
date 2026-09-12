'use client'

// ==============================================================================
// InkFlow SaaS - Platform Support Chat Pane Component
// Authoritative dual-mode composer (Public Reply vs Private Internal Note),
// realtime stream, system timeline events, and attachment actions.
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Lock,
  MessageSquare,
  Shield,
  ShieldCheck,
  User,
  Paperclip,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  ExternalLink,
  ChevronDown,
  UserCheck,
  Tag,
  Zap,
} from 'lucide-react'
import {
  SupportConversationRecord,
  SupportMessageRecord,
  SupportAttachmentMeta,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  SUPPORT_STATUS_CONFIG,
  SUPPORT_PRIORITY_CONFIG,
  SUPPORT_CATEGORIES,
} from '@/types/support.types'
import { formatDate, formatTime, formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface PlatformChatPaneProps {
  conversation: SupportConversationRecord | null
  messages: SupportMessageRecord[]
  loading: boolean
  onSendMessage: (body: string, isInternal: boolean, attachments: any[]) => Promise<void>
  onUpdateStatus: (status: SupportStatus) => Promise<void>
  onUpdatePriority: (priority: SupportPriority) => Promise<void>
  onUpdateCategory: (category: SupportCategory) => Promise<void>
  onAssignTicket: (adminId: string | null, adminName: string | null) => Promise<void>
  currentAdminId?: string
  currentAdminName?: string
}

export function PlatformChatPane({
  conversation,
  messages,
  loading,
  onSendMessage,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateCategory,
  onAssignTicket,
  currentAdminId,
  currentAdminName,
}: PlatformChatPaneProps) {
  const [inputText, setInputText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [attachments, setAttachments] = useState<SupportAttachmentMeta[]>([])
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if ((!inputText.trim() && attachments.length === 0) || sending || !conversation) return

    setSending(true)
    const textToSend = inputText
    const isInternal = isInternalNote
    const attsToSend = attachments
    setInputText('')
    setAttachments([])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await onSendMessage(textToSend, isInternal, attsToSend)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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

  // Quick Canned Snippets
  const insertSnippet = (snippet: string) => {
    setInputText((prev) => (prev ? `${prev}\n${snippet}` : snippet))
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-950/40">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <MessageSquare className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Select a Support Conversation</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
          Choose a conversation from the triage queue to review messages, add internal notes, or reply directly.
        </p>
      </div>
    )
  }

  const statusConfig = SUPPORT_STATUS_CONFIG[conversation.status]
  const priorityConfig = SUPPORT_PRIORITY_CONFIG[conversation.priority]

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-hidden border-r border-slate-800/80">
      {/* Top Action Bar */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800/80">
            {conversation.ticket_number}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100 truncate">{conversation.subject}</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{conversation.company_name || 'Tenant'}</span>
              <span>·</span>
              <span>{conversation.created_by_name} ({conversation.created_by_email})</span>
            </div>
          </div>
        </div>

        {/* Status, Priority & Assignment Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Dropdown */}
          <select
            value={conversation.status}
            onChange={(e) => onUpdateStatus(e.target.value as SupportStatus)}
            className="px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_customer">Waiting for Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={conversation.priority}
            onChange={(e) => onUpdatePriority(e.target.value as SupportPriority)}
            className="px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="low">Low Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent Priority</option>
          </select>

          {/* Assign to Me button */}
          {conversation.assigned_to !== currentAdminId && currentAdminId && (
            <button
              onClick={() => onAssignTicket(currentAdminId, currentAdminName || 'Staff')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/80 rounded-lg transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Claim / Assign to Me</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs">Loading message stream...</span>
          </div>
        ) : (
          messages.map((msg) => {
            // System Event Bubble
            if (msg.message_type === 'system_event') {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="px-3 py-1 rounded-full bg-slate-900 text-[11px] text-slate-400 border border-slate-800 flex items-center gap-1.5 shadow-xs">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{msg.body}</span>
                    <span className="text-[10px] text-slate-500">· {formatTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            }

            // Internal Note Bubble (Private)
            if (msg.message_type === 'internal_note') {
              return (
                <div key={msg.id} className="flex flex-col items-center my-2 w-full">
                  <div className="w-full max-w-2xl rounded-2xl p-4 bg-amber-950/30 border border-amber-800/60 text-amber-200 shadow-sm">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-900/50 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>INTERNAL NOTE (Visible only to Platform Staff)</span>
                      </div>
                      <span className="text-[11px] text-amber-400/80">
                        {msg.sender_name} · {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs sm:text-sm text-amber-100/90 leading-relaxed select-text">
                      {msg.body}
                    </p>
                  </div>
                </div>
              )
            }

            const isCustomer = msg.sender_type === 'tenant_user'

            return (
              <div
                key={msg.id}
                className={cn('flex flex-col', isCustomer ? 'items-start' : 'items-end')}
              >
                {/* Sender Header */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                  {isCustomer ? (
                    <div className="flex items-center gap-1 font-semibold text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{msg.sender_name} (Customer)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-indigo-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{msg.sender_name}</span>
                    </div>
                  )}
                  <span>· {formatTime(msg.created_at)}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs transition-all',
                    isCustomer
                      ? 'bg-slate-900 text-slate-100 rounded-tl-xs border border-slate-800'
                      : 'bg-indigo-600 text-white rounded-tr-xs'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.body}</p>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl text-xs bg-slate-950/60 border border-slate-800 text-slate-300"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {att.type.startsWith('image/') ? (
                              <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            <span className="truncate">{att.name}</span>
                            <span className="text-[10px] text-slate-500">
                              ({Math.round(att.size / 1024)} KB)
                            </span>
                          </div>
                          {att.signedUrl && (
                            <a
                              href={att.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                              title="Download Attachment"
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

      {/* Composer Toolbar & Switcher */}
      <div className="border-t border-slate-800 bg-slate-900/95 p-3 sm:p-4 space-y-3">
        {/* Reply Type Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setIsInternalNote(false)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                !isInternalNote
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Public Reply</span>
            </button>
            <button
              type="button"
              onClick={() => setIsInternalNote(true)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                isInternalNote
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Internal Note (Private)</span>
            </button>
          </div>

          {/* Canned Snippet Quick Helpers */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  'Hello! Thank you for reaching out. We are currently investigating this issue for your tenant and will update you shortly.'
                )
              }
              className="px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              + Investigating
            </button>
            <button
              type="button"
              onClick={() =>
                insertSnippet(
                  'Could you please share a screenshot or the specific Invoice/Order ID so we can verify the backend records?'
                )
              }
              className="px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              + Request Info
            </button>
          </div>
        </div>

        {/* Attachment Upload Preview Bar */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 text-xs text-slate-300 border border-slate-800"
              >
                <Paperclip className="w-3 h-3 text-indigo-400" />
                <span className="max-w-[150px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="p-0.5 text-slate-500 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Box */}
        <div
          className={cn(
            'flex items-end gap-2 p-2 rounded-2xl border transition-all',
            isInternalNote
              ? 'bg-amber-950/20 border-amber-700/60 focus-within:ring-2 focus-within:ring-amber-500/20'
              : 'bg-slate-950 border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500'
          )}
        >
          <label
            title="Attach file"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
          >
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          <textarea
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isInternalNote
                ? 'Add private staff note (Never visible to tenant customer)...'
                : 'Write public support reply to customer... (Press Enter to send)'
            }
            className="flex-1 text-xs sm:text-sm bg-transparent text-slate-100 focus:outline-none resize-none placeholder:text-slate-500 py-1"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={(!inputText.trim() && attachments.length === 0) || sending}
            className={cn(
              'p-2.5 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all shrink-0 cursor-pointer',
              isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

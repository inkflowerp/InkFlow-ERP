'use client'

// ==============================================================================
// InkFlow SaaS - Platform Support Chat Pane Component
// Authoritative dual-mode composer (Public Reply vs Private Internal Note),
// realtime stream, date dividers, and attachment actions.
// ==============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react'
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
  ChevronLeft,
  Info,
  SlidersHorizontal,
  CornerDownLeft,
  Eye,
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
  onBackToQueue?: () => void
  onToggleDetails?: () => void
  showDetails?: boolean
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
  onBackToQueue,
  onToggleDetails,
  showDetails,
  currentAdminId,
  currentAdminName,
}: PlatformChatPaneProps) {
  const [inputText, setInputText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [attachments, setAttachments] = useState<SupportAttachmentMeta[]>([])
  const [sending, setSending] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle auto-expand textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }

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
  const cannedSnippets = [
    {
      label: '+ Investigating',
      text: 'Hello! Thank you for contacting InkFlow Platform Support. We are investigating this issue for your tenant and will update you shortly.',
    },
    {
      label: '+ Request Info',
      text: 'Could you please share the specific Order/Invoice ID, Challan number, or a screenshot so our engineering team can inspect the backend logs?',
    },
    {
      label: '+ Resolved',
      text: 'We have applied the required fix and verified the system state. Please check your workspace and confirm if the issue is resolved on your end.',
    },
    {
      label: '+ Escalated',
      text: 'This ticket has been escalated to our senior platform infrastructure team for priority remediation.',
    },
  ]

  const insertSnippet = (snippet: string) => {
    setInputText((prev) => (prev ? `${prev}\n${snippet}` : snippet))
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Date grouping for messages
  const messageGroups = useMemo(() => {
    const groups: { dateKey: string; dateLabel: string; items: SupportMessageRecord[] }[] = []
    messages.forEach((msg) => {
      const d = new Date(msg.created_at)
      const dateKey = d.toDateString()
      let group = groups.find((g) => g.dateKey === dateKey)
      if (!group) {
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        let dateLabel = formatDate(msg.created_at)
        if (dateKey === today) dateLabel = 'Today'
        else if (dateKey === yesterday) dateLabel = 'Yesterday'
        group = { dateKey, dateLabel, items: [] }
        groups.push(group)
      }
      group.items.push(msg)
    })
    return groups
  }, [messages])

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-950/40 select-none">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
          <MessageSquare className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-200">Select a Support Conversation</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[320px]">
          Choose an active ticket from the triage queue on the left to review messages, post private internal notes, or reply directly to the customer.
        </p>
      </div>
    )
  }

  const statusConfig = SUPPORT_STATUS_CONFIG[conversation.status]
  const priorityConfig = SUPPORT_PRIORITY_CONFIG[conversation.priority]

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-hidden border-r border-slate-800/80 min-w-0 font-sans">
      {/* 1. Top Action Bar */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
          {onBackToQueue && (
            <button
              type="button"
              onClick={onBackToQueue}
              className="lg:hidden p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Back to Queue"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800/80 shrink-0">
            {conversation.ticket_number}
          </span>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 truncate" title={conversation.subject}>
              {conversation.subject}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
              <span className="font-semibold text-slate-200 truncate">{conversation.company_name || 'Tenant'}</span>
              <span>·</span>
              <span className="truncate">{conversation.created_by_name}</span>
            </div>
          </div>
        </div>

        {/* Status, Priority, Category & Assignment Selectors */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto">
          {/* Category Dropdown */}
          <select
            value={conversation.category}
            onChange={(e) => onUpdateCategory(e.target.value as SupportCategory)}
            className="hidden sm:inline-block px-2.5 py-1 text-[11px] rounded-lg font-medium bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[130px] truncate"
            title="Ticket Category"
          >
            {SUPPORT_CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.labelEn}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={conversation.status}
            onChange={(e) => onUpdateStatus(e.target.value as SupportStatus)}
            className={cn(
              'px-2.5 py-1 text-[11px] rounded-lg font-semibold border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer',
              statusConfig.badgeClass
            )}
            title="Ticket Status"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_customer">Waiting Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={conversation.priority}
            onChange={(e) => onUpdatePriority(e.target.value as SupportPriority)}
            className={cn(
              'px-2 py-1 text-[11px] rounded-lg font-semibold border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer',
              priorityConfig.badgeClass
            )}
            title="Ticket Priority"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Assign to Me button */}
          {conversation.assigned_to !== currentAdminId && currentAdminId && (
            <button
              onClick={() => onAssignTicket(currentAdminId, currentAdminName || 'Staff')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-800 rounded-lg transition-colors cursor-pointer"
              title="Assign this ticket to yourself"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Claim</span>
            </button>
          )}

          {/* Toggle Details Sidebar Button */}
          {onToggleDetails && (
            <button
              type="button"
              onClick={onToggleDetails}
              className={cn(
                'p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
                showDetails
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
              )}
              title="Toggle Ticket & Tenant Details"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Message Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs font-mono">Loading message stream...</span>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.dateKey} className="space-y-4">
              {/* Date Group Header */}
              <div className="flex justify-center my-3">
                <span className="px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-xs">
                  {group.dateLabel}
                </span>
              </div>

              {group.items.map((msg) => {
                // System Event Bubble
                if (msg.message_type === 'system_event') {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="px-3.5 py-1 rounded-full bg-slate-900/80 text-[11px] text-slate-400 border border-slate-800 flex items-center gap-1.5 shadow-xs">
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
                    <div key={msg.id} className="flex flex-col items-center my-2.5 w-full">
                      <div className="w-full max-w-2xl rounded-2xl p-4 bg-amber-950/30 border border-amber-800/70 text-amber-200 shadow-sm">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-900/60 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-400">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>INTERNAL NOTE (Platform Staff Only)</span>
                          </div>
                          <span className="text-[11px] text-amber-400/80">
                            {msg.sender_name} · {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-xs sm:text-sm text-amber-100/90 leading-relaxed select-text font-normal">
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
                          <span>{msg.sender_name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Customer)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-indigo-400 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{msg.sender_name}</span>
                          <span className="text-[10px] text-indigo-300/80 font-normal">(Platform Staff)</span>
                        </div>
                      )}
                      <span>· {formatTime(msg.created_at)}</span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        'max-w-[88%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs transition-all',
                        isCustomer
                          ? 'bg-slate-900 text-slate-100 rounded-tl-xs border border-slate-800'
                          : 'bg-indigo-600 text-white rounded-tr-xs shadow-indigo-600/20 shadow-md'
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.body}</p>

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-xl text-xs bg-slate-950/70 border border-slate-800 text-slate-200"
                            >
                              <div className="flex items-center gap-2 truncate">
                                {att.type.startsWith('image/') ? (
                                  <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                                )}
                                <span className="truncate font-medium">{att.name}</span>
                                <span className="text-[10px] text-slate-400">
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
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Composer Toolbar & Dual-Mode Switcher */}
      <div className="border-t border-slate-800 bg-slate-900/95 p-3 sm:p-4 space-y-2.5 shrink-0">
        {/* Reply Type Toggle & Canned Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setIsInternalNote(false)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
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
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                isInternalNote
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Internal Note (Private)</span>
            </button>
          </div>

          {/* Canned Snippet Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
            {cannedSnippets.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => insertSnippet(chip.text)}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 whitespace-nowrap border border-slate-800/80 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Private Note Warning Banner */}
        {isInternalNote && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>Private note mode active: Customer will NOT see this message or receive any notifications.</span>
          </div>
        )}

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
                  className="p-0.5 text-slate-500 hover:text-red-400 cursor-pointer"
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
            title="Attach file (Max 10MB)"
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
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isInternalNote
                ? 'Add private staff note (Never visible to customer)... Press Enter to save note'
                : 'Write public support reply to customer... (Press Enter to send, Shift+Enter for new line)'
            }
            className="flex-1 text-xs sm:text-sm bg-transparent text-slate-100 focus:outline-none resize-none placeholder:text-slate-500 py-1 max-h-36 leading-relaxed"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={(!inputText.trim() && attachments.length === 0) || sending}
            className={cn(
              'p-2.5 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all shrink-0 cursor-pointer flex items-center justify-center',
              isInternalNote
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
            )}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

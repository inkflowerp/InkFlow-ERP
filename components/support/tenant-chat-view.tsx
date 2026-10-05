'use client'

// ==============================================================================
// PrintFlow SaaS - Tenant Support Chat View Component
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/50">
        <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
          <Sparkles className="w-8 h-8 text-primary"/>
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {tBilingual('Select a Support Conversation', 'একটি সহায়তা বার্তা নির্বাচন করুন')}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
          {tBilingual('Choose a ticket from the left or create a new request to chat live with our support team.', 'বাম পাশ থেকে টিকেট বাছাই করুন অথবা নতুন রিকোয়েস্ট তৈরি করুন।')}
        </p>
      </div>
    )
  }

 const statusConfig = SUPPORT_STATUS_CONFIG[conversation.status]
 const priorityConfig = SUPPORT_PRIORITY_CONFIG[conversation.priority]

 return (
    <div className="flex-1 flex flex-col h-full bg-muted/40 overflow-hidden">
      {/* Conversation Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-border bg-card/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToList && (
            <button
 onClick={onBackToList}
 className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted dark:hover:bg-muted">
              <ChevronLeft className="w-5 h-5"/>
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-bold text-xs text-primary text-primary bg-primary/10 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20/60 border-border/50">
                {conversation.ticket_number}
              </span>
              <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium border', statusConfig.badgeClass)}>
                {statusConfig.labelEn}
              </span>
              <span className={cn('hidden sm:inline-flex px-2 py-0.5 rounded-md text-xs font-medium border', priorityConfig.badgeClass)}>
                {priorityConfig.labelEn}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-foreground truncate mt-0.5">
              {conversation.subject}
            </h2>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Connection Pill */}
          <div
 className={cn(
              'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
 connectionState === 'connected'
                ? 'bg-success-surface text-success border-success-border/80 bg-success-surface text-success border-success-border/80'
                : connectionState === 'connecting' || connectionState === 'reconnecting'
                ? 'bg-warning-surface text-warning border-warning-border/80 bg-warning-surface text-warning border-warning-border/80'
                : 'bg-danger-surface text-destructive border-danger-border/80 bg-danger-surface text-destructive border-danger-border/80'
            )}
          >
            <span
 className={cn(
                'w-1.5 h-1.5 rounded-full',
 connectionState === 'connected'
                  ? 'bg-success animate-pulse'
                  : connectionState === 'connecting' || connectionState === 'reconnecting'
                  ? 'bg-warning animate-pulse'
                  : 'bg-destructive'
              )}
            />
            <span className="capitalize">{connectionState}</span>
          </div>

          {isClosed ? (
            <button
 onClick={() => onReopenTicket()}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary text-primary bg-primary/10 bg-primary/10 hover:bg-primary/10 rounded-xl border border-primary/20 border-border transition-colors">
              <RotateCcw className="w-3.5 h-3.5"/>
              <span>{tBilingual('Reopen', 'পুনরায় চালু')}</span>
            </button>
          ) : (
            <button
 onClick={onCloseTicket}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted hover:bg-muted rounded-xl transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5 text-success"/>
              <span>{tBilingual('Mark Resolved', 'মীমাংসিত করুন')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-transparent animate-spin"/>
            <span className="text-xs">{tBilingual('Loading messages...', 'বার্তা লোড হচ্ছে...')}</span>
          </div>
        ) : (
 messages.map((msg) => {
            // System Event Bubble
 if (msg.message_type === 'system_event') {
 return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="px-3 py-1 rounded-full bg-muted/70 text-xs text-muted-foreground border border-input/40 /40 flex items-center gap-1.5 shadow-xs">
                    <Clock className="w-3 h-3"/>
                    <span>{msg.body}</span>
                    <span className="text-xs text-muted-foreground">· {formatTime(msg.created_at)}</span>
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
                <div className="flex items-center gap-1.5 mb-1 px-1 text-xs text-muted-foreground">
                  {isMe ? (
                    <span>{tBilingual('You', 'আপনি')}</span>
                  ) : (
                    <div className="flex items-center gap-1 text-primary text-primary font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5"/>
                      <span>{msg.sender_name}</span>
                    </div>
                  )}
                  <span>· {formatTime(msg.created_at)}</span>
                </div>

                {/* Bubble Container */}
                <div
 className={cn(
                    'max-w-[85%] sm:max-w-[70%] rounded-xl p-3.5 text-xs sm:text-sm shadow-xs transition-all',
 isMe
                      ? 'bg-primary text-white rounded-tr-xs'
                      : 'bg-card text-foreground rounded-tl-xs border border-border '
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.body}</p>

                  {/* Attachments within Message */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-primary/20/30 space-y-1.5">
                      {msg.attachments.map((att) => (
                        <div
 key={att.id}
 className={cn(
                            'flex items-center justify-between gap-2 p-2 rounded-xl text-xs',
 isMe
                              ? 'bg-primary/60 text-primary'
                              : 'bg-muted text-foreground border border-border /60'
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {att.type.startsWith('image/') ? (
                              <ImageIcon className="w-4 h-4 shrink-0 text-primary"/>
                            ) : (
                              <FileText className="w-4 h-4 shrink-0 text-warning"/>
                            )}
                            <span className="truncate">{att.name}</span>
                            <span className="text-xs opacity-75">
                              ({Math.round(att.size / 1024)} KB)
                            </span>
                          </div>
                          {att.signedUrl && (
                            <a
 href={att.signedUrl}
 target="_blank"rel="noreferrer"className="p-1 rounded-lg hover:bg-black/10 transition-colors"title="Download">
                              <Download className="w-3.5 h-3.5"/>
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
        <div className="px-4 py-2 bg-primary/10/50 border-t border-border flex items-center gap-2 overflow-x-auto">
          {attachments.map((att) => (
            <div
 key={att.id}
 className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card text-xs text-foreground border border-border shadow-xs shrink-0">
              <Paperclip className="w-3 h-3 text-primary"/>
              <span className="max-w-[150px] truncate">{att.name}</span>
              <button
 type="button"onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
 className="p-0.5 text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3"/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Composer */}
      {isClosed ? (
        <div className="p-4 border-t border-border bg-muted/80 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success"/>
          <span>{tBilingual('This support ticket is closed.', 'এই টিকেটটি সমাপ্ত করা হয়েছে।')}</span>
          <button
 onClick={() => onReopenTicket()}
 className="font-semibold text-primary text-primary hover:underline ml-1">
            {tBilingual('Click here to reopen conversation', 'পুনরায় বার্তা পাঠাতে এখানে ক্লিক করুন')}
          </button>
        </div>
      ) : (
        <div className="p-3 sm:p-4 bg-card border-t border-border flex items-end gap-2 shrink-0">
          <label
 title="Attach file"className="p-2.5 rounded-xl text-muted-foreground hover:text-muted-foreground hover:bg-muted cursor-pointer transition-colors shrink-0">
            <Paperclip className="w-5 h-5"/>
            <input
 type="file"multiple
 accept="image/*,application/pdf,text/plain"onChange={handleFileSelect}
 className="hidden"/>
          </label>

          <div className="flex-1 bg-muted rounded-xl border border-border focus-within:ring-2 focus-within:focus:ring-ring/20 focus-within:border-primary/20 px-3 py-1.5 transition-all">
            <textarea
 ref={textareaRef}
 rows={1}
 value={inputText}
 onChange={handleTextChange}
 onKeyDown={handleKeyDown}
 placeholder={tBilingual('Type your reply...', 'আপনার বার্তা লিখুন...')}
 className="w-full text-xs sm:text-sm bg-transparent text-foreground focus:outline-none resize-none placeholder:text-muted-foreground py-1"/>
          </div>

          <button
 type="button"onClick={handleSend}
 disabled={(!inputText.trim() && attachments.length === 0) || sending}
 className="p-2.5 rounded-xl bg-primary hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm shadow-indigo-500/20 transition-all shrink-0 cursor-pointer">
            <Send className="w-5 h-5"/>
          </button>
        </div>
      )}
    </div>
  )
}

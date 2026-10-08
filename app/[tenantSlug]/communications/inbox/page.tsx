'use client'

// ==============================================================================
// PrintFlow SaaS - Tenant WhatsApp Inbox & Customer Conversations
// 3-Pane Responsive Layout: Conversations List | Live Chat Thread | Customer CRM Context
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
 MessageSquare,
 Search,
 Send,
 User,
 Phone,
 Check,
 CheckCheck,
 Clock,
 Paperclip,
 Smile,
 RefreshCw,
 ExternalLink,
 ShieldAlert,
 Smartphone,
 ChevronRight,
 Archive,
 MoreVertical,
 Sliders,
 FileText,
 ShoppingBag,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useRealtime } from '@/components/providers/realtime-provider'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import {
 getWhatsAppChatsAction,
 getWhatsAppChatMessagesAction,
 sendWhatsAppReplyAction,
} from '@/actions/whatsapp-campaign.actions'
import type {
 WhatsAppChatRecord,
 WhatsAppContactRecord,
 WhatsAppMessageRecord,
} from '@/types/communication.types'

type ChatWithContact = WhatsAppChatRecord & { contact?: WhatsAppContactRecord }

export default function TenantWhatsAppInboxPage() {
 const { company } = useTenant()
 const { locale } = useI18n()

 const [chats, setChats] = useState<ChatWithContact[]>([])
 const [selectedChat, setSelectedChat] = useState<ChatWithContact | null>(null)
 const [messages, setMessages] = useState<WhatsAppMessageRecord[]>([])
 const [loadingChats, setLoadingChats] = useState(true)
 const [loadingMessages, setLoadingMessages] = useState(false)
 const [searchQuery, setSearchQuery] = useState('')
 const [filterType, setFilterType] = useState<'all' | 'unread' | 'customer' | 'employee'>('all')

 const [replyText, setReplyText] = useState('')
 const [sendingReply, setSendingReply] = useState(false)

 const messagesEndRef = useRef<HTMLDivElement>(null)

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load chats
 const fetchChats = useCallback(async () => {
 if (!company?.id) return
 try {
 const res = await getWhatsAppChatsAction({
 requestedCompanyId: company.id,
      })
 if (res.success && res.data) {
 setChats(res.data)
 if (!selectedChat && res.data.length > 0) {
 setSelectedChat(res.data[0])
        }
      }
    } catch (err) {
 console.error('Failed to fetch WhatsApp chats:', err)
    } finally {
 setLoadingChats(false)
    }
  }, [company?.id, selectedChat])

  // Load messages for selected chat
 const fetchMessages = useCallback(async (chatId: string) => {
 if (!company?.id) return
 setLoadingMessages(true)
 try {
 const res = await getWhatsAppChatMessagesAction(chatId, company.id)
 if (res.success && res.data) {
 setMessages(res.data)
 setTimeout(scrollToBottom, 50)
      }
    } catch (err) {
 console.error('Failed to fetch chat messages:', err)
    } finally {
 setLoadingMessages(false)
    }
  }, [company?.id])

 useEffect(() => {
 fetchChats()
  }, [fetchChats])

 useEffect(() => {
 if (selectedChat?.id) {
 fetchMessages(selectedChat.id)
    }
  }, [selectedChat?.id, fetchMessages])

  const { status: realtimeStatus } = useRealtime()

  // Realtime instant message updates; fallback poll (60s) ONLY when socket is disconnected
  useEffect(() => {
    if (!selectedChat?.id) return

    const handleMessageSync = () => {
      fetchMessages(selectedChat.id)
    }

    window.addEventListener('printflow_table_synced:support_messages', handleMessageSync)
    window.addEventListener('printflow_table_synced:communication_messages', handleMessageSync)
    window.addEventListener('printflow_table_synced', handleMessageSync)

    let fallbackInterval: NodeJS.Timeout | null = null
    if (realtimeStatus !== 'connected') {
      fallbackInterval = setInterval(() => {
        fetchMessages(selectedChat.id)
      }, 60000)
    }

    return () => {
      window.removeEventListener('printflow_table_synced:support_messages', handleMessageSync)
      window.removeEventListener('printflow_table_synced:communication_messages', handleMessageSync)
      window.removeEventListener('printflow_table_synced', handleMessageSync)
      if (fallbackInterval) clearInterval(fallbackInterval)
    }
  }, [selectedChat?.id, fetchMessages, realtimeStatus])

  // Send Reply
 const handleSendReply = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!selectedChat?.id || !replyText.trim() || !company?.id || sendingReply) return

 setSendingReply(true)
 const textToSend = replyText
 setReplyText('')

 try {
 const res = await sendWhatsAppReplyAction({
 chatId: selectedChat.id,
 messageText: textToSend,
 requestedCompanyId: company.id,
      })

 if (res.success && res.data) {
 setMessages((prev) => [...prev, res.data!])
 setTimeout(scrollToBottom, 50)
 fetchChats() // Update preview and ordering
      } else {
 alert(res.error || 'Failed to dispatch reply.')
 setReplyText(textToSend) // Restore text on failure
      }
    } catch (err: any) {
 alert(err.message || 'Error dispatching reply.')
 setReplyText(textToSend)
    } finally {
 setSendingReply(false)
    }
  }

  // Filtered Chats
 const filteredChats = chats.filter((c) => {
 const contactName = c.contact?.display_name || ''
 const contactPhone = c.contact?.phone_number || ''
 const matchesSearch =
 contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
 contactPhone.includes(searchQuery)

 if (!matchesSearch) return false

 if (filterType === 'unread') return (c.unread_count || 0) > 0
 if (filterType === 'customer') return c.contact?.contact_type === 'customer'
 if (filterType === 'employee') return c.contact?.contact_type === 'employee'
 return true
  })

  return (
    <PanelAccessGuard
      module="whatsapp"
      action="view"
      panelTitle="WhatsApp Inbox"
      panelTitleBn="হোয়াটসঅ্যাপ ইনবক্স"
      allowIfAny={[
        { module: 'communications', action: 'view' },
        { module: 'whatsapp', action: 'view' },
        { module: 'settings', action: 'manage' },
      ]}
    >
      <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
      {/* ------------------------------------------------------------------------ */}
      {/* PANE 1: Chats List (Left) */}
      {/* ------------------------------------------------------------------------ */}
      <div className="w-80 sm:w-96 flex flex-col border-r bg-muted/10 shrink-0">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-success"/>
              {locale === 'bn' ? 'হোয়াটসঅ্যাপ ইনবক্স' : 'WhatsApp Inbox'}
            </h1>
            <Button
 variant="ghost" size="icon" className="h-8 w-8" onClick={fetchChats} aria-label="Refresh conversations"
 title="Refresh conversations">
              <RefreshCw className={`w-4 h-4 ${loadingChats ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground"/>
            <Input
 placeholder={locale === 'bn' ? 'গ্রাহক বা ফোন খুঁজুন...' : 'Search customer or phone...'}
 className="pl-9 h-9 text-xs bg-background"value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(['all', 'unread', 'customer', 'employee'] as const).map((ft) => (
              <button
 key={ft}
 onClick={() => setFilterType(ft)}
 className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
 filterType === ft
                    ? 'bg-surface-inset text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>

        {/* Chats Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {loadingChats ? (
            <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-success"/>
 Loading conversations...
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <p>No conversations found.</p>
              <Link href={`/${company?.slug}/settings/whatsapp`}>
                <Button variant="outline"size="sm"className="mt-2 text-xs">
 Verify Gateway Connection
                </Button>
              </Link>
            </div>
          ) : (
 filteredChats.map((chat) => {
 const isSelected = selectedChat?.id === chat.id
 const contact = chat.contact
 const unread = chat.unread_count || 0

 return (
                <div
 key={chat.id}
 onClick={() => setSelectedChat(chat)}
 className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
 isSelected ? 'bg-muted/80 font-medium' : 'hover:bg-muted/40'
                  }`}
                >
                  <Avatar
 fallback={(contact?.display_name || 'U').slice(0, 2)}
 className="h-10 w-10 shrink-0"/>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate text-foreground">
                        {contact?.display_name || contact?.phone_number || 'Unknown Contact'}
                      </p>
                      {chat.last_message_timestamp && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(chat.last_message_timestamp).toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      {chat.last_message_preview || 'No messages yet'}
                    </p>

                    <div className="flex items-center gap-1.5 pt-1">
                      <Badge variant="outline"className="text-xs py-0 px-1.5 capitalize">
                        {contact?.contact_type || 'Customer'}
                      </Badge>
                      {unread > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-success rounded-full">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* PANE 2: Conversation Thread (Center) */}
      {/* ------------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {selectedChat ? (
          <>
            {/* Active Chat Header */}
            <div className="px-6 py-3.5 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
 fallback={(selectedChat.contact?.display_name || 'U').slice(0, 2)}
 className="h-9 w-9 shrink-0"/>
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {selectedChat.contact?.display_name || 'WhatsApp Contact'}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({selectedChat.contact?.phone_number})
                    </span>
                  </h2>
                  <span className="text-xs text-success text-success flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success"/>
 OpenWA Gateway Session Active
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedChat.contact?.customer_id && (
                  <Link
 href={`/${company?.slug}/customers/${selectedChat.contact.customer_id}`}
 target="_blank">
                    <Button variant="outline"size="sm"className="h-8 text-xs gap-1.5">
                      <User className="w-3.5 h-3.5"/>
 View Customer
                      <ExternalLink className="w-3 h-3 opacity-60"/>
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-muted/5">
              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-success"/>
 Loading message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs space-y-1">
                  <p>No messages in this conversation yet.</p>
                  <p className="text-xs opacity-75">Send a reply below to initiate conversation.</p>
                </div>
              ) : (
 messages.map((msg) => {
 const isOutbound = msg.direction === 'outbound'

 return (
                    <div
 key={msg.id}
 className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div
 className={`max-w-[75%] rounded-xl px-4 py-2.5 shadow-sm text-sm ${
 isOutbound
                            ? 'bg-success text-white rounded-br-none'
                            : 'bg-muted border border-border/80 text-foreground rounded-bl-none'
                        }`}
                      >
                        {/* Media or Document Link */}
                        {msg.media_url && (
                          <div className="mb-2">
                            <a
 href={msg.media_url}
 target="_blank"rel="noreferrer"className={`text-xs underline flex items-center gap-1.5 font-medium ${
 isOutbound ? 'text-white' : 'text-primary'
                              }`}
                            >
                              <Paperclip className="w-3.5 h-3.5"/>
                              {msg.media_filename || 'View Attached Document'}
                            </a>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                        <div
 className={`flex items-center justify-end gap-1 mt-1 text-xs ${
 isOutbound ? 'text-white/80' : 'text-muted-foreground'
                          }`}
                        >
                          <span>
                            {msg.created_at
                              ? new Date(msg.created_at).toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
                                })
                              : ''}
                          </span>
                          {isOutbound && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-primary"/>
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5"/>
                              ) : (
                                <Check className="w-3.5 h-3.5"/>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Template Chips */}
            <div className="px-4 py-2 bg-muted/20 border-t flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-xs text-muted-foreground font-medium shrink-0">Quick Reply:</span>
              {[
                'Your print order is ready for pickup!',
                'Please find your updated quotation attached.',
                'We have received your payment. Thank you!',
              ].map((template, idx) => (
                <button
 key={idx}
 onClick={() => setReplyText(template)}
 className="px-2.5 py-1 rounded-full border bg-background text-xs text-muted-foreground hover:text-foreground shrink-0 transition-colors">
                  {template}
                </button>
              ))}
            </div>

            {/* Bottom Reply Box */}
            <div className="p-4 border-t bg-card">
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <Input
 placeholder={locale === 'bn' ? 'হোয়াটসঅ্যাপ বার্তা লিখুন...' : 'Type a WhatsApp reply...'}
 value={replyText}
 onChange={(e) => setReplyText(e.target.value)}
 disabled={sendingReply}
 className="flex-1 text-sm bg-background"/>

                <Button
 type="submit"disabled={sendingReply || !replyText.trim()}
 className="bg-success hover:bg-success text-white gap-1.5 px-4">
                  <Send className={`w-4 h-4 ${sendingReply ? 'animate-pulse' : ''}`} />
                  {sendingReply ? 'Sending...' : 'Send'}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
            <MessageSquare className="w-12 h-12 text-muted-foreground/40"/>
            <h3 className="font-semibold text-foreground">Select a conversation</h3>
            <p className="text-xs max-w-sm">
 Choose a contact from the left pane to view customer WhatsApp messages and reply in real-time.
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* PANE 3: Customer CRM Context (Right) */}
      {/* ------------------------------------------------------------------------ */}
      {selectedChat && (
        <div className="w-72 border-l bg-card p-5 hidden xl:flex flex-col space-y-6 shrink-0">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
 Contact Overview
            </h3>

            <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b">
              <Avatar
 fallback={(selectedChat.contact?.display_name || 'U').slice(0, 2)}
 className="h-16 w-16"/>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {selectedChat.contact?.display_name || 'Unknown Contact'}
                </p>
                <p className="text-xs text-muted-foreground">{selectedChat.contact?.phone_number}</p>
              </div>
              <Badge variant="outline"className="capitalize text-xs">
                {selectedChat.contact?.contact_type || 'Customer'}
              </Badge>
            </div>
          </div>

          {/* Quick CRM Shortcuts */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 Quick Shortcuts
            </h4>

            <div className="space-y-1.5 text-xs">
              <Link
 href={`/${company?.slug}/orders?customer=${selectedChat.contact?.customer_id || ''}`}
 className="p-2.5 rounded-lg border hover:bg-muted flex items-center justify-between text-foreground transition-colors">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-success"/>
 Customer Orders
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground"/>
              </Link>

              <Link
 href={`/${company?.slug}/invoices?customer=${selectedChat.contact?.customer_id || ''}`}
 className="p-2.5 rounded-lg border hover:bg-muted flex items-center justify-between text-foreground transition-colors">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary"/>
 Customer Invoices
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground"/>
              </Link>
            </div>
          </div>

          {/* Opt-in Status */}
          <div className="p-3.5 rounded-xl border bg-muted/40 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-medium">
              <span>Marketing Opt-In</span>
              <Badge
 variant="outline"className={selectedChat.contact?.is_opted_in !== false ? 'text-success' : 'text-destructive'}
              >
                {selectedChat.contact?.is_opted_in !== false ? 'Subscribed' : 'Opted Out'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
 Recipient receives transactional print notifications and campaign updates.
            </p>
          </div>
        </div>
      )}
      </div>
    </PanelAccessGuard>
  )
}

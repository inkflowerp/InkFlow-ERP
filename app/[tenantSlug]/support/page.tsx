'use client'

// ==============================================================================
// InkFlow SaaS - Tenant Support & Help Desk Page
// Mobile-first, responsive, real-time live support chat for tenant users.
// ==============================================================================

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { useSupportChat } from '@/hooks/use-support-chat'
import { TenantSupportInbox } from '@/components/support/tenant-support-inbox'
import { TenantChatView } from '@/components/support/tenant-chat-view'
import { NewConversationModal } from '@/components/support/new-conversation-modal'
import { Headset, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/i18n/context'

export default function TenantSupportPage() {
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'app'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
    messages,
    connectionState,
    loading,
    loadingMessages,
    error,
    loadConversations,
    sendMessage,
    createTicket,
    updateStatus,
  } = useSupportChat({
    mode: 'tenant',
    companyId: company?.id,
  })

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id)
    setMobileView('chat')
  }

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col -m-3 sm:-m-5 lg:-m-8 overflow-hidden bg-white dark:bg-slate-900 font-sans">
      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Inbox (Hidden on small mobile when viewing chat) */}
        <div
          className={`w-full lg:w-96 shrink-0 h-full flex flex-col ${
            mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <TenantSupportInbox
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
            onOpenNewModal={() => setIsModalOpen(true)}
            loading={loading}
            onRefresh={() => loadConversations()}
          />
        </div>

        {/* Right Column: Active Conversation (Hidden on small mobile when viewing list) */}
        <div
          className={`flex-1 h-full flex flex-col ${
            mobileView === 'list' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <TenantChatView
            conversation={selectedConversation}
            messages={messages}
            loading={loadingMessages}
            connectionState={connectionState}
            onSendMessage={sendMessage}
            onCloseTicket={() => updateStatus('closed')}
            onReopenTicket={(reason) => updateStatus('in_progress', reason)}
            onBackToList={() => setMobileView('list')}
          />
        </div>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={createTicket}
      />
    </div>
  )
}

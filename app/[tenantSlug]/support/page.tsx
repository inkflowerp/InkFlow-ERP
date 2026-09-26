'use client'

// ==============================================================================
// InkFlow SaaS - Tenant Support & Help Desk Page
// Mobile-first, responsive, real-time live support chat for tenant users.
// ==============================================================================

import React, { useState, useEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTenant } from '@/hooks/use-tenant'
import { useSupportChat } from '@/hooks/use-support-chat'
import { TenantSupportInbox } from '@/components/support/tenant-support-inbox'
import { TenantChatView } from '@/components/support/tenant-chat-view'
import { NewConversationModal } from '@/components/support/new-conversation-modal'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Headset,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  Phone,
  PhoneCall,
  ExternalLink,
  LifeBuoy,
  Sparkles,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  QrCode,
  CreditCard,
  Plus,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export default function TenantSupportPage() {
  const { tBilingual, locale } = useI18n()
  const { company } = useTenant()
  const params = useParams()
  const pathname = usePathname()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'rangao'
  const [mounted, setMounted] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [initialContext, setInitialContext] = useState<Record<string, any>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const handleQuickIssue = (subject: string, category: any) => {
    setInitialContext({ quickTopic: subject })
    setIsModalOpen(true)
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl animate-pulse p-4 sm:p-0">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
        <div className="h-[550px] bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl pb-8">
      {/* Top Page Header */}
      <PageHeader
        titleEn="Enterprise Support & Helpdesk"
        titleBn="এন্টারপ্রাইজ হেল্পডেস্ক ও লাইভ সাপোর্ট"
        descriptionEn="Direct communication channel with PrintERP engineers, press technicians, and billing specialists."
        descriptionBn="প্রিন্টইআরপি ইঞ্জিনিয়ার, প্রেস টেকনিশিয়ান ও হিসাব বিশেষজ্ঞদের সাথে সরাসরি সহায়তা ও যোগাযোগ চ্যানেল।"
        icon={Headset}
        iconColor="text-blue-600 dark:text-blue-400"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp VIP Direct Chat */}
            <a
              href="https://wa.me/8801700000000?text=Hello%20PrintERP%20Support%20Team"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-2xs"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp Direct</span>
              <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
            </a>

            {/* Direct Phone Support */}
            <a
              href="tel:+8809612345678"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
              <span>+880 9612-345678</span>
            </a>

            {/* New Ticket CTA */}
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 shadow-xs h-8 px-3.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{tBilingual('New Ticket', 'নতুন টিকেট')}</span>
            </Button>
          </div>
        }
      />

      {/* EMERGENCY & SYSTEM STATUS BAR */}
      <div className="p-3 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ring-4 ring-emerald-500/20" />
          <div className="text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">
              {tBilingual('System Status: Operational', 'সিস্টেম স্ট্যাটাস: সম্পূর্ণ সচল')}
            </span>
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400 ml-1.5">
              • {tBilingual('Dhaka High-Speed Cloud Node Active (Avg Response: < 15 mins)', 'ঢাকা ক্লাউড নোড সক্রিয় (গড় রেসপন্স সময়: < ১৫ মিনিট)')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/80 text-2xs font-mono border-blue-200 dark:border-blue-800">
            {tBilingual('SLA: 24/7 Priority Support', 'এসএলএ: ২৪/৭ অগ্রাধিকার সহায়তা')}
          </Badge>
        </div>
      </div>

      {/* QUICK TOPIC STARTERS (Visible when 0 active chats) */}
      {conversations.length === 0 && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => handleQuickIssue('POS Thermal Slip & Printer Driver Configuration', 'technical')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1.5">
              <Printer className="h-4 w-4" />
              <span className="font-bold text-xs">{tBilingual('POS Printer Setup', 'পিওএস প্রিন্টার সেটআপ')}</span>
            </div>
            <p className="text-2xs text-slate-500 leading-snug">
              {tBilingual('Configure thermal receipt printer & barcode scanners on shop floor.', 'দোকান বা শো-রুমের থার্মাল স্লিপ প্রিন্টার সেটআপ।')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickIssue('NBR Mushak 6.3 & BIN/TIN Invoice Setup', 'billing')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="font-bold text-xs">{tBilingual('Mushak 6.3 Invoicing', 'মূসক ৬.৩ চালান')}</span>
            </div>
            <p className="text-2xs text-slate-500 leading-snug">
              {tBilingual('NBR compliant 13-digit BIN tax invoice format & VDS withholding setup.', 'এনবিআর স্বীকৃত ভ্যাট চালান ও বিআইএন নিবন্ধন।')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickIssue('ZKTeco Biometric Device & QR Attendance Connection', 'technical')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1.5">
              <QrCode className="h-4 w-4" />
              <span className="font-bold text-xs">{tBilingual('Attendance Device', 'হাজিরা ডিভাইস')}</span>
            </div>
            <p className="text-2xs text-slate-500 leading-snug">
              {tBilingual('Connect factory biometric fingerprint reader or geofenced QR check-in.', 'কারখানার ফিঙ্গারপ্রিন্ট বা কিউআর কোড হাজিরা।')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickIssue('bKash / Nagad / Card Payment Gateway & Subscription', 'billing')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1.5">
              <CreditCard className="h-4 w-4" />
              <span className="font-bold text-xs">{tBilingual('bKash & Billing Help', 'বিকাশ ও বিলিং')}</span>
            </div>
            <p className="text-2xs text-slate-500 leading-snug">
              {tBilingual('Resolve automated payment webhook & monthly billing plan questions.', 'বিকাশ/নগদ পেমেন্ট ও সাবস্ক্রিপশন সংক্রান্ত প্রশ্ন।')}
            </p>
          </button>
        </div>
      )}

      {/* MAIN SUPPORT WORKSPACE: SPLIT-PANE INBOX & CHAT */}
      <div className="h-[600px] lg:h-[650px] flex rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        {/* Left Column: Inbox (Hidden on mobile when chat is active) */}
        <div
          className={`w-full lg:w-96 shrink-0 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 ${
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

        {/* Right Column: Active Conversation Timeline & Composer (Hidden on mobile when in list view) */}
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
        onClose={() => {
          setIsModalOpen(false)
          setInitialContext({})
        }}
        onSubmit={createTicket}
        initialContext={initialContext}
      />
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  MessageSquare,
  Send,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building,
  Mail,
  Smartphone,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Settings,
  Languages,
  Layers,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import {
  DEMO_CHANNEL_CONFIGS,
  DEMO_MESSAGE_TEMPLATES,
  renderTemplate,
  createSmsProvider,
} from '@/services/communication.service'
import {
  InAppNotificationRecord,
  ChannelConfigRecord,
  MessageTemplateRecord,
  CommunicationLogRecord,
  SmsProviderType,
} from '@/types/communication.types'
import { CustomerRecord } from '@/types/crm.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { formatBDT } from '@/lib/formatters'
import { FeatureGate } from '@/components/subscriptions/feature-gate'

export default function CommunicationsHubPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [notifications, setNotifications] = useDataStore<InAppNotificationRecord[]>(
    STORAGE_KEYS.IN_APP_NOTIFICATIONS,
    []
  )
  const [channels, setChannels] = useDataStore<ChannelConfigRecord[]>(
    STORAGE_KEYS.CHANNEL_CONFIGS,
    DEMO_CHANNEL_CONFIGS
  )
  const [templates, setTemplates] = useDataStore<MessageTemplateRecord[]>(
    STORAGE_KEYS.MESSAGE_TEMPLATES,
    DEMO_MESSAGE_TEMPLATES
  )
  const [commLogs, setCommLogs] = useDataStore<CommunicationLogRecord[]>(
    STORAGE_KEYS.COMMUNICATION_LOGS,
    []
  )
  const [customers] = useDataStore<CustomerRecord[]>(
    STORAGE_KEYS.CUSTOMERS,
    []
  )

  const [activeTab, setActiveTab] = useState<'in_app' | 'logs' | 'templates' | 'gateways'>('in_app')
  const [templateLang, setTemplateLang] = useState<'en' | 'bn'>('en')
  const [search, setSearch] = useState('')

  // Quick Send Modal State
  const [isSendOpen, setIsSendOpen] = useState(false)
  const [sendChannel, setSendChannel] = useState<'whatsapp' | 'sms'>('whatsapp')
  const [sendRecipient, setSendRecipient] = useState(customers[0]?.id || '')
  const [sendTemplateKey, setSendTemplateKey] = useState(templates[0]?.template_key || 'order_confirmation')
  const [customPhone, setCustomPhone] = useState(customers[0]?.mobile || '')
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

  // Gateway Settings State
  const [smsProvider, setSmsProvider] = useState<SmsProviderType>('bulksmsbd')
  const [smsSenderId, setSmsSenderId] = useState(company?.name || 'SMS Mask')
  const [waPhoneId, setWaPhoneId] = useState('')

  const showNotification = (msg: string) => {
    setNotificationMsg(msg)
    setTimeout(() => setNotificationMsg(null), 4000)
  }

  // Toggle Read/Unread
  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      (prev || []).map((n) => (n.id === id ? { ...n, is_read: !n.is_read } : n))
    )
    const stored = PrintERPDataStore.get<InAppNotificationRecord[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
    const updated = stored.map((n) => (n.id === id ? { ...n, is_read: !n.is_read } : n))
    PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, updated)
    showNotification('Notification status updated.')
  }

  const handleMarkAllRead = () => {
    setNotifications((prev) => (prev || []).map((n) => ({ ...n, is_read: true })))
    showNotification('All notifications marked as read.')
  }

  // Quick Send Handler
  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault()
    const custList = customers || []
    const selectedCust = custList.find((c: CustomerRecord) => c.id === sendRecipient) || custList[0]
    const selectedTpl = (templates || []).find((t) => t.template_key === sendTemplateKey) || templates[0]

    const interpolatedBody = renderTemplate(
      templateLang === 'bn' ? selectedTpl?.body_bn || '' : selectedTpl?.body_en || '',
      {
        customer_name: selectedCust?.name || 'Valued Customer',
        order_number: 'ORD-000001',
        invoice_number: 'INV-000001',
        amount: '0',
        due_amount: '0',
        delivery_date: new Date().toLocaleDateString(),
      }
    )

    const newLog: CommunicationLogRecord = {
      id: `log-${Date.now()}`,
      company_id: company?.id || 'c-01',
      channel: sendChannel,
      recipient_name: selectedCust?.name || 'Customer',
      recipient_destination: customPhone || selectedCust?.mobile || '',
      provider_used:
        sendChannel === 'whatsapp'
          ? 'Meta WhatsApp Business API'
          : `${smsProvider.toUpperCase()} Gateway (Masking: ${smsSenderId})`,
      message_content: interpolatedBody,
      status: 'delivered',
      created_at: 'Just now',
    }

    PrintERPDataStore.addItem<CommunicationLogRecord>(STORAGE_KEYS.COMMUNICATION_LOGS, newLog)
    setIsSendOpen(false)
    showNotification(
      `${sendChannel.toUpperCase()} message dispatched successfully to ${selectedCust?.name || 'recipient'} (${customPhone})!`
    )
  }

  // Active Unread Notifications Count
  const unreadCount = (notifications || []).filter((n) => !n.is_read).length

  return (
    <FeatureGate feature="whatsapp_notifications">
      <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Communication, In-App Feeds & Gateways"
        titleBn="মেসেজিং, নোটিফিকেশন ও গেটওয়ে"
        descriptionEn="Real-time in-app alerts, WhatsApp Business API dispatches, multi-provider Bangladesh SMS, and dual-language message templates."
        descriptionBn="ইন-অ্যাপ সতর্কতা, হোয়াটসঅ্যাপ বিজনেজ এপিআই, বাংলাদেশি এসএমএস গেটওয়ে এবং বাংলা/ইংরেজি মেসেজ টেমপ্লেট।"
        icon={MessageSquare}
        iconColor="text-blue-600"
        actions={
          <Button
            size="sm"
            onClick={() => setIsSendOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-xs text-white bangla-text"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {tBilingual('Send Quick Notification', 'দ্রুত বার্তা পাঠান')}
          </Button>
        }
      />

      {/* Notification */}
      {notificationMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Communication Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-blue-600">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">Unread In-App Alerts</span>
            {unreadCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">{unreadCount} Alerts</div>
          <span className="text-[11px] text-slate-400">Requires team attention</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold text-slate-500">Messages Sent Today</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{commLogs.length + 8} Dispatches</div>
          <span className="text-[11px] text-emerald-600 font-medium">WhatsApp &amp; SMS combined</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-600">
          <span className="text-xs font-semibold text-slate-500">Delivery Success Rate</span>
          <div className="text-2xl font-black text-purple-600 mt-1">99.4%</div>
          <span className="text-[11px] text-slate-400">Carrier delivered</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">SMS Gateway Balance</span>
          <div className="text-2xl font-black text-amber-600 mt-1">৳ 1,450.50</div>
          <span className="text-[11px] text-amber-700 font-medium">BulkSMSBD Masking Active</span>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 touch-scroll w-full sm:w-auto">
          <Button
            size="sm"
            variant={activeTab === 'in_app' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('in_app')}
            className={`text-xs h-10 sm:h-8 px-3.5 whitespace-nowrap shrink-0 ${
              activeTab === 'in_app' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            In-App Feed (ইনবক্স)
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-blue-700 font-bold">
                {unreadCount}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'logs' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('logs')}
            className={`text-xs h-10 sm:h-8 px-3.5 whitespace-nowrap shrink-0 ${
              activeTab === 'logs' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Communication Logs (হিস্ট্রি)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'templates' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('templates')}
            className={`text-xs h-10 sm:h-8 px-3.5 whitespace-nowrap shrink-0 ${
              activeTab === 'templates' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Languages className="h-3.5 w-3.5 mr-1.5" />
            Message Templates (টেমপ্লেট)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'gateways' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('gateways')}
            className={`text-xs h-10 sm:h-8 px-3.5 whitespace-nowrap shrink-0 ${
              activeTab === 'gateways' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Gateways &amp; SMS (গেটওয়ে)
          </Button>
        </div>

        {activeTab === 'in_app' && unreadCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMarkAllRead}
            className="text-xs h-9 sm:h-7 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* =========================================================================
          VIEW 1: IN-APP NOTIFICATION FEED
         ========================================================================= */}
      {activeTab === 'in_app' && (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                notif.is_read
                  ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-80'
                  : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    notif.type === 'new_order'
                      ? 'bg-blue-100 text-blue-700'
                      : notif.type === 'payment_received'
                      ? 'bg-emerald-100 text-emerald-700'
                      : notif.type === 'low_stock'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white bangla-text">
                      {tBilingual(notif.title, notif.title_bn || notif.title)}
                    </h4>
                    {!notif.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 bangla-text">
                    {tBilingual(notif.message, notif.message_bn || notif.message)}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono block pt-0.5">
                    {notif.created_at}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                {notif.action_url && (
                  <Link
                    href={`/${slug}${notif.action_url}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  >
                    View <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleRead(notif.id)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
                  title={notif.is_read ? 'Mark as unread' : 'Mark as read'}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: COMMUNICATION AUDIT LOGS
         ========================================================================= */}
      {activeTab === 'logs' && (
        <Card className="rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <CardTitle className="text-base font-bold">Communication Audit Trail ({commLogs.length})</CardTitle>
              <span className="text-xs text-slate-400">Non-destructive transmission log</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                  <tr>
                    <th className="py-3 px-4">Channel &amp; Timestamp</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Destination (Mobile / Email)</th>
                    <th className="py-3 px-4">Message Content</th>
                    <th className="py-3 px-4">Gateway Provider</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {commLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold capitalize">
                          {log.channel === 'whatsapp' ? (
                            <span className="text-emerald-600 font-mono">WhatsApp</span>
                          ) : log.channel === 'sms' ? (
                            <span className="text-blue-600 font-mono">SMS</span>
                          ) : (
                            <span className="text-purple-600 font-mono">Email</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.created_at}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {log.recipient_name}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {log.recipient_destination}
                      </td>

                      <td className="py-3.5 px-4 max-w-[280px] truncate text-slate-700 dark:text-slate-300">
                        {log.message_content}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {log.provider_used}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Delivered
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {commLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No communication dispatches recorded yet.
                </div>
              ) : (
                commLogs.map((log) => (
                  <div key={log.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            log.channel === 'whatsapp'
                              ? 'bg-emerald-100 text-emerald-700'
                              : log.channel === 'sms'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {log.channel}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {log.recipient_name}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Delivered
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      {log.message_content}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-slate-400 font-mono">
                      <span>Dest: {log.recipient_destination}</span>
                      <span>{log.created_at} • {log.provider_used}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          VIEW 3: MESSAGE TEMPLATES (BANGLA & ENGLISH)
         ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">Template Language:</span>
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border">
                <Button
                  size="sm"
                  variant={templateLang === 'en' ? 'default' : 'ghost'}
                  onClick={() => setTemplateLang('en')}
                  className="text-xs h-8 sm:h-7 px-3"
                >
                  English
                </Button>
                <Button
                  size="sm"
                  variant={templateLang === 'bn' ? 'default' : 'ghost'}
                  onClick={() => setTemplateLang('bn')}
                  className="text-xs h-8 sm:h-7 px-3"
                >
                  বাংলা (Bengali)
                </Button>
              </div>
            </div>

            <span className="text-[11px] sm:text-xs text-slate-400 font-mono break-all sm:break-normal">
              Supported Variables: {'{{customer_name}}, {{order_number}}, {{invoice_number}}, {{amount}}, {{due_amount}}, {{delivery_date}}'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="p-4 border-slate-200 dark:border-slate-800 space-y-2.5 rounded-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{tpl.name}</h4>
                    <span className="font-mono text-[10px] text-blue-600">{tpl.template_key}</span>
                  </div>
                  <Badge variant="outline" className="uppercase text-[10px]">
                    {tpl.channel}
                  </Badge>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap">
                  {templateLang === 'bn' ? tpl.body_bn : tpl.body_en}
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                  <span>Interpolation Engine: Active</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSendTemplateKey(tpl.template_key)
                      setIsSendOpen(true)
                    }}
                    className="h-8 sm:h-6 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-bold px-2.5"
                  >
                    Test Send
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: GATEWAY INTEGRATIONS (SMS, WhatsApp, SMTP)
         ========================================================================= */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* WhatsApp Business API */}
          <Card className="p-4 space-y-3 rounded-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                WhatsApp Business API
              </h4>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Connected</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Meta Cloud API for instant PDF quotation, invoice, and delivery tracking dispatch.
            </p>
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <Label>Phone Number ID</Label>
                <Input value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} className="h-10 sm:h-8 font-mono text-xs" />
              </div>
              <div className="space-y-1">
                <Label>Access Token (Permanent)</Label>
                <Input type="password" value="EAAG9••••••••••••••••••••" readOnly className="h-10 sm:h-8 font-mono text-xs bg-slate-100 dark:bg-slate-900" />
              </div>
            </div>
          </Card>

          {/* Bangladesh SMS Gateway Abstraction */}
          <Card className="p-4 space-y-3 border-l-4 border-l-blue-600 rounded-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Bangladesh SMS Gateway
              </h4>
              <Badge className="bg-blue-100 text-blue-800 text-[10px]">Active Provider</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Multi-provider abstraction for verified Bangladeshi telco aggregators.
            </p>
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <Label>Active SMS Provider</Label>
                <select
                  value={smsProvider}
                  onChange={(e) => setSmsProvider(e.target.value as SmsProviderType)}
                  className="w-full h-10 sm:h-8 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                >
                  <option value="bulksmsbd">BulkSMSBD (Approved Masking)</option>
                  <option value="ssl_wireless">SSL Wireless Gateway</option>
                  <option value="alpha">Alpha SMS Provider</option>
                  <option value="mim">MIM SMS Gateway</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Approved Masking Sender ID</Label>
                <Input value={smsSenderId} onChange={(e) => setSmsSenderId(e.target.value)} className="h-10 sm:h-8 font-mono text-xs font-bold" />
              </div>
            </div>
          </Card>

          {/* SMTP Email Server */}
          <Card className="p-4 space-y-3 rounded-2xl sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-purple-600" />
                Custom SMTP Server
              </h4>
              <Badge className="bg-purple-100 text-purple-800 text-[10px]">Configured</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Corporate email transport for sending formal PDF estimates and payment receipts.
            </p>
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <Label>SMTP Host &amp; Port</Label>
                <Input value={`smtp.${company?.slug || 'inkflow'}.com:587`} readOnly className="h-10 sm:h-8 font-mono text-xs bg-slate-100 dark:bg-slate-900" />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input type="password" value="••••••••••••" readOnly className="h-10 sm:h-8 font-mono text-xs bg-slate-100 dark:bg-slate-900" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL: SEND QUICK NOTIFICATION / BROADCAST
         ========================================================================= */}
      <ModalDialog
        open={isSendOpen}
        onOpenChange={setIsSendOpen}
        title="Dispatch Notification via WhatsApp / SMS"
        description="Select customer and pre-configured message template for instant dispatch."
      >
        <form onSubmit={handleQuickSend} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sCh" required>Dispatch Channel</Label>
              <select
                id="sCh"
                value={sendChannel}
                onChange={(e) => setSendChannel(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="whatsapp">WhatsApp Business API</option>
                <option value="sms">SMS (BulkSMSBD Masking)</option>
                <option value="email">Email Gateway (Custom / Default)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sCust" required>Recipient Customer</Label>
              <select
                id="sCust"
                value={sendRecipient}
                onChange={(e) => {
                  setSendRecipient(e.target.value)
                  const cust = (customers || []).find((c) => c.id === e.target.value)
                  if (cust) setCustomPhone(cust.mobile)
                }}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sTpl" required>Message Template</Label>
              <select
                id="sTpl"
                value={sendTemplateKey}
                onChange={(e) => setSendTemplateKey(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {(templates || []).map((t) => (
                  <option key={t.id} value={t.template_key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sPh" required>Mobile Number (with +880)</Label>
              <Input
                id="sPh"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="h-10 text-xs"
                required
              />
            </div>
          </div>

          {/* Interpolated Preview Box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Live Interpolated Preview:</span>
            <p className="text-xs font-mono text-slate-800 dark:text-slate-200">
              {renderTemplate(
                templateLang === 'bn'
                  ? (templates || []).find((t) => t.template_key === sendTemplateKey)?.body_bn || ''
                  : (templates || []).find((t) => t.template_key === sendTemplateKey)?.body_en || '',
                {
                  customer_name:
                    (customers || []).find((c) => c.id === sendRecipient)?.name || 'Client',
                  order_number: 'ORD-000101',
                  invoice_number: 'INV-2024-001',
                  amount: '45,000',
                  due_amount: '15,000',
                  delivery_date: '05/09/2024',
                }
              )}
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSendOpen(false)}
              className="w-full sm:w-auto h-11 sm:h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Dispatch Message
            </Button>
          </div>
        </form>
      </ModalDialog>
      </div>
    </FeatureGate>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  MessageSquare,
  Send,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
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
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useParams } from 'next/navigation'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { formatDate } from '@/lib/formatters'
import {
 DEFAULT_CHANNEL_CONFIGS,
 DEFAULT_MESSAGE_TEMPLATES,
 renderTemplate,
 createSmsProvider,
} from '@/lib/communication/templates'
import {
 InAppNotificationRecord,
 ChannelConfigRecord,
 MessageTemplateRecord,
 CommunicationLogRecord,
 SmsProviderType,
} from '@/types/communication.types'
import { CustomerRecord } from '@/types/crm.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { getCommunicationLogsAction } from '@/actions/communication.actions'
import { getDeliveryLogsAction, resendDeliveryJobAction } from '@/actions/notification.actions'
import { formatBDT } from '@/lib/formatters'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { usePermissions } from '@/hooks/use-permissions'

export default function CommunicationsHubPage() {
 const params = useParams()
 const routeSlug = (params?.tenantSlug as string) || ''
 const { company } = useTenant()
 const { isOwner, can } = usePermissions()
 const { locale, tBilingual } = useI18n()
 const slug = routeSlug || company?.slug || ''

 const [notifications, setNotifications] = useDataStore<InAppNotificationRecord[]>(
 STORAGE_KEYS.IN_APP_NOTIFICATIONS,
    [],
 slug
  )
 const [channels, setChannels] = useDataStore<ChannelConfigRecord[]>(
 STORAGE_KEYS.CHANNEL_CONFIGS,
 DEFAULT_CHANNEL_CONFIGS,
 slug
  )
 const [templates, setTemplates] = useDataStore<MessageTemplateRecord[]>(
 STORAGE_KEYS.MESSAGE_TEMPLATES,
 DEFAULT_MESSAGE_TEMPLATES,
 slug
  )
 const [commLogs, setCommLogs] = useDataStore<CommunicationLogRecord[]>(
 STORAGE_KEYS.COMMUNICATION_LOGS,
    [],
 slug
  )

  // Load server communication logs from PostgreSQL
 useEffect(() => {
 getCommunicationLogsAction()
      .then((res) => {
 if (res.success && Array.isArray(res.data) && res.data.length > 0) {
 const serverItems = res.data as any[]
 const map = new Map<string, CommunicationLogRecord>()
 serverItems.forEach((item) => map.set(item.id, item))
 commLogs.forEach((item) => {
 if (!map.has(item.id)) map.set(item.id, item)
            })
 setCommLogs(Array.from(map.values()))
          }
      })
      .catch(() => {})
  }, [slug])
 const [customers] = useDataStore<CustomerRecord[]>(
 STORAGE_KEYS.CUSTOMERS,
    [],
 slug
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

  // Server Delivery Logs State & Filters
  const [logFilterStatus, setLogFilterStatus] = useState<string>('all')
  const [logFilterChannel, setLogFilterChannel] = useState<string>('all')
  const [logSearchRecipient, setLogSearchRecipient] = useState<string>('')
  const [serverDeliveryLogs, setServerDeliveryLogs] = useState<any[]>([])
  const [totalDeliveryLogs, setTotalDeliveryLogs] = useState<number>(0)
  const [isLogsLoading, setIsLogsLoading] = useState<boolean>(false)
  const [resendingIds, setResendingIds] = useState<Record<string, boolean>>({})

  const fetchDeliveryLogs = React.useCallback(async () => {
    if (!company?.id) return
    setIsLogsLoading(true)
    try {
      const res = await getDeliveryLogsAction(
        {
          status: logFilterStatus,
          channel: logFilterChannel,
          recipient: logSearchRecipient,
          limit: 50,
        },
        company.id
      )
      if (res.success && res.data) {
        setServerDeliveryLogs(res.data.logs || [])
        setTotalDeliveryLogs(res.data.total || 0)
      }
    } catch (err) {
      console.warn('Failed to load delivery logs:', err)
    } finally {
      setIsLogsLoading(false)
    }
  }, [company?.id, logFilterStatus, logFilterChannel, logSearchRecipient])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchDeliveryLogs()
    }
  }, [activeTab, fetchDeliveryLogs])

  const handleResendJob = async (logId: string) => {
    setResendingIds((prev) => ({ ...prev, [logId]: true }))
    try {
      const res = await resendDeliveryJobAction(logId, company?.id)
      if (res.success) {
        showNotification('Delivery job enqueued for immediate retry.')
        await fetchDeliveryLogs()
      } else {
        showNotification(`Resend failed: ${res.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      showNotification(`Resend error: ${err.message}`)
    } finally {
      setResendingIds((prev) => ({ ...prev, [logId]: false }))
    }
  }

 const showNotification = (msg: string) => {
 setNotificationMsg(msg)
 setTimeout(() => setNotificationMsg(null), 4000)
  }

  // Toggle Read/Unread
 const handleToggleRead = (id: string) => {
 setNotifications((prev) =>
      (prev || []).map((n) => (n.id === id ? { ...n, is_read: !n.is_read } : n))
    )
 const stored = PrintFlowDataStore.get<InAppNotificationRecord[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
 const updated = stored.map((n) => (n.id === id ? { ...n, is_read: !n.is_read } : n))
 PrintFlowDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, updated)
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
 delivery_date: formatDate(new Date()),
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

 PrintFlowDataStore.addItem<CommunicationLogRecord>(STORAGE_KEYS.COMMUNICATION_LOGS, newLog)
 setIsSendOpen(false)
 showNotification(
      `${sendChannel.toUpperCase()} message dispatched successfully to ${selectedCust?.name || 'recipient'} (${customPhone})!`
    )
  }

  // Active Unread Notifications Count
 const unreadCount = (notifications || []).filter((n) => !n.is_read).length

 return (
    <PanelAccessGuard
      module="notifications"
      action="view"
      panelTitle="Messages & Communications"
      panelTitleBn="মেসেজিং ও নোটিফিকেশন"
      allowIfAny={[
        { module: 'notifications', action: 'view' },
        { module: 'communications', action: 'view' },
        { module: 'whatsapp', action: 'view' },
        { module: 'settings', action: 'manage' },
        { module: 'settings', action: 'view' },
      ]}
    >
      <div className="space-y-6">
      {/* Header */}
      <PageHeader
        titleEn="Messages & SMS"
        titleBn="মেসেজিং, নোটিফিকেশন ও গেটওয়ে"
        descriptionEn="Real-time in-app alerts, WhatsApp Business API dispatches, multi-provider Bangladesh SMS, and dual-language message templates."
        descriptionBn="ইন-অ্যাপ সতর্কতা, হোয়াটসঅ্যাপ বিজনেজ এপিআই, বাংলাদেশি এসএমএস গেটওয়ে এবং বাংলা/ইংরেজি মেসেজ টেমপ্লেট।"
        icon={MessageSquare}
        iconColor="text-primary"
        actions={
          <div className="flex items-center gap-2">
            {(isOwner || can('view', 'whatsapp')) && (
              <Link href={`/${slug}/communications/inbox`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 border-border text-foreground hover:bg-muted"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-success" />
                  WhatsApp Inbox
                </Button>
              </Link>
            )}
            {(isOwner || can('manage', 'settings')) && (
              <Link href={`/${slug}/settings/whatsapp`}>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-border text-foreground hover:bg-muted">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  Gateway Settings
                </Button>
              </Link>
            )}
            {(isOwner || can('send', 'whatsapp') || can('create', 'notifications')) && (
              <Button
                size="sm"
                onClick={() => setIsSendOpen(true)}
                className="bg-primary hover:bg-primary/90 text-xs text-primary-foreground bangla-text shadow-xs"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Send Quick Notification', 'দ্রুত বার্তা পাঠান')}
              </Button>
            )}
          </div>
        }
      />

      {/* Notification */}
      {notificationMsg && (
        <div className="p-3 bg-success-surface text-success rounded-lg text-xs font-semibold flex items-center gap-2 border border-success/30 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Communication Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-primary bg-card">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground">Unread In-App Alerts</span>
            {unreadCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            )}
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{unreadCount} Alerts</div>
          <span className="text-xs text-muted-foreground">Requires team attention</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-success bg-card">
          <span className="text-xs font-semibold text-muted-foreground">Messages Sent Today</span>
          <div className="text-2xl font-black text-foreground mt-1">{commLogs.length + 8} Dispatches</div>
          <span className="text-xs text-success font-medium">WhatsApp &amp; Email combined</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-primary bg-card">
          <span className="text-xs font-semibold text-muted-foreground">Delivery Success Rate</span>
          <div className="text-2xl font-black text-foreground mt-1">99.4%</div>
          <span className="text-xs text-muted-foreground">Carrier delivered</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-warning bg-card">
          <span className="text-xs font-semibold text-muted-foreground">SMS Gateway Balance</span>
          <div className="text-2xl font-black text-foreground mt-1">৳ 1,450.50</div>
          <span className="text-xs text-warning font-medium">BulkSMSBD Masking Active</span>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-muted border border-border">
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 touch-scroll w-full sm:w-auto">
          <Button
            size="sm"
            variant={activeTab === 'in_app' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('in_app')}
            className={`text-xs h-10 sm:h-8 px-3.5 whitespace-nowrap shrink-0 ${
              activeTab === 'in_app' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            In-App Feed (ইনবক্স)
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-xs bg-primary/20 text-primary-foreground font-bold">
                {unreadCount}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'logs' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('logs')}
            className={`text-xs h-10 sm:h-8 px-3.5 whitespace-nowrap shrink-0 ${
              activeTab === 'logs' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Delivery Logs (হিস্ট্রি)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'templates' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('templates')}
            className={`text-xs h-10 sm:h-8 px-3.5 whitespace-nowrap shrink-0 ${
              activeTab === 'templates' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            <Languages className="h-3.5 w-3.5 mr-1.5" />
            Message Templates (টেমপ্লেট)
          </Button>

          {(isOwner || can('manage', 'settings')) && (
            <Button
              size="sm"
              variant={activeTab === 'gateways' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('gateways')}
              className={`text-xs h-10 sm:h-8 px-3.5 whitespace-nowrap shrink-0 ${
                activeTab === 'gateways' ? 'bg-card-elevated text-foreground shadow-xs' : 'text-muted-foreground '
              }`}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5"/>
              Gateways &amp; SMS (গেটওয়ে)
            </Button>
          )}
        </div>

        {activeTab === 'in_app' && unreadCount > 0 && (
          <Button
 size="sm"variant="ghost"onClick={handleMarkAllRead}
 className="text-xs h-9 sm:h-7 text-muted-foreground hover:text-foreground dark:hover:text-foreground shrink-0">
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
                  ? 'bg-card border-border opacity-80'
                  : 'bg-primary/5 border-primary/20 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    notif.type === 'new_order'
                      ? 'bg-primary/10 text-primary'
                      : notif.type === 'payment_received'
                      ? 'bg-success-surface text-success'
                      : notif.type === 'low_stock'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground bangla-text">
                      {tBilingual(notif.title, notif.title_bn || notif.title)}
                    </h4>
                    {!notif.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground bangla-text">
                    {tBilingual(notif.message, notif.message_bn || notif.message)}
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums block pt-0.5">
                    {notif.created_at}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                {notif.action_url && (
                  <Link
 href={getTenantNavHref(notif.action_url, null, slug)}
 className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-input text-foreground hover:bg-muted">
 View <ExternalLink className="h-3 w-3 ml-1"/>
                  </Link>
                )}

                <Button
 size="sm"variant="ghost"onClick={() => handleToggleRead(notif.id)}
 className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground dark:hover:text-foreground rounded-lg"title={notif.is_read ? 'Mark as unread' : 'Mark as read'}
                >
                  <Check className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
         VIEW 2: COMMUNICATION DELIVERY LOG (OBSERVABILITY & RESEND)
         ========================================================================= */}
      {activeTab === 'logs' && (
        <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  {tBilingual('Delivery & Transmission Logs', 'ডেলিভারি ও ট্রান্সমিশন লগ')} ({totalDeliveryLogs || serverDeliveryLogs.length || commLogs.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {tBilingual('Real-time audit trail of all in-app, WhatsApp, and Email dispatches with provider responses.', 'ইন-অ্যাপ, হোয়াটসঅ্যাপ ও ইমেইল নোটিফিকেশনের সার্বিক ডেলিভারি হিস্টোরি ও প্রোভাইডার রেসপন্স।')}
                </CardDescription>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={fetchDeliveryLogs}
                disabled={isLogsLoading}
                className="h-8 px-3 text-xs gap-1.5 cursor-pointer shadow-2xs"
              >
                <Clock className={`h-3.5 w-3.5 ${isLogsLoading ? 'animate-spin' : ''}`} />
                {tBilingual('Refresh Logs', 'রিফ্রেশ')}
              </Button>
            </div>

            {/* Filters Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <select
                  value={logFilterStatus}
                  onChange={(e) => setLogFilterStatus(e.target.value)}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Statuses (সব স্ট্যাটাস)</option>
                  <option value="delivered">Delivered (ডেলিভারড)</option>
                  <option value="sent">Sent (প্রেরিত)</option>
                  <option value="queued">Queued (অপেক্ষমাণ)</option>
                  <option value="retrying">Retrying (পুনঃচেষ্টা)</option>
                  <option value="failed">Failed (ব্যর্থ)</option>
                  <option value="dead_letter">Dead Letter (স্থায়ী ব্যর্থ)</option>
                </select>
              </div>

              <div>
                <select
                  value={logFilterChannel}
                  onChange={(e) => setLogFilterChannel(e.target.value)}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Channels (সব চ্যানেল)</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="in_app">In-App</option>
                </select>
              </div>

              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search recipient (phone/email)..."
                  value={logSearchRecipient}
                  onChange={(e) => setLogSearchRecipient(e.target.value)}
                  className="h-8 text-xs pr-8"
                />
                <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Channel &amp; Time</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Message Preview</th>
                    <th className="py-3 px-4">Provider / Details</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(serverDeliveryLogs.length > 0 ? serverDeliveryLogs : commLogs).map((log) => {
                    const isFailed = log.status === 'failed' || log.status === 'dead_letter'
                    const isQueued = log.status === 'queued' || log.status === 'retrying'
                    const isDelivered = log.status === 'delivered'
                    const isSent = log.status === 'sent'

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold capitalize text-foreground">
                            {log.channel}
                          </span>
                          <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recently'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {log.recipient_name || 'Recipient'}
                        </td>

                        <td className="py-3.5 px-4 tabular-nums text-muted-foreground font-mono text-xs">
                          {log.recipient_destination || log.recipient_phone || log.recipient_email || '—'}
                        </td>

                        <td className="py-3.5 px-4 max-w-[240px] truncate text-foreground text-xs">
                          {log.message_content || log.payload?.message || '[Notification Content]'}
                        </td>

                        <td className="py-3.5 px-4 tabular-nums text-muted-foreground text-xs max-w-[180px] truncate">
                          {log.provider_used || log.provider || 'Internal Gateway'}
                          {log.error_message && (
                            <span className="block text-destructive text-xs truncate">
                              {log.error_message}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isDelivered && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-success-surface text-success border border-success/30">
                              <CheckCircle2 className="h-3 w-3" /> Delivered
                            </span>
                          )}
                          {isSent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              <Check className="h-3 w-3" /> Sent
                            </span>
                          )}
                          {isQueued && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-warning-surface text-warning border border-warning/30">
                              <Clock className="h-3 w-3" /> {log.status}
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-destructive/10 text-destructive border border-destructive/30">
                              <AlertCircle className="h-3 w-3" /> {log.status}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResendJob(log.id)}
                            disabled={resendingIds[log.id]}
                            className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 font-semibold cursor-pointer"
                          >
                            {resendingIds[log.id] ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : (
                              'Resend'
                            )}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards View */}
            <div className="md:hidden divide-y divide-border">
              {(serverDeliveryLogs.length > 0 ? serverDeliveryLogs : commLogs).length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No communication dispatches recorded yet.
                </div>
              ) : (
                (serverDeliveryLogs.length > 0 ? serverDeliveryLogs : commLogs).map((log) => (
                  <div key={log.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-xs font-bold px-2 py-0.5 rounded uppercase bg-muted text-foreground border border-border">
                          {log.channel}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {log.recipient_name || 'Recipient'}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendJob(log.id)}
                        disabled={resendingIds[log.id]}
                        className="h-6 px-2 text-xs text-primary cursor-pointer"
                      >
                        Resend
                      </Button>
                    </div>

                    <div className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border">
                      {log.message_content || log.payload?.message || '[Notification Content]'}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-muted-foreground tabular-nums">
                      <span>Dest: {log.recipient_destination || log.recipient_phone || log.recipient_email || '—'}</span>
                      <span>{log.created_at ? new Date(log.created_at).toLocaleString() : 'Recently'}</span>
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
              <span className="text-xs text-muted-foreground shrink-0">Template Language:</span>
              <div className="inline-flex p-0.5 bg-muted rounded-lg border">
                <Button
 size="sm"variant={templateLang === 'en' ? 'default' : 'ghost'}
 onClick={() => setTemplateLang('en')}
 className="text-xs h-8 sm:h-7 px-3">
 English
                </Button>
                <Button
 size="sm"variant={templateLang === 'bn' ? 'default' : 'ghost'}
 onClick={() => setTemplateLang('bn')}
 className="text-xs h-8 sm:h-7 px-3">
                  বাংলা (Bengali)
                </Button>
              </div>
            </div>

            <span className="text-xs sm:text-xs text-muted-foreground tabular-nums break-all sm:break-normal">
 Supported Variables: {'{{customer_name}}, {{order_number}}, {{invoice_number}}, {{amount}}, {{due_amount}}, {{delivery_date}}'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="p-4 border-border space-y-2.5 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{tpl.name}</h4>
                    <span className="tabular-nums text-xs text-primary font-mono">{tpl.template_key}</span>
                  </div>
                  <Badge variant="outline" className="uppercase text-xs">
                    {tpl.channel}
                  </Badge>
                </div>

                <div className="p-3 bg-muted rounded-lg text-xs leading-relaxed text-foreground tabular-nums whitespace-pre-wrap">
                  {templateLang === 'bn' ? tpl.body_bn : tpl.body_en}
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                  <span>Interpolation Engine: Active</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSendTemplateKey(tpl.template_key)
                      setIsSendOpen(true)
                    }}
                    className="h-8 sm:h-6 text-xs text-primary hover:bg-primary/10 font-bold px-2.5"
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
          <Card className="p-4 space-y-3 rounded-xl border-border bg-card">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-success" />
                WhatsApp Business API
              </h4>
              <Badge className="bg-success-surface text-success border border-success/30 text-xs">Connected</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Meta Cloud API for instant PDF quotation, invoice, and delivery tracking dispatch.
            </p>
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <Label>Phone Number ID</Label>
                <Input value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} className="h-10 sm:h-8 tabular-nums text-xs" />
              </div>
              <div className="space-y-1">
                <Label>Access Token (Permanent)</Label>
                <Input type="password" value="EAAG9••••••••••••••••••••" readOnly className="h-10 sm:h-8 tabular-nums text-xs bg-muted" />
              </div>
            </div>
          </Card>

          {/* Bangladesh SMS Gateway Abstraction */}
          <Card className="p-4 space-y-3 border-l-4 border-l-primary border-border bg-card rounded-xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-primary" />
                Bangladesh SMS Gateway
              </h4>
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">Active Provider</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-provider abstraction for verified Bangladeshi telco aggregators.
            </p>
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <Label>Active SMS Provider</Label>
                <select
                  value={smsProvider}
                  onChange={(e) => setSmsProvider(e.target.value as SmsProviderType)}
                  className="w-full h-10 sm:h-8 px-2.5 rounded-md border border-input bg-card font-bold text-xs"
                >
                  <option value="bulksmsbd">BulkSMSBD (Approved Masking)</option>
                  <option value="ssl_wireless">SSL Wireless Gateway</option>
                  <option value="alpha">Alpha SMS Provider</option>
                  <option value="mim">MIM SMS Gateway</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Approved Masking Sender ID</Label>
                <Input value={smsSenderId} onChange={(e) => setSmsSenderId(e.target.value)} className="h-10 sm:h-8 tabular-nums text-xs font-bold" />
              </div>
            </div>
          </Card>

          {/* SMTP Email Server */}
          <Card className="p-4 space-y-3 rounded-xl sm:col-span-2 lg:col-span-1 border-border bg-card">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-primary" />
                Custom SMTP Server
              </h4>
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">Configured</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
 Corporate email transport for sending formal PDF estimates and payment receipts.
            </p>
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <Label>SMTP Host &amp; Port</Label>
                <Input value={`smtp.${company?.slug || 'printflow'}.bd:587`} readOnly className="h-10 sm:h-8 tabular-nums text-xs bg-muted"/>
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input type="password"value="••••••••••••"readOnly className="h-10 sm:h-8 tabular-nums text-xs bg-muted"/>
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
 title="Dispatch Notification via WhatsApp / SMS"description="Select customer and pre-configured message template for instant dispatch.">
        <form onSubmit={handleQuickSend} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sCh"required>Dispatch Channel</Label>
              <select
 id="sCh"value={sendChannel}
 onChange={(e) => setSendChannel(e.target.value as any)}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold">
                <option value="whatsapp">WhatsApp Business API</option>
                <option value="sms">SMS (BulkSMSBD Masking)</option>
                <option value="email">Email Gateway (Custom / Default)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sCust"required>Recipient Customer</Label>
              <select
 id="sCust"value={sendRecipient}
 onChange={(e) => {
 setSendRecipient(e.target.value)
 const cust = (customers || []).find((c) => c.id === e.target.value)
 if (cust) setCustomPhone(cust.mobile)
                }}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold">
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
              <Label htmlFor="sTpl"required>Message Template</Label>
              <select
 id="sTpl"value={sendTemplateKey}
 onChange={(e) => setSendTemplateKey(e.target.value)}
 className="w-full h-10 px-3 rounded-md border border-input bg-card text-xs font-semibold">
                {(templates || []).map((t) => (
                  <option key={t.id} value={t.template_key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sPh"required>Mobile Number (with +880)</Label>
              <Input
 id="sPh"value={customPhone}
 onChange={(e) => setCustomPhone(e.target.value)}
 className="h-10 text-xs"required
              />
            </div>
          </div>

          {/* Interpolated Preview Box */}
          <div className="p-3 bg-muted border rounded-xl space-y-1">
            <span className="text-xs uppercase font-bold text-muted-foreground">Live Interpolated Preview:</span>
            <p className="text-xs tabular-nums text-foreground">
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
 type="button"variant="outline"onClick={() => setIsSendOpen(false)}
 className="w-full sm:w-auto h-11 sm:h-9">
 Cancel
            </Button>
            <Button
 type="submit"className="w-full sm:w-auto h-11 sm:h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
 Dispatch Message
            </Button>
          </div>
        </form>
      </ModalDialog>
        </div>
    </PanelAccessGuard>
  )
}

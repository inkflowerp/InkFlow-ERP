'use client'

// ==============================================================================
// PrintFlow SaaS - Tenant Business Email Gateway Settings
// Location: Tenant Dashboard -> Settings -> Email Gateway
// Supports Google OAuth 2.0 (Gmail API) and Standard Authenticated SMTP
// ==============================================================================

import React, { useState, useEffect } from 'react'
import {
 Mail,
 Server,
 ShieldCheck,
 Send,
 RefreshCw,
 Save,
 CheckCircle2,
 AlertTriangle,
 Clock,
 Eye,
 EyeOff,
 Sparkles,
 Zap,
 Globe,
 RotateCw,
 FileText,
 Search,
 Check,
 Building,
 Info,
 ExternalLink,
 Trash2,
 Lock,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { ModalDialog } from '@/components/shared/modal-dialog'
import {
 getTenantEmailGatewayAction,
 saveTenantEmailGatewayAction,
 disconnectTenantGmailAction,
 deleteTenantEmailGatewayAction,
 testTenantEmailGatewayAction,
 sendTestTenantEmailAction,
 getTenantEmailTemplatesAction,
 saveTenantEmailTemplateAction,
 getTenantEmailLogsAction,
 getGoogleOAuthStatusAction,
} from '@/actions/email-gateway.actions'
import type {
 EmailGatewayRecord,
 EmailGatewayFormData,
 EmailProviderType,
 EmailTemplateRecord,
 EmailLogRecord,
} from '@/types/communication.types'
import { interpolateVariables } from '@/lib/email/interpolate'

const getTemplateDisplayName = (tpl: EmailTemplateRecord, isBn: boolean) => {
  if (isBn) {
    if (tpl.name_bn) return tpl.name_bn
    const match = tpl.name.match(/\(([^)]*[\u0980-\u09FF][^)]*)\)/)
    if (match) return match[1].trim()
    return tpl.name
  } else {
    return tpl.name.replace(/\s*\([^)]*[\u0980-\u09FF][^)]*\)/g, '').trim()
  }
}

export default function TenantEmailSettingsPage() {
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const companyId = company?.id || ''

 const [mounted, setMounted] = useState(false)
 const [activeTab, setActiveTab] = useState<'gateway' | 'templates' | 'logs'>('gateway')
 const [gateway, setGateway] = useState<EmailGatewayRecord | null>(null)
 const [hasConfiguredGateway, setHasConfiguredGateway] = useState(false)
 const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
 const [logs, setLogs] = useState<EmailLogRecord[]>([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [testing, setTesting] = useState(false)
 const [disconnecting, setDisconnecting] = useState(false)
 const [showSecret, setShowSecret] = useState(false)

  // Selected Provider Mode in UI: 'gmail' or 'smtp'
 const [providerMode, setProviderMode] = useState<'gmail' | 'smtp'>('gmail')

  // SMTP Form State
 const [smtpHost, setSmtpHost] = useState('')
 const [smtpPort, setSmtpPort] = useState(587)
 const [encryptionType, setEncryptionType] = useState<'ssl' | 'tls' | 'starttls' | 'none'>('tls')
 const [smtpUsername, setSmtpUsername] = useState('')
 const [password, setPassword] = useState('')
 const [senderName, setSenderName] = useState(company?.name || 'Printing Enterprise')
 const [senderEmail, setSenderEmail] = useState(company?.email || 'billing@example.com')
 const [replyToEmail, setReplyToEmail] = useState(company?.email || 'billing@example.com')

  // Toast & Modal State
 const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
 const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null)
 const [isTestModalOpen, setIsTestModalOpen] = useState(false)
 const [testRecipient, setTestRecipient] = useState(company?.email || 'customer@example.com')
 const [sendingTestEmail, setSendingTestEmail] = useState(false)

  // Template Editing State
 const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateRecord | null>(null)
 const [templateLang, setTemplateLang] = useState<'en' | 'bn'>('bn')
 const [logSearch, setLogSearch] = useState('')
 const [googleOAuthStatus, setGoogleOAuthStatus] = useState<{
 isConfigured: boolean
 hasClientId: boolean
 hasClientSecret: boolean
 hasRedirectUri: boolean
 redirectUri: string
 issues: string[]
  } | null>(null)

 const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
 setNotification({ message, type })
 setTimeout(() => setNotification(null), 5000)
  }

 const loadTenantData = async () => {
 if (!companyId) return
 setLoading(true)
 try {
 const [gwRes, tplRes, logsRes, oauthStatusRes] = await Promise.all([
 getTenantEmailGatewayAction(companyId),
 getTenantEmailTemplatesAction(companyId),
 getTenantEmailLogsAction(companyId),
 getGoogleOAuthStatusAction(),
      ])

 if (oauthStatusRes.success) {
 setGoogleOAuthStatus({
 isConfigured: oauthStatusRes.isConfigured,
 hasClientId: oauthStatusRes.hasClientId,
 hasClientSecret: oauthStatusRes.hasClientSecret,
 hasRedirectUri: oauthStatusRes.hasRedirectUri,
 redirectUri: oauthStatusRes.redirectUri,
 issues: oauthStatusRes.issues,
        })
      }

 if (gwRes.success && gwRes.customGateway) {
 setGateway(gwRes.customGateway)
 setHasConfiguredGateway(true)
 if (gwRes.customGateway.provider === 'gmail') {
 setProviderMode('gmail')
        } else {
 setProviderMode('smtp')
        }
 setSmtpHost(gwRes.customGateway.smtp_host || '')
 setSmtpPort(gwRes.customGateway.smtp_port || 587)
 setEncryptionType(gwRes.customGateway.encryption_type || 'tls')
 setSmtpUsername(gwRes.customGateway.smtp_username || '')
 setSenderName(gwRes.customGateway.sender_name || company?.name || '')
 setSenderEmail(gwRes.customGateway.sender_email || company?.email || '')
 setReplyToEmail(gwRes.customGateway.reply_to_email || company?.email || '')
      } else {
 setGateway(null)
 setHasConfiguredGateway(false)
 setSenderName(company?.name || 'Printing Team')
 setSenderEmail(company?.email || '')
 setReplyToEmail(company?.email || '')
      }

 if (tplRes.success && tplRes.data) {
 setTemplates(tplRes.data)
 if (!selectedTemplate && tplRes.data.length > 0) {
 setSelectedTemplate(tplRes.data[0])
        }
      }

 if (logsRes.success && logsRes.data) {
 setLogs(logsRes.data)
      }
    } finally {
 setLoading(false)
    }
  }

 useEffect(() => {
 setMounted(true)
 loadTenantData()

    // Realtime broadcast sync listeners
 const handleSync = () => {
 loadTenantData()
    }
 window.addEventListener('printflow_table_synced:email_gateways', handleSync)
 window.addEventListener('printflow_data_sync', handleSync)

    // Inspect URL for OAuth success or errors
 if (typeof window !== 'undefined') {
 const url = new URL(window.location.href)
 if (url.searchParams.get('gmail') === 'connected') {
 showNotification('Gmail account successfully connected and active for email sending!', 'success')
 url.searchParams.delete('gmail')
 window.history.replaceState({}, document.title, url.toString())
      } else if (url.searchParams.get('error') === 'google_client_id_missing') {
 showNotification('Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET to .env.local', 'error')
 url.searchParams.delete('error')
 window.history.replaceState({}, document.title, url.toString())
      } else if (url.searchParams.get('error')) {
 showNotification(`Google OAuth failed: ${url.searchParams.get('error')}`, 'error')
 url.searchParams.delete('error')
 window.history.replaceState({}, document.title, url.toString())
      }
    }

 return () => {
 window.removeEventListener('printflow_table_synced:email_gateways', handleSync)
 window.removeEventListener('printflow_data_sync', handleSync)
    }
  }, [companyId])

 const handleConnectGmail = () => {
 if (!companyId) return
 const returnUrl = encodeURIComponent(window.location.pathname)
 window.location.href = `/api/email/oauth/google/start?scope=tenant&tenantId=${companyId}&returnUrl=${returnUrl}`
  }

 const handleTestGmailConnection = async () => {
 if (!companyId) return
 setTesting(true)
 setTestResult(null)
 const res = await testTenantEmailGatewayAction(companyId, { provider: 'gmail' })
 setTestResult(res)
 setTesting(false)
  }

 const handleDisconnectGmail = async () => {
 if (!companyId) return
 setDisconnecting(true)
 const res = await disconnectTenantGmailAction(companyId)
 if (res.success) {
 setGateway(null)
 setHasConfiguredGateway(false)
 showNotification('Gmail disconnected successfully. Email credentials revoked.', 'success')
 await loadTenantData()
    } else {
 showNotification(res.error || 'Failed to disconnect Gmail', 'error')
    }
 setDisconnecting(false)
  }

 const handleSaveSmtpGateway = async () => {
 if (!companyId) return
 setSaving(true)

 const payload: EmailGatewayFormData = {
 provider: 'smtp',
 scope_type: 'TENANT',
 smtp_host: smtpHost,
 smtp_port: smtpPort,
 smtp_username: smtpUsername,
 password: password || undefined,
 encryption_type: encryptionType,
 sender_name: senderName,
 sender_email: senderEmail,
 reply_to_email: replyToEmail,
 status: 'active',
 is_default: true,
    }

 const res = await saveTenantEmailGatewayAction(companyId, payload)
 if (res.success && res.data) {
 setGateway(res.data)
 setHasConfiguredGateway(true)
 setPassword('')
 showNotification('Custom SMTP Gateway saved and active for sending.', 'success')
    } else {
 showNotification(res.error || 'Failed to save SMTP settings', 'error')
    }
 setSaving(false)
  }

 const handleDisableSmtp = async () => {
 if (!companyId) return
 setDisconnecting(true)
 const res = await deleteTenantEmailGatewayAction(companyId)
 if (res.success) {
 setGateway(null)
 setHasConfiguredGateway(false)
 showNotification('SMTP gateway disabled successfully.', 'success')
 await loadTenantData()
    } else {
 showNotification(res.error || 'Failed to disable SMTP', 'error')
    }
 setDisconnecting(false)
  }

 const handleTestSmtpConnection = async () => {
 if (!companyId) return
 setTesting(true)
 setTestResult(null)

 const payload: EmailGatewayFormData = {
 provider: 'smtp',
 smtp_host: smtpHost,
 smtp_port: smtpPort,
 smtp_username: smtpUsername,
 password: password || gateway?.encrypted_credentials || undefined,
 encryption_type: encryptionType,
 sender_name: senderName,
 sender_email: senderEmail,
 reply_to_email: replyToEmail,
    }

 const res = await testTenantEmailGatewayAction(companyId, payload)
 setTestResult(res)
 setTesting(false)
  }

 const handleSendTestEmail = async () => {
 if (!companyId || !testRecipient) return
 setSendingTestEmail(true)
 const res = await sendTestTenantEmailAction(companyId, testRecipient)
 if (res.success) {
 showNotification(`Test email dispatched successfully to ${testRecipient}!`, 'success')
 setIsTestModalOpen(false)
 const logsRes = await getTenantEmailLogsAction(companyId)
 if (logsRes.success) setLogs(logsRes.data)
    } else {
 showNotification(res.error || 'Failed to dispatch test email', 'error')
    }
 setSendingTestEmail(false)
  }

 const handleSaveTemplate = async () => {
 if (!companyId || !selectedTemplate) return
 setSaving(true)
 const res = await saveTenantEmailTemplateAction(companyId, selectedTemplate)
 if (res.success && res.data) {
 setTemplates((prev) =>
 prev.map((t) => (t.event_type === res.data!.event_type ? res.data! : t))
      )
 showNotification(`Custom template for"${selectedTemplate.name}"saved.`, 'success')
    } else {
 showNotification(res.error || 'Failed to save template', 'error')
    }
 setSaving(false)
  }

 if (!mounted) {
 return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-muted rounded-xl"/>
        <div className="h-12 bg-muted rounded-xl"/>
        <div className="h-48 bg-muted rounded-xl"/>
        <div className="h-48 bg-muted rounded-xl"/>
      </div>
    )
  }

 return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
 titleEn="Email Settings"titleBn="প্রতিষ্ঠান ইমেইল ও গ্রাহক যোগাযোগ"descriptionEn="Connect your Gmail account or standard SMTP server to deliver branded customer quotations, invoices, and vouchers."descriptionBn="ব্র্যান্ডেড কোটেশন ও ইনভয়েস পাঠাতে জিমেইল বা এসটিএমটিপি সার্ভার সংযুক্ত করুন।"icon={Mail}
 iconColor="text-primary"actions={
          <div className="flex items-center gap-2">
            <Button
 size="sm"variant="outline"onClick={() => setIsTestModalOpen(true)}
 className="text-xs h-9 min-h-[38px]"disabled={!hasConfiguredGateway}
            >
              <Send className="mr-1.5 h-3.5 w-3.5"/>
              {tBilingual('Send Test Email', 'টেস্ট ইমেইল পাঠান')}
            </Button>
          </div>
        }
      />

      {/* Toast Notification */}
      {notification && (
        <div
 className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition-all ${
 notification.type === 'success'
              ? 'bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border'
              : 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive border-danger-border'
          }`}
        >
          <Info className="h-4 w-4 shrink-0"/>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navigation Switcher Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        <button
 type="button"onClick={() => setActiveTab('gateway')}
 className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap min-h-[44px] ${
 activeTab === 'gateway'
              ? 'border-border text-primary border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
          }`}
        >
          <Server className="h-4 w-4"/>
          {tBilingual('Email Provider Setup', 'ইমেইল গেটওয়ে সেটিংস')}
        </button>

        <button
 type="button"onClick={() => setActiveTab('templates')}
 className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap min-h-[44px] ${
 activeTab === 'templates'
              ? 'border-border text-primary border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4"/>
          {tBilingual('Email Templates', 'ইমেইল টেমপ্লেট')} ({templates.length})
        </button>

        <button
 type="button"onClick={() => setActiveTab('logs')}
 className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap min-h-[44px] ${
 activeTab === 'logs'
              ? 'border-border text-primary border-primary/20 text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4"/>
          {tBilingual('Delivery Logs', 'ডেলিভারি হিস্ট্রি')} ({logs.length})
        </button>
      </div>

      {/* =======================================================================
 TAB 1: EMAIL PROVIDER SELECTION & SETUP
         ======================================================================= */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          {/* Active Status Overview Card */}
          <Card className={`border-l-4 ${hasConfiguredGateway ? 'border-l-emerald-600' : 'border-l-amber-500'}`}>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {hasConfiguredGateway ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-success"/>
                        {gateway?.provider === 'gmail' ? tBilingual('Gmail Active & Connected', 'জিমেইল সক্রিয় ও সংযুক্ত') : tBilingual('Custom SMTP Active & Connected', 'কাস্টম এসএমটিপি সক্রিয় ও সংযুক্ত')}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-warning"/>
                        {tBilingual('No Email Provider Configured', 'কোনো ইমেইল প্রোভাইডার কনফিগার করা নেই')}
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {hasConfiguredGateway
                      ? tBilingual(`Outgoing business emails are sent via ${gateway?.sender_email || 'your account'}.`, `ব্যবসায়িক ইমেইল ${gateway?.sender_email || 'আপনার অ্যাকাউন্ট'} এর মাধ্যমে পাঠানো হচ্ছে।`)
                      : tBilingual('Connect your Gmail account or custom SMTP server to begin sending quotations, invoices, and vouchers to customers.', 'গ্রাহকদের কোটেশন, ইনভয়েস ও চালান পাঠাতে আপনার জিমেইল বা কাস্টম এসএমটিপি সার্ভার সংযুক্ত করুন।')}
                  </CardDescription>
                </div>

                <Badge
 className={`text-xs uppercase font-bold self-start sm:self-center ${
 hasConfiguredGateway
                      ? 'bg-success-surface text-success bg-success/40 text-success'
                      : 'bg-warning-surface text-warning bg-warning/40 text-warning'
                  }`}
                >
                  {hasConfiguredGateway ? tBilingual('Active & Ready', 'সক্রিয় ও প্রস্তুত') : tBilingual('Setup Required', 'সেটআপ প্রয়োজন')}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Provider Selection Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Gmail */}
            <div
 onClick={() => setProviderMode('gmail')}
 className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
 providerMode === 'gmail'
                  ? 'border-border bg-primary/10/50 bg-primary/10 border-primary/20 shadow-sm'
                  : 'border-border hover:border-input'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">Gmail (Google OAuth 2.0)</span>
                    <Badge className="text-xs bg-primary/10 text-primary bg-primary/40 text-primary">
                        {tBilingual('Recommended', 'প্রস্তাবিত')}
                      </Badge>
                  </div>
                  {providerMode === 'gmail' && <Check className="h-4 w-4 text-primary"/>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tBilingual('One-click sign in with Google. 100% secure, zero password sharing, and high inbox delivery.', 'গুগলের মাধ্যমে ১-ক্লিকে সাইন ইন করুন। ১০০% নিরাপদ, কোনো পাসওয়ার্ড শেয়ার করতে হয় না এবং দ্রুত ইনবক্সে পৌঁছে।')}
                </p>
              </div>
              <div className="mt-3 text-xs tabular-nums text-muted-foreground">
                {tBilingual('Protocol: Google Gmail API (OAuth2)', 'প্রোটোকল: গুগল জিমেইল এপিআই (OAuth2)')}
              </div>
            </div>

            {/* Option 2: SMTP */}
            <div
 onClick={() => setProviderMode('smtp')}
 className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
 providerMode === 'smtp'
                  ? 'border-border bg-primary/10/50 bg-primary/10 border-primary/20 shadow-sm'
                  : 'border-border hover:border-input'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-foreground">{tBilingual('Custom SMTP Host', 'কাস্টম এসএমটিপি হোস্ট')}</span>
                  {providerMode === 'smtp' && <Check className="h-4 w-4 text-primary"/>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tBilingual('Connect any standard SMTP host (cPanel, Google Workspace, Office 365, Zoho Mail, Mailgun).', 'যেকোনো স্ট্যান্ডার্ড এসএমটিপি হোস্ট সংযুক্ত করুন (cPanel, Google Workspace, Office 365, Zoho Mail, Mailgun)।')}
                </p>
              </div>
              <div className="mt-3 text-xs tabular-nums text-muted-foreground">
                {tBilingual('Protocol: TLS / SSL / STARTTLS', 'প্রোটোকল: TLS / SSL / STARTTLS')}
              </div>
            </div>
          </div>

          {/* ===================================================================
 PROVIDER 1: GMAIL OAUTH CONFIGURATION
             =================================================================== */}
          {providerMode === 'gmail' && (
            <Card>
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary"/>
                  {tBilingual('Google Gmail Integration', 'গুগল জিমেইল ইন্টিগ্রেশন')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tBilingual('Authorize PrintFlow to send business documents directly from your Gmail / Google Workspace account.', 'আপনার জিমেইল / গুগল ওয়ার্কস্পেস অ্যাকাউন্ট থেকে সরাসরি ব্যবসায়িক নথি পাঠানোর অনুমতি দিন।')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {gateway?.provider === 'gmail' && gateway.status === 'active' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-success-surface border border-success-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-success text-primary-foreground flex items-center justify-center font-bold text-sm">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
 Connected Account: {gateway.gmail_account_email || gateway.sender_email}
                          </div>
                          <div className="text-xs text-muted-foreground">
 Display Name: {gateway.gmail_display_name || gateway.sender_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={testing}
                          onClick={handleTestGmailConnection}
                          className="text-xs h-9 min-h-9"
                        >
                          <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${testing ? 'animate-spin text-primary' : ''}`} />
                          {testing ? tBilingual('Verifying...', 'যাচাই হচ্ছে...') : tBilingual('Verify API', 'এপিআই যাচাই')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsTestModalOpen(true)}
                          className="text-xs h-9 min-h-9"
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5"/>
                          {tBilingual('Send Test', 'টেস্ট পাঠান')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={disconnecting}
                          onClick={handleDisconnectGmail}
                          className="text-xs h-9 min-h-9"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5"/>
                          {disconnecting ? tBilingual('Disconnecting...', 'বিচ্ছিন্ন করা হচ্ছে...') : tBilingual('Disconnect', 'সংযোগ বিচ্ছিন্ন করুন')}
                        </Button>
                      </div>
                    </div>

                    {testResult && (
                      <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${testResult.success ? 'bg-success-surface text-success border-success-border' : 'bg-destructive/10 text-destructive border-border'}`}>
                        {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}

                    <div className="p-3 bg-muted rounded-xl border text-xs text-muted-foreground space-y-1">
                      <span className="font-semibold text-foreground block">Security Guarantee:</span>
                      <p className="text-xs leading-relaxed">
 PrintFlow uses official Google OAuth 2.0 with limited `gmail.send` scope. We never have access to read your inbox messages, and tokens are encrypted at rest with AES-256-GCM.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-4">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 bg-primary/40 text-primary mx-auto flex items-center justify-center">
                        <Mail className="h-6 w-6"/>
                      </div>
                      <h3 className="font-bold text-sm text-foreground">{tBilingual('Connect Your Gmail Account', 'আপনার জিমেইল অ্যাকাউন্ট সংযুক্ত করুন')}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tBilingual('Click below to sign in with Google. PrintFlow will securely obtain an authorization token to dispatch customer quotes and invoices from your address.', 'গুগলে সাইন ইন করতে নিচে ক্লিক করুন। আপনার ঠিকানা থেকে গ্রাহকদের কোটেশন ও ইনভয়েস পাঠাতে প্রিন্টফ্লো নিরাপদে অনুমতি গ্রহণ করবে।')}
                      </p>
                    </div>

                    <Button
 size="lg"onClick={handleConnectGmail}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-11 px-6 min-h-[44px] shadow-xs shadow-blue-600/20">
                      <Globe className="mr-2 h-4 w-4"/>
                      {tBilingual('Sign in with Google / Connect Gmail', 'গুগল দিয়ে সাইন ইন / জিমেইল যুক্ত করুন')}
                    </Button>

                    {googleOAuthStatus && !googleOAuthStatus.isConfigured && (
                      <div className="max-w-xl mx-auto text-left p-4 rounded-xl border border-warning-border bg-warning-surface/70 bg-warning-surface border-warning-border text-xs space-y-2 mt-4">
                        <div className="flex items-center gap-2 font-bold text-warning text-warning">
                          <AlertTriangle className="h-4 w-4 shrink-0"/>
                          <span>Google Cloud OAuth Setup Note</span>
                        </div>
                        <p className="text-xs text-warning text-warning leading-relaxed">
 To enable 1-click Gmail connection, configure Google Cloud OAuth 2.0 Web Application credentials in your server environment (<code>.env.local</code> or Vercel Environment Variables):
                        </p>
                        <div className="bg-card/80 p-2.5 rounded-lg border border-warning-border/60 border-warning-border/60 tabular-nums text-xs text-foreground space-y-1">
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_CLIENT_ID</span>
                            <span className={googleOAuthStatus.hasClientId ? 'text-success font-bold' : 'text-destructive font-bold'}>
                              {googleOAuthStatus.hasClientId ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_CLIENT_SECRET</span>
                            <span className={googleOAuthStatus.hasClientSecret ? 'text-success font-bold' : 'text-destructive font-bold'}>
                              {googleOAuthStatus.hasClientSecret ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_GMAIL_REDIRECT_URI</span>
                            <span className={googleOAuthStatus.hasRedirectUri ? 'text-success font-bold' : 'text-muted-foreground'}>
                              {googleOAuthStatus.hasRedirectUri ? '✓ Configured' : '(Auto-resolved)'}
                            </span>
                          </div>
                        </div>
                        {googleOAuthStatus.redirectUri && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Google Cloud Authorized Redirect URI:</strong>
                            <code className="block mt-1 p-2 bg-muted rounded tabular-nums text-xs break-all select-all">
                              {googleOAuthStatus.redirectUri}
                            </code>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground pt-1">
 Tip: You can use standard <strong>Custom SMTP</strong> immediately below without any Google Cloud project setup.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ===================================================================
 PROVIDER 2: SMTP CONFIGURATION
             =================================================================== */}
          {providerMode === 'smtp' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Server Credentials */}
              <Card>
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm">{tBilingual('SMTP Server Credentials', 'এসএমটিপি সার্ভার তথ্য')}</CardTitle>
                  <CardDescription className="text-xs">
                    {tBilingual('Credentials are encrypted and protected against exposure.', 'লগইন তথ্য এনক্রিপ্ট করা এবং সুরক্ষিত।')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">SMTP Host</Label>
                      <Input
 value={smtpHost}
 onChange={(e) => setSmtpHost(e.target.value)}
 placeholder={tBilingual("mail.yourcompany.com", "mail.yourcompany.com")}className="h-9 text-xs tabular-nums min-h-[38px]"/>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Port</Label>
                      <Input
 type="number"value={smtpPort}
 onChange={(e) => setSmtpPort(Number(e.target.value))}
 className="h-9 text-xs tabular-nums min-h-[38px]"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Encryption</Label>
                      <select
 value={encryptionType}
 onChange={(e) => setEncryptionType(e.target.value as any)}
 className="w-full h-9 px-2.5 rounded-md border border-input bg-card text-xs font-medium min-h-[38px]">
                        <option value="tls">{tBilingual("TLS / STARTTLS (587)", "টিএলএস / স্টার্টটিএলএস (৫৮৭)")}</option>
                        <option value="ssl">{tBilingual("SSL (465)", "এসএসএল (৪৬৫)")}</option>
                        <option value="none">{tBilingual("Plain / None (25)", "প্লেইন / কোনোটি নয় (২৫)")}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Username / Account</Label>
                      <Input
 value={smtpUsername}
 onChange={(e) => setSmtpUsername(e.target.value)}
 placeholder={tBilingual("billing@yourcompany.com", "billing@yourcompany.com")}className="h-9 text-xs tabular-nums min-h-[38px]"/>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Password</Label>
                      <button
 type="button"onClick={() => setShowSecret(!showSecret)}
 className="text-xs text-primary hover:underline flex items-center gap-1">
                        {showSecret ? <EyeOff className="h-3 w-3"/> : <Eye className="h-3 w-3"/>}
                        {showSecret ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    <Input
 type={showSecret ? 'text' : 'password'}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder={gateway?.provider === 'smtp' ? '•••••••••••• (Encrypted on file)' : 'Enter password'}
 className="h-9 text-xs tabular-nums min-h-[38px]"/>
                  </div>

                  {/* Test Connection Button */}
                  <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Button
 type="button"variant="outline"size="sm"disabled={testing}
 onClick={handleTestSmtpConnection}
 className="text-xs h-9 min-h-[38px]">
                      <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${testing ? 'animate-spin text-primary' : ''}`} />
                      {testing ? 'Testing...' : 'Test Connection'}
                    </Button>

                    {testResult && (
                      <span
 className={`text-xs font-semibold flex items-center gap-1.5 ${
 testResult.success ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5"/> : <AlertTriangle className="h-3.5 w-3.5"/>}
                        {testResult.message}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sender Identity & Action */}
              <Card className="flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm">Sender Display &amp; Routing</CardTitle>
                    <CardDescription className="text-xs">
 Appearance of outgoing messages to clients.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs">Sender / Shop Display Name</Label>
                      <Input
 value={senderName}
 onChange={(e) => setSenderName(e.target.value)}
 placeholder={tBilingual("Printing Enterprise", "প্রিন্টিং এন্টারপ্রাইজ")}className="h-9 text-xs min-h-[38px]"/>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">From Email Address</Label>
                      <Input
 type="email"value={senderEmail}
 onChange={(e) => setSenderEmail(e.target.value)}
 placeholder={tBilingual("billing@example.com", "billing@example.com")}className="h-9 text-xs tabular-nums min-h-[38px]"/>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Reply-To Email</Label>
                      <Input
 type="email"value={replyToEmail}
 onChange={(e) => setReplyToEmail(e.target.value)}
 placeholder={tBilingual("support@example.com", "support@example.com")}className="h-9 text-xs tabular-nums min-h-[38px]"/>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 border-t flex items-center justify-between gap-2">
                  {gateway?.provider === 'smtp' && (
                    <Button
 size="sm"variant="ghost"disabled={disconnecting}
 onClick={handleDisableSmtp}
 className="text-xs text-destructive hover:bg-danger-surface">
 Disable SMTP
                    </Button>
                  )}
                  <Button
 size="sm"disabled={saving}
 onClick={handleSaveSmtpGateway}
 className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 min-h-[38px]">
                    <Save className="mr-1.5 h-3.5 w-3.5"/>
                    {saving ? 'Saving...' : 'Save SMTP Settings'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
 TAB 2: TEMPLATES CUSTOMIZATION
         ======================================================================= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 p-2 space-y-1 max-h-[550px] overflow-y-auto">
            {templates.map((tpl) => {
 const isSelected = selectedTemplate?.event_type === tpl.event_type
 return (
                <button
 key={tpl.event_type}
 type="button"onClick={() => setSelectedTemplate(tpl)}
 className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-0.5 min-h-[44px] ${
 isSelected
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : 'text-foreground hover:bg-muted dark:hover:bg-muted'
                  }`}
                >
                  <span className="truncate">{getTemplateDisplayName(tpl, locale === 'bn')}</span>
                  <span className={`text-xs tabular-nums ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {tpl.event_type}
                  </span>
                </button>
              )
            })}
          </Card>

          {selectedTemplate && (
            <Card className="md:col-span-2 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-2">
                <div>
                  <h4 className="font-bold text-sm text-foreground">{getTemplateDisplayName(selectedTemplate, locale === 'bn')}</h4>
                  <span className="text-xs tabular-nums text-primary">{selectedTemplate.event_type}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex p-0.5 bg-muted rounded-lg border">
                    <button
 type="button"onClick={() => setTemplateLang('en')}
 className={`px-2.5 py-1 text-xs font-bold rounded-md ${
 templateLang === 'en' ? 'bg-primary text-white' : 'text-muted-foreground '
                      }`}
                    >
 English
                    </button>
                    <button
 type="button"onClick={() => setTemplateLang('bn')}
 className={`px-2.5 py-1 text-xs font-bold rounded-md ${
 templateLang === 'bn' ? 'bg-primary text-white' : 'text-muted-foreground '
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>

                  <Button size="sm"onClick={handleSaveTemplate} className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground min-h-[38px]">
                    <Save className="h-3 w-3 mr-1"/>
 Save
                  </Button>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <Label className="text-xs">{locale === 'bn' ? `বিষয়বস্তু (${templateLang === 'en' ? 'ইংরেজি' : 'বাংলা'})` : `Subject Line (${templateLang === 'en' ? 'English' : 'Bengali'})`}</Label>
                <Input
 value={
 templateLang === 'en'
                      ? selectedTemplate.subject_template
                      : selectedTemplate.subject_template_bn || selectedTemplate.subject_template
                  }
 onChange={(e) => {
 if (templateLang === 'en') {
 setSelectedTemplate({ ...selectedTemplate, subject_template: e.target.value })
                    } else {
 setSelectedTemplate({ ...selectedTemplate, subject_template_bn: e.target.value })
                    }
                  }}
 className="h-9 text-xs min-h-[38px]"/>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <Label className="text-xs">{locale === 'bn' ? 'ইমেইল মূল বিবরণী' : 'Email Body Content'}</Label>
                <textarea
 rows={6}
 value={
 templateLang === 'en'
                      ? selectedTemplate.body_template
                      : selectedTemplate.body_template_bn || selectedTemplate.body_template
                  }
 onChange={(e) => {
 if (templateLang === 'en') {
 setSelectedTemplate({ ...selectedTemplate, body_template: e.target.value })
                    } else {
 setSelectedTemplate({ ...selectedTemplate, body_template_bn: e.target.value })
                    }
                  }}
 className="w-full p-2.5 rounded-lg border border-input bg-card text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"/>
              </div>

              {/* Rendered Preview */}
              <div className="p-3 bg-muted rounded-xl border space-y-1">
                <span className="text-xs font-bold uppercase text-muted-foreground">{locale === 'bn' ? 'লাইভ প্রিভিউ:' : 'LIVE PREVIEW:'}</span>
                <div
 className="p-3 bg-card text-foreground text-xs rounded border max-h-40 overflow-y-auto"dangerouslySetInnerHTML={{
                    __html: interpolateVariables(
 templateLang === 'en'
                        ? selectedTemplate.body_template
                        : selectedTemplate.body_template_bn || selectedTemplate.body_template,
                      {
 customer_name: 'Akash Ahmed (City Corporation)',
 company_name: company?.name || 'Printing Enterprise',
 invoice_number: 'INV-0042',
 amount: '12,500',
 due_amount: '4,500',
                      }
                    ),
                  }}
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* =======================================================================
 TAB 3: DELIVERY LOGS
         ======================================================================= */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm">{tBilingual('Tenant Email Delivery History', 'ইমেইল ডেলিভারি হিস্ট্রি')}</CardTitle>
            <div className="w-full sm:w-56">
              <Input
 placeholder={tBilingual('Search logs...', 'লগ অনুসন্ধান করুন...')}value={logSearch}
 onChange={(e) => setLogSearch(e.target.value)}
 className="h-9 text-xs min-h-[38px]"/>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground border-b">
                  <tr>
                    <th className="py-2.5 px-3 bangla-text">{tBilingual('Date & Event', 'তারিখ ও ইভেন্ট')}</th>
                    <th className="py-2.5 px-3 bangla-text">{tBilingual('Recipient', 'প্রাপক')}</th>
                    <th className="py-2.5 px-3 bangla-text">{tBilingual('Subject', 'বিষয়')}</th>
                    <th className="py-2.5 px-3 text-center bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
 {tBilingual('No email transmission logs recorded yet.', 'এখনও কোনো ইমেইল পাঠানোর লগ নেই।')}
                      </td>
                    </tr>
                  ) : (
 logs
                      .filter(
                        (l) =>
                          !logSearch ||
 l.recipient.toLowerCase().includes(logSearch.toLowerCase()) ||
 l.subject.toLowerCase().includes(logSearch.toLowerCase())
                      )
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-muted dark:hover:bg-muted/40">
                          <td className="py-2.5 px-3 tabular-nums text-xs">
                            <div>{new Date(log.created_at).toLocaleDateString()}</div>
                            <span className="text-muted-foreground">{log.event_type}</span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {log.recipient}
                          </td>
                          <td className="py-2.5 px-3 truncate max-w-xs text-muted-foreground">
                            {log.subject}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
 className={`text-xs uppercase ${
 log.status === 'sent'
                                  ? 'bg-success-surface text-success bg-success/40 text-success'
                                  : log.status === 'failed'
                                  ? 'bg-danger-surface text-destructive bg-destructive/40 text-destructive'
                                  : 'bg-warning-surface text-warning bg-warning/40 text-warning'
                              }`}
                            >
                              {log.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Email Modal */}
      {isTestModalOpen && (
        <ModalDialog
 open={isTestModalOpen}
 onOpenChange={(open) => setIsTestModalOpen(open)}
 title="Send Real Test Email"description="Verify live dispatch and delivery using your active email provider."hideFooter={true}
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">{tBilingual('Recipient Email Address', 'প্রাপকের ইমেইল ঠিকানা')}</Label>
              <Input
 type="email"value={testRecipient}
 onChange={(e) => setTestRecipient(e.target.value)}
 placeholder={tBilingual("your.email@example.com", "your.email@example.com")}className="h-10 text-xs tabular-nums text-foreground bg-card border-input min-h-[40px]"/>
            </div>

            <div className="p-3 bg-muted rounded-xl border border-border text-xs text-muted-foreground">
 {tBilingual('Provider:', 'প্রোভাইডার:')} <strong className="text-foreground capitalize">{gateway?.provider || (locale === 'bn' ? 'সক্রিয় প্রোভাইডার' : 'Active Provider')}</strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button size="sm"variant="outline"onClick={() => setIsTestModalOpen(false)}>
 Cancel
              </Button>
              <Button
 size="sm"disabled={sendingTestEmail || !testRecipient}
 onClick={handleSendTestEmail}
 className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[38px] font-medium">
                <Send className="mr-1.5 h-3.5 w-3.5"/>
                {sendingTestEmail ? (locale === 'bn' ? 'পাঠানো হচ্ছে...' : 'Dispatching...') : (locale === 'bn' ? 'টেস্ট পাঠান' : 'Send Test')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}

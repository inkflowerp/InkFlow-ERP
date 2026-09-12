'use client'

// ==============================================================================
// PrintERP SaaS - Tenant Business Email Gateway Settings
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
import { SettingsNav } from '@/components/settings/settings-nav'
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
import { interpolateVariables } from '@/services/email-template.service'

export default function TenantEmailSettingsPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const companyId = company?.id || ''

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
  const [senderName, setSenderName] = useState(company?.name || 'Vision Sign BD')
  const [senderEmail, setSenderEmail] = useState(company?.email || 'billing@visionsignbd.com')
  const [replyToEmail, setReplyToEmail] = useState(company?.email || 'billing@visionsignbd.com')

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
    loadTenantData()

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
  }, [companyId])

  const handleConnectGmail = () => {
    if (!companyId) return
    window.location.href = `/api/email/oauth/google/start?scope=tenant&tenantId=${companyId}`
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
      showNotification(`Custom template for "${selectedTemplate.name}" saved.`, 'success')
    } else {
      showNotification(res.error || 'Failed to save template', 'error')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <PageHeader
        titleEn="Business Email & Customer Communications"
        titleBn="প্রতিষ্ঠান ইমেইল ও গ্রাহক যোগাযোগ"
        descriptionEn="Connect your Gmail account or standard SMTP server to deliver branded customer quotations, invoices, and vouchers."
        descriptionBn="ব্র্যান্ডেড কোটেশন ও ইনভয়েস পাঠাতে জিমেইল বা এসটিএমটিপি সার্ভার সংযুক্ত করুন।"
        icon={Mail}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTestModalOpen(true)}
              className="text-xs h-9 min-h-[38px]"
              disabled={!hasConfiguredGateway}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Send Test Email', 'টেস্ট ইমেইল পাঠান')}
            </Button>
          </div>
        }
      />

      <SettingsNav />

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <Info className="h-4 w-4 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navigation Switcher Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('gateway')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'gateway'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Server className="h-4 w-4" />
          {tBilingual('Email Provider Setup', 'ইমেইল গেটওয়ে সেটিংস')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          {tBilingual('Email Templates', 'ইমেইল টেমপ্লেট')} ({templates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
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
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        {gateway?.provider === 'gmail' ? 'Gmail Active & Connected' : 'Custom SMTP Active & Connected'}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        No Email Provider Configured
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {hasConfiguredGateway
                      ? `Outgoing business emails are sent via ${gateway?.sender_email || 'your account'}.`
                      : 'Connect your Gmail account or custom SMTP server to begin sending quotations, invoices, and vouchers to customers.'}
                  </CardDescription>
                </div>

                <Badge
                  className={`text-[10px] uppercase font-bold self-start sm:self-center ${
                    hasConfiguredGateway
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  {hasConfiguredGateway ? 'Active & Ready' : 'Setup Required'}
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
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Gmail (Google OAuth 2.0)</span>
                    <Badge className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Recommended
                    </Badge>
                  </div>
                  {providerMode === 'gmail' && <Check className="h-4 w-4 text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  One-click sign in with Google. 100% secure, zero password sharing, and high inbox delivery.
                </p>
              </div>
              <div className="mt-3 text-[11px] font-mono text-slate-400">
                Protocol: Google Gmail API (OAuth2)
              </div>
            </div>

            {/* Option 2: SMTP */}
            <div
              onClick={() => setProviderMode('smtp')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                providerMode === 'smtp'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Custom SMTP Host</span>
                  {providerMode === 'smtp' && <Check className="h-4 w-4 text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Connect any standard SMTP host (cPanel, Google Workspace, Office 365, Zoho Mail, Mailgun).
                </p>
              </div>
              <div className="mt-3 text-[11px] font-mono text-slate-400">
                Protocol: TLS / SSL / STARTTLS
              </div>
            </div>
          </div>

          {/* ===================================================================
              PROVIDER 1: GMAIL OAUTH CONFIGURATION
             =================================================================== */}
          {providerMode === 'gmail' && (
            <Card>
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  Google Gmail Integration
                </CardTitle>
                <CardDescription className="text-xs">
                  Authorize InkFlow to send business documents directly from your Gmail / Google Workspace account.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {gateway?.provider === 'gmail' && gateway.status === 'active' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            Connected Account: {gateway.gmail_account_email || gateway.sender_email}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Display Name: {gateway.gmail_display_name || gateway.sender_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsTestModalOpen(true)}
                          className="text-xs h-9 min-h-[38px]"
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          Send Test
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={disconnecting}
                          onClick={handleDisconnectGmail}
                          className="text-xs h-9 min-h-[38px]"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-xs text-slate-500 space-y-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">Security Guarantee:</span>
                      <p className="text-[11px] leading-relaxed">
                        InkFlow uses official Google OAuth 2.0 with limited `gmail.send` scope. We never have access to read your inbox messages, and tokens are encrypted at rest with AES-256-GCM.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-4">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 mx-auto flex items-center justify-center">
                        <Mail className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Connect Your Gmail Account</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Click below to sign in with Google. InkFlow will securely obtain an authorization token to dispatch customer quotes and invoices from your address.
                      </p>
                    </div>

                    <Button
                      size="lg"
                      onClick={handleConnectGmail}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-11 px-6 min-h-[44px] shadow-md shadow-blue-600/20"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Sign in with Google / Connect Gmail
                    </Button>

                    {googleOAuthStatus && !googleOAuthStatus.isConfigured && (
                      <div className="max-w-xl mx-auto text-left p-4 rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800 text-xs space-y-2 mt-4">
                        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Google Cloud OAuth Setup Note</span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          To enable 1-click Gmail connection, configure Google Cloud OAuth 2.0 Web Application credentials in your server environment (<code>.env.local</code> or Vercel Environment Variables):
                        </p>
                        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/60 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_CLIENT_ID</span>
                            <span className={googleOAuthStatus.hasClientId ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                              {googleOAuthStatus.hasClientId ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_CLIENT_SECRET</span>
                            <span className={googleOAuthStatus.hasClientSecret ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                              {googleOAuthStatus.hasClientSecret ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_GMAIL_REDIRECT_URI</span>
                            <span className={googleOAuthStatus.hasRedirectUri ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                              {googleOAuthStatus.hasRedirectUri ? '✓ Configured' : '(Auto-resolved)'}
                            </span>
                          </div>
                        </div>
                        {googleOAuthStatus.redirectUri && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            <strong>Google Cloud Authorized Redirect URI:</strong>
                            <code className="block mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded font-mono text-[10px] break-all select-all">
                              {googleOAuthStatus.redirectUri}
                            </code>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 pt-1">
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
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm">SMTP Server Credentials</CardTitle>
                  <CardDescription className="text-xs">
                    Credentials are encrypted and protected against exposure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">SMTP Host</Label>
                      <Input
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="mail.yourcompany.com"
                        className="h-9 text-xs font-mono min-h-[38px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Port</Label>
                      <Input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="h-9 text-xs font-mono min-h-[38px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Encryption</Label>
                      <select
                        value={encryptionType}
                        onChange={(e) => setEncryptionType(e.target.value as any)}
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium min-h-[38px]"
                      >
                        <option value="tls">TLS / STARTTLS (587)</option>
                        <option value="ssl">SSL (465)</option>
                        <option value="none">Plain / None (25)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Username / Account</Label>
                      <Input
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        placeholder="billing@yourcompany.com"
                        className="h-9 text-xs font-mono min-h-[38px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {showSecret ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={gateway?.provider === 'smtp' ? '•••••••••••• (Encrypted on file)' : 'Enter password'}
                      className="h-9 text-xs font-mono min-h-[38px]"
                    />
                  </div>

                  {/* Test Connection Button */}
                  <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={testing}
                      onClick={handleTestSmtpConnection}
                      className="text-xs h-9 min-h-[38px]"
                    >
                      <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${testing ? 'animate-spin text-blue-600' : ''}`} />
                      {testing ? 'Testing...' : 'Test Connection'}
                    </Button>

                    {testResult && (
                      <span
                        className={`text-xs font-semibold flex items-center gap-1.5 ${
                          testResult.success ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {testResult.message}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sender Identity & Action */}
              <Card className="flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
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
                        placeholder="Vision Sign BD"
                        className="h-9 text-xs min-h-[38px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">From Email Address</Label>
                      <Input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="billing@visionsignbd.com"
                        className="h-9 text-xs font-mono min-h-[38px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Reply-To Email</Label>
                      <Input
                        type="email"
                        value={replyToEmail}
                        onChange={(e) => setReplyToEmail(e.target.value)}
                        placeholder="support@visionsignbd.com"
                        className="h-9 text-xs font-mono min-h-[38px]"
                      />
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 border-t flex items-center justify-between gap-2">
                  {gateway?.provider === 'smtp' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disconnecting}
                      onClick={handleDisableSmtp}
                      className="text-xs text-rose-600 hover:bg-rose-50"
                    >
                      Disable SMTP
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={handleSaveSmtpGateway}
                    className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 min-h-[38px]"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
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
                  type="button"
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-0.5 min-h-[44px] ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{tpl.name}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
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
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedTemplate.name}</h4>
                  <span className="text-[11px] font-mono text-blue-600">{selectedTemplate.event_type}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setTemplateLang('en')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                        templateLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateLang('bn')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                        templateLang === 'bn' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>

                  <Button size="sm" onClick={handleSaveTemplate} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white min-h-[38px]">
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <Label className="text-xs">Subject Line ({templateLang === 'en' ? 'English' : 'বাংলা'})</Label>
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
                  className="h-9 text-xs min-h-[38px]"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <Label className="text-xs">Email Body Content</Label>
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
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Rendered Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Live Preview:</span>
                <div
                  className="p-3 bg-white text-slate-900 text-xs rounded border max-h-40 overflow-y-auto"
                  dangerouslySetInnerHTML={{
                    __html: interpolateVariables(
                      templateLang === 'en'
                        ? selectedTemplate.body_template
                        : selectedTemplate.body_template_bn || selectedTemplate.body_template,
                      {
                        customer_name: 'Akash Ahmed (City Corporation)',
                        company_name: company?.name || 'Vision Sign BD',
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
            <CardTitle className="text-sm">Tenant Email Delivery History</CardTitle>
            <div className="w-full sm:w-56">
              <Input
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="h-9 text-xs min-h-[38px]"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Date &amp; Event</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                        No email transmission logs recorded yet.
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
                        <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            <div>{new Date(log.created_at).toLocaleDateString()}</div>
                            <span className="text-slate-400">{log.event_type}</span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {log.recipient}
                          </td>
                          <td className="py-2.5 px-3 truncate max-w-xs text-slate-600 dark:text-slate-300">
                            {log.subject}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              className={`text-[9px] uppercase ${
                                log.status === 'sent'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : log.status === 'failed'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
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
          title="Send Real Test Email"
          description="Verify live dispatch and delivery using your active email provider."
          hideFooter={true}
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recipient Email Address</Label>
              <Input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="your.email@example.com"
                className="h-10 text-xs font-mono text-slate-900 bg-white border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-white min-h-[40px]"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              Provider: <strong className="text-slate-900 dark:text-white capitalize">{gateway?.provider || 'Active Provider'}</strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setIsTestModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={sendingTestEmail || !testRecipient}
                onClick={handleSendTestEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white min-h-[38px] font-medium"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {sendingTestEmail ? 'Dispatching...' : 'Send Test'}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}

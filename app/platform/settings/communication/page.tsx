'use client'

// ==============================================================================
// PrintERP SaaS - Platform Owner Email Gateway Hub
// Location: Platform Admin Panel -> Settings -> Communication -> Email Gateway
// Supports Platform Gmail (OAuth 2.0) and Platform SMTP Infrastructure
// ==============================================================================

import React, { useState, useEffect } from 'react'
import {
  Mail,
  Server,
  ShieldCheck,
  Send,
  RefreshCw,
  Save,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Sliders,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Lock,
  RotateCw,
  FileText,
  Search,
  ExternalLink,
  Trash2,
  Info,
  Copy,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import { formatTime } from '@/lib/formatters'
import {
  getPlatformEmailGatewayAction,
  savePlatformEmailGatewayAction,
  testPlatformEmailGatewayAction,
  disconnectPlatformGmailAction,
  sendTestPlatformEmailAction,
  getPlatformEmailTemplatesAction,
  savePlatformEmailTemplateAction,
  getPlatformEmailLogsAction,
  processEmailQueueAction,
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

export default function PlatformEmailGatewayPage() {
  const [activeTab, setActiveTab] = useState<'gateway' | 'templates' | 'logs' | 'deliverability'>('gateway')
  const [gateway, setGateway] = useState<EmailGatewayRecord | null>(null)
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [logs, setLogs] = useState<EmailLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [processingQueue, setProcessingQueue] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null)
  const [customDomainInput, setCustomDomainInput] = useState('')

  const handleCopyRecord = (key: string, text: string) => {
    if (typeof window !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedRecord(key)
      setTimeout(() => setCopiedRecord(null), 2000)
    }
  }
  const [googleOAuthStatus, setGoogleOAuthStatus] = useState<{
    isConfigured: boolean
    hasClientId: boolean
    hasClientSecret: boolean
    hasRedirectUri: boolean
    redirectUri: string
    issues: string[]
  } | null>(null)

  // Selected Provider Mode: 'gmail' or 'smtp'
  const [providerMode, setProviderMode] = useState<'gmail' | 'smtp'>('gmail')

  // SMTP Form State
  const [smtpHost, setSmtpHost] = useState('smtp.example.com')
  const [smtpPort, setSmtpPort] = useState(587)
  const [encryptionType, setEncryptionType] = useState<'ssl' | 'tls' | 'starttls' | 'none'>('tls')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [password, setPassword] = useState('')
  const [senderName, setSenderName] = useState('InkFlow Platform')
  const [senderEmail, setSenderEmail] = useState('inkflow.erp@gmail.com')
  const [replyToEmail, setReplyToEmail] = useState('inkflow.erp@gmail.com')

  // Toast & Modal State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testRecipient, setTestRecipient] = useState('inkflow.erp@gmail.com')
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  // Template Editing State
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateRecord | null>(null)
  const [previewLang, setPreviewLang] = useState<'en' | 'bn'>('en')
  const [logFilterStatus, setLogFilterStatus] = useState('all')
  const [logSearch, setLogSearch] = useState('')

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [gwRes, tplRes, logsRes, oauthStatusRes] = await Promise.all([
        getPlatformEmailGatewayAction(),
        getPlatformEmailTemplatesAction(),
        getPlatformEmailLogsAction(),
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

      if (gwRes.success && gwRes.data) {
        setGateway(gwRes.data)
        if (gwRes.data.provider === 'gmail') {
          setProviderMode('gmail')
        } else {
          setProviderMode('smtp')
        }
        setSmtpHost(gwRes.data.smtp_host || '')
        setSmtpPort(gwRes.data.smtp_port || 587)
        setEncryptionType(gwRes.data.encryption_type || 'tls')
        setSmtpUsername(gwRes.data.smtp_username || '')
        setSenderName(gwRes.data.sender_name || 'InkFlow Platform')
        setSenderEmail(gwRes.data.sender_email || 'inkflow.erp@gmail.com')
        setReplyToEmail(gwRes.data.reply_to_email || 'inkflow.erp@gmail.com')
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
    loadData()

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('gmail') === 'connected') {
        showNotification('Platform Gmail account connected and verified for system delivery!', 'success')
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
  }, [])

  const handleConnectGmail = () => {
    window.location.href = '/api/email/oauth/google/start?scope=platform'
  }

  const handleDisconnectGmail = async () => {
    setDisconnecting(true)
    const res = await disconnectPlatformGmailAction()
    if (res.success) {
      showNotification('Platform Gmail disconnected. System credentials revoked.', 'success')
      await loadData()
    } else {
      showNotification(res.error || 'Failed to disconnect Gmail', 'error')
    }
    setDisconnecting(false)
  }

  const handleSaveSmtpGateway = async () => {
    setSaving(true)
    const payload: EmailGatewayFormData = {
      provider: 'smtp',
      scope_type: 'PLATFORM',
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

    const res = await savePlatformEmailGatewayAction(payload)
    if (res.success && res.data) {
      setGateway(res.data)
      setPassword('')
      showNotification('Platform Default SMTP Gateway saved and encrypted with AES-256-GCM.', 'success')
    } else {
      showNotification(res.error || 'Failed to save gateway settings', 'error')
    }
    setSaving(false)
  }

  const handleTestSmtpConnection = async () => {
    setTesting(true)
    setTestResult(null)

    const payload: EmailGatewayFormData = {
      provider: 'smtp',
      scope_type: 'PLATFORM',
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_username: smtpUsername,
      password: password || gateway?.encrypted_credentials || undefined,
      encryption_type: encryptionType,
      sender_name: senderName,
      sender_email: senderEmail,
      reply_to_email: replyToEmail,
    }

    const res = await testPlatformEmailGatewayAction(payload)
    setTestResult(res)
    setTesting(false)
  }

  const handleSendTestEmail = async () => {
    if (!testRecipient) return
    setSendingTestEmail(true)
    const res = await sendTestPlatformEmailAction(testRecipient)
    if (res.success) {
      showNotification(`Platform test email sent to ${testRecipient}!`, 'success')
      setIsTestModalOpen(false)
      const logsRes = await getPlatformEmailLogsAction()
      if (logsRes.success) setLogs(logsRes.data)
    } else {
      showNotification(res.error || 'Failed to send test email', 'error')
    }
    setSendingTestEmail(false)
  }

  const handleProcessQueue = async () => {
    setProcessingQueue(true)
    const res = await processEmailQueueAction()
    if (res.success) {
      showNotification(`Queue processed: ${res.processed} jobs checked, ${res.succeeded} sent.`, 'success')
      const logsRes = await getPlatformEmailLogsAction()
      if (logsRes.success) setLogs(logsRes.data)
    } else {
      showNotification('Failed to process queue', 'error')
    }
    setProcessingQueue(false)
  }

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return
    setSaving(true)
    const res = await savePlatformEmailTemplateAction(selectedTemplate)
    if (res.success && res.data) {
      setTemplates((prev) =>
        prev.map((t) => (t.event_type === res.data!.event_type ? res.data! : t))
      )
      showNotification(`Template "${selectedTemplate.name}" updated successfully.`, 'success')
    } else {
      showNotification(res.error || 'Failed to save template', 'error')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <PlatformSettingsNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Mail className="h-7 w-7 text-indigo-400" />
            Platform Email Infrastructure
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure system authentication emails, tenant notifications, billing vouchers, and security alert dispatchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsTestModalOpen(true)}
            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/20"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Test Email
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <Info className="h-4 w-4 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('gateway')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'gateway'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Server className="h-3.5 w-3.5" />
          Platform Email Provider
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'templates'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          System Templates ({templates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Platform Transmission Logs ({logs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deliverability')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'deliverability'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Spam Prevention & DNS
        </button>
      </div>

      {/* =======================================================================
          TAB 1: PLATFORM GATEWAY PROVIDER CONFIGURATION
         ======================================================================= */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          {/* Status Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900/90 border-slate-800 p-4 border-l-4 border-l-indigo-500">
              <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Active Provider
              </span>
              <div className="text-lg font-bold text-white capitalize flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {gateway?.provider?.toUpperCase() || 'SMTP'} Gateway
              </div>
              <span className="text-2xs text-slate-500 mt-1 block">
                AES-256-GCM Encrypted
              </span>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800 p-4 border-l-4 border-l-emerald-500">
              <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Status
              </span>
              <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {gateway?.last_test_status?.toUpperCase() || 'READY'}
              </div>
              <span className="text-2xs text-slate-500 mt-1 block">
                Last Tested: {gateway?.last_tested_at ? formatTime(gateway.last_tested_at) : 'Active'}
              </span>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800 p-4 border-l-4 border-l-purple-500">
              <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Platform Sender
              </span>
              <div className="text-xs font-bold text-slate-200 truncate mt-1">
                {gateway?.sender_email || senderEmail}
              </div>
              <span className="text-2xs text-slate-500 mt-1 block truncate">
                Display: {gateway?.sender_name || senderName}
              </span>
            </Card>
          </div>

          {/* Deliverability & Anti-Spam Tip Banner */}
          <div className="bg-linear-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  Spam Prevention & DNS Authentication Active
                  <Badge variant="outline" className="text-2xs bg-emerald-950/80 text-emerald-300 border-emerald-700/50">
                    RFC 5322 Aligned
                  </Badge>
                </h4>
                <p className="text-2xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Every outgoing email is injected with domain-aligned Message-IDs, multipart plain-text fallback, and anti-spam suppression headers. Configure your SPF, DKIM, and DMARC DNS records to ensure 100% inbox delivery.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('deliverability')}
              className="text-xs shrink-0 border-indigo-500/50 bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-200"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View DNS Records
            </Button>
          </div>

          {/* Provider Mode Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setProviderMode('gmail')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                providerMode === 'gmail'
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">Gmail (Google OAuth 2.0)</span>
                  {providerMode === 'gmail' && <Check className="h-4 w-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Connect official InkFlow platform Google Workspace or Gmail account for OAuth 2.0 authenticated system delivery.
                </p>
              </div>
              <div className="mt-3 text-2xs tabular-nums text-slate-500">
                Scope: Platform Global Email
              </div>
            </div>

            <div
              onClick={() => setProviderMode('smtp')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                providerMode === 'smtp'
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">Platform Dedicated SMTP</span>
                  {providerMode === 'smtp' && <Check className="h-4 w-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Configure corporate SMTP host for platform registration, OTPs, password resets, and system notices.
                </p>
              </div>
              <div className="mt-3 text-2xs tabular-nums text-slate-500">
                Scope: Platform Global Email
              </div>
            </div>
          </div>

          {/* Gmail Form */}
          {providerMode === 'gmail' && (
            <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
                <CardTitle className="text-base font-bold text-white">Google Gmail API Connection</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Connect Platform Google Account for zero-password OAuth 2.0 system message delivery.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {gateway?.provider === 'gmail' && gateway.status === 'active' ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                        ✓
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">
                          Connected Account: {gateway.gmail_account_email || gateway.sender_email}
                        </div>
                        <div className="text-2xs text-slate-400">
                          Display Name: {gateway.gmail_display_name || gateway.sender_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsTestModalOpen(true)}
                        className="text-xs border-slate-800 bg-slate-900 text-white"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Test Email
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={disconnecting}
                        onClick={handleDisconnectGmail}
                        className="text-xs"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-4">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-900/40 text-indigo-400 mx-auto flex items-center justify-center">
                        <Mail className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-sm text-white">Connect Platform Gmail Account</h3>
                      <p className="text-xs text-slate-400">
                        Authorize InkFlow to send platform authentication emails and billing receipts using Google OAuth.
                      </p>
                    </div>

                    <Button
                      size="lg"
                      onClick={handleConnectGmail}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-11 px-6 shadow-lg shadow-indigo-600/20"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Connect Platform Gmail
                    </Button>

                    {googleOAuthStatus && !googleOAuthStatus.isConfigured && (
                      <div className="max-w-xl mx-auto text-left p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs space-y-2 mt-4">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Google Cloud OAuth Setup Note</span>
                        </div>
                        <p className="text-2xs text-amber-400/90 leading-relaxed">
                          To enable Platform Gmail connection, configure Google Cloud OAuth 2.0 Web Application credentials in your server environment (<code>.env.local</code> or Vercel Environment Variables):
                        </p>
                        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 tabular-nums text-2xs text-slate-300 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_CLIENT_ID</span>
                            <span className={googleOAuthStatus.hasClientId ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {googleOAuthStatus.hasClientId ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_CLIENT_SECRET</span>
                            <span className={googleOAuthStatus.hasClientSecret ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {googleOAuthStatus.hasClientSecret ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>GOOGLE_GMAIL_REDIRECT_URI</span>
                            <span className={googleOAuthStatus.hasRedirectUri ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                              {googleOAuthStatus.hasRedirectUri ? '✓ Configured' : '(Auto-resolved)'}
                            </span>
                          </div>
                        </div>
                        {googleOAuthStatus.redirectUri && (
                          <div className="text-2xs text-slate-400">
                            <strong className="text-slate-300">Google Cloud Authorized Redirect URI:</strong>
                            <code className="block mt-1 p-2 bg-slate-950 rounded tabular-nums text-2xs break-all select-all text-slate-300 border border-slate-800">
                              {googleOAuthStatus.redirectUri}
                            </code>
                          </div>
                        )}
                        <p className="text-2xs text-slate-400 pt-1">
                          Tip: The platform can use <strong>Platform Dedicated SMTP</strong> immediately below without any Google Cloud project setup.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SMTP Form */}
          {providerMode === 'smtp' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-indigo-400" />
                    SMTP Connection &amp; Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-slate-300">SMTP Host</Label>
                      <Input
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.printerp.com"
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white tabular-nums rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Port</Label>
                      <Input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white tabular-nums rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Encryption</Label>
                      <select
                        value={encryptionType}
                        onChange={(e) => setEncryptionType(e.target.value as any)}
                        className="w-full h-9 px-3 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-white"
                      >
                        <option value="tls">TLS / STARTTLS (Port 587)</option>
                        <option value="ssl">SSL (Port 465)</option>
                        <option value="none">None (Port 25)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Username</Label>
                      <Input
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        placeholder="inkflow.erp@gmail.com"
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white tabular-nums rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-300">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-2xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {showSecret ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={gateway?.encrypted_credentials ? '•••••••••••• (Encrypted on disk)' : 'Enter SMTP password'}
                      className="h-9 text-xs bg-slate-950 border-slate-800 text-white tabular-nums rounded-xl"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={testing}
                      onClick={handleTestSmtpConnection}
                      className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${testing ? 'animate-spin text-indigo-400' : ''}`} />
                      {testing ? 'Verifying...' : 'Test Connection'}
                    </Button>

                    {testResult && (
                      <span
                        className={`text-xs font-semibold flex items-center gap-1.5 ${
                          testResult.success ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {testResult.message}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
                <div>
                  <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe className="h-4 w-4 text-purple-400" />
                      Platform Sender Identity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Display Name</Label>
                      <Input
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="InkFlow Platform"
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">From Email Address</Label>
                      <Input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="inkflow.erp@gmail.com"
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-xl tabular-nums"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Reply-To Address</Label>
                      <Input
                        type="email"
                        value={replyToEmail}
                        onChange={(e) => setReplyToEmail(e.target.value)}
                        placeholder="inkflow.erp@gmail.com"
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-xl tabular-nums"
                      />
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 border-t border-slate-800 flex justify-end">
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={handleSaveSmtpGateway}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 px-4"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 2: SYSTEM TEMPLATES
         ======================================================================= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden lg:col-span-1">
            <CardHeader className="border-b border-slate-800 pb-3 bg-slate-950/40">
              <CardTitle className="text-sm font-bold text-white">System Notification Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
              {templates.map((tpl) => {
                const isSelected = selectedTemplate?.event_type === tpl.event_type
                return (
                  <button
                    key={tpl.event_type}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col gap-1 min-h-[44px] ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-md'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-semibold">{tpl.name}</span>
                      <span className={`text-2xs px-1.5 py-0.5 rounded tabular-nums ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {tpl.event_type}
                      </span>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {selectedTemplate && (
            <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden lg:col-span-2 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedTemplate.name}</h4>
                  <span className="text-2xs tabular-nums text-indigo-400">{selectedTemplate.event_type}</span>
                </div>

                <Button size="sm" onClick={handleSaveTemplate} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  <Save className="h-3 w-3 mr-1" />
                  Save Template
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Subject Line (English)</Label>
                <Input
                  value={selectedTemplate.subject_template}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject_template: e.target.value })}
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Subject Line (Bangla)</Label>
                <Input
                  value={selectedTemplate.subject_template_bn || ''}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject_template_bn: e.target.value })}
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Body Template HTML</Label>
                <textarea
                  rows={6}
                  value={selectedTemplate.body_template}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body_template: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs tabular-nums text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 3: PLATFORM TRANSMISSION LOGS
         ======================================================================= */}
      {activeTab === 'logs' && (
        <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <CardHeader className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
            <CardTitle className="text-sm font-bold text-white">Platform System Transmission Logs</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={processingQueue}
                onClick={handleProcessQueue}
                className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              >
                <Zap className="h-3 w-3 mr-1 text-amber-400" />
                {processingQueue ? 'Processing...' : 'Run Queue Worker'}
              </Button>
              <Input
                placeholder="Search recipient or subject..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="h-8 text-xs bg-slate-950 border-slate-800 text-white rounded-xl w-48"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date &amp; Scope</th>
                    <th className="py-2.5 px-4 font-semibold">Recipient</th>
                    <th className="py-2.5 px-4 font-semibold">Subject</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                        No platform transmission logs recorded yet.
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
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 tabular-nums text-2xs text-slate-400">
                            <div>{new Date(log.created_at).toLocaleDateString()}</div>
                            <span className="text-indigo-400 text-2xs">{log.event_type}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-white">{log.recipient}</td>
                          <td className="py-3 px-4 truncate max-w-xs text-slate-300">{log.subject}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              className={`text-2xs uppercase ${
                                log.status === 'sent'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : log.status === 'failed'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
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

      {/* =======================================================================
          TAB 4: EMAIL DELIVERABILITY & DNS AUTHENTICATION (SPF / DKIM / DMARC)
         ======================================================================= */}
      {activeTab === 'deliverability' && (
        <div className="space-y-6">
          {/* Domain Overview & Quick Calculator */}
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    Domain Email Authentication & Anti-Spam Setup
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-1">
                    Major email providers (Google, Microsoft 365, Yahoo) reject or spam emails lacking sender domain authentication.
                    Add these DNS TXT records to your domain provider (Cloudflare, Namecheap, GoDaddy, Route 53) to guarantee 100% inbox delivery.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-xs py-1 px-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    RFC 5322 Aligned
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Active Sending Domain</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={customDomainInput || (gateway?.sender_email || senderEmail || 'printerp.com').split('@')[1] || 'printerp.com'}
                      onChange={(e) => setCustomDomainInput(e.target.value.trim().toLowerCase())}
                      placeholder="e.g. myprintshop.com"
                      className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono"
                    />
                  </div>
                  <span className="text-2xs text-slate-500">
                    DNS records below are dynamically generated for this sending domain.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Active Provider Configuration</Label>
                  <div className="h-9 px-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-200">
                    <span className="capitalize font-medium flex items-center gap-2">
                      <Server className="h-3.5 w-3.5 text-indigo-400" />
                      {gateway?.provider?.toUpperCase() || providerMode.toUpperCase()}
                    </span>
                    <span className="text-2xs text-slate-400">
                      Sender: {gateway?.sender_email || senderEmail}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DNS Records Table & Copy Box */}
          <div className="grid grid-cols-1 gap-4">
            {/* 1. SPF Record */}
            <Card className="bg-slate-900/90 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-950 text-indigo-300 border-indigo-700/60 font-mono text-2xs">
                      TXT RECORD
                    </Badge>
                    <span className="font-bold text-sm text-white">1. SPF (Sender Policy Framework)</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const spfValue =
                        (gateway?.provider || providerMode) === 'gmail'
                          ? 'v=spf1 include:_spf.google.com ~all'
                          : `v=spf1 include:${smtpHost || 'mail.domain.com'} ~all`
                      handleCopyRecord('spf', spfValue)
                    }}
                    className="h-8 text-2xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
                  >
                    {copiedRecord === 'spf' ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Record
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Authorizes sending servers to send on behalf of your domain so Gmail/Outlook don&apos;t mark incoming mail as unauthenticated spoofing.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-3">
                    <span className="text-2xs text-slate-500 font-semibold block uppercase">Host / Name</span>
                    <span className="font-mono text-slate-200 font-bold">@ (or leave empty)</span>
                  </div>
                  <div className="sm:col-span-9">
                    <span className="text-2xs text-slate-500 font-semibold block uppercase">TXT Value / Content</span>
                    <span className="font-mono text-indigo-300 font-semibold break-all select-all">
                      {(gateway?.provider || providerMode) === 'gmail'
                        ? 'v=spf1 include:_spf.google.com ~all'
                        : `v=spf1 include:${smtpHost || 'mail.domain.com'} ~all`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. DKIM Record */}
            <Card className="bg-slate-900/90 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-950 text-purple-300 border-purple-700/60 font-mono text-2xs">
                      TXT / CNAME RECORD
                    </Badge>
                    <span className="font-bold text-sm text-white">2. DKIM (DomainKeys Identified Mail)</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const hostVal = (gateway?.provider || providerMode) === 'gmail' ? 'google._domainkey' : 'default._domainkey'
                      handleCopyRecord('dkim_host', hostVal)
                    }}
                    className="h-8 text-2xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
                  >
                    {copiedRecord === 'dkim_host' ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        Copied Host!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Host
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Cryptographically signs every outbound message so receiving servers confirm the message was not modified in transit.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-4">
                    <span className="text-2xs text-slate-500 font-semibold block uppercase">Host / Selector Name</span>
                    <span className="font-mono text-purple-300 font-bold">
                      {(gateway?.provider || providerMode) === 'gmail' ? 'google._domainkey' : 'default._domainkey'}
                    </span>
                  </div>
                  <div className="sm:col-span-8">
                    <span className="text-2xs text-slate-500 font-semibold block uppercase">Setup Instruction</span>
                    <span className="text-slate-300">
                      {(gateway?.provider || providerMode) === 'gmail'
                        ? 'Google Admin Console -> Apps -> Google Workspace -> Gmail -> Authenticate email -> Generate DKIM key.'
                        : 'Obtain your unique DKIM public key from your SMTP hosting control panel (cPanel, Postfix, SendGrid, Amazon SES) and paste as TXT.'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. DMARC Record */}
            <Card className="bg-slate-900/90 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700/60 font-mono text-2xs">
                      TXT RECORD
                    </Badge>
                    <span className="font-bold text-sm text-white">3. DMARC (Domain-based Message Authentication)</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const domain = customDomainInput || (gateway?.sender_email || senderEmail || 'printerp.com').split('@')[1] || 'printerp.com'
                      const dmarcValue = `v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:postmaster@${domain}; aspf=r; adkim=r;`
                      handleCopyRecord('dmarc', dmarcValue)
                    }}
                    className="h-8 text-2xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
                  >
                    {copiedRecord === 'dmarc' ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Record
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Enforces alignment between SPF and DKIM. Mandatory for Gmail & Yahoo 2024 deliverability guidelines.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-3">
                    <span className="text-2xs text-slate-500 font-semibold block uppercase">Host / Name</span>
                    <span className="font-mono text-slate-200 font-bold">_dmarc</span>
                  </div>
                  <div className="sm:col-span-9">
                    <span className="text-2xs text-slate-500 font-semibold block uppercase">TXT Value / Content</span>
                    <span className="font-mono text-emerald-300 font-semibold break-all select-all">
                      {`v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:postmaster@${customDomainInput || (gateway?.sender_email || senderEmail || 'printerp.com').split('@')[1] || 'printerp.com'}; aspf=r; adkim=r;`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engine Anti-Spam Protections Overview */}
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Active Built-in Engine Deliverability Protections
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                The platform automatically injects these technical standards into every email dispatched:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">RFC 5322 Domain-Aligned Message-ID</strong>
                    <span className="text-2xs text-slate-400">
                      Message-IDs are generated dynamically matching your sending domain, preventing domain spoofing flags.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">Multipart/Alternative Plaintext Fallback</strong>
                    <span className="text-2xs text-slate-400">
                      Every email includes both HTML and a clean, link-preserved text part, eliminating the MIME_HTML_ONLY spam penalty.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">Transactional Classification Headers</strong>
                    <span className="text-2xs text-slate-400">
                      Injects Auto-Submitted: auto-generated and X-Auto-Response-Suppress: All for Microsoft Exchange & Gmail loops.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">RFC 8058 One-Click Unsubscribe</strong>
                    <span className="text-2xs text-slate-400">
                      Provides legitimate unsubscribe headers to satisfy 2024 Google & Yahoo bulk and transactional sender requirements.
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Email Modal */}
      {isTestModalOpen && (
        <ModalDialog
          open={isTestModalOpen}
          onOpenChange={(open) => setIsTestModalOpen(open)}
          title="Send Platform Test Email"
          description="Send a verification test message using the configured platform gateway."
          hideFooter={true}
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recipient Email</Label>
              <Input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="admin@printerp.com"
                className="h-10 text-xs tabular-nums text-slate-900 bg-white border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              Provider: <strong className="text-slate-900 dark:text-white capitalize">{gateway?.provider || 'Platform Provider'}</strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setIsTestModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={sendingTestEmail || !testRecipient}
                onClick={handleSendTestEmail}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-xs"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {sendingTestEmail ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}

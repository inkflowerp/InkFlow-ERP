'use client'

// ==============================================================================
// PrintERP SaaS - Platform Owner Email Gateway Hub
// Location: Platform Admin Panel -> Settings -> Communication -> Email Gateway
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
  Info,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import {
  getPlatformEmailGatewayAction,
  savePlatformEmailGatewayAction,
  testPlatformEmailGatewayAction,
  getPlatformEmailTemplatesAction,
  savePlatformEmailTemplateAction,
  getPlatformEmailLogsAction,
  processEmailQueueAction,
} from '@/actions/email-gateway.actions'
import {
  EmailGatewayRecord,
  EmailGatewayFormData,
  EmailProviderType,
  EmailTemplateRecord,
  EmailLogRecord,
} from '@/types/communication.types'
import { interpolateVariables, wrapHtmlEmail } from '@/services/email-template.service'

const PROVIDER_OPTIONS: Array<{
  id: EmailProviderType
  name: string
  tagline: string
  icon: string
  popular?: boolean
}> = [
  {
    id: 'smtp',
    name: 'Custom SMTP Server',
    tagline: 'Connect any standard SMTP host (Postfix, Sendmail, Google Workspace, Office 365)',
    icon: 'server',
    popular: true,
  },
  {
    id: 'resend',
    name: 'Resend Cloud API',
    tagline: 'Developer-first email delivery platform with 99.9% inbox placement',
    icon: 'zap',
    popular: true,
  },
  {
    id: 'sendgrid',
    name: 'Twilio SendGrid v3',
    tagline: 'High-volume enterprise email API with marketing and transactional pipelines',
    icon: 'layers',
  },
  {
    id: 'ses',
    name: 'Amazon Simple Email Service (SES)',
    tagline: 'Cost-effective scalable cloud email service with AWS region integration',
    icon: 'globe',
  },
  {
    id: 'mock',
    name: 'Simulated Mock Provider (Sandbox)',
    tagline: 'Instant dry-run simulated delivery for testing without live SMTP credentials',
    icon: 'sparkles',
  },
]

export default function PlatformEmailGatewayPage() {
  const [activeTab, setActiveTab] = useState<'gateway' | 'templates' | 'logs'>('gateway')
  const [gateway, setGateway] = useState<EmailGatewayRecord | null>(null)
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [logs, setLogs] = useState<EmailLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [processingQueue, setProcessingQueue] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  // Form State
  const [provider, setProvider] = useState<EmailProviderType>('smtp')
  const [smtpHost, setSmtpHost] = useState('smtp.example.com')
  const [smtpPort, setSmtpPort] = useState(587)
  const [encryptionType, setEncryptionType] = useState<'ssl' | 'tls' | 'starttls' | 'none'>('tls')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [senderName, setSenderName] = useState('PrintERP Notifications')
  const [senderEmail, setSenderEmail] = useState('notifications@printerp.com')
  const [replyToEmail, setReplyToEmail] = useState('support@printerp.com')
  const [awsRegion, setAwsRegion] = useState('ap-south-1')
  const [sesConfigSet, setSesConfigSet] = useState('')

  // Toast & Modal State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testRecipient, setTestRecipient] = useState('admin@printerp.com')
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
      const [gwRes, tplRes, logsRes] = await Promise.all([
        getPlatformEmailGatewayAction(),
        getPlatformEmailTemplatesAction(),
        getPlatformEmailLogsAction(),
      ])

      if (gwRes.success && gwRes.data) {
        setGateway(gwRes.data)
        setProvider(gwRes.data.provider)
        setSmtpHost(gwRes.data.smtp_host || '')
        setSmtpPort(gwRes.data.smtp_port || 587)
        setEncryptionType(gwRes.data.encryption_type || 'tls')
        setSmtpUsername(gwRes.data.smtp_username || '')
        setSenderName(gwRes.data.sender_name || 'PrintERP Notifications')
        setSenderEmail(gwRes.data.sender_email || 'notifications@printerp.com')
        setReplyToEmail(gwRes.data.reply_to_email || 'support@printerp.com')
        if (gwRes.data.extra_settings?.aws_region) {
          setAwsRegion(gwRes.data.extra_settings.aws_region)
        }
        if (gwRes.data.extra_settings?.ses_config_set) {
          setSesConfigSet(gwRes.data.extra_settings.ses_config_set)
        }
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
  }, [])

  const handleSaveGateway = async () => {
    setSaving(true)
    const payload: EmailGatewayFormData = {
      provider,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_username: smtpUsername,
      password: password || undefined,
      api_key: apiKey || undefined,
      encryption_type: encryptionType,
      sender_name: senderName,
      sender_email: senderEmail,
      reply_to_email: replyToEmail,
      aws_region: awsRegion,
      ses_config_set: sesConfigSet,
      status: 'active',
      is_default: true,
    }

    const res = await savePlatformEmailGatewayAction(payload)
    if (res.success && res.data) {
      setGateway(res.data)
      setPassword('')
      setApiKey('')
      showNotification('Platform Default Email Gateway saved and encrypted with AES-256-GCM.', 'success')
    } else {
      showNotification(res.error || 'Failed to save gateway settings', 'error')
    }
    setSaving(false)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)

    const payload: EmailGatewayFormData = {
      provider,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_username: smtpUsername,
      password: password || gateway?.encrypted_credentials || undefined,
      api_key: apiKey || gateway?.encrypted_credentials || undefined,
      encryption_type: encryptionType,
      sender_name: senderName,
      sender_email: senderEmail,
      reply_to_email: replyToEmail,
      aws_region: awsRegion,
      ses_config_set: sesConfigSet,
    }

    const res = await testPlatformEmailGatewayAction(payload)
    setTestResult(res)
    setTesting(false)
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
      {/* Platform Settings Navigation Tabs */}
      <PlatformSettingsNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Mail className="h-7 w-7 text-indigo-400" />
            Email Gateway & Communication Infrastructure
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global delivery engine, multi-provider abstraction (SMTP, Resend, SendGrid, Amazon SES), encrypted credentials, and automated workflow triggers.
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

          <Button
            size="sm"
            disabled={saving}
            onClick={handleSaveGateway}
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Configuration'}
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
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'gateway'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Server className="h-3.5 w-3.5" />
          Gateway Provider Configuration
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'templates'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Default System Templates ({templates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Transmission Logs &amp; Queue ({logs.length})
        </button>
      </div>

      {/* =======================================================================
          TAB 1: GATEWAY PROVIDER CONFIGURATION
         ======================================================================= */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          {/* Status & Telemetry Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-slate-900/90 border-slate-800 p-4 border-l-4 border-l-indigo-500">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Active Provider
              </span>
              <div className="text-lg font-bold text-white capitalize flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {provider.toUpperCase()} Gateway
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                AES-256-GCM Encrypted
              </span>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800 p-4 border-l-4 border-l-emerald-500">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Connection Status
              </span>
              <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {gateway?.last_test_status?.toUpperCase() || 'HEALTHY'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Last Tested: {gateway?.last_tested_at ? new Date(gateway.last_tested_at).toLocaleTimeString() : 'Ready'}
              </span>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800 p-4 border-l-4 border-l-purple-500">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                System Sender
              </span>
              <div className="text-xs font-bold text-slate-200 truncate mt-1">
                {senderEmail}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block truncate">
                Display: {senderName}
              </span>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800 p-4 border-l-4 border-l-amber-500">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Tenant Inheritance
              </span>
              <div className="text-lg font-bold text-amber-400">
                Zero-Config Active
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Tenants fallback to platform default
              </span>
            </Card>
          </div>

          {/* Provider Selection Cards */}
          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
              <CardTitle className="text-base font-bold text-white">Select Default Email Provider Adapter</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Choose the primary transport architecture used to dispatch transactional communications.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {PROVIDER_OPTIONS.map((opt) => {
                  const isSelected = provider === opt.id
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setProvider(opt.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-sm text-white">{opt.name}</h4>
                          {opt.popular && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{opt.tagline}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <span className="font-mono text-[10px] text-slate-500">adapter: {opt.id}</span>
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-indigo-500 bg-indigo-600' : 'border-slate-700'
                          }`}
                        >
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white block" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Provider Specific Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Credentials & Transport Settings */}
            <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-400" />
                  Provider Connection &amp; Authentication
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Credentials are encrypted in PostgreSQL using AES-256-GCM.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* SMTP Form */}
                {(provider === 'smtp' || provider === 'custom') && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-slate-300">SMTP Host / Server</Label>
                        <Input
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.gmail.com / smtp.mailgun.org"
                          className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-300">Port</Label>
                        <Input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-300">Encryption Protocol</Label>
                        <select
                          value={encryptionType}
                          onChange={(e) => setEncryptionType(e.target.value as any)}
                          className="w-full h-9 px-3 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-white"
                        >
                          <option value="tls">TLS / STARTTLS (Port 587)</option>
                          <option value="ssl">SSL (Port 465)</option>
                          <option value="none">None / Unencrypted (Port 25)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-300">SMTP Username / Account</Label>
                        <Input
                          value={smtpUsername}
                          onChange={(e) => setSmtpUsername(e.target.value)}
                          placeholder="user@domain.com / apikey"
                          className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">SMTP Password</Label>
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
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
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                      />
                    </div>
                  </>
                )}

                {/* Resend / SendGrid Form */}
                {(provider === 'resend' || provider === 'sendgrid') && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">
                          {provider === 'resend' ? 'Resend API Key (re_...)' : 'SendGrid API Key (SG....)'}
                        </Label>
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {showSecret ? 'Hide' : 'Reveal'}
                        </button>
                      </div>
                      <Input
                        type={showSecret ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={
                          gateway?.encrypted_credentials
                            ? '•••••••••••• (Encrypted on disk)'
                            : provider === 'resend'
                            ? 're_123456789...'
                            : 'SG.xxxxxxxxxxxx...'
                        }
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Keys are validated via authorization handshake before storing.
                    </p>
                  </div>
                )}

                {/* SES Form */}
                {provider === 'ses' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-300">AWS Region</Label>
                        <Input
                          value={awsRegion}
                          onChange={(e) => setAwsRegion(e.target.value)}
                          placeholder="ap-south-1 (Mumbai)"
                          className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-300">Configuration Set (Optional)</Label>
                        <Input
                          value={sesConfigSet}
                          onChange={(e) => setSesConfigSet(e.target.value)}
                          placeholder="printerp-email-events"
                          className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">SES SMTP Username</Label>
                      <Input
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">SES SMTP Password</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter AWS SES SMTP credentials"
                        className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Mock Form */}
                {provider === 'mock' && (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold">
                      <Sparkles className="h-4 w-4" />
                      Mock Sandbox Delivery Mode
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      All transactional emails will be recorded to the database and simulated locally with sub-millisecond response time. No external network credentials required.
                    </p>
                  </div>
                )}

                {/* Connection Test Trigger */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={testing}
                    onClick={handleTestConnection}
                    className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${testing ? 'animate-spin text-indigo-400' : ''}`} />
                    {testing ? 'Verifying Handshake...' : 'Test Connection'}
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

            {/* Right: Sender Identity & Default Addresses */}
            <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-400" />
                  System Sender Identity &amp; Routing
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Addresses displayed to recipients on system vouchers and alerts.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">From / Display Name</Label>
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="PrintERP Support"
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-xl"
                  />
                  <span className="text-[10px] text-slate-500">Example: PrintERP Notifications / Vision Sign BD</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">From Email Address</Label>
                  <Input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="notifications@printerp.com"
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-xl font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Must be authorized in SPF/DKIM DNS records</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Reply-To Email Address</Label>
                  <Input
                    type="email"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    placeholder="support@printerp.com"
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-xl font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Where customer direct replies will be routed</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Preview Header</div>
                  <div className="font-mono text-xs text-slate-200">
                    &quot;{senderName}&quot; &lt;{senderEmail}&gt;
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 2: DEFAULT SYSTEM TEMPLATES
         ======================================================================= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List Sidebar */}
          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl lg:col-span-1">
            <CardHeader className="border-b border-slate-800 pb-3 bg-slate-950/40">
              <CardTitle className="text-sm font-bold text-white">System Templates</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                15 pre-seeded workflow notification formats.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
              {templates.map((tpl) => {
                const isSelected = selectedTemplate?.event_type === tpl.event_type
                return (
                  <button
                    key={tpl.event_type}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-md'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-semibold">{tpl.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tpl.event_type}
                      </span>
                    </div>
                    <span className={`text-[11px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {tpl.subject_template}
                    </span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Template Editor & Live Preview */}
          {selectedTemplate && (
            <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl lg:col-span-2 flex flex-col">
              <CardHeader className="border-b border-slate-800 pb-3 bg-slate-950/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white">{selectedTemplate.name}</CardTitle>
                  <CardDescription className="text-xs font-mono text-indigo-400">
                    event: {selectedTemplate.event_type}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPreviewLang('en')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                        previewLang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewLang('bn')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                        previewLang === 'bn' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>

                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={handleSaveTemplate}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save Template
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4 flex-1">
                {/* Variable Chips */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Available Template Variables:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.variables.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300 font-semibold cursor-copy"
                        title={`Click to copy {{${v}}}`}
                        onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Subject Template */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    Subject Line Template ({previewLang === 'en' ? 'English' : 'বাংলা'})
                  </Label>
                  <Input
                    value={
                      previewLang === 'en'
                        ? selectedTemplate.subject_template
                        : selectedTemplate.subject_template_bn || selectedTemplate.subject_template
                    }
                    onChange={(e) => {
                      if (previewLang === 'en') {
                        setSelectedTemplate({ ...selectedTemplate, subject_template: e.target.value })
                      } else {
                        setSelectedTemplate({ ...selectedTemplate, subject_template_bn: e.target.value })
                      }
                    }}
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                  />
                </div>

                {/* HTML Body Editor */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    HTML Body Template ({previewLang === 'en' ? 'English' : 'বাংলা'})
                  </Label>
                  <textarea
                    rows={8}
                    value={
                      previewLang === 'en'
                        ? selectedTemplate.body_template
                        : selectedTemplate.body_template_bn || selectedTemplate.body_template
                    }
                    onChange={(e) => {
                      if (previewLang === 'en') {
                        setSelectedTemplate({ ...selectedTemplate, body_template: e.target.value })
                      } else {
                        setSelectedTemplate({ ...selectedTemplate, body_template_bn: e.target.value })
                      }
                    }}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Live HTML Preview Box */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Live Rendered Preview</span>
                    <span className="text-emerald-400">Interpolation: Active</span>
                  </div>
                  <div
                    className="p-4 rounded-lg bg-white text-slate-900 text-xs shadow-inner max-h-56 overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html: wrapHtmlEmail(
                        interpolateVariables(
                          previewLang === 'en'
                            ? selectedTemplate.body_template
                            : selectedTemplate.body_template_bn || selectedTemplate.body_template,
                          {
                            customer_name: 'Habibullah Printing Solutions',
                            company_name: 'PrintERP Express BD',
                            quotation_number: 'QT-2026-0819',
                            invoice_number: 'INV-2026-0412',
                            amount: '35,000',
                            total_amount: '35,000',
                            paid_amount: '20,000',
                            due_amount: '15,000',
                            valid_until: '28-Sep-2026',
                            job_number: 'JOB-9921',
                            item_name: 'Backlit Flex Banner 20x10 ft',
                            view_link: '#',
                            payment_link: '#',
                            proof_link: '#',
                          }
                        ),
                        { companyName: 'PrintERP Express BD' }
                      ),
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 3: TRANSMISSION LOGS & ASYNC QUEUE
         ======================================================================= */}
      {activeTab === 'logs' && (
        <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <CardHeader className="border-b border-slate-800 pb-3 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-white">Platform Email Transmission Logs</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Non-destructive audit records and delivery telemetry.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={processingQueue}
                onClick={handleProcessQueue}
                className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
              >
                <Zap className={`h-3 w-3 mr-1 text-amber-400 ${processingQueue ? 'animate-spin' : ''}`} />
                {processingQueue ? 'Processing...' : 'Run Queue Worker'}
              </Button>

              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter logs..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp &amp; Event</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Provider / ID</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No email transmission logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs
                    .filter(
                      (l) =>
                        !logSearch ||
                        l.recipient.toLowerCase().includes(logSearch.toLowerCase()) ||
                        l.subject.toLowerCase().includes(logSearch.toLowerCase()) ||
                        l.event_type.toLowerCase().includes(logSearch.toLowerCase())
                    )
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-indigo-400 font-semibold">{log.event_type}</div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-white">{log.recipient}</td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">{log.subject}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {log.provider_message_id || 'simulated'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'sent'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : log.status === 'queued'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {log.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* =======================================================================
          MODAL: TEST EMAIL DISPATCH
         ======================================================================= */}
      <ModalDialog
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        title="Send Gateway Test Email"
        description="Dispatch a live sample notification using current gateway configuration."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Destination Test Email Address</Label>
            <Input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="admin@printerp.com"
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="text-[11px] font-bold text-indigo-400 uppercase">Provider Route</div>
            <div>
              Active Transport: <span className="font-mono text-white font-bold">{provider.toUpperCase()}</span>
            </div>
            <div>
              Sender: <span className="font-mono text-slate-400">{senderName} &lt;{senderEmail}&gt;</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTestModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={sendingTestEmail || !testRecipient}
              onClick={async () => {
                setSendingTestEmail(true)
                const payload: EmailGatewayFormData = {
                  provider,
                  smtp_host: smtpHost,
                  smtp_port: smtpPort,
                  smtp_username: smtpUsername,
                  password: password || undefined,
                  api_key: apiKey || undefined,
                  encryption_type: encryptionType,
                  sender_name: senderName,
                  sender_email: senderEmail,
                  reply_to_email: replyToEmail,
                }
                const res = await testPlatformEmailGatewayAction(payload)
                if (res.success) {
                  showNotification(`Test message dispatched successfully to ${testRecipient}!`, 'success')
                  setIsTestModalOpen(false)
                } else {
                  showNotification(res.message || 'Failed to dispatch test message', 'error')
                }
                setSendingTestEmail(false)
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sendingTestEmail ? 'Sending...' : 'Send Test Message'}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </div>
  )
}

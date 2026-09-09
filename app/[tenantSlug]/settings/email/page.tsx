'use client'

// ==============================================================================
// PrintERP SaaS - Tenant Business Email Gateway Settings
// Location: Tenant Dashboard -> Settings -> Email Gateway
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
  deleteTenantEmailGatewayAction,
  testTenantEmailGatewayAction,
  sendTestTenantEmailAction,
  getTenantEmailTemplatesAction,
  saveTenantEmailTemplateAction,
  getTenantEmailLogsAction,
} from '@/actions/email-gateway.actions'
import {
  EmailGatewayRecord,
  EmailGatewayFormData,
  EmailProviderType,
  EmailTemplateRecord,
  EmailLogRecord,
} from '@/types/communication.types'
import { interpolateVariables, wrapHtmlEmail } from '@/services/email-template.service'

const TENANT_PROVIDER_OPTIONS: Array<{
  id: EmailProviderType
  name: string
  tagline: string
  popular?: boolean
}> = [
  {
    id: 'smtp',
    name: 'Custom SMTP Host',
    tagline: 'Connect your corporate domain SMTP (cPanel, Google Workspace, Office 365, Zoho)',
    popular: true,
  },
  {
    id: 'resend',
    name: 'Resend API',
    tagline: 'Direct cloud API key integration for fast transactional deliveries',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid API',
    tagline: 'Twilio SendGrid v3 Mail Send API with high deliverability',
  },
  {
    id: 'ses',
    name: 'Amazon SES',
    tagline: 'Dedicated AWS Simple Email Service with custom region',
  },
]

export default function TenantEmailSettingsPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const companyId = company?.id || ''

  const [activeTab, setActiveTab] = useState<'gateway' | 'templates' | 'logs'>('gateway')
  const [gateway, setGateway] = useState<EmailGatewayRecord | null>(null)
  const [usingPlatformDefault, setUsingPlatformDefault] = useState(true)
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [logs, setLogs] = useState<EmailLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  // Form State
  const [useCustomGateway, setUseCustomGateway] = useState(false)
  const [provider, setProvider] = useState<EmailProviderType>('smtp')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(587)
  const [encryptionType, setEncryptionType] = useState<'ssl' | 'tls' | 'starttls' | 'none'>('tls')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [senderName, setSenderName] = useState(company?.name || 'Printing Team')
  const [senderEmail, setSenderEmail] = useState(company?.email || 'billing@domain.com')
  const [replyToEmail, setReplyToEmail] = useState(company?.email || 'billing@domain.com')
  const [awsRegion, setAwsRegion] = useState('ap-south-1')

  // Notification & Modal State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testRecipient, setTestRecipient] = useState(company?.email || 'customer@example.com')
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  // Template Editing State
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateRecord | null>(null)
  const [templateLang, setTemplateLang] = useState<'en' | 'bn'>('bn')
  const [logSearch, setLogSearch] = useState('')

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4500)
  }

  const loadTenantData = async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [gwRes, tplRes, logsRes] = await Promise.all([
        getTenantEmailGatewayAction(companyId),
        getTenantEmailTemplatesAction(companyId),
        getTenantEmailLogsAction(companyId),
      ])

      if (gwRes.success) {
        if (gwRes.customGateway) {
          setGateway(gwRes.customGateway)
          setUseCustomGateway(true)
          setUsingPlatformDefault(false)
          setProvider(gwRes.customGateway.provider)
          setSmtpHost(gwRes.customGateway.smtp_host || '')
          setSmtpPort(gwRes.customGateway.smtp_port || 587)
          setEncryptionType(gwRes.customGateway.encryption_type || 'tls')
          setSmtpUsername(gwRes.customGateway.smtp_username || '')
          setSenderName(gwRes.customGateway.sender_name || company?.name || '')
          setSenderEmail(gwRes.customGateway.sender_email || company?.email || '')
          setReplyToEmail(gwRes.customGateway.reply_to_email || company?.email || '')
        } else {
          setUseCustomGateway(false)
          setUsingPlatformDefault(true)
          setSenderName(company?.name || 'Printing Team')
          setSenderEmail(company?.email || '')
          setReplyToEmail(company?.email || '')
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
    loadTenantData()
  }, [companyId])

  const handleSaveTenantGateway = async () => {
    if (!companyId) return
    setSaving(true)

    if (!useCustomGateway) {
      // Revert to platform default
      const res = await deleteTenantEmailGatewayAction(companyId)
      if (res.success) {
        setGateway(null)
        setUsingPlatformDefault(true)
        showNotification('Settings updated: Now using Platform Default Gateway.', 'success')
      } else {
        showNotification(res.error || 'Failed to revert gateway', 'error')
      }
      setSaving(false)
      return
    }

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
      status: 'active',
      is_default: true,
    }

    const res = await saveTenantEmailGatewayAction(companyId, payload)
    if (res.success && res.data) {
      setGateway(res.data)
      setUsingPlatformDefault(false)
      setPassword('')
      setApiKey('')
      showNotification('Custom Business Email Gateway saved and active.', 'success')
    } else {
      showNotification(res.error || 'Failed to save gateway', 'error')
    }
    setSaving(false)
  }

  const handleTestConnection = async () => {
    if (!companyId) return
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
        titleEn="Email Gateway & Customer Notifications"
        titleBn="ইমেইল গেটওয়ে ও স্বয়ংক্রিয় বার্তা"
        descriptionEn="Configure corporate email sending, customize bilingual invoice templates, and inspect delivery logs."
        descriptionBn="প্রতিষ্ঠান ইমেইল গেটওয়ে কনফিগারেশন, বাংলা ইনভয়েস টেমপ্লেট কাস্টমাইজেশন এবং ডেলিভারি লগ।"
        icon={Mail}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTestModalOpen(true)}
              className="text-xs"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Send Test Email', 'টেস্ট ইমেইল পাঠান')}
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleSaveTenantGateway}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Save Settings', 'সংরক্ষণ করুন')}
            </Button>
          </div>
        }
      />

      <SettingsNav />

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
            activeTab === 'gateway'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Server className="h-4 w-4" />
          {tBilingual('Email Gateway Mode', 'ইমেইল গেটওয়ে মোড')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          {tBilingual('Delivery History', 'ডেলিভারি হিস্ট্রি')} ({logs.length})
        </button>
      </div>

      {/* =======================================================================
          TAB 1: GATEWAY CONFIGURATION
         ======================================================================= */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          {/* Active Mode Card */}
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {useCustomGateway ? 'Custom Business Email Gateway Active' : 'Using Platform Default Email Gateway'}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {useCustomGateway
                      ? 'Emails are routed through your dedicated business credentials.'
                      : 'All customer quotations, invoices, and job notices are delivered seamlessly via PrintERP verified platform pool.'}
                  </CardDescription>
                </div>

                <Badge
                  className={`text-[10px] uppercase ${
                    useCustomGateway
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}
                >
                  {useCustomGateway ? 'Custom Gateway' : 'Platform Default (Zero-Config)'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                    {tBilingual('Enable Custom Business Email Gateway (BYO SMTP / API)', 'কাস্টম বিজনেস ইমেইল গেটওয়ে চালু করুন')}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {tBilingual(
                      'Turn on to send customer emails from your own domain (e.g. billing@yourcompany.com).',
                      'আপনার নিজস্ব ডোমেইন ইমেইল ব্যবহার করে বার্তা পাঠাতে এটি অন করুন।'
                    )}
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={useCustomGateway}
                  onChange={(e) => setUseCustomGateway(e.target.checked)}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Gateway Setup Form */}
          {useCustomGateway && (
            <div className="space-y-6">
              {/* Provider Selection */}
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm">Select Email Provider</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {TENANT_PROVIDER_OPTIONS.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => setProvider(opt.id)}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          provider === opt.id
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{opt.name}</span>
                            {provider === opt.id && <Check className="h-3.5 w-3.5 text-blue-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">{opt.tagline}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Server Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-sm">Server Authentication</CardTitle>
                    <CardDescription className="text-xs">
                      Credentials are encrypted and stored safely.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3.5">
                    {provider === 'smtp' && (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">SMTP Host</Label>
                            <Input
                              value={smtpHost}
                              onChange={(e) => setSmtpHost(e.target.value)}
                              placeholder="mail.yourcompany.com"
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Port</Label>
                            <Input
                              type="number"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(Number(e.target.value))}
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Encryption</Label>
                            <select
                              value={encryptionType}
                              onChange={(e) => setEncryptionType(e.target.value as any)}
                              className="w-full h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                            >
                              <option value="tls">TLS / STARTTLS (587)</option>
                              <option value="ssl">SSL (465)</option>
                              <option value="none">Plain / None (25)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Username / Email</Label>
                            <Input
                              value={smtpUsername}
                              onChange={(e) => setSmtpUsername(e.target.value)}
                              placeholder="billing@yourcompany.com"
                              className="h-9 text-xs font-mono"
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
                            placeholder={gateway ? '•••••••••••• (Encrypted on file)' : 'Enter password'}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      </>
                    )}

                    {(provider === 'resend' || provider === 'sendgrid') && (
                      <div className="space-y-1">
                        <Label className="text-xs">API Secret Key</Label>
                        <Input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="API Secret Key"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    )}

                    {/* Test Connection Button */}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={testing}
                        onClick={handleTestConnection}
                        className="text-xs h-8"
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

                {/* Sender Identity */}
                <Card>
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-sm">Business Sender Identity</CardTitle>
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
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">From Email</Label>
                      <Input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="billing@visionsignbd.com"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Reply-To Email</Label>
                      <Input
                        type="email"
                        value={replyToEmail}
                        onChange={(e) => setReplyToEmail(e.target.value)}
                        placeholder="support@visionsignbd.com"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-0.5 ${
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
              <div className="flex items-center justify-between pb-3 border-b">
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

                  <Button size="sm" onClick={handleSaveTemplate} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                    <Save className="h-3 w-3 mr-1" />
                    Save Template
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
                  className="h-9 text-xs"
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
          <CardHeader className="pb-3 border-b flex justify-between items-center">
            <CardTitle className="text-sm">Tenant Email Delivery History</CardTitle>
            <div className="w-56">
              <Input
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
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
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No email transmissions logged yet.
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
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-blue-600 font-semibold">{log.event_type}</span>
                          <span className="text-[10px] text-slate-400 block">{new Date(log.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">{log.recipient}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-700 dark:text-slate-300">{log.subject}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            className={`text-[10px] ${
                              log.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'queued'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Test Email Modal */}
      <ModalDialog
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        title="Send Test Email"
        description="Verify delivery of a test notification to your email inbox."
      >
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Destination Email</Label>
            <Input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="you@domain.com"
              className="h-9 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsTestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={sendingTestEmail || !testRecipient}
              onClick={handleSendTestEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sendingTestEmail ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </div>
  )
}

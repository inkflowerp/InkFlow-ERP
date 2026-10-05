'use client'

// ==============================================================================
// PrintFlow SaaS - Platform Owner Email Gateway Hub
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
import { interpolateVariables } from '@/lib/email/interpolate'

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
 const [senderName, setSenderName] = useState('PrintFlow Platform')
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
 setSenderName(gwRes.data.sender_name || 'PrintFlow Platform')
 setSenderEmail(gwRes.data.sender_email || 'inkflow.erp@gmail.com')
 setReplyToEmail(gwRes.data.reply_to_email || 'inkflow.erp@gmail.com')
 } else {
 setGateway(null)
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
 setGateway(null)
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
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <Mail className="h-7 w-7 text-primary" />
 Platform Email Infrastructure
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 Manage email templates, client notices, receipts, and alert messages.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={loadData}
 className="h-9 text-xs border-border bg-card text-muted-foreground hover:bg-muted"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 Refresh
 </Button>

 <Button
 size="sm"
 onClick={() => setIsTestModalOpen(true)}
 className="h-9 text-xs bg-success hover:bg-success text-foreground font-semibold shadow-xs"
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
 ? 'bg-success-surface border-success/30 text-success'
 : 'bg-destructive/10 border-destructive/30 text-destructive'
 }`}
 >
 <Info className="h-4 w-4 shrink-0" />
 <span>{notification.message}</span>
 </div>
 )}

 {/* Navigation Tabs */}
 <div className="flex items-center gap-1.5 p-1.5 bg-card border border-border rounded-xl overflow-x-auto">
 <button
 type="button"
 onClick={() => setActiveTab('gateway')}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-11 ${
 activeTab === 'gateway'
 ? 'bg-primary text-foreground shadow-md'
 : 'text-muted-foreground hover:text-primary-foreground hover:bg-muted'
 }`}
 >
 <Server className="h-3.5 w-3.5" />
 Platform Email Provider
 </button>

 <button
 type="button"
 onClick={() => setActiveTab('templates')}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-11 ${
 activeTab === 'templates'
 ? 'bg-primary text-foreground shadow-md'
 : 'text-muted-foreground hover:text-primary-foreground hover:bg-muted'
 }`}
 >
 <FileText className="h-3.5 w-3.5" />
 System Templates ({templates.length})
 </button>

 <button
 type="button"
 onClick={() => setActiveTab('logs')}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-11 ${
 activeTab === 'logs'
 ? 'bg-primary text-foreground shadow-md'
 : 'text-muted-foreground hover:text-primary-foreground hover:bg-muted'
 }`}
 >
 <Clock className="h-3.5 w-3.5" />
 Platform Transmission Logs ({logs.length})
 </button>

 <button
 type="button"
 onClick={() => setActiveTab('deliverability')}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-11 ${
 activeTab === 'deliverability'
 ? 'bg-primary text-foreground shadow-md'
 : 'text-muted-foreground hover:text-primary-foreground hover:bg-muted'
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
 <Card className="bg-card border-border p-4 border-l-4 border-l-indigo-500">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
 Active Provider
 </span>
 <div className="text-lg font-bold text-foreground capitalize flex items-center gap-2">
 <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
 {gateway?.provider?.toUpperCase() || 'SMTP'} Gateway
 </div>
 <span className="text-xs text-muted-foreground mt-1 block">
 AES-256-GCM Encrypted
 </span>
 </Card>

 <Card className="bg-card border-border p-4 border-l-4 border-l-emerald-500">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
 Status
 </span>
 <div className="text-lg font-bold text-success flex items-center gap-1.5">
 <CheckCircle2 className="h-4 w-4" />
 {gateway?.last_test_status?.toUpperCase() || 'READY'}
 </div>
 <span className="text-xs text-muted-foreground mt-1 block">
 Last Tested: {gateway?.last_tested_at ? formatTime(gateway.last_tested_at) : 'Active'}
 </span>
 </Card>

 <Card className="bg-card border-border p-4 border-l-4 border-l-purple-500">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
 Platform Sender
 </span>
 <div className="text-xs font-bold text-foreground truncate mt-1">
 {gateway?.sender_email || senderEmail}
 </div>
 <span className="text-xs text-muted-foreground mt-1 block truncate">
 Display: {gateway?.sender_name || senderName}
 </span>
 </Card>
 </div>

 {/* Deliverability & Anti-Spam Tip Banner */}
 <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
 <div className="flex items-start gap-3">
 <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0 mt-0.5">
 <ShieldCheck className="h-5 w-5" />
 </div>
 <div>
 <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
 Spam Prevention & DNS Authentication Active
 <Badge variant="outline" className="text-xs bg-success-surface text-success border-success/30">
 RFC 5322 Aligned
 </Badge>
 </h4>
 <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
 Every outgoing email is injected with domain-aligned Message-IDs, multipart plain-text fallback, and anti-spam suppression headers. Configure your SPF, DKIM, and DMARC DNS records to ensure 100% inbox delivery.
 </p>
 </div>
 </div>
 <Button
 size="sm"
 variant="outline"
 onClick={() => setActiveTab('deliverability')}
 className="text-xs shrink-0 border-primary/20 bg-primary/10 hover:bg-primary/90 text-primary"
 >
 <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
 View DNS Records
 </Button>
 </div>

 {/* Provider Mode Selection */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div
 onClick={() => setProviderMode('gmail')}
 className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
 providerMode === 'gmail'
 ? 'bg-primary/10 border-primary/20 shadow-xs'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div>
 <div className="flex items-center justify-between mb-1">
 <span className="font-bold text-sm text-foreground">Gmail (Google OAuth 2.0)</span>
 {providerMode === 'gmail' && <Check className="h-4 w-4 text-primary" />}
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 Connect official PrintFlow platform Google Workspace or Gmail account for OAuth 2.0 authenticated system delivery.
 </p>
 </div>
 <div className="mt-3 text-xs tabular-nums text-muted-foreground">
 Scope: Platform Global Email
 </div>
 </div>

 <div
 onClick={() => setProviderMode('smtp')}
 className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
 providerMode === 'smtp'
 ? 'bg-primary/10 border-primary/20 shadow-xs'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div>
 <div className="flex items-center justify-between mb-1">
 <span className="font-bold text-sm text-foreground">Platform Dedicated SMTP</span>
 {providerMode === 'smtp' && <Check className="h-4 w-4 text-primary" />}
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 Configure corporate SMTP host for platform registration, OTPs, password resets, and system notices.
 </p>
 </div>
 <div className="mt-3 text-xs tabular-nums text-muted-foreground">
 Scope: Platform Global Email
 </div>
 </div>
 </div>

 {/* Gmail Form */}
 {providerMode === 'gmail' && (
 <Card className="bg-card border-border rounded-2xl overflow-hidden">
 <CardHeader className="border-b border-border pb-3.5 bg-card">
 <CardTitle className="text-base font-bold text-foreground">Google Gmail API Connection</CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Connect Platform Google Account for zero-password OAuth 2.0 system message delivery.
 </CardDescription>
 </CardHeader>
 <CardContent className="p-6">
 {gateway?.provider === 'gmail' && gateway.status === 'active' ? (
 <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-full bg-success text-foreground flex items-center justify-center font-bold text-sm">
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
 onClick={() => setIsTestModalOpen(true)}
 className="text-xs border-border bg-card text-foreground"
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
 <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
 <Mail className="h-6 w-6" />
 </div>
 <h3 className="font-bold text-sm text-foreground">Connect Platform Gmail Account</h3>
 <p className="text-xs text-muted-foreground">
 Authorize PrintFlow to send platform authentication emails and billing receipts using Google OAuth.
 </p>
 </div>

 <Button
 size="lg"
 onClick={handleConnectGmail}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-11 px-6 shadow-xs"
 >
 <Globe className="mr-2 h-4 w-4" />
 Connect Platform Gmail
 </Button>

 {googleOAuthStatus && !googleOAuthStatus.isConfigured && (
 <div className="max-w-xl mx-auto text-left p-4 rounded-xl border border-warning/30 bg-warning-surface text-xs space-y-2 mt-4">
 <div className="flex items-center gap-2 font-bold text-warning">
 <AlertTriangle className="h-4 w-4 shrink-0" />
 <span>Google Cloud OAuth Setup Note</span>
 </div>
 <p className="text-xs text-warning/90 leading-relaxed">
 To enable Platform Gmail connection, configure Google Cloud OAuth 2.0 Web Application credentials in your server environment (<code>.env.local</code> or Vercel Environment Variables):
 </p>
 <div className="bg-card p-2.5 rounded-lg border border-border tabular-nums text-xs text-muted-foreground space-y-1">
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
 <strong className="text-muted-foreground">Google Cloud Authorized Redirect URI:</strong>
 <code className="block mt-1 p-2 bg-card rounded tabular-nums text-xs break-all select-all text-muted-foreground border border-border">
 {googleOAuthStatus.redirectUri}
 </code>
 </div>
 )}
 <p className="text-xs text-muted-foreground pt-1">
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
 <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-xs">
 <CardHeader className="border-b border-border pb-3.5 bg-card">
 <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
 <Lock className="h-4 w-4 text-primary" />
 SMTP Connection &amp; Authentication
 </CardTitle>
 </CardHeader>
 <CardContent className="p-5 space-y-4">
 <div className="grid grid-cols-3 gap-3">
 <div className="col-span-2 space-y-1">
 <Label className="text-xs text-muted-foreground">SMTP Host</Label>
 <Input
 value={smtpHost}
 onChange={(e) => setSmtpHost(e.target.value)}
 placeholder="smtp.printflow.bd"
 className="h-9 text-xs bg-card border-border text-foreground tabular-nums rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Port</Label>
 <Input
 type="number"
 value={smtpPort}
 onChange={(e) => setSmtpPort(Number(e.target.value))}
 className="h-9 text-xs bg-card border-border text-foreground tabular-nums rounded-xl"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Encryption</Label>
 <select
 value={encryptionType}
 onChange={(e) => setEncryptionType(e.target.value as any)}
 className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-semibold text-foreground"
 >
 <option value="tls">TLS / STARTTLS (Port 587)</option>
 <option value="ssl">SSL (Port 465)</option>
 <option value="none">None (Port 25)</option>
 </select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Username</Label>
 <Input
 value={smtpUsername}
 onChange={(e) => setSmtpUsername(e.target.value)}
 placeholder="inkflow.erp@gmail.com"
 className="h-9 text-xs bg-card border-border text-foreground tabular-nums rounded-xl"
 />
 </div>
 </div>

 <div className="space-y-1">
 <div className="flex items-center justify-between">
 <Label className="text-xs text-muted-foreground">Password</Label>
 <button
 type="button"
 onClick={() => setShowSecret(!showSecret)}
 className="text-xs text-primary hover:text-primary flex items-center gap-1"
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
 className="h-9 text-xs bg-card border-border text-foreground tabular-nums rounded-xl"
 />
 </div>

 <div className="pt-2 flex items-center justify-between border-t border-border">
 <Button
 type="button"
 variant="outline"
 disabled={testing}
 onClick={handleTestSmtpConnection}
 className="h-8 text-xs border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
 >
 <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${testing ? 'animate-spin text-primary' : ''}`} />
 {testing ? 'Verifying...' : 'Test Connection'}
 </Button>

 {testResult && (
 <span
 className={`text-xs font-semibold flex items-center gap-1.5 ${
 testResult.success ? 'text-success' : 'text-destructive'
 }`}
 >
 {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
 {testResult.message}
 </span>
 )}
 </div>
 </CardContent>
 </Card>

 <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
 <div>
 <CardHeader className="border-b border-border pb-3.5 bg-card">
 <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
 <Globe className="h-4 w-4 text-primary" />
 Platform Sender Identity
 </CardTitle>
 </CardHeader>
 <CardContent className="p-5 space-y-4">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Display Name</Label>
 <Input
 value={senderName}
 onChange={(e) => setSenderName(e.target.value)}
 placeholder="PrintFlow Platform"
 className="h-9 text-xs bg-card border-border text-foreground rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">From Email Address</Label>
 <Input
 type="email"
 value={senderEmail}
 onChange={(e) => setSenderEmail(e.target.value)}
 placeholder="inkflow.erp@gmail.com"
 className="h-9 text-xs bg-card border-border text-foreground rounded-xl tabular-nums"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Reply-To Address</Label>
 <Input
 type="email"
 value={replyToEmail}
 onChange={(e) => setReplyToEmail(e.target.value)}
 placeholder="inkflow.erp@gmail.com"
 className="h-9 text-xs bg-card border-border text-foreground rounded-xl tabular-nums"
 />
 </div>
 </CardContent>
 </div>

 <div className="p-4 border-t border-border flex justify-end">
 <Button
 size="sm"
 disabled={saving}
 onClick={handleSaveSmtpGateway}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4"
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
 <Card className="bg-card border-border rounded-2xl overflow-hidden lg:col-span-1">
 <CardHeader className="border-b border-border pb-3 bg-card">
 <CardTitle className="text-sm font-bold text-foreground">System Notification Templates</CardTitle>
 </CardHeader>
 <CardContent className="p-2 space-y-1 max-h-96 overflow-y-auto">
 {templates.map((tpl) => {
 const isSelected = selectedTemplate?.event_type === tpl.event_type
 return (
 <button
 key={tpl.event_type}
 type="button"
 onClick={() => setSelectedTemplate(tpl)}
 className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col gap-1 min-h-11 ${
 isSelected
 ? 'bg-primary text-foreground font-bold shadow-md'
 : 'text-muted-foreground hover:bg-muted hover:text-primary-foreground'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="truncate font-semibold">{tpl.name}</span>
 <span className={`text-xs px-1.5 py-0.5 rounded tabular-nums ${isSelected ? 'bg-primary/10 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
 {tpl.event_type}
 </span>
 </div>
 </button>
 )
 })}
 </CardContent>
 </Card>

 {selectedTemplate && (
 <Card className="bg-card border-border rounded-2xl overflow-hidden lg:col-span-2 p-5 space-y-4">
 <div className="flex items-center justify-between pb-3 border-b border-border">
 <div>
 <h4 className="font-bold text-sm text-foreground">{selectedTemplate.name}</h4>
 <span className="text-xs tabular-nums text-primary">{selectedTemplate.event_type}</span>
 </div>

 <Button size="sm" onClick={handleSaveTemplate} className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
 <Save className="h-3 w-3 mr-1" />
 Save Template
 </Button>
 </div>

 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Subject Line (English)</Label>
 <Input
 value={selectedTemplate.subject_template}
 onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject_template: e.target.value })}
 className="h-9 text-xs bg-card border-border text-foreground rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Subject Line (Bangla)</Label>
 <Input
 value={selectedTemplate.subject_template_bn || ''}
 onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject_template_bn: e.target.value })}
 className="h-9 text-xs bg-card border-border text-foreground rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Body Template HTML</Label>
 <textarea
 rows={6}
 value={selectedTemplate.body_template}
 onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body_template: e.target.value })}
 className="w-full p-3 rounded-xl border border-border bg-card text-xs tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
 <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-xs">
 <CardHeader className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
 <CardTitle className="text-sm font-bold text-foreground">Platform System Transmission Logs</CardTitle>
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 disabled={processingQueue}
 onClick={handleProcessQueue}
 className="h-8 text-xs border-border bg-card text-muted-foreground hover:text-foreground"
 >
 <Zap className="h-3 w-3 mr-1 text-warning" />
 {processingQueue ? 'Processing...' : 'Run Queue Worker'}
 </Button>
 <Input
 placeholder="Search recipient or subject..."
 value={logSearch}
 onChange={(e) => setLogSearch(e.target.value)}
 className="h-8 text-xs bg-card border-border text-foreground rounded-xl w-48"
 />
 </div>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-muted-foreground border-b border-border">
 <tr>
 <th className="py-2.5 px-4 font-semibold">Date &amp; Scope</th>
 <th className="py-2.5 px-4 font-semibold">Recipient</th>
 <th className="py-2.5 px-4 font-semibold">Subject</th>
 <th className="py-2.5 px-4 font-semibold text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60">
 {logs.length === 0 ? (
 <tr>
 <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
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
 <tr key={log.id} className="hover:bg-muted">
 <td className="py-3 px-4 tabular-nums text-xs text-muted-foreground">
 <div>{new Date(log.created_at).toLocaleDateString()}</div>
 <span className="text-primary text-xs">{log.event_type}</span>
 </td>
 <td className="py-3 px-4 font-medium text-foreground">{log.recipient}</td>
 <td className="py-3 px-4 truncate max-w-xs text-muted-foreground">{log.subject}</td>
 <td className="py-3 px-4 text-center">
 <Badge
 className={`text-xs uppercase ${
 log.status === 'sent'
 ? 'bg-success-surface text-success border border-success/30'
 : log.status === 'failed'
 ? 'bg-destructive/10 text-destructive border border-destructive/30'
 : 'bg-warning-surface text-warning border border-warning/30'
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
 <Card className="bg-card border-border">
 <CardHeader className="pb-3">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
 <ShieldCheck className="h-5 w-5 text-primary" />
 Domain Email Authentication & Anti-Spam Setup
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground mt-1">
 Major email providers (Google, Microsoft 365, Yahoo) reject or spam emails lacking sender domain authentication.
 Add these DNS TXT records to your domain provider (Cloudflare, Namecheap, GoDaddy, Route 53) to guarantee 100% inbox delivery.
 </CardDescription>
 </div>
 <div className="flex items-center gap-2">
 <Badge className="bg-success-surface text-success border-success/30 text-xs py-1 px-2.5">
 <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
 RFC 5322 Aligned
 </Badge>
 </div>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold text-muted-foreground">Active Sending Domain</Label>
 <div className="flex items-center gap-2">
 <Input
 type="text"
 value={customDomainInput || (gateway?.sender_email || senderEmail || 'printflow.bd').split('@')[1] || 'printflow.bd'}
 onChange={(e) => setCustomDomainInput(e.target.value.trim().toLowerCase())}
 placeholder="e.g. myprintshop.com"
 className="h-9 text-xs bg-card border-border text-foreground font-mono"
 />
 </div>
 <span className="text-xs text-muted-foreground">
 DNS records below are dynamically generated for this sending domain.
 </span>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold text-muted-foreground">Active Provider Configuration</Label>
 <div className="h-9 px-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs text-foreground">
 <span className="capitalize font-medium flex items-center gap-2">
 <Server className="h-3.5 w-3.5 text-primary" />
 {gateway?.provider?.toUpperCase() || providerMode.toUpperCase()}
 </span>
 <span className="text-xs text-muted-foreground">
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
 <Card className="bg-card border-border">
 <CardHeader className="pb-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
 TXT RECORD
 </Badge>
 <span className="font-bold text-sm text-foreground">1. SPF (Sender Policy Framework)</span>
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
 className="h-8 text-xs border-border bg-muted hover:bg-muted text-foreground"
 >
 {copiedRecord === 'spf' ? (
 <>
 <Check className="h-3.5 w-3.5 mr-1 text-success" />
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
 <CardDescription className="text-xs text-muted-foreground mt-1">
 Authorizes sending servers to send on behalf of your domain so Gmail/Outlook don&apos;t mark incoming mail as unauthenticated spoofing.
 </CardDescription>
 </CardHeader>
 <CardContent className="pt-1">
 <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
 <div className="sm:col-span-3">
 <span className="text-xs text-muted-foreground font-semibold block uppercase">Host / Name</span>
 <span className="font-mono text-foreground font-bold">@ (or leave empty)</span>
 </div>
 <div className="sm:col-span-9">
 <span className="text-xs text-muted-foreground font-semibold block uppercase">TXT Value / Content</span>
 <span className="font-mono text-primary font-semibold break-all select-all">
 {(gateway?.provider || providerMode) === 'gmail'
 ? 'v=spf1 include:_spf.google.com ~all'
 : `v=spf1 include:${smtpHost || 'mail.domain.com'} ~all`}
 </span>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 2. DKIM Record */}
 <Card className="bg-card border-border">
 <CardHeader className="pb-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
 TXT / CNAME RECORD
 </Badge>
 <span className="font-bold text-sm text-foreground">2. DKIM (DomainKeys Identified Mail)</span>
 </div>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 const hostVal = (gateway?.provider || providerMode) === 'gmail' ? 'google._domainkey' : 'default._domainkey'
 handleCopyRecord('dkim_host', hostVal)
 }}
 className="h-8 text-xs border-border bg-muted hover:bg-muted text-foreground"
 >
 {copiedRecord === 'dkim_host' ? (
 <>
 <Check className="h-3.5 w-3.5 mr-1 text-success" />
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
 <CardDescription className="text-xs text-muted-foreground mt-1">
 Cryptographically signs every outbound message so receiving servers confirm the message was not modified in transit.
 </CardDescription>
 </CardHeader>
 <CardContent className="pt-1">
 <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
 <div className="sm:col-span-4">
 <span className="text-xs text-muted-foreground font-semibold block uppercase">Host / Selector Name</span>
 <span className="font-mono text-primary font-bold">
 {(gateway?.provider || providerMode) === 'gmail' ? 'google._domainkey' : 'default._domainkey'}
 </span>
 </div>
 <div className="sm:col-span-8">
 <span className="text-xs text-muted-foreground font-semibold block uppercase">Setup Instruction</span>
 <span className="text-muted-foreground">
 {(gateway?.provider || providerMode) === 'gmail'
 ? 'Google Admin Console -> Apps -> Google Workspace -> Gmail -> Authenticate email -> Generate DKIM key.'
 : 'Obtain your unique DKIM public key from your SMTP hosting control panel (cPanel, Postfix, SendGrid, Amazon SES) and paste as TXT.'}
 </span>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 3. DMARC Record */}
 <Card className="bg-card border-border">
 <CardHeader className="pb-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Badge className="bg-success-surface text-success border-success/30 font-mono text-xs">
 TXT RECORD
 </Badge>
 <span className="font-bold text-sm text-foreground">3. DMARC (Domain-based Message Authentication)</span>
 </div>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 const domain = customDomainInput || (gateway?.sender_email || senderEmail || 'printflow.bd').split('@')[1] || 'printflow.bd'
 const dmarcValue = `v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:postmaster@${domain}; aspf=r; adkim=r;`
 handleCopyRecord('dmarc', dmarcValue)
 }}
 className="h-8 text-xs border-border bg-muted hover:bg-muted text-foreground"
 >
 {copiedRecord === 'dmarc' ? (
 <>
 <Check className="h-3.5 w-3.5 mr-1 text-success" />
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
 <CardDescription className="text-xs text-muted-foreground mt-1">
 Enforces alignment between SPF and DKIM. Mandatory for Gmail & Yahoo 2024 deliverability guidelines.
 </CardDescription>
 </CardHeader>
 <CardContent className="pt-1">
 <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
 <div className="sm:col-span-3">
 <span className="text-xs text-muted-foreground font-semibold block uppercase">Host / Name</span>
 <span className="font-mono text-foreground font-bold">_dmarc</span>
 </div>
 <div className="sm:col-span-9">
 <span className="text-xs text-muted-foreground font-semibold block uppercase">TXT Value / Content</span>
 <span className="font-mono text-success font-semibold break-all select-all">
 {`v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:postmaster@${customDomainInput || (gateway?.sender_email || senderEmail || 'printflow.bd').split('@')[1] || 'printflow.bd'}; aspf=r; adkim=r;`}
 </span>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Engine Anti-Spam Protections Overview */}
 <Card className="bg-card border-border">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
 <Zap className="h-4 w-4 text-warning" />
 Active Built-in Engine Deliverability Protections
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 The platform automatically injects these technical standards into every email dispatched:
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
 <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
 <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
 <div>
 <strong className="text-foreground block font-semibold">RFC 5322 Domain-Aligned Message-ID</strong>
 <span className="text-xs text-muted-foreground">
 Message-IDs are generated dynamically matching your sending domain, preventing domain spoofing flags.
 </span>
 </div>
 </div>

 <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
 <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
 <div>
 <strong className="text-foreground block font-semibold">Multipart/Alternative Plaintext Fallback</strong>
 <span className="text-xs text-muted-foreground">
 Every email includes both HTML and a clean, link-preserved text part, eliminating the MIME_HTML_ONLY spam penalty.
 </span>
 </div>
 </div>

 <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
 <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
 <div>
 <strong className="text-foreground block font-semibold">Transactional Classification Headers</strong>
 <span className="text-xs text-muted-foreground">
 Injects Auto-Submitted: auto-generated and X-Auto-Response-Suppress: All for Microsoft Exchange & Gmail loops.
 </span>
 </div>
 </div>

 <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
 <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
 <div>
 <strong className="text-foreground block font-semibold">RFC 8058 One-Click Unsubscribe</strong>
 <span className="text-xs text-muted-foreground">
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
 <Label className="text-xs font-semibold text-foreground dark:text-muted-foreground">Recipient Email</Label>
 <Input
 type="email"
 value={testRecipient}
 onChange={(e) => setTestRecipient(e.target.value)}
 placeholder="admin@printflow.bd"
 className="h-10 text-xs tabular-nums text-foreground bg-card border-input dark:text-foreground"
 />
 </div>

 <div className="p-3 bg-muted rounded-xl border border-border text-xs text-muted-foreground dark:text-muted-foreground">
 Provider: <strong className="text-foreground dark:text-foreground capitalize">{gateway?.provider || 'Platform Provider'}</strong>
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-border dark:border-border">
 <Button size="sm" variant="outline" onClick={() => setIsTestModalOpen(false)}>
 Cancel
 </Button>
 <Button
 size="sm"
 disabled={sendingTestEmail || !testRecipient}
 onClick={handleSendTestEmail}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
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

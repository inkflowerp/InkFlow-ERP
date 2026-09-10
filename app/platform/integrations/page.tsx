'use client'

// ==============================================================================
// PrintERP SaaS - Production Gateways & API Integration Command Center
// Location: Platform Admin Panel -> Cluster Settings -> Integrations & APIs
// Supports Email, SMS, Payment, WhatsApp, Telegram, Webhooks, & Audit Logs
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  Lock,
  Activity,
  Copy,
  ExternalLink,
  Search,
  Key,
  CreditCard,
  Send,
  Sliders,
  Sparkles,
  Zap,
  Globe,
  Radio,
  Eye,
  EyeOff,
  Server,
  Terminal,
  FileText,
  Mail,
  SendHorizontal,
  ChevronRight,
  Info,
  Clock,
  Trash2,
  Power,
  X,
  Smartphone,
  ShieldAlert,
  ArrowUpRight,
  Database,
  History,
  Check,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import { ModalDialog } from '@/components/shared/modal-dialog'
import {
  getPlatformGatewaysAction,
  savePlatformGatewayAction,
  testPlatformGatewayConnectionAction,
  sendPlatformGatewayTestAction,
  togglePlatformGatewayAction,
  deletePlatformGatewayAction,
  getPlatformCommunicationLogsAction,
  getPlatformPaymentTransactionsAction,
  getPlatformGatewayWebhooksAction,
  getPlatformGatewayAuditLogsAction,
  getPlatformGatewayTelemetryAction,
} from '@/actions/gateway.actions'
import {
  GatewayCategory,
  AnyProviderType,
  SanitizedGatewayRecord,
  GatewayFormData,
  GatewayTestResult,
  CommunicationLogRecord,
  GatewayTransactionRecord,
  GatewayWebhookRecord,
  GatewayAuditRecord,
  GatewayTelemetrySummary,
  GatewayEnvironment,
} from '@/types/gateway.types'

// Complete metadata for all supported production providers
interface ProviderMeta {
  id: AnyProviderType
  category: GatewayCategory
  name: string
  nameBn: string
  tagline: string
  icon: any
  docsUrl: string
  webhookPath?: string
  popular?: boolean
  defaultEnv: GatewayEnvironment
  credentialFields: Array<{
    key: string
    label: string
    placeholder: string
    type: 'text' | 'password'
    required: boolean
    description?: string
  }>
  configFields: Array<{
    key: string
    label: string
    placeholder: string
    type: 'text' | 'number' | 'select'
    options?: { label: string; value: string }[]
    required: boolean
    description?: string
    defaultValue?: any
  }>
}

const PROVIDERS_METADATA: Record<string, ProviderMeta> = {
  // EMAIL
  smtp: {
    id: 'smtp',
    category: 'email',
    name: 'Custom SMTP Server',
    nameBn: 'কাস্টম এসএমটিপি সার্ভার',
    tagline: 'Standard SMTP host (Google Workspace, Microsoft 365, Postfix, Sendmail)',
    icon: Server,
    docsUrl: 'https://nodemailer.com/smtp/',
    popular: true,
    defaultEnv: 'live',
    credentialFields: [
      { key: 'password', label: 'SMTP Password / App Password', placeholder: '••••••••••••••••', type: 'password', required: true, description: 'Application specific password' },
    ],
    configFields: [
      { key: 'smtp_host', label: 'SMTP Host', placeholder: 'smtp.gmail.com', type: 'text', required: true },
      { key: 'smtp_port', label: 'SMTP Port', placeholder: '587', type: 'number', required: true, defaultValue: 587 },
      {
        key: 'encryption_type',
        label: 'Encryption Protocol',
        placeholder: 'tls',
        type: 'select',
        required: true,
        defaultValue: 'tls',
        options: [
          { label: 'TLS (Port 587 - Recommended)', value: 'tls' },
          { label: 'SSL (Port 465)', value: 'ssl' },
          { label: 'STARTTLS (Opportunistic)', value: 'starttls' },
          { label: 'None (Plain)', value: 'none' },
        ],
      },
      { key: 'smtp_username', label: 'SMTP Username / Login', placeholder: 'notifications@printerp.com', type: 'text', required: true },
      { key: 'sender_name', label: 'From Display Name', placeholder: 'PrintERP Notifications', type: 'text', required: true, defaultValue: 'PrintERP Notifications' },
      { key: 'sender_email', label: 'From Email Address', placeholder: 'notifications@printerp.com', type: 'text', required: true },
      { key: 'reply_to_email', label: 'Reply-To Email', placeholder: 'support@printerp.com', type: 'text', required: false },
    ],
  },
  resend: {
    id: 'resend',
    category: 'email',
    name: 'Resend Cloud API',
    nameBn: 'রিসেন্ড ক্লাউড এপিআই',
    tagline: 'Developer-first email delivery platform with 99.9% inbox placement',
    icon: Zap,
    docsUrl: 'https://resend.com/docs',
    popular: true,
    defaultEnv: 'live',
    credentialFields: [
      { key: 'api_key', label: 'Resend API Key', placeholder: 're_1234567890abcdef...', type: 'password', required: true, description: 'From Resend Dashboard -> API Keys' },
    ],
    configFields: [
      { key: 'sender_name', label: 'From Display Name', placeholder: 'PrintERP Notifications', type: 'text', required: true, defaultValue: 'PrintERP Notifications' },
      { key: 'sender_email', label: 'Verified Domain From Email', placeholder: 'noreply@yourdomain.com', type: 'text', required: true },
      { key: 'reply_to_email', label: 'Reply-To Email', placeholder: 'support@yourdomain.com', type: 'text', required: false },
    ],
  },
  sendgrid: {
    id: 'sendgrid',
    category: 'email',
    name: 'Twilio SendGrid v3',
    nameBn: 'টুইলিও সেন্ডগ্রিড',
    tagline: 'High-volume enterprise transactional email pipeline',
    icon: Layers,
    docsUrl: 'https://docs.sendgrid.com/api-reference',
    defaultEnv: 'live',
    credentialFields: [
      { key: 'api_key', label: 'SendGrid API Key', placeholder: 'SG.xxxxxxxxxxxx...', type: 'password', required: true },
    ],
    configFields: [
      { key: 'sender_name', label: 'From Display Name', placeholder: 'PrintERP Delivery', type: 'text', required: true, defaultValue: 'PrintERP Delivery' },
      { key: 'sender_email', label: 'Verified Sender Email', placeholder: 'orders@yourdomain.com', type: 'text', required: true },
    ],
  },
  ses: {
    id: 'ses',
    category: 'email',
    name: 'Amazon Simple Email Service (SES)',
    nameBn: 'আমাজন সিম্পল ইমেইল সার্ভিস (SES)',
    tagline: 'Cost-effective high-scale cloud email with AWS region integration',
    icon: Globe,
    docsUrl: 'https://docs.aws.amazon.com/ses/',
    defaultEnv: 'live',
    credentialFields: [
      { key: 'access_key_id', label: 'AWS Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE', type: 'text', required: true },
      { key: 'secret_access_key', label: 'AWS Secret Access Key', placeholder: '••••••••••••••••••••••••••••••••••••••••', type: 'password', required: true },
    ],
    configFields: [
      {
        key: 'aws_region',
        label: 'AWS SES Region',
        placeholder: 'ap-south-1',
        type: 'select',
        required: true,
        defaultValue: 'ap-south-1',
        options: [
          { label: 'Asia Pacific (Mumbai) - ap-south-1', value: 'ap-south-1' },
          { label: 'Asia Pacific (Singapore) - ap-southeast-1', value: 'ap-southeast-1' },
          { label: 'US East (N. Virginia) - us-east-1', value: 'us-east-1' },
          { label: 'Europe (Frankfurt) - eu-central-1', value: 'eu-central-1' },
        ],
      },
      { key: 'sender_email', label: 'SES Verified Email Address', placeholder: 'alerts@yourdomain.com', type: 'text', required: true },
      { key: 'sender_name', label: 'From Display Name', placeholder: 'PrintERP System', type: 'text', required: true, defaultValue: 'PrintERP System' },
    ],
  },

  // SMS
  greenweb: {
    id: 'greenweb',
    category: 'sms',
    name: 'Greenweb SMS Gateway',
    nameBn: 'গ্রিনওয়েব এসএমএস গেটওয়ে',
    tagline: 'High-throughput Bangladeshi telco routing (GP, Robi, BL, Teletalk) for OTPs & alerts',
    icon: Smartphone,
    docsUrl: 'https://greenweb.com.bd/sms-api',
    webhookPath: '/api/webhooks/sms-delivery',
    popular: true,
    defaultEnv: 'live',
    credentialFields: [
      { key: 'token', label: 'Greenweb API Access Token', placeholder: 'gw_live_••••••••', type: 'password', required: true, description: 'Generated from Greenweb SMS portal' },
    ],
    configFields: [
      { key: 'sender_id', label: 'Approved Masking Name / Sender ID', placeholder: 'PRINTERP', type: 'text', required: false, description: 'Leave empty for non-masking standard rate' },
      { key: 'base_url', label: 'API Base URL', placeholder: 'https://api.greenweb.com.bd/api.php', type: 'text', required: false, defaultValue: 'https://api.greenweb.com.bd/api.php' },
    ],
  },
  bulksmsbd: {
    id: 'bulksmsbd',
    category: 'sms',
    name: 'BulkSMSBD Carrier Gateway',
    nameBn: 'বাল্কএসএমএসবিডি গেটওয়ে',
    tagline: 'Reliable Bangladeshi SMS carrier route with direct DLR reports',
    icon: Radio,
    docsUrl: 'http://bulksmsbd.net/api',
    defaultEnv: 'live',
    credentialFields: [
      { key: 'api_key', label: 'BulkSMSBD API Key', placeholder: '••••••••••••••••••••••••', type: 'password', required: true },
    ],
    configFields: [
      { key: 'sender_id', label: 'Sender ID / Mask', placeholder: '8809612000000', type: 'text', required: true },
      { key: 'base_url', label: 'API URL', placeholder: 'http://bulksmsbd.net/api/smsapi', type: 'text', required: false, defaultValue: 'http://bulksmsbd.net/api/smsapi' },
    ],
  },
  ssl_wireless: {
    id: 'ssl_wireless',
    category: 'sms',
    name: 'SSL Wireless (SSL SMS v3)',
    nameBn: 'এসএসএল ওয়্যারলেস এসএমএস',
    tagline: 'Enterprise-tier Bangladeshi telecom aggregator for corporate masking',
    icon: Radio,
    docsUrl: 'https://smsplus.sslwireless.com',
    defaultEnv: 'live',
    credentialFields: [
      { key: 'api_token', label: 'SSL SMS API Token', placeholder: '••••••••••••••••••••', type: 'password', required: true },
      { key: 'sid', label: 'Stakeholder ID (SID)', placeholder: 'PRINTERP_CORP', type: 'text', required: true },
    ],
    configFields: [
      { key: 'base_url', label: 'API Endpoint', placeholder: 'https://smsplus.sslwireless.com/api/v3/send-sms', type: 'text', required: false, defaultValue: 'https://smsplus.sslwireless.com/api/v3/send-sms' },
    ],
  },
  twilio: {
    id: 'twilio',
    category: 'sms',
    name: 'Twilio Global SMS',
    nameBn: 'টুইলিও গ্লোবাল এসএমএস',
    tagline: 'International carrier network for cross-border global SMS dispatch',
    icon: Globe,
    docsUrl: 'https://www.twilio.com/docs/sms',
    defaultEnv: 'live',
    credentialFields: [
      { key: 'account_sid', label: 'Twilio Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'text', required: true },
      { key: 'auth_token', label: 'Twilio Auth Token', placeholder: '••••••••••••••••••••••••••••••••', type: 'password', required: true },
    ],
    configFields: [
      { key: 'from_number', label: 'Twilio Phone Number / Alphanumeric Sender', placeholder: '+15551234567', type: 'text', required: true },
    ],
  },

  // PAYMENT
  bkash: {
    id: 'bkash',
    category: 'payment',
    name: 'bKash Merchant Payment Gateway',
    nameBn: 'বিকাশ টোকেনাইজড পেমেন্ট',
    tagline: 'Official Tokenized Checkout v1.2.0 API for direct mobile wallet payments in BDT',
    icon: Smartphone,
    docsUrl: 'https://developer.bKash.com',
    webhookPath: '/api/webhooks/bkash',
    popular: true,
    defaultEnv: 'sandbox',
    credentialFields: [
      { key: 'app_key', label: 'bKash App Key', placeholder: '••••••••••••••••••••••••', type: 'text', required: true },
      { key: 'app_secret', label: 'bKash App Secret', placeholder: '••••••••••••••••••••••••••••••••••••••••', type: 'password', required: true },
      { key: 'username', label: 'Merchant API Username', placeholder: 'merchant_username', type: 'text', required: true },
      { key: 'password', label: 'Merchant API Password', placeholder: '••••••••••••••••', type: 'password', required: true },
    ],
    configFields: [
      { key: 'base_url', label: 'bKash Endpoint (Leave empty for default)', placeholder: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta', type: 'text', required: false },
    ],
  },
  sslcommerz: {
    id: 'sslcommerz',
    category: 'payment',
    name: 'SSLCOMMERZ Multi-Channel Gateway',
    nameBn: 'এসএসএল কমার্জ পেমেন্ট গেটওয়ে',
    tagline: 'Hosted checkout supporting VISA, MasterCard, Amex, bKash, Nagad, Rocket, & Banks in Bangladesh',
    icon: CreditCard,
    docsUrl: 'https://developer.sslcommerz.com',
    webhookPath: '/api/webhooks/sslcommerz',
    popular: true,
    defaultEnv: 'sandbox',
    credentialFields: [
      { key: 'store_id', label: 'Store ID', placeholder: 'printerp_live', type: 'text', required: true },
      { key: 'store_password', label: 'Store Password', placeholder: '••••••••••••••••', type: 'password', required: true },
    ],
    configFields: [
      { key: 'base_url', label: 'Gateway URL (Leave empty for sandbox/live auto)', placeholder: 'https://sandbox.sslcommerz.com', type: 'text', required: false },
    ],
  },
  nagad: {
    id: 'nagad',
    category: 'payment',
    name: 'Nagad Merchant Gateway',
    nameBn: 'নগদ ডিজিটাল পেমেন্ট',
    tagline: 'Direct merchant checkout for Bangladesh Post Office Digital Banking (Nagad)',
    icon: Smartphone,
    docsUrl: 'https://developer.mynagad.com',
    defaultEnv: 'sandbox',
    credentialFields: [
      { key: 'merchant_id', label: 'Nagad Merchant ID', placeholder: '683020000000000', type: 'text', required: true },
      { key: 'merchant_private_key', label: 'Merchant Private Key', placeholder: '••••••••••••••••••••••••••••••••', type: 'password', required: true },
      { key: 'nagad_public_key', label: 'Nagad Public Key (Certificate)', placeholder: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...', type: 'text', required: false },
    ],
    configFields: [
      { key: 'base_url', label: 'API Endpoint', placeholder: 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs', type: 'text', required: false },
    ],
  },
  uddoktapay: {
    id: 'uddoktapay',
    category: 'payment',
    name: 'UddoktaPay Automated Payment Gateway',
    nameBn: 'উদ্যোক্তাপেমেন্ট গেটওয়ে',
    tagline: 'Automated instant checkout for bKash, Nagad, Rocket, Upay, & Cards',
    icon: Zap,
    docsUrl: 'https://uddoktapay.com/docs/v2',
    webhookPath: '/api/webhooks/uddoktapay',
    defaultEnv: 'sandbox',
    credentialFields: [
      { key: 'api_key', label: 'UddoktaPay API Key', placeholder: '••••••••••••••••••••••••', type: 'password', required: true },
    ],
    configFields: [
      { key: 'base_url', label: 'Base URL', placeholder: 'https://sandbox.uddoktapay.com', type: 'text', required: false, defaultValue: 'https://sandbox.uddoktapay.com' },
    ],
  },
  stripe: {
    id: 'stripe',
    category: 'payment',
    name: 'Stripe International Gateway',
    nameBn: 'স্ট্রাইপ ইন্টারন্যাশনাল গেটওয়ে',
    tagline: 'Global multi-currency credit & debit cards payment processing (USD, EUR, GBP)',
    icon: CreditCard,
    docsUrl: 'https://stripe.com/docs/api',
    webhookPath: '/api/webhooks/stripe',
    defaultEnv: 'sandbox',
    credentialFields: [
      { key: 'secret_key', label: 'Stripe Secret Key', placeholder: 'sk_test_••••••••••••••••••••••••', type: 'password', required: true },
      { key: 'publishable_key', label: 'Stripe Publishable Key', placeholder: 'pk_test_••••••••••••••••••••••••', type: 'text', required: false },
      { key: 'webhook_secret', label: 'Stripe Webhook Signing Secret', placeholder: 'whsec_••••••••••••••••••••••••', type: 'password', required: false },
    ],
    configFields: [],
  },

  // WHATSAPP
  meta_whatsapp: {
    id: 'meta_whatsapp',
    category: 'whatsapp',
    name: 'Meta WhatsApp Business Cloud API',
    nameBn: 'মেটা হোয়াটসঅ্যাপ ক্লাউড এপিআই',
    tagline: 'Official Meta Graph API for automated order confirmations, PDF challans, & proofs',
    icon: MessageSquare,
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    webhookPath: '/api/webhooks/whatsapp',
    popular: true,
    defaultEnv: 'live',
    credentialFields: [
      { key: 'access_token', label: 'Permanent System User Access Token', placeholder: 'EAAQ...••••••••••••••••••••', type: 'password', required: true, description: 'System User Token with whatsapp_business_messaging permission' },
      { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '109876543210987', type: 'text', required: true, description: 'Found in Meta WhatsApp App Dashboard -> API Setup' },
    ],
    configFields: [
      { key: 'business_account_id', label: 'WhatsApp Business Account (WABA) ID', placeholder: '123456789012345', type: 'text', required: false },
      { key: 'api_version', label: 'Graph API Version', placeholder: 'v20.0', type: 'text', required: false, defaultValue: 'v20.0' },
      { key: 'verify_token', label: 'Webhook Handshake Verify Token', placeholder: 'printerp_whatsapp_verify_token', type: 'text', required: false, defaultValue: 'printerp_whatsapp_verify_token' },
    ],
  },

  // TELEGRAM
  telegram_bot: {
    id: 'telegram_bot',
    category: 'telegram',
    name: 'Official Telegram Bot API',
    nameBn: 'টেলিগ্রাম বট এপিআই',
    tagline: 'Automated administrative system alerts, production dispatch notifications, & PDF challans',
    icon: Send,
    docsUrl: 'https://core.telegram.org/bots/api',
    webhookPath: '/api/webhooks/telegram',
    popular: true,
    defaultEnv: 'live',
    credentialFields: [
      { key: 'bot_token', label: 'Telegram Bot API Token', placeholder: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ', type: 'password', required: true, description: 'Created via @BotFather in Telegram' },
    ],
    configFields: [
      { key: 'default_chat_id', label: 'Default Group / Channel Chat ID', placeholder: '-1001234567890', type: 'text', required: false, description: 'Target Telegram chat or channel ID' },
      {
        key: 'parse_mode',
        label: 'Message Parse Mode',
        placeholder: 'HTML',
        type: 'select',
        required: true,
        defaultValue: 'HTML',
        options: [
          { label: 'HTML (Recommended)', value: 'HTML' },
          { label: 'MarkdownV2', value: 'MarkdownV2' },
          { label: 'Plain Text', value: 'Plain' },
        ],
      },
    ],
  },
}

export default function PlatformIntegrationsPage() {
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<
    'all' | 'email' | 'sms' | 'payment' | 'whatsapp' | 'telegram' | 'logs' | 'transactions' | 'webhooks' | 'audit'
  >('all')

  // Core Gateway State
  const [gateways, setGateways] = useState<SanitizedGatewayRecord[]>([])
  const [telemetry, setTelemetry] = useState<GatewayTelemetrySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'configured' | 'error' | 'not_configured'>('all')

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Configuration Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [selectedMeta, setSelectedMeta] = useState<ProviderMeta | null>(null)
  const [editingGateway, setEditingGateway] = useState<SanitizedGatewayRecord | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    environment: GatewayEnvironment
    is_enabled: boolean
    credentials: Record<string, string>
    public_config: Record<string, any>
  }>({
    name: '',
    environment: 'sandbox',
    is_enabled: true,
    credentials: {},
    public_config: {},
  })
  const [showPasswordFields, setShowPasswordFields] = useState<Record<string, boolean>>({})
  const [savingConfig, setSavingConfig] = useState(false)

  // Send Test Message Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testPayload, setTestPayload] = useState<{
    gatewayId?: string
    category: GatewayCategory
    provider?: AnyProviderType
    recipient: string
    recipientName: string
    subject: string
    message: string
  }>({
    category: 'email',
    recipient: '',
    recipientName: 'Administrator',
    subject: 'PrintERP Live Gateway Verification Test',
    message: 'This is a verified live test message dispatched from the PrintERP SaaS Control Panel.',
  })
  const [sendingTest, setSendingTest] = useState(false)
  const [testResultFeedback, setTestResultFeedback] = useState<any | null>(null)

  // Sub-Ledger Log States
  const [commLogs, setCommLogs] = useState<CommunicationLogRecord[]>([])
  const [paymentTransactions, setPaymentTransactions] = useState<GatewayTransactionRecord[]>([])
  const [webhookRecords, setWebhookRecords] = useState<GatewayWebhookRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<GatewayAuditRecord[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logSearch, setLogSearch] = useState('')

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // Load Main Gateways & Telemetry
  const loadGateways = useCallback(async () => {
    setLoading(true)
    try {
      const [gwRes, telemRes] = await Promise.all([
        getPlatformGatewaysAction(),
        getPlatformGatewayTelemetryAction(),
      ])

      if (gwRes.success && gwRes.data) {
        setGateways(gwRes.data)
      } else {
        showToast(gwRes.error || 'Failed to load gateways', 'error')
      }

      if (telemRes.success && telemRes.data) {
        setTelemetry(telemRes.data)
      }
    } catch {
      showToast('Error communicating with gateway services', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGateways()
  }, [loadGateways])

  // Load Sub-Ledgers on Tab Change
  useEffect(() => {
    const loadLedgers = async () => {
      setLogsLoading(true)
      try {
        if (activeTab === 'logs') {
          const res = await getPlatformCommunicationLogsAction({ search: logSearch })
          if (res.success && res.data) setCommLogs(res.data.logs)
        } else if (activeTab === 'transactions') {
          const res = await getPlatformPaymentTransactionsAction({ search: logSearch })
          if (res.success && res.data) setPaymentTransactions(res.data.transactions)
        } else if (activeTab === 'webhooks') {
          const res = await getPlatformGatewayWebhooksAction()
          if (res.success && res.data) setWebhookRecords(res.data.webhooks)
        } else if (activeTab === 'audit') {
          const res = await getPlatformGatewayAuditLogsAction()
          if (res.success && res.data) setAuditLogs(res.data.logs)
        }
      } finally {
        setLogsLoading(false)
      }
    }

    if (['logs', 'transactions', 'webhooks', 'audit'].includes(activeTab)) {
      loadLedgers()
    }
  }, [activeTab, logSearch])

  // Map of registered gateways by provider
  const gatewaysMap = useMemo(() => {
    const map = new Map<string, SanitizedGatewayRecord>()
    for (const g of gateways) {
      map.set(g.provider, g)
    }
    return map
  }, [gateways])

  // Filtered list of provider cards
  const displayedProviders = useMemo(() => {
    const allProvidersList = Object.values(PROVIDERS_METADATA)

    return allProvidersList.filter((meta) => {
      // Category filter
      if (activeTab !== 'all' && activeTab !== meta.category) {
        return false
      }

      const existing = gatewaysMap.get(meta.id)
      const currentStatus = existing ? existing.status : 'not_configured'

      // Status filter
      if (statusFilter !== 'all' && currentStatus !== statusFilter) {
        return false
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = meta.name.toLowerCase().includes(query) || meta.nameBn.includes(query)
        const matchesTagline = meta.tagline.toLowerCase().includes(query)
        const matchesCategory = meta.category.toLowerCase().includes(query)
        if (!matchesName && !matchesTagline && !matchesCategory) return false
      }

      return true
    })
  }, [activeTab, gatewaysMap, statusFilter, searchQuery])

  // Open Configuration Modal
  const handleOpenConfig = (meta: ProviderMeta) => {
    setSelectedMeta(meta)
    const existing = gatewaysMap.get(meta.id)
    setEditingGateway(existing || null)

    const initialCreds: Record<string, string> = {}
    meta.credentialFields.forEach((f) => {
      initialCreds[f.key] = existing?.masked_credentials?.[f.key] || ''
    })

    const initialConfig: Record<string, any> = {}
    meta.configFields.forEach((f) => {
      initialConfig[f.key] = existing?.public_config?.[f.key] ?? f.defaultValue ?? ''
    })

    setFormData({
      name: existing?.name || meta.name,
      environment: existing?.environment || meta.defaultEnv,
      is_enabled: existing?.is_enabled ?? true,
      credentials: initialCreds,
      public_config: initialConfig,
    })

    setShowPasswordFields({})
    setIsConfigModalOpen(true)
  }

  // Save Gateway Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMeta) return

    setSavingConfig(true)
    try {
      const payload: GatewayFormData = {
        id: editingGateway?.id,
        category: selectedMeta.category,
        provider: selectedMeta.id,
        name: formData.name || selectedMeta.name,
        environment: formData.environment,
        is_enabled: formData.is_enabled,
        credentials: formData.credentials,
        public_config: formData.public_config,
      }

      const res = await savePlatformGatewayAction(payload)
      if (res.success && res.data) {
        showToast(`${selectedMeta.name} configuration saved successfully.`)
        setIsConfigModalOpen(false)
        await loadGateways()
      } else {
        showToast(res.error || 'Failed to save gateway configuration', 'error')
      }
    } catch {
      showToast('Unexpected error saving gateway configuration', 'error')
    } finally {
      setSavingConfig(false)
    }
  }

  // Test Live Connection
  const handleTestConnection = async (meta: ProviderMeta) => {
    const existing = gatewaysMap.get(meta.id)
    if (!existing) {
      showToast(`Please configure ${meta.name} before running connection tests.`, 'error')
      handleOpenConfig(meta)
      return
    }

    setTestingId(meta.id)
    try {
      const res = await testPlatformGatewayConnectionAction(existing.id)
      if (res.success && res.data) {
        showToast(`✓ ${meta.name}: ${res.data.message} (${res.data.latency_ms} ms)`)
        await loadGateways()
      } else {
        showToast(`✕ ${meta.name} Connection Failed: ${res.error || res.data?.message || 'Unauthorized'}`, 'error')
        await loadGateways()
      }
    } catch {
      showToast(`Error communicating with ${meta.name} API`, 'error')
    } finally {
      setTestingId(null)
    }
  }

  // Open Send Test Message Modal
  const handleOpenSendTest = (meta: ProviderMeta) => {
    const existing = gatewaysMap.get(meta.id)
    if (!existing || existing.status === 'not_configured') {
      showToast(`Please configure ${meta.name} with valid credentials first.`, 'error')
      handleOpenConfig(meta)
      return
    }

    let defaultRecipient = ''
    if (meta.category === 'email') defaultRecipient = 'admin@printerp.com'
    else if (meta.category === 'sms' || meta.category === 'whatsapp') defaultRecipient = '01711000000'
    else if (meta.category === 'telegram') defaultRecipient = existing.public_config?.default_chat_id || ''

    setTestPayload({
      gatewayId: existing.id,
      category: meta.category,
      provider: meta.id,
      recipient: defaultRecipient,
      recipientName: 'PrintERP Administrator',
      subject: `PrintERP ${meta.name} Live Test`,
      message: `PrintERP Live Integration Test Dispatched at ${new Date().toLocaleTimeString()} (BDT).`,
    })

    setTestResultFeedback(null)
    setIsTestModalOpen(true)
  }

  // Execute Send Test Message
  const handleExecuteSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingTest(true)
    setTestResultFeedback(null)

    try {
      const res = await sendPlatformGatewayTestAction(testPayload)
      if (res.success && res.data) {
        setTestResultFeedback({
          success: true,
          message: `Live test message dispatched successfully via ${testPayload.provider}! Message ID: ${res.data.providerMessageId || 'OK'} (${res.data.latency_ms} ms)`,
          data: res.data,
        })
        showToast('Test message dispatched successfully!')
        await loadGateways()
      } else {
        setTestResultFeedback({
          success: false,
          message: res.error || 'Provider rejected test message delivery.',
        })
        showToast(res.error || 'Failed to dispatch test message', 'error')
      }
    } catch {
      setTestResultFeedback({ success: false, message: 'Server communication error during test dispatch' })
      showToast('Error dispatching test message', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  // Toggle Enable / Disable
  const handleToggleStatus = async (meta: ProviderMeta) => {
    const existing = gatewaysMap.get(meta.id)
    if (!existing) return

    try {
      const newEnabled = !existing.is_enabled
      const res = await togglePlatformGatewayAction(existing.id, newEnabled)
      if (res.success) {
        showToast(`${meta.name} ${newEnabled ? 'enabled' : 'disabled'}.`)
        await loadGateways()
      } else {
        showToast(res.error || 'Failed to update status', 'error')
      }
    } catch {
      showToast('Failed to toggle gateway status', 'error')
    }
  }

  // Copy Webhook Callback URL
  const handleCopyWebhookUrl = (path: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://printerp.com'
    const fullUrl = `${origin}${path}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedPath(path)
    showToast(`Webhook URL copied to clipboard: ${fullUrl}`)
    setTimeout(() => setCopiedPath(null), 2500)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-medium animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-700/60 backdrop-blur-md'
              : 'bg-rose-950/90 text-rose-100 border-rose-700/60 backdrop-blur-md'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Gateways & API Integrations
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure production-ready communication channels, Bangladesh payment checkouts, and webhooks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadGateways}
            disabled={loading}
            className="text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <PlatformSettingsNav />

      {/* High-Level Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Configured Gateways</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {telemetry?.totalConfigured ?? 0}
              </span>
              <span className="text-[10px] text-slate-400">of {Object.keys(PROVIDERS_METADATA).length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Live & Connected</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-300">
                {telemetry?.totalConnected ?? 0}
              </span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                Healthy
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Latency</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {telemetry?.avgLatencyMs ? `${telemetry.avgLatencyMs} ms` : '—'}
              </span>
              <Activity className="h-4 w-4 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dispatched Messages</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {telemetry?.recentLogsCount ?? 0}
              </span>
              <MessageSquare className="h-4 w-4 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payments Handled</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                ৳ {(telemetry?.recentTransactionsVolume || 0).toLocaleString()}
              </span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Webhooks Processed</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {telemetry?.recentWebhooksCount ?? 0}
              </span>
              <Radio className="h-4 w-4 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Channel Sub-Tabs & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Gateways', icon: Layers },
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'sms', label: 'SMS (BD)', icon: Smartphone },
            { id: 'payment', label: 'Payment (৳ BDT)', icon: CreditCard },
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { id: 'telegram', label: 'Telegram', icon: Send },
            { id: 'logs', label: 'Comm Logs', icon: FileText },
            { id: 'transactions', label: 'Transactions', icon: DollarSign },
            { id: 'webhooks', label: 'Webhooks', icon: Radio },
            { id: 'audit', label: 'Audit Trail', icon: History },
          ].map((tab) => {
            const Icon = tab.icon
            const isCurrent = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search and Status Filters */}
        {['all', 'email', 'sms', 'payment', 'whatsapp', 'telegram'].includes(activeTab) && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search gateway or API..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-48 lg:w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="connected">Connected Only</option>
              <option value="configured">Configured</option>
              <option value="not_configured">Not Configured</option>
              <option value="error">Error</option>
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. GATEWAY PROVIDERS CARDS GRID */}
      {/* ========================================================================= */}
      {['all', 'email', 'sms', 'payment', 'whatsapp', 'telegram'].includes(activeTab) && (
        <div>
          {displayedProviders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <Layers className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No integration gateways match your filter</h3>
              <p className="text-xs text-slate-500 mt-1">Try resetting the status filter or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedProviders.map((meta) => {
                const Icon = meta.icon
                const gateway = gatewaysMap.get(meta.id)
                const isConfigured = Boolean(gateway && gateway.has_credentials)
                const isConnected = gateway?.status === 'connected'
                const isError = gateway?.status === 'error'
                const isDisabled = gateway?.status === 'disabled'
                const isTesting = testingId === meta.id
                const environment = gateway?.environment || meta.defaultEnv

                return (
                  <Card
                    key={meta.id}
                    className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border ${
                      isConnected
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/10'
                        : isError
                        ? 'border-rose-200 dark:border-rose-900/60 bg-gradient-to-b from-white to-rose-50/20 dark:from-slate-900 dark:to-rose-950/10'
                        : isConfigured
                        ? 'border-slate-200 dark:border-slate-800'
                        : 'border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 opacity-90'
                    }`}
                  >
                    {/* Header */}
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            isConnected
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : isError
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : isConfigured
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {gateway?.name || meta.name}
                              </CardTitle>
                              {meta.popular && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                                  Popular
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{meta.nameBn}</p>
                          </div>
                        </div>

                        {/* Environment Badge */}
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-semibold ${
                            environment === 'live'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          }`}
                        >
                          {environment === 'live' ? 'LIVE' : 'SANDBOX'}
                        </Badge>
                      </div>

                      <CardDescription className="text-xs mt-2 line-clamp-2 leading-relaxed">
                        {meta.tagline}
                      </CardDescription>
                    </CardHeader>

                    {/* Telemetry / Connection Status */}
                    <CardContent className="p-4 pt-1 space-y-3">
                      <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                          <span className="font-semibold flex items-center gap-1.5">
                            {isConnected ? (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                              </span>
                            ) : isError ? (
                              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                Error / Failed
                              </span>
                            ) : isDisabled ? (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Power className="h-3 w-3" />
                                Disabled
                              </span>
                            ) : isConfigured ? (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Sliders className="h-3 w-3" />
                                Configured (Untested)
                              </span>
                            ) : (
                              <span className="text-slate-400">Not Configured</span>
                            )}
                          </span>
                        </div>

                        {gateway?.last_tested_at && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Last Ping:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-mono">
                              {gateway.last_test_latency_ms ? `${gateway.last_test_latency_ms} ms` : '0 ms'}
                            </span>
                          </div>
                        )}

                        {gateway?.last_test_error && isError && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 line-clamp-1 bg-rose-50 dark:bg-rose-950/50 p-1 rounded font-mono">
                            {gateway.last_test_error}
                          </div>
                        )}
                      </div>

                      {/* Webhook Quick Path if applicable */}
                      {meta.webhookPath && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900 p-1.5 rounded border border-slate-200/60 dark:border-slate-800">
                          <span className="font-mono text-[10px] truncate max-w-[170px]">{meta.webhookPath}</span>
                          <button
                            onClick={() => handleCopyWebhookUrl(meta.webhookPath!)}
                            className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 text-[10px] font-semibold flex items-center gap-0.5 shrink-0"
                          >
                            {copiedPath === meta.webhookPath ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedPath === meta.webhookPath ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={isConfigured ? 'outline' : 'default'}
                          onClick={() => handleOpenConfig(meta)}
                          className="flex-1 text-xs h-8 font-semibold"
                        >
                          <Sliders className="h-3.5 w-3.5 mr-1" />
                          {isConfigured ? 'Configure' : 'Setup'}
                        </Button>

                        {isConfigured && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestConnection(meta)}
                              disabled={isTesting}
                              className="text-xs h-8 font-semibold px-2.5"
                              title="Test API Handshake"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenSendTest(meta)}
                              className="text-xs h-8 font-semibold px-2.5 text-indigo-600 dark:text-indigo-400"
                              title="Send Test Message / Transaction"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(meta)}
                              className={`text-xs h-8 px-2 ${
                                gateway?.is_enabled
                                  ? 'text-slate-600 hover:text-rose-600'
                                  : 'text-emerald-600 hover:text-emerald-700'
                              }`}
                              title={gateway?.is_enabled ? 'Disable Gateway' : 'Enable Gateway'}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMMUNICATION LOGS SUB-LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Universal Communication Logs</CardTitle>
              <CardDescription className="text-xs">
                Real-time delivery receipts across Email, SMS, WhatsApp, and Telegram.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search recipient or content..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="h-8 text-xs w-64"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading communication history...</div>
            ) : commLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No communication logs recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
                      <th className="p-3">Channel</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Message Content</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Message ID</th>
                      <th className="p-3">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {commLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-3 font-sans capitalize font-semibold">{log.channel}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{log.provider_used}</td>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{log.recipient_destination}</td>
                        <td className="p-3 font-sans text-slate-600 dark:text-slate-300 max-w-xs truncate">{log.message_content}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              log.status === 'sent' || log.status === 'delivered'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                            }`}
                          >
                            {log.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-[10px] text-slate-500">{log.provider_message_id || '—'}</td>
                        <td className="p-3 text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. PAYMENT TRANSACTIONS SUB-LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Financial Payment Transactions</CardTitle>
              <CardDescription className="text-xs">
                Immutable ledger of all bKash, SSLCOMMERZ, Nagad, UddoktaPay, and Stripe checkouts.
              </CardDescription>
            </div>
            <Input
              placeholder="Search internal or provider TRX ID..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="h-8 text-xs w-64"
            />
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading payment ledger...</div>
            ) : paymentTransactions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No payment transactions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 font-sans">
                      <th className="p-3">Internal TRX</th>
                      <th className="p-3">Gateway</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Provider Ref</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paymentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{tx.internal_trx_id}</td>
                        <td className="p-3 capitalize font-sans">{tx.provider}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          ৳ {Number(tx.amount).toLocaleString()} {tx.currency}
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400">{tx.provider_trx_id || 'Pending'}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              tx.payment_status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                : tx.payment_status === 'failed'
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            }`}
                          >
                            {tx.payment_status}
                          </Badge>
                        </td>
                        <td className="p-3 text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. WEBHOOK MONITOR SUB-LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'webhooks' && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-base font-bold">Webhook Events & Signature Monitor</CardTitle>
            <CardDescription className="text-xs">
              Live audit of inbound webhooks, signature verification, and payload replay protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading webhook events...</div>
            ) : webhookRecords.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No incoming webhook events detected yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 font-sans">
                      <th className="p-3">Provider</th>
                      <th className="p-3">Event Type</th>
                      <th className="p-3">Verified</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Event ID</th>
                      <th className="p-3">Received At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {webhookRecords.map((wh) => (
                      <tr key={wh.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 capitalize">{wh.provider}</td>
                        <td className="p-3">{wh.event_type}</td>
                        <td className="p-3">
                          {wh.is_verified ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5" /> Yes
                            </span>
                          ) : (
                            <span className="text-amber-500 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> No
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {wh.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-[10px] text-slate-500">{wh.provider_event_id || '—'}</td>
                        <td className="p-3 text-[10px] text-slate-500">{new Date(wh.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. AUDIT TRAIL SUB-LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-base font-bold">Gateway Security Audit Ledger</CardTitle>
            <CardDescription className="text-xs">
              Audit logs for credentials rotation, test runs, and parameter updates (zero plaintext secrets).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No audit events recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
                      <th className="p-3">Action</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-3 font-semibold capitalize font-sans text-indigo-600 dark:text-indigo-400">
                          {log.action.replace(/_/g, ' ')}
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400">
                          {JSON.stringify(log.details)}
                        </td>
                        <td className="p-3 text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURATION DRAWER / MODAL */}
      {/* ========================================================================= */}
      {selectedMeta && (
        <ModalDialog
          open={isConfigModalOpen}
          onOpenChange={setIsConfigModalOpen}
          title={`Configure ${selectedMeta.name}`}
          description={selectedMeta.tagline}
          maxWidth="max-w-2xl"
          hideFooter
        >
          <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
            {/* Header info & docs link */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  AES-256-GCM Server Encrypted
                </span>
              </div>
              <a
                href={selectedMeta.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Official Docs</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* General Settings: Name, Environment, Enabled */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Display Title</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={selectedMeta.name}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Environment</Label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                  className="h-8 text-xs w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-semibold"
                >
                  <option value="sandbox">Sandbox / Test</option>
                  <option value="live">Live / Production</option>
                </select>
              </div>
            </div>

            {/* Credential Fields */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-amber-500" />
                Secure API Credentials
              </h4>

              {selectedMeta.credentialFields.map((field) => {
                const isPassword = field.type === 'password'
                const isRevealed = showPasswordFields[field.key]
                const val = formData.credentials[field.key] || ''

                return (
                  <div key={field.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </Label>
                      {field.description && <span className="text-[10px] text-slate-400">{field.description}</span>}
                    </div>

                    <div className="relative">
                      <Input
                        type={isPassword && !isRevealed ? 'password' : 'text'}
                        value={val}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            credentials: { ...formData.credentials, [field.key]: e.target.value },
                          })
                        }
                        placeholder={field.placeholder}
                        className="h-8 text-xs font-mono pr-8"
                      />
                      {isPassword && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswordFields({
                              ...showPasswordFields,
                              [field.key]: !showPasswordFields[field.key],
                            })
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Config Fields */}
            {selectedMeta.configFields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                  Connection & Messaging Parameters
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedMeta.configFields.map((field) => {
                    const val = formData.public_config[field.key] ?? ''

                    return (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs font-medium">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </Label>

                        {field.type === 'select' ? (
                          <select
                            value={val}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                public_config: { ...formData.public_config, [field.key]: e.target.value },
                              })
                            }
                            className="h-8 text-xs w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                          >
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type={field.type}
                            value={val}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                public_config: { ...formData.public_config, [field.key]: e.target.value },
                              })
                            }
                            placeholder={field.placeholder}
                            className="h-8 text-xs font-mono"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsConfigModalOpen(false)}>
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={savingConfig} className="text-xs font-semibold">
                  {savingConfig ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEND LIVE TEST MESSAGE */}
      {/* ========================================================================= */}
      <ModalDialog
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        title={`Send Real Test via ${testPayload.provider?.toUpperCase() || 'Gateway'}`}
        description="Verify actual outbound message delivery to a live recipient."
        maxWidth="max-w-lg"
        hideFooter
      >
        <form onSubmit={handleExecuteSendTest} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">
              {testPayload.category === 'email'
                ? 'Test Email Address'
                : testPayload.category === 'sms' || testPayload.category === 'whatsapp'
                ? 'Test Mobile Number (BD format: 017XXXXXXXX)'
                : 'Test Telegram Chat ID'}
            </Label>
            <Input
              value={testPayload.recipient}
              onChange={(e) => setTestPayload({ ...testPayload, recipient: e.target.value })}
              placeholder={testPayload.category === 'email' ? 'admin@printerp.com' : '01711000000'}
              required
              className="h-8 text-xs font-mono"
            />
          </div>

          {testPayload.category === 'email' && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Subject</Label>
              <Input
                value={testPayload.subject}
                onChange={(e) => setTestPayload({ ...testPayload, subject: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Message Body</Label>
            <textarea
              value={testPayload.message}
              onChange={(e) => setTestPayload({ ...testPayload, message: e.target.value })}
              rows={3}
              required
              className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-sans"
            />
          </div>

          {testResultFeedback && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${
                testResultFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
              }`}
            >
              <p className="font-semibold">{testResultFeedback.message}</p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTestModalOpen(false)}>
              Close
            </Button>

            <Button type="submit" size="sm" disabled={sendingTest} className="text-xs font-semibold">
              {sendingTest ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Transmitting...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Dispatch Test
                </>
              )}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

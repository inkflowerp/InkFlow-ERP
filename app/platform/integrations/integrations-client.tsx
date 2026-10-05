'use client'

// ==============================================================================
// PrintFlow SaaS - Platform Integrations & Communication Gateway Command Center
// Location: /platform/integrations
// Supports Email, SMS, Payment, WhatsApp, Telegram, Webhooks, Transactions, & Security
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'
import {
 Layers,
 CheckCircle2,
 AlertTriangle,
 RefreshCw,
 MessageSquare,
 CreditCard,
 Send,
 Globe,
 Radio,
 Eye,
 EyeOff,
 Server,
 Mail,
 Smartphone,
 ShieldCheck,
 ShieldAlert,
 Lock,
 Key,
 Plus,
 Trash2,
 Check,
 Copy,
 ExternalLink,
 Search,
 Filter,
 SlidersHorizontal,
 ChevronRight,
 Info,
 Clock,
 ArrowUpRight,
 Power,
 X,
 FileText,
 AlertCircle,
 HelpCircle,
 Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { formatDateTime, formatTime } from '@/lib/formatters'
import {
 getPlatformGatewaysAction,
 savePlatformGatewayAction,
 testPlatformGatewayConnectionAction,
 sendPlatformGatewayTestAction,
 togglePlatformGatewayAction,
 setDefaultPlatformGatewayAction,
 deletePlatformGatewayAction,
 getPlatformCommunicationLogsAction,
 getPlatformPaymentTransactionsAction,
 getPlatformGatewayWebhooksAction,
 getPlatformGatewayAuditLogsAction,
 getPlatformGatewayTelemetryAction,
} from '@/actions/gateway.actions'
import type {
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

// Metadata definition for supported providers
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
 gmail: {
 id: 'gmail',
 category: 'email',
 name: 'Gmail (Google OAuth 2.0)',
 nameBn: 'জি-মেইল (গুগল ও-অথ ২.০)',
 tagline: 'Google Gmail REST API with OAuth 2.0 token management & high deliverability',
 icon: Mail,
 docsUrl: 'https://developers.google.com/gmail/api/guides',
 popular: true,
 defaultEnv: 'live',
 credentialFields: [
 {
 key: 'tokens',
 label: 'OAuth 2.0 Token Store',
 placeholder: 'Managed automatically via Google Sign-In or paste JSON credentials',
 type: 'password',
 required: false,
 description: 'Auto-populated when connecting via 1-click Google OAuth button',
 },
 ],
 configFields: [
 {
 key: 'sender_name',
 label: 'From Display Name',
 placeholder: 'PrintFlow Platform',
 type: 'text',
 required: true,
 defaultValue: 'PrintFlow Platform',
 },
 {
 key: 'sender_email',
 label: 'Google Account Email',
 placeholder: 'admin@yourcompany.com',
 type: 'text',
 required: true,
 },
 {
 key: 'reply_to_email',
 label: 'Reply-To Email',
 placeholder: 'support@yourcompany.com',
 type: 'text',
 required: false,
 },
 ],
 },
 smtp: {
 id: 'smtp',
 category: 'email',
 name: 'Custom SMTP Server',
 nameBn: 'কাস্টম এসএমটিপি সার্ভার',
 tagline: 'Standard SMTP host (Google Workspace, Microsoft 365, Postfix)',
 icon: Server,
 docsUrl: 'https://nodemailer.com/smtp/',
 popular: true,
 defaultEnv: 'live',
 credentialFields: [
 { key: 'password', label: 'SMTP Password / App Password', placeholder: 'Enter SMTP Password or App Password', type: 'password', required: true, description: 'Application-specific password' },
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
 { key: 'smtp_username', label: 'SMTP Username / Login', placeholder: 'notifications@printflow.bd', type: 'text', required: true },
 { key: 'sender_name', label: 'From Display Name', placeholder: 'PrintFlow Notifications', type: 'text', required: true, defaultValue: 'PrintFlow Notifications' },
 { key: 'sender_email', label: 'From Email Address', placeholder: 'notifications@printflow.bd', type: 'text', required: true },
 { key: 'reply_to_email', label: 'Reply-To Email', placeholder: 'support@printflow.bd', type: 'text', required: false },
 ],
 },
 resend: {
 id: 'resend',
 category: 'email',
 name: 'Resend Cloud API',
 nameBn: 'রিসেন্ড ক্লাউড এপিআই',
 tagline: 'Developer-first email delivery platform with reliable inbox placement',
 icon: Mail,
 docsUrl: 'https://resend.com/docs',
 popular: true,
 defaultEnv: 'live',
 credentialFields: [
 { key: 'api_key', label: 'Resend API Key', placeholder: 're_1234567890abcdef...', type: 'password', required: true, description: 'From Resend Dashboard -> API Keys' },
 ],
 configFields: [
 { key: 'sender_name', label: 'From Display Name', placeholder: 'PrintFlow Notifications', type: 'text', required: true, defaultValue: 'PrintFlow Notifications' },
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
 { key: 'sender_name', label: 'From Display Name', placeholder: 'PrintFlow Delivery', type: 'text', required: true, defaultValue: 'PrintFlow Delivery' },
 { key: 'sender_email', label: 'Verified Sender Email', placeholder: 'orders@yourdomain.com', type: 'text', required: true },
 ],
 },
 ses: {
 id: 'ses',
 category: 'email',
 name: 'Amazon Simple Email Service (SES)',
 nameBn: 'আমাজন সিম্পল ইমেইল সার্ভিস',
 tagline: 'Cost-effective high-scale cloud email with AWS region integration',
 icon: Globe,
 docsUrl: 'https://docs.aws.amazon.com/ses/',
 defaultEnv: 'live',
 credentialFields: [
 { key: 'access_key_id', label: 'AWS Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE', type: 'text', required: true },
 { key: 'secret_access_key', label: 'AWS Secret Access Key', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', type: 'password', required: true },
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
 { key: 'sender_name', label: 'From Display Name', placeholder: 'PrintFlow System', type: 'text', required: true, defaultValue: 'PrintFlow System' },
 ],
 },

 // SMS
 greenweb: {
 id: 'greenweb',
 category: 'sms',
 name: 'Greenweb SMS Gateway',
 nameBn: 'গ্রিনওয়েব এসএমএস গেটওয়ে',
 tagline: 'High-throughput Bangladeshi telco routing (GP, Robi, Banglalink, Teletalk)',
 icon: Smartphone,
 docsUrl: 'https://greenweb.com.bd/sms-api',
 webhookPath: '/api/webhooks/sms-delivery',
 popular: true,
 defaultEnv: 'live',
 credentialFields: [
 { key: 'token', label: 'Greenweb API Access Token', placeholder: 'Enter Greenweb API Access Token', type: 'password', required: true, description: 'Generated from Greenweb SMS portal' },
 ],
 configFields: [
 { key: 'sender_id', label: 'Approved Masking Name / Sender ID', placeholder: 'PRINTFLOW', type: 'text', required: false, description: 'Leave empty for non-masking standard rate' },
 { key: 'base_url', label: 'API Base URL', placeholder: 'https://api.greenweb.com.bd/api.php', type: 'text', required: false, defaultValue: 'https://api.greenweb.com.bd/api.php' },
 ],
 },
 bulksmsbd: {
 id: 'bulksmsbd',
 category: 'sms',
 name: 'BulkSMSBD Carrier Gateway',
 nameBn: 'বাল্কএসএমএসবিডি গেটওয়ে',
 tagline: 'Reliable Bangladeshi SMS carrier route with direct delivery receipts',
 icon: Radio,
 docsUrl: 'http://bulksmsbd.net/api',
 defaultEnv: 'live',
 credentialFields: [
 { key: 'api_key', label: 'BulkSMSBD API Key', placeholder: 'Enter BulkSMSBD API Key', type: 'password', required: true },
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
 { key: 'api_token', label: 'SSL SMS API Token', placeholder: 'Enter SSL SMS API Token', type: 'password', required: true },
 { key: 'sid', label: 'Stakeholder ID (SID)', placeholder: 'PRINTFLOW_CORP', type: 'text', required: true },
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
 { key: 'auth_token', label: 'Twilio Auth Token', placeholder: 'Enter Twilio Auth Token', type: 'password', required: true },
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
 { key: 'app_key', label: 'bKash App Key', placeholder: 'Enter bKash App Key', type: 'text', required: true },
 { key: 'app_secret', label: 'bKash App Secret', placeholder: 'Enter bKash App Secret', type: 'password', required: true },
 { key: 'username', label: 'Merchant API Username', placeholder: 'merchant_username', type: 'text', required: true },
 { key: 'password', label: 'Merchant API Password', placeholder: 'Enter bKash Merchant Password', type: 'password', required: true },
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
 tagline: 'Hosted checkout supporting Cards, bKash, Nagad, Rocket, & Banks in Bangladesh',
 icon: CreditCard,
 docsUrl: 'https://developer.sslcommerz.com',
 webhookPath: '/api/webhooks/sslcommerz',
 popular: true,
 defaultEnv: 'sandbox',
 credentialFields: [
 { key: 'store_id', label: 'Store ID', placeholder: 'printflow_live', type: 'text', required: true },
 { key: 'store_password', label: 'Store Password', placeholder: 'Enter Store Password', type: 'password', required: true },
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
 tagline: 'Direct merchant checkout for Bangladesh Post Office Digital Banking',
 icon: Smartphone,
 docsUrl: 'https://developer.mynagad.com',
 defaultEnv: 'sandbox',
 credentialFields: [
 { key: 'merchant_id', label: 'Nagad Merchant ID', placeholder: '683020000000000', type: 'text', required: true },
 { key: 'merchant_private_key', label: 'Merchant Private Key', placeholder: 'Enter Nagad Merchant Private Key', type: 'password', required: true },
 { key: 'nagad_public_key', label: 'Nagad Public Key (Certificate)', placeholder: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...', type: 'text', required: false },
 ],
 configFields: [
 { key: 'base_url', label: 'API Endpoint', placeholder: 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs', type: 'text', required: false },
 ],
 },
 uddoktapay: {
 id: 'uddoktapay',
 category: 'payment',
 name: 'UddoktaPay Automated Gateway',
 nameBn: 'উদ্যোক্তাপেমেন্ট গেটওয়ে',
 tagline: 'Automated instant checkout for bKash, Nagad, Rocket, Upay, & Cards',
 icon: CreditCard,
 docsUrl: 'https://uddoktapay.com/docs/v2',
 webhookPath: '/api/webhooks/uddoktapay',
 defaultEnv: 'sandbox',
 credentialFields: [
 { key: 'api_key', label: 'UddoktaPay API Key', placeholder: 'Enter UddoktaPay API Key', type: 'password', required: true },
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
 { key: 'secret_key', label: 'Stripe Secret Key', placeholder: 'sk_test_... or sk_live_...', type: 'password', required: true },
 { key: 'publishable_key', label: 'Stripe Publishable Key', placeholder: 'pk_test_... or pk_live_...', type: 'text', required: false },
 { key: 'webhook_secret', label: 'Stripe Webhook Signing Secret', placeholder: 'whsec_...', type: 'password', required: false },
 ],
 configFields: [],
 },

 // WHATSAPP
 meta_whatsapp: {
 id: 'meta_whatsapp',
 category: 'whatsapp',
 name: 'Meta WhatsApp Cloud API',
 nameBn: 'মেটা হোয়াটসঅ্যাপ ক্লাউড এপিআই',
 tagline: 'Official Meta Graph API for automated order confirmations, PDF challans, & proofs',
 icon: MessageSquare,
 docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
 webhookPath: '/api/webhooks/whatsapp',
 popular: true,
 defaultEnv: 'live',
 credentialFields: [
 { key: 'access_token', label: 'System User Permanent Access Token', placeholder: 'EAAQ... (System User Access Token)', type: 'password', required: true, description: 'System user token with whatsapp_business_messaging' },
 { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '109876543210987', type: 'text', required: true, description: 'From Meta WhatsApp App Dashboard -> API Setup' },
 ],
 configFields: [
 { key: 'business_account_id', label: 'WhatsApp Business Account (WABA) ID', placeholder: '123456789012345', type: 'text', required: false },
 { key: 'api_version', label: 'Graph API Version', placeholder: 'v20.0', type: 'text', required: false, defaultValue: 'v20.0' },
 { key: 'verify_token', label: 'Webhook Handshake Verify Token', placeholder: 'printflow_whatsapp_verify_token', type: 'text', required: false, defaultValue: 'printflow_whatsapp_verify_token' },
 ],
 },
 openwa: {
 id: 'openwa',
 category: 'whatsapp',
 name: 'OpenWA Self-Hosted Engine',
 nameBn: 'ওপেনডব্লিউএ সেলফ-হোস্টেড',
 tagline: 'Self-hosted WhatsApp Web session engine for direct message delivery',
 icon: MessageSquare,
 docsUrl: 'https://openwa.dev/docs/api',
 webhookPath: '/api/webhooks/whatsapp',
 defaultEnv: 'live',
 credentialFields: [
 { key: 'api_key', label: 'OpenWA API Key / Secret', placeholder: 'Enter OpenWA API Key (or leave blank if unauthenticated)', type: 'password', required: false, description: 'API Key / Bearer token configured on your OpenWA server' },
 { key: 'webhook_secret', label: 'Webhook Signing Secret', placeholder: 'Enter Webhook Secret (optional)', type: 'password', required: false, description: 'Secret used to verify incoming webhook payloads' },
 ],
 configFields: [
 { key: 'base_url', label: 'OpenWA Server URL', placeholder: 'https://wa.yourdomain.com', type: 'text', required: true },
 { key: 'session_id', label: 'Session ID', placeholder: 'default', type: 'text', required: true, defaultValue: 'default' },
 ],
 },

 // TELEGRAM
 telegram_bot: {
 id: 'telegram_bot',
 category: 'telegram',
 name: 'Official Telegram Bot API',
 nameBn: 'টেলিগ্রাম বট এপিআই',
 tagline: 'Automated administrative system alerts, production dispatch notifications, & challans',
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
  const { tBilingual } = useI18n()
 // Top Level Navigation Tabs: Overview, Channels, Operations, Security
 const [activeSection, setActiveSection] = useState<'overview' | 'channels' | 'operations' | 'security'>('overview')

 // Channels sub-filter: 'all' | 'email' | 'sms' | 'whatsapp' | 'payment' | 'telegram'
 const [channelFilter, setChannelFilter] = useState<'all' | GatewayCategory>('all')

 // Operations sub-tab: 'logs' | 'webhooks' | 'transactions'
 const [operationsTab, setOperationsTab] = useState<'logs' | 'webhooks' | 'transactions'>('logs')

 // Security sub-tab: 'credentials' | 'audit'
 const [securityTab, setSecurityTab] = useState<'credentials' | 'audit'>('credentials')

 // Core Data States
 const [gateways, setGateways] = useState<SanitizedGatewayRecord[]>([])
 const [telemetry, setTelemetry] = useState<GatewayTelemetrySummary | null>(null)
 const [loading, setLoading] = useState(true)
 const [loadError, setLoadError] = useState<string | null>(null)
 const [testingId, setTestingId] = useState<string | null>(null)
 const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)
 const [togglingId, setTogglingId] = useState<string | null>(null)

 // Filters & Search
 const [searchQuery, setSearchQuery] = useState('')
 const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'configured' | 'error' | 'disabled'>('all')

 // Notification Toast
 const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

 // Configuration Modal State (Add or Edit)
 const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
 const [selectedMeta, setSelectedMeta] = useState<ProviderMeta | null>(null)
 const [editingGateway, setEditingGateway] = useState<SanitizedGatewayRecord | null>(null)
 const [modalStep, setModalStep] = useState<1 | 2>(1) // Step 1: Pick channel/provider (if new), Step 2: Configure & Test
 const [selectedChannelCategory, setSelectedChannelCategory] = useState<GatewayCategory>('email')

 // Form State
 const [formData, setFormData] = useState<{
 name: string
 environment: GatewayEnvironment
 is_enabled: boolean
 is_default: boolean
 credentials: Record<string, string>
 public_config: Record<string, any>
 }>({
 name: '',
 environment: 'sandbox',
 is_enabled: true,
 is_default: false,
 credentials: {},
 public_config: {},
 })
 const [replacingFields, setReplacingFields] = useState<Record<string, boolean>>({})
 const [showPasswordFields, setShowPasswordFields] = useState<Record<string, boolean>>({})
 const [savingConfig, setSavingConfig] = useState(false)
 const [modalTestResult, setModalTestResult] = useState<GatewayTestResult | null>(null)
 const [testingInModal, setTestingInModal] = useState(false)
 const [sendingTestInModal, setSendingTestInModal] = useState(false)

 // Send Real Test Message Modal State
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
 subject: 'PrintFlow Integration Verification Test',
 message: 'This is a live test message dispatched from the PrintFlow Platform Control Center.',
 })
 const [testConfirmed, setTestConfirmed] = useState(false)
 const [sendingTest, setSendingTest] = useState(false)
 const [testResultFeedback, setTestResultFeedback] = useState<any | null>(null)

 // Delete Confirmation Modal State
 const [deletingGateway, setDeletingGateway] = useState<SanitizedGatewayRecord | null>(null)
 const [isDeleting, setIsDeleting] = useState(false)

 // Sub-Ledger Data States
 const [commLogs, setCommLogs] = useState<CommunicationLogRecord[]>([])
 const [paymentTransactions, setPaymentTransactions] = useState<GatewayTransactionRecord[]>([])
 const [webhookRecords, setWebhookRecords] = useState<GatewayWebhookRecord[]>([])
 const [auditLogs, setAuditLogs] = useState<GatewayAuditRecord[]>([])
 const [subLedgerLoading, setSubLedgerLoading] = useState(false)
 const [ledgerSearch, setLedgerSearch] = useState('')

 // Selected Webhook for Payload Inspection Modal
 const [selectedWebhook, setSelectedWebhook] = useState<GatewayWebhookRecord | null>(null)

 const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
 setNotification({ type, message })
 setTimeout(() => setNotification(null), 5000)
 }

 // Load Primary Gateways and Overview Telemetry
 const loadGateways = useCallback(async () => {
 setLoading(true)
 setLoadError(null)
 try {
 const [gwRes, telemRes] = await Promise.all([
 getPlatformGatewaysAction(),
 getPlatformGatewayTelemetryAction(),
 ])

 if (gwRes.success && gwRes.data) {
 setGateways(gwRes.data)
 } else {
 setLoadError(gwRes.error || 'Failed to load gateway integrations')
 }

 if (telemRes.success && telemRes.data) {
 setTelemetry(telemRes.data)
 }
 } catch (err: any) {
 setLoadError(err?.message || 'Could not communicate with gateway service')
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => {
 loadGateways()
 }, [loadGateways])

 // Lazy Load Operations and Security Data
 useEffect(() => {
 const fetchSubData = async () => {
 setSubLedgerLoading(true)
 try {
 if (activeSection === 'operations') {
 if (operationsTab === 'logs') {
 const res = await getPlatformCommunicationLogsAction({ search: ledgerSearch })
 if (res.success && res.data) setCommLogs(res.data.logs)
 } else if (operationsTab === 'transactions') {
 const res = await getPlatformPaymentTransactionsAction({ search: ledgerSearch })
 if (res.success && res.data) setPaymentTransactions(res.data.transactions)
 } else if (operationsTab === 'webhooks') {
 const res = await getPlatformGatewayWebhooksAction()
 if (res.success && res.data) setWebhookRecords(res.data.webhooks)
 }
 } else if (activeSection === 'security') {
 if (securityTab === 'audit') {
 const res = await getPlatformGatewayAuditLogsAction()
 if (res.success && res.data) setAuditLogs(res.data.logs)
 }
 }
 } finally {
 setSubLedgerLoading(false)
 }
 }

 if (activeSection === 'operations' || activeSection === 'security') {
 fetchSubData()
 }
 }, [activeSection, operationsTab, securityTab, ledgerSearch])

 // Map of registered gateways by provider
 const gatewaysMap = useMemo(() => {
 const map = new Map<string, SanitizedGatewayRecord>()
 for (const g of gateways) {
 map.set(g.provider, g)
 }
 return map
 }, [gateways])

 // Real KPI stats derived directly from authoritative database
 const kpiStats = useMemo(() => {
 const configured = gateways.filter((g) => g.status !== 'not_configured' && g.is_enabled).length
 const connected = gateways.filter((g) => g.status === 'connected' && g.is_enabled).length
 const needsAttention = gateways.filter(
 (g) => g.status === 'error' || g.needs_reentry || (g.failure_count && g.failure_count > 0)
 ).length
 const disabled = gateways.filter((g) => !g.is_enabled || g.status === 'disabled').length

 return { configured, connected, needsAttention, disabled }
 }, [gateways])

 // Recent Failures list for Overview
 const recentFailures = useMemo(() => {
 return gateways.filter((g) => g.status === 'error' || g.needs_reentry || g.last_test_status === 'failed')
 }, [gateways])

 // Filtered gateways list for Channels view
 const filteredGateways = useMemo(() => {
 return gateways.filter((gw) => {
 if (channelFilter !== 'all' && gw.category !== channelFilter) return false
 if (statusFilter !== 'all') {
 if (statusFilter === 'disabled' && gw.is_enabled) return false
 if (statusFilter !== 'disabled' && gw.status !== statusFilter) return false
 }
 if (searchQuery) {
 const q = searchQuery.toLowerCase()
 const meta = PROVIDERS_METADATA[gw.provider]
 const matchesName = gw.name.toLowerCase().includes(q) || (meta?.name.toLowerCase().includes(q) ?? false)
 const matchesProvider = gw.provider.toLowerCase().includes(q)
 if (!matchesName && !matchesProvider) return false
 }
 return true
 })
 }, [gateways, channelFilter, statusFilter, searchQuery])

 // Providers available to add (grouped by category)
 const availableProvidersForChannel = useMemo(() => {
 return Object.values(PROVIDERS_METADATA).filter((p) => p.category === selectedChannelCategory)
 }, [selectedChannelCategory])

 // Open "Add Integration" Modal
 const handleOpenAddModal = (defaultCategory?: GatewayCategory) => {
 setEditingGateway(null)
 const targetCategory = defaultCategory || 'email'
 setSelectedChannelCategory(targetCategory)
 const firstProvider =
 Object.values(PROVIDERS_METADATA).find((p) => p.category === targetCategory) ||
 Object.values(PROVIDERS_METADATA)[0]
 setSelectedMeta(firstProvider)
 setModalStep(1)

 const initialCreds: Record<string, string> = {}
 const replacing: Record<string, boolean> = {}
 if (firstProvider) {
 firstProvider.credentialFields.forEach((f) => {
 initialCreds[f.key] = ''
 replacing[f.key] = true
 })
 }

 const initialConfig: Record<string, any> = {}
 if (firstProvider) {
 firstProvider.configFields.forEach((f) => {
 initialConfig[f.key] = f.defaultValue ?? ''
 })
 }

 setFormData({
 name: firstProvider ? firstProvider.name : '',
 environment: firstProvider?.defaultEnv || 'sandbox',
 is_enabled: true,
 is_default: false,
 credentials: initialCreds,
 public_config: initialConfig,
 })

 setReplacingFields(replacing)
 setShowPasswordFields({})
 setModalTestResult(null)
 setIsConfigModalOpen(true)
 }

 // Open "Configure / Edit" Modal for existing gateway
 const handleOpenEditModal = (gw: SanitizedGatewayRecord) => {
 const meta = PROVIDERS_METADATA[gw.provider]
 if (!meta) return

 setEditingGateway(gw)
 setSelectedMeta(meta)
 setSelectedChannelCategory(gw.category)
 setModalStep(2)

 const initialCreds: Record<string, string> = {}
 const replacing: Record<string, boolean> = {}

 meta.credentialFields.forEach((f) => {
 if (gw.has_credentials) {
 initialCreds[f.key] = '••••••••'
 replacing[f.key] = false
 } else {
 initialCreds[f.key] = ''
 replacing[f.key] = true
 }
 })

 const initialConfig: Record<string, any> = {}
 meta.configFields.forEach((f) => {
 initialConfig[f.key] = gw.public_config?.[f.key] ?? f.defaultValue ?? ''
 })

 setFormData({
 name: gw.name,
 environment: gw.environment,
 is_enabled: gw.is_enabled,
 is_default: gw.is_default,
 credentials: initialCreds,
 public_config: initialConfig,
 })

 setReplacingFields(replacing)
 setShowPasswordFields({})
 setModalTestResult(null)
 setIsConfigModalOpen(true)
 }

 // Handle Provider Selection in Add Modal
 const handleSelectProviderToAdd = (meta: ProviderMeta) => {
 setSelectedMeta(meta)

 const initialConfig: Record<string, any> = {}
 meta.configFields.forEach((f) => {
 initialConfig[f.key] = f.defaultValue ?? ''
 })

 const initialCreds: Record<string, string> = {}
 const replacing: Record<string, boolean> = {}
 meta.credentialFields.forEach((f) => {
 initialCreds[f.key] = ''
 replacing[f.key] = true
 })

 setFormData({
 name: meta.name,
 environment: meta.defaultEnv,
 is_enabled: true,
 is_default: false,
 credentials: initialCreds,
 public_config: initialConfig,
 })

 setReplacingFields(replacing)
 setShowPasswordFields({})
 setModalTestResult(null)
 setModalStep(2)
 }

 // Save Gateway Configuration
 const handleSaveConfig = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!selectedMeta) return

 setSavingConfig(true)
 try {
 const cleanCreds: Record<string, string> = {}
 for (const [k, v] of Object.entries(formData.credentials)) {
 const shouldInclude = !editingGateway || replacingFields[k]
 if (shouldInclude && v && !v.includes('••••')) {
 cleanCreds[k] = v.trim()
 }
 }

 const payload: GatewayFormData = {
 id: editingGateway?.id,
 category: selectedMeta.category,
 provider: selectedMeta.id,
 name: formData.name || selectedMeta.name,
 environment: formData.environment,
 is_enabled: formData.is_enabled,
 is_default: formData.is_default,
 credentials: cleanCreds,
 public_config: formData.public_config,
 }

 const res = await savePlatformGatewayAction(payload)
 if (res.success && res.data) {
 showToast(`${selectedMeta.name} saved successfully.`)
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

 // Test Connection (Live server-side handshake)
 const handleTestConnection = async (gatewayId: string, providerName: string) => {
 setTestingId(gatewayId)
 try {
 const res = await testPlatformGatewayConnectionAction(gatewayId)
 if (res.success && res.data) {
 showToast(`✓ ${providerName}: ${res.data.message} (${res.data.latency_ms} ms)`)
 await loadGateways()
 } else {
 showToast(`✕ ${providerName} test failed: ${res.error || res.data?.message || 'Unauthorized'}`, 'error')
 await loadGateways()
 }
 } catch {
 showToast(`Error communicating with ${providerName}`, 'error')
 } finally {
 setTestingId(null)
 }
 }

 // Test Connection inside Configuration Modal
 const handleTestInModal = async () => {
 if (!selectedMeta) return
 setTestingInModal(true)
 setModalTestResult(null)

 try {
 const cleanCreds: Record<string, string> = {}
 for (const [k, v] of Object.entries(formData.credentials)) {
 if (v && !v.includes('••••')) {
 cleanCreds[k] = v.trim()
 }
 }

 const override: GatewayFormData = {
 id: editingGateway?.id,
 category: selectedMeta.category,
 provider: selectedMeta.id,
 name: formData.name,
 environment: formData.environment,
 credentials: cleanCreds,
 public_config: formData.public_config,
 }

 const res = await testPlatformGatewayConnectionAction(editingGateway?.id || 'new-temp', override)
 if (res.success && res.data) {
 setModalTestResult(res.data)
 showToast(`✓ Connection verified (${res.data.latency_ms} ms)`)
 } else {
 setModalTestResult({
 success: false,
 status: 'error',
 latency_ms: res.data?.latency_ms || 0,
 message: res.error || res.data?.message || 'Connection handshake failed',
 error: res.error,
 })
 showToast('Connection failed: Check credentials or endpoint', 'error')
 }
 } catch (err: any) {
 setModalTestResult({
 success: false,
 status: 'error',
 latency_ms: 0,
 message: err?.message || 'Connection test error',
 })
 } finally {
 setTestingInModal(false)
 }
 }

 // Dispatch Real Test Message directly from inside Configuration Modal
 const handleSendTestFromModal = async () => {
 if (!selectedMeta) return
 setSendingTestInModal(true)
 setModalTestResult(null)

 try {
 const cleanCreds: Record<string, string> = {}
 for (const [k, v] of Object.entries(formData.credentials)) {
 if (v && !v.includes('••••')) {
 cleanCreds[k] = v.trim()
 }
 }

 let recipient = ''
 if (selectedMeta.category === 'telegram') {
 recipient = String(formData.public_config?.default_chat_id || '').trim()
 if (!recipient) {
 showToast('Please enter Default Group / Channel Chat ID first', 'warning')
 setModalTestResult({
 success: false,
 status: 'error',
 latency_ms: 0,
 message: 'Default Group / Channel Chat ID is required to send Telegram test message.',
 error: 'Missing Chat ID',
 })
 setSendingTestInModal(false)
 return
 }
 } else if (selectedMeta.category === 'email') {
 recipient = String(formData.public_config?.sender_email || formData.public_config?.gmail_account_email || 'admin@printflow.bd').trim()
 } else if (selectedMeta.category === 'sms' || selectedMeta.category === 'whatsapp') {
 recipient = '01711000000'
 }

 let testMessage = `Verified live test message dispatched at ${formatTime(new Date())} (BDT).`
 if (selectedMeta.category === 'telegram') {
 testMessage = `🔔 <b>PrintFlow Telegram Bot Connected!</b>\n\n` +
 `This is a verified live test message confirming that your Official Telegram Bot API gateway is active and able to receive platform alerts.\n\n` +
 `• <b>Bot Name:</b> ${formData.name || 'Telegram Bot'}\n` +
 `• <b>Chat ID:</b> <code>${recipient}</code>\n` +
 `• <b>Parse Mode:</b> ${formData.public_config?.parse_mode || 'HTML'}\n` +
 `• <b>Dispatched At:</b> ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka' })} (BDT)\n\n` +
 `<i>PrintFlow Cloud ERP • Notification Engine</i>`
 }

 const res = await sendPlatformGatewayTestAction({
 gatewayId: editingGateway?.id,
 category: selectedMeta.category,
 provider: selectedMeta.id,
 recipient,
 recipientName: 'PrintFlow Administrator',
 subject: `PrintFlow ${formData.name || selectedMeta.name} Test`,
 message: testMessage,
 credentials: cleanCreds,
 publicConfig: formData.public_config,
 })

 if (res.success && res.data) {
 setModalTestResult({
 success: true,
 status: 'connected',
 latency_ms: res.data.latency_ms || 0,
 message: `✓ Test message sent to ${recipient}! (Message ID: ${res.data.providerMessageId || 'Delivered'})`,
 })
 showToast(`✓ Test message sent to ${selectedMeta.name}! (${res.data.latency_ms} ms)`)
 await loadGateways()
 } else {
 setModalTestResult({
 success: false,
 status: 'error',
 latency_ms: res.data?.latency_ms || 0,
 message: `✕ Failed to send test message: ${res.error || 'Check Chat ID & permissions'}`,
 error: res.error,
 })
 showToast(res.error || 'Failed to send test message', 'error')
 }
 } catch (err: any) {
 setModalTestResult({
 success: false,
 status: 'error',
 latency_ms: 0,
 message: err?.message || 'Error dispatching test message',
 error: err?.message,
 })
 showToast('Error dispatching test message', 'error')
 } finally {
 setSendingTestInModal(false)
 }
 }

 // Set Default Gateway (Atomic single-default)
 const handleSetDefault = async (gw: SanitizedGatewayRecord) => {
 if (!gw.is_enabled) {
 showToast('Please enable this integration before setting it as default.', 'warning')
 return
 }

 setSettingDefaultId(gw.id)
 try {
 const res = await setDefaultPlatformGatewayAction(gw.id)
 if (res.success) {
 showToast(`${gw.name} is now the default ${gw.category.toUpperCase()} provider.`)
 await loadGateways()
 } else {
 showToast(res.error || 'Failed to set default provider', 'error')
 }
 } catch {
 showToast('Error updating default provider', 'error')
 } finally {
 setSettingDefaultId(null)
 }
 }

 // Toggle Enable / Disable
 const handleToggleStatus = async (gw: SanitizedGatewayRecord) => {
 setTogglingId(gw.id)
 try {
 const newEnabled = !gw.is_enabled
 const res = await togglePlatformGatewayAction(gw.id, newEnabled)
 if (res.success) {
 showToast(`${gw.name} ${newEnabled ? 'enabled' : 'disabled'}.`)
 await loadGateways()
 } else {
 showToast(res.error || 'Failed to toggle status', 'error')
 }
 } catch {
 showToast('Failed to toggle gateway status', 'error')
 } finally {
 setTogglingId(null)
 }
 }

 // Delete Gateway with Confirmation
 const handleDeleteConfirm = async () => {
 if (!deletingGateway) return
 setIsDeleting(true)
 try {
 const res = await deletePlatformGatewayAction(deletingGateway.id)
 if (res.success) {
 showToast(`${deletingGateway.name} deleted successfully.`)
 setDeletingGateway(null)
 await loadGateways()
 } else {
 showToast(res.error || 'Failed to delete integration', 'error')
 }
 } catch {
 showToast('Error deleting integration', 'error')
 } finally {
 setIsDeleting(false)
 }
 }

 // Open "Send Test Message" Modal
 const handleOpenSendTest = (gw: SanitizedGatewayRecord) => {
 let defaultRecipient = ''
 if (gw.category === 'email') defaultRecipient = 'admin@printflow.bd'
 else if (gw.category === 'sms' || gw.category === 'whatsapp') defaultRecipient = '01711000000'
 else if (gw.category === 'telegram') defaultRecipient = gw.public_config?.default_chat_id || ''

 const defaultMsg = gw.category === 'telegram'
 ? `🔔 <b>PrintFlow Telegram Test Message</b>\n\nVerified live test message dispatched at ${formatTime(new Date())} (BDT).\n\n• Gateway: ${gw.name}\n• Channel: Official Telegram Bot API`
 : `Verified live test message dispatched at ${formatTime(new Date())} (BDT).`

 setTestPayload({
 gatewayId: gw.id,
 category: gw.category,
 provider: gw.provider,
 recipient: defaultRecipient,
 recipientName: 'PrintFlow Administrator',
 subject: `PrintFlow ${gw.name} Live Test`,
 message: defaultMsg,
 })

 setTestConfirmed(false)
 setTestResultFeedback(null)
 setIsTestModalOpen(true)
 }

 // Dispatch Real Test Message
 const handleExecuteSendTest = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!testConfirmed) {
 showToast('Please confirm explicit acknowledgment before sending real message.', 'warning')
 return
 }

 setSendingTest(true)
 setTestResultFeedback(null)

 try {
 const res = await sendPlatformGatewayTestAction(testPayload)
 if (res.success && res.data) {
 setTestResultFeedback({
 success: true,
 message: `Test message dispatched successfully via ${testPayload.provider}! Message ID: ${res.data.providerMessageId || 'OK'} (${res.data.latency_ms} ms)`,
 data: res.data,
 })
 showToast('Real test message delivered!')
 await loadGateways()
 } else {
 setTestResultFeedback({
 success: false,
 message: res.error || 'Provider rejected message dispatch.',
 })
 showToast(res.error || 'Failed to deliver test message', 'error')
 }
 } catch {
 setTestResultFeedback({ success: false, message: 'Server communication error during test send' })
 showToast('Error dispatching message', 'error')
 } finally {
 setSendingTest(false)
 }
 }

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16 px-3 sm:px-6">
 {/* Toast Notification */}
 {notification && (
 <div
 className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xs flex items-center gap-3 border text-sm font-medium animate-in slide-in- duration-200 ${
 notification.type === 'success'
 ? 'bg-success-surface text-success border-success/30'
 : notification.type === 'warning'
 ? 'bg-warning-surface text-warning border-warning/30'
 : 'bg-destructive/10 text-destructive border-destructive/30'
 }`}
 >
 {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
 {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-warning shrink-0" />}
 {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-destructive shrink-0" />}
 <span className="flex-1">{notification.message}</span>
 <button
 onClick={() => setNotification(null)}
 className="text-muted-foreground hover:text-muted-foreground p-1 rounded-md"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 )}

 {/* Global Platform Settings Nav */}
 <PlatformSettingsNav />

 {/* Page Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
 <div>
 <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
 Platform Integrations
 </h1>
 <p className="text-sm text-muted-foreground mt-1">
 Manage communication, payment and external service connections for PrintFlow.
 </p>
 </div>
 <div className="flex items-center gap-2.5">
 <Button
 variant="outline"
 size="sm"
 onClick={loadGateways}
 disabled={loading}
 className="h-10 px-3.5 text-foreground bg-card border-border hover:bg-muted"
 >
 <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 <Button
 size="sm"
 onClick={() => handleOpenAddModal()}
 className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
 >
 <Plus className="w-4 h-4 mr-1.5" />
 Add Integration
 </Button>
 </div>
 </div>

 {/* Primary Section Segmented Navigation Tabs */}
 <div className="flex border-b border-border overflow-x-auto no-scrollbar space-x-1 sm:space-x-4">
 {[
 { id: 'overview', label: 'Overview', icon: Layers },
 { id: 'channels', label: 'Channels', icon: Radio, count: gateways.length },
 { id: 'operations', label: 'Operations', icon: SlidersHorizontal },
 { id: 'security', label: 'Security & Audit', icon: ShieldCheck },
 ].map((tab) => {
 const Icon = tab.icon
 const isActive = activeSection === tab.id
 return (
 <button
 key={tab.id}
 onClick={() => setActiveSection(tab.id as any)}
 className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-11 ${
 isActive
 ? 'border-primary/20 text-primary font-semibold'
 : 'border-transparent text-muted-foreground hover:text-foreground hover:border-input'
 }`}
 >
 <Icon className="w-4 h-4" />
 <span>{tab.label}</span>
 {tab.count !== undefined && (
 <span
 className={`text-xs px-2 py-0.5 rounded-full ${
 isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
 }`}
 >
 {tab.count}
 </span>
 )}
 </button>
 )
 })}
 </div>

 {/* Error Banner with Retry */}
 {loadError && (
 <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center justify-between gap-3 text-destructive text-sm">
 <div className="flex items-center gap-2.5">
 <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
 <span>Could not load integrations: {loadError}</span>
 </div>
 <Button
 size="sm"
 variant="outline"
 onClick={loadGateways}
 className="border-destructive/30 text-destructive hover:bg-destructive/90"
 >
 Retry
 </Button>
 </div>
 )}

 {/* ========================================================================= */}
 {/* 1. OVERVIEW TAB */}
 {/* ========================================================================= */}
 {activeSection === 'overview' && (
 <div className="space-y-6">
 {/* Real KPI Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
 <Card className="bg-card border-border shadow-sm">
 <CardContent className="p-4 sm:p-5">
 <div className="flex items-center justify-between text-muted-foreground text-xs sm:text-sm font-medium">
 <span>{tBilingual('Configured', 'সেটআপ করা')}</span>
 <SlidersHorizontal className="w-4 h-4 text-primary" />
 </div>
 <div className="text-2xl sm:text-3xl font-bold text-foreground mt-2">
 {kpiStats.configured}
 </div>
 <p className="text-xs text-muted-foreground mt-1">{tBilingual('Saved connections', 'সংরক্ষিত সংযোগ')}</p>
 </CardContent>
 </Card>

 <Card className="bg-card border-border shadow-sm">
 <CardContent className="p-4 sm:p-5">
 <div className="flex items-center justify-between text-muted-foreground text-xs sm:text-sm font-medium">
 <span>{tBilingual('Connected', 'সচল')}</span>
 <CheckCircle2 className="w-4 h-4 text-success" />
 </div>
 <div className="text-2xl sm:text-3xl font-bold text-success mt-2">
 {kpiStats.connected}
 </div>
 <p className="text-xs text-muted-foreground mt-1">{tBilingual('Working properly', 'সঠিকভাবে চলছে')}</p>
 </CardContent>
 </Card>

 <Card className="bg-card border-border shadow-sm">
 <CardContent className="p-4 sm:p-5">
 <div className="flex items-center justify-between text-muted-foreground text-xs sm:text-sm font-medium">
 <span>{tBilingual('Needs Check', 'যাচাই প্রয়োজন')}</span>
 <AlertTriangle className="w-4 h-4 text-warning" />
 </div>
 <div
 className={`text-2xl sm:text-3xl font-bold mt-2 ${
 kpiStats.needsAttention > 0 ? 'text-warning' : 'text-foreground'
 }`}
 >
 {kpiStats.needsAttention}
 </div>
 <p className="text-xs text-muted-foreground mt-1">{tBilingual('Has errors or issues', 'ত্রুটি বা সমস্যা আছে')}</p>
 </CardContent>
 </Card>

 <Card className="bg-card border-border shadow-sm">
 <CardContent className="p-4 sm:p-5">
 <div className="flex items-center justify-between text-muted-foreground text-xs sm:text-sm font-medium">
 <span>{tBilingual('Disabled', 'বন্ধ')}</span>
 <Power className="w-4 h-4 text-muted-foreground" />
 </div>
 <div className="text-2xl sm:text-3xl font-bold text-muted-foreground mt-2">
 {kpiStats.disabled}
 </div>
 <p className="text-xs text-muted-foreground mt-1">{tBilingual('Turned off', 'বন্ধ রাখা হয়েছে')}</p>
 </CardContent>
 </Card>
 </div>

 {/* Quick Actions & Recent Failures */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Quick Actions Card */}
 <Card className="bg-card border-border shadow-sm lg:col-span-1">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-base font-semibold text-foreground">
 Quick Actions
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Common gateway operations & shortcuts
 </CardDescription>
 </CardHeader>
 <CardContent className="p-4 space-y-2.5">
 <Button
 variant="outline"
 className="w-full justify-start text-left h-11 border-border hover:bg-muted text-foreground"
 onClick={() => handleOpenAddModal('email')}
 >
 <Mail className="w-4 h-4 mr-2.5 text-primary" />
 Connect New Email Service
 </Button>
 <Button
 variant="outline"
 className="w-full justify-start text-left h-11 border-border hover:bg-muted text-foreground"
 onClick={() => handleOpenAddModal('sms')}
 >
 <Smartphone className="w-4 h-4 mr-2.5 text-success" />
 Connect BD SMS Gateway
 </Button>
 <Button
 variant="outline"
 className="w-full justify-start text-left h-11 border-border hover:bg-muted text-foreground"
 onClick={() => handleOpenAddModal('payment')}
 >
 <CreditCard className="w-4 h-4 mr-2.5 text-primary" />
 Connect Payment Provider
 </Button>
 <Button
 variant="outline"
 className="w-full justify-start text-left h-11 border-border hover:bg-muted text-foreground"
 onClick={() => {
 setActiveSection('operations')
 setOperationsTab('logs')
 }}
 >
 <FileText className="w-4 h-4 mr-2.5 text-muted-foreground" />
 View Delivery Logs
 </Button>
 </CardContent>
 </Card>

 {/* Configured Gateways Summary / Recent Failures */}
 <Card className="bg-card border-border shadow-sm lg:col-span-2">
 <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-base font-semibold text-foreground">
 Integration Status Summary
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Overview of configured communication and payment connections
 </CardDescription>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setActiveSection('channels')}
 className="text-xs text-primary hover:text-primary hover:bg-primary/90"
 >
 View All Channels <ChevronRight className="w-3.5 h-3.5 ml-1" />
 </Button>
 </CardHeader>
 <CardContent className="p-0">
 {gateways.length === 0 ? (
 <div className="p-8 text-center">
 <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
 <h3 className="text-sm font-medium text-foreground">No integrations configured</h3>
 <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
 Connect your first email, SMS, WhatsApp, payment or Telegram provider to start sending.
 </p>
 <Button
 size="sm"
 onClick={() => handleOpenAddModal()}
 className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
 >
 <Plus className="w-4 h-4 mr-1.5" />
 Add First Integration
 </Button>
 </div>
 ) : (
 <div className="divide-y divide-border">
 {gateways.slice(0, 5).map((gw) => {
 const meta = PROVIDERS_METADATA[gw.provider]
 const Icon = meta?.icon || Radio
 const isError = gw.status === 'error' || gw.needs_reentry

 return (
 <div
 key={gw.id}
 className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
 <Icon className="w-5 h-5" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-foreground">{gw.name}</span>
 <Badge variant="outline" className="text-xs capitalize border-border">
 {gw.category}
 </Badge>
 {gw.is_default && (
 <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
 Default
 </Badge>
 )}
 </div>
 <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
 <span>Env: {gw.environment}</span>
 <span>•</span>
 <span>
 {gw.last_tested_at
 ? `Tested ${formatDateTime(gw.last_tested_at)}`
 : 'Not tested yet'}
 </span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3">
 {/* Status Indicator */}
 {gw.needs_reentry ? (
 <Badge className="bg-warning-surface text-warning border-warning/30 text-xs">
 Credential Needs Re-entry
 </Badge>
 ) : gw.status === 'connected' ? (
 <Badge className="bg-success-surface text-success border-success/30 text-xs flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3 text-success" /> Connected
 </Badge>
 ) : gw.status === 'configured' ? (
 <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
 Configured
 </Badge>
 ) : !gw.is_enabled ? (
 <Badge className="bg-muted text-muted-foreground border-border text-xs">
 Disabled
 </Badge>
 ) : (
 <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
 Error
 </Badge>
 )}

 <Button
 variant="outline"
 size="sm"
 onClick={() => handleOpenEditModal(gw)}
 className="text-xs h-8 px-2.5 border-border text-foreground"
 >
 Configure
 </Button>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* 2. CHANNELS TAB (Email, SMS, WhatsApp, Payment, Telegram) */}
 {/* ========================================================================= */}
 {activeSection === 'channels' && (
 <div className="space-y-5">
 {/* Sub-Filters: Channel Pills & Search */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 {/* Channel Category Selector */}
 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
 {[
 { id: 'all', label: 'All Channels' },
 { id: 'email', label: 'Email' },
 { id: 'sms', label: 'SMS' },
 { id: 'whatsapp', label: 'WhatsApp' },
 { id: 'payment', label: 'Payment' },
 { id: 'telegram', label: 'Telegram' },
 ].map((c) => (
 <button
 key={c.id}
 onClick={() => setChannelFilter(c.id as any)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap min-h-9 ${
 channelFilter === c.id
 ? 'bg-card text-foreground'
 : 'bg-card border border-border text-muted-foreground hover:bg-muted'
 }`}
 >
 {c.label}
 </button>
 ))}
 </div>

 {/* Search Input */}
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 placeholder="Search integrations..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 h-9 text-xs border-border bg-card"
 />
 </div>
 </div>

 {/* Integration Table / List */}
 <Card className="bg-card border-border shadow-sm overflow-hidden">
 {filteredGateways.length === 0 ? (
 <div className="p-10 text-center">
 <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
 <h3 className="text-sm font-semibold text-foreground">
 {channelFilter === 'all'
 ? 'No integrations match your search'
 : `No ${channelFilter.toUpperCase()} providers configured yet`}
 </h3>
 <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
 Add an integration to connect your platform with live sending routes.
 </p>
 <Button
 size="sm"
 onClick={() => handleOpenAddModal(channelFilter !== 'all' ? channelFilter : undefined)}
 className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
 >
 <Plus className="w-4 h-4 mr-1.5" />
 Add {channelFilter !== 'all' ? channelFilter.toUpperCase() : ''} Integration
 </Button>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm text-foreground divide-y divide-border">
 <thead className="bg-muted text-xs text-muted-foreground uppercase tracking-wider font-semibold">
 <tr>
 <th scope="col" className="px-4 py-3.5">
 Provider
 </th>
 <th scope="col" className="px-3 py-3.5">
 Category
 </th>
 <th scope="col" className="px-3 py-3.5">
 Environment
 </th>
 <th scope="col" className="px-3 py-3.5">
 Status
 </th>
 <th scope="col" className="px-3 py-3.5">
 Last Tested
 </th>
 <th scope="col" className="px-3 py-3.5">
 Default
 </th>
 <th scope="col" className="px-4 py-3.5 text-right">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border bg-card">
 {filteredGateways.map((gw) => {
 const meta = PROVIDERS_METADATA[gw.provider]
 const Icon = meta?.icon || Radio
 const isTesting = testingId === gw.id
 const isToggling = togglingId === gw.id
 const isSettingDefault = settingDefaultId === gw.id

 return (
 <tr key={gw.id} className="hover:bg-muted/70 transition-colors">
 {/* Provider Icon & Name */}
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
 <Icon className="w-4 h-4" />
 </div>
 <div>
 <span className="font-medium text-foreground block leading-tight">
 {gw.name}
 </span>
 <span className="text-xs text-muted-foreground block font-mono mt-0.5">
 {gw.provider}
 </span>
 </div>
 </div>
 </td>

 {/* Category */}
 <td className="px-3 py-3.5">
 <Badge variant="outline" className="text-xs font-normal capitalize border-border">
 {gw.category}
 </Badge>
 </td>

 {/* Environment */}
 <td className="px-3 py-3.5">
 <Badge
 className={`text-xs font-medium ${
 gw.environment === 'live'
 ? 'bg-success-surface text-success border-success/30'
 : 'bg-warning-surface text-warning border-warning/30'
 }`}
 >
 {gw.environment === 'live' ? 'Live' : 'Sandbox'}
 </Badge>
 </td>

 {/* Status */}
 <td className="px-3 py-3.5">
 {gw.needs_reentry ? (
 <Badge className="bg-warning-surface text-warning border-warning/30 text-xs">
 Credential issue
 </Badge>
 ) : gw.status === 'connected' ? (
 <Badge className="bg-success-surface text-success border-success/30 text-xs flex items-center gap-1 w-fit">
 <CheckCircle2 className="w-3 h-3 text-success" /> Connected
 </Badge>
 ) : gw.status === 'configured' ? (
 <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
 Configured
 </Badge>
 ) : !gw.is_enabled ? (
 <Badge className="bg-muted text-muted-foreground border-border text-xs">
 Disabled
 </Badge>
 ) : (
 <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
 Needs attention
 </Badge>
 )}
 </td>

 {/* Last Tested */}
 <td className="px-3 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
 {gw.last_tested_at ? (
 <div>
 <span>{formatDateTime(gw.last_tested_at)}</span>
 {gw.last_test_latency_ms !== undefined && gw.last_test_latency_ms > 0 && (
 <span className="text-muted-foreground block text-xs">
 {gw.last_test_latency_ms} ms
 </span>
 )}
 </div>
 ) : (
 <span className="text-muted-foreground">Never</span>
 )}
 </td>

 {/* Default Provider Selector */}
 <td className="px-3 py-3.5">
 {gw.is_default ? (
 <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
 Default
 </Badge>
 ) : (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleSetDefault(gw)}
 disabled={isSettingDefault || !gw.is_enabled}
 className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
 >
 {isSettingDefault ? 'Setting...' : 'Set default'}
 </Button>
 )}
 </td>

 {/* Actions */}
 <td className="px-4 py-3.5 text-right whitespace-nowrap">
 <div className="flex items-center justify-end gap-1.5">
 {/* Test Connection Button */}
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleTestConnection(gw.id, gw.name)}
 disabled={isTesting || !gw.is_enabled}
 className="h-8 px-2.5 text-xs border-border text-foreground hover:bg-muted"
 >
 <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isTesting ? 'animate-spin' : ''}`} />
 Test
 </Button>

 {/* Send Real Message Test Button (Non-payment) */}
 {gw.category !== 'payment' && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleOpenSendTest(gw)}
 disabled={!gw.is_enabled || gw.status === 'not_configured'}
 className="h-8 px-2.5 text-xs border-border text-foreground hover:bg-muted"
 >
 <Send className="w-3 h-3 mr-1" />
 Send
 </Button>
 )}

 {/* Configure / Open Modal */}
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleOpenEditModal(gw)}
 className="h-8 px-2.5 text-xs border-border text-foreground hover:bg-muted"
 >
 Configure
 </Button>

 {/* Enable / Disable Toggle */}
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleToggleStatus(gw)}
 disabled={isToggling}
 title={gw.is_enabled ? 'Disable Integration' : 'Enable Integration'}
 className={`h-8 w-8 p-0 ${
 gw.is_enabled ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground hover:text-muted-foreground'
 }`}
 >
 <Power className="w-4 h-4" />
 </Button>

 {/* Delete Button */}
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setDeletingGateway(gw)}
 title="Delete Integration"
 className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/90"
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </Card>
 </div>
 )}

 {/* ========================================================================= */}
 {/* 3. OPERATIONS TAB (Delivery Logs, Webhooks, Transactions) */}
 {/* ========================================================================= */}
 {activeSection === 'operations' && (
 <div className="space-y-5">
 {/* Operations Segmented Sub-Nav */}
 <div className="flex border-b border-border space-x-3">
 {[
 { id: 'logs', label: 'Delivery Logs' },
 { id: 'webhooks', label: 'Webhooks' },
 { id: 'transactions', label: 'Payment Transactions' },
 ].map((sub) => (
 <button
 key={sub.id}
 onClick={() => setOperationsTab(sub.id as any)}
 className={`py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors min-h-10 ${
 operationsTab === sub.id
 ? 'border-primary/20 text-primary font-semibold'
 : 'border-transparent text-muted-foreground hover:text-foreground'
 }`}
 >
 {sub.label}
 </button>
 ))}
 </div>

 {/* Sub-Ledger Content: Delivery Logs */}
 {operationsTab === 'logs' && (
 <Card className="bg-card border-border shadow-sm">
 <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <div>
 <CardTitle className="text-base font-semibold text-foreground">
 Communication Logs
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Outbound message audit trail across Email, SMS, WhatsApp, and Telegram
 </CardDescription>
 </div>
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 placeholder="Search recipient or content..."
 value={ledgerSearch}
 onChange={(e) => setLedgerSearch(e.target.value)}
 className="pl-9 h-8 text-xs border-border"
 />
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {subLedgerLoading ? (
 <div className="p-10 text-center text-muted-foreground text-sm">
 <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
 Loading delivery logs...
 </div>
 ) : commLogs.length === 0 ? (
 <div className="p-10 text-center text-muted-foreground text-sm">
 No communication logs found in authoritative ledger.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs text-foreground divide-y divide-border">
 <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
 <tr>
 <th className="px-4 py-3">Time</th>
 <th className="px-3 py-3">Channel</th>
 <th className="px-3 py-3">Recipient</th>
 <th className="px-3 py-3">Provider</th>
 <th className="px-3 py-3">Status</th>
 <th className="px-4 py-3">Message ID</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {commLogs.map((log) => (
 <tr key={log.id} className="hover:bg-muted/50">
 <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
 {formatDateTime(log.created_at)}
 </td>
 <td className="px-3 py-3 capitalize font-medium">{log.channel}</td>
 <td className="px-3 py-3 font-mono text-foreground">
 {log.recipient_destination}
 </td>
 <td className="px-3 py-3 uppercase text-muted-foreground font-mono">
 {log.provider_used}
 </td>
 <td className="px-3 py-3">
 <Badge
 className={`text-xs capitalize ${
 log.status === 'sent' || log.status === 'delivered'
 ? 'bg-success-surface text-success border-success/30'
 : 'bg-destructive/10 text-destructive border-destructive/30'
 }`}
 >
 {log.status}
 </Badge>
 </td>
 <td className="px-4 py-3 font-mono text-muted-foreground">
 {log.provider_message_id ? log.provider_message_id.slice(0, 16) : '—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {/* Sub-Ledger Content: Webhooks */}
 {operationsTab === 'webhooks' && (
 <Card className="bg-card border-border shadow-sm">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-base font-semibold text-foreground">
 Webhook Event Ledger
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Incoming provider webhook handshakes and processing status
 </CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {subLedgerLoading ? (
 <div className="p-10 text-center text-muted-foreground text-sm">
 <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
 Loading webhook records...
 </div>
 ) : webhookRecords.length === 0 ? (
 <div className="p-10 text-center text-muted-foreground text-sm">
 No webhook events received yet.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs text-foreground divide-y divide-border">
 <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
 <tr>
 <th className="px-4 py-3">Provider</th>
 <th className="px-3 py-3">Event</th>
 <th className="px-3 py-3">Received At</th>
 <th className="px-3 py-3">Verification</th>
 <th className="px-3 py-3">Status</th>
 <th className="px-4 py-3 text-right">Payload</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {webhookRecords.map((wh) => (
 <tr key={wh.id} className="hover:bg-muted/50">
 <td className="px-4 py-3 uppercase font-mono font-medium text-foreground">
 {wh.provider}
 </td>
 <td className="px-3 py-3 font-mono text-muted-foreground">{wh.event_type}</td>
 <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
 {formatDateTime(wh.created_at)}
 </td>
 <td className="px-3 py-3">
 {wh.is_verified ? (
 <span className="inline-flex items-center text-success gap-1 text-xs">
 <Check className="w-3 h-3" /> Verified
 </span>
 ) : (
 <span className="text-muted-foreground text-xs">Unverified</span>
 )}
 </td>
 <td className="px-3 py-3 capitalize">
 <Badge
 className={`text-xs capitalize ${
 wh.status === 'processed'
 ? 'bg-success-surface text-success border-success/30'
 : 'bg-muted text-muted-foreground border-border'
 }`}
 >
 {wh.status}
 </Badge>
 </td>
 <td className="px-4 py-3 text-right">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setSelectedWebhook(wh)}
 className="h-7 text-xs text-primary hover:text-primary"
 >
 View Event
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {/* Sub-Ledger Content: Payment Transactions */}
 {operationsTab === 'transactions' && (
 <Card className="bg-card border-border shadow-sm">
 <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <div>
 <CardTitle className="text-base font-semibold text-foreground">
 Payment Gateway Transactions
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Platform billing transactions via bKash, SSLCOMMERZ, Nagad, UddoktaPay, and Stripe
 </CardDescription>
 </div>
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 placeholder="Search transaction ID..."
 value={ledgerSearch}
 onChange={(e) => setLedgerSearch(e.target.value)}
 className="pl-9 h-8 text-xs border-border"
 />
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {subLedgerLoading ? (
 <div className="p-10 text-center text-muted-foreground text-sm">
 <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
 Loading payment records...
 </div>
 ) : paymentTransactions.length === 0 ? (
 <div className="p-10 text-center text-muted-foreground text-sm">
 No financial gateway transactions found.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs text-foreground divide-y divide-border">
 <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
 <tr>
 <th className="px-4 py-3">Date</th>
 <th className="px-3 py-3">Provider</th>
 <th className="px-3 py-3">Invoice</th>
 <th className="px-3 py-3">Amount</th>
 <th className="px-3 py-3">Internal Trx ID</th>
 <th className="px-4 py-3">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {paymentTransactions.map((tx) => (
 <tr key={tx.id} className="hover:bg-muted/50">
 <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
 {formatDateTime(tx.created_at)}
 </td>
 <td className="px-3 py-3 uppercase font-mono font-medium text-foreground">
 {tx.provider}
 </td>
 <td className="px-3 py-3 font-mono text-muted-foreground">{tx.invoice_id || '—'}</td>
 <td className="px-3 py-3 font-semibold text-foreground">
 ৳ {Number(tx.amount).toLocaleString('en-BD')}
 </td>
 <td className="px-3 py-3 font-mono text-muted-foreground text-xs">
 {tx.internal_trx_id}
 </td>
 <td className="px-4 py-3">
 <Badge
 className={`text-xs capitalize ${
 tx.payment_status === 'paid'
 ? 'bg-success-surface text-success border-success/30'
 : tx.payment_status === 'initiated' || tx.payment_status === 'pending'
 ? 'bg-primary/10 text-primary border-primary/20'
 : 'bg-destructive/10 text-destructive border-destructive/30'
 }`}
 >
 {tx.payment_status}
 </Badge>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </div>
 )}

 {/* ========================================================================= */}
 {/* 4. SECURITY & AUDIT TAB */}
 {/* ========================================================================= */}
 {activeSection === 'security' && (
 <div className="space-y-5">
 {/* Security Sub-Nav */}
 <div className="flex border-b border-border space-x-3">
 {[
 { id: 'credentials', label: 'Credential Health' },
 { id: 'audit', label: 'Security Audit Log' },
 ].map((sub) => (
 <button
 key={sub.id}
 onClick={() => setSecurityTab(sub.id as any)}
 className={`py-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors min-h-10 ${
 securityTab === sub.id
 ? 'border-primary/20 text-primary font-semibold'
 : 'border-transparent text-muted-foreground hover:text-foreground'
 }`}
 >
 {sub.label}
 </button>
 ))}
 </div>

 {/* Credential Status View */}
 {securityTab === 'credentials' && (
 <Card className="bg-card border-border shadow-sm">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-base font-semibold text-foreground">
 Integration Credential Protection Status
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Application secrets are protected using AES-256-GCM server-side encryption
 </CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs text-foreground divide-y divide-border">
 <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
 <tr>
 <th className="px-4 py-3">Provider</th>
 <th className="px-3 py-3">Encryption Envelope</th>
 <th className="px-3 py-3">Credentials Saved</th>
 <th className="px-3 py-3">Decryption Status</th>
 <th className="px-4 py-3 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {gateways.map((gw) => (
 <tr key={gw.id} className="hover:bg-muted/50">
 <td className="px-4 py-3">
 <span className="font-medium text-foreground block">{gw.name}</span>
 <span className="text-xs text-muted-foreground font-mono capitalize">
 {gw.category} / {gw.provider}
 </span>
 </td>
 <td className="px-3 py-3 font-mono text-muted-foreground">
 AES-256-GCM (v2:k1)
 </td>
 <td className="px-3 py-3">
 {gw.has_credentials ? (
 <span className="inline-flex items-center text-success gap-1 text-xs">
 <Lock className="w-3.5 h-3.5" /> Encrypted
 </span>
 ) : (
 <span className="text-muted-foreground text-xs">Not configured</span>
 )}
 </td>
 <td className="px-3 py-3">
 {gw.needs_reentry ? (
 <Badge className="bg-warning-surface text-warning border-warning/30 text-xs">
 Re-entry required
 </Badge>
 ) : gw.has_credentials ? (
 <Badge className="bg-success-surface text-success border-success/30 text-xs">
 Healthy
 </Badge>
 ) : (
 <Badge className="bg-muted text-muted-foreground border-border text-xs">
 Empty
 </Badge>
 )}
 </td>
 <td className="px-4 py-3 text-right">
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleOpenEditModal(gw)}
 className="h-7 text-xs border-border text-foreground"
 >
 {gw.needs_reentry ? 'Re-enter Secret' : 'Update Secret'}
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Audit Log View */}
 {securityTab === 'audit' && (
 <Card className="bg-card border-border shadow-sm">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-base font-semibold text-foreground">
 Integration Audit Trail
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Immutable record of configuration changes, tests, and deletions (secrets never logged)
 </CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {subLedgerLoading ? (
 <div className="p-10 text-center text-muted-foreground text-sm">
 <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
 Loading audit trail...
 </div>
 ) : auditLogs.length === 0 ? (
 <div className="p-10 text-center text-muted-foreground text-sm">
 No gateway audit logs recorded.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs text-foreground divide-y divide-border">
 <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
 <tr>
 <th className="px-4 py-3">Timestamp</th>
 <th className="px-3 py-3">Action</th>
 <th className="px-3 py-3">Provider</th>
 <th className="px-4 py-3">Details</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {auditLogs.map((log) => (
 <tr key={log.id} className="hover:bg-muted/50">
 <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
 {formatDateTime(log.created_at)}
 </td>
 <td className="px-3 py-3 font-semibold text-foreground capitalize">
 {log.action.replace(/_/g, ' ')}
 </td>
 <td className="px-3 py-3 uppercase font-mono text-muted-foreground">
 {log.details?.provider || '—'}
 </td>
 <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
 {JSON.stringify(log.details)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </div>
 )}

 {/* ========================================================================= */}
 {/* 5. ADD / CONFIGURE MODAL DIALOG */}
 {/* ========================================================================= */}
 <ModalDialog
 open={isConfigModalOpen}
 onOpenChange={setIsConfigModalOpen}
 title={editingGateway ? `Configure ${selectedMeta?.name}` : 'Add Integration'}
 hideFooter
 size="2xl"
 >
 <div className="space-y-5">
 {/* Step 1 (Add only): Channel and Provider Selection */}
 {!editingGateway && modalStep === 1 && (
 <div className="space-y-4">
 <div>
 <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
 Select Channel
 </Label>
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
 {[
 { id: 'email', label: 'Email', icon: Mail },
 { id: 'sms', label: 'SMS', icon: Smartphone },
 { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
 { id: 'payment', label: 'Payment', icon: CreditCard },
 { id: 'telegram', label: 'Telegram', icon: Send },
 ].map((ch) => {
 const Icon = ch.icon
 const isSelected = selectedChannelCategory === ch.id
 return (
 <button
 key={ch.id}
 type="button"
 onClick={() => setSelectedChannelCategory(ch.id as any)}
 className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
 isSelected
 ? 'border-primary/20 bg-primary/10 text-primary ring-2 ring-primary/20'
 : 'border-border bg-card text-muted-foreground hover:bg-muted'
 }`}
 >
 <Icon className="w-5 h-5" />
 <span>{ch.label}</span>
 </button>
 )
 })}
 </div>
 </div>

 <div>
 <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
 Select Provider
 </Label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
 {availableProvidersForChannel.map((meta) => {
 const Icon = meta.icon
 return (
 <button
 key={meta.id}
 type="button"
 onClick={() => handleSelectProviderToAdd(meta)}
 className="p-3.5 rounded-xl border border-border hover:border-primary/20 hover:bg-primary/90 text-left transition-all group flex items-start gap-3"
 >
 <div className="w-9 h-9 rounded-lg bg-muted group-hover:bg-primary/90 flex items-center justify-center text-foreground group-hover:text-primary shrink-0">
 <Icon className="w-5 h-5" />
 </div>
 <div className="flex-1 min-w-0">
 <span className="font-semibold text-foreground block text-sm group-hover:text-primary">
 {meta.name}
 </span>
 <span className="text-xs text-muted-foreground block line-clamp-1 mt-0.5">
 {meta.tagline}
 </span>
 </div>
 </button>
 )
 })}
 </div>
 </div>
 </div>
 )}

 {/* Step 2: Configuration Form (Secrets + Public Config + Test) */}
 {(editingGateway || modalStep === 2) && selectedMeta && (
 <form onSubmit={handleSaveConfig} className="space-y-5">
 {!editingGateway && (
 <button
 type="button"
 onClick={() => setModalStep(1)}
 className="text-xs text-primary hover:text-primary flex items-center gap-1 font-medium"
 >
 ← Choose a different provider
 </button>
 )}

 {/* Provider Header Banner */}
 <div className="p-3.5 bg-muted border border-border rounded-xl flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-foreground">
 <selectedMeta.icon className="w-5 h-5" />
 </div>
 <div>
 <h4 className="text-sm font-semibold text-foreground">{selectedMeta.name}</h4>
 <p className="text-xs text-muted-foreground">{selectedMeta.tagline}</p>
 </div>
 </div>
 {selectedMeta.docsUrl && (
 <a
 href={selectedMeta.docsUrl}
 target="_blank"
 rel="noreferrer"
 className="text-xs text-primary hover:underline flex items-center gap-1 font-medium shrink-0"
 >
 Docs <ExternalLink className="w-3 h-3" />
 </a>
 )}
 </div>

 {/* Special 1-Click Google OAuth Banner for Gmail */}
 {selectedMeta.id === 'gmail' && (
 <div className="p-4 bg-card border border-primary/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
 <div className="space-y-1">
 <div className="flex items-center gap-1.5">
 <Sparkles className="w-4 h-4 text-primary" />
 <span className="text-xs font-bold text-primary uppercase tracking-wider">
 1-Click Google Authorization
 </span>
 </div>
 <p className="text-xs text-primary">
 Connect via official Google OAuth 2.0 consent screen. No need to manage manual passwords or API keys.
 </p>
 </div>
 <Button
 type="button"
 onClick={() => {
 window.location.href = '/api/email/oauth/google/start?scope=platform'
 }}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-4 shrink-0 font-medium shadow-sm flex items-center gap-1.5"
 >
 <Mail className="w-3.5 h-3.5" />
 Sign in with Google
 </Button>
 </div>
 )}

 {/* Integration Name & Environment */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <Label className="text-xs font-semibold text-foreground">Integration Name</Label>
 <Input
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="mt-1 h-9 text-xs border-border"
 placeholder="e.g. Primary Transactional Route"
 />
 </div>
 <div>
 <Label className="text-xs font-semibold text-foreground">Environment</Label>
 <div className="flex gap-2 mt-1">
 {(['sandbox', 'live'] as GatewayEnvironment[]).map((env) => (
 <button
 key={env}
 type="button"
 onClick={() => setFormData({ ...formData, environment: env })}
 className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
 formData.environment === env
 ? 'bg-card text-foreground border-border'
 : 'bg-card border-border text-muted-foreground hover:bg-muted'
 }`}
 >
 {env === 'live' ? 'Live Production' : 'Sandbox / Test'}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* SECTION: CREDENTIALS (Visually Separated) */}
 {selectedMeta.credentialFields.length > 0 && (
 <div className="p-4 bg-muted border border-border rounded-xl space-y-3.5">
 <div className="flex items-center gap-2 border-b border-border pb-2.5">
 <Lock className="w-4 h-4 text-primary" />
 <span className="text-xs font-bold text-foreground uppercase tracking-wider">
 Credentials & API Secrets
 </span>
 <span className="text-xs text-muted-foreground ml-auto">
 Encrypted with AES-256-GCM
 </span>
 </div>

 <div className="space-y-3">
 {selectedMeta.credentialFields.map((field) => {
 const isNew = !editingGateway
 const isReplacing = isNew || (replacingFields[field.key] ?? false)
 const showPassword = showPasswordFields[field.key] ?? false
 const currentValue = formData.credentials[field.key] || ''
 const isMaskedExisting = !isNew && !isReplacing

 return (
 <div key={field.key} className="space-y-1">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-medium text-foreground">
 {field.label} {field.required && <span className="text-destructive">*</span>}
 </Label>
 {editingGateway && !isReplacing && (
 <button
 type="button"
 onClick={() => {
 setReplacingFields({ ...replacingFields, [field.key]: true })
 setFormData({
 ...formData,
 credentials: { ...formData.credentials, [field.key]: '' },
 })
 }}
 className="text-xs text-primary hover:underline font-medium"
 >
 Replace Secret
 </button>
 )}
 </div>

 <div className="relative">
 <Input
 type={field.type === 'password' && !showPassword ? 'password' : 'text'}
 disabled={isMaskedExisting}
 value={isMaskedExisting ? '••••••••••••••••' : currentValue}
 placeholder={isMaskedExisting ? '••••••••••••••••' : (field.placeholder || 'Enter secret...')}
 onChange={(e) =>
 setFormData({
 ...formData,
 credentials: { ...formData.credentials, [field.key]: e.target.value },
 })
 }
 className={`h-9 text-xs border-border pr-10 font-mono ${
 isMaskedExisting
 ? 'bg-muted text-muted-foreground cursor-not-allowed select-none'
 : 'bg-card text-foreground'
 }`}
 />
 {field.type === 'password' && !isMaskedExisting && (
 <button
 type="button"
 onClick={() =>
 setShowPasswordFields({
 ...showPasswordFields,
 [field.key]: !showPassword,
 })
 }
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground p-1"
 title={showPassword ? 'Hide secret' : 'Show secret'}
 >
 {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 </button>
 )}
 </div>
 {field.description && (
 <p className="text-xs text-muted-foreground">{field.description}</p>
 )}
 </div>
 )
 })}
 </div>
 </div>
 )}

 {/* SECTION: PUBLIC CONFIGURATION */}
 {selectedMeta.configFields.length > 0 && (
 <div className="space-y-3.5">
 <div className="flex items-center gap-2 border-b border-border pb-2">
 <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
 <span className="text-xs font-bold text-foreground uppercase tracking-wider">
 Public Configuration
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
 {selectedMeta.configFields.map((field) => (
 <div key={field.key} className="space-y-1">
 <Label className="text-xs font-medium text-foreground">
 {field.label} {field.required && <span className="text-destructive">*</span>}
 </Label>
 {field.type === 'select' && field.options ? (
 <select
 value={formData.public_config[field.key] ?? field.defaultValue ?? ''}
 onChange={(e) =>
 setFormData({
 ...formData,
 public_config: { ...formData.public_config, [field.key]: e.target.value },
 })
 }
 className="w-full h-9 px-3 rounded-md text-xs border border-border bg-card text-foreground"
 >
 {field.options.map((opt) => (
 <option key={opt.value} value={opt.value}>
 {opt.label}
 </option>
 ))}
 </select>
 ) : (
 <Input
 type={field.type === 'number' ? 'number' : 'text'}
 placeholder={field.placeholder}
 value={formData.public_config[field.key] ?? ''}
 onChange={(e) =>
 setFormData({
 ...formData,
 public_config: { ...formData.public_config, [field.key]: e.target.value },
 })
 }
 className="h-9 text-xs border-border"
 />
 )}
 {field.description && (
 <p className="text-xs text-muted-foreground">{field.description}</p>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Webhook Callback Information (if supported) */}
 {selectedMeta.webhookPath && (
 <div className="p-3 bg-muted border border-border rounded-lg text-xs space-y-1">
 <div className="flex items-center justify-between text-foreground font-medium">
 <span>Webhook Callback URL:</span>
 <button
 type="button"
 onClick={() => {
 const origin = typeof window !== 'undefined' ? window.location.origin : ''
 navigator.clipboard.writeText(`${origin}${selectedMeta.webhookPath}`)
 showToast('Webhook URL copied to clipboard')
 }}
 className="text-primary hover:underline flex items-center gap-1 text-xs"
 >
 <Copy className="w-3 h-3" /> Copy URL
 </button>
 </div>
 <p className="font-mono text-muted-foreground text-xs">
 {selectedMeta.webhookPath}
 </p>
 </div>
 )}

 {/* Options: Default & Enabled */}
 <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={formData.is_default}
 onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
 className="w-4 h-4 rounded border-input text-primary"
 />
 <span className="font-medium text-foreground">
 Set as default {selectedMeta.category.toUpperCase()} gateway
 </span>
 </label>

 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={formData.is_enabled}
 onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
 className="w-4 h-4 rounded border-input text-primary"
 />
 <span className="text-muted-foreground">Enabled for traffic</span>
 </label>
 </div>

 {/* Test Handshake Feedback */}
 {modalTestResult && (
 <div
 className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
 modalTestResult.success
 ? 'bg-success-surface text-success border-success/30'
 : 'bg-destructive/10 text-destructive border-destructive/30'
 }`}
 >
 {modalTestResult.success ? (
 <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
 ) : (
 <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
 )}
 <span className="flex-1">
 {modalTestResult.message}
 {modalTestResult.latency_ms > 0 && ` (${modalTestResult.latency_ms} ms)`}
 </span>
 </div>
 )}

 {/* Modal Action Buttons */}
 <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={handleTestInModal}
 disabled={testingInModal || sendingTestInModal || savingConfig}
 className="h-10 text-xs border-border text-foreground hover:bg-muted"
 >
 <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testingInModal ? 'animate-spin' : ''}`} />
 {testingInModal ? 'Testing...' : 'Test Connection'}
 </Button>

 {/* Send Test Message Button for communication channels (Telegram, Email, SMS, WhatsApp) */}
 {['telegram', 'email', 'sms', 'whatsapp'].includes(selectedMeta.category) && (
 <Button
 type="button"
 variant="outline"
 onClick={handleSendTestFromModal}
 disabled={testingInModal || sendingTestInModal || savingConfig}
 className="h-10 text-xs border-primary/20 bg-primary/10 text-primary hover:bg-primary/90 hover:text-primary font-medium"
 >
 <Send className={`w-3.5 h-3.5 mr-1.5 ${sendingTestInModal ? 'animate-spin' : ''}`} />
 {sendingTestInModal ? 'Sending...' : 'Send Test Message'}
 </Button>
 )}
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setIsConfigModalOpen(false)}
 className="h-10 text-xs text-muted-foreground"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={savingConfig}
 className="h-10 px-5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
 >
 {savingConfig ? 'Saving...' : 'Save Configuration'}
 </Button>
 </div>
 </div>
 </form>
 )}
 </div>
 </ModalDialog>

 {/* ========================================================================= */}
 {/* 6. SEND REAL TEST MESSAGE MODAL DIALOG */}
 {/* ========================================================================= */}
 <ModalDialog
 open={isTestModalOpen}
 onOpenChange={setIsTestModalOpen}
 title={`Send Real Test ${testPayload.category.toUpperCase()} Message`}
 hideFooter
 size="lg"
 >
 <form onSubmit={handleExecuteSendTest} className="space-y-4">
 <div className="p-3.5 bg-warning-surface border border-warning/30 rounded-xl flex items-start gap-3 text-warning text-xs">
 <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
 <div>
 <span className="font-semibold block">Live Outbound Transmission</span>
 <p className="mt-0.5 text-warning">
 This will send a real message to the recipient using the configured provider route.
 </p>
 </div>
 </div>

 <div>
 <Label className="text-xs font-semibold text-foreground">
 Recipient {testPayload.category === 'email' ? 'Email Address' : testPayload.category === 'telegram' ? 'Telegram Chat ID / Channel' : 'Mobile Phone Number'}
 </Label>
 <Input
 required
 value={testPayload.recipient}
 onChange={(e) => setTestPayload({ ...testPayload, recipient: e.target.value })}
 className="mt-1 h-9 text-xs border-border"
 placeholder={
 testPayload.category === 'email'
 ? 'admin@printflow.bd'
 : testPayload.category === 'telegram'
 ? '1990933920 or @channel'
 : '01711000000'
 }
 />
 </div>

 {testPayload.category === 'email' && (
 <div>
 <Label className="text-xs font-semibold text-foreground">Subject</Label>
 <Input
 required
 value={testPayload.subject}
 onChange={(e) => setTestPayload({ ...testPayload, subject: e.target.value })}
 className="mt-1 h-9 text-xs border-border"
 />
 </div>
 )}

 <div>
 <Label className="text-xs font-semibold text-foreground">Message Content</Label>
 <textarea
 required
 rows={3}
 value={testPayload.message}
 onChange={(e) => setTestPayload({ ...testPayload, message: e.target.value })}
 className="mt-1 w-full p-2.5 text-xs rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
 />
 </div>

 <label className="flex items-center gap-2 cursor-pointer text-xs pt-1">
 <input
 type="checkbox"
 required
 checked={testConfirmed}
 onChange={(e) => setTestConfirmed(e.target.checked)}
 className="w-4 h-4 rounded border-input text-primary"
 />
 <span className="font-medium text-foreground">
 I confirm this will send a real message to the recipient.
 </span>
 </label>

 {testResultFeedback && (
 <div
 className={`p-3 rounded-lg border text-xs ${
 testResultFeedback.success
 ? 'bg-success-surface text-success border-success/30'
 : 'bg-destructive/10 text-destructive border-destructive/30'
 }`}
 >
 {testResultFeedback.message}
 </div>
 )}

 <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setIsTestModalOpen(false)}
 className="h-9 text-xs"
 >
 Close
 </Button>
 <Button
 type="submit"
 disabled={sendingTest || !testConfirmed}
 className="h-9 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
 >
 {sendingTest ? 'Sending...' : 'Send Test'}
 </Button>
 </div>
 </form>
 </ModalDialog>

 {/* ========================================================================= */}
 {/* 7. DELETE CONFIRMATION MODAL DIALOG */}
 {/* ========================================================================= */}
 <ModalDialog
 open={deletingGateway !== null}
 onOpenChange={(open) => {
 if (!open) setDeletingGateway(null)
 }}
 title="Delete Integration?"
 hideFooter
 size="md"
 >
 <div className="space-y-4">
 <p className="text-sm text-muted-foreground">
 This will permanently remove the configuration for{' '}
 <strong className="text-foreground">{deletingGateway?.name}</strong> from PrintFlow.
 </p>

 {deletingGateway?.is_default && (
 <div className="p-3 bg-warning-surface border border-warning/30 rounded-lg text-xs text-warning flex items-start gap-2">
 <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
 <span>
 <strong>Warning:</strong> This integration is currently the default{' '}
 {deletingGateway?.category.toUpperCase()} provider. If deleted, there will be no
 default until another is designated.
 </span>
 </div>
 )}

 <p className="text-xs text-muted-foreground">
 Historical communication logs and financial payment records are preserved.
 </p>

 <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
 <Button
 variant="outline"
 onClick={() => setDeletingGateway(null)}
 className="h-9 text-xs border-border"
 >
 Cancel
 </Button>
 <Button
 variant="destructive"
 onClick={handleDeleteConfirm}
 disabled={isDeleting}
 className="h-9 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground"
 >
 {isDeleting ? 'Deleting...' : 'Delete Integration'}
 </Button>
 </div>
 </div>
 </ModalDialog>

 {/* ========================================================================= */}
 {/* 8. WEBHOOK PAYLOAD INSPECTION MODAL */}
 {/* ========================================================================= */}
 <ModalDialog
 open={selectedWebhook !== null}
 onOpenChange={(open) => {
 if (!open) setSelectedWebhook(null)
 }}
 title={`Webhook Event: ${selectedWebhook?.event_type || 'Event'}`}
 hideFooter
 size="lg"
 >
 <div className="space-y-3">
 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span>Provider: <strong className="uppercase text-foreground">{selectedWebhook?.provider}</strong></span>
 <span>{selectedWebhook && formatDateTime(selectedWebhook.created_at)}</span>
 </div>

 <div className="p-3 bg-card rounded-lg text-success font-mono text-xs overflow-x-auto max-h-80">
 <pre>{JSON.stringify(selectedWebhook?.payload, null, 2)}</pre>
 </div>

 <div className="pt-2 flex justify-end">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setSelectedWebhook(null)}
 className="text-xs"
 >
 Close
 </Button>
 </div>
 </div>
 </ModalDialog>
 </div>
 )
}

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  PhoneCall,
  DollarSign,
  HardDrive,
  FileCheck2,
  ShieldCheck,
  Lock,
  Download,
  Activity,
  Radio,
  Copy,
  ExternalLink,
  Search,
  Key,
  Database,
  CreditCard,
  Receipt,
  Server,
  Code2,
  X,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import {
  getPlatformIntegrationsHealthAction,
  testIntegrationPingAction,
} from '@/actions/platform-data.actions'
import { IntegrationProviderStatus } from '@/types/platform.types'

interface ProviderDocInfo {
  title: string
  description: string
  envVars: { name: string; description: string; required: boolean }[]
  docsUrl: string
  webhookUrl?: string
}

const PROVIDER_DOCS: Record<string, ProviderDocInfo> = {
  bkash_pgw: {
    title: 'bKash Merchant Payment Gateway',
    description: 'Direct tokenized checkout and mobile financial services payment integration for Bangladeshi Taka (BDT).',
    envVars: [
      { name: 'BKASH_APP_KEY', description: 'Merchant App Key from bKash Developer Portal', required: true },
      { name: 'BKASH_APP_SECRET', description: 'Merchant App Secret from bKash Developer Portal', required: true },
      { name: 'BKASH_USERNAME', description: 'Merchant Merchant Account Username', required: true },
      { name: 'BKASH_PASSWORD', description: 'Merchant Account API Password', required: true },
      { name: 'BKASH_BASE_URL', description: 'bKash API Endpoint (Sandbox or Production)', required: false },
    ],
    docsUrl: 'https://developer.bKash.com',
    webhookUrl: '/api/webhooks/bkash',
  },
  sslcommerz: {
    title: 'SSLCommerz Multi-Channel Payment Gateway',
    description: 'Unified payment gateway supporting VISA, MasterCard, Amex, bKash, Nagad, Rocket, and Internet Banking in Bangladesh.',
    envVars: [
      { name: 'SSLCOMMERZ_STORE_ID', description: 'Merchant Store ID provided by SSLCommerz', required: true },
      { name: 'SSLCOMMERZ_STORE_PASSWORD', description: 'Merchant Store Password', required: true },
      { name: 'SSLCOMMERZ_IS_SANDBOX', description: 'Set to "false" for live production processing', required: false },
    ],
    docsUrl: 'https://developer.sslcommerz.com',
    webhookUrl: '/api/webhooks/sslcommerz',
  },
  whatsapp_cloud: {
    title: 'Meta WhatsApp Cloud API',
    description: 'Official WhatsApp Cloud API for automated order confirmations, PDF challan dispatches, and proof preview approvals.',
    envVars: [
      { name: 'WHATSAPP_API_TOKEN', description: 'Meta System User Permanent Access Token', required: true },
      { name: 'WHATSAPP_PHONE_NUMBER_ID', description: 'Registered Business Phone Number ID in Meta Business Suite', required: true },
      { name: 'WHATSAPP_BUSINESS_ACCOUNT_ID', description: 'WhatsApp Business Account (WABA) ID', required: false },
      { name: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', description: 'Secret token to verify webhook handshakes', required: true },
    ],
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    webhookUrl: '/api/webhooks/whatsapp',
  },
  greenweb_sms: {
    title: 'Greenweb SMS Gateway',
    description: 'High-throughput Bangladeshi telco routing (Grameenphone, Robi, Banglalink, Teletalk) for OTPs and notifications.',
    envVars: [
      { name: 'GREENWEB_SMS_TOKEN', description: 'API Access Token from Greenweb Portal', required: true },
      { name: 'GREENWEB_SENDER_ID', description: 'Approved mask/sender name for SMS headers', required: false },
    ],
    docsUrl: 'https://greenweb.com.bd/sms-api',
    webhookUrl: '/api/webhooks/sms-delivery',
  },
  nbr_vat: {
    title: 'NBR Mushak 6.3 Automated Invoicing Engine',
    description: 'National Board of Revenue (NBR) automated tax deduction, VAT rate matrices, and sequential challan compliance.',
    envVars: [
      { name: 'NBR_VAT_REGISTRATION_NO', description: 'Business BIN / 13-digit VAT Registration Number', required: false },
      { name: 'DEFAULT_VAT_RATE_PCT', description: 'Standard VAT percentage (Default: 15%)', required: false },
    ],
    docsUrl: 'https://nbr.gov.bd',
    webhookUrl: '/api/webhooks/nbr-tax',
  },
  supabase_postgres: {
    title: 'PostgreSQL Database & Connection Pool',
    description: 'Primary PostgreSQL cluster with Row-Level Security, multi-tenant schemas, and high-availability connection pooler.',
    envVars: [
      { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase Project API Endpoint', required: true },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase Service Role Secret Key', required: true },
      { name: 'DATABASE_URL', description: 'PostgreSQL Direct / Transaction Pooler Connection String', required: true },
    ],
    docsUrl: 'https://supabase.com/docs',
  },
  supabase_auth: {
    title: 'Supabase Auth Server & JWT Verification',
    description: 'Authoritative platform authentication, session signing, and zero-trust admin credential evaluation.',
    envVars: [
      { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase Anonymous Client Public Key', required: true },
      { name: 'SUPABASE_JWT_SECRET', description: 'HMAC-SHA256 Token Signing Secret', required: false },
    ],
    docsUrl: 'https://supabase.com/docs/guides/auth',
  },
  supabase_storage: {
    title: 'Supabase Private Storage Buckets',
    description: 'Multi-tenant cloud object storage for prepress artwork, AI imposition vectors, challans, and database backups.',
    envVars: [
      { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase Storage Root Endpoint', required: true },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Service Role Key for Storage Administration', required: true },
    ],
    docsUrl: 'https://supabase.com/docs/guides/storage',
  },
}

export default function PlatformIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [pingingKey, setPingingKey] = useState<string | null>(null)
  const [pingingAll, setPingingAll] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedDocProvider, setSelectedDocProvider] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'payment' | 'notification' | 'storage' | 'tax'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'operational' | 'degraded' | 'not_configured'>('ALL')

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPlatformIntegrationsHealthAction()
      if (res.success && res.data) {
        setIntegrations(res.data)
      } else {
        showToast(res.error || 'Failed to fetch integrations health', 'error')
      }
    } catch {
      showToast('Error connecting to integrations telemetry', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIntegrations()
  }, [loadIntegrations])

  // Single Integration Ping
  const handleTestPing = async (key: string, name: string) => {
    setPingingKey(key)
    try {
      const res = await testIntegrationPingAction(key)
      if (res.success && res.data) {
        showToast(`${name}: ${res.data.message} (${res.data.latency_ms} ms)`)
        await loadIntegrations()
      } else {
        showToast(res.error || `Ping failed for ${name}`, 'error')
      }
    } catch {
      showToast(`Unexpected error pinging ${name}`, 'error')
    } finally {
      setPingingKey(null)
    }
  }

  // Ping All Gateways
  const handlePingAll = async () => {
    setPingingAll(true)
    try {
      await loadIntegrations()
      showToast('Live handshake ping completed for all registered gateway providers.')
    } catch {
      showToast('Error during gateway ping sweep', 'error')
    } finally {
      setPingingAll(false)
    }
  }

  // Copy Webhook / Callback URL
  const handleCopyWebhook = (urlPath: string, key: string) => {
    const fullUrl = `${window.location.origin}${urlPath}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedKey(key)
    showToast(`Webhook callback URL copied: ${fullUrl}`)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  // Export CSV of integrations telemetry
  const handleExportCsv = () => {
    if (integrations.length === 0) {
      showToast('No integration telemetry records to export', 'error')
      return
    }

    const headers = [
      'Provider Key',
      'Provider Name',
      'Category',
      'Status',
      'Latency (ms)',
      'Failure Rate (%)',
      'Last Successful Handshake',
      'Notes & Configuration',
    ]

    const rows = integrations.map((it) => [
      it.key,
      `"${it.name.replace(/"/g, '""')}"`,
      it.category,
      it.status,
      it.latency_ms,
      it.failure_rate_pct,
      it.last_success_at,
      `"${(it.notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `platform_integrations_telemetry_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Integrations telemetry report exported successfully')
  }

  // Filtered List
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((it) => {
      if (categoryFilter !== 'ALL' && it.category !== categoryFilter) return false
      if (statusFilter !== 'ALL' && it.status !== statusFilter) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = it.name.toLowerCase().includes(q)
        const matchKey = it.key.toLowerCase().includes(q)
        const matchNotes = (it.notes || '').toLowerCase().includes(q)
        return matchName || matchKey || matchNotes
      }

      return true
    })
  }, [integrations, categoryFilter, statusFilter, search])

  // Aggregate Stats
  const operationalCount = integrations.filter((i) => i.status === 'operational').length
  const totalCount = integrations.length
  const avgLatency =
    operationalCount > 0
      ? Math.round(
          integrations
            .filter((i) => i.status === 'operational')
            .reduce((acc, i) => acc + i.latency_ms, 0) / operationalCount
        )
      : 0

  const selectedDoc = selectedDocProvider ? PROVIDER_DOCS[selectedDocProvider] : null

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-2xl animate-in slide-in-from-top-2 duration-200 border ${
            notification.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700 shadow-emerald-950/50'
              : 'bg-rose-950 text-rose-200 border-rose-700 shadow-rose-950/50'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Platform Settings Navigation Tabs */}
      <PlatformSettingsNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Radio className="h-4 w-4 text-indigo-400" />
            External Gateways &amp; Third-Party Services
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Layers className="h-7 w-7 text-indigo-400" />
            Integration &amp; Gateway Control Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Real-time connectivity, latency telemetry, and secret governance for bKash, SSLCommerz, Meta WhatsApp Cloud API, Greenweb SMS, and NBR Mushak 6.3.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={handlePingAll}
            disabled={pingingAll || loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-indigo-600/20"
          >
            <Radio className={`h-3.5 w-3.5 mr-1.5 ${pingingAll ? 'animate-spin' : ''}`} />
            Test Ping All Gateways
          </Button>

          <Button
            size="sm"
            onClick={handleExportCsv}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs h-9 px-3 rounded-xl"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={() => loadIntegrations()}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs h-9 px-3 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Executive Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Providers */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400">Registered Gateways</div>
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalCount}</span>
            <span className="text-[11px] font-semibold text-indigo-300">Providers</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Payment, SMS, Storage &amp; NBR Tax</p>
        </Card>

        {/* Operational Status */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400">Operational Health</div>
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">{operationalCount}</span>
            <span className="text-xs text-slate-400">/ {totalCount} Active</span>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
              {totalCount > 0 ? Math.round((operationalCount / totalCount) * 100) : 0}% OK
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Passing heartbeat pings</p>
        </Card>

        {/* Average Response Latency */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400">Average Gateway Latency</div>
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <Radio className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-300">{avgLatency} ms</span>
            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800">
              Fast
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Direct handshake response time</p>
        </Card>

        {/* Zero-Trust Security */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-400">Secret Redaction Policy</div>
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">AES-256</span>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
              GCM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">API keys &amp; tokens encrypted server-side</p>
        </Card>
      </div>

      {/* Security Redaction Banner */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Platform Security Policy Enforced</h4>
            <p className="text-[11px] text-slate-400">
              Private API credentials, webhooks, and gateway tokens are encrypted in hardware-backed key storage and NEVER exposed to frontend bundles.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-lg font-bold shrink-0">
          ZERO-TRUST REDACTED
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Chips */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'ALL', label: 'All Providers' },
              { id: 'payment', label: 'Payment (bKash/SSL)' },
              { id: 'notification', label: 'Messaging & SMS' },
              { id: 'storage', label: 'Storage & DB' },
              { id: 'tax', label: 'NBR Tax' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none h-9"
          >
            <option value="ALL">All Statuses</option>
            <option value="operational">Operational</option>
            <option value="degraded">Degraded</option>
            <option value="not_configured">Not Configured</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search providers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-xl"
          />
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((it) => {
          const isOperational = it.status === 'operational'
          const isDegraded = it.status === 'degraded'
          const isStandby = it.status === 'standby'
          const isNotConfigured = it.status === 'not_configured'
          const isPinging = pingingKey === it.key

          return (
            <Card
              key={it.key}
              className="bg-slate-900/90 border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{it.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">key: {it.key}</span>
                  </div>

                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${
                      isOperational
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : isDegraded
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : isStandby
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                        : isNotConfigured
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800'
                    }`}
                  >
                    {isNotConfigured ? 'NOT CONFIGURED' : it.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">Handshake Latency</div>
                    <div className="font-mono font-bold text-white text-sm mt-0.5">{it.latency_ms} ms</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">Failure Drop Rate</div>
                    <div
                      className={`font-mono font-bold text-sm mt-0.5 ${
                        it.failure_rate_pct > 1 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {it.failure_rate_pct}%
                    </div>
                  </div>
                </div>

                {it.notes && (
                  <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                    {it.notes}
                  </div>
                )}

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Last Handshake:</span>
                  <span className="font-mono text-slate-300 font-medium">{it.last_success_at}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                <Button
                  size="sm"
                  onClick={() => setSelectedDocProvider(it.key)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] h-8 px-2.5 rounded-xl"
                >
                  <Code2 className="h-3 w-3 mr-1 text-cyan-400" />
                  Inspect Setup
                </Button>

                <Button
                  size="sm"
                  disabled={isPinging}
                  onClick={() => handleTestPing(it.key, it.name)}
                  className="bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 text-[11px] font-bold h-8 px-3 rounded-xl"
                >
                  <Radio className={`h-3 w-3 mr-1.5 text-indigo-400 ${isPinging ? 'animate-spin' : ''}`} />
                  {isPinging ? 'Pinging...' : 'Test Handshake'}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Webhook Endpoints & Callback Registry */}
      <Card className="bg-slate-900/90 border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-400" />
              Platform Webhook Callbacks &amp; IPN Registry
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy these URLs into third-party merchant and messaging developer portals for inbound events.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            HTTPS Encrypted Callbacks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: 'bKash Tokenized Checkout IPN',
              key: 'bkash',
              endpoint: '/api/webhooks/bkash',
              desc: 'Receives instant payment notifications and payment agreement webhooks.',
            },
            {
              title: 'SSLCommerz Transaction Callback',
              key: 'sslcommerz',
              endpoint: '/api/webhooks/sslcommerz',
              desc: 'Handles card validation, multi-bank responses, and EFTN settlements.',
            },
            {
              title: 'Meta WhatsApp Cloud Inbound Webhook',
              key: 'whatsapp',
              endpoint: '/api/webhooks/whatsapp',
              desc: 'Captures customer proof approval clicks and delivery status receipts.',
            },
            {
              title: 'Greenweb SMS Delivery Callback',
              key: 'sms',
              endpoint: '/api/webhooks/sms-delivery',
              desc: 'Tracks telco DLR delivery reports and failed SMS fallback queues.',
            },
          ].map((hook) => (
            <div
              key={hook.key}
              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between gap-2.5"
            >
              <div>
                <div className="font-bold text-white text-xs">{hook.title}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{hook.desc}</p>
              </div>

              <div className="flex items-center justify-between gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="font-mono text-xs text-cyan-300 truncate">{hook.endpoint}</span>
                <Button
                  size="sm"
                  onClick={() => handleCopyWebhook(hook.endpoint, hook.key)}
                  className="h-6 px-2 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md shrink-0"
                >
                  <Copy className="h-2.5 w-2.5 mr-1 text-slate-400" />
                  {copiedKey === hook.key ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* PROVIDER SETUP & ENV INSPECTOR MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-slate-900 border-slate-800 shadow-2xl p-6 rounded-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-base">{selectedDoc.title}</h3>
                  <span className="text-[11px] text-slate-400">Environment Variables &amp; Integration Blueprint</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocProvider(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedDoc.description}
            </p>

            {/* Required Environment Variables */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Required Server-Side Environment Variables (.env)
              </h4>
              <div className="space-y-2">
                {selectedDoc.envVars.map((v) => (
                  <div
                    key={v.name}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-cyan-300">{v.name}</span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.2 rounded-full font-bold uppercase ${
                          v.required
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {v.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{v.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook Callback Endpoint */}
            {selectedDoc.webhookUrl && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Webhook Callback URL</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-cyan-300 text-xs">
                    {typeof window !== 'undefined' ? `${window.location.origin}${selectedDoc.webhookUrl}` : selectedDoc.webhookUrl}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleCopyWebhook(selectedDoc.webhookUrl!, selectedDoc.title)}
                    className="h-6 px-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md shrink-0"
                  >
                    <Copy className="h-2.5 w-2.5 mr-1" />
                    Copy URL
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <a
                href={selectedDoc.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <span>Official Developer Documentation</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <Button
                type="button"
                onClick={() => setSelectedDocProvider(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-9 px-4 rounded-xl border border-slate-700 font-semibold"
              >
                Close Inspector
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

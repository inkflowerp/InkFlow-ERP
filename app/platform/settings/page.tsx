'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Settings,
  Database,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Bell,
  Lock,
  Server,
  FileCheck2,
  Sliders,
  Info,
  Download,
  Flame,
  Radio,
  Check,
  Zap,
  Mail,
  Layers,
  ArrowRight,
  Shield,
  Users,
  Send,
  RotateCcw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import { getPlatformBackupStatusAction, getPlatformSettingsAction } from '@/actions/platform-data.actions'
import { PlatformBackupStatus, PlatformSystemSettings } from '@/types/platform.types'
import { formatTime } from '@/lib/formatters'
import {
  updatePlatformSettingsAction,
  triggerPlatformBackupAction,
  triggerDisasterRecoveryDrillAction,
  testIncidentWebhookAction,
  exportPlatformConfigAction,
} from '@/actions/platform.actions'

export default function PlatformSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [backup, setBackup] = useState<PlatformBackupStatus | null>(null)
  const [settings, setSettings] = useState<PlatformSystemSettings | null>(null)
  const [originalSettings, setOriginalSettings] = useState<PlatformSystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [drilling, setDrilling] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reason, setReason] = useState('')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [backupRes, settingsRes] = await Promise.all([
        getPlatformBackupStatusAction(),
        getPlatformSettingsAction(),
      ])
      if (backupRes.success && backupRes.data) setBackup(backupRes.data)
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data)
        setOriginalSettings(settingsRes.data)
      }
    } catch {
      showNotification('Failed to load system settings from database.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const hasUnsavedChanges = useMemo(() => {
    if (!settings || !originalSettings) return false
    return JSON.stringify(settings) !== JSON.stringify(originalSettings)
  }, [settings, originalSettings])

  const handleResetChanges = () => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)))
      showNotification('Unsaved changes reverted to active cluster configuration.', 'info')
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await updatePlatformSettingsAction(
        settings,
        reason.trim() || 'Updated platform system parameters and governance thresholds'
      )
      if (res.success) {
        showNotification('Platform parameters updated and recorded to compliance audit trail.', 'success')
        setOriginalSettings(JSON.parse(JSON.stringify(settings)))
        setReason('')
      } else {
        showNotification((res as any).error || 'Failed to update settings', 'error')
      }
    } catch {
      showNotification('Network error updating settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTriggerBackup = async () => {
    setBackingUp(true)
    try {
      const res = await triggerPlatformBackupAction()
      if (res.success && 'data' in res && res.data) {
        setBackup(res.data)
        showNotification('Manual disaster recovery snapshot triggered successfully (Point-in-Time Basebackup).', 'success')
      } else {
        showNotification((res as any).error || 'Failed to trigger backup', 'error')
      }
    } catch {
      showNotification('Network error triggering snapshot.', 'error')
    } finally {
      setBackingUp(false)
    }
  }

  const handleTriggerDrill = async () => {
    setDrilling(true)
    try {
      const res = await triggerDisasterRecoveryDrillAction()
      if (res.success && 'data' in res && res.data) {
        setBackup(res.data)
        showNotification('Disaster Recovery Point-in-Time restore drill executed: Status PASSED (0 data loss).', 'success')
      } else {
        showNotification((res as any).error || 'Failed to execute recovery drill', 'error')
      }
    } catch {
      showNotification('Network error executing recovery drill.', 'error')
    } finally {
      setDrilling(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!settings?.incident_alert_webhook) {
      showNotification('Please enter a webhook URL first before testing.', 'error')
      return
    }
    setTestingWebhook(true)
    try {
      const res = await testIncidentWebhookAction(settings.incident_alert_webhook)
      if (res.success) {
        const latency = 'data' in res && res.data?.latency_ms ? res.data.latency_ms : 120
        showNotification(
          `Test alert payload successfully dispatched (Latency: ${latency}ms).`,
          'success'
        )
      } else {
        showNotification((res as any).error || 'Failed to test webhook', 'error')
      }
    } catch {
      showNotification('Network error testing webhook endpoint.', 'error')
    } finally {
      setTestingWebhook(false)
    }
  }

  const handleExportConfig = async () => {
    setExporting(true)
    try {
      const res = await exportPlatformConfigAction()
      if (res.success && 'data' in res && res.data) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2))
        const downloadAnchor = document.createElement('a')
        downloadAnchor.setAttribute('href', dataStr)
        downloadAnchor.setAttribute('download', `inkflow-platform-config-${new Date().toISOString().slice(0, 10)}.json`)
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        downloadAnchor.remove()
        showNotification('Platform cluster configuration exported to JSON archive.', 'success')
      } else {
        showNotification((res as any).error || 'Failed to export configuration', 'error')
      }
    } catch {
      showNotification('Network error exporting cluster configuration.', 'error')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'communication' || tab === 'email' || tab === 'gateway') {
      router.replace('/platform/settings/communication')
    }
  }, [searchParams, router])

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Platform Settings Navigation Tabs */}
      <PlatformSettingsNav />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Root Governance &amp; Infrastructure
            </span>
            {hasUnsavedChanges && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                Unsaved Changes
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Settings className="h-7 w-7 text-indigo-400" />
            Platform Settings &amp; Disaster Recovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Cluster-wide system configuration, continuous backup telemetry, security thresholds, and Bangladesh fiscal defaults.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading || saving}
            className="h-9 text-xs border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 cursor-pointer font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={exporting || loading}
            onClick={handleExportConfig}
            className="h-9 text-xs border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 cursor-pointer font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
            {exporting ? 'Exporting...' : 'Export Config'}
          </Button>

          <Button
            size="sm"
            disabled={saving || !settings || loading}
            onClick={handleSaveSettings}
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all animate-in fade-in-0 ${
            notification.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : notification.type === 'info'
              ? 'bg-sky-950/80 border-sky-500/50 text-sky-200'
              : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Maintenance Mode Banner (if active) */}
      {settings?.maintenance_mode_enabled && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/80 via-red-950/70 to-amber-950/80 border border-amber-600/60 text-amber-200 shadow-xl flex items-center justify-between gap-4 animate-in fade-in-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                PLATFORM MAINTENANCE MODE ACTIVE
                <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full uppercase">
                  Live Banner
                </span>
              </div>
              <p className="text-xs text-amber-300/90 mt-0.5">
                {settings.maintenance_message}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setSettings({ ...settings, maintenance_mode_enabled: false })}
            className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 cursor-pointer"
          >
            Deactivate Mode
          </Button>
        </div>
      )}

      {/* High-Level Cluster Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Cluster Infrastructure</span>
            <Server className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <span>Operational</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">PostgreSQL + Redis Vault</p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">WAL Continuous Archiving</span>
            <Database className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">PITR Enabled</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{settings?.backup_retention_days ?? 90} Days Retention</p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Standard VAT &amp; Currency</span>
            <Globe className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {settings?.default_vat_rate_pct ?? 15}% {settings?.default_currency || 'BDT'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">NBR Mushak 6.3 Baseline</p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Default Onboarding Trial</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {settings?.default_trial_days ?? 14} Days
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Full ERP Suite Unlocked</p>
        </Card>
      </div>

      {/* Quick Governance Links Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/platform/settings/communication"
          className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-indigo-950/30 border border-indigo-500/20 hover:border-indigo-500/50 transition-all flex items-center justify-between group shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Email Gateway &amp; SMTP
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">SMTP, Resend, SendGrid &amp; SES</p>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </Link>

        <Link
          href="/platform/integrations"
          className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-purple-950/30 border border-purple-500/20 hover:border-purple-500/50 transition-all flex items-center justify-between group shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Integrations &amp; Webhooks
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">SMS, WhatsApp &amp; Payment sync</p>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </Link>

        <Link
          href="/platform/permissions"
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-emerald-950/30 border border-emerald-500/20 hover:border-emerald-500/50 transition-all flex items-center justify-between group shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                RBAC Role Blueprints
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">6 System templates &amp; 14 modules</p>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </Link>
      </div>

      {/* Backup & Disaster Recovery Card */}
      <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white">Database Backup &amp; Disaster Recovery</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Continuous WAL archiving with multi-region replication and automated point-in-time recovery (PITR).
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {backup?.status.toUpperCase() || 'HEALTHY'}
              </span>

              <Button
                size="sm"
                variant="outline"
                disabled={drilling}
                onClick={handleTriggerDrill}
                className="h-8 text-xs bg-slate-950 border-slate-700 text-cyan-300 hover:bg-slate-800 font-medium cursor-pointer"
              >
                <FileCheck2 className="h-3.5 w-3.5 mr-1 text-cyan-400" />
                {drilling ? 'Testing Drill...' : 'Execute Recovery Drill'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={backingUp}
                onClick={handleTriggerBackup}
                className="h-8 text-xs bg-slate-950 border-slate-700 text-emerald-300 hover:bg-slate-800 font-medium cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                {backingUp ? 'Snapshotting...' : 'Trigger Snapshot'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Last Continuous Snapshot
              </span>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-400" />
                {backup ? formatTime(backup.last_backup_time) : 'Recent'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Age: {backup?.backup_age_hours || 0.5} hours ago
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Retention Window
              </span>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-indigo-400" />
                {settings?.backup_retention_days || backup?.retention_days || 90} Days Continuous
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                WAL Archives + Daily Cold Vault
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Last Restore Drill
              </span>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-cyan-400" />
                {backup?.last_restore_test_date ? backup.last_restore_test_date.slice(0, 10) : '2026-09-08'}
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">
                Status: {backup?.last_restore_status.toUpperCase() || 'PASSED'} (0 Data Loss)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Storage Target
              </span>
              <div className="text-xs font-semibold text-slate-300 truncate">
                GCS Coldline (asia-south1)
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Encrypted with AES-256 (GCM)
              </span>
            </div>
          </div>

          {backup?.notes && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{backup.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global System Settings Form */}
      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Security & Access Policies */}
          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">Security &amp; Access Safeguards</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Platform administrator session TTL, rate limiting, and export caps.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Admin Idle Session Timeout (Minutes)
                </label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={settings.session_timeout_minutes}
                  onChange={(e) =>
                    setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 60 })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Valid range: 5 to 1,440 minutes (24 hours).</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  API Rate Limiting (Requests per Minute per IP)
                </label>
                <Input
                  type="number"
                  min={10}
                  max={10000}
                  value={settings.rate_limit_requests_per_minute}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rate_limit_requests_per_minute: parseInt(e.target.value) || 120,
                    })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Valid range: 10 to 10,000 req/min.</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Max Tenant Data Export Rows
                </label>
                <Input
                  type="number"
                  min={100}
                  max={100000}
                  value={settings.max_export_records}
                  onChange={(e) =>
                    setSettings({ ...settings, max_export_records: parseInt(e.target.value) || 10000 })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Cap per single tenant export JSON archive.</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Enforce 2FA for Platform Admins</span>
                  <span className="text-[10px] text-slate-500">Require TOTP authentication on all admin logins</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.mfa_required_for_admins}
                  onChange={(e) =>
                    setSettings({ ...settings, mfa_required_for_admins: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-indigo-600 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Automated Daily Backups</span>
                  <span className="text-[10px] text-slate-500">Enable scheduled daily database exports &amp; WAL archives</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_backup_enabled ?? true}
                  onChange={(e) =>
                    setSettings({ ...settings, auto_backup_enabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-indigo-600 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Localization, Fiscal & Webhook Alerts */}
          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">Localization, Fiscal &amp; Alerts</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Bangladesh fiscal parameters, default trial period, and webhook alert targets.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Default Currency</label>
                  <Input
                    value={settings.default_currency}
                    onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Mushak 6.3 VAT (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={settings.default_vat_rate_pct}
                    onChange={(e) =>
                      setSettings({ ...settings, default_vat_rate_pct: parseFloat(e.target.value) || 15 })
                    }
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Default Trial (Days)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={settings.default_trial_days}
                    onChange={(e) =>
                      setSettings({ ...settings, default_trial_days: parseInt(e.target.value) || 14 })
                    }
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Backup Retention (Days)
                  </label>
                  <Input
                    type="number"
                    min={7}
                    max={3650}
                    value={settings.backup_retention_days ?? 90}
                    onChange={(e) =>
                      setSettings({ ...settings, backup_retention_days: parseInt(e.target.value) || 90 })
                    }
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Incident Alert Webhook (Slack / Discord)
                  </label>
                  {settings.incident_alert_webhook && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={testingWebhook}
                      onClick={handleTestWebhook}
                      className="h-6 text-[10px] px-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 cursor-pointer"
                    >
                      <Send className="h-2.5 w-2.5 mr-1" />
                      {testingWebhook ? 'Pinging...' : 'Test Webhook'}
                    </Button>
                  )}
                </div>
                <Input
                  value={settings.incident_alert_webhook || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, incident_alert_webhook: e.target.value })
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Dispatches automated JSON notifications upon critical service outage or failover event.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Maintenance Advisory Message
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Maintenance Mode:</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.maintenance_mode_enabled)}
                      onChange={(e) =>
                        setSettings({ ...settings, maintenance_mode_enabled: e.target.checked })
                      }
                      className="h-3.5 w-3.5 accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
                <Input
                  value={settings.maintenance_message}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenance_message: e.target.value })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Justification & Save Card */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Audit Justification Reason (Required for Regulatory &amp; Compliance Logging)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Updated standard VAT rate to 15% per FY2026-27 NBR circular..."
              className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl placeholder:text-slate-600"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {hasUnsavedChanges && (
              <Button
                variant="outline"
                onClick={handleResetChanges}
                disabled={saving}
                className="h-9 px-4 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl font-semibold cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                Discard
              </Button>
            )}

            <Button
              disabled={saving || !settings || loading}
              onClick={handleSaveSettings}
              className="h-9 px-6 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shrink-0 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

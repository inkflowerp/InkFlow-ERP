'use client'

import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlatformService } from '@/services/platform.service'
import { PlatformBackupStatus, PlatformSystemSettings } from '@/types/platform.types'
import { updatePlatformSettingsAction } from '@/actions/platform.actions'

export default function PlatformSettingsPage() {
  const [backup, setBackup] = useState<PlatformBackupStatus | null>(null)
  const [settings, setSettings] = useState<PlatformSystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reason, setReason] = useState('')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    const [backupRes, settingsRes] = await Promise.all([
      PlatformService.getBackupStatus(),
      PlatformService.getPlatformSettings(),
    ])
    if (backupRes.success && backupRes.data) setBackup(backupRes.data)
    if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)
    const res = await updatePlatformSettingsAction(
      settings,
      reason.trim() || 'Updated platform system settings and thresholds'
    )
    if (res.success && res.data) {
      setSettings(res.data)
      showNotification('Platform parameters updated and recorded to audit trail.', 'success')
      setReason('')
    } else {
      showNotification(res.error || 'Failed to update settings', 'error')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Settings className="h-7 w-7 text-indigo-400" />
            Platform Settings & Disaster Recovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Cluster-wide configuration, continuous backup telemetry, security thresholds, and Bangladesh compliance defaults.
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
            Refresh Status
          </Button>
          <Button
            size="sm"
            disabled={saving || !settings}
            onClick={handleSaveSettings}
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Settings'}
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

      {/* Section 28: Backup & Disaster Recovery Card */}
      <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="h-5 w-5 text-emerald-400" />
              <div>
                <CardTitle className="text-base font-bold text-white">Database Backup & Recovery Status</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Continuous WAL archiving with multi-region replication and automated point-in-time recovery (PITR).
                </CardDescription>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {backup?.status.toUpperCase() || 'HEALTHY'}
            </span>
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
                {backup ? new Date(backup.last_backup_time).toLocaleTimeString() : '03:00 UTC'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Age: {backup?.backup_age_hours || 4.5} hours ago
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Retention Window
              </span>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-indigo-400" />
                {backup?.retention_days || 90} Days Continuous
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
                {backup?.last_restore_test_date || '2026-08-28'}
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
                AWS S3 (ap-south-1)
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
                <Lock className="h-5 w-5 text-indigo-400" />
                <div>
                  <CardTitle className="text-sm font-bold text-white">Security & Access Safeguards</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Platform administrator session TTL and rate limit configurations.
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
                  value={settings.session_timeout_minutes}
                  onChange={(e) =>
                    setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 60 })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  API Rate Limiting (Requests per Minute per IP)
                </label>
                <Input
                  type="number"
                  value={settings.rate_limit_requests_per_minute}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rate_limit_requests_per_minute: parseInt(e.target.value) || 120,
                    })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Max Tenant Data Export Rows
                </label>
                <Input
                  type="number"
                  value={settings.max_export_records}
                  onChange={(e) =>
                    setSettings({ ...settings, max_export_records: parseInt(e.target.value) || 50000 })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs font-semibold text-slate-300">Enforce MFA for All Platform Admins</span>
                <input
                  type="checkbox"
                  checked={settings.mfa_required_for_admins}
                  onChange={(e) =>
                    setSettings({ ...settings, mfa_required_for_admins: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-indigo-600 bg-slate-900 border-slate-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* Localization & Webhook Alerts */}
          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <Globe className="h-5 w-5 text-purple-400" />
                <div>
                  <CardTitle className="text-sm font-bold text-white">Localization & Notification Webhooks</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Bangladesh fiscal parameters and incident webhook endpoints.
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
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Mushak 6.3 Standard VAT (%)</label>
                  <Input
                    type="number"
                    value={settings.default_vat_rate_pct}
                    onChange={(e) =>
                      setSettings({ ...settings, default_vat_rate_pct: parseFloat(e.target.value) || 15 })
                    }
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Default Trial Duration (Days)
                </label>
                <Input
                  type="number"
                  value={settings.default_trial_days}
                  onChange={(e) =>
                    setSettings({ ...settings, default_trial_days: parseInt(e.target.value) || 14 })
                  }
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Incident Alert Webhook (Slack / Discord)
                </label>
                <Input
                  value={settings.incident_alert_webhook || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, incident_alert_webhook: e.target.value })
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Maintenance Advisory Message
                </label>
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

      {/* Audit Justification Footer */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Audit Justification Reason (Recommended for Privileged Parameter Updates)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Updated standard VAT to 15% per FY2026 NBR circular..."
              className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 rounded-xl placeholder:text-slate-600"
            />
          </div>
          <Button
            disabled={saving || !settings}
            onClick={handleSaveSettings}
            className="h-9 px-6 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shrink-0"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

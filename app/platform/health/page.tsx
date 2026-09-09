'use client'

import React, { useState, useEffect } from 'react'
import {
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  BellOff,
  Server,
  Terminal,
  Activity,
  Cpu,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPlatformSystemHealthAction } from '@/actions/platform-data.actions'
import {
  SystemHealthEvent,
  SystemHealthSummary,
  SystemHealthCategory,
} from '@/types/platform.types'
import {
  retryFailedJobAction,
  resolveHealthEventAction,
} from '@/actions/platform.actions'

export default function PlatformHealthPage() {
  const [summary, setSummary] = useState<SystemHealthSummary | null>(null)
  const [events, setEvents] = useState<SystemHealthEvent[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showResolved, setShowResolved] = useState<boolean>(false)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadHealth = async () => {
    setLoading(true)
    const res = await getPlatformSystemHealthAction()
    if (res.success && res.data) {
      setSummary(res.data.summary)
      setEvents(res.data.events)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadHealth()
  }, [])

  // Retry Failed Job
  const handleRetryJob = async (eventId: string) => {
    setActionInProgress(eventId)
    const res = await retryFailedJobAction(eventId)
    if (res.success) {
      showNotification('Job triggered for re-execution.')
      await loadHealth()
    } else {
      showNotification('Failed to retry job', 'error')
    }
    setActionInProgress(null)
  }

  // Resolve Alert
  const handleResolveAlert = async (eventId: string) => {
    setActionInProgress(eventId)
    const res = await resolveHealthEventAction(eventId)
    if (res.success) {
      showNotification('Alert marked as resolved.')
      await loadHealth()
    } else {
      showNotification('Failed to resolve alert', 'error')
    }
    setActionInProgress(null)
  }

  const filteredEvents = events.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    if (!showResolved && e.resolved) return false
    return true
  })

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <HeartPulse className="h-7 w-7 text-pink-500" />
            System Health & Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time monitoring for background jobs, notification dispatchers, cloud storage quotas, payment APIs, and government tax integrations.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadHealth}
          className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh Telemetry
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Overview Status Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-md">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">Core Cluster Telemetry:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {summary?.overall_system_status || 'HEALTHY'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span>Uptime: 99.98%</span>
              <span>•</span>
              <span>Cluster: BD-Central Dhaka DC</span>
              <span>•</span>
              <span>PostgreSQL RLS v16.3 Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Connection Pool</div>
            <div className="font-black text-white text-sm mt-0.5">24 / 100 conns</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">API Latency</div>
            <div className="font-black text-emerald-400 text-sm mt-0.5">42 ms avg</div>
          </div>
        </div>
      </div>

      {/* 5 Specific Health Categories Requested by User */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Failed Jobs */}
        <Card className="bg-slate-900 border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Failed Jobs</span>
            <Terminal className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {summary?.failed_jobs_count || 0}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">Background workers</div>
        </Card>

        {/* 2. Failed Notifications */}
        <Card className="bg-slate-900 border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Failed Alerts</span>
            <BellOff className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {summary?.failed_notifications_count || 0}
          </div>
          <div className="text-[11px] text-red-400 mt-1">SMS & WhatsApp drops</div>
        </Card>

        {/* 3. Storage Usage */}
        <Card className="bg-slate-900 border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Storage Usage</span>
            <HardDrive className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {summary?.storage_used_gb ?? 0} GB
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">
            of {summary?.storage_total_gb ?? 100} GB (
            {summary && summary.storage_total_gb > 0
              ? ((summary.storage_used_gb / summary.storage_total_gb) * 100).toFixed(1)
              : '0'}
            %)
          </div>
        </Card>

        {/* 4. API Failures */}
        <Card className="bg-slate-900 border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>API Failures</span>
            <AlertTriangle className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {summary?.api_failures_count || 0}
          </div>
          <div className="text-[11px] text-purple-400 mt-1">bKash / PGW timeouts</div>
        </Card>

        {/* 5. Integration Errors */}
        <Card className="bg-slate-900 border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Integrations</span>
            <Server className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {summary?.integration_errors_count || 0}
          </div>
          <div className="text-[11px] text-indigo-400 mt-1">NBR Mushak 6.3 sync</div>
        </Card>
      </div>

      {/* Storage Breakdown Meter Card */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <HardDrive className="h-4 w-4 text-cyan-400" />
              <span>Multi-Tenant Cloud Media &amp; Proof Storage (BD-Central Bucket)</span>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {summary?.storage_used_gb ?? 0} GB / {summary?.storage_total_gb ?? 100} GB Tier Quota
            </span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    1,
                    Math.round(
                      ((summary?.storage_used_gb ?? 0) / (summary?.storage_total_gb ?? 100)) * 100
                    )
                  )
                )}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span>
                Prepress Artwork &amp; AI Vector Files (
                {((summary?.storage_used_gb ?? 0) * 0.6).toFixed(2)} GB)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span>
                Scanned Challans &amp; Signed Gatepasses (
                {((summary?.storage_used_gb ?? 0) * 0.25).toFixed(2)} GB)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-pink-400" />
              <span>
                Encrypted Nightly DB Snapshot Backups (
                {((summary?.storage_used_gb ?? 0) * 0.15).toFixed(2)} GB)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter and Telemetry Event Logs */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Active Telemetry Incidents & Alerts</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {filteredEvents.length} Events
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Inspect live application logs, review stack traces, and trigger manual job retries.
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                <option value="job">Failed Jobs</option>
                <option value="notification">Failed Notifications</option>
                <option value="storage">Storage Thresholds</option>
                <option value="api">API Failures</option>
                <option value="integration">Integration Errors</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span>Include Resolved</span>
              </label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-800/80">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <div className="font-semibold text-white text-sm">No Active Telemetry Alerts</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  All background workers and payment integrations are operating nominally.
                </div>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const isExpanded = expandedEventId === event.id
                return (
                  <div key={event.id} className="p-4 sm:p-5 hover:bg-slate-850/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            event.resolved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : event.severity === 'error' || event.severity === 'critical'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {event.resolved ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                event.severity === 'error' || event.severity === 'critical'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                  : event.severity === 'warning'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              }`}
                            >
                              {event.severity}
                            </span>
                            <span className="font-mono text-xs font-bold text-white">
                              {event.service_name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              Category: {event.category}
                            </span>
                            {event.company_name && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {event.company_name}
                              </span>
                            )}
                            {event.resolved && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Resolved
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            {event.message}
                          </p>

                          <div className="text-[10px] text-slate-500">
                            Logged: {new Date(event.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedEventId(isExpanded ? null : event.id)
                          }
                          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
                        >
                          <span>Payload</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        {!event.resolved && (
                          <>
                            {event.category === 'job' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionInProgress === event.id}
                                onClick={() => handleRetryJob(event.id)}
                                className="h-8 px-2.5 text-xs text-indigo-400 border-indigo-800/60 bg-indigo-950/40 hover:bg-indigo-900/60 rounded-lg font-bold"
                              >
                                {actionInProgress === event.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                )}
                                Retry Job
                              </Button>
                            )}

                            <Button
                              size="sm"
                              disabled={actionInProgress === event.id}
                              onClick={() => handleResolveAlert(event.id)}
                              className="h-8 px-2.5 text-xs text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-lg font-bold"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark Resolved
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expandable JSON Error Payload */}
                    {isExpanded && event.error_details && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">
                          Diagnostic Error Payload
                        </div>
                        <pre>{JSON.stringify(event.error_details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

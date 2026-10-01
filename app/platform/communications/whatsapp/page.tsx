'use client'

// ==============================================================================
// PrintERP SaaS - Platform Superadmin WhatsApp Gateway Infrastructure Monitoring
// Location: Platform Superadmin -> Communications -> WhatsApp Gateway
// Real-time server telemetry, active Chromium sessions, and force restart controls
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  RotateCw,
  Search,
  ExternalLink,
  ShieldAlert,
  Building,
  Radio,
  Cpu,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  getPlatformWhatsAppOverviewAction,
  platformRestartTenantSessionAction,
  platformTerminateTenantSessionAction,
  type PlatformWhatsAppOverview,
} from '@/actions/platform-whatsapp.actions'

export default function PlatformWhatsAppMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PlatformWhatsAppOverview | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchOverview = useCallback(async () => {
    try {
      const res = await getPlatformWhatsAppOverviewAction()
      if (res.success && res.data) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch platform WhatsApp overview:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
    const timer = setInterval(fetchOverview, 15000) // 15s live polling
    return () => clearInterval(timer)
  }, [fetchOverview])

  const handleRestart = async (sessionId: string) => {
    if (!confirm(`Force restart OpenWA Chromium process for session ${sessionId}?`)) return
    setActionInProgress(sessionId)
    try {
      const res = await platformRestartTenantSessionAction(sessionId)
      if (res.success) {
        alert(res.message)
        await fetchOverview()
      } else {
        alert(res.error || 'Failed to restart session.')
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const handleTerminate = async (sessionId: string) => {
    if (!confirm(`Are you sure you want to terminate and delete session ${sessionId}?`)) return
    setActionInProgress(sessionId)
    try {
      const res = await platformTerminateTenantSessionAction(sessionId)
      if (res.success) {
        alert(res.message)
        await fetchOverview()
      } else {
        alert(res.error || 'Failed to terminate session.')
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const gateway = data?.gatewayStatus
  const sessions = data?.tenantSessions || []

  const filteredSessions = sessions.filter(
    (s) =>
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companySlug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phoneNumber && s.phoneNumber.includes(searchQuery))
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-emerald-600 animate-pulse" />
            OpenWA Multi-Tenant WhatsApp Gateway
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global server health, isolated tenant Chromium sessions, and live delivery telemetry.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRefreshing(true)
            fetchOverview()
          }}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Gateway Server
              </span>
              <Server className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  gateway?.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {gateway?.online ? 'Online' : 'Offline'}
              </span>
              {gateway?.latencyMs !== undefined && (
                <span className="text-xs text-muted-foreground">({gateway.latencyMs}ms)</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {gateway?.baseUrl || 'Unreachable'}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Active WhatsApp Sessions
              </span>
              <Smartphone className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {sessions.filter((s) => s.status === 'connected').length}
              </span>
              <span className="text-xs text-muted-foreground">/ {sessions.length} total tenants</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paired & ready for messaging</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                QR Ready / Pending
              </span>
              <RotateCw className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {sessions.filter((s) => s.status === 'qr_ready' || s.status === 'connecting').length}
              </span>
              <span className="text-xs text-muted-foreground">awaiting pairing</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending user QR camera scan</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Engine & Version
              </span>
              <Cpu className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground truncate">
                {gateway?.version || 'v0.24.0'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">whatsapp-web.js (headless Chrome)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Sessions Table */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Tenant WhatsApp Gateway Sessions</CardTitle>
              <CardDescription className="text-xs">
                Per-tenant dedicated isolated sessions with daily rate quotas and status controls.
              </CardDescription>
            </div>

            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search tenant or session..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
                  <th className="p-3 pl-4">Tenant / Business</th>
                  <th className="p-3">Session ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Linked Phone</th>
                  <th className="p-3">Today / Limit</th>
                  <th className="p-3">Last Active</th>
                  <th className="p-3 pr-4 text-right">Superadmin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading tenant WhatsApp sessions...
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No tenant sessions found.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session) => {
                    const isConnected = session.status === 'connected'
                    const inAction = actionInProgress === session.sessionId

                    return (
                      <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 pl-4">
                          <div>
                            <p className="font-semibold text-foreground">{session.companyName}</p>
                            <p className="text-[11px] text-muted-foreground">{session.companySlug}</p>
                          </div>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {session.sessionId}
                        </td>

                        <td className="p-3">
                          <Badge
                            variant={
                              isConnected
                                ? 'default'
                                : session.status === 'qr_ready'
                                ? 'secondary'
                                : 'outline'
                            }
                            className={`capitalize text-[10px] font-medium ${
                              isConnected
                                ? 'bg-emerald-600 text-white'
                                : session.status === 'qr_ready'
                                ? 'bg-amber-600 text-white'
                                : ''
                            }`}
                          >
                            {session.status}
                          </Badge>
                        </td>

                        <td className="p-3">
                          {session.phoneNumber ? (
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <span>🇧🇩</span>
                              <span>{session.phoneNumber}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </td>

                        <td className="p-3">
                          <span className="font-semibold">{session.todaySendCount}</span>
                          <span className="text-muted-foreground"> / {session.dailySendLimit}</span>
                        </td>

                        <td className="p-3 text-muted-foreground">
                          {session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString() : 'N/A'}
                        </td>

                        <td className="p-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={inAction}
                              onClick={() => handleRestart(session.sessionId)}
                              className="h-7 text-[11px] gap-1"
                              title="Force restart Chromium session"
                            >
                              <RotateCw className={`w-3 h-3 ${inAction ? 'animate-spin' : ''}`} />
                              Restart
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={inAction}
                              onClick={() => handleTerminate(session.sessionId)}
                              className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              title="Terminate session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

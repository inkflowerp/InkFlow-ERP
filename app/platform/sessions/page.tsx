'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Laptop,
  Smartphone,
  Globe,
  LogOut,
  Shield,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Clock,
  Key,
  Lock,
  AlertTriangle,
  History,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPlatformSecurityOverviewAction } from '@/actions/platform-data.actions'
import { PlatformActiveSession, PlatformLoginHistoryItem } from '@/types/platform.types'
import { revokePlatformSessionAction, revokeAllOtherPlatformSessionsAction } from '@/actions/platform.actions'
import { formatDate, formatDateTime } from '@/lib/formatters'

export default function PlatformSessionsPage() {
  const [sessions, setSessions] = useState<PlatformActiveSession[]>([])
  const [loginHistory, setLoginHistory] = useState<PlatformLoginHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getPlatformSecurityOverviewAction()
      if (res.success && res.data) {
        setSessions(res.data.active_sessions || [])
        setLoginHistory(res.data.login_history || [])
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRevokeSession = async (sessionId: string) => {
    setActionInProgress(sessionId)
    try {
      const res = await revokePlatformSessionAction(sessionId)
      if (res.success) {
        showNotification('Platform session revoked successfully.')
        await loadData()
      } else {
        showNotification(res.error || 'Failed to revoke session.')
      }
    } catch {
      showNotification('An unexpected error occurred.')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleRevokeAllOthers = async () => {
    setActionInProgress('all-others')
    try {
      const res = await revokeAllOtherPlatformSessionsAction()
      if (res.success) {
        showNotification('All other active platform sessions have been revoked.')
        await loadData()
      } else {
        showNotification(res.error || 'Failed to revoke sessions.')
      }
    } catch {
      showNotification('An unexpected error occurred.')
    } finally {
      setActionInProgress(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Device &amp; Session Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Laptop className="h-7 w-7 text-indigo-400" />
            Platform Active Sessions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time tracking of authenticated platform administrator sessions, client IP origins, and active browser tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sessions.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              disabled={actionInProgress !== null}
              onClick={handleRevokeAllOthers}
              className="h-9 text-xs border-rose-900/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
              Revoke All Other Sessions
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData()}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Active Sessions List */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Active Authorized Sessions ({sessions.length})</h3>
          </div>
          <span className="text-[11px] text-slate-400">Tokens cryptographically validated via Supabase Auth</span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading active sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No active sessions detected.
            </div>
          ) : (
            sessions.map((sess) => (
              <div
                key={sess.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  sess.is_current
                    ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Laptop className="h-5 w-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs">{sess.device_name || 'Secure Browser'}</span>
                      {sess.is_current && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Current Session
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                        IP: {sess.ip_address || '127.0.0.1'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-slate-500" />
                        {sess.location || 'Dhaka, Bangladesh'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        Last active: {formatDateTime(sess.last_seen_at)}
                      </span>
                      <span className="text-slate-500">
                        Created: {formatDate(sess.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {!sess.is_current && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={actionInProgress === sess.id}
                    onClick={() => handleRevokeSession(sess.id)}
                    className="h-8 px-3 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/30 shrink-0 self-end sm:self-center"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {actionInProgress === sess.id ? 'Revoking...' : 'Terminate'}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Login History */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Recent Authentication Events</h3>
          </div>
          <Link href="/platform/audit">
            <span className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium">
              View Complete Audit Logs &rarr;
            </span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">IP Origin</th>
                <th className="py-2.5 px-3">Browser / Device</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loginHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No recent login events recorded.
                  </td>
                </tr>
              ) : (
                loginHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3">
                      {item.status === 'successful' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.ip_address}</td>
                    <td className="py-2.5 px-3 text-slate-300">{item.device_browser}</td>
                    <td className="py-2.5 px-3 text-slate-400">{item.location}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {formatDateTime(item.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}

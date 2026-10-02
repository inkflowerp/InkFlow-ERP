'use client'

import React, { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'
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
  const { tBilingual } = useI18n()
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
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-primary/10" />
 Device &amp; Session Management
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <Laptop className="h-7 w-7 text-primary" />
 {tBilingual('Active Logins', 'চলমান লগইন')}
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 {tBilingual('See all devices currently logged in to your account.', 'আপনার একাউন্টে বর্তমানে লগইন থাকা সব ডিভাইস দেখুন।')}
 </p>
 </div>

 <div className="flex items-center gap-2">
 {sessions.length > 1 && (
 <Button
 size="sm"
 variant="outline"
 disabled={actionInProgress !== null}
 onClick={handleRevokeAllOthers}
 className="h-9 text-xs border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/90"
 >
 <LogOut className="h-3.5 w-3.5 mr-1.5 text-destructive" />
 {tBilingual('Log Out Other Devices', 'অন্য সব ডিভাইস লগআউট')}
 </Button>
 )}
 <Button
 size="sm"
 variant="outline"
 onClick={() => loadData()}
 className="h-9 text-xs border-border bg-card text-muted-foreground hover:bg-muted"
 >
 <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 </div>

 {/* Notification */}
 {notification && (
 <div className="p-3.5 bg-success-surface text-success border border-success/30 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-0">
 <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
 <span>{notification}</span>
 </div>
 )}

 {/* Active Sessions List */}
 <Card className="border-border bg-card backdrop-blur-sm p-5 rounded-2xl">
 <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
 <div className="flex items-center gap-2">
 <Shield className="h-4 w-4 text-primary" />
 <h3 className="font-bold text-foreground text-sm">{tBilingual('Logged-in Devices', 'লগইন থাকা ডিভাইস')} ({sessions.length})</h3>
 </div>
 <span className="text-2xs text-muted-foreground">{tBilingual('Securely verified', 'নিরাপদ যাচাইকৃত')}</span>
 </div>

 <div className="space-y-3">
 {loading ? (
 <div className="py-8 text-center text-muted-foreground text-xs">
 <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
 {tBilingual('Loading devices...', 'ডিভাইস লোড হচ্ছে...')}
 </div>
 ) : sessions.length === 0 ? (
 <div className="py-8 text-center text-muted-foreground text-xs">
 {tBilingual('No active logins.', 'কোন চলমান লগইন নেই।')}
 </div>
 ) : (
 sessions.map((sess) => (
 <div
 key={sess.id}
 className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
 sess.is_current
 ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/20'
 : 'bg-card border-border hover:border-border'
 }`}
 >
 <div className="flex items-start gap-3.5">
 <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-primary/10 text-primary border border-primary/20">
 <Laptop className="h-5 w-5" />
 </div>

 <div className="space-y-1">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="font-bold text-foreground text-xs">{sess.device_name || 'Secure Browser'}</span>
 {sess.is_current && (
 <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">
 {tBilingual('Current Device', 'বর্তমান ডিভাইস')}
 </span>
 )}
 <span className="text-2xs tabular-nums px-2 py-0.5 rounded-full bg-card text-muted-foreground border border-border">
 IP: {sess.ip_address || '127.0.0.1'}
 </span>
 </div>

 <div className="flex items-center gap-4 text-2xs text-muted-foreground flex-wrap">
 <span className="flex items-center gap-1">
 <Globe className="h-3 w-3 text-muted-foreground" />
 {sess.location || 'Dhaka, Bangladesh'}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3 text-muted-foreground" />
 {tBilingual('Last active:', 'সর্বশেষ সক্রিয়:')} {formatDateTime(sess.last_seen_at)}
 </span>
 <span className="text-muted-foreground">
 {tBilingual('Logged in:', 'লগইন সময়:')} {formatDate(sess.created_at)}
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
 className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/90 border border-destructive/30 shrink-0 self-end sm:self-center"
 >
 <Trash2 className="h-3.5 w-3.5 mr-1" />
 {actionInProgress === sess.id ? tBilingual('Logging out...', 'লগআউট হচ্ছে...') : tBilingual('Log Out', 'লগআউট')}
 </Button>
 )}
 </div>
 ))
 )}
 </div>
 </Card>

 {/* Login History */}
 <Card className="border-border bg-card backdrop-blur-sm p-5 rounded-2xl">
 <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
 <div className="flex items-center gap-2">
 <History className="h-4 w-4 text-success" />
 <h3 className="font-bold text-foreground text-sm">{tBilingual('Recent Logins', 'সাম্প্রতিক লগইন')}</h3>
 </div>
 <Link href="/platform/audit">
 <span className="text-2xs text-primary hover:text-primary font-medium">
 {tBilingual('View All Activity &rarr;', 'সকল কাজের ইতিহাস দেখুন &rarr;')}
 </span>
 </Link>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-muted-foreground font-semibold border-b border-border">
 <tr>
 <th className="py-2.5 px-3">{tBilingual('Status', 'অবস্থা')}</th>
 <th className="py-2.5 px-3">{tBilingual('IP Address', 'আইপি')}</th>
 <th className="py-2.5 px-3">{tBilingual('Device', 'ডিভাইস')}</th>
 <th className="py-2.5 px-3">{tBilingual('Location', 'স্থান')}</th>
 <th className="py-2.5 px-3 text-right">{tBilingual('Time', 'সময়')}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60 text-muted-foreground">
 {loginHistory.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-6 text-center text-muted-foreground">
 No recent login events recorded.
 </td>
 </tr>
 ) : (
 loginHistory.map((item) => (
 <tr key={item.id} className="hover:bg-muted">
 <td className="py-2.5 px-3">
 {item.status === 'successful' ? (
 <span className="inline-flex items-center gap-1 text-success font-medium">
 <CheckCircle2 className="h-3.5 w-3.5" /> Success
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-destructive font-medium">
 <AlertTriangle className="h-3.5 w-3.5" /> Failed
 </span>
 )}
 </td>
 <td className="py-2.5 px-3 tabular-nums text-muted-foreground">{item.ip_address}</td>
 <td className="py-2.5 px-3 text-muted-foreground">{item.device_browser}</td>
 <td className="py-2.5 px-3 text-muted-foreground">{item.location}</td>
 <td className="py-2.5 px-3 text-right text-muted-foreground">
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

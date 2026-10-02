'use client'

import React, { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'
import {
 AlertOctagon,
 AlertTriangle,
 CheckCircle2,
 Clock,
 RefreshCw,
 Plus,
 ShieldCheck,
 Building2,
 X,
 ArrowRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPlatformIncidentsAction } from '@/actions/platform-data.actions'
import { PlatformIncidentItem } from '@/types/platform.types'
import { updateIncidentStatusAction } from '@/actions/platform.actions'

export default function PlatformIncidentsPage() {
  const { tBilingual } = useI18n()
 const [incidents, setIncidents] = useState<PlatformIncidentItem[]>([])
 const [loading, setLoading] = useState(true)
 const [selectedIncident, setSelectedIncident] = useState<PlatformIncidentItem | null>(null)
 const [targetStatus, setTargetStatus] = useState<'investigating' | 'identified' | 'monitoring' | 'resolved'>('resolved')
 const [resolutionNotes, setResolutionNotes] = useState('')
 const [notification, setNotification] = useState<string | null>(null)
 const [isUpdating, setIsUpdating] = useState(false)

 const showNotification = (msg: string) => {
 setNotification(msg)
 setTimeout(() => setNotification(null), 3500)
 }

 const loadIncidents = async () => {
 setLoading(true)
 const res = await getPlatformIncidentsAction()
 if (res.success && res.data) {
 setIncidents(res.data)
 }
 setLoading(false)
 }

 useEffect(() => {
 loadIncidents()
 }, [])

 const handleUpdateStatus = async () => {
 if (!selectedIncident) return
 setIsUpdating(true)
 const res = await updateIncidentStatusAction(selectedIncident.id, targetStatus, resolutionNotes)
 if (res.success) {
 showNotification(`Incident status updated to ${targetStatus.toUpperCase()}.`)
 setSelectedIncident(null)
 setResolutionNotes('')
 loadIncidents()
 } else {
 showNotification('Failed to update incident.')
 }
 setIsUpdating(false)
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-destructive uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-destructive/10 animate-pulse" />
 Operational Reliability &amp; Root Cause Analysis
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <AlertOctagon className="h-7 w-7 text-destructive" />
 {tBilingual('System Issues', 'সিস্টেম সমস্যা')}
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 {tBilingual('Track system problems and solutions.', 'সিস্টেমের সমস্যা ও সমাধান দেখুন।')}
 </p>
 </div>

 <Button
 size="sm"
 variant="outline"
 onClick={loadIncidents}
 className="border-border bg-card text-muted-foreground hover:bg-muted text-xs h-9"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 Refresh
 </Button>
 </div>

 {/* Notification */}
 {notification && (
 <div className="p-3 bg-success-surface border border-success/30 text-success rounded-xl text-xs font-bold flex items-center gap-2">
 <CheckCircle2 className="h-4 w-4 text-success" />
 <span>{notification}</span>
 </div>
 )}

 {/* Incidents List */}
 <div className="space-y-4">
 {incidents.map((inc) => {
 const isResolved = inc.status === 'resolved'
 const isMajor = inc.severity === 'major' || inc.severity === 'critical'

 return (
 <Card key={inc.id} className="bg-card border-border p-5 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
 <div className="space-y-1">
 <div className="flex items-center gap-2.5 flex-wrap">
 <span
 className={`text-2xs tabular-nums font-bold uppercase px-2 py-0.5 rounded-full border ${
 isMajor
 ? 'bg-destructive/20 text-destructive border-destructive/30'
 : 'bg-warning/20 text-warning border-warning/30'
 }`}
 >
 {inc.severity} Severity
 </span>
 <span
 className={`text-2xs tabular-nums font-bold uppercase px-2 py-0.5 rounded-full border ${
 isResolved
 ? 'bg-success/10 text-success border-success/30'
 : 'bg-warning/10 text-warning border-warning/30'
 }`}
 >
 {inc.status}
 </span>
 <span className="tabular-nums text-xs text-primary font-bold">{inc.service_name}</span>
 </div>
 <h2 className="text-base font-bold text-foreground mt-1">{inc.title}</h2>
 </div>

 <div className="flex items-center gap-2">
 {!isResolved && (
 <Button
 size="sm"
 onClick={() => {
 setSelectedIncident(inc)
 setTargetStatus('resolved')
 }}
 className="bg-success hover:bg-success text-foreground font-bold text-xs h-8"
 >
 <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
 Resolve Incident
 </Button>
 )}
 </div>
 </div>

 <div className="text-xs text-muted-foreground space-y-2">
 <p>{inc.description}</p>

 {inc.root_cause && (
 <div className="p-3 rounded-xl bg-card border border-border">
 <span className="text-muted-foreground font-bold">{tBilingual('Problem Reason:', 'সমস্যার কারণ:')} </span>
 <span className="text-foreground">{inc.root_cause}</span>
 </div>
 )}

 {inc.resolution_notes && (
 <div className="p-3 rounded-xl bg-success-surface border border-success/30 text-success">
 <span className="font-bold">{tBilingual('Fix Details:', 'সমাধান বিবরণ:')} </span>
 <span>{inc.resolution_notes}</span>
 </div>
 )}
 </div>

 <div className="pt-2 border-t border-border flex items-center justify-between text-2xs text-muted-foreground flex-wrap gap-2">
 <span>{tBilingual('Affected Clients:', 'ক্ষতিগ্রস্ত ক্লায়েন্ট:')} <strong className="text-muted-foreground">{inc.affected_tenants_count} organizations</strong></span>
 <span className="tabular-nums">Started: {new Date(inc.started_at).toLocaleString()}</span>
 {inc.resolved_at && <span className="tabular-nums text-success">Resolved: {new Date(inc.resolved_at).toLocaleString()}</span>}
 </div>
 </Card>
 )
 })}
 </div>

 {/* Resolve / Update Incident Modal */}
 {selectedIncident && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card backdrop-blur-sm">
 <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xs p-5 space-y-4 animate-in zoom-in-95">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="font-bold text-foreground text-sm">
 {tBilingual('Update Issue:', 'সমস্যা আপডেট:')} {selectedIncident.title}
 </div>
 <button onClick={() => setSelectedIncident(null)} className="text-muted-foreground hover:text-foreground">
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3 text-xs">
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">{tBilingual('Issue Status', 'সমস্যার অবস্থা')}</label>
 <select
 value={targetStatus}
 onChange={(e) => setTargetStatus(e.target.value as any)}
 className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground font-semibold capitalize"
 >
 <option value="investigating">Investigating</option>
 <option value="identified">Identified</option>
 <option value="monitoring">Monitoring</option>
 <option value="resolved">Resolved</option>
 </select>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">{tBilingual('Fix Details', 'সমাধান বিবরণ')}</label>
 <textarea
 rows={3}
 value={resolutionNotes}
 onChange={(e) => setResolutionNotes(e.target.value)}
 placeholder={tBilingual('Describe the problem and how it was fixed...', 'সমস্যা ও সমাধান বিবরণ লিখুন...')}
 className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground text-xs"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-border">
 <Button variant="outline" size="sm" onClick={() => setSelectedIncident(null)} className="border-border text-xs">
 Cancel
 </Button>
 <Button
 size="sm"
 disabled={isUpdating}
 onClick={handleUpdateStatus}
 className="bg-success hover:bg-success text-foreground font-bold text-xs"
 >
 {isUpdating ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Update Issue', 'আপডেট করুন')}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}

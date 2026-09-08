'use client'

import React, { useState, useEffect } from 'react'
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
            Operational Reliability &amp; Root Cause Analysis
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <AlertOctagon className="h-7 w-7 text-red-400" />
            Incident Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track system degradation events, blast radius across printing tenants, and root cause post-mortems.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadIncidents}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.map((inc) => {
          const isResolved = inc.status === 'resolved'
          const isMajor = inc.severity === 'major' || inc.severity === 'critical'

          return (
            <Card key={inc.id} className="bg-slate-900 border-slate-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isMajor
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {inc.severity} Severity
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isResolved
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {inc.status}
                    </span>
                    <span className="font-mono text-xs text-indigo-400 font-bold">{inc.service_name}</span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1">{inc.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  {!isResolved && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedIncident(inc)
                        setTargetStatus('resolved')
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Resolve Incident
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p>{inc.description}</p>

                {inc.root_cause && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 font-bold">Root Cause: </span>
                    <span className="text-slate-200">{inc.root_cause}</span>
                  </div>
                )}

                {inc.resolution_notes && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-200">
                    <span className="font-bold">Resolution Post-Mortem: </span>
                    <span>{inc.resolution_notes}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                <span>Affected Tenants: <strong className="text-slate-300">{inc.affected_tenants_count} organizations</strong></span>
                <span className="font-mono">Started: {new Date(inc.started_at).toLocaleString()}</span>
                {inc.resolved_at && <span className="font-mono text-emerald-400">Resolved: {new Date(inc.resolved_at).toLocaleString()}</span>}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Resolve / Update Incident Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm">
                Update Incident: {selectedIncident.title}
              </div>
              <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Incident State</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold capitalize"
                >
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Resolution Post-Mortem Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe root cause and remediation steps taken..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedIncident(null)} className="border-slate-700 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isUpdating}
                onClick={handleUpdateStatus}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {isUpdating ? 'Saving...' : 'Update Incident'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

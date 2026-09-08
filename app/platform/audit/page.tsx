'use client'

import React, { useState, useEffect } from 'react'
import {
  FileClock,
  Search,
  RefreshCw,
  ShieldCheck,
  Eye,
  X,
  Calendar,
  Building2,
  Terminal,
  User,
  Globe,
  ArrowDownToLine,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPlatformAuditLogsAction } from '@/actions/platform-data.actions'
import { PlatformAuditLogItem } from '@/types/platform.types'

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<PlatformAuditLogItem[]>([])
  const [search, setSearch] = useState('')
  const [actionCategory, setActionCategory] = useState<string>('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<PlatformAuditLogItem | null>(null)
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    setLoading(true)
    const res = await getPlatformAuditLogsAction({
      action: actionCategory !== 'all' ? actionCategory : search || undefined,
      pageSize: 100,
    })
    if (res.success && res.data) {
      setLogs(res.data.logs)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLogs()
  }, [search, actionCategory, entityTypeFilter])

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `platform_audit_export_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <FileClock className="h-7 w-7 text-emerald-400" />
            Platform Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable root compliance logs capturing all privileged administrative interventions, plan modifications, and tenant status events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJSON}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Export Audit Trail
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={loadLogs}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search action, actor, company, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Domain:</span>
            <select
              value={actionCategory}
              onChange={(e) => setActionCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-hidden"
            >
              <option value="all">All Actions</option>
              <option value="company">Company Actions</option>
              <option value="feature_flag">Feature Flag Actions</option>
              <option value="rbac_template">RBAC Template Actions</option>
              <option value="system">System Interventions</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Entity:</span>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-hidden"
            >
              <option value="all">All Entities</option>
              <option value="company">Company</option>
              <option value="feature_flag">Feature Flag</option>
              <option value="rbac_template">RBAC Template</option>
              <option value="system_job">System Job</option>
              <option value="system_alert">System Alert</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Compliance Log Stream</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {logs.length} Recorded Entries
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Timestamped records with IP attribution and JSON modification state.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp & IP</th>
                <th className="py-3.5 px-4">Admin Actor</th>
                <th className="py-3.5 px-4">Privileged Action</th>
                <th className="py-3.5 px-4">Target Organization / Entity</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading platform audit trail...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No platform audit events found matching filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {new Date(log.created_at).toLocaleDateString()}{' '}
                        <span className="text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                        <Globe className="h-2.5 w-2.5" />
                        <span>{log.ip_address || '127.0.0.1'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-indigo-400" />
                        <span>{log.actor_email}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Platform Superadmin
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          log.action.includes('suspend')
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : log.action.includes('activate') || log.action.includes('reactivate')
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : log.action.includes('plan')
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : log.action.includes('flag')
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {log.target_company_name || 'System / Platform Wide'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Entity: {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 px-2.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/50 border border-indigo-800/40 rounded-lg"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* DETAIL MODAL: AUDIT EVENT INSPECTOR */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <FileClock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Audit Event Inspection</h3>
                <p className="text-xs font-mono text-slate-400">ID: {selectedLog.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 font-medium">Actor Admin:</span>
                <div className="font-bold text-white mt-0.5">{selectedLog.actor_email}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Action:</span>
                <div className="font-bold text-indigo-400 font-mono mt-0.5">{selectedLog.action}</div>
              </div>
              <div className="mt-2">
                <span className="text-slate-500 font-medium">Target Company:</span>
                <div className="font-bold text-white mt-0.5">
                  {selectedLog.target_company_name || 'Platform Core'}
                </div>
              </div>
              <div className="mt-2">
                <span className="text-slate-500 font-medium">IP Address:</span>
                <div className="font-bold text-slate-300 font-mono mt-0.5">
                  {selectedLog.ip_address || '127.0.0.1'}
                </div>
              </div>
              <div className="col-span-2 mt-2">
                <span className="text-slate-500 font-medium">Timestamp:</span>
                <div className="font-medium text-slate-300 mt-0.5">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Detailed Modification Payload:</div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 max-h-60 overflow-y-auto">
                <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="bg-slate-800 hover:bg-slate-700 text-xs text-white"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

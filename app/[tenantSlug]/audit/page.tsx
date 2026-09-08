'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  FileClock,
  Search,
  RefreshCw,
  Eye,
  X,
  User,
  Globe,
  ArrowDownToLine,
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuditService } from '@/services/audit.service'
import { AuditLogEntry, AUDIT_ACTIONS } from '@/types/audit.types'

const CATEGORY_GROUPS: Record<string, { label: string; actions: string[] }> = {
  all: { label: 'All Event Categories', actions: [] },
  auth: { label: 'Authentication (Login/Logout)', actions: [AUDIT_ACTIONS.AUTH_LOGIN, AUDIT_ACTIONS.AUTH_LOGOUT] },
  users_rbac: { label: 'Users & Permissions', actions: [AUDIT_ACTIONS.USER_CREATE, AUDIT_ACTIONS.PERMISSION_CHANGE] },
  sales: { label: 'Customers & Quotations', actions: [AUDIT_ACTIONS.CUSTOMER_EDIT, AUDIT_ACTIONS.QUOTATION_EDIT, AUDIT_ACTIONS.PRICE_OVERRIDE, AUDIT_ACTIONS.ORDER_CANCEL] },
  billing: { label: 'Invoices & Payments', actions: [AUDIT_ACTIONS.INVOICE_CREATE, AUDIT_ACTIONS.PAYMENT_RECORD] },
  inventory: { label: 'Inventory & Wastage', actions: [AUDIT_ACTIONS.INVENTORY_ADJUSTMENT] },
  finance: { label: 'Expenses & Payroll', actions: [AUDIT_ACTIONS.EXPENSE_RECORD, AUDIT_ACTIONS.PAYROLL_APPROVE] },
  settings: { label: 'Settings & Subscription', actions: [AUDIT_ACTIONS.SETTINGS_CHANGE, AUDIT_ACTIONS.SUBSCRIPTION_CHANGE] },
}

export default function TenantAuditLogsPage() {
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || 'my-company'

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    setLoading(true)
    const res = await AuditService.getAuditLogs('c-01', search)
    if (res.success && res.data) {
      let filtered = res.data
      if (category !== 'all') {
        const allowedActions = CATEGORY_GROUPS[category]?.actions || []
        filtered = filtered.filter((l) => allowedActions.includes(l.action as any))
      }
      setLogs(filtered)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLogs()
  }, [search, category])

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `${tenantSlug}_audit_trail_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Organization Security & Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <FileClock className="h-7 w-7 text-indigo-400" />
            Audit Trail & Event Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable organizational activity records capturing pricing overrides, order cancellations, financial modifications, and user logins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJSON}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Export Audit Log
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={loadLogs}
            className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Architecture Compliance Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/30 border border-slate-800 flex items-start gap-3.5">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
          <Lock className="h-5 w-5" />
        </div>
        <div className="text-xs space-y-1">
          <div className="font-bold text-white text-sm flex items-center gap-2">
            <span>Immutable Append-Only Audit Integrity Active</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ANTI-DELETION ENFORCED
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Audit log entries cannot be modified or deleted by company users or administrators. Invoices and historical payment records strictly adhere to non-destructive void, cancel, reverse, and adjustment patterns.
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search action, actor email, entity ID, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <span>Category:</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden"
          >
            {Object.entries(CATEGORY_GROUPS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-3.5 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Company Audit Stream</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {logs.length} Records
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Timestamped records with IP attribution, device fingerprinting, and before/after value diffs.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp & Device</th>
                <th className="py-3.5 px-4">Operator / Actor</th>
                <th className="py-3.5 px-4">Action & Domain</th>
                <th className="py-3.5 px-4">Event Description</th>
                <th className="py-3.5 px-4 text-right">Payload Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No audit records matched your filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {new Date(log.timestamp).toLocaleDateString()}
                        <span className="text-slate-400 font-mono ml-1">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                        <Globe className="h-2.5 w-2.5 text-slate-500" />
                        <span>{log.ip_address || '103.140.180.25'}</span>
                        {log.device_metadata?.browser && (
                          <span className="text-slate-600">• {log.device_metadata.browser}</span>
                        )}
                      </div>
                    </td>

                    {/* Operator */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-indigo-400" />
                        <span>{log.user_email}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ID: {log.user_id || 'System'}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                            log.action.includes('cancel') || log.action.includes('logout')
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : log.action.includes('login') || log.action.includes('approve') || log.action.includes('create')
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : log.action.includes('override') || log.action.includes('adjustment')
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                          }`}
                        >
                          {log.action}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Entity: {log.entity} {log.entity_id ? `(${log.entity_id})` : ''}
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="text-xs text-slate-300 line-clamp-2">
                        {log.description || `Action performed on ${log.entity}`}
                      </div>
                    </td>

                    {/* Diff button */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 px-2.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/50 border border-indigo-800/40 rounded-lg"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span>View Diff</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* DETAIL MODAL: BEFORE / AFTER VALUE DIFF INSPECTOR */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <FileClock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Audit Event Value Diff</h3>
                <p className="text-xs font-mono text-slate-400">
                  {selectedLog.action} • {selectedLog.id}
                </p>
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500">Operator:</span>
                <div className="font-bold text-white mt-0.5 truncate">{selectedLog.user_email}</div>
              </div>
              <div>
                <span className="text-slate-500">Target Entity:</span>
                <div className="font-bold text-indigo-400 font-mono mt-0.5">
                  {selectedLog.entity} {selectedLog.entity_id ? `(${selectedLog.entity_id})` : ''}
                </div>
              </div>
              <div>
                <span className="text-slate-500">IP Address:</span>
                <div className="font-bold text-slate-300 font-mono mt-0.5">
                  {selectedLog.ip_address || '103.140.180.25'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Timestamp:</span>
                <div className="font-medium text-slate-300 mt-0.5">
                  {new Date(selectedLog.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Before vs After Side-by-Side View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Previous Value */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span>Previous State (Before)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-red-300/90 h-52 overflow-y-auto">
                  {selectedLog.previous_value ? (
                    <pre>{JSON.stringify(selectedLog.previous_value, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-600 italic">None (Newly Created Entity)</span>
                  )}
                </div>
              </div>

              {/* New Value */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Modified State (After)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300/90 h-52 overflow-y-auto">
                  {selectedLog.new_value ? (
                    <pre>{JSON.stringify(selectedLog.new_value, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-600 italic">None (Deleted / Terminated)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Device Metadata */}
            {selectedLog.device_metadata && (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Device Fingerprint: {selectedLog.device_metadata.browser || 'Browser'} on {selectedLog.device_metadata.os || 'OS'}</span>
                <span>{selectedLog.device_metadata.geo_city || 'Dhaka'}, {selectedLog.device_metadata.geo_country || 'BD'}</span>
              </div>
            )}

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

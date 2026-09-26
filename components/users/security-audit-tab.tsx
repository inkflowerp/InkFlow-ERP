'use client'

import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Search,
  RotateCcw,
  Download,
  Filter,
  Calendar,
  User,
  Clock,
  Key,
  ShieldCheck,
  Building,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getAuditLogsAction } from '@/actions/audit.actions'
import type { AuditLogEntry } from '@/types/audit.types'
import { formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface SecurityAuditTabProps {
  companyId: string
  companySlug: string
}

export function SecurityAuditTab({ companyId, companySlug }: SecurityAuditTabProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const res = await getAuditLogsAction(searchQuery)
      if (res && res.success && res.data) {
        setLogs(res.data)
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    if (entityFilter !== 'all' && log.entity !== entityFilter) return false
    if (!searchQuery.trim()) return true

    const q = searchQuery.toLowerCase()
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.description && log.description.toLowerCase().includes(q)) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(q))
    )
  })

  const getLogTimestamp = (l: AuditLogEntry) => {
    return l.timestamp || (l as any).created_at || new Date().toISOString()
  }

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Action Code', 'Entity', 'Actor Email', 'Target Entity ID', 'Description']
    const rows = filteredLogs.map((l) => [
      `"${getLogTimestamp(l)}"`,
      `"${l.action || ''}"`,
      `"${l.entity || ''}"`,
      `"${l.user_email || 'System'}"`,
      `"${l.entity_id || ''}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `InkFlow_Security_Trail_${companySlug}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-md shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Security & Access Audit Trail (নিরাপত্তা ও কার্যকলাপের লগ)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Immutable chronological log of authentication, role modifications, and privilege adjustments.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={isLoading}
                className="border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 cursor-pointer"
              >
                <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="Search audit trail by actor, action or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Domain:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Domains (সকল)</option>
                <option value="user">User & Roles</option>
                <option value="auth">Authentication & Logins</option>
                <option value="settings">Company Settings</option>
                <option value="invoice">Billing & Invoices</option>
                <option value="payroll">HR & Payroll</option>
                <option value="inventory">Inventory & Stock</option>
              </select>
            </div>
          </div>

          {/* Audit Trail List */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950/60 shadow-xs">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                <RotateCcw className="w-5 h-5 animate-spin text-primary" />
                Loading security logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No audit records found matching your filter criteria.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id
                  const hasDiff = log.previous_value || log.new_value

                  return (
                    <div key={log.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mt-0.5">
                            {log.entity === 'auth' ? (
                              <Key className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            ) : log.entity === 'user' ? (
                              <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 font-mono">
                                {log.action}
                              </span>
                              <Badge variant="outline" className="text-2xs px-1.5 py-0 uppercase bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                {log.entity}
                              </Badge>
                            </div>

                            <div className="text-xs text-slate-700 dark:text-slate-300">{log.description || 'Action recorded'}</div>

                            <div className="flex items-center gap-3 text-2xs text-slate-500 dark:text-slate-400 pt-0.5">
                              <span>
                                Actor: <span className="text-slate-700 dark:text-slate-300 font-medium">{log.user_email || 'System Agent'}</span>
                              </span>
                              {log.entity_id && (
                                <span>
                                  Target: <span className="font-mono text-slate-600 dark:text-slate-400">{log.entity_id.slice(0, 8)}...</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right text-2xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                            {formatDateTime(getLogTimestamp(log))}
                          </div>

                          {hasDiff && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="h-6 w-6 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Before/After Diff */}
                      {isExpanded && hasDiff && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-2xs font-mono grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-rose-600 dark:text-rose-400 font-semibold mb-1 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Previous State:
                            </div>
                            <pre className="p-2 rounded bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 overflow-x-auto">
                              {JSON.stringify(log.previous_value || {}, null, 2)}
                            </pre>
                          </div>

                          <div>
                            <div className="text-emerald-600 dark:text-emerald-400 font-semibold mb-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> New State:
                            </div>
                            <pre className="p-2 rounded bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 overflow-x-auto">
                              {JSON.stringify(log.new_value || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

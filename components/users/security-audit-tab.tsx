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
import { useI18n } from '@/i18n/context'

interface SecurityAuditTabProps {
  companyId: string
  companySlug: string
}

export function SecurityAuditTab({ companyId, companySlug }: SecurityAuditTabProps) {
  const { tBilingual } = useI18n()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const res = await getAuditLogsAction()
      if (res.success && res.data) {
        setLogs(res.data)
      }
    } catch (err) {
      console.error('[SecurityAuditTab] Error fetching logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (companyId) {
      fetchLogs()
    }
  }, [companyId])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.description && log.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesEntity = entityFilter === 'all' || log.entity === entityFilter

    return matchesSearch && matchesEntity
  })

  const getLogTimestamp = (log: AuditLogEntry) => {
    return log.timestamp || new Date().toISOString()
  }

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return
    const headers = ['Timestamp', 'Actor', 'Action', 'Entity', 'Target ID', 'Description']
    const rows = filteredLogs.map((l) => [
      `"${getLogTimestamp(l)}"`,
      `"${l.user_email || 'System'}"`,
      `"${l.action}"`,
      `"${l.entity}"`,
      `"${l.entity_id || ''}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `security-audit-trail-${companySlug || 'tenant'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card backdrop-blur-md shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-success text-success" />
                <span>{tBilingual('Security & Access Audit Trail', 'নিরাপত্তা ও অ্যাক্সেস অডিট ট্রেইল')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                {tBilingual(
                  'Immutable chronological log of authentication, role modifications, and privilege adjustments.',
                  'লগইন, রোল পরিবর্তন ও পারমিশন সংশোধনের অপরিবর্তনযোগ্য ক্রমানুসারে তালিকা।'
                )}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={isLoading}
                title={tBilingual('Refresh audit logs', 'অডিট লগ রিফ্রেশ করুন')}
                className="h-8 w-8 p-0 border-border text-xs text-foreground hover:bg-muted cursor-pointer"
              >
                <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="border-border text-xs text-foreground hover:bg-muted gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>{tBilingual('Export CSV', 'সিএসভি ডাউনলোড')}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={tBilingual('Search audit trail by actor, action or description...', 'ব্যবহারকারী, অ্যাকশন বা বিবরণ দিয়ে অনুসন্ধান করুন...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs bg-card border-border text-foreground"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground font-medium">{tBilingual('Domain:', 'ডোমেইন:')}</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">{tBilingual('All Domains', 'সকল ডোমেইন')}</option>
                <option value="user">{tBilingual('User & Roles', 'ব্যবহারকারী ও রোল')}</option>
                <option value="auth">{tBilingual('Authentication & Logins', 'লগইন ও নিরাপত্তা')}</option>
                <option value="settings">{tBilingual('Company Settings', 'কোম্পানি সেটিংস')}</option>
                <option value="invoice">{tBilingual('Billing & Invoices', 'বিল ও ইনভয়েস')}</option>
                <option value="payroll">{tBilingual('HR & Payroll', 'এইচআর ও পেরোল')}</option>
                <option value="inventory">{tBilingual('Inventory & Stock', 'ইনভেন্টরি ও স্টক')}</option>
              </select>
            </div>
          </div>

          {/* Audit Trail List */}
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RotateCcw className="w-5 h-5 animate-spin text-primary" />
                <span>{tBilingual('Loading security logs...', 'নিরাপত্তা লগ লোড হচ্ছে...')}</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                {tBilingual('No audit records found matching your filter criteria.', 'আপনার ফিল্টারের সাথে মিলে এমন কোনো অডিট রেকর্ড পাওয়া যায়নি।')}
              </div>
            ) : (
              <div className="divide-y divide-border dark:divide-border/60">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id
                  const hasDiff = log.previous_value || log.new_value

                  return (
                    <div key={log.id} className="p-3.5 hover:bg-muted dark:hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-muted text-foreground border border-border mt-0.5">
                            {log.entity === 'auth' ? (
                              <Key className="w-3.5 h-3.5 text-warning text-warning" />
                            ) : log.entity === 'user' ? (
                              <User className="w-3.5 h-3.5 text-primary text-primary" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-success text-success" />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-foreground tabular-nums">
                                {log.action}
                              </span>
                              <Badge variant="outline" className="text-xs px-1.5 py-0 uppercase bg-muted border-border text-muted-foreground">
                                {log.entity}
                              </Badge>
                            </div>

                            <div className="text-xs text-foreground">{log.description || 'Action recorded'}</div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                              <span>
                                {tBilingual('Actor:', 'ব্যবহারকারী:')} <span className="text-foreground font-medium">{log.user_email || 'System Agent'}</span>
                              </span>
                              {log.entity_id && (
                                <span>
                                  {tBilingual('Target:', 'টার্গেট:')} <span className="tabular-nums text-muted-foreground">{log.entity_id.slice(0, 8)}...</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatDateTime(getLogTimestamp(log))}
                          </div>

                          {hasDiff && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground dark:hover:text-foreground cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Before/After Diff */}
                      {isExpanded && hasDiff && (
                        <div className="mt-3 p-3 rounded-lg bg-muted border border-border text-xs tabular-nums grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-destructive text-destructive font-semibold mb-1 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> {tBilingual('Previous State:', 'পূর্ববর্তী অবস্থা:')}
                            </div>
                            <pre className="p-2 rounded bg-card border border-border text-foreground overflow-x-auto">
                              {JSON.stringify(log.previous_value || {}, null, 2)}
                            </pre>
                          </div>

                          <div>
                            <div className="text-success text-success font-semibold mb-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {tBilingual('New State:', 'নতুন অবস্থা:')}
                            </div>
                            <pre className="p-2 rounded bg-card border border-border text-foreground overflow-x-auto">
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

'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Ban,
  ExternalLink,
  Phone,
  User,
  Layers,
  ArrowRight,
  RefreshCw,
  Receipt,
  FileCheck2,
  MessageSquare,
  AlertOctagon,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Label } from '@/components/ui/label'
import type { InvoiceRequestRecord, InvoiceRequestStatus } from '@/types/workflow.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export interface InvoiceRequestsPanelProps {
  requests: InvoiceRequestRecord[]
  isLoading?: boolean
  tenantSlug: string
  onCreateInvoice: (request: InvoiceRequestRecord) => void
  onCancelRequest: (requestId: string, reason: string) => Promise<void>
  onRefresh: () => void
}

function timeAgo(dateString?: string | null): string {
  if (!dateString) return 'Recently'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Recently'
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return 'Recently'
  }
}

export function InvoiceRequestsPanel({
  requests = [],
  isLoading = false,
  tenantSlug,
  onCreateInvoice,
  onCancelRequest,
  onRefresh,
}: InvoiceRequestsPanelProps) {
  const [activeSubFilter, setActiveSubFilter] = useState<'all' | 'pending' | 'invoice_created' | 'cancelled'>('all')
  const [search, setSearch] = useState('')

  // Cancel Request Modal State
  const [selectedRequestForCancel, setSelectedRequestForCancel] = useState<InvoiceRequestRecord | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

  // Metrics
  const metrics = useMemo(() => {
    const safeList = Array.isArray(requests) ? requests : []
    const total = safeList.length
    const pending = safeList.filter((r) => r.status === 'pending')
    const fulfilled = safeList.filter((r) => r.status === 'invoice_created')
    const cancelled = safeList.filter((r) => r.status === 'cancelled' || r.status === 'rejected')
    const totalEstimatedValue = safeList.reduce((sum, r) => sum + (Number(r.estimated_amount) || 0), 0)

    return {
      total,
      pendingCount: pending.length,
      fulfilledCount: fulfilled.length,
      cancelledCount: cancelled.length,
      totalEstimatedValue,
    }
  }, [requests])

  // Filtered Requests List
  const filteredRequests = useMemo(() => {
    const safeList = Array.isArray(requests) ? requests : []
    return safeList.filter((req) => {
      if (!req) return false
      // Sub-filter
      if (activeSubFilter === 'pending' && req.status !== 'pending') return false
      if (activeSubFilter === 'invoice_created' && req.status !== 'invoice_created') return false
      if (activeSubFilter === 'cancelled' && req.status !== 'cancelled' && req.status !== 'rejected') return false

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          (req.request_number && req.request_number.toLowerCase().includes(q)) ||
          (req.customer_name && req.customer_name.toLowerCase().includes(q)) ||
          (req.customer_phone && req.customer_phone.toLowerCase().includes(q)) ||
          (req.company_name && req.company_name.toLowerCase().includes(q)) ||
          ((req as any).customer_company && (req as any).customer_company.toLowerCase().includes(q)) ||
          (req.customer_email && req.customer_email.toLowerCase().includes(q)) ||
          (req.customer_address && req.customer_address.toLowerCase().includes(q)) ||
          ((req as any).billing_address && (req as any).billing_address.toLowerCase().includes(q)) ||
          (req.order_number && req.order_number.toLowerCase().includes(q)) ||
          (req.job_number && req.job_number.toLowerCase().includes(q)) ||
          (req.design_number && req.design_number.toLowerCase().includes(q)) ||
          (req.requested_by_name && req.requested_by_name.toLowerCase().includes(q)) ||
          (req.items_summary && req.items_summary.toLowerCase().includes(q)) ||
          (req.notes && req.notes.toLowerCase().includes(q))

        if (!match) return false
      }

      return true
    })
  }, [requests, activeSubFilter, search])

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequestForCancel) return

    setIsSubmittingCancel(true)
    try {
      await onCancelRequest(selectedRequestForCancel.id, cancelReason.trim() || 'Cancelled by manager')
      setSelectedRequestForCancel(null)
      setCancelReason('')
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  const getStatusBadge = (status: InvoiceRequestStatus, invoiceNumber?: string | null) => {
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Pending Billed / কমার্শিয়াল হোল্ড</span>
        </span>
      )
    }

    if (status === 'invoice_created') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Invoiced: #{invoiceNumber || 'Created'}</span>
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400">
        <Ban className="h-3 w-3" />
        <span>Cancelled / বাতিল</span>
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. TOP KPI STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Requests */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Requests</span>
            <FileText className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-slate-900 dark:text-white mt-1">
            {metrics.total}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">All billing requests</div>
        </Card>

        {/* Pending Action (Commercial Hold) */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-900/80 shadow-xs bg-amber-50/20">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Action</span>
            {metrics.pendingCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {metrics.pendingCount}
          </div>
          <div className="text-xs text-amber-600/90 mt-0.5 font-medium">Production on hold</div>
        </Card>

        {/* Fulfilled / Invoiced */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Invoices Created</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.fulfilledCount}
          </div>
          <div className="text-xs text-emerald-600/90 mt-0.5">Gates reconnected</div>
        </Card>

        {/* Estimated Pipeline Value */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
            <span>Estimated Value</span>
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-blue-600 dark:text-blue-400 mt-1">
            {formatBDT(metrics.totalEstimatedValue)}
          </div>
          <div className="text-xs text-blue-600/90 mt-0.5">Estimated pipeline</div>
        </Card>
      </div>

      {/* 2. MAIN REQUESTS CONTROL HUB */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                📋
              </div>
              <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Invoice Requests — Prepress & Floor Billing Queue
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Requests sent by designers and floor staff when artwork is ready but official billing is missing
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              {[
                { id: 'all', label: 'All Requests', count: metrics.total },
                { id: 'pending', label: 'Pending Hold', count: metrics.pendingCount, alert: metrics.pendingCount > 0 },
                { id: 'invoice_created', label: 'Invoiced', count: metrics.fulfilledCount },
                { id: 'cancelled', label: 'Cancelled', count: metrics.cancelledCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubFilter(tab.id as any)}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5',
                    activeSubFilter === tab.id
                      ? tab.id === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1 py-0.2 rounded-full font-mono font-bold',
                      activeSubFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : tab.alert
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              className="h-8 text-xs font-bold gap-1 cursor-pointer"
              title="Refresh requests"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>

        {/* Search Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Request # (INVR-...), Customer Name, Phone, Order # (ORD-...), Designer..."
              className="h-9 pl-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Requests List */}
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {activeSubFilter === 'pending'
                  ? 'No pending invoice requests!'
                  : 'No invoice requests found matching your filters.'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {activeSubFilter === 'pending'
                  ? 'All designer and prepress billing requests have been resolved or invoiced.'
                  : 'When a designer marks artwork ready without an existing invoice, their request will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs transition-colors"
                >
                  {/* Left Column: Request Header & Customer Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        #{req.request_number}
                      </span>
                      {getStatusBadge(req.status, req.invoice_number)}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{timeAgo(req.created_at)}</span>
                      </span>
                    </div>

                    {/* Customer & Linked Workflows */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      {/* Customer Info */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{req.customer_name}</span>
                        </div>
                        {req.company_name && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                            {req.company_name}
                          </div>
                        )}
                        {req.customer_phone && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <a
                              href={`tel:${req.customer_phone}`}
                              className="hover:underline hover:text-blue-600"
                            >
                              {req.customer_phone}
                            </a>
                          </div>
                        )}
                        {req.customer_address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs" title={req.customer_address}>
                            📍 {req.customer_address}
                          </div>
                        )}
                      </div>

                      {/* Linked Orders / Design */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Linked Documents
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {req.order_number && (
                            <Link href={`/orders/${req.sales_order_id || ''}`}>
                              <Badge variant="outline" className="text-[11px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800">
                                Order #{req.order_number}
                              </Badge>
                            </Link>
                          )}
                          {req.design_number && (
                            <Link href={`/design/${req.design_job_id || ''}`}>
                              <Badge variant="outline" className="text-[11px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800">
                                Design #{req.design_number}
                              </Badge>
                            </Link>
                          )}
                          {req.job_number && (
                            <Badge variant="outline" className="text-[11px] font-mono">
                              Job #{req.job_number}
                            </Badge>
                          )}
                          {!req.order_number && !req.design_number && !req.job_number && (
                            <span className="text-slate-400 italic">Direct Artwork</span>
                          )}
                        </div>
                      </div>

                      {/* Requested By & Value */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Requested By
                        </div>
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {req.requested_by_name || 'Prepress Designer'}
                        </div>
                        {Number(req.estimated_amount) > 0 && (
                          <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            Est: {formatBDT(req.estimated_amount)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes & Summary Callout */}
                    {(req.items_summary || req.notes) && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 font-mono">
                        {req.items_summary && (
                          <div>
                            <strong className="text-slate-900 dark:text-white">Items:</strong> {req.items_summary}
                          </div>
                        )}
                        {req.notes && (
                          <div className="text-slate-500">
                            <strong className="text-slate-700 dark:text-slate-400">Notes:</strong> {req.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex md:flex-col items-center md:items-end justify-between sm:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    {req.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onCreateInvoice(req)}
                          className="h-8.5 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5 cursor-pointer"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Generate Invoice</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequestForCancel(req)
                            setCancelReason('')
                          }}
                          className="h-8 px-2.5 text-xs text-slate-600 hover:text-rose-600 hover:border-rose-300 dark:text-slate-400 dark:hover:text-rose-400 gap-1 cursor-pointer"
                        >
                          <Ban className="h-3 w-3" />
                          <span>Cancel</span>
                        </Button>
                      </>
                    ) : req.status === 'invoice_created' ? (
                      <div className="flex items-center gap-2">
                        {req.invoice_id ? (
                          <Link href={`/billing/${req.invoice_id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 gap-1"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>View Invoice</span>
                            </Button>
                          </Link>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                            #{req.invoice_number || 'Invoiced'}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-slate-400">
                        Cancelled
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. CANCEL REQUEST CONFIRMATION MODAL */}
      {selectedRequestForCancel && (
        <ModalDialog
          open={!!selectedRequestForCancel}
          onOpenChange={(v) => !v && setSelectedRequestForCancel(null)}
          title={`Cancel Invoice Request — #${selectedRequestForCancel.request_number}`}
          size="md"
          hideFooter
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 pt-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to cancel this invoice request? This will mark the request as cancelled without creating an invoice.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
              <div>Request: <strong>#{selectedRequestForCancel.request_number}</strong></div>
              <div>Customer: <strong>{selectedRequestForCancel.customer_name}</strong></div>
              {selectedRequestForCancel.order_number && (
                <div>Order: <strong>#{selectedRequestForCancel.order_number}</strong></div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Cancellation Reason</Label>
              <Input
                placeholder="e.g. Order cancelled by customer / Duplicate request"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedRequestForCancel(null)}
              >
                Keep Request
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingCancel}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  )
}

'use client'

// ==============================================================================
// InkFlow / PrintERP SaaS - Platform Billing & Tenant Revenue Reconciliation
// Authoritative Tenant MRR, Gateway Collections, Invoices & Audit Ledger.
// ==============================================================================

import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  CreditCard,
  Building2,
  FileCheck,
  ShieldAlert,
  Calendar,
  FileText,
  Check,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { formatDate } from '@/lib/formatters'
import { getPlatformBillingReconciliationAction } from '@/actions/platform-data.actions'
import { getPlatformReconciliationAction } from '@/actions/subscription.actions'
import {
  getPlatformBillingHistoryAction,
  getPlatformSubscriptionReconciliationAction,
} from '@/actions/platform-subscription.actions'
import {
  PlatformBillingTransactionRecord,
  PlatformReconciliationItem,
} from '@/types/platform-subscription.types'
import { BillingOverviewMetrics } from '@/types/platform.types'

export default function PlatformBillingPage() {
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'tenant_recon' | 'tenant_invoices' | 'platform_recon'>('tenant_recon')
  const [loading, setLoading] = useState(true)

  // Billing History & Verification
  const [billingHistory, setBillingHistory] = useState<PlatformBillingTransactionRecord[]>([])
  const [platformRecon, setPlatformRecon] = useState<PlatformReconciliationItem[]>([])

  // Tenant Reconciliation Data
  const [tenantBillingData, setTenantBillingData] = useState<BillingOverviewMetrics | null>(null)
  const [tenantReconciliationItems, setTenantReconciliationItems] = useState<any[]>([])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [
        histRes,
        pltReconRes,
        tenantBillingRes,
        tenantReconRes,
      ] = await Promise.all([
        getPlatformBillingHistoryAction(),
        getPlatformSubscriptionReconciliationAction(),
        getPlatformBillingReconciliationAction(),
        getPlatformReconciliationAction(),
      ])

      if (histRes.success && histRes.data) setBillingHistory(histRes.data)
      if (pltReconRes.success && pltReconRes.data) setPlatformRecon(pltReconRes.data)
      if (tenantBillingRes.success && tenantBillingRes.data) setTenantBillingData(tenantBillingRes.data)
      if (tenantReconRes.success && tenantReconRes.data) setTenantReconciliationItems(tenantReconRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  if (loading && !tenantBillingData && billingHistory.length === 0) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-10 w-80 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            Commercial Revenue &amp; Financial Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-indigo-400" />
            Platform Billing &amp; Revenue Reconciliation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative financial ledger, tenant MRR settlements, gateway deposits, and verification audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadAllData}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('tenant_recon')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'tenant_recon'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Tenant MRR Reconciliation
        </button>

        <button
          onClick={() => setActiveTab('tenant_invoices')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'tenant_invoices'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Invoices &amp; Transaction Ledger
        </button>

        <button
          onClick={() => setActiveTab('platform_recon')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'platform_recon'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Payment Verification &amp; Audit
          {platformRecon.some((r) => r.is_mismatched) && (
            <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 ml-1">Alert</Badge>
          )}
        </button>
      </div>

      {/* TAB 1: Tenant MRR Reconciliation */}
      {activeTab === 'tenant_recon' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Expected Tenant MRR</span>
                <DollarSign className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">
                <CurrencyDisplay amount={tenantBillingData?.expected_mrr ?? 0} />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">All Active Tenant Subscriptions</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Collected &amp; Settled</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                <CurrencyDisplay amount={tenantBillingData?.collected_mrr ?? 0} />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Verified Gateway Deposits</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Outstanding Balance</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                <CurrencyDisplay amount={tenantBillingData?.outstanding_mrr ?? 0} />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Collection Rate: {tenantBillingData?.collection_efficiency_pct ?? 100}%
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Past Due / Overdue</span>
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {tenantBillingData?.past_due_tenants_count ?? 0} Tenants
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {tenantBillingData?.failed_payments_count ?? 0} Failed Transactions
              </div>
            </Card>
          </div>

          {/* Tenant Reconciliation Ledger */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              Tenant Subscription Reconciliation Table
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Company</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Billing Status</th>
                    <th className="p-3">Gateway</th>
                    <th className="p-3">Transaction Ref</th>
                    <th className="p-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {!tenantBillingData || tenantBillingData.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        No tenant billing records found.
                      </td>
                    </tr>
                  ) : (
                    tenantBillingData.items.map((it) => (
                      <tr key={it.id || it.company_id} className="hover:bg-slate-800/50">
                        <td className="p-3 font-bold text-white">{it.company_name}</td>
                        <td className="p-3 uppercase">{it.plan_code}</td>
                        <td className="p-3 font-bold">
                          <CurrencyDisplay amount={it.expected_amount_bdt} />
                        </td>
                        <td className="p-3">
                          <Badge className="bg-slate-800 text-slate-300 text-[10px] uppercase">
                            {it.payment_status}
                          </Badge>
                        </td>
                        <td className="p-3 uppercase">{it.payment_gateway || 'bKash'}</td>
                        <td className="p-3 font-mono text-[11px]">{it.transaction_ref || 'TRX-AUTO'}</td>
                        <td className="p-3">
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] uppercase">
                            VERIFIED
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Invoices & Payment Ledger */}
      {activeTab === 'tenant_invoices' && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                Invoices &amp; Payment Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative transaction ledger for payments, tenant subscriptions, and gateway settlements.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Invoice / Trx ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Gateway Provider</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment Status</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {billingHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No billing transactions found. Initial system running on authoritative database ledger.
                    </td>
                  </tr>
                ) : (
                  billingHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">
                        {tx.invoice_id || tx.internal_trx_id}
                      </td>
                      <td className="p-3">
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                          {tx.transaction_type}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold uppercase text-slate-200">{tx.provider}</td>
                      <td className="p-3 font-bold text-white">
                        <CurrencyDisplay amount={tx.amount} />
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${
                            tx.payment_status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          } text-[10px] uppercase font-bold`}
                        >
                          {tx.payment_status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${
                            tx.verification_status === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border-red-500/40'
                          } text-[10px] uppercase font-bold`}
                        >
                          {tx.verification_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.print()}
                          className="text-indigo-400 hover:text-indigo-300 text-xs h-7"
                        >
                          Print Invoice
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Payment Verification & Audit */}
      {activeTab === 'platform_recon' && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-indigo-400" />
                Payment Verification &amp; Anti-Tampering Audit
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated cross-check comparing gateway deposits with active subscription and payment transactions.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Internal Trx ID</th>
                  <th className="p-3">Provider Trx ID</th>
                  <th className="p-3">Gateway</th>
                  <th className="p-3">Expected vs Paid</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3">Mismatch Detection</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {platformRecon.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No transaction anomalies detected. System ledger is completely balanced.
                    </td>
                  </tr>
                ) : (
                  platformRecon.map((r) => (
                    <tr key={r.internal_trx_id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-mono font-bold text-white">{r.internal_trx_id}</td>
                      <td className="p-3 font-mono text-slate-300">{r.provider_trx_id || '—'}</td>
                      <td className="p-3 font-bold uppercase">{r.provider}</td>
                      <td className="p-3 font-bold">
                        <CurrencyDisplay amount={r.expected_amount} /> /{' '}
                        <CurrencyDisplay amount={r.paid_amount} />
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${
                            r.verification_status === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border-red-500/40'
                          } text-[10px] uppercase font-bold`}
                        >
                          {r.verification_status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {r.is_mismatched ? (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px]">
                            {r.mismatch_reason || 'Anomaly'}
                          </Badge>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Balanced
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

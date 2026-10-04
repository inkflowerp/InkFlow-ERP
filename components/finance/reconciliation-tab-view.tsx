'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ArrowRightLeft,
  Users,
  Boxes,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatTaka } from '@/lib/money'
import {
  getFinancialDriftReportAction,
  runReconciliationAction,
  type FinancialDriftReport,
  type ReconciliationResult,
} from '@/actions/reconciliation.actions'

interface ReconciliationTabViewProps {
  onSuccessReconciliation?: () => void
}

export function ReconciliationTabView({ onSuccessReconciliation }: ReconciliationTabViewProps) {
  const { tBilingual } = useI18n()
  const [report, setReport] = useState<FinancialDriftReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReconciling, setIsReconciling] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<ReconciliationResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchDriftReport = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const res = await getFinancialDriftReportAction()
      if (res.success && res.data) {
        setReport(res.data)
      } else {
        setErrorMessage(res.error || 'Failed to fetch drift report')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error scanning drift')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDriftReport()
  }, [fetchDriftReport])

  const handleExecuteReconciliation = async () => {
    try {
      setIsReconciling(true)
      setErrorMessage(null)
      const res = await runReconciliationAction()
      if (res.success && res.data) {
        setReconcileResult(res.data)
        await fetchDriftReport()
        if (onSuccessReconciliation) {
          onSuccessReconciliation()
        }
      } else {
        setErrorMessage(res.error || 'Reconciliation failed')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error running reconciliation')
    } finally {
      setIsReconciling(false)
    }
  }

  const customerDrifts = report?.customer_drifts || []
  const stockDrifts = report?.stock_drifts || []
  const totalCustomerDrift = customerDrifts.reduce((sum, d) => sum + Math.abs(d.variance || 0), 0)
  const totalStockDrift = stockDrifts.reduce((sum, d) => sum + Math.abs(d.variance || 0), 0)
  const isZeroDrift = !report?.has_drift

  return (
    <div className="space-y-6">
      {/* Top Banner & Trigger Action */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              isZeroDrift
                ? 'bg-success-surface text-success'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {isZeroDrift ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                {tBilingual('Ledger Integrity & Drift Reconciliation', 'লেজার নির্ভুলতা ও ড্রাফট রিকনসিলিয়েশন')}
              </h2>
              <Badge variant={isZeroDrift ? 'outline' : 'destructive'} className="text-xs">
                {isZeroDrift
                  ? tBilingual('100% In-Sync', 'সম্পূর্ণ মিল আছে')
                  : tBilingual('Drift Detected', 'পার্থক্য পাওয়া গেছে')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              {tBilingual(
                'Reconciles customer balances against invoices/payments and inventory stock against warehouse movements with row-level locks (SELECT ... FOR UPDATE).',
                'ইনভয়েস/পেমেন্ট লেজার থেকে কাস্টমার বাকি এবং স্টক মুভমেন্ট থেকে ওয়্যারহাউস ব্যালেন্স নির্ভুলভাবে মিলিয়ে আপডেট করে।'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDriftReport}
            disabled={isLoading || isReconciling}
            className="h-10 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{tBilingual('Scan Drift', 'স্ক্যান করুন')}</span>
          </Button>

          <Button
            onClick={handleExecuteReconciliation}
            disabled={isReconciling}
            className="h-10 gap-2 font-semibold"
          >
            <ArrowRightLeft className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
            <span>
              {isReconciling
                ? tBilingual('Reconciling...', 'রিকনসিল হচ্ছে...')
                : tBilingual('Run Reconciliation', 'রিকনসিল শুরু করুন')}
            </span>
          </Button>
        </div>
      </div>

      {/* Result feedback */}
      {reconcileResult && (
        <div className="bg-success-surface border border-border text-foreground rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="font-semibold">
              {tBilingual(
                `Reconciliation complete: ${reconcileResult.reconciled_customers} customers and ${reconcileResult.reconciled_stock_items} stock items verified.`,
                `রিকনসিলিয়েশন সম্পন্ন: ${reconcileResult.reconciled_customers} জন গ্রাহক এবং ${reconcileResult.reconciled_stock_items} টি স্টক আইটেম যাচাই করা হয়েছে।`
              )}
            </span>
          </div>
          <span className="text-muted-foreground">
            {new Date(reconcileResult.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 flex items-center gap-2 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Customer Balance Metric */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Customer Due Variance', 'কাস্টমার বাকি অমিল')}
            </span>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-xl font-bold tracking-tight ${
                customerDrifts.length > 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              ৳{formatTaka(totalCustomerDrift)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({customerDrifts.length} {tBilingual('drifting', 'অমিল')})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {tBilingual('Derived from unpaid invoices minus payments', 'ইনভয়েস বাকি বিয়োগ পেমেন্ট হিসেব')}
          </p>
        </div>

        {/* Stock Ledger Metric */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Stock Quantity Variance', 'মজুদ স্টক অমিল')}
            </span>
            <Boxes className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-xl font-bold tracking-tight ${
                stockDrifts.length > 0 ? 'text-warning' : 'text-foreground'
              }`}
            >
              {totalStockDrift} {tBilingual('units', 'একক')}
            </span>
            <span className="text-xs text-muted-foreground">
              ({stockDrifts.length} {tBilingual('drifting', 'অমিল')})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {tBilingual('Derived from stock intake, issues & wastage', 'স্টক ইনটেক, ইস্যু ও অপচয় হিসেব')}
          </p>
        </div>

        {/* Last Audit Metric */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Scan Status', 'স্ক্যান স্ট্যাটাস')}
            </span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-bold text-foreground">
              {report?.scanned_at
                ? new Date(report.scanned_at).toLocaleTimeString()
                : tBilingual('Pending', 'অপেক্ষমান')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {tBilingual('Nightly cron runs automatically at 02:00 AM BST', 'প্রতিদিন রাত ২:০০ টায় স্বয়ংক্রিয়ভাবে চলে')}
          </p>
        </div>
      </div>

      {/* Customer Balance Drifts Table */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {tBilingual('Customer Accounts Drift List', 'গ্রাহক বাকি অমিল তালিকা')}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {customerDrifts.length} {tBilingual('Discrepancies found', 'টি অমিল পাওয়া গেছে')}
          </span>
        </div>

        {customerDrifts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs bg-muted/30 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
            <span>
              {tBilingual(
                'All customer balances are fully synchronized with transaction ledgers.',
                'সকল গ্রাহকের ব্যালেন্স ট্রানজ্যাকশন লেজারের সাথে সম্পূর্ণ নিখুঁত আছে।'
              )}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-muted/40">
                  <th className="py-2.5 px-3 font-semibold">{tBilingual('Customer', 'গ্রাহকের নাম')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tBilingual('Stored Balance', 'সংরক্ষিত বাকি')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tBilingual('Ledger Balance', 'লেজার বাকি')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tBilingual('Variance', 'পার্থক্য')}</th>
                  <th className="py-2.5 px-3 font-semibold text-center">{tBilingual('Action', 'করণীয়')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customerDrifts.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{row.name}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      ৳{formatTaka(row.stored_due || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                      ৳{formatTaka(row.ledger_due || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-destructive">
                      ৳{formatTaka(row.variance || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {tBilingual('Needs Sync', 'সিঙ্ক প্রয়োজন')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inventory Stock Drifts Table */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {tBilingual('Inventory Stock Drift List', 'মজুদ স্টক অমিল তালিকা')}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {stockDrifts.length} {tBilingual('Discrepancies found', 'টি অমিল পাওয়া গেছে')}
          </span>
        </div>

        {stockDrifts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs bg-muted/30 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
            <span>
              {tBilingual(
                'All warehouse materials are fully synchronized with physical stock movements.',
                'ওয়্যারহাউসের সকল উপাদানের মজুদ স্টক খতিয়ানের সাথে নিখুঁত আছে।'
              )}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-muted/40">
                  <th className="py-2.5 px-3 font-semibold">{tBilingual('Material', 'উপাদান')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tBilingual('Stored Stock', 'সংরক্ষিত স্টক')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tBilingual('Ledger Stock', 'লেজার স্টক')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tBilingual('Variance', 'পার্থক্য')}</th>
                  <th className="py-2.5 px-3 font-semibold text-center">{tBilingual('Action', 'করণীয়')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stockDrifts.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{row.name}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{row.stored_stock || 0}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-foreground">{row.ledger_stock || 0}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-warning">{row.variance || 0}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {tBilingual('Needs Sync', 'সিঙ্ক প্রয়োজন')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Printer as PrintIcon,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Building,
  FileText,
  BarChart3,
  PieChart,
  Sparkles,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import {
  exportToCsv,
  ReportsService,
} from '@/services/reports.service'
import { ReportFilterState } from '@/types/reports.types'
import { formatBDT, formatDate } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { SalesOrderRecord } from '@/types/order.types'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import { MaterialRecord } from '@/types/inventory.types'
import { FeatureGate } from '@/components/subscriptions/feature-gate'

function EmptyReportState() {
  const { tBilingual } = useI18n()
  return (
    <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 bangla-text">
        {tBilingual('No data available for this period.', 'এই সময়ের জন্য কোনো তথ্য পাওয়া যায়নি।')}
      </p>
    </div>
  )
}

export default function ReportingAnalyticsPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  // Global Multi-Dimensional Filters
  const [filters, setFilters] = useState<ReportFilterState>({
    dateRange: 'this_month',
    branch: 'all',
    customerType: 'all',
    department: 'all',
  })

  // Active Report Domain Module
  const [activeTab, setActiveTab] = useState<'sales' | 'production' | 'financial' | 'inventory' | 'customers'>('sales')
  const [salesSubTab, setSalesSubTab] = useState<'product' | 'customer' | 'salesperson' | 'area' | 'payment'>('product')

  // Live Data Stores for dynamic aggregation
  const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [payments] = useDataStore<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, [])
  const [materials] = useDataStore<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, [])

  // Dynamic datasets computed from real records
  const salesByProduct = useMemo(() => ReportsService.getSalesByProduct(), [orders])
  const salesByCustomer = useMemo(() => ReportsService.getSalesByCustomer(), [orders])
  const salesByPerson = useMemo(() => ReportsService.getSalesByPerson(), [orders])
  const salesByArea = useMemo(() => ReportsService.getSalesByArea(), [orders])
  const paymentMethods = useMemo(() => ReportsService.getPaymentMethods(), [payments])
  const productionMetrics = useMemo(() => ReportsService.getProductionMetrics(), [])
  const financialAging = useMemo(() => ReportsService.getFinancialAging(), [invoices])
  const inventoryValuation = useMemo(() => ReportsService.getInventoryValuation(), [materials])
  const customerReports = useMemo(() => ReportsService.getCustomerReports(), [orders, payments])

  const totalInventoryValuation = useMemo(() => {
    return inventoryValuation.reduce((acc: number, i: any) => acc + (i.totalValue || 0), 0)
  }, [inventoryValuation])

  const grossSalesTurnover = useMemo(() => {
    return (invoices || []).reduce((acc: number, i: any) => acc + (Number(i.grand_total) || Number(i.total_amount) || Number(i.subtotal) || 0), 0)
  }, [invoices])

  const totalCollections = useMemo(() => {
    return (payments || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
  }, [payments])

  const totalDue = useMemo(() => {
    return (invoices || []).reduce((acc: number, i: any) => acc + (Number(i.due_amount) || 0), 0)
  }, [invoices])

  const realizedMargin = useMemo(() => {
    if (grossSalesTurnover === 0) return 0
    return Math.round(((totalCollections / grossSalesTurnover) * 100) * 10) / 10
  }, [grossSalesTurnover, totalCollections])

  // Active sales dataset
  const activeSalesDataset = useMemo(() => {
    switch (salesSubTab) {
      case 'product':
        return salesByProduct
      case 'customer':
        return salesByCustomer
      case 'salesperson':
        return salesByPerson
      case 'area':
        return salesByArea
      case 'payment':
        return paymentMethods
      default:
        return salesByProduct
    }
  }, [salesSubTab, salesByProduct, salesByCustomer, salesByPerson, salesByArea, paymentMethods])

  // CSV Export Trigger
  const handleExport = (isExcel: boolean) => {
    let filename = `PrintERP_${activeTab}_report`
    let headers: string[] = []
    let rows: (string | number)[][] = []

    if (activeTab === 'sales') {
      filename = `PrintERP_Sales_${salesSubTab}_Report`
      headers = ['Category / Item', 'Volume / Orders', 'Revenue (BDT)', 'Share (%)']
      rows = activeSalesDataset.map((item: any) => [
        item.label,
        item.ordersCount,
        item.revenue,
        `${item.sharePercent}%`,
      ])
    } else if (activeTab === 'financial') {
      filename = `PrintERP_Accounts_Receivable_Aging`
      headers = ['Aging Bracket', 'Invoices Count', 'Overdue Amount (BDT)', 'Risk Category']
      rows = financialAging.map((a: any) => [a.range, a.invoicesCount, a.amount, a.riskLevel?.toUpperCase() || 'LOW'])
    } else if (activeTab === 'inventory') {
      filename = `PrintERP_Inventory_Valuation`
      headers = ['Material Name', 'Category', 'Stock Qty', 'Unit', 'Unit Cost (BDT)', 'Total Value (BDT)', 'Status']
      rows = inventoryValuation.map((i: any) => [
        i.materialName,
        i.category,
        i.stockQty,
        i.unit,
        i.unitCost,
        i.totalValue,
        i.isLowStock ? 'LOW STOCK' : 'Adequate',
      ])
    } else if (activeTab === 'customers') {
      filename = `PrintERP_Customer_LTV_Report`
      headers = ['Customer Name', 'Type', 'Lifetime Sales (BDT)', 'Paid (BDT)', 'Due (BDT)', 'Total Orders']
      rows = customerReports.map((c: any) => [
        c.customerName,
        c.customerType,
        c.lifetimeSales,
        c.totalPaid,
        c.dueBalance,
        c.ordersCount,
      ])
    } else {
      filename = `PrintERP_Production_KPIs`
      headers = ['Metric', 'Value', 'Context']
      rows = productionMetrics.map((p: any) => [p.metric, p.value, p.subtext])
    }

    exportToCsv(filename, headers, rows, isExcel)
  }

  return (
    <FeatureGate feature="reports">
      <div className="space-y-6 max-w-7xl print:max-w-none print:w-full print:bg-white print:text-slate-900 print:dark:bg-white print:dark:text-slate-900 print:m-0 print:p-0">
      {/* Printable Report Header (Visible Only When Printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {company?.name || 'Printing & Signage Solutions'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Executive Business Intelligence & Financial Statement Report
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div className="font-bold text-slate-900">
              Module: {activeTab.toUpperCase()}
            </div>
            <div>Period: {filters.dateRange.toUpperCase().replace('_', ' ')}</div>
            <div>Printed: {formatDate(new Date(), 'en', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>
        </div>
      </div>

      {/* Non-Print Header & Filter Bar */}
      <div className="print:hidden space-y-4">
        <PageHeader
          titleEn="Business Intelligence & Reporting Engine"
          titleBn="রিপোর্টিং ও ব্যবসায়িক অ্যানালিটিক্স"
          descriptionEn="Multi-dimensional sales trends, production scrap analysis, receivable aging, and stock valuation."
          descriptionBn="সেলস ট্রেন্ড, অপচয় বিশ্লেষণ, বাকি টাকা আদায়ের মেয়াদ এবং স্টক মূল্যায়ন প্রতিবেদন।"
          icon={BarChart3}
          iconColor="text-blue-600"
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport(false)}
                className="text-xs h-8 bangla-text"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-slate-600" />
                {tBilingual('CSV', 'সিএসভি')}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport(true)}
                className="text-xs h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 bangla-text"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                {tBilingual('Excel CSV', 'এক্সেল সিএসভি')}
              </Button>

              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-xs text-white h-8 bangla-text"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Print Report', 'প্রিন্ট রিপোর্ট')}
              </Button>
            </div>
          }
        />

        {/* Global Multi-Dimensional Filter Toolbar */}
        <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold sm:col-span-2 lg:col-span-1">
            <Filter className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span>Filters:</span>
          </div>

          {/* Date Range */}
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
            className="h-9 sm:h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold w-full lg:w-auto"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="quarter">This Financial Quarter</option>
          </select>

          {/* Branch */}
          <select
            value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value as any })}
            className="h-9 sm:h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold w-full lg:w-auto"
          >
            <option value="all">All Branches</option>
          </select>

          {/* Customer Segment */}
          <select
            value={filters.customerType}
            onChange={(e) => setFilters({ ...filters, customerType: e.target.value as any })}
            className="h-9 sm:h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold w-full lg:w-auto"
          >
            <option value="all">All Customer Types</option>
            <option value="corporate">Corporate Accounts</option>
            <option value="agency">Advertising Agencies</option>
            <option value="retail">Direct Retail Walk-in</option>
          </select>

          {/* Department */}
          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value as any })}
            className="h-9 sm:h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold w-full lg:w-auto"
          >
            <option value="all">All Production Depts</option>
            <option value="printing">Wide-Format Printing</option>
            <option value="finishing">Finishing & Eyelets</option>
            <option value="fabrication">Workshop Fabrication</option>
            <option value="installation">Field Installation</option>
          </select>
        </div>
      </div>

      {/* Top Highlight Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-3.5 border-l-4 border-l-blue-600">
          <span className="text-[11px] font-semibold text-slate-500 block">Gross Sales Turnover</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            <CurrencyDisplay amount={grossSalesTurnover} />
          </div>
          <span className="text-[10px] text-slate-400">Total Billed</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-emerald-600">
          <span className="text-[11px] font-semibold text-slate-500 block">Collections Recovery</span>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{realizedMargin}%</div>
          <span className="text-[10px] text-slate-400">Cash vs Turnover Ratio</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-teal-600">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Collections (আদায়)</span>
          <div className="text-xl font-black text-teal-600 mt-0.5">
            <CurrencyDisplay amount={totalCollections} />
          </div>
          <span className="text-[10px] text-slate-400">Realized Collections</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-amber-500">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Due (বাকি পাওনা)</span>
          <div className="text-xl font-black text-amber-600 mt-0.5">
            <CurrencyDisplay amount={totalDue} />
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Outstanding Balances</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-purple-600">
          <span className="text-[11px] font-semibold text-slate-500 block">Warehouse Stock Value</span>
          <div className="text-xl font-black text-purple-600 mt-0.5">৳ {formatBDT(totalInventoryValuation)}</div>
          <span className="text-[10px] text-purple-600 font-medium">{materials.length} Raw Materials</span>
        </Card>
      </div>

      {/* Module Navigation Tabs */}
      <div className="print:hidden flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto touch-scroll">
        <Button
          size="sm"
          variant={activeTab === 'sales' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('sales')}
          className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
            activeTab === 'sales' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          {tBilingual('Sales & Commercial (বিক্রয়)', 'বিক্রয় ও সেলস')}
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'production' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('production')}
          className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
            activeTab === 'production' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <PrintIcon className="h-3.5 w-3.5 mr-1.5" />
          {tBilingual('Production & Quality (প্রোডাকশন)', 'প্রোডাকশন')}
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'financial' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('financial')}
          className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
            activeTab === 'financial' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <DollarSign className="h-3.5 w-3.5 mr-1.5" />
          {tBilingual('Financial & Aging (বাকি ও নগদ)', 'বাকি ও নগদ')}
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inventory')}
          className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
            activeTab === 'inventory' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Package className="h-3.5 w-3.5 mr-1.5" />
          {tBilingual('Inventory & Valuation (মজুদ)', 'মজুদ হিসাব')}
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'customers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('customers')}
          className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
            activeTab === 'customers' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          {tBilingual('Customer Insights (গ্রাহক)', 'গ্রাহক তথ্য')}
        </Button>
      </div>

      {/* =========================================================================
          TAB 1: SALES REPORTS
         ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="print:hidden flex items-center gap-1.5 overflow-x-auto touch-scroll pb-1.5">
            {[
              { id: 'product', label: 'Product-Wise Sales' },
              { id: 'customer', label: 'Customer-Wise Sales' },
              { id: 'salesperson', label: 'Salesperson-Wise' },
              { id: 'area', label: 'Area-Wise Regional' },
              { id: 'payment', label: 'Payment Channel Share' },
            ].map((sub) => (
              <Button
                key={sub.id}
                size="sm"
                variant={salesSubTab === sub.id ? 'default' : 'outline'}
                onClick={() => setSalesSubTab(sub.id as any)}
                className="text-xs h-8 px-3 shrink-0 whitespace-nowrap"
              >
                {sub.label}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <CardTitle className="text-base capitalize">
                  {salesSubTab.replace('_', ' ')} Sales Breakdown
                </CardTitle>
                <span className="text-xs text-slate-400">
                  Total: ৳ {formatBDT(grossSalesTurnover)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeSalesDataset.length === 0 ? (
                <EmptyReportState />
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                        <tr>
                          <th className="py-3 px-4">Segment / Item Name</th>
                          <th className="py-3 px-4 font-mono text-center">Orders Count</th>
                          <th className="py-3 px-4 font-mono text-right">Revenue (৳ BDT)</th>
                          <th className="py-3 px-4 text-right">Turnover Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeSalesDataset.map((row: any) => (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {row.label}
                              {row.category && (
                                <span className="ml-2 text-[10px] font-normal text-slate-400">({row.category})</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-center">{row.ordersCount}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900 dark:text-white">
                              ৳ {formatBDT(row.revenue)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 font-mono font-bold">
                                <span>{row.sharePercent}%</span>
                                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${row.sharePercent}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {activeSalesDataset.map((row: any) => (
                      <div key={row.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white">
                              {row.label}
                            </div>
                            {row.category && (
                              <span className="text-[11px] text-slate-400">{row.category}</span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                              ৳ {formatBDT(row.revenue)}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {row.ordersCount} orders
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-[11px] text-slate-500">Market Share:</span>
                          <div className="flex items-center gap-2 font-mono font-bold text-xs">
                            <span>{row.sharePercent}%</span>
                            <div className="w-20 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${row.sharePercent}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PRODUCTION & QUALITY REPORTS
         ========================================================================= */}
      {activeTab === 'production' && (
        <div className="space-y-4">
          {productionMetrics.length === 0 ? (
            <Card><CardContent className="p-6"><EmptyReportState /></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productionMetrics.map((pm: any) => (
                <Card key={pm.id} className="p-4 space-y-1">
                  <span className="text-xs text-slate-500 font-semibold">{pm.metric}</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{pm.value}</div>
                  <div className="text-xs text-slate-400">{pm.subtext}</div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: FINANCIAL & AGING REPORTS
         ========================================================================= */}
      {activeTab === 'financial' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Accounts Receivable Aging (বাকি পাওনা বয়সকাল)</CardTitle>
            <CardDescription className="text-xs">
              Client debt categorization based on invoice issue and overdue dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {financialAging.length === 0 ? (
              <EmptyReportState />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                      <tr>
                        <th className="py-3 px-4">Aging Bracket</th>
                        <th className="py-3 px-4 text-center">Invoices Count</th>
                        <th className="py-3 px-4 text-right">Overdue Amount</th>
                        <th className="py-3 px-4 text-center">Collection Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {financialAging.map((fa: any) => (
                        <tr key={fa.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{fa.range}</td>
                          <td className="py-3.5 px-4 text-center">{fa.invoicesCount} Invoices</td>
                          <td className="py-3.5 px-4 text-right font-black text-sm">৳ {formatBDT(fa.amount)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={`capitalize text-[10px] ${
                                fa.riskLevel === 'low'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : fa.riskLevel === 'moderate'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : fa.riskLevel === 'high'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {fa.riskLevel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {financialAging.map((fa: any) => (
                    <div key={fa.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{fa.range}</div>
                          <span className="text-[11px] text-slate-400">{fa.invoicesCount} Invoices</span>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-base text-red-600">৳ {formatBDT(fa.amount)}</div>
                          <Badge
                            variant="outline"
                            className={`capitalize text-[9px] mt-1 ${
                              fa.riskLevel === 'low'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : fa.riskLevel === 'moderate'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : fa.riskLevel === 'high'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {fa.riskLevel} Risk
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          TAB 4: INVENTORY & VALUATION
         ========================================================================= */}
      {activeTab === 'inventory' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <CardTitle className="text-base">Stock Ledger Valuation (গুদাম মজুদ মূল্যায়ন)</CardTitle>
                <CardDescription className="text-xs">
                  Physical warehouse stock balance multiplied by weighted purchase unit cost.
                </CardDescription>
              </div>
              <strong className="text-purple-700 font-mono text-sm">
                Total Value: ৳ {formatBDT(totalInventoryValuation)}
              </strong>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {inventoryValuation.length === 0 ? (
              <EmptyReportState />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                      <tr>
                        <th className="py-3 px-4">Material Substrate</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Stock on Hand</th>
                        <th className="py-3 px-4 text-right">Avg Unit Cost</th>
                        <th className="py-3 px-4 text-right">Stock Valuation</th>
                        <th className="py-3 px-4 text-center">Reorder Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {inventoryValuation.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{item.materialName}</td>
                          <td className="py-3.5 px-4 font-sans text-slate-500">{item.category}</td>
                          <td className="py-3.5 px-4 text-center font-bold">
                            {item.stockQty} {item.unit}s
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-600">৳ {formatBDT(item.unitCost)}</td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                            ৳ {formatBDT(item.totalValue)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {item.isLowStock ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                                Low Stock Warning
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {inventoryValuation.map((item) => (
                    <div key={item.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{item.materialName}</div>
                          <span className="font-sans text-[11px] text-slate-400">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-slate-900 dark:text-white">৳ {formatBDT(item.totalValue)}</div>
                          <div className="text-[10px] text-slate-400">@ ৳{formatBDT(item.unitCost)}/{item.unit}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Stock: {item.stockQty} {item.unit}s
                        </span>
                        {item.isLowStock ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800">
                            Low Stock Warning
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            Healthy
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          TAB 5: CUSTOMER LIFETIME VALUE & INSIGHTS
         ========================================================================= */}
      {activeTab === 'customers' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Top Customer Lifetime Value (LTV) & Dues</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {customerReports.length === 0 ? (
              <EmptyReportState />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                      <tr>
                        <th className="py-3 px-4 font-sans">Customer Account</th>
                        <th className="py-3 px-4 font-sans">Type</th>
                        <th className="py-3 px-4 text-center">Total Orders</th>
                        <th className="py-3 px-4 text-right">Lifetime Sales</th>
                        <th className="py-3 px-4 text-right text-emerald-700">Total Paid</th>
                        <th className="py-3 px-4 text-right text-amber-700">Current Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {customerReports.map((cust) => (
                        <tr key={cust.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                            {cust.customerName}
                          </td>
                          <td className="py-3.5 px-4 font-sans text-slate-500">{cust.customerType}</td>
                          <td className="py-3.5 px-4 text-center font-bold">{cust.ordersCount}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                            ৳ {formatBDT(cust.lifetimeSales)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                            ৳ {formatBDT(cust.totalPaid)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-amber-700">
                            ৳ {formatBDT(cust.dueBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {customerReports.map((cust) => (
                    <div key={cust.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-sans font-bold text-sm text-slate-900 dark:text-white">
                            {cust.customerName}
                          </div>
                          <span className="font-sans text-[11px] text-slate-400 capitalize">{cust.customerType}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400 font-sans">{cust.ordersCount} orders</div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            Sales: ৳{formatBDT(cust.lifetimeSales)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="text-emerald-700 font-bold">
                          Paid: ৳{formatBDT(cust.totalPaid)}
                        </span>
                        <span className="text-amber-700 font-black">
                          Due: ৳{formatBDT(cust.dueBalance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </FeatureGate>
  )
}

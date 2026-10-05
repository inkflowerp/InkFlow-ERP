'use client'

import React, { useState, useMemo } from 'react'
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
 Download,
 FileSpreadsheet,
 Printer,
 Search,
 TrendingUp,
 Package,
 Users,
 DollarSign,
 Truck,
 Layers,
 PieChart,
 FileText,
 CheckCircle2,
 Clock,
 AlertTriangle,
 X,
} from 'lucide-react'
import { formatBDT, formatDate } from '@/lib/formatters'
import { exportToCsv } from '@/lib/export/csv'
import type { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import type { SalesOrderRecord } from '@/types/order.types'
import type { ProductionJobRecord } from '@/types/production.types'
import type { CustomerRecord } from '@/types/crm.types'
import type { MaterialRecord } from '@/types/inventory.types'
import type { ExpenseRecord } from '@/types/accounting.types'

export type QuickReportType =
  | 'sales'
  | 'production'
  | 'inventory'
  | 'financial'
  | 'customer'
  | 'supplier'
  | 'profitability'
  | 'custom'
  | 'all_products'
  | 'all_customers'

interface QuickReportModalProps {
 open: boolean
 onOpenChange: (open: boolean) => void
 type: QuickReportType | null
 invoices: InvoiceRecord[]
 orders: SalesOrderRecord[]
 productionJobs: ProductionJobRecord[]
 customers: CustomerRecord[]
 materials: MaterialRecord[]
 expenses: ExpenseRecord[]
 companyName?: string
}

export function QuickReportModal({
 open,
 onOpenChange,
 type,
 invoices,
 orders,
 productionJobs,
 customers,
 materials,
 expenses,
 companyName = 'Printing & Signage',
}: QuickReportModalProps) {
 const [searchQuery, setSearchQuery] = useState('')

  // Report details configuration
 const reportConfig = useMemo(() => {
 switch (type) {
 case 'sales':
 return {
 title: 'Sales & Invoicing Report',
 titleBn: 'বিক্রয় ও চালান প্রতিবেদন',
 description: 'Comprehensive line-item invoices, collections and customer billing ledger.',
 icon: TrendingUp,
 iconColor: 'text-success',
 bgColor: 'bg-success-surface bg-success-surface',
        }
 case 'production':
 return {
 title: 'Production & Machine Floor Report',
 titleBn: 'উৎপাদন ও মেশিন ফ্লোর রিপোর্ট',
 description: 'Job statuses, press queue, department routing and completion tracking.',
 icon: Layers,
 iconColor: 'text-primary',
 bgColor: 'bg-primary/10 bg-primary/10',
        }
 case 'inventory':
 return {
 title: 'Inventory & Stock Valuation Report',
 titleBn: 'কাঁচামাল ও গুদাম মূল্যায়ন রিপোর্ট',
 description: 'Substrates, vinyl, paper, acrylic and ink balances with weighted unit costs.',
 icon: Package,
 iconColor: 'text-primary',
 bgColor: 'bg-info-surface bg-primary/10',
        }
 case 'financial':
 return {
 title: 'Financial Performance Statement',
 titleBn: 'আর্থিক হিসাব ও স্টেটমেন্ট',
 description: 'Revenue, direct material costs, gross profit, OPEX expenses and net profit.',
 icon: FileText,
 iconColor: 'text-primary',
 bgColor: 'bg-primary/10 bg-primary/10',
        }
 case 'customer':
 case 'all_customers':
 return {
 title: 'Customer Accounts & Dues Ledger',
 titleBn: 'গ্রাহক তথ্য ও বাকি হিসাব',
 description: 'Customer lifetime turnover, payments, current due balances and order history.',
 icon: Users,
 iconColor: 'text-primary',
 bgColor: 'bg-primary/10 bg-primary/10',
        }
 case 'supplier':
 return {
 title: 'Supplier & Raw Material Purchase Report',
 titleBn: 'মহাজন ও সরবরাহকারী প্রতিবেদন',
 description: 'Vendor substrate procurement, material bills and payment balances.',
 icon: Truck,
 iconColor: 'text-primary',
 bgColor: 'bg-info-surface bg-primary/10',
        }
 case 'profitability':
 case 'all_products':
 return {
 title: 'Product Profitability & Top Selling Services',
 titleBn: 'পণ্য লাভ ও বিক্রয় বিশ্লেষণ',
 description: 'Margin analysis across printing products, signage, stickers and banners.',
 icon: PieChart,
 iconColor: 'text-warning',
 bgColor: 'bg-warning-surface bg-warning-surface',
        }
 case 'custom':
 default:
 return {
 title: 'Multi-Dimensional Business Export',
 titleBn: 'কাস্টম ডাটা এক্সপোর্ট',
 description: 'Multi-field real-time operational dataset for executive decision making.',
 icon: FileSpreadsheet,
 iconColor: 'text-destructive',
 bgColor: 'bg-danger-surface bg-danger-surface',
        }
    }
  }, [type])

  // Handle Export
 const handleExport = (isExcel: boolean) => {
 const filename = `PrintFlow_${type || 'Report'}_${new Date().toISOString().slice(0, 10)}`

 if (type === 'sales') {
 const headers = ['Invoice #', 'Date', 'Customer', 'Subtotal', 'Tax/VAT', 'Total Amount', 'Paid', 'Due', 'Status']
 const rows = invoices.map((i) => [
 i.invoice_number,
 i.invoice_date || i.created_at?.slice(0, 10) || '',
 i.customer_name || 'Walk-in Customer',
 i.subtotal || 0,
 i.vat_amount || 0,
 i.grand_total || (i as any).total_amount || 0,
 i.paid_amount || 0,
 i.due_amount || 0,
 i.status,
      ])
 exportToCsv(filename, headers, rows, isExcel)
    } else if (type === 'inventory') {
 const headers = ['Material Name', 'Category', 'Current Stock', 'Unit', 'Unit Cost (BDT)', 'Valuation (BDT)', 'Status']
 const rows = materials.map((m) => {
 const cost = Number(m.average_cost ?? m.cost_per_unit ?? 0)
 return [
 m.name,
 m.category,
 m.current_stock,
 m.unit,
 cost,
 m.current_stock * cost,
 m.current_stock <= (m.min_stock_level || 0) ? 'LOW STOCK' : 'Healthy',
        ]
      })
 exportToCsv(filename, headers, rows, isExcel)
    } else if (type === 'customer' || type === 'all_customers') {
 const headers = ['Customer Name', 'Type', 'Phone', 'Orders Count', 'Lifetime Sales', 'Current Due']
 const rows = customers.map((c) => [
 c.name,
 c.customer_type || 'Regular',
 c.mobile || (c as any).phone || '',
 c.total_orders_count || 0,
 c.total_orders_amount || 0,
 c.total_due_balance || 0,
      ])
 exportToCsv(filename, headers, rows, isExcel)
    } else {
      // General Orders/Jobs export
 const headers = ['Order #', 'Date', 'Customer', 'Status', 'Total Price']
 const rows = orders.map((o) => [
 o.order_number,
 o.order_date || o.created_at?.slice(0, 10) || '',
 o.customer_name || 'Customer',
 o.status,
 o.final_price || o.subtotal || 0,
      ])
 exportToCsv(filename, headers, rows, isExcel)
    }
  }

 return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border border-border rounded-xl shadow-lg">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${reportConfig.bgColor} ${reportConfig.iconColor}`}>
              <reportConfig.icon className="w-5 h-5"/>
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {reportConfig.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {reportConfig.description}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
 size="sm"variant="outline"onClick={() => handleExport(false)}
 className="text-xs h-8">
              <Download className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
 CSV
            </Button>
            <Button
 size="sm"variant="outline"onClick={() => handleExport(true)}
 className="text-xs h-8 text-success border-success-border hover:bg-success-surface border-success-border">
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-success"/>
 Excel
            </Button>
            <Button
 size="sm"onClick={() => window.print()}
 className="border border-border bg-card text-foreground hover:bg-muted text-xs h-8">
              <Printer className="mr-1.5 h-3.5 w-3.5"/>
 Print
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-border bg-muted flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground"/>
            <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search records by customer, number, or item..."className="h-8.5 pl-9 text-xs rounded-xl bg-card border-border"/>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {type === 'sales'
              ? `${invoices.length} invoices`
              : type === 'inventory'
              ? `${materials.length} raw materials`
              : type === 'customer' || type === 'all_customers'
              ? `${customers.length} customers`
              : `${orders.length} orders`}
          </span>
        </div>

        {/* Body Table Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {type === 'sales' && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border font-sans">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {invoices
                    .filter(
                      (i) =>
                        !searchQuery ||
 i.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 i.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted dark:hover:bg-muted/40">
                        <td className="py-2.5 px-3 font-bold text-foreground">
                          {inv.invoice_number}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-foreground">
                          {inv.customer_name || 'Customer'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {inv.invoice_date || inv.created_at?.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {formatBDT(inv.grand_total || (inv as any).total_amount || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-success font-bold">
                          {formatBDT(inv.paid_amount || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-warning font-bold">
                          {formatBDT(inv.due_amount || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <span
 className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
 inv.status === 'paid'
                                ? 'bg-success-surface text-success border border-success-border'
                                : inv.status === 'partially_paid'
                                ? 'bg-warning-surface text-warning border border-warning-border'
                                : 'bg-danger-surface text-destructive border border-danger-border'
                            }`}
                          >
                            {inv.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'inventory' && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border font-sans">
                  <tr>
                    <th className="py-2.5 px-3">Substrate / Material</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Stock</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Total Valuation</th>
                    <th className="py-2.5 px-3 text-center">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {materials
                    .filter(
                      (m) =>
                        !searchQuery ||
 m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 m.category?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((mat) => {
 const cost = Number(mat.average_cost ?? mat.cost_per_unit ?? 0)
 const val = mat.current_stock * cost
 const isLow = mat.current_stock <= (mat.min_stock_level || 0)
 return (
                        <tr key={mat.id} className="hover:bg-muted dark:hover:bg-muted/40">
                          <td className="py-2.5 px-3 font-bold text-foreground font-sans">
                            {mat.name}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground font-sans">{mat.category}</td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {mat.current_stock} {mat.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatBDT(cost)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-foreground">
                            {formatBDT(val)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span
 className={`px-2 py-0.5 rounded-full text-xs font-bold ${
 isLow
                                  ? 'bg-danger-surface text-destructive border border-danger-border'
                                  : 'bg-success-surface text-success border border-success-border'
                              }`}
                            >
                              {isLow ? 'Low Stock' : 'Adequate'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}

          {(type === 'customer' || type === 'all_customers') && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border font-sans">
                  <tr>
                    <th className="py-2.5 px-3">Customer Account</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3 text-center">Orders</th>
                    <th className="py-2.5 px-3 text-right">Lifetime Sales</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {customers
                    .filter(
                      (c) =>
                        !searchQuery ||
 c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.mobile?.includes(searchQuery) ||
                        (c as any).phone?.includes(searchQuery)
                    )
                    .map((cust) => (
                      <tr key={cust.id} className="hover:bg-muted dark:hover:bg-muted/40">
                        <td className="py-2.5 px-3 font-bold text-foreground font-sans">
                          {cust.name}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground capitalize font-sans">
                          {cust.customer_type || 'Regular'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{cust.mobile || (cust as any).phone || '—'}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{cust.total_orders_count || 0}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {formatBDT(cust.total_orders_amount || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-warning">
                          {formatBDT(cust.total_due_balance || 0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {type !== 'sales' && type !== 'inventory' && type !== 'customer' && type !== 'all_customers' && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-muted text-muted-foreground font-semibold border-b border-border font-sans">
                  <tr>
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Final Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {orders
                    .filter(
                      (o) =>
                        !searchQuery ||
 o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((ord) => (
                      <tr key={ord.id} className="hover:bg-muted dark:hover:bg-muted/40">
                        <td className="py-2.5 px-3 font-bold text-foreground">
                          {ord.order_number}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-foreground">
                          {ord.customer_name || 'Customer'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {ord.order_date || ord.created_at?.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 capitalize">
                            {ord.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {formatBDT(ord.final_price || ord.subtotal || 0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

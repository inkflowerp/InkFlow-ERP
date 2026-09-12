'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ShoppingBag,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  Receipt,
  FileCheck2,
  Layers,
  Building,
  Calendar,
  AlertTriangle,
  CreditCard,
  History,
  Truck,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import {
  getSupplierPriceBenchmark,
} from '@/services/purchase.service'
import {
  PurchaseOrderRecord,
  PurchaseOrderStatus,
  GoodsReceivedNoteRecord,
  SupplierPaymentRecord,
  SupplierPaymentMethod,
} from '@/types/purchase.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { MaterialRecord, StockLedgerRecord, MaterialUnit } from '@/types/inventory.types'
import { CashBookEntryRecord } from '@/types/accounting.types'

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const poId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [orders, setOrders] = useDataStore<PurchaseOrderRecord[]>(STORAGE_KEYS.PURCHASE_ORDERS, [])
  const po = orders.find((p) => p.id === poId || p.po_number === poId)

  // Modals
  const [isReceiveOpen, setIsReceiveOpen] = useState(false)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Partial Receiving State
  const [receivingQty, setReceivingQty] = useState<number>(0)
  const [challanNo, setChallanNo] = useState('')
  const [receivingNotes, setReceivingNotes] = useState('')

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(po?.due_amount || 0)
  const [payMethod, setPayMethod] = useState<SupplierPaymentMethod>('bank')
  const [bankName, setBankName] = useState('')
  const [chequeNo, setChequeNo] = useState('')
  const [mfsTrxId, setMfsTrxId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  if (!po) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Link
          href={`/${slug}/purchases`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Purchase Orders
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Truck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Purchase Order Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The purchase order record you are looking for does not exist in your organization.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/purchases`}>View All Purchase Orders</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Price benchmark for the primary item
  const primaryItem = po.items[0]
  const benchmark = primaryItem
    ? getSupplierPriceBenchmark(primaryItem.material_id, primaryItem.material_name)
    : null

  // Handle Partial Receiving (Core User Requirement)
  const handleApplyReceiving = (e: React.FormEvent) => {
    e.preventDefault()
    if (!primaryItem) return

    const newReceived = primaryItem.quantity_received + receivingQty
    const newRemaining = Math.max(0, primaryItem.quantity_ordered - newReceived)
    const isFullyReceived = newRemaining === 0

    const updatedItems = po.items.map((item, idx) =>
      idx === 0
        ? {
            ...item,
            quantity_received: newReceived,
            quantity_remaining: newRemaining,
          }
        : item
    )

    const newGrn: GoodsReceivedNoteRecord = {
      id: `grn-${Date.now()}`,
      company_id: 'c-01',
      grn_number: `GRN-2024-00${(po.grns?.length || 0) + 1}`,
      purchase_order_id: po.id,
      supplier_name: po.supplier_name,
      received_date: 'Just now',
      challan_number: challanNo,
      received_by_name: 'Warehouse Incharge (Aminul)',
      notes: receivingNotes,
      items_received: [
        {
          material_name: primaryItem.material_name,
          quantity_received: receivingQty,
          unit: primaryItem.unit,
        },
      ],
      created_at: new Date().toISOString(),
    }

    const updatedPO: PurchaseOrderRecord = {
      ...po,
      items: updatedItems,
      status: isFullyReceived ? 'received' : 'partially_received',
      grns: [newGrn, ...(po.grns || [])],
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<PurchaseOrderRecord>(STORAGE_KEYS.PURCHASE_ORDERS, po.id, updatedPO)

    // Update raw materials stock in inventory & stock ledger
    const material = PrintERPDataStore.findItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, (m) => m.id === primaryItem.material_id || m.name === primaryItem.material_name)
    if (material) {
      const newStock = material.current_stock + receivingQty
      PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, material.id, {
        current_stock: newStock,
        last_purchase_price: primaryItem.unit_cost,
        updated_at: new Date().toISOString(),
      })

      const ledgerEntry: StockLedgerRecord = {
        id: `stl-${Date.now()}`,
        company_id: 'c-01',
        material_id: material.id,
        material_name: material.name,
        transaction_type: 'purchase',
        quantity_change: receivingQty,
        balance_after: newStock,
        unit: primaryItem.unit as MaterialUnit,
        unit_cost: primaryItem.unit_cost,
        total_cost: primaryItem.unit_cost * receivingQty,
        reference_id: po.po_number,
        performed_by_name: 'Warehouse Receiving',
        notes: `GRN from ${po.supplier_name} under challan ${challanNo}`,
        created_at: new Date().toISOString(),
      }
      PrintERPDataStore.addItem<StockLedgerRecord>(STORAGE_KEYS.STOCK_LEDGER, ledgerEntry)
    }

    setIsReceiveOpen(false)
    showNotification(
      `Partial receiving recorded! ${receivingQty} ${primaryItem.unit} received. Remaining: ${newRemaining} ${primaryItem.unit}. Inventory synced!`
    )
  }

  // Handle Record Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    const newPaid = po.paid_amount + payAmount
    const newDue = Math.max(0, po.grand_total - newPaid)

    const newPayment: SupplierPaymentRecord = {
      id: `sp-${Date.now()}`,
      company_id: 'c-01',
      purchase_order_id: po.id,
      supplier_id: po.supplier_id,
      supplier_name: po.supplier_name,
      payment_method: payMethod,
      amount: payAmount,
      payment_date: new Date().toISOString().split('T')[0],
      bank_name: payMethod === 'bank' || payMethod === 'cheque' ? bankName : undefined,
      cheque_number: payMethod === 'cheque' ? chequeNo : undefined,
      mfs_transaction_id: payMethod === 'mfs' ? mfsTrxId : undefined,
      notes: paymentNotes || 'Supplier bill payment voucher issued.',
      recorded_by_name: 'Accounts Executive',
      created_at: new Date().toISOString(),
    }

    const updatedPO: PurchaseOrderRecord = {
      ...po,
      paid_amount: newPaid,
      due_amount: newDue,
      status: newDue === 0 ? 'paid' : po.status,
      payments: [newPayment, ...(po.payments || [])],
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<PurchaseOrderRecord>(STORAGE_KEYS.PURCHASE_ORDERS, po.id, updatedPO)

    if (payMethod === 'cash') {
      const cashEntry: CashBookEntryRecord = {
        id: `cbe-${Date.now()}`,
        company_id: 'c-01',
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'cash_out',
        amount: payAmount,
        category: 'Supplier Payment',
        description: `Paid ${po.supplier_name} for ${po.po_number}`,
        reference_id: po.po_number,
        performed_by_name: 'Accounts Executive',
        created_at: 'Just now',
      }
      PrintERPDataStore.addItem<CashBookEntryRecord>(STORAGE_KEYS.CASH_BOOK, cashEntry)
    }

    setIsPayOpen(false)
    showNotification(`Supplier payment of ৳ ${formatBDT(payAmount)} via ${payMethod.toUpperCase()} registered.`)
  }

  return (
    <div className="space-y-6 max-w-6xl print:max-w-none print:w-full print:bg-white print:text-slate-900 print:dark:bg-white print:dark:text-slate-900 print:m-0 print:p-0">
      {/* Back Link & Header */}
      <div>
        <Link
          href={`/${slug}/purchases`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3 print:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Purchase Orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono print:text-slate-900">
                {po.po_number}
              </h1>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 print:border-slate-400 print:text-slate-800 print:bg-slate-100">
                {po.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 print:text-slate-900">
              Supplier: {po.supplier_name}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5 print:text-slate-700">
              <span>Date Issued: <strong>{po.po_date}</strong></span>
              <span>•</span>
              <span>Expected Delivery: <strong className="text-indigo-600 print:text-indigo-800">{po.expected_delivery_date}</strong></span>
              <span>•</span>
              <span>Created By: {po.created_by_name}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Receive Material Button */}
            {po.status !== 'received' && po.status !== 'paid' && (
              <Button
                size="sm"
                onClick={() => {
                  setReceivingQty(primaryItem?.quantity_remaining || 1)
                  setIsReceiveOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-xs text-white h-9 px-3"
              >
                <ArrowDownLeft className="mr-1.5 h-3.5 w-3.5" />
                Receive Material (GRN)
              </Button>
            )}

            {/* Settle Bill Button */}
            {po.due_amount > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  setPayAmount(po.due_amount)
                  setIsPayOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white h-9 px-3"
              >
                <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                Record Payment
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="text-xs h-9 px-3"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print PO
            </Button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Financial Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-indigo-600">
          <span className="text-xs font-semibold text-slate-500">Total Purchase Commitment</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={po.grand_total} />
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Agreed Contract Rate</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500">Paid to Supplier (পরিশোধিত)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            <CurrencyDisplay amount={po.paid_amount} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {po.grand_total > 0 ? Math.round((po.paid_amount / po.grand_total) * 100) : 0}% settled
          </span>
        </Card>

        <Card className={`p-4 border-l-4 ${po.due_amount > 0 ? 'border-l-red-500 bg-red-50/20 dark:bg-red-950/10' : 'border-l-slate-300'}`}>
          <span className="text-xs font-semibold text-slate-500">Outstanding Due (বাকি বিল)</span>
          <div className="text-2xl font-black text-red-600 mt-1">
            <CurrencyDisplay amount={po.due_amount} />
          </div>
          <span className="text-[11px] text-slate-400">Payable against received challans</span>
        </Card>
      </div>

      {/* =========================================================================
          ORDERED VS RECEIVED VS REMAINING (The Core Phase 11 Requirement)
         ========================================================================= */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Line Items & Partial Receiving Ledger
            </CardTitle>
            <span className="text-xs text-slate-400">Stock updates strictly for received units</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block print:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800 print:bg-slate-100 print:text-slate-800">
                <tr>
                  <th className="py-3 px-4">Material Name</th>
                  <th className="py-3 px-4 text-center">Ordered</th>
                  <th className="py-3 px-4 text-center">Received (GRN)</th>
                  <th className="py-3 px-4 text-center">Remaining</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                {po.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4">
                      <strong className="text-slate-900 dark:text-white text-xs print:text-slate-900">{item.material_name}</strong>
                    </td>

                    {/* Ordered */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white print:text-slate-900">
                      {item.quantity_ordered} {item.unit}
                    </td>

                    {/* Received */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 print:bg-transparent print:text-emerald-800">
                      {item.quantity_received} {item.unit}
                    </td>

                    {/* Remaining */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-red-600 bg-red-50/40 dark:bg-red-950/20 print:bg-transparent print:text-red-800">
                      {item.quantity_remaining} {item.unit}
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs print:text-slate-900">
                      ৳ {formatBDT(item.unit_cost)}
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white print:text-slate-900">
                      ৳ {formatBDT(item.total_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Item Cards */}
          <div className="md:hidden print:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
            {po.items.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-white font-bold text-sm">{item.material_name}</strong>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    ৳ {formatBDT(item.total_cost)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="p-1.5 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">Ordered</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{item.quantity_ordered} {item.unit}</div>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-[10px] text-emerald-600">Received</div>
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{item.quantity_received} {item.unit}</div>
                  </div>
                  <div className="p-1.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                    <div className="text-[10px] text-red-600">Remaining</div>
                    <div className="font-mono font-bold text-red-700 dark:text-red-300">{item.quantity_remaining} {item.unit}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 text-right font-mono">
                  Unit Cost: ৳ {formatBDT(item.unit_cost)} / {item.unit}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* =========================================================================
          SUPPLIER PRICE HISTORY & BENCHMARKS (Core Requirement)
         ========================================================================= */}
      {benchmark && (
        <Card className="border-blue-200 dark:border-blue-900 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Procurement Price Benchmarks: {benchmark.material_name}
              </CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                Procurement Intelligence
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Historical purchase cost comparisons across previous vendor POs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Last PO Price</span>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  ৳ {formatBDT(benchmark.last_price)}
                </div>
                <span className="text-[10px] text-slate-500">Most recent order</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Average Price</span>
                <div className="text-lg font-black text-blue-600 mt-0.5">
                  ৳ {formatBDT(benchmark.average_price)}
                </div>
                <span className="text-[10px] text-blue-600">Weighted market avg</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Lowest Price Paid</span>
                <div className="text-lg font-black text-emerald-600 mt-0.5">
                  ৳ {formatBDT(benchmark.lowest_price)}
                </div>
                <span className="text-[10px] text-emerald-600">Best historical rate</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Highest Price Paid</span>
                <div className="text-lg font-black text-red-600 mt-0.5">
                  ৳ {formatBDT(benchmark.highest_price)}
                </div>
                <span className="text-[10px] text-red-500">Ceiling market rate</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goods Received Batches (GRN) & Payment History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GRN Receipts */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
              Goods Received Notes (GRN Batches)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {po.grns && po.grns.length > 0 ? (
              po.grns.map((grn) => (
                <div key={grn.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="font-mono text-emerald-600">{grn.grn_number}</span>
                    <span className="text-slate-400">{grn.received_date}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    Challan: <strong>{grn.challan_number || 'N/A'}</strong> • Receiver: {grn.received_by_name}
                  </div>
                  {grn.notes && <p className="text-[11px] text-slate-500">{grn.notes}</p>}
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400">No goods received yet for this PO.</div>
            )}
          </CardContent>
        </Card>

        {/* Payment Vouchers */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-600" />
              Supplier Payment Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {po.payments && po.payments.length > 0 ? (
              po.payments.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-emerald-600 font-mono">৳ {formatBDT(p.amount)}</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                      {p.payment_method}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {p.payment_date} • {p.bank_name || p.mfs_transaction_id || 'Cash Counter'}
                    {p.cheque_number && ` (Cheque: ${p.cheque_number})`}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400">No payments recorded yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL: RECEIVE MATERIAL (PARTIAL RECEIVING) */}
      <ModalDialog
        open={isReceiveOpen}
        onOpenChange={setIsReceiveOpen}
        title="Receive Goods & Partial Shipment (GRN)"
        description="Records incoming material arrival. Inventory stock is updated ONLY for the received quantity."
      >
        <form onSubmit={handleApplyReceiving} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          {primaryItem && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Material:</span>
                <strong>{primaryItem.material_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Ordered Quantity:</span>
                <strong>{primaryItem.quantity_ordered} {primaryItem.unit}</strong>
              </div>
              <div className="flex justify-between">
                <span>Currently Received:</span>
                <strong className="text-emerald-600">{primaryItem.quantity_received} {primaryItem.unit}</strong>
              </div>
              <div className="flex justify-between border-t border-blue-200 dark:border-blue-800 pt-1">
                <span>Pending Remaining:</span>
                <strong className="text-red-600">{primaryItem.quantity_remaining} {primaryItem.unit}</strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rcvQty" required>Quantity Received Today</Label>
              <Input
                id="rcvQty"
                type="number"
                min="0.1"
                step="0.1"
                max={primaryItem?.quantity_remaining || 100}
                value={receivingQty}
                onChange={(e) => setReceivingQty(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chNo" required>Supplier Delivery Challan #</Label>
              <Input
                id="chNo"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rcvNotes">Inspection & Warehouse Notes</Label>
            <textarea
              id="rcvNotes"
              rows={2}
              value={receivingNotes}
              onChange={(e) => setReceivingNotes(e.target.value)}
              className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsReceiveOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Confirm Receipt & Update Inventory
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: RECORD SUPPLIER PAYMENT */}
      <ModalDialog
        open={isPayOpen}
        onOpenChange={setIsPayOpen}
        title="Record Supplier Bill Settlement"
        description={`Settle outstanding payables for ${po.supplier_name} (Current Due: ৳ ${po.due_amount}).`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="spAmt" required>Payment Amount (৳ BDT)</Label>
              <Input
                id="spAmt"
                type="number"
                max={po.due_amount}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="spMeth" required>Payment Method</Label>
              <select
                id="spMeth"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as SupplierPaymentMethod)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold capitalize"
              >
                <option value="bank">Bank Transfer (EFT)</option>
                <option value="cheque">Bank Cheque</option>
                <option value="cash">Cash Counter</option>
                <option value="mfs">Mobile Financial Service (bKash/Nagad)</option>
              </select>
            </div>
          </div>

          {(payMethod === 'bank' || payMethod === 'cheque') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bName">Bank Name</Label>
                <Input
                  id="bName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              {payMethod === 'cheque' && (
                <div className="space-y-1.5">
                  <Label htmlFor="cqNo" required>Cheque Number</Label>
                  <Input
                    id="cqNo"
                    placeholder="e.g. CQ-904812"
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {payMethod === 'mfs' && (
            <div className="space-y-1.5">
              <Label htmlFor="mfsTrx" required>bKash / Nagad Transaction ID</Label>
              <Input
                id="mfsTrx"
                placeholder="e.g. BK-994819284"
                value={mfsTrxId}
                onChange={(e) => setMfsTrxId(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Issue Payment Voucher
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Truck,
  Building,
  DollarSign,
  TrendingUp,
  Receipt,
  FileCheck2,
  Layers,
  ArrowDownLeft,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { PurchaseOrderRecord, PurchaseOrderStatus } from '@/types/purchase.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { SupplierRecord } from '@/types/crm.types'
import { MaterialRecord } from '@/types/inventory.types'

export default function PurchasesPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [orders, setOrders] = useDataStore<PurchaseOrderRecord[]>(STORAGE_KEYS.PURCHASE_ORDERS, [])
  const [suppliers] = useDataStore<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS, [])
  const [materials] = useDataStore<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, [])
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // New PO Modal
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [poQuantity, setPoQuantity] = useState<number>(0)
  const [poUnitCost, setPoUnitCost] = useState<number>(0)
  const [expectedDate, setExpectedDate] = useState<string>(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  )
  const [poNotes, setPoNotes] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Handle Create PO
  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault()
    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    const material = materials.find((m) => m.id === selectedMaterialId)
    if (!supplier || !material) {
      showNotification('Please select both a supplier and a material item.')
      return
    }
    const poNum = `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`
    const totalCost = (poQuantity || 0) * (poUnitCost || 0)

    const newPO: PurchaseOrderRecord = {
      id: `po-${Date.now()}`,
      company_id: company?.id || 'co-main',
      po_number: poNum,
      supplier_id: supplier.id,
      supplier_name: supplier.supplier_name,
      supplier_phone: supplier.mobile,
      supplier_email: supplier.email,
      supplier_address: supplier.address,
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: expectedDate,
      status: 'issued',
      subtotal: totalCost,
      vat_amount: 0,
      discount_amount: 0,
      grand_total: totalCost,
      paid_amount: 0,
      due_amount: totalCost,
      notes: poNotes || 'Standard material stock replenishment order.',
      created_by_name: 'Procurement Officer',
      items: [
        {
          id: `poi-${Date.now()}`,
          purchase_order_id: `po-${Date.now()}`,
          material_id: material.id,
          material_name: material.name,
          quantity_ordered: poQuantity,
          quantity_received: 0,
          quantity_remaining: poQuantity,
          unit: material.unit,
          unit_cost: poUnitCost,
          total_cost: totalCost,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<PurchaseOrderRecord>(STORAGE_KEYS.PURCHASE_ORDERS, newPO)
    setIsNewOpen(false)
    showNotification(`Purchase Order ${poNum} successfully issued to ${supplier.supplier_name}.`)
  }

  const filtered = orders.filter((po) => {
    const matchSearch =
      po.po_number.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      po.items.some((i) => i.material_name.toLowerCase().includes(search.toLowerCase()))

    const matchStatus = selectedStatus === 'all' || po.status === selectedStatus
    return matchSearch && matchStatus
  })

  // Executive Metrics
  const totalPurchases = orders.reduce((acc, po) => acc + po.grand_total, 0)
  const totalPayables = orders.reduce((acc, po) => acc + po.due_amount, 0)
  const countOpenPOs = orders.filter((po) => po.status === 'issued' || po.status === 'partially_received').length

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'partially_received':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="h-3 w-3 text-amber-600" /> Partially Received
          </span>
        )
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="h-3 w-3 text-blue-600" /> Fully Received
          </span>
        )
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Settled & Paid
          </span>
        )
      case 'issued':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Issued to Supplier
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Purchase Management & Procurement"
        titleBn="ক্রয় ও সরবরাহ ব্যবস্থাপনা"
        descriptionEn="Issue purchase orders, track partial goods receiving (GRN), monitor supplier pricing benchmarks, and settle bills."
        descriptionBn="ক্রয় আদেশপত্র প্রদান, মালামাল গ্রহণ (জিআরএন), মহাজনের রেট যাচাই এবং বিল পরিশোধ পরিচালনা করুন।"
        icon={ShoppingBag}
        iconColor="text-indigo-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Link href={`/${slug}/purchases/price-history`}>
              <Button variant="outline" size="sm" className="text-xs bangla-text">
                <TrendingUp className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                {tBilingual('Price History Benchmarks', 'মূল্য ট্রেন্ড ইতিহাস')}
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => setIsNewOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white bangla-text"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Purchase Order', 'নতুন ক্রয় আদেশ')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-indigo-600">
          <span className="text-xs font-semibold text-slate-500">Total Purchase Commitments</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={totalPurchases} />
          </div>
          <span className="text-[11px] text-slate-400">{orders.length} active purchase contracts</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Open & Partial POs</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{countOpenPOs} Orders</div>
          <span className="text-[11px] text-amber-600 font-medium">Pending warehouse delivery</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500 bg-red-50/20 dark:bg-red-950/10">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
            Supplier Payables Due (বাকি বিল)
          </span>
          <div className="text-2xl font-black text-red-600 mt-1">
            <CurrencyDisplay amount={totalPayables} />
          </div>
          <span className="text-[11px] text-red-600 font-medium">Outstanding vendor liabilities</span>
        </Card>
      </div>

      {/* Search & Status Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by PO #, supplier name, or material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'All POs' },
              { id: 'issued', label: 'Issued' },
              { id: 'partially_received', label: 'Partially Received' },
              { id: 'received', label: 'Fully Received' },
              { id: 'paid', label: 'Paid & Settled' },
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={selectedStatus === tab.id ? 'default' : 'outline'}
                onClick={() => setSelectedStatus(tab.id)}
                className="text-xs h-8 px-3"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Purchase Orders Table & Mobile Cards */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Purchase Orders Directory ({filtered.length})</CardTitle>
            <span className="text-xs text-slate-400">Supplier orders & delivery progress</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Primary Material</th>
                  <th className="py-3 px-4">Receiving Progress</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid / Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((po) => {
                  const primaryItem = po.items[0]
                  const percentReceived =
                    primaryItem && primaryItem.quantity_ordered > 0
                      ? Math.round((primaryItem.quantity_received / primaryItem.quantity_ordered) * 100)
                      : 0

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      {/* PO Number */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/${slug}/purchases/${po.id}`}
                          className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 group"
                        >
                          <span>{po.po_number}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="text-[10px] text-slate-400 mt-0.5">{po.po_date}</div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {po.supplier_name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{po.supplier_phone}</div>
                      </td>

                      {/* Material */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {primaryItem?.material_name || 'Materials'}
                        </div>
                        {po.items.length > 1 && (
                          <div className="text-[10px] text-slate-400">+{po.items.length - 1} more item(s)</div>
                        )}
                      </td>

                      {/* Receiving Progress Bar (Partial Receiving) */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        {primaryItem && (
                          <div className="space-y-1 min-w-[130px]">
                            <div className="flex justify-between text-[11px]">
                              <strong className="text-slate-900 dark:text-white">
                                {primaryItem.quantity_received} / {primaryItem.quantity_ordered} {primaryItem.unit}
                              </strong>
                              <span className="text-slate-400">{percentReceived}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  percentReceived === 100
                                    ? 'bg-emerald-500'
                                    : percentReceived > 0
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${percentReceived}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-mono text-xs">
                        <CurrencyDisplay amount={po.grand_total} />
                      </td>

                      {/* Paid / Due */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className="text-emerald-600 font-medium">Paid: ৳ {formatBDT(po.paid_amount)}</div>
                        {po.due_amount > 0 ? (
                          <div className="text-red-600 font-bold">Due: ৳ {formatBDT(po.due_amount)}</div>
                        ) : (
                          <div className="text-slate-400">Due: ৳ 0</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(po.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/${slug}/purchases/${po.id}`}
                          className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          PO Cockpit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No purchase orders found matching your criteria.
              </div>
            ) : (
              filtered.map((po) => {
                const primaryItem = po.items[0]
                const percentReceived =
                  primaryItem && primaryItem.quantity_ordered > 0
                    ? Math.round((primaryItem.quantity_received / primaryItem.quantity_ordered) * 100)
                    : 0

                return (
                  <div key={po.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/${slug}/purchases/${po.id}`}
                          className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-sm flex items-center gap-1"
                        >
                          <span>{po.po_number}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        </Link>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" /> {po.po_date}
                        </div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(po.status)}</div>
                    </div>

                    {/* Supplier & Material Details */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          {po.supplier_name}
                        </span>
                        {po.supplier_phone && (
                          <a
                            href={`tel:${po.supplier_phone}`}
                            className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {po.supplier_phone}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3 text-slate-400" />
                          {primaryItem?.material_name || 'Materials'}
                        </span>
                        {po.items.length > 1 && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            +{po.items.length - 1} item{po.items.length > 2 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Receiving Progress */}
                    {primaryItem && (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Truck className="h-3 w-3 text-slate-400" />
                            Receiving: <strong>{primaryItem.quantity_received} / {primaryItem.quantity_ordered} {primaryItem.unit}</strong>
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{percentReceived}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              percentReceived === 100
                                ? 'bg-emerald-500'
                                : percentReceived > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${percentReceived}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Financial Figures & Quick Action */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Grand Total</div>
                        <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          ৳ {formatBDT(po.grand_total)}
                        </div>
                        <div className="text-[11px] font-mono mt-0.5">
                          {po.due_amount > 0 ? (
                            <span className="text-red-600 font-bold">Due: ৳ {formatBDT(po.due_amount)}</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Fully Paid</span>
                          )}
                        </div>
                      </div>

                      <Link href={`/${slug}/purchases/${po.id}`}>
                        <Button size="sm" variant="outline" className="h-9 px-3 text-xs font-semibold">
                          PO Cockpit
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL: CREATE PURCHASE ORDER */}
      <ModalDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        title="Issue New Purchase Order (PO)"
        description="Formal supplier contract with agreed unit costs and expected warehouse delivery date."
      >
        <form onSubmit={handleCreatePO} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <Label htmlFor="poSupp" required>Select Material Supplier</Label>
            <select
              id="poSupp"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="">Select Material Supplier...</option>
              {suppliers.map((s: SupplierRecord) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_name} ({s.category.replace('_', ' ')}) - {s.mobile}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="poMat" required>Select Inventory Material</Label>
            <select
              id="poMat"
              value={selectedMaterialId}
              onChange={(e) => {
                const matId = e.target.value
                setSelectedMaterialId(matId)
                const found = materials.find((m: MaterialRecord) => m.id === matId)
                if (found) setPoUnitCost(found.last_purchase_price || found.average_cost)
              }}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="">Select Inventory Material...</option>
              {materials.map((m: MaterialRecord) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.sku}) - Standard Unit: {m.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="poQty" required>Order Quantity</Label>
              <Input
                id="poQty"
                type="number"
                min="1"
                value={poQuantity}
                onChange={(e) => setPoQuantity(Math.max(1, Number(e.target.value)))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poCost" required>Unit Cost (৳ BDT)</Label>
              <Input
                id="poCost"
                type="number"
                value={poUnitCost}
                onChange={(e) => setPoUnitCost(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poDate" required>Expected Delivery</Label>
              <Input
                id="poDate"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Calculated Grand Total Banner */}
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500">Calculated Purchase Total:</span>
              <div className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                {poQuantity} × ৳ {formatBDT(poUnitCost)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Commitment</span>
              <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
                ৳ {formatBDT(poQuantity * poUnitCost)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="poNotes">Purchase Order Terms & Instructions</Label>
            <textarea
              id="poNotes"
              rows={2}
              placeholder="e.g. Include test certificate; deliver before 2 PM for unloading crane availability."
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Issue Purchase Order
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

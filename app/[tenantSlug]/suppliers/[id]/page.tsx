'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  Truck,
  ArrowLeft,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Package,
  Receipt,
  FileText,
  DollarSign,
  Tag,
  Building,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { SupplierMaterialPrice, SupplierRecord } from '@/types/crm.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { CashBookEntryRecord } from '@/types/accounting.types'

interface SupplierProfilePageProps {
  params: Promise<{ tenantSlug: string; id: string }>
}

export default function SupplierProfilePage({ params }: SupplierProfilePageProps) {
  const resolvedParams = use(params)
  const supplierId = resolvedParams.id
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'
  const [suppliers] = useDataStore<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS, [])
  const [allPrices, setAllPrices] = useDataStore<SupplierMaterialPrice[]>(STORAGE_KEYS.SUPPLIER_PRICES, [])

  const supplier = suppliers.find((s) => s.id === supplierId || s.supplier_name === supplierId)
  const materialPrices = allPrices.filter((p) => supplier && (p.supplier_id === supplier.id || p.supplier_id === supplierId))

  const [activeTab, setActiveTab] = useState<'prices' | 'purchases' | 'payments' | 'notes'>('prices')
  const [isAddPriceOpen, setIsAddPriceOpen] = useState(false)
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Add material price form
  const [newMaterial, setNewMaterial] = useState({
    material_name: '',
    category: supplier?.category || 'media',
    unit: 'sft',
    contract_price_bdt: 0,
    notes: '',
  })

  // Pay supplier form
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Bank Cheque')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  if (!supplier) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Link
          href={`/${slug}/suppliers`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Supplier Directory
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Truck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Supplier Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The supplier record you are looking for does not exist in your organization.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/suppliers`}>View All Suppliers</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const handleAddPrice = (e: React.FormEvent) => {
    e.preventDefault()
    const item: SupplierMaterialPrice = {
      id: `smp-${Date.now()}`,
      company_id: company?.id || 'co-main',
      supplier_id: supplier.id,
      material_name: newMaterial.material_name,
      category: newMaterial.category,
      unit: newMaterial.unit,
      contract_price_bdt: Number(newMaterial.contract_price_bdt),
      effective_date: new Date().toISOString().split('T')[0],
      notes: newMaterial.notes || null,
      created_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<SupplierMaterialPrice>(STORAGE_KEYS.SUPPLIER_PRICES, item)
    setIsAddPriceOpen(false)
    setNewMaterial({
      material_name: '',
      category: supplier.category || 'media',
      unit: 'sft',
      contract_price_bdt: 0,
      notes: '',
    })
    showNotification(`Contract rate for '${item.material_name}' saved.`)
  }

  const handlePaySupplier = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmt = Number(payAmount) || 0
    if (numAmt <= 0) return

    const newBalance = Math.max(0, (supplier.outstanding_balance || 0) - numAmt)
    PrintERPDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, supplier.id, {
      outstanding_balance: newBalance,
      updated_at: new Date().toISOString(),
    })

    if (payMethod.toLowerCase().includes('cash')) {
      const cashEntry: CashBookEntryRecord = {
        id: `cbe-${Date.now()}`,
        company_id: 'c-01',
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'cash_out',
        amount: numAmt,
        category: 'Supplier Payment',
        description: `Paid ${supplier.supplier_name}`,
        reference_id: `VOUCHER-${Date.now().toString().slice(-4)}`,
        performed_by_name: 'Cashier',
        created_at: 'Just now',
      }
      PrintERPDataStore.addItem<CashBookEntryRecord>(STORAGE_KEYS.CASH_BOOK, cashEntry)
    }

    setIsRecordPayOpen(false)
    showNotification(`Payment voucher of ৳ ${numAmt} created for ${supplier.supplier_name}.`)
    setPayAmount('')
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Back Button & Header */}
      <div>
        <Link
          href={`/${slug}/suppliers`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Supplier Directory
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {supplier.supplier_name}
              </h1>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300">
                {supplier.category} Supplier
              </span>
            </div>
            {supplier.company && (
              <div className="text-sm font-medium text-slate-500">{supplier.company}</div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {supplier.mobile}
              </span>
              {supplier.whatsapp && (
                <span className="flex items-center gap-1 text-emerald-600 font-mono">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {supplier.whatsapp}
                </span>
              )}
              {supplier.email && (
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {supplier.email}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {supplier.address}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddPriceOpen(true)}
              className="text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 text-teal-600" />
              Add Material Rate
            </Button>
            <Button
              size="sm"
              onClick={() => setIsRecordPayOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-xs text-white"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Pay Supplier
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

      {/* Supplier Balance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Total Purchases from Vendor</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={supplier.total_purchases_amount || 0} />
          </div>
          <span className="text-[11px] text-slate-400">Cumulative roll/sheet acquisitions</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Total Payments Cleared</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            <CurrencyDisplay amount={(supplier.total_purchases_amount || 0) - (supplier.outstanding_balance || 0)} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Bank Cheques & RTGS</span>
        </Card>

        <Card className={`p-4 border-l-4 ${(supplier.outstanding_balance || 0) > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Payable Balance (মহাজনের পাওনা)</span>
            {(supplier.outstanding_balance || 0) > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                Pending Payment
              </Badge>
            )}
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
            <CurrencyDisplay amount={supplier.outstanding_balance || 0} />
          </div>
          <span className="text-[11px] text-slate-400">Terms: {supplier.payment_terms.replace('_', ' ')}</span>
        </Card>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        {[
          { id: 'prices', label: 'Material Contract Rates (দর তালিকা)' },
          { id: 'purchases', label: 'Purchase History (ক্রয় ও জিআরএন)' },
          { id: 'payments', label: 'Payment Vouchers (ভাউচার)' },
          { id: 'notes', label: 'Vendor Agreement & Notes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MATERIAL PRICES */}
      {activeTab === 'prices' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Negotiated Material Contract Prices</CardTitle>
                <CardDescription className="text-xs">Base procurement costs used in quotation cost estimators</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsAddPriceOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-xs text-white">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Material Rate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Material Specification</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit of Measure</th>
                  <th className="py-3 px-4">Contract Price (৳ BDT)</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {materialPrices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No material contract rates recorded for this supplier.
                    </td>
                  </tr>
                ) : (
                  materialPrices.map((price) => (
                    <tr key={price.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{price.material_name}</td>
                      <td className="py-3 px-4 capitalize text-slate-500">{price.category}</td>
                      <td className="py-3 px-4 uppercase font-mono">{price.unit}</td>
                      <td className="py-3 px-4 font-bold text-teal-700 dark:text-teal-400">
                        <CurrencyDisplay amount={price.contract_price_bdt} /> / {price.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{price.effective_date}</td>
                      <td className="py-3 px-4 text-slate-400">{price.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: PURCHASES */}
      {activeTab === 'purchases' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold">Purchase Orders & GRN Receiving</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Items Received</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Warehouse Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-4 font-mono font-bold text-teal-600">PUR-000034</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">Star Flex Gloss 320g (5 Rolls - 2,500 sft)</td>
                  <td className="py-3 px-4 font-bold"><CurrencyDisplay amount={23750} /></td>
                  <td className="py-3 px-4 text-slate-500">28/08/2024</td>
                  <td className="py-3 px-4"><Badge variant="outline" className="text-emerald-700 bg-emerald-50">Stocked in Hub</Badge></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold">Payment Vouchers to Vendor</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Voucher No.</th>
                  <th className="py-3 px-4">Payment Method / Cheque</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-4 font-mono font-bold text-teal-600">PV-2024-0012</td>
                  <td className="py-3 px-4">City Bank Cheque #982104</td>
                  <td className="py-3 px-4 font-bold text-emerald-600"><CurrencyDisplay amount={100000} /></td>
                  <td className="py-3 px-4 text-slate-500">20/08/2024</td>
                  <td className="py-3 px-4"><Badge variant="outline" className="text-emerald-700 bg-emerald-50">Cheque Cleared</Badge></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: NOTES */}
      {activeTab === 'notes' && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vendor Agreement Remarks</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {supplier.notes || 'No special credit remarks recorded.'}
          </p>
        </Card>
      )}

      {/* MODAL: ADD MATERIAL RATE */}
      <ModalDialog
        open={isAddPriceOpen}
        onOpenChange={setIsAddPriceOpen}
        title="Add Material Contract Rate"
        description={`Record agreed procurement price for ${supplier.supplier_name}.`}
      >
        <form onSubmit={handleAddPrice} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="matName" required>Material Name & Specification</Label>
            <Input
              id="matName"
              placeholder="e.g. Star Flex 320gsm Gloss 10ft"
              value={newMaterial.material_name}
              onChange={(e) => setNewMaterial({ ...newMaterial, material_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="matUnit">Unit of Measure</Label>
              <select
                id="matUnit"
                value={newMaterial.unit}
                onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="sft">Square Feet (sft)</option>
                <option value="sheet">Sheet (শীট - যেমন: 8x4 এক্রিলিক)</option>
                <option value="roll">Roll (রোল - যেমন: ভিনাইল)</option>
                <option value="piece">Piece (পিস - যেমন: LED মডিউল)</option>
                <option value="liter">Liter (লিটার - যেমন: সলভেন্ট কালি)</option>
                <option value="ream">Ream (রিম - যেমন: আর্ট কার্ড)</option>
                <option value="kg">Kilogram (কেজি)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="matPrice" required>Contract Rate (৳ BDT)</Label>
              <Input
                id="matPrice"
                type="number"
                step="0.01"
                placeholder="e.g. 9.50"
                value={newMaterial.contract_price_bdt || ''}
                onChange={(e) => setNewMaterial({ ...newMaterial, contract_price_bdt: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="matNotes">Delivery Terms / Remarks</Label>
            <Input
              id="matNotes"
              placeholder="e.g. Free warehouse delivery for orders over 10 rolls"
              value={newMaterial.notes}
              onChange={(e) => setNewMaterial({ ...newMaterial, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddPriceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Save Contract Rate
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: PAY SUPPLIER */}
      <ModalDialog
        open={isRecordPayOpen}
        onOpenChange={setIsRecordPayOpen}
        title="Issue Payment Voucher to Supplier"
        description={`Record disbursement for outstanding balance (৳ ${supplier.outstanding_balance || 0} payable).`}
      >
        <form onSubmit={handlePaySupplier} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="paySupAmt" required>Amount (৳ BDT)</Label>
              <Input
                id="paySupAmt"
                type="number"
                placeholder="e.g. 50000"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paySupMeth">Disbursement Method</Label>
              <select
                id="paySupMeth"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option>Bank Cheque</option>
                <option>RTGS / BEFTN</option>
                <option>Cash Counter</option>
                <option>bKash Merchant</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsRecordPayOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Create Payment Voucher
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

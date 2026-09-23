'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Truck,
  Plus,
  Search,
  Download,
  Phone,
  MessageSquare,
  Building,
  CheckCircle2,
  ExternalLink,
  Tag,
  DollarSign,
  Package,
  Layers,
  MapPin,
  CreditCard,
  Receipt,
  Sparkles,
  Filter,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Landmark,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import type { SupplierRecord, SupplierCategory, SupplierPaymentTerms } from '@/types/crm.types'
import { normalizeBdPhone, formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  BANGLADESH_MARKET_HUBS,
  SUPPLIER_CATEGORY_META,
  SUPPLIER_PAYMENT_TERMS,
} from '@/components/suppliers/supplier-types'
import { SupplierModal } from '@/components/suppliers/supplier-modal'
import { PaySupplierVoucherModal } from '@/components/suppliers/pay-supplier-voucher-modal'
import { SupplierMaterialRateModal } from '@/components/suppliers/supplier-material-rate-modal'
import { NewPurchaseModal } from '@/components/purchases/new-purchase-modal'
import { moveToTrashAction } from '@/actions/trash.actions'
import type { CashBookEntryRecord } from '@/types/accounting.types'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'

export default function SuppliersPage() {
  const params = useParams()
  const pathname = usePathname()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [suppliers, setSuppliers] = useDataStore<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS, [])
  const [supplierPrices, setSupplierPrices] = useDataStore<any[]>(STORAGE_KEYS.SUPPLIER_PRICES, [])

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedHub, setSelectedHub] = useState<string>('all')
  const [dueFilter, setDueFilter] = useState<'all' | 'due' | 'settled' | 'over_credit'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [supplierToEdit, setSupplierToEdit] = useState<SupplierRecord | null>(null)

  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [payTargetSupplier, setPayTargetSupplier] = useState<SupplierRecord | null>(null)

  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [rateTargetSupplier, setRateTargetSupplier] = useState<SupplierRecord | null>(null)

  const [isNewPOOpen, setIsNewPOOpen] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null)

  // Trash confirm state
  const [supplierToTrash, setSupplierToTrash] = useState<SupplierRecord | null>(null)
  const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false)
  const [isTrashing, setIsTrashing] = useState(false)

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message: msg, type })
    dispatchToast({
      type: type === 'info' ? 'info' : type === 'error' ? 'error' : 'success',
      title: type === 'error' ? 'Error' : type === 'info' ? 'Notice' : 'Success',
      titleBn: type === 'error' ? 'ত্রুটি' : type === 'info' ? 'বিজ্ঞপ্তি' : 'সফল হয়েছে',
      message: msg,
    })
    setTimeout(() => setNotification(null), 3800)
  }

  // Handle Save / Update Supplier
  const handleSaveSupplier = (saved: SupplierRecord) => {
    const exists = suppliers.some((s) => s.id === saved.id)
    if (exists) {
      PrintERPDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, saved.id, saved)
      showNotification(`Supplier profile '${saved.supplier_name}' updated successfully.`)
    } else {
      PrintERPDataStore.addItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, saved)
      showNotification(`Supplier '${saved.supplier_name}' registered successfully.`)
    }
  }

  // Handle Trash Supplier
  const handleTrashSupplier = (sup: SupplierRecord) => {
    setSupplierToTrash(sup)
    setIsTrashConfirmOpen(true)
  }

  const confirmTrashSupplier = async () => {
    if (!supplierToTrash) return
    setIsTrashing(true)
    try {
      const res = await moveToTrashAction('suppliers', supplierToTrash, company?.id)
      if (res.success) {
        showNotification(`Supplier "${supplierToTrash.supplier_name}" moved to Trash.`, 'success')
        setSuppliers(suppliers.filter((s) => s.id !== supplierToTrash.id))
        setIsTrashConfirmOpen(false)
        setSupplierToTrash(null)
      } else {
        showNotification(res.error || 'Failed to move supplier to trash.', 'error')
      }
    } catch (err: any) {
      showNotification(err.message || 'Error moving supplier to trash.', 'error')
    } finally {
      setIsTrashing(false)
    }
  }

  // Handle Save Payment Voucher
  const handlePaymentRecorded = (amount: number, details: any) => {
    if (!payTargetSupplier) return

    const newBalance = Math.max(0, (payTargetSupplier.outstanding_balance || 0) - amount)
    PrintERPDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, payTargetSupplier.id, {
      outstanding_balance: newBalance,
      updated_at: new Date().toISOString(),
    })

    // Log to Cash book if cash
    if (details.method === 'cash') {
      const cashEntry: CashBookEntryRecord = {
        id: `cbe-${Date.now()}`,
        company_id: company?.id || 'c-01',
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'cash_out',
        amount: amount,
        category: 'Supplier Payment',
        description: `Disbursement to ${payTargetSupplier.supplier_name} (${details.voucherNumber})`,
        reference_id: details.voucherNumber,
        performed_by_name: details.authorizedBy || 'Cashier',
        created_at: new Date().toISOString(),
      }
      PrintERPDataStore.addItem<CashBookEntryRecord>(STORAGE_KEYS.CASH_BOOK, cashEntry)
    }

    showNotification(`Payment voucher ${details.voucherNumber} of ${formatBDT(amount)} recorded for ${payTargetSupplier.supplier_name}.`)
  }

  // Handle Save Rate
  const handleSaveRate = (rate: any) => {
    const exists = supplierPrices.some((p) => p.id === rate.id)
    if (exists) {
      PrintERPDataStore.updateItem(STORAGE_KEYS.SUPPLIER_PRICES, rate.id, rate)
      showNotification(`Contract rate for '${rate.material_name}' updated.`)
    } else {
      PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_PRICES, rate)
      showNotification(`Contract rate for '${rate.material_name}' saved.`)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Supplier Code',
      'Supplier Name',
      'Bangla Name',
      'Trading Entity',
      'Category',
      'Contact Person',
      'Designation',
      'Mobile',
      'WhatsApp',
      'Market Hub',
      'Address',
      'Payment Terms',
      'Credit Limit BDT',
      'Outstanding Balance BDT',
      'Status',
    ]

    const rows = suppliers.map((s) => [
      s.id,
      `"${s.supplier_code || ''}"`,
      `"${s.supplier_name}"`,
      `"${s.name_bn || ''}"`,
      `"${s.company || ''}"`,
      s.category,
      `"${s.contact_person || ''}"`,
      `"${s.designation || ''}"`,
      `"${s.mobile}"`,
      `"${s.whatsapp || ''}"`,
      `"${s.market_hub || ''}"`,
      `"${s.address || ''}"`,
      s.payment_terms,
      s.credit_limit || 0,
      s.outstanding_balance || 0,
      s.is_active ? 'Active' : 'Inactive',
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `PrintERP_Suppliers_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotification('Suppliers exported to CSV with UTF-8 BOM.')
  }

  // KPI Computations
  const stats = useMemo(() => {
    const totalVendors = suppliers.length
    const activeVendors = suppliers.filter((s) => s.is_active).length
    const totalPayableDue = suppliers.reduce((sum, s) => sum + (s.outstanding_balance || 0), 0)
    const vendorsWithDue = suppliers.filter((s) => (s.outstanding_balance || 0) > 0).length
    const activeContracts = supplierPrices.length
    const uniqueHubs = new Set(suppliers.map((s) => s.market_hub).filter(Boolean)).size

    return {
      totalVendors,
      activeVendors,
      totalPayableDue,
      vendorsWithDue,
      activeContracts,
      uniqueHubs,
    }
  }, [suppliers, supplierPrices])

  // Filtered List
  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const q = search.toLowerCase()
      const matchSearch =
        s.supplier_name.toLowerCase().includes(q) ||
        (s.name_bn && s.name_bn.toLowerCase().includes(q)) ||
        (s.company && s.company.toLowerCase().includes(q)) ||
        s.mobile.includes(q) ||
        (s.whatsapp && s.whatsapp.includes(q)) ||
        (s.supplier_code && s.supplier_code.toLowerCase().includes(q)) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.bin && s.bin.includes(q)) ||
        (s.tin && s.tin.includes(q))

      const matchCat = selectedCategory === 'all' || s.category === selectedCategory
      const matchHub = selectedHub === 'all' || s.market_hub === selectedHub

      let matchDue = true
      if (dueFilter === 'due') matchDue = (s.outstanding_balance || 0) > 0
      if (dueFilter === 'settled') matchDue = (s.outstanding_balance || 0) === 0
      if (dueFilter === 'over_credit') matchDue = (s.outstanding_balance || 0) > (s.credit_limit || 0) && (s.credit_limit || 0) > 0

      return matchSearch && matchCat && matchHub && matchDue
    })
  }, [suppliers, search, selectedCategory, selectedHub, dueFilter])

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl pb-12 animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Supplier & Vendor Directory"
        titleBn="মহাজন ও সরবরাহকারী ডিরেক্টরি"
        descriptionEn="Manage media importers, acrylic merchants, ink dealers, paper mills, and hardware suppliers across Nayabazar, Chawkbazar, and Fakirapool."
        descriptionBn="নয়াবাজার, চকবাজার ও ফকিরারপুলের মিডিয়া আমদানিকারক, এক্রিলিক মার্চেন্ট এবং পেপার মিলের মহাজনদের তালিকা ও বাকি হিসাব।"
        icon={Truck}
        iconColor="text-teal-600"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs h-9 font-semibold"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Export CSV', 'এক্সপোর্ট সিএসভি')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewPOOpen(true)}
              className="text-xs h-9 font-semibold text-slate-700 dark:text-slate-300"
            >
              <Package className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              {tBilingual('New PO', 'নতুন ক্রয়াদেশ')}
            </Button>

            <Link href={getTenantNavHref('/inventory?view=purchases', pathname, slug)}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 font-semibold text-slate-700 dark:text-slate-300"
              >
                <Layers className="mr-1.5 h-3.5 w-3.5 text-teal-600" />
                <span className="hidden sm:inline">PO & GRN Log</span>
              </Button>
            </Link>

            <Link href={getTenantNavHref('/trash?tab=suppliers', pathname, slug)}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 font-semibold text-slate-600 dark:text-slate-300"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Trash Bin</span>
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => {
                setSupplierToEdit(null)
                setIsSupplierModalOpen(true)
              }}
              className="bg-teal-600 hover:bg-teal-700 text-xs text-white font-bold h-9 shadow-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {tBilingual('Register Supplier', 'নতুন মহাজন যুক্ত করুন')}
            </Button>
          </div>
        }
      />

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* KPI HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Vendors */}
        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Total Vendors', 'মোট সরবরাহকারী')}
            </span>
            <Truck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {stats.totalVendors}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            {stats.activeVendors} Active partners
          </div>
        </Card>

        {/* Total Outstanding Due */}
        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Total Payable Due', 'মোট মহাজনের পাওনা')}
            </span>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 font-mono">
            {formatBDT(stats.totalPayableDue)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.vendorsWithDue} vendors pending payment
          </div>
        </Card>

        {/* Contract Rates */}
        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Agreed Rates', 'নির্ধারিত চুক্তি দর')}
            </span>
            <Tag className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {stats.activeContracts}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Catalog buying specs
          </div>
        </Card>

        {/* Market Hubs */}
        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Market Hubs', 'মার্কেট হাব')}
            </span>
            <MapPin className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {stats.uniqueHubs || 5}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Nayabazar, Chawkbazar, etc.
          </div>
        </Card>

        {/* Avg Credit Term */}
        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Standard Credit', 'সাধারণ বাকি মেয়াদ')}
            </span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            15-30 Days
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Post-dated Cheque cycle
          </div>
        </Card>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <Card className="p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder={tBilingual(
                'Search by supplier name, bangla name, mobile, contact person, market hub, BIN/TIN...',
                'মহাজন নাম, বাংলা নাম, মোবাইল, প্রতিনিধি, মার্কেট বা ভ্যাট নম্বর দিয়ে খুঁজুন...'
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Market Hub Filter */}
          <div className="w-full md:w-56">
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">📍 All Market Hubs (সকল এলাকা)</option>
              {BANGLADESH_MARKET_HUBS.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.nameEn.split(' ')[0]} - {hub.nameBn}
                </option>
              ))}
            </select>
          </div>

          {/* Due Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value as any)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Balances (সকল হিসাব)</option>
              <option value="due">⚠️ Has Payable Due (বাকি আছে)</option>
              <option value="settled">✅ Fully Settled (পরিশোধিত)</option>
              <option value="over_credit">🚨 Over Credit Limit (সীমা অতিক্রম)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Chips Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Categories ({suppliers.length})
          </button>

          {Object.values(SUPPLIER_CATEGORY_META).map((cat) => {
            const isSelected = selectedCategory === cat.id
            const count = suppliers.filter((s) => s.category === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.labelEn.split(' ')[0]}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* SUPPLIERS CONTENT AREA */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed rounded-xl">
          <Truck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {tBilingual('No Suppliers Found', 'কোন সরবরাহকারী পাওয়া যায়নি')}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search || selectedCategory !== 'all' || selectedHub !== 'all' || dueFilter !== 'all'
              ? 'Try adjusting your search query, market hub, category filter, or due status.'
              : 'Register your first material vendor for media rolls, inks, acrylic sheets, and display hardware.'}
          </p>
          <Button
            onClick={() => {
              setSearch('')
              setSelectedCategory('all')
              setSelectedHub('all')
              setDueFilter('all')
              setSupplierToEdit(null)
              setIsSupplierModalOpen(true)
            }}
            className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            size="sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {tBilingual('Register New Supplier', 'নতুন মহাজন যুক্ত করুন')}
          </Button>
        </Card>
      ) : viewMode === 'table' ? (
        /* ==================================================== */
        /* HIGH-DENSITY TABLE VIEW                              */
        /* ==================================================== */
        <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {tBilingual('Registered Suppliers & Vendor Partners', 'নিবন্ধিত মহাজন ও ভেন্ডর পার্টনার')}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {filtered.length} shown
                </Badge>
              </div>
              <span className="text-xs text-slate-400">Showing complete supplier master list</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-900/90 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{tBilingual('Supplier & Entity', 'সাপ্লায়ার ও প্রতিষ্ঠান')}</th>
                    <th className="py-3 px-4">{tBilingual('Category', 'ক্যাটাগরি')}</th>
                    <th className="py-3 px-4">{tBilingual('Contact & Phone', 'মোবাইল ও যোগাযোগ')}</th>
                    <th className="py-3 px-4">{tBilingual('Market Hub', 'মার্কেট হাব')}</th>
                    <th className="py-3 px-4">{tBilingual('Payment Terms & Limit', 'বাকি শর্ত ও সীমা')}</th>
                    <th className="py-3 px-4">{tBilingual('Payable Balance', 'বকেয়া পাওনা')}</th>
                    <th className="py-3 px-4 text-right">{tBilingual('Quick Actions', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((supplier) => {
                    const catMeta = SUPPLIER_CATEGORY_META[supplier.category] || SUPPLIER_CATEGORY_META.media
                    const CatIcon = catMeta.icon
                    const hasDue = (supplier.outstanding_balance || 0) > 0
                    const isOverLimit = (supplier.credit_limit || 0) > 0 && (supplier.outstanding_balance || 0) > (supplier.credit_limit || 0)

                    return (
                      <tr
                        key={supplier.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors"
                      >
                        {/* Name & Code */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 mt-0.5"
                              style={{ backgroundColor: `${catMeta.color}18`, color: catMeta.color }}
                            >
                              {supplier.supplier_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <Link
                                href={getTenantNavHref(`/suppliers/${supplier.id}`, pathname, slug)}
                                className="font-bold text-slate-900 dark:text-white hover:text-teal-600 flex items-center gap-1 group"
                              >
                                <span>{supplier.supplier_name}</span>
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity" />
                              </Link>
                              {supplier.name_bn && (
                                <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium bangla-text">
                                  {supplier.name_bn}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>{supplier.supplier_code || 'SUP-001'}</span>
                                {supplier.company && <span>• {supplier.company}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${catMeta.badgeClass}`}
                          >
                            <CatIcon className="h-3 w-3" />
                            <span>{catMeta.labelEn.split(' ')[0]}</span>
                          </span>
                        </td>

                        {/* Contact Person & Mobile */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {supplier.contact_person || '—'}
                          </div>
                          {supplier.designation && (
                            <div className="text-[10px] text-slate-400">{supplier.designation}</div>
                          )}
                          <div className="flex items-center gap-3 font-mono text-[11px] pt-1">
                            <a
                              href={`tel:${supplier.mobile}`}
                              className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-teal-600"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{supplier.mobile}</span>
                            </a>
                            {supplier.whatsapp && (
                              <a
                                href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-emerald-600 hover:underline"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Market Hub */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-medium">
                            <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                            <span className="capitalize">{supplier.market_hub || 'Nayabazar'}</span>
                          </div>
                          {supplier.address && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                              {supplier.address}
                            </div>
                          )}
                        </td>

                        {/* Terms & Credit Limit */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                            {supplier.payment_terms.replace('_', ' ')}
                          </div>
                          {(supplier.credit_limit || 0) > 0 && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Limit: {formatBDT(supplier.credit_limit || 0)}
                            </div>
                          )}
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-3.5 px-4">
                          {hasDue ? (
                            <div>
                              <div className="text-sm font-black font-mono text-amber-700 dark:text-amber-400">
                                {formatBDT(supplier.outstanding_balance || 0)}
                              </div>
                              {isOverLimit ? (
                                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[9px] py-0 px-1 border-0">
                                  Limit Exceeded
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-amber-600 font-semibold">Payable Due</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Settled</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasDue && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPayTargetSupplier(supplier)
                                  setIsPayModalOpen(true)
                                }}
                                className="h-8 px-2 text-[11px] font-bold text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 bg-teal-50/50 hover:bg-teal-100/70"
                                title="Pay Supplier"
                              >
                                <Receipt className="h-3.5 w-3.5 mr-1 text-teal-600" />
                                {tBilingual('Pay', 'পরিশোধ')}
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRateTargetSupplier(supplier)
                                setIsRateModalOpen(true)
                              }}
                              className="h-8 px-2 text-[11px] font-semibold"
                              title="Add Material Contract Rate"
                            >
                              <Tag className="h-3.5 w-3.5 text-slate-500" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSupplierToEdit(supplier)
                                setIsSupplierModalOpen(true)
                              }}
                              className="h-8 px-2 text-[11px] font-semibold"
                              title="Edit Supplier"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                            </Button>

                            <Link href={getTenantNavHref(`/suppliers/${supplier.id}`, pathname, slug)}>
                              <Button size="sm" className="h-8 px-2.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold">
                                {tBilingual('Profile & Rates', 'রেটশিট ও লেজার')}
                              </Button>
                            </Link>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTrashSupplier(supplier)}
                              className="h-8 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Move to Trash"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ==================================================== */
        /* MODERN GRID CARDS VIEW                               */
        /* ==================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((supplier) => {
            const catMeta = SUPPLIER_CATEGORY_META[supplier.category] || SUPPLIER_CATEGORY_META.media
            const CatIcon = catMeta.icon
            const hasDue = (supplier.outstanding_balance || 0) > 0
            const creditLimit = supplier.credit_limit || 500000
            const currentBal = supplier.outstanding_balance || 0
            const creditUsedPct = Math.min(100, Math.round((currentBal / creditLimit) * 100))

            return (
              <Card
                key={supplier.id}
                className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                          style={{ backgroundColor: `${catMeta.color}18`, color: catMeta.color }}
                        >
                          {supplier.supplier_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={getTenantNavHref(`/suppliers/${supplier.id}`, pathname, slug)}
                            className="font-bold text-slate-900 dark:text-white hover:text-teal-600 text-sm flex items-center gap-1 group"
                          >
                            <span>{supplier.supplier_name}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-600" />
                          </Link>
                          {supplier.name_bn && (
                            <div className="text-xs text-teal-700 dark:text-teal-400 font-medium bangla-text">
                              {supplier.name_bn}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {supplier.supplier_code || 'SUP-001'} {supplier.company && `• ${supplier.company}`}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${catMeta.badgeClass}`}
                      >
                        <CatIcon className="h-3 w-3" />
                        <span>{catMeta.labelEn.split(' ')[0]}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Body Contact & Hub */}
                  <div className="p-4 space-y-3">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-2 text-xs">
                      {supplier.contact_person && (
                        <div className="text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between">
                          <span>{supplier.contact_person}</span>
                          {supplier.designation && (
                            <span className="text-[10px] text-slate-400">{supplier.designation}</span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] pt-0.5">
                        <a
                          href={`tel:${supplier.mobile}`}
                          className="flex items-center gap-1 text-teal-700 dark:text-teal-400 font-bold hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{supplier.mobile}</span>
                        </a>

                        {supplier.whatsapp && (
                          <a
                            href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-600 font-bold hover:underline"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{supplier.address || supplier.market_hub || 'Dhaka'}</span>
                      </div>
                    </div>

                    {/* Credit Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Terms: {supplier.payment_terms.replace('_', ' ').toUpperCase()}</span>
                        <span>Credit Limit: {formatBDT(creditLimit)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all rounded-full ${
                            creditUsedPct > 90 ? 'bg-rose-500' : creditUsedPct > 50 ? 'bg-amber-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${creditUsedPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Balance & Actions */}
                <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      {tBilingual('Payable Balance', 'বকেয়া পাওনা')}
                    </span>
                    <div className="text-base font-black font-mono">
                      {hasDue ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {formatBDT(currentBal)}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Settled
                        </span>
                      )}
                    </div>
                  </div>

                    <div className="flex items-center gap-1.5">
                      {hasDue && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setPayTargetSupplier(supplier)
                            setIsPayModalOpen(true)
                          }}
                          className="h-8 px-2.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs"
                        >
                          <Receipt className="h-3.5 w-3.5 mr-1" />
                          {tBilingual('Pay', 'পরিশোধ')}
                        </Button>
                      )}

                      <Link href={getTenantNavHref(`/suppliers/${supplier.id}`, pathname, slug)}>
                        <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs font-bold">
                          {tBilingual('Profile', 'প্রোফাইল')} <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTrashSupplier(supplier)}
                        className="h-8 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Move to Trash"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL 1: REGISTER / EDIT SUPPLIER */}
      <SupplierModal
        open={isSupplierModalOpen}
        onOpenChange={setIsSupplierModalOpen}
        supplierToEdit={supplierToEdit}
        onSave={handleSaveSupplier}
      />

      {/* MODAL 2: PAY SUPPLIER VOUCHER */}
      <PaySupplierVoucherModal
        open={isPayModalOpen}
        onOpenChange={setIsPayModalOpen}
        supplier={payTargetSupplier}
        onPaymentRecorded={handlePaymentRecorded}
      />

      {/* MODAL 3: SUPPLIER MATERIAL RATE */}
      <SupplierMaterialRateModal
        open={isRateModalOpen}
        onOpenChange={setIsRateModalOpen}
        supplier={rateTargetSupplier}
        onSaveRate={handleSaveRate}
      />

      {/* MODAL 4: NEW PURCHASE ORDER */}
      <NewPurchaseModal
        open={isNewPOOpen}
        onOpenChange={setIsNewPOOpen}
        defaultSupplierId={payTargetSupplier?.id}
      />

      {/* Supplier Trash Confirm Dialog */}
      <ConfirmDialog
        open={isTrashConfirmOpen}
        onOpenChange={setIsTrashConfirmOpen}
        title={`Move "${supplierToTrash?.supplier_name || 'Supplier'}" to Trash?`}
        titleBn={`"${supplierToTrash?.supplier_name || 'সাপ্লায়ার'}" ট্র্যাশে স্থানান্তর করবেন?`}
        message="Are you sure you want to move this supplier to Trash / Recycle Bin? Associated transaction history is preserved."
        messageBn="আপনি কি এই সরবরাহকারীকে রিসাইকেল বিনে সরাতে চান? পূর্বের লেনদেন রেকর্ড সংরক্ষিত থাকবে।"
        confirmText="Move to Trash"
        confirmTextBn="ট্র্যাশে সরান"
        cancelText="Cancel"
        cancelTextBn="বাতিল"
        isDestructive={true}
        isLoading={isTrashing}
        onConfirm={confirmTrashSupplier}
      />
    </div>
  )
}

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
  Edit2,
  Printer,
  CreditCard,
  Landmark,
  Clock,
  ExternalLink,
  Trash2,
  Layers,
  Sparkles,
  ShieldCheck,
  Calendar,
  User,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import type { SupplierRecord, SupplierMaterialPrice } from '@/types/crm.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import type { CashBookEntryRecord } from '@/types/accounting.types'
import type { PurchaseOrderRecord } from '@/types/purchase.types'
import { formatBDT } from '@/lib/formatters'
import {
  SUPPLIER_CATEGORY_META,
  BANGLADESH_MARKET_HUBS,
  SUPPLIER_PAYMENT_TERMS,
} from '@/components/suppliers/supplier-types'
import { SupplierModal } from '@/components/suppliers/supplier-modal'
import { PaySupplierVoucherModal } from '@/components/suppliers/pay-supplier-voucher-modal'
import { SupplierMaterialRateModal } from '@/components/suppliers/supplier-material-rate-modal'
import { NewPurchaseModal } from '@/components/purchases/new-purchase-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'

type TabKey = 'prices' | 'purchases' | 'payments' | 'ledger' | 'company_info'

export default function SupplierProfilePage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const supplierId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [suppliers, setSuppliers] = useDataStore<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS, [])
  const [allPrices, setAllPrices] = useDataStore<SupplierMaterialPrice[]>(STORAGE_KEYS.SUPPLIER_PRICES, [])
  const [purchaseOrders] = useDataStore<PurchaseOrderRecord[]>(STORAGE_KEYS.PURCHASE_ORDERS, [])
  const [cashEntries] = useDataStore<CashBookEntryRecord[]>(STORAGE_KEYS.CASH_BOOK, [])

  const supplier = suppliers.find((s) => s.id === supplierId || s.supplier_name === supplierId)
  const materialPrices = allPrices.filter((p) => supplier && (p.supplier_id === supplier.id || p.supplier_id === supplierId))
  const relatedPOs = purchaseOrders.filter((po) => supplier && (po.supplier_id === supplier.id || po.supplier_name === supplier.supplier_name))

  const [activeTab, setActiveTab] = useState<TabKey>('prices')
  const [notification, setNotification] = useState<string | null>(null)

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [priceToEdit, setPriceToEdit] = useState<SupplierMaterialPrice | null>(null)
  const [isNewPOOpen, setIsNewPOOpen] = useState(false)

  // Rate delete confirm state
  const [rateToDelete, setRateToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleteRateOpen, setIsDeleteRateOpen] = useState(false)

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification(msg)
    dispatchToast({
      type,
      title: type === 'error' ? 'Error' : type === 'info' ? 'Notice' : 'Success',
      titleBn: type === 'error' ? 'ত্রুটি' : type === 'info' ? 'বিজ্ঞপ্তি' : 'সফল হয়েছে',
      message: msg,
    })
    setTimeout(() => setNotification(null), 3800)
  }

  // Handle Save Rate
  const handleSaveRate = (rate: SupplierMaterialPrice) => {
    const exists = allPrices.some((p) => p.id === rate.id)
    if (exists) {
      PrintERPDataStore.updateItem(STORAGE_KEYS.SUPPLIER_PRICES, rate.id, rate)
      showNotification(`Contract rate for '${rate.material_name}' updated.`)
    } else {
      PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_PRICES, rate)
      showNotification(`Contract rate for '${rate.material_name}' saved.`)
    }
  }

  // Handle Delete Rate
  const handleDeleteRate = (rateId: string, rateName: string) => {
    setRateToDelete({ id: rateId, name: rateName })
    setIsDeleteRateOpen(true)
  }

  const confirmDeleteRate = () => {
    if (!rateToDelete) return
    PrintERPDataStore.removeItem(STORAGE_KEYS.SUPPLIER_PRICES, rateToDelete.id)
    showNotification(`Contract rate for '${rateToDelete.name}' removed.`, 'info')
    setIsDeleteRateOpen(false)
    setRateToDelete(null)
  }

  // Handle Save Supplier from Edit
  const handleSaveSupplier = (updated: SupplierRecord) => {
    PrintERPDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, updated.id, updated)
    showNotification(`Supplier profile '${updated.supplier_name}' updated.`)
  }

  // Handle Record Payment
  const handlePaymentRecorded = (amount: number, details: any) => {
    if (!supplier) return

    const newBalance = Math.max(0, (supplier.outstanding_balance || 0) - amount)
    PrintERPDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, supplier.id, {
      outstanding_balance: newBalance,
      updated_at: new Date().toISOString(),
    })

    if (details.method === 'cash') {
      const cashEntry: CashBookEntryRecord = {
        id: `cbe-${Date.now()}`,
        company_id: company?.id || 'c-01',
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'cash_out',
        amount: amount,
        category: 'Supplier Payment',
        description: `Disbursement to ${supplier.supplier_name} (${details.voucherNumber})`,
        reference_id: details.voucherNumber,
        performed_by_name: details.authorizedBy || 'Cashier',
        created_at: new Date().toISOString(),
      }
      PrintERPDataStore.addItem<CashBookEntryRecord>(STORAGE_KEYS.CASH_BOOK, cashEntry)
    }

    showNotification(`Payment voucher ${details.voucherNumber} of ${formatBDT(amount)} recorded for ${supplier.supplier_name}.`)
  }

  // Print Statement Summary
  const handlePrintStatement = () => {
    window.print()
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl pb-12 animate-pulse">
        <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded mb-3" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Link
          href={getTenantNavHref('/suppliers', pathname, slug)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tBilingual('Back to Supplier Directory', 'মহাজন তালিকায় ফিরে যান')}
        </Link>
        <Card className="p-12 text-center border-dashed rounded-xl">
          <Truck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {tBilingual('Supplier Not Found', 'সরবরাহকারী পাওয়া যায়নি')}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The supplier record you are looking for does not exist in your organization or was removed.
          </p>
          <Button asChild className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold" size="sm">
            <Link href={getTenantNavHref('/suppliers', pathname, slug)}>View All Suppliers</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const catMeta = SUPPLIER_CATEGORY_META[supplier.category] || SUPPLIER_CATEGORY_META.media
  const CatIcon = catMeta.icon
  const creditLimit = supplier.credit_limit || 500000
  const outstandingDue = supplier.outstanding_balance || 0
  const creditUsedPct = Math.min(100, Math.round((outstandingDue / creditLimit) * 100))

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Breadcrumb & Action Header */}
      <div>
        <Link
          href={getTenantNavHref('/suppliers', pathname, slug)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tBilingual('Back to Supplier Directory', 'মহাজন তালিকায় ফিরে যান')}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Vendor Identity */}
          <div className="flex items-start gap-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-xs"
              style={{ backgroundColor: `${catMeta.color}20`, color: catMeta.color }}
            >
              {supplier.supplier_name.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {supplier.supplier_name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${catMeta.badgeClass}`}
                >
                  <CatIcon className="h-3.5 w-3.5" />
                  <span>{catMeta.labelEn.split(' ')[0]}</span>
                </span>
                <Badge variant="outline" className="text-[11px] font-mono py-0.5 px-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {supplier.supplier_code || 'SUP-001'}
                </Badge>
              </div>

              {supplier.name_bn && (
                <div className="text-sm font-bold text-teal-700 dark:text-teal-400 bangla-text">
                  {supplier.name_bn} {supplier.company && `• ${supplier.company}`}
                </div>
              )}

              {/* Contact & Hub Links */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <a
                  href={`tel:${supplier.mobile}`}
                  className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 hover:text-teal-600 font-bold"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{supplier.mobile}</span>
                </a>

                {supplier.whatsapp && (
                  <a
                    href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-600 font-mono font-bold hover:underline"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {supplier.email && (
                  <a
                    href={`mailto:${supplier.email}`}
                    className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{supplier.email}</span>
                  </a>
                )}

                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate max-w-[200px]">{supplier.address || supplier.market_hub || 'Dhaka'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrintStatement}
              className="text-xs h-9 font-semibold"
              title="Print Statement"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              {tBilingual('Print', 'প্রিন্ট')}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs h-9 font-semibold text-slate-700 dark:text-slate-300"
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Edit Profile', 'সম্পাদনা')}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPriceToEdit(null)
                setIsRateModalOpen(true)
              }}
              className="text-xs h-9 font-semibold text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 bg-teal-50/50 hover:bg-teal-100"
            >
              <Tag className="mr-1.5 h-3.5 w-3.5 text-teal-600" />
              {tBilingual('Add Rate', 'দর যুক্ত করুন')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsPayModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-xs text-white font-bold h-9 shadow-xs"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Pay Supplier Voucher', 'বিল পরিশোধ')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewPOOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs text-white font-bold h-9 shadow-xs"
            >
              <Package className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Issue New PO', 'ক্রয়াদেশ')}
            </Button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Supplier Balance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases */}
        <Card className="p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {tBilingual('Total Purchases from Vendor', 'মোট ক্রয়কৃত মালামাল')}
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            <CurrencyDisplay amount={supplier.total_purchases_amount || 0} />
          </div>
          <span className="text-[11px] text-slate-400">Cumulative roll/sheet acquisitions</span>
        </Card>

        {/* Payments Cleared */}
        <Card className="p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {tBilingual('Total Payments Cleared', 'মোট পরিশোধিত বিল')}
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            <CurrencyDisplay
              amount={Math.max(0, (supplier.total_purchases_amount || 0) - (supplier.outstanding_balance || 0))}
            />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Bank Cheques, RTGS & Cash</span>
        </Card>

        {/* Payable Due */}
        <Card className={`p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800 border-l-4 ${outstandingDue > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Payable Balance', 'বর্তমান বকেয়া পাওনা')}
            </span>
            {outstandingDue > 0 ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                Pending
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                Settled
              </Badge>
            )}
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 font-mono">
            <CurrencyDisplay amount={outstandingDue} />
          </div>
          <span className="text-[11px] text-slate-400">Terms: {supplier.payment_terms.replace('_', ' ').toUpperCase()}</span>
        </Card>

        {/* Credit Limit Meter */}
        <Card className="p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Credit Limit Utilization', 'বাকি সীমা ব্যবহার')}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
              {creditUsedPct}%
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            <CurrencyDisplay amount={creditLimit} />
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all rounded-full ${
                creditUsedPct > 90 ? 'bg-rose-500' : creditUsedPct > 50 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${creditUsedPct}%` }}
            />
          </div>
        </Card>
      </div>

      {/* 5 ENTERPRISE DOMAIN TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        {[
          { id: 'prices', labelEn: '🏷️ Material Contract Rates', labelBn: '🏷️ কাঁচামাল চুক্তি দর', count: materialPrices.length },
          { id: 'purchases', labelEn: '📦 Purchase Orders & Inward Deliveries', labelBn: '📦 ক্রয়াদেশ ও ডেলিভারি', count: relatedPOs.length },
          { id: 'payments', labelEn: '💳 Payment Vouchers & Disbursements', labelBn: '💳 পেমেন্ট ভাউচার ও পরিশোধ' },
          { id: 'ledger', labelEn: '📑 Financial Statement & Ledger', labelBn: '📑 আর্থিক বিবরণী ও খতিয়ান' },
          { id: 'company_info', labelEn: '🏢 Corporate, Legal & Bank Details', labelBn: '🏢 ব্যাংক ও আইনি তথ্য' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabKey)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer bangla-text ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'
            }`}
          >
            <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
            {tab.count !== undefined && (
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: MATERIAL CONTRACT RATES                       */}
      {/* ==================================================== */}
      {activeTab === 'prices' && (
        <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold">
                  {tBilingual('Negotiated Material Contract Prices', 'চুক্তিভিত্তিক ক্রয়দর তালিকা')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tBilingual(
                    'Pre-agreed procurement costs automatically injected into quotation cost calculators and PO creation.',
                    'দরপত্র ও ক্রয়াদেশের কস্টিংয়ের জন্য নির্ধারিত ক্র‍য়মূল্য।'
                  )}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setPriceToEdit(null)
                  setIsRateModalOpen(true)
                }}
                className="bg-teal-600 hover:bg-teal-700 text-xs text-white font-bold shrink-0 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Add Material Rate', 'নতুন চুক্তি দর')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-900/90 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{tBilingual('Material Specification & Brand', 'মেটেরিয়াল বিবরণ')}</th>
                    <th className="py-3 px-4">{tBilingual('Category', 'ক্যাটাগরি')}</th>
                    <th className="py-3 px-4">{tBilingual('UOM', 'একক')}</th>
                    <th className="py-3 px-4">{tBilingual('Contract Rate', 'চুক্তি দর')}</th>
                    <th className="py-3 px-4">{tBilingual('MOQ & Lead Time', 'নূন্যতম অর্ডার ও সময়')}</th>
                    <th className="py-3 px-4">{tBilingual('Effective Date', 'কার্যকর তারিখ')}</th>
                    <th className="py-3 px-4">{tBilingual('Remarks / Terms', 'মন্তব্য')}</th>
                    <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {materialPrices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div className="font-bold text-slate-600 dark:text-slate-300">
                          {tBilingual('No Material Contract Rates Configured', 'কোন চুক্তি দর নির্ধারিত নেই')}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Click &quot;Add Material Rate&quot; to record buying rates for roll media, inks, or sheets.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    materialPrices.map((price) => (
                      <tr key={price.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{price.material_name}</td>
                        <td className="py-3 px-4 capitalize text-slate-500">{price.category}</td>
                        <td className="py-3 px-4 uppercase font-mono font-semibold">{price.unit}</td>
                        <td className="py-3 px-4 font-black font-mono text-teal-700 dark:text-teal-400 text-sm">
                          {formatBDT(price.contract_price_bdt)} <span className="text-[10px] font-normal text-slate-400">/ {price.unit}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          MOQ: {price.moq || 1} • {price.lead_time_days || 2}d
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{price.effective_date}</td>
                        <td className="py-3 px-4 text-slate-400 italic max-w-[200px] truncate">
                          {price.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPriceToEdit(price)
                                setIsRateModalOpen(true)
                              }}
                              className="h-7 px-2 text-xs"
                              title="Edit Rate"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRate(price.id, price.material_name)}
                              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700"
                              title="Delete Rate"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================== */}
      {/* TAB 2: PURCHASES & GRN RECEIVING                     */}
      {/* ==================================================== */}
      {activeTab === 'purchases' && (
        <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                {tBilingual('Purchase Orders & Inward GRN Shipments', 'ক্রয়াদেশ ও চালান রিসিভিং')}
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsNewPOOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-xs text-white font-bold shrink-0 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Issue Purchase Order', 'নতুন ক্রয়াদেশ')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-900/90 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{tBilingual('PO Number', 'পিও নম্বর')}</th>
                    <th className="py-3 px-4">{tBilingual('Order Date', 'অর্ডারের তারিখ')}</th>
                    <th className="py-3 px-4">{tBilingual('Items & Specifications', 'মালামালের বিবরণ')}</th>
                    <th className="py-3 px-4">{tBilingual('Total Cost', 'মোট বিল')}</th>
                    <th className="py-3 px-4">{tBilingual('Warehouse Status', 'গোডাউন স্ট্যাটাস')}</th>
                    <th className="py-3 px-4">{tBilingual('Payment Status', 'পেমেন্ট স্ট্যাটাস')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {relatedPOs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div className="font-bold text-slate-600 dark:text-slate-300">
                          {tBilingual('No Purchase Orders Found', 'কোন ক্রয়াদেশ পাওয়া যায়নি')}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Click &quot;Issue Purchase Order&quot; to procure raw materials or finished products from this vendor.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    relatedPOs.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {po.po_number}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{po.po_date}</td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          {po.items?.length || 0} line item(s) • {po.items?.[0]?.material_name || 'Standard supplies'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {formatBDT(po.grand_total || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 capitalize text-[10px]">
                            {po.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 capitalize text-[10px]">
                            {po.due_amount <= 0 ? 'Paid' : po.paid_amount > 0 ? 'Partially Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================== */}
      {/* TAB 3: PAYMENTS VOUCHERS                             */}
      {/* ==================================================== */}
      {activeTab === 'payments' && (
        <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                {tBilingual('Disbursed Payment Vouchers', 'পরিশোধিত পেমেন্ট ভাউচার')}
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsPayModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-xs text-white font-bold shrink-0 shadow-xs"
              >
                <Receipt className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Disburse Voucher', 'নতুন ভাউচার')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-900/90 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{tBilingual('Voucher No', 'ভাউচার নং')}</th>
                    <th className="py-3 px-4">{tBilingual('Disbursement Channel', 'পেমেন্টের মাধ্যম')}</th>
                    <th className="py-3 px-4">{tBilingual('Amount Paid', 'পরিশোধের পরিমাণ')}</th>
                    <th className="py-3 px-4">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="py-3 px-4">{tBilingual('Bank / Cheque Ref', 'চেক বা ব্যাংক রেফারেন্স')}</th>
                    <th className="py-3 px-4">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                    <td className="py-3 px-4 font-mono font-bold text-teal-600">PV-2024-0012</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">Bank Cheque</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-sm">৳ 100,000</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">20/08/2024</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">City Bank Cheque #982104</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 text-[10px]">
                        Cheque Cleared
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================== */}
      {/* TAB 4: FINANCIAL STATEMENT & LEDGER                  */}
      {/* ==================================================== */}
      {activeTab === 'ledger' && (
        <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">
                  {tBilingual('Supplier Account Statement & Audit Ledger', 'মহাজনের খতিয়ান ও হিসাব বিবরণী')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tBilingual('Chronological statement of purchases, debit disbursements, credit notes, and running balance.', 'ক্রয় ও পরিশোধের পূর্ণাঙ্গ লেজার।')}
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handlePrintStatement} className="text-xs">
                <Printer className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Print Ledger', 'লেজার প্রিন্ট')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-900/90 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="py-3 px-4">{tBilingual('Transaction Type', 'লেনদেনের ধরন')}</th>
                    <th className="py-3 px-4">{tBilingual('Reference', 'রেফারেন্স')}</th>
                    <th className="py-3 px-4 text-right">{tBilingual('Billed Amount (Credit)', 'ক্রয় / বিল')}</th>
                    <th className="py-3 px-4 text-right">{tBilingual('Paid Amount (Debit)', 'পরিশোধ')}</th>
                    <th className="py-3 px-4 text-right">{tBilingual('Running Due (Balance)', 'অবশিষ্ট বাকি')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  <tr>
                    <td className="py-3 px-4 text-slate-500">28/08/2024</td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                      Goods Received (GRN-0089)
                    </td>
                    <td className="py-3 px-4 text-teal-600 font-bold">PO-000034</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">৳ 23,750</td>
                    <td className="py-3 px-4 text-right text-slate-400">—</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-700 dark:text-amber-400">
                      {formatBDT(supplier.outstanding_balance || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-500">20/08/2024</td>
                    <td className="py-3 px-4 font-sans font-semibold text-emerald-600">
                      Payment Voucher Cleared
                    </td>
                    <td className="py-3 px-4 text-slate-600">PV-2024-0012</td>
                    <td className="py-3 px-4 text-right text-slate-400">—</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">৳ 100,000</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">৳ 0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================== */}
      {/* TAB 5: CORPORATE, LEGAL & BANK DETAILS               */}
      {/* ==================================================== */}
      {activeTab === 'company_info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Legal & Market Location */}
          <Card className="p-5 rounded-xl shadow-xs border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Building className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('Legal & Trade Registration', 'আইনগত ও ট্রেড তথ্য')}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">Trade License:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {supplier.trade_license || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">BIN / VAT Registration:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {supplier.bin || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">TIN Number:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {supplier.tin || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">Market Hub Area:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                  {supplier.market_hub || 'Nayabazar'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Full Street Address:</span>
                <span className="text-slate-800 dark:text-slate-200 text-right max-w-[240px]">
                  {supplier.address || '—'}
                </span>
              </div>
            </div>
          </Card>

          {/* Bank & Cheque Disbursement Details */}
          <Card className="p-5 rounded-xl shadow-xs border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Landmark className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('Bank Account for Disbursements', 'ব্যাংক অ্যাকাউন্ট ও চেক প্রদান তথ্য')}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">Bank Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {supplier.bank_name || 'Dutch-Bangla Bank PLC'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">Account Title:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {supplier.bank_account_name || supplier.supplier_name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">Account Number:</span>
                <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                  {supplier.bank_account_number || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-500">Branch Name:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {supplier.bank_branch || 'Dhaka Main'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Routing Number:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {supplier.bank_routing_number || '—'}
                </span>
              </div>
            </div>
          </Card>

          {/* Agreement Notes */}
          <Card className="p-5 rounded-xl shadow-xs border-slate-200 dark:border-slate-800 md:col-span-2 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Vendor Agreement Remarks & Special Notes', 'চুক্তি ও বাকির শর্তাবলীর বিশেষ নোট')}
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              {supplier.notes || 'No special credit remarks recorded for this supplier.'}
            </p>
          </Card>
        </div>
      )}

      {/* ALL MODALS */}
      <SupplierModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        supplierToEdit={supplier}
        onSave={handleSaveSupplier}
      />

      <PaySupplierVoucherModal
        open={isPayModalOpen}
        onOpenChange={setIsPayModalOpen}
        supplier={supplier}
        onPaymentRecorded={handlePaymentRecorded}
      />

      <SupplierMaterialRateModal
        open={isRateModalOpen}
        onOpenChange={setIsRateModalOpen}
        supplier={supplier}
        priceToEdit={priceToEdit}
        onSaveRate={handleSaveRate}
      />

      <NewPurchaseModal
        open={isNewPOOpen}
        onOpenChange={setIsNewPOOpen}
        defaultSupplierId={supplier.id}
      />

      {/* Delete Contract Rate Confirm Dialog */}
      <ConfirmDialog
        open={isDeleteRateOpen}
        onOpenChange={setIsDeleteRateOpen}
        title={`Remove Contract Rate for "${rateToDelete?.name || 'Material'}"?`}
        titleBn={`"${rateToDelete?.name || 'ম্যাটেরিয়াল'}" এর চুক্তির দর মুছে ফেলবেন?`}
        message={`Are you sure you want to remove this negotiated rate from ${supplier.supplier_name}?`}
        messageBn={`আপনি কি এই সরবরাহকারীর জন্য নির্ধারিত কাঁচামালের রেটটি মুছে ফেলতে চান?`}
        confirmText="Remove Rate"
        confirmTextBn="রেট মুছুন"
        cancelText="Cancel"
        cancelTextBn="বাতিল"
        isDestructive={true}
        onConfirm={confirmDeleteRate}
      />
    </div>
  )
}

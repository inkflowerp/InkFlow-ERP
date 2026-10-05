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
import { PageContainer } from '@/components/ui/page-container'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import type { SupplierRecord, SupplierMaterialPrice } from '@/types/crm.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
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
 PrintFlowDataStore.updateItem(STORAGE_KEYS.SUPPLIER_PRICES, rate.id, rate)
 showNotification(`Contract rate for '${rate.material_name}' updated.`)
    } else {
 PrintFlowDataStore.addItem(STORAGE_KEYS.SUPPLIER_PRICES, rate)
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
 PrintFlowDataStore.removeItem(STORAGE_KEYS.SUPPLIER_PRICES, rateToDelete.id)
 showNotification(`Contract rate for '${rateToDelete.name}' removed.`, 'info')
 setIsDeleteRateOpen(false)
 setRateToDelete(null)
  }

  // Handle Save Supplier from Edit
 const handleSaveSupplier = (updated: SupplierRecord) => {
 PrintFlowDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, updated.id, updated)
 showNotification(`Supplier profile '${updated.supplier_name}' updated.`)
  }

  // Handle Record Payment
 const handlePaymentRecorded = (amount: number, details: any) => {
 if (!supplier) return

 const newBalance = Math.max(0, (supplier.outstanding_balance || 0) - amount)
 PrintFlowDataStore.updateItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, supplier.id, {
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
 PrintFlowDataStore.addItem<CashBookEntryRecord>(STORAGE_KEYS.CASH_BOOK, cashEntry)
    }

 showNotification(`Payment voucher ${details.voucherNumber} of ${formatBDT(amount)} recorded for ${supplier.supplier_name}.`)
  }

  // Print Statement Summary
 const handlePrintStatement = () => {
 window.print()
  }

 if (!mounted) {
 return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-3"/>
        <div className="h-24 bg-muted rounded-xl"/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl"/>
          ))}
        </div>
      </div>
    )
  }

 if (!supplier) {
 return (
      <PageContainer className="space-y-6">
        <Link
 href={getTenantNavHref('/suppliers', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5"/>
          {tBilingual('Back to Supplier Directory', 'মহাজন তালিকায় ফিরে যান')}
        </Link>
        <Card className="p-12 text-center border-dashed rounded-xl">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3"/>
          <h2 className="text-base font-bold text-foreground">
            {tBilingual('Supplier Not Found', 'সরবরাহকারী পাওয়া যায়নি')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
 {tBilingual('The supplier record you are looking for does not exist in your organization or was removed.', 'কাঙ্ক্ষিত সরবরাহকারীর তথ্য খুঁজে পাওয়া যায়নি অথবা মুছে ফেলা হয়েছে।')}
          </p>
          <Button asChild className="mt-4 bg-success hover:bg-success/90 text-success-foreground font-bold"size="sm">
            <Link href={getTenantNavHref('/suppliers', pathname, slug)}>{tBilingual('View All Suppliers', 'সকল সরবরাহকারী দেখুন')}</Link>
          </Button>
        </Card>
      </PageContainer>
    )
  }

 const catMeta = SUPPLIER_CATEGORY_META[supplier.category] || SUPPLIER_CATEGORY_META.media
 const CatIcon = catMeta.icon
 const creditLimit = supplier.credit_limit || 500000
 const outstandingDue = supplier.outstanding_balance || 0
 const creditUsedPct = Math.min(100, Math.round((outstandingDue / creditLimit) * 100))

 return (
    <PageContainer className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div>
        <Link
 href={getTenantNavHref('/suppliers', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5"/>
          {tBilingual('Back to Supplier Directory', 'মহাজন তালিকায় ফিরে যান')}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
          {/* Vendor Identity */}
          <div className="flex items-start gap-4">
            <div
 className="h-14 w-14 rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow-xs"style={{ backgroundColor: `${catMeta.color}20`, color: catMeta.color }}
            >
              {supplier.supplier_name.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  {supplier.supplier_name}
                </h1>
                <span
 className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${catMeta.badgeClass}`}
                >
                  <CatIcon className="h-3.5 w-3.5"/>
                  <span>{catMeta.labelEn.split(' ')[0]}</span>
                </span>
                <Badge variant="outline"className="text-xs tabular-nums py-0.5 px-2 bg-muted text-muted-foreground">
                  {supplier.supplier_code || 'SUP-001'}
                </Badge>
              </div>

              {supplier.name_bn && (
                <div className="text-sm font-bold text-success bangla-text">
                  {supplier.name_bn} {supplier.company && `• ${supplier.company}`}
                </div>
              )}

              {/* Contact & Hub Links */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <a
 href={`tel:${supplier.mobile}`}
 className="flex items-center gap-1 tabular-nums text-foreground hover:text-success font-bold">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground"/>
                  <span>{supplier.mobile}</span>
                </a>

                {supplier.whatsapp && (
                  <a
 href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`}
 target="_blank"rel="noopener noreferrer"className="flex items-center gap-1 text-success tabular-nums font-bold hover:underline">
                    <MessageSquare className="h-3.5 w-3.5"/>
                    <span>WhatsApp</span>
                  </a>
                )}

                {supplier.email && (
                  <a
 href={`mailto:${supplier.email}`}
 className="flex items-center gap-1 text-muted-foreground hover:underline">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span>{supplier.email}</span>
                  </a>
                )}

                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground"/>
                  <span className="truncate max-w-[200px]">{supplier.address || supplier.market_hub || 'Dhaka'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
 size="sm"variant="outline"onClick={handlePrintStatement}
 className="text-xs h-9 font-semibold"title="Print Statement">
              <Printer className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
              {tBilingual('Print', 'প্রিন্ট')}
            </Button>

            <Button
 size="sm"variant="outline"onClick={() => setIsEditModalOpen(true)}
 className="text-xs h-9 font-semibold text-foreground">
              <Edit2 className="mr-1.5 h-3.5 w-3.5"/>
              {tBilingual('Edit Profile', 'সম্পাদনা')}
            </Button>

            <Button
 size="sm"variant="outline"onClick={() => {
 setPriceToEdit(null)
 setIsRateModalOpen(true)
              }}
 className="text-xs h-9 font-semibold text-success border-success-border bg-success-surface/50 hover:bg-success-surface">
              <Tag className="mr-1.5 h-3.5 w-3.5 text-success"/>
              {tBilingual('Add Rate', 'দর যুক্ত করুন')}
            </Button>

            <Button
 size="sm"onClick={() => setIsPayModalOpen(true)}
 className="bg-success hover:bg-success/90 text-xs text-success-foreground font-bold h-9 shadow-xs">
              <Receipt className="mr-1.5 h-3.5 w-3.5"/>
              {tBilingual('Pay Supplier Voucher', 'বিল পরিশোধ')}
            </Button>

            <Button
 size="sm"onClick={() => setIsNewPOOpen(true)}
 className="bg-primary hover:bg-primary/90 text-xs text-primary-foreground font-bold h-9 shadow-xs">
              <Package className="mr-1.5 h-3.5 w-3.5"/>
              {tBilingual('Issue New PO', 'ক্রয়াদেশ')}
            </Button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-success-surface text-success rounded-xl text-xs font-semibold flex items-center gap-2 border border-success-border bg-success-surface text-success animate-in fade-in-0 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* Supplier Balance KPIs */}
      <KpiGrid columns={4}>
        {/* Total Purchases */}
        <KpiCard
 titleEn="Total Purchases from Vendor"titleBn="মোট ক্রয়কৃত মালামাল"value={supplier.total_purchases_amount || 0}
 isCurrency
 icon={Package}
 colorVariant="blue"subtitleEn="Cumulative roll/sheet acquisitions"subtitleBn="রোল ও শিট ক্রয় ভলিউম"/>

        {/* Payments Cleared */}
        <KpiCard
 titleEn="Total Payments Cleared"titleBn="মোট পরিশোধিত বিল"value={Math.max(0, (supplier.total_purchases_amount || 0) - (supplier.outstanding_balance || 0))}
 isCurrency
 icon={CheckCircle2}
 colorVariant="emerald"subtitleEn="Bank & Cash"subtitleBn="চেক, আরটিজিএস ও ক্যাশ"/>

        {/* Payable Due */}
        <KpiCard
 titleEn="Payable Balance"titleBn="বর্তমান বকেয়া পাওনা"value={outstandingDue}
 isCurrency
 icon={CreditCard}
 colorVariant={outstandingDue > 0 ? 'amber' : 'emerald'}
 badge={outstandingDue > 0 ? tBilingual('Pending', 'অপেক্ষমান') : tBilingual('Settled', 'পরিশোধিত')}
 badgeColor={outstandingDue > 0 ? 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning border-warning-border' : 'bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border'}
 subtitle={`${tBilingual('Terms', 'শর্তাবলী')}: ${supplier.payment_terms.replace('_', ' ').toUpperCase()}`}
        />

        {/* Credit Limit Meter */}
        <KpiCard
 titleEn="Credit Used"titleBn="বাকি সীমা ব্যবহার"value={creditLimit}
 isCurrency
 icon={ShieldCheck}
 colorVariant={creditUsedPct > 90 ? 'danger' : creditUsedPct > 50 ? 'amber' : 'teal'}
 subtitle={`${creditUsedPct}% ${tBilingual('limit used', 'সীমা ব্যবহৃত')}`}
        >
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1.5">
            <div
 className={`h-full transition-all rounded-full ${
 creditUsedPct > 90 ? 'bg-destructive' : creditUsedPct > 50 ? 'bg-warning' : 'bg-success'
              }`}
 style={{ width: `${Math.min(100, Math.max(0, creditUsedPct))}%` }}
            />
          </div>
        </KpiCard>
      </KpiGrid>

      {/* 5 ENTERPRISE DOMAIN TABS */}
      <div className="flex border-b border-border gap-2 overflow-x-auto">
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
                ? 'border-success-border text-success border-success-border text-success bg-success-surface/50 bg-success-surface rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted/40'
            }`}
          >
            <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
            {tab.count !== undefined && (
              <Badge variant="outline"className="text-xs tabular-nums py-0 px-1.5">
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
        <Card className="rounded-xl shadow-xs border-border overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted border-b border-border">
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
 size="sm"onClick={() => {
 setPriceToEdit(null)
 setIsRateModalOpen(true)
                }}
 className="bg-success hover:bg-success/90 text-xs text-success-foreground font-bold shrink-0 shadow-xs">
                <Plus className="h-3.5 w-3.5 mr-1"/>
                {tBilingual('Add Material Rate', 'নতুন চুক্তি দর')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted font-bold text-muted-foreground border-b border-border">
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
                <tbody className="divide-y divide-border dark:divide-border">
                  {materialPrices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                        <div className="font-bold text-muted-foreground">
                          {tBilingual('No Material Contract Rates Configured', 'কোন চুক্তি দর নির্ধারিত নেই')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
 Click &quot;Add Material Rate&quot; to record buying rates for roll media, inks, or sheets.
                        </p>
                      </td>
                    </tr>
                  ) : (
 materialPrices.map((price) => (
                      <tr key={price.id} className="hover:bg-muted dark:hover:bg-muted/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{price.material_name}</td>
                        <td className="py-3 px-4 capitalize text-muted-foreground">{price.category}</td>
                        <td className="py-3 px-4 uppercase tabular-nums font-semibold">{price.unit}</td>
                        <td className="py-3 px-4 font-black tabular-nums text-success text-sm">
                          {formatBDT(price.contract_price_bdt)} <span className="text-xs font-normal text-muted-foreground">/ {price.unit}</span>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-muted-foreground">
 MOQ: {price.moq || 1} • {price.lead_time_days || 2}d
                        </td>
                        <td className="py-3 px-4 text-muted-foreground tabular-nums">{price.effective_date}</td>
                        <td className="py-3 px-4 text-muted-foreground italic max-w-[200px] truncate">
                          {price.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
 size="sm"variant="outline"onClick={() => {
 setPriceToEdit(price)
 setIsRateModalOpen(true)
                              }}
 className="h-7 px-2 text-xs"title="Edit Rate">
                              <Edit2 className="h-3 w-3"/>
                            </Button>
                            <Button
 size="sm"variant="outline"onClick={() => handleDeleteRate(price.id, price.material_name)}
 className="h-7 px-2 text-xs text-destructive hover:text-destructive"title="Delete Rate">
                              <Trash2 className="h-3 w-3"/>
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
        <Card className="rounded-xl shadow-xs border-border overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                {tBilingual('Purchase Orders & Inward GRN Shipments', 'ক্রয়াদেশ ও চালান রিসিভিং')}
              </CardTitle>
              <Button
 size="sm"onClick={() => setIsNewPOOpen(true)}
 className="bg-primary hover:bg-primary/90 text-xs text-primary-foreground font-bold shrink-0 shadow-xs">
                <Plus className="h-3.5 w-3.5 mr-1"/>
                {tBilingual('Issue Purchase Order', 'নতুন ক্রয়াদেশ')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted font-bold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">{tBilingual('PO Number', 'পিও নম্বর')}</th>
                    <th className="py-3 px-4">{tBilingual('Order Date', 'অর্ডারের তারিখ')}</th>
                    <th className="py-3 px-4">{tBilingual('Items & Specifications', 'মালামালের বিবরণ')}</th>
                    <th className="py-3 px-4">{tBilingual('Total Cost', 'মোট বিল')}</th>
                    <th className="py-3 px-4">{tBilingual('Warehouse Status', 'গোডাউন স্ট্যাটাস')}</th>
                    <th className="py-3 px-4">{tBilingual('Payment Status', 'পেমেন্ট স্ট্যাটাস')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {relatedPOs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                        <div className="font-bold text-muted-foreground">
                          {tBilingual('No Purchase Orders Found', 'কোন ক্রয়াদেশ পাওয়া যায়নি')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
 Click &quot;Issue Purchase Order&quot; to procure raw materials or finished products from this vendor.
                        </p>
                      </td>
                    </tr>
                  ) : (
 relatedPOs.map((po) => (
                      <tr key={po.id} className="hover:bg-muted dark:hover:bg-muted/60 transition-colors">
                        <td className="py-3 px-4 tabular-nums font-bold text-success">
                          {po.po_number}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground tabular-nums">{po.po_date}</td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {po.items?.length || 0} line item(s) • {po.items?.[0]?.material_name || 'Standard supplies'}
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold text-foreground">
                          {formatBDT(po.grand_total || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline"className="bg-success-surface text-success border-success-border capitalize text-xs">
                            {po.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline"className="bg-info-surface text-primary border-primary/20 capitalize text-xs">
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
        <Card className="rounded-xl shadow-xs border-border overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                {tBilingual('Disbursed Payment Vouchers', 'পরিশোধিত পেমেন্ট ভাউচার')}
              </CardTitle>
              <Button
 size="sm"onClick={() => setIsPayModalOpen(true)}
 className="bg-success hover:bg-success/90 text-xs text-success-foreground font-bold shrink-0 shadow-xs">
                <Receipt className="h-3.5 w-3.5 mr-1"/>
                {tBilingual('Pay Voucher', 'নতুন ভাউচার')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted font-bold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">{tBilingual('Voucher No', 'ভাউচার নং')}</th>
                    <th className="py-3 px-4">{tBilingual('Payment Method', 'পেমেন্টের মাধ্যম')}</th>
                    <th className="py-3 px-4">{tBilingual('Amount Paid', 'পরিশোধের পরিমাণ')}</th>
                    <th className="py-3 px-4">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="py-3 px-4">{tBilingual('Bank / Cheque Ref', 'চেক বা ব্যাংক রেফারেন্স')}</th>
                    <th className="py-3 px-4">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  <tr className="hover:bg-muted dark:hover:bg-muted/60">
                    <td className="py-3 px-4 tabular-nums font-bold text-success">PV-2024-0012</td>
                    <td className="py-3 px-4 font-medium text-foreground">Bank Cheque</td>
                    <td className="py-3 px-4 tabular-nums font-bold text-success text-sm">৳ 100,000</td>
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">20/08/2024</td>
                    <td className="py-3 px-4 tabular-nums text-muted-foreground">City Bank Cheque #982104</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline"className="text-success bg-success-surface text-xs">
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
        <Card className="rounded-xl shadow-xs border-border overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">
                  {tBilingual('Supplier Statement', 'মহাজনের খতিয়ান ও হিসাব বিবরণী')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tBilingual('Chronological statement of purchases, debit disbursements, credit notes, and running balance.', 'ক্রয় ও পরিশোধের পূর্ণাঙ্গ লেজার।')}
                </CardDescription>
              </div>
              <Button size="sm"variant="outline"onClick={handlePrintStatement} className="text-xs">
                <Printer className="h-3.5 w-3.5 mr-1"/>
                {tBilingual('Print Statement', 'লেজার প্রিন্ট')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted font-bold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="py-3 px-4">{tBilingual('Transaction Type', 'লেনদেনের ধরন')}</th>
                    <th className="py-3 px-4">{tBilingual('Reference', 'রেফারেন্স')}</th>
                    <th className="py-3 px-4 text-right">{tBilingual('Billed Amount (Credit)', 'ক্রয় / বিল')}</th>
                    <th className="py-3 px-4 text-right">{tBilingual('Paid Amount (Debit)', 'পরিশোধ')}</th>
                    <th className="py-3 px-4 text-right">{tBilingual('Running Due (Balance)', 'অবশিষ্ট বাকি')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border tabular-nums">
                  <tr>
                    <td className="py-3 px-4 text-muted-foreground">28/08/2024</td>
                    <td className="py-3 px-4 font-sans font-semibold text-foreground">
 Goods Received (GRN-0089)
                    </td>
                    <td className="py-3 px-4 text-success font-bold">PO-000034</td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">৳ 23,750</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">—</td>
                    <td className="py-3 px-4 text-right font-bold text-warning text-warning">
                      {formatBDT(supplier.outstanding_balance || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-muted-foreground">20/08/2024</td>
                    <td className="py-3 px-4 font-sans font-semibold text-success">
 Payment Voucher Cleared
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">PV-2024-0012</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">—</td>
                    <td className="py-3 px-4 text-right font-bold text-success">৳ 100,000</td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">৳ 0</td>
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
          <Card className="p-5 rounded-xl shadow-xs border-border space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Building className="h-4 w-4 text-success"/>
              <h3 className="text-sm font-bold text-foreground">
                {tBilingual('Legal & Trade Registration', 'আইনগত ও ট্রেড তথ্য')}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Trade License:</span>
                <span className="tabular-nums font-bold text-foreground">
                  {supplier.trade_license || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">BIN / VAT Registration:</span>
                <span className="tabular-nums font-bold text-foreground">
                  {supplier.bin || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">TIN Number:</span>
                <span className="tabular-nums font-bold text-foreground">
                  {supplier.tin || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Market Hub Area:</span>
                <span className="font-bold text-foreground capitalize">
                  {supplier.market_hub || 'Nayabazar'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Full Street Address:</span>
                <span className="text-foreground text-right max-w-[240px]">
                  {supplier.address || '—'}
                </span>
              </div>
            </div>
          </Card>

          {/* Bank & Cheque Disbursement Details */}
          <Card className="p-5 rounded-xl shadow-xs border-border space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Landmark className="h-4 w-4 text-success"/>
              <h3 className="text-sm font-bold text-foreground">
                {tBilingual('Bank Account for Disbursements', 'ব্যাংক অ্যাকাউন্ট ও চেক প্রদান তথ্য')}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Bank Name:</span>
                <span className="font-bold text-foreground">
                  {supplier.bank_name || 'Dutch-Bangla Bank PLC'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Account Title:</span>
                <span className="font-semibold text-foreground">
                  {supplier.bank_account_name || supplier.supplier_name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="tabular-nums font-bold text-success">
                  {supplier.bank_account_number || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Branch Name:</span>
                <span className="text-foreground">
                  {supplier.bank_branch || 'Dhaka Main'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Routing Number:</span>
                <span className="tabular-nums text-foreground">
                  {supplier.bank_routing_number || '—'}
                </span>
              </div>
            </div>
          </Card>

          {/* Agreement Notes */}
          <Card className="p-5 rounded-xl shadow-xs border-border md:col-span-2 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Vendor Agreement Remarks & Special Notes', 'চুক্তি ও বাকির শর্তাবলীর বিশেষ নোট')}
            </h3>
            <p className="text-xs text-foreground leading-relaxed bg-muted p-3 rounded-lg border border-border">
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
 title={`Remove Contract Rate for"${rateToDelete?.name || 'Material'}"?`}
 titleBn={`"${rateToDelete?.name || 'ম্যাটেরিয়াল'}"এর চুক্তির দর মুছে ফেলবেন?`}
 message={`Are you sure you want to remove this negotiated rate from ${supplier.supplier_name}?`}
 messageBn={`আপনি কি এই সরবরাহকারীর জন্য নির্ধারিত কাঁচামালের রেটটি মুছে ফেলতে চান?`}
 confirmText="Remove Rate"confirmTextBn="রেট মুছুন"cancelText="Cancel"cancelTextBn="বাতিল"isDestructive={true}
 onConfirm={confirmDeleteRate}
      />
    </PageContainer>
  )
}

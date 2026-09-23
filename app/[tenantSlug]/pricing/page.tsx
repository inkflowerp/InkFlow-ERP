'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Tag,
  Plus,
  Layers,
  Copy,
  Sliders,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Percent,
  Calculator,
  Calendar,
  Sparkles,
  ShieldCheck,
  Package,
  Boxes,
  HelpCircle,
  Table as TableIcon,
  Grid as GridIcon,
  Check,
  X,
  ChevronRight,
  Briefcase,
  Users,
  Printer,
  Wrench,
  Download,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import {
  getPricingRulesAction,
  getPricingSummaryAction,
  getPricingMatrixAction,
  savePricingRuleAction,
  deactivatePricingRuleAction,
  duplicatePricingRuleAction,
  bulkPricingAction,
  copyPricingAction,
} from '@/actions/pricing.actions'
import {
  getProductsAction,
  updateProductPriceAction,
  updateProductAction,
} from '@/actions/product.actions'
import {
  getPrintingMethodsAction,
  savePrintingMethodAction,
  deletePrintingMethodAction,
  getFinishingOptionsAction,
  saveFinishingOptionAction,
  deleteFinishingOptionAction,
  getInstallationOptionsAction,
  saveInstallationOptionAction,
  deleteInstallationOptionAction,
} from '@/actions/configuration-masters.actions'
import type {
  PricingCustomerType,
  PricingRuleRecord,
  PricingRuleInput,
  PricingRuleType,
  PricingMethod,
  RoundingRule,
  MarginBasis,
  PricingSummaryStats,
  PricingMatrixRow,
  BulkPricingPayload,
  CopyPricingPayload,
} from '@/types/pricing.types'
import { CUSTOMER_TYPES_META } from '@/types/pricing.types'
import type {
  ProductRecord,
  FinishingOptionRecord,
  PrintingMethod as PrintingMethodType,
  InstallationOptionRecord,
} from '@/types/product.types'
import { calculatePricingRulePrice } from '@/lib/pricing/pricing-engine'
import { formatBDT } from '@/lib/formatters'
import { PricingMatrixTable } from '@/components/pricing/pricing-matrix-table'
import { PricingServicesTariffs } from '@/components/pricing/pricing-services-tariffs'
import { PricingProductsTariffs } from '@/components/pricing/pricing-products-tariffs'
import { PricingFinishingTariffs } from '@/components/pricing/pricing-finishing-tariffs'
import { PricingCalculatorSimulator } from '@/components/pricing/pricing-calculator-simulator'
import { ProductPriceEditModal } from '@/components/pricing/product-price-edit-modal'

type MainDomainTab = 'matrix' | 'services' | 'products' | 'tariffs' | 'calculator'

export default function PricingManagementPage() {
  const { company } = useTenant()
  const { can, isOwner } = usePermissions()
  const { locale, tBilingual } = useI18n()
  const searchParams = useSearchParams()
  const companyId = company?.id
  const slug = company?.slug || 'my-company'

  const tabParam = searchParams?.get('tab') as MainDomainTab | null
  const productIdParam = searchParams?.get('productId') || searchParams?.get('product_id')

  const canEdit = isOwner || can('edit', 'pricing') || can('create', 'pricing') || can('manage', 'pricing')

  // Domain Tab Navigation
  const [domainTab, setDomainTab] = useState<MainDomainTab>(() => {
    if (tabParam && ['matrix', 'services', 'products', 'tariffs', 'calculator'].includes(tabParam)) {
      return tabParam
    }
    return 'matrix'
  })

  // Sync tab with URL query changes
  useEffect(() => {
    if (tabParam && ['matrix', 'services', 'products', 'tariffs', 'calculator'].includes(tabParam)) {
      setDomainTab(tabParam)
    }
  }, [tabParam])

  // Matrix and Rules State
  const [rules, setRules] = useState<PricingRuleRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [finishingOptions, setFinishingOptions] = useState<FinishingOptionRecord[]>([])
  const [printingMethods, setPrintingMethods] = useState<PrintingMethodType[]>([])
  const [installationOptions, setInstallationOptions] = useState<InstallationOptionRecord[]>([])
  const [summaryStats, setSummaryStats] = useState<PricingSummaryStats | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modals state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRuleRecord | null>(null)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)

  // Product price edit modal state
  const [isProductPriceModalOpen, setIsProductPriceModalOpen] = useState(false)
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<ProductRecord | null>(null)

  // Rule Form state
  const [formProductId, setFormProductId] = useState<string>('')
  const [formCustomerType, setFormCustomerType] = useState<PricingCustomerType>('retail')
  const [formRuleType, setFormRuleType] = useState<PricingRuleType>('percentage_adjustment')
  const [formAdjustmentType, setFormAdjustmentType] = useState<'percentage' | 'fixed' | 'none'>('percentage')
  const [formAdjustmentValue, setFormAdjustmentValue] = useState<number>(-10)
  const [formFixedPrice, setFormFixedPrice] = useState<number>(0)
  const [formRoundingRule, setFormRoundingRule] = useState<RoundingRule>('none')
  const [formMinBillableQty, setFormMinBillableQty] = useState<number>(0)
  const [formMinCharge, setFormMinCharge] = useState<number>(0)
  const [formEffectiveFrom, setFormEffectiveFrom] = useState<string>('')
  const [formEffectiveUntil, setFormEffectiveUntil] = useState<string>('')
  const [formNotes, setFormNotes] = useState<string>('')
  const [formStatus, setFormStatus] = useState<'active' | 'draft' | 'inactive'>('active')

  // Bulk Form state
  const [bulkCustomerType, setBulkCustomerType] = useState<PricingCustomerType>('reseller')
  const [bulkProductIds, setBulkProductIds] = useState<string[]>([])
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<'percentage' | 'fixed' | 'fixed_price'>('percentage')
  const [bulkAdjustmentValue, setBulkAdjustmentValue] = useState<number>(-15)
  const [bulkRounding, setBulkRounding] = useState<RoundingRule>('none')
  const [bulkOverrideExisting, setBulkOverrideExisting] = useState(true)

  // Copy Form state
  const [copySourceType, setCopySourceType] = useState<PricingCustomerType>('retail')
  const [copyTargetType, setCopyTargetType] = useState<PricingCustomerType>('regular')
  const [copyModifierPercent, setCopyModifierPercent] = useState<number>(-5)
  const [copyOverrideExisting, setCopyOverrideExisting] = useState(true)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // Load Data
  const loadData = useCallback(async () => {
    if (!companyId) return
    setIsLoading(true)

    try {
      const [rulesRes, summaryRes, prodRes, finRes, printRes, instRes] = await Promise.all([
        getPricingRulesAction({}, companyId),
        getPricingSummaryAction(companyId),
        getProductsAction(companyId, true),
        getFinishingOptionsAction(),
        getPrintingMethodsAction(),
        getInstallationOptionsAction(),
      ])

      if (rulesRes.success && rulesRes.data) {
        setRules(rulesRes.data)
      }
      if (summaryRes.success && summaryRes.data) {
        setSummaryStats(summaryRes.data)
      }
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data)
      }
      if (finRes) {
        setFinishingOptions(finRes)
      }
      if (printRes) {
        setPrintingMethods(printRes)
      }
      if (instRes) {
        setInstallationOptions(instRes)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load pricing information.', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, showToast])

  useEffect(() => {
    loadData()

    const handleRealtimeSync = () => {
      loadData()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:pricing_rules', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:products', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_table_synced:pricing_rules', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:products', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [loadData])

  // Selected product in Add/Edit Rule modal
  const selectedProductForRule = useMemo(() => {
    return products.find((p) => p.id === formProductId) || null
  }, [products, formProductId])

  // Live preview calculation in Rule modal
  const livePreview = useMemo(() => {
    const basePrice = selectedProductForRule ? Number(selectedProductForRule.selling_price) || 0 : 0
    const baseCost = selectedProductForRule ? Number(selectedProductForRule.base_cost) || 0 : 0

    return calculatePricingRulePrice({
      ruleType: formRuleType,
      basePrice,
      baseCost,
      adjustmentType: formAdjustmentType,
      adjustmentValue: formAdjustmentValue,
      fixedPrice: formFixedPrice,
      roundingRule: formRoundingRule,
    })
  }, [selectedProductForRule, formRuleType, formAdjustmentType, formAdjustmentValue, formFixedPrice, formRoundingRule])

  // Handle Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formProductId) {
      showToast('Please select a product or service.', 'error')
      return
    }

    setIsPending(true)
    try {
      const payload: PricingRuleInput & { id?: string } = {
        id: editingRule ? editingRule.id : undefined,
        product_id: formProductId,
        category: selectedProductForRule?.category || 'general',
        customer_type: formCustomerType,
        pricing_rule_type: formRuleType,
        pricing_method: (selectedProductForRule?.pricing_method || 'per_area') as PricingMethod,
        base_price: Number(selectedProductForRule?.selling_price) || 0,
        adjustment_type: formAdjustmentType,
        adjustment_value: formAdjustmentValue,
        fixed_price: formRuleType === 'fixed_price' ? formFixedPrice : null,
        calculated_price: livePreview.calculatedPrice,
        rounding_rule: formRoundingRule,
        minimum_billable_quantity: formMinBillableQty,
        minimum_charge: formMinCharge,
        effective_from: formEffectiveFrom ? new Date(formEffectiveFrom).toISOString() : null,
        effective_until: formEffectiveUntil ? new Date(formEffectiveUntil).toISOString() : null,
        status: formStatus,
        notes: formNotes,
      }

      const res = await savePricingRuleAction(payload, companyId)
      if (res.success) {
        showToast(editingRule ? 'Pricing rule updated successfully.' : 'Pricing rule created successfully.')
        setIsRuleModalOpen(false)
        loadData()
      } else {
        showToast(res.error || 'Failed to save pricing rule.', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'An error occurred.', 'error')
    } finally {
      setIsPending(false)
    }
  }

  // Handle Save Product Price Directly (2-way sync)
  const handleSaveProductPriceDirect = async (
    productId: string,
    data: {
      base_price?: number
      selling_price: number
      cost_price?: number
      base_cost?: number
      min_price?: number
      min_billable_qty?: number
      min_billable_quantity?: number
      min_charge?: number
      minimum_charge?: number
      price_tiers?: Record<string, number>
    }
  ) => {
    try {
      const res = await updateProductAction(productId, data as any, companyId)
      if (res.success) {
        showToast('Product commercial price & customer tiers updated successfully.')
        loadData()
      } else {
        showToast(res.error || 'Failed to update product price.', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating product price.', 'error')
    }
  }

  // Handle Bulk Pricing Submit
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bulkProductIds.length === 0) {
      showToast('Please select at least one product.', 'error')
      return
    }

    setIsPending(true)
    try {
      const payload: BulkPricingPayload = {
        customer_type: bulkCustomerType,
        product_ids: bulkProductIds,
        adjustment_type: bulkAdjustmentType,
        adjustment_value: bulkAdjustmentValue,
        rounding_rule: bulkRounding,
        override_existing: bulkOverrideExisting,
      }

      const res = await bulkPricingAction(payload, companyId)
      if (res.success && res.data) {
        showToast(`Bulk pricing applied: ${res.data.createdCount} created, ${res.data.updatedCount} updated.`)
        setIsBulkModalOpen(false)
        loadData()
      } else {
        showToast(res.error || 'Failed to apply bulk pricing.', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error applying bulk pricing.', 'error')
    } finally {
      setIsPending(false)
    }
  }

  // Handle Copy Pricing Submit
  const handleCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (copySourceType === copyTargetType) {
      showToast('Source and target customer types must be different.', 'error')
      return
    }

    setIsPending(true)
    try {
      const payload: CopyPricingPayload = {
        source_customer_type: copySourceType,
        target_customer_type: copyTargetType,
        adjustment_percent: copyModifierPercent,
        override_existing: copyOverrideExisting,
      }

      const res = await copyPricingAction(payload, companyId)
      if (res.success && res.data) {
        showToast(`Copied ${res.data.copiedCount} rules to ${copyTargetType} (${res.data.overwrittenCount} overwritten).`)
        setIsCopyModalOpen(false)
        loadData()
      } else {
        showToast(res.error || 'Failed to copy pricing.', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error copying pricing.', 'error')
    } finally {
      setIsPending(false)
    }
  }

  // Export Commercial Rate Sheet
  const handleExportRateSheet = () => {
    const headers = [
      'Product / Service Name',
      'Bangla Name',
      'SKU',
      'Category',
      'Unit',
      'Base Cost BDT',
      'Retail Price BDT',
      'Reseller Price BDT',
      'Corporate Price BDT',
      'Agency Price BDT',
      'Government Price BDT',
    ]

    const rows = products.map((p) => {
      const baseSell = Number(p.selling_price) || Number((p as any).base_price) || 0
      const baseCost = Number(p.base_cost) || Number((p as any).cost_price) || 0
      const tiers = (p.price_tiers as any) || {}

      return [
        `"${p.name}"`,
        `"${p.name_bn || ''}"`,
        `"${p.sku || ''}"`,
        p.category || 'General',
        p.unit || 'sft',
        baseCost,
        tiers.retail ?? baseSell,
        tiers.reseller ?? (baseSell > 0 ? Math.round(baseSell * 0.85) : 0),
        tiers.corporate ?? (baseSell > 0 ? Math.round(baseSell * 0.9) : 0),
        tiers.agency ?? (baseSell > 0 ? Math.round(baseSell * 0.88) : 0),
        tiers.government ?? (baseSell > 0 ? Math.round(baseSell * 0.95) : 0),
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `PrintERP_Commercial_RateSheet_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Commercial Rate Sheet exported to CSV with UTF-8 BOM.')
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        titleEn="Pricing & Tariffs Control Center"
        titleBn="মূল্য নির্ধারণ ও ট্যারিফ মাস্টার"
        descriptionEn="Manage customer-specific selling prices, margins, dimensional tariffs, finishing add-ons, and quotation multipliers."
        descriptionBn="খুচরা, পাইকারি, কর্পোরেট ও এজেন্ট দর, স্কয়ার ফিট ট্যারিফ এবং ফিনিশিং চার্জ নির্ধারণের পূর্ণাঙ্গ কন্ট্রোল সেন্টার।"
        icon={Tag}
        iconColor="text-teal-600"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportRateSheet}
              className="text-xs h-9 font-semibold"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Export Rate Sheet', 'দর তালিকা ডাউনলোড')}
            </Button>

            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCopyModalOpen(true)}
                  className="text-xs h-9 font-semibold text-slate-700 dark:text-slate-300"
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {tBilingual('Copy Tiers', 'টায়ার কপি')}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="text-xs h-9 font-semibold text-slate-700 dark:text-slate-300"
                >
                  <Sliders className="mr-1.5 h-3.5 w-3.5" />
                  {tBilingual('Bulk Adjust', 'একযোগে সমন্বয়')}
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRule(null)
                    setFormProductId(products[0]?.id || '')
                    setFormCustomerType('retail')
                    setFormRuleType('percentage_adjustment')
                    setFormAdjustmentType('percentage')
                    setFormAdjustmentValue(-10)
                    setFormFixedPrice(0)
                    setFormRoundingRule('none')
                    setIsRuleModalOpen(true)
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-xs text-white font-bold h-9 shadow-xs"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {tBilingual('New Pricing Rule', 'নতুন মূল্য নিয়ম')}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* KPI METRIC HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Total Catalog Items', 'মোট পণ্য ও সেবা')}
            </span>
            <Package className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {products.length}
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
            Products & Print Services
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Active Tier Rules', 'সক্রিয় মূল্য নিয়ম')}
            </span>
            <Tag className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1 font-mono">
            {rules.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Customer-type rules</div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Finishing Tariffs', 'ফিনিশিং ট্যারিফ')}
            </span>
            <Wrench className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1 font-mono">
            {finishingOptions.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lamination, Eyelets, etc.</div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Printing Methods', 'প্রিন্টিং মেথড')}
            </span>
            <Printer className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 font-mono">
            {printingMethods.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Solvent, Eco, UV modes</div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-xl shadow-xs border-slate-200 dark:border-slate-800 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {tBilingual('Avg Retail Margin', 'গড় খুচরা মুনাফা')}
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {(() => {
              const withMargin = products.filter((p) => Number(p.selling_price) > 0 && Number(p.base_cost) > 0)
              if (withMargin.length === 0) return '42%'
              const avg = Math.round(
                withMargin.reduce(
                  (sum, p) => sum + ((Number(p.selling_price) - Number(p.base_cost)) / Number(p.selling_price)) * 100,
                  0
                ) / withMargin.length
              )
              return `${avg}%`
            })()}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Healthy gross margin</div>
        </Card>
      </div>

      {/* 5 DOMAIN TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        {[
          { id: 'matrix', labelEn: '🎯 Customer Pricing Matrix', labelBn: '🎯 কাস্টমার দর তালিকা' },
          { id: 'services', labelEn: '🧵 Custom Print Services', labelBn: '🧵 প্রিন্ট সেবা ট্যারিফ' },
          { id: 'products', labelEn: '📦 Ready Products & Hardware', labelBn: '📦 রেডি পণ্য ও হার্ডওয়্যার' },
          { id: 'tariffs', labelEn: '✨ Finishing, Machine & Installation', labelBn: '✨ ফিনিশিং, মেশিন ও ইনস্টলেশন' },
          { id: 'calculator', labelEn: '🧮 Live Job Pricing Simulator', labelBn: '🧮 লাইভ জব প্রাইসিং ক্যালকুলেটর' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDomainTab(tab.id as MainDomainTab)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer bangla-text ${
              domainTab === tab.id
                ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'
            }`}
          >
            <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
          </button>
        ))}
      </div>

      {/* DOMAIN CONTENT PANELS */}
      {domainTab === 'matrix' && (
        <PricingMatrixTable
          products={products}
          onOpenEditProductPrice={(p) => {
            setSelectedProductToEdit(p)
            setIsProductPriceModalOpen(true)
          }}
          tenantSlug={slug}
        />
      )}

      {domainTab === 'services' && (
        <PricingServicesTariffs
          products={products}
          onOpenEditProductPrice={(p) => {
            setSelectedProductToEdit(p)
            setIsProductPriceModalOpen(true)
          }}
          tenantSlug={slug}
        />
      )}

      {domainTab === 'products' && (
        <PricingProductsTariffs
          products={products}
          onOpenEditProductPrice={(p) => {
            setSelectedProductToEdit(p)
            setIsProductPriceModalOpen(true)
          }}
          tenantSlug={slug}
        />
      )}

      {domainTab === 'tariffs' && (
        <PricingFinishingTariffs
          finishingOptions={finishingOptions}
          printingMethods={printingMethods}
          installationOptions={installationOptions}
          onSaveFinishing={async (data) => {
            await saveFinishingOptionAction(data)
            showToast('Finishing option saved.')
            loadData()
          }}
          onDeleteFinishing={async (id) => {
            await deleteFinishingOptionAction(id)
            showToast('Finishing option deleted.')
            loadData()
          }}
          onSavePrintingMethod={async (data) => {
            await savePrintingMethodAction(data)
            showToast('Printing method saved.')
            loadData()
          }}
          onDeletePrintingMethod={async (id) => {
            await deletePrintingMethodAction(id)
            showToast('Printing method deleted.')
            loadData()
          }}
          onSaveInstallation={async (data) => {
            await saveInstallationOptionAction(data)
            showToast('Installation option saved.')
            loadData()
          }}
          onDeleteInstallation={async (id) => {
            await deleteInstallationOptionAction(id)
            showToast('Installation option deleted.')
            loadData()
          }}
        />
      )}

      {domainTab === 'calculator' && (
        <PricingCalculatorSimulator
          products={products}
          finishingOptions={finishingOptions}
          printingMethods={printingMethods}
          tenantSlug={slug}
          initialProductId={productIdParam || undefined}
        />
      )}

      {/* MODAL 1: PRODUCT PRICE & CUSTOMER TIER EDIT MODAL (2-Way Live Sync) */}
      <ProductPriceEditModal
        open={isProductPriceModalOpen}
        onOpenChange={setIsProductPriceModalOpen}
        product={selectedProductToEdit}
        onSavePrice={handleSaveProductPriceDirect}
      />

      {/* MODAL 2: PRICING RULE MODAL */}
      <ModalDialog
        open={isRuleModalOpen}
        onOpenChange={setIsRuleModalOpen}
        title={
          editingRule
            ? tBilingual('Edit Customer Pricing Rule', 'মূল্য নির্ধারণ নিয়ম সম্পাদনা')
            : tBilingual('Create Customer Pricing Rule', 'নতুন গ্রাহক মূল্য নির্ধারণ নিয়ম')
        }
      >
        <form onSubmit={handleSaveRule} className="space-y-4 pt-1">
          <div>
            <Label className="text-xs font-semibold mb-1 block">
              {tBilingual('Select Product / Service', 'পণ্য / সেবা নির্বাচন করুন')} <span className="text-rose-500">*</span>
            </Label>
            <select
              value={formProductId}
              onChange={(e) => setFormProductId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit?.toUpperCase()} • ৳ {p.selling_price || (p as any).base_price || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Customer Category Tier', 'গ্রাহকের ধরন')}
              </Label>
              <select
                value={formCustomerType}
                onChange={(e) => setFormCustomerType(e.target.value as PricingCustomerType)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                {Object.entries(CUSTOMER_TYPES_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label} ({meta.labelBn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Pricing Rule Type', 'মূল্য নিয়মের ধরন')}
              </Label>
              <select
                value={formRuleType}
                onChange={(e) => setFormRuleType(e.target.value as PricingRuleType)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                <option value="percentage_adjustment">Percentage Discount / Surcharge (%)</option>
                <option value="fixed_adjustment">Fixed Amount Discount / Surcharge (৳)</option>
                <option value="fixed_price">Direct Fixed Override Price (৳)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formRuleType !== 'fixed_price' ? (
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Adjustment Value (e.g. -15 for 15% discount)', 'সমন্বয় মান')}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formAdjustmentValue}
                  onChange={(e) => setFormAdjustmentValue(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                />
              </div>
            ) : (
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Fixed Override Price', 'সরাসরি নির্ধারিত মূল্য')}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formFixedPrice}
                  onChange={(e) => setFormFixedPrice(Number(e.target.value))}
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Rounding Rule', 'রাউন্ডিং নিয়ম')}
              </Label>
              <select
                value={formRoundingRule}
                onChange={(e) => setFormRoundingRule(e.target.value as RoundingRule)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                <option value="none">No Rounding (Exact)</option>
                <option value="round_1">Round to nearest Integer (৳ 1)</option>
                <option value="round_5">Round to nearest ৳ 5</option>
                <option value="round_10">Round to nearest ৳ 10</option>
              </select>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">Effective Calculated Price:</span>
            <span className="text-base font-black text-teal-700 dark:text-teal-300 font-mono">
              {formatBDT(livePreview.calculatedPrice)}
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsRuleModalOpen(false)} className="text-xs h-9">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 px-5">
              {isPending ? 'Saving...' : tBilingual('Save Rule', 'নিয়ম সংরক্ষণ')}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 3: BULK PRICING MODAL */}
      <ModalDialog
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        title={tBilingual('Bulk Category / Product Pricing Adjustment', 'একযোগে মূল্য সমন্বয়')}
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4 pt-1">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Target Customer Tier</Label>
            <select
              value={bulkCustomerType}
              onChange={(e) => setBulkCustomerType(e.target.value as PricingCustomerType)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
            >
              {Object.entries(CUSTOMER_TYPES_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label} ({meta.labelBn})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Adjustment Type</Label>
              <select
                value={bulkAdjustmentType}
                onChange={(e) => setBulkAdjustmentType(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                <option value="percentage">Percentage Discount / Surcharge (%)</option>
                <option value="fixed">Fixed Amount Discount / Surcharge (৳)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Adjustment Value</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. -15 for 15% off"
                value={bulkAdjustmentValue}
                onChange={(e) => setBulkAdjustmentValue(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-semibold">Select Products to Apply ({bulkProductIds.length} selected)</Label>
              <button
                type="button"
                onClick={() => {
                  if (bulkProductIds.length === products.length) {
                    setBulkProductIds([])
                  } else {
                    setBulkProductIds(products.map((p) => p.id))
                  }
                }}
                className="text-[10px] text-teal-600 font-bold hover:underline"
              >
                {bulkProductIds.length === products.length ? 'Deselect All' : 'Select All Products'}
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1">
              {products.map((p) => {
                const isSelected = bulkProductIds.includes(p.id)
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 p-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkProductIds([...bulkProductIds, p.id])
                        } else {
                          setBulkProductIds(bulkProductIds.filter((id) => id !== p.id))
                        }
                      }}
                      className="h-3.5 w-3.5 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 px-5">
              {isPending ? 'Applying...' : 'Apply Bulk Adjustment'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 4: COPY PRICING MODAL */}
      <ModalDialog
        open={isCopyModalOpen}
        onOpenChange={setIsCopyModalOpen}
        title={tBilingual('Clone / Copy Pricing Tiers', 'মূল্য টায়ার কপি করুন')}
      >
        <form onSubmit={handleCopySubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Source Customer Tier</Label>
              <select
                value={copySourceType}
                onChange={(e) => setCopySourceType(e.target.value as PricingCustomerType)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                {Object.entries(CUSTOMER_TYPES_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label} ({meta.labelBn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Target Customer Tier</Label>
              <select
                value={copyTargetType}
                onChange={(e) => setCopyTargetType(e.target.value as PricingCustomerType)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                {Object.entries(CUSTOMER_TYPES_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label} ({meta.labelBn})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Adjustment Modifier (% on copied price)
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. -5 for 5% additional discount"
              value={copyModifierPercent}
              onChange={(e) => setCopyModifierPercent(Number(e.target.value))}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCopyModalOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 px-5">
              {isPending ? 'Copying...' : 'Clone Pricing Rules'}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

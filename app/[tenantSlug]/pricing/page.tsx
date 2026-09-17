'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
import { getProductsAction } from '@/actions/product.actions'
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
  PricingTierRange,
} from '@/types/pricing.types'
import { CUSTOMER_TYPES_META } from '@/types/pricing.types'
import type { ProductRecord } from '@/types/product.types'
import { calculatePricingRulePrice } from '@/lib/pricing/pricing-engine'
import { formatBDT } from '@/lib/formatters'

const CUSTOMER_TYPE_TABS: Array<{ id: PricingCustomerType | 'all'; label: string; labelBn: string }> = [
  { id: 'all', label: 'All Customer Types', labelBn: 'সকল কাস্টমার ধরন' },
  { id: 'retail', label: 'Retail (খুচরা)', labelBn: 'খুচরা' },
  { id: 'reseller', label: 'Reseller (রিসেলার)', labelBn: 'রিসেলার' },
  { id: 'corporate', label: 'Corporate (কর্পোরেট)', labelBn: 'কর্পোরেট' },
  { id: 'agency', label: 'Agency (এজেন্সি)', labelBn: 'এজেন্সি' },
  { id: 'government', label: 'Government (সরকারি)', labelBn: 'সরকারি' },
  { id: 'regular', label: 'Regular (নিয়মিত)', labelBn: 'নিয়মিত' },
]

export default function PricingManagementPage() {
  const { company } = useTenant()
  const { can, isOwner } = usePermissions()
  const { locale, tBilingual } = useI18n()
  const companyId = company?.id

  const canEdit = isOwner || can('edit', 'pricing') || can('create', 'pricing') || can('manage', 'pricing')

  // State
  const [activeTab, setActiveTab] = useState<PricingCustomerType | 'all'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'matrix'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [rules, setRules] = useState<PricingRuleRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [summaryStats, setSummaryStats] = useState<PricingSummaryStats | null>(null)
  const [matrixData, setMatrixData] = useState<PricingMatrixRow[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modals state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRuleRecord | null>(null)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)

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
    setErrorMessage(null)

    try {
      const [rulesRes, summaryRes, matrixRes, prodRes] = await Promise.all([
        getPricingRulesAction({ customerType: activeTab === 'all' ? undefined : activeTab }, companyId),
        getPricingSummaryAction(companyId),
        getPricingMatrixAction({}, companyId),
        getProductsAction(companyId, true),
      ])

      if (rulesRes.success && rulesRes.data) {
        setRules(rulesRes.data)
      }
      if (summaryRes.success && summaryRes.data) {
        setSummaryStats(summaryRes.data)
      }
      if (matrixRes.success && matrixRes.data) {
        setMatrixData(matrixRes.data)
      }
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load pricing information.')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [products])

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (activeTab !== 'all' && r.customer_type !== activeTab) return false
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = r.product_name?.toLowerCase().includes(q)
        const matchSku = r.product_sku?.toLowerCase().includes(q)
        const matchCat = r.category?.toLowerCase().includes(q)
        const matchType = r.customer_type.toLowerCase().includes(q)
        if (!matchName && !matchSku && !matchCat && !matchType) return false
      }
      return true
    })
  }, [rules, activeTab, categoryFilter, statusFilter, searchQuery])

  // Selected product in Add/Edit modal
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === formProductId) || null
  }, [products, formProductId])

  // Live preview calculation in Add/Edit modal
  const livePreview = useMemo(() => {
    const basePrice = selectedProduct ? Number(selectedProduct.selling_price) || 0 : 0
    const baseCost = selectedProduct ? Number(selectedProduct.base_cost) || 0 : 0

    return calculatePricingRulePrice({
      ruleType: formRuleType,
      basePrice,
      baseCost,
      adjustmentType: formAdjustmentType,
      adjustmentValue: formAdjustmentValue,
      fixedPrice: formFixedPrice,
      roundingRule: formRoundingRule,
    })
  }, [selectedProduct, formRuleType, formAdjustmentType, formAdjustmentValue, formFixedPrice, formRoundingRule])

  // Reset Add/Edit Form
  const handleOpenAddModal = (initialProductId?: string, initialCustomerType?: PricingCustomerType) => {
    setEditingRule(null)
    setFormProductId(initialProductId || products[0]?.id || '')
    setFormCustomerType(initialCustomerType || (activeTab !== 'all' ? activeTab : 'retail'))
    setFormRuleType('percentage_adjustment')
    setFormAdjustmentType('percentage')
    setFormAdjustmentValue(-10)
    setFormFixedPrice(0)
    setFormRoundingRule('none')
    setFormMinBillableQty(0)
    setFormMinCharge(0)
    setFormEffectiveFrom('')
    setFormEffectiveUntil('')
    setFormNotes('')
    setFormStatus('active')
    setIsRuleModalOpen(true)
  }

  const handleOpenEditModal = (rule: PricingRuleRecord) => {
    setEditingRule(rule)
    setFormProductId(rule.product_id || '')
    setFormCustomerType(rule.customer_type)
    setFormRuleType(rule.pricing_rule_type)
    setFormAdjustmentType(rule.adjustment_type || 'none')
    setFormAdjustmentValue(rule.adjustment_value || 0)
    setFormFixedPrice(rule.fixed_price || 0)
    setFormRoundingRule(rule.rounding_rule || 'none')
    setFormMinBillableQty(Number(rule.minimum_billable_quantity) || 0)
    setFormMinCharge(Number(rule.minimum_charge) || 0)
    setFormEffectiveFrom(rule.effective_from ? rule.effective_from.split('T')[0] : '')
    setFormEffectiveUntil(rule.effective_until ? rule.effective_until.split('T')[0] : '')
    setFormNotes(rule.notes || '')
    setFormStatus((rule.status as any) || 'active')
    setIsRuleModalOpen(true)
  }

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
        category: selectedProduct?.category || 'general',
        customer_type: formCustomerType,
        pricing_rule_type: formRuleType,
        pricing_method: (selectedProduct?.pricing_method || 'per_area') as PricingMethod,
        base_price: Number(selectedProduct?.selling_price) || 0,
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

  // Handle Deactivate Rule
  const handleDeactivateRule = async (rule: PricingRuleRecord) => {
    if (!confirm(`Are you sure you want to deactivate this pricing rule for ${rule.product_name} (${rule.customer_type})?`)) {
      return
    }

    setIsPending(true)
    try {
      const res = await deactivatePricingRuleAction(rule.id, companyId)
      if (res.success) {
        showToast('Pricing rule deactivated successfully.')
        loadData()
      } else {
        showToast(res.error || 'Failed to deactivate rule.', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred.', 'error')
    } finally {
      setIsPending(false)
    }
  }

  // Handle Duplicate Rule
  const handleDuplicateRule = async (rule: PricingRuleRecord, targetType: PricingCustomerType) => {
    setIsPending(true)
    try {
      const res = await duplicatePricingRuleAction(rule.id, targetType, companyId)
      if (res.success) {
        showToast(`Rule duplicated to ${targetType} successfully.`)
        loadData()
      } else {
        showToast(res.error || 'Failed to duplicate rule.', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error duplicating rule.', 'error')
    } finally {
      setIsPending(false)
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

  return (
    <div className="space-y-6 pb-12">
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
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        titleEn="Pricing & Tariffs"
        titleBn="মূল্য নির্ধারণ ও ট্যারিফ"
        descriptionEn="Manage customer-specific selling prices, margins, quantity tiers, and commercial tariffs."
        descriptionBn="গ্রাহকের ধরন অনুযায়ী বিক্রয় মূল্য, মার্জিন, কোয়ান্টিটি টিয়ার এবং বাণিজ্যিক রেট নির্ধারণ করুন।"
        icon={Tag}
        badge={
          <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            Customer-Type Engine
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCopySourceType('retail')
                setCopyTargetType('regular')
                setCopyModifierPercent(-5)
                setIsCopyModalOpen(true)
              }}
              disabled={!canEdit}
              className="text-xs h-9 rounded-xl font-semibold border-slate-300 dark:border-slate-700"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Copy Pricing
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkCustomerType('reseller')
                setBulkProductIds(products.map((p) => p.id))
                setBulkAdjustmentValue(-15)
                setIsBulkModalOpen(true)
              }}
              disabled={!canEdit}
              className="text-xs h-9 rounded-xl font-semibold border-slate-300 dark:border-slate-700"
            >
              <Sliders className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Bulk Pricing
            </Button>

            <Button
              size="sm"
              onClick={() => handleOpenAddModal()}
              disabled={!canEdit}
              className="text-xs h-9 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Pricing Rule
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Pricing Rules</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {summaryStats?.totalRulesCount ?? rules.length}
          </div>
          <span className="text-[10px] text-slate-400">Across all customer categories</span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Custom Priced Products</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {summaryStats?.productsWithCustomPricingCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Physical & ready items</span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Custom Priced Services</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {summaryStats?.servicesWithCustomPricingCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Printing, fabrication & install</span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Configured Types</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {summaryStats?.configuredCustomerTypesCount ?? 0} <span className="text-xs font-normal text-slate-400">/ 6</span>
          </div>
          <span className="text-[10px] text-slate-400">Retail, Reseller, Corporate...</span>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Using Default Price</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-700 dark:text-slate-300 font-mono">
            {summaryStats?.productsUsingDefaultCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Fallback to standard catalog rate</span>
        </Card>
      </div>

      {/* Customer Type Tabs Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CUSTOMER_TYPE_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const count = tab.id === 'all'
              ? rules.length
              : rules.filter((r) => r.customer_type === tab.id).length

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search product, SKU, or rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Rules Table</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <GridIcon className="h-3.5 w-3.5" />
            <span>Pricing Matrix</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {isLoading ? (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
          <RefreshCw className="h-8 w-8 mx-auto text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading pricing rules...</p>
        </Card>
      ) : errorMessage ? (
        <Card className="rounded-2xl border-rose-200 dark:border-rose-900 p-8 text-center bg-rose-50/50 dark:bg-rose-950/20">
          <AlertTriangle className="h-8 w-8 mx-auto text-rose-600 mb-2" />
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">Unable to load pricing rules</h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errorMessage}</p>
          <Button size="sm" onClick={loadData} className="mt-4 text-xs bg-rose-600 hover:bg-rose-700 text-white">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </Card>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        filteredRules.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
            <Tag className="h-10 w-10 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No pricing rules configured yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Configure specialized rates, quantity tiers, and margins for{' '}
              {activeTab === 'all' ? 'different customer types' : `${activeTab} customers`}.
            </p>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => handleOpenAddModal(undefined, activeTab !== 'all' ? activeTab : 'retail')}
                className="mt-4 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl shadow-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Pricing Rule
              </Button>
            )}
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Product / Service</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Customer Type</th>
                    <th className="py-3 px-3 text-right">Base Price</th>
                    <th className="py-3 px-3">Strategy / Adjustment</th>
                    <th className="py-3 px-3 text-right">Final Price</th>
                    <th className="py-3 px-3 text-center">Min Order / Charge</th>
                    <th className="py-3 px-3">Effective</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredRules.map((rule) => {
                    const meta = CUSTOMER_TYPES_META[rule.customer_type] || {
                      label: rule.customer_type,
                      badgeClass: 'bg-slate-100 text-slate-700',
                    }

                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Product */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {rule.product_name || 'General Category Rule'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {rule.product_sku ? `SKU: ${rule.product_sku}` : 'All products in category'}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 px-1.5 bg-slate-50 dark:bg-slate-800">
                            {rule.category || 'General'}
                          </Badge>
                        </td>

                        {/* Customer Type */}
                        <td className="py-3 px-3">
                          <Badge className={`text-[10px] font-bold border py-0.5 px-2 ${meta.badgeClass}`}>
                            {meta.label}
                          </Badge>
                        </td>

                        {/* Base Price */}
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          ৳{rule.base_price}
                        </td>

                        {/* Strategy */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {rule.pricing_rule_type === 'percentage_adjustment' && (
                              <Badge variant="outline" className={`text-[10px] font-bold font-mono py-0 px-1.5 ${
                                (rule.adjustment_value || 0) < 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {(rule.adjustment_value || 0) > 0 ? '+' : ''}
                                {rule.adjustment_value}%
                              </Badge>
                            )}
                            {rule.pricing_rule_type === 'fixed_adjustment' && (
                              <Badge variant="outline" className="text-[10px] font-bold font-mono py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                                {(rule.adjustment_value || 0) > 0 ? '+' : ''}৳{rule.adjustment_value}
                              </Badge>
                            )}
                            {rule.pricing_rule_type === 'fixed_price' && (
                              <Badge variant="outline" className="text-[10px] font-bold py-0 px-1.5 bg-purple-50 text-purple-700 border-purple-200">
                                Fixed Rate
                              </Badge>
                            )}
                            {rule.pricing_rule_type === 'tiered' && (
                              <Badge variant="outline" className="text-[10px] font-bold py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                                {rule.tier_ranges?.length || 0} Tiers
                              </Badge>
                            )}
                            {rule.pricing_rule_type === 'formula' && (
                              <Badge variant="outline" className="text-[10px] font-bold py-0 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                                Margin Formula
                              </Badge>
                            )}
                            <span className="text-[11px] text-slate-500 capitalize">
                              {rule.pricing_method.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Final Price */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                          <span className="text-blue-600 dark:text-blue-400">৳{rule.calculated_price}</span>
                        </td>

                        {/* Min Order / Charge */}
                        <td className="py-3 px-3 text-center text-[11px] text-slate-500 font-mono">
                          {rule.minimum_billable_quantity ? `${rule.minimum_billable_quantity} Qty` : '—'}
                          {rule.minimum_charge ? ` / ৳${rule.minimum_charge} min` : ''}
                        </td>

                        {/* Effective */}
                        <td className="py-3 px-3 text-[10px] text-slate-500">
                          {rule.effective_from ? rule.effective_from.split('T')[0] : 'Always'}
                          {rule.effective_until ? ` → ${rule.effective_until.split('T')[0]}` : ''}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase font-bold py-0.5 px-1.5 ${
                              rule.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : rule.status === 'scheduled'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : rule.status === 'expired'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {rule.status}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditModal(rule)}
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                                  title="Edit Pricing Rule"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeactivateRule(rule)}
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                                  title="Deactivate Rule"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        /* MATRIX VIEW */
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Customer-Type Multi-Tariff Comparison Matrix
              </span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                Side-by-Side
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Showing {matrixData.length} products & services
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 min-w-[180px]">
                    Product / Service
                  </th>
                  <th className="py-3 px-3 text-right min-w-[90px]">Default Rate</th>
                  <th className="py-3 px-3 text-center min-w-[110px] text-emerald-700 dark:text-emerald-400">Retail</th>
                  <th className="py-3 px-3 text-center min-w-[110px] text-blue-700 dark:text-blue-400">Reseller</th>
                  <th className="py-3 px-3 text-center min-w-[110px] text-purple-700 dark:text-purple-400">Corporate</th>
                  <th className="py-3 px-3 text-center min-w-[110px] text-amber-700 dark:text-amber-400">Agency</th>
                  <th className="py-3 px-3 text-center min-w-[110px] text-rose-700 dark:text-rose-400">Government</th>
                  <th className="py-3 px-3 text-center min-w-[110px] text-indigo-700 dark:text-indigo-400">Regular</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium font-mono">
                {matrixData.map((row) => (
                  <tr key={row.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Product Name */}
                    <td className="py-2.5 px-4 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white font-sans text-xs">{row.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.productSku} • {row.unit}
                      </div>
                    </td>

                    {/* Default Selling Price */}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-600 dark:text-slate-400">
                      ৳{row.defaultSellingPrice}
                    </td>

                    {/* Retail */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        ৳{row.prices.retail?.price ?? row.defaultSellingPrice}
                      </div>
                      {row.prices.retail?.hasCustomRule && (
                        <span className="text-[9px] font-sans text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1 rounded">
                          Custom
                        </span>
                      )}
                    </td>

                    {/* Reseller */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="font-bold text-blue-700 dark:text-blue-400">
                        ৳{row.prices.reseller?.price ?? row.defaultSellingPrice}
                      </div>
                      {row.prices.reseller?.hasCustomRule && (
                        <span className="text-[9px] font-sans text-blue-600 bg-blue-50 dark:bg-blue-950 px-1 rounded">
                          Custom
                        </span>
                      )}
                    </td>

                    {/* Corporate */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="font-bold text-purple-700 dark:text-purple-400">
                        ৳{row.prices.corporate?.price ?? row.defaultSellingPrice}
                      </div>
                      {row.prices.corporate?.hasCustomRule && (
                        <span className="text-[9px] font-sans text-purple-600 bg-purple-50 dark:bg-purple-950 px-1 rounded">
                          Custom
                        </span>
                      )}
                    </td>

                    {/* Agency */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="font-bold text-amber-700 dark:text-amber-400">
                        ৳{row.prices.agency?.price ?? row.defaultSellingPrice}
                      </div>
                      {row.prices.agency?.hasCustomRule && (
                        <span className="text-[9px] font-sans text-amber-600 bg-amber-50 dark:bg-amber-950 px-1 rounded">
                          Custom
                        </span>
                      )}
                    </td>

                    {/* Government */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="font-bold text-rose-700 dark:text-rose-400">
                        ৳{row.prices.government?.price ?? row.defaultSellingPrice}
                      </div>
                      {row.prices.government?.hasCustomRule && (
                        <span className="text-[9px] font-sans text-rose-600 bg-rose-50 dark:bg-rose-950 px-1 rounded">
                          Custom
                        </span>
                      )}
                    </td>

                    {/* Regular */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="font-bold text-indigo-700 dark:text-indigo-400">
                        ৳{row.prices.regular?.price ?? row.defaultSellingPrice}
                      </div>
                      {row.prices.regular?.hasCustomRule && (
                        <span className="text-[9px] font-sans text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1 rounded">
                          Custom
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT PRICING RULE */}
      {/* ======================================================== */}
      <ModalDialog
        open={isRuleModalOpen}
        onOpenChange={setIsRuleModalOpen}
        size="2xl"
        hideFooter={true}
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {editingRule ? 'Edit Pricing Rule' : 'Add New Pricing Rule'}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                  Dynamic Tariff
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Configure customer-specific price without modifying the product master default price.
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveRule} className="space-y-4 pt-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Product Select */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Product / Service <span className="text-rose-500">*</span>
              </Label>
              <select
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
                disabled={Boolean(editingRule)}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
                required
              >
                <option value="">Select a Product / Service</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Default: ৳{p.selling_price}/{p.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Type Select */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Type <span className="text-rose-500">*</span>
              </Label>
              <select
                value={formCustomerType}
                onChange={(e) => setFormCustomerType(e.target.value as PricingCustomerType)}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
                required
              >
                <option value="retail">Retail (ওয়াক-ইন / খুচরা)</option>
                <option value="reseller">Reseller (রিসেলার / সাব-কন্ট্রাক্টর)</option>
                <option value="corporate">Corporate (কর্পোরেট একাউন্ট)</option>
                <option value="agency">Agency (বিজ্ঞাপন সংস্থা / ডিজাইন)</option>
                <option value="government">Government (সরকারি / দরপত্র)</option>
                <option value="regular">Regular (নিয়মিত খদ্দের)</option>
              </select>
            </div>
          </div>

          {/* Pricing Strategy Selector */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <Label className="text-xs font-bold block text-slate-800 dark:text-slate-200">
              Pricing Strategy & Calculation Method
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormRuleType('percentage_adjustment')
                  setFormAdjustmentType('percentage')
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  formRuleType === 'percentage_adjustment'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-[11px] flex items-center gap-1 font-bold">
                  <Percent className="h-3.5 w-3.5" />
                  <span>% Discount / Markup</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">e.g. -16% for Reseller</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormRuleType('fixed_adjustment')
                  setFormAdjustmentType('fixed')
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  formRuleType === 'fixed_adjustment'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-[11px] flex items-center gap-1 font-bold">
                  <Tag className="h-3.5 w-3.5" />
                  <span>Fixed ৳ Adjustment</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">e.g. -৳4 / SFT</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormRuleType('fixed_price')
                  setFormAdjustmentType('none')
                  setFormFixedPrice(selectedProduct ? Number(selectedProduct.selling_price) : 0)
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  formRuleType === 'fixed_price'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-[11px] flex items-center gap-1 font-bold">
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Direct Fixed Rate</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">e.g. ৳21.00 / SFT</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormRuleType('unit_rate')
                  setFormAdjustmentType('none')
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  formRuleType === 'unit_rate'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-[11px] flex items-center gap-1 font-bold">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Standard Unit Rate</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Catalog base rate</p>
              </button>
            </div>

            {/* Inputs based on strategy */}
            <div className="pt-1">
              {formRuleType === 'percentage_adjustment' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Adjustment Percentage (%) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="-15"
                        value={formAdjustmentValue}
                        onChange={(e) => setFormAdjustmentValue(Number(e.target.value))}
                        className="text-xs h-9 font-mono font-bold pr-8"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Negative for discount (e.g. -16%), positive for premium markup
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Rounding Policy</Label>
                    <select
                      value={formRoundingRule}
                      onChange={(e) => setFormRoundingRule(e.target.value as RoundingRule)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                    >
                      <option value="none">No rounding (Exact 2 decimals)</option>
                      <option value="round_1">Round to nearest ৳1</option>
                      <option value="round_5">Round to nearest ৳5</option>
                      <option value="round_10">Round to nearest ৳10</option>
                      <option value="ceil_5">Ceiling to next ৳5</option>
                      <option value="floor_5">Floor to lower ৳5</option>
                    </select>
                  </div>
                </div>
              )}

              {formRuleType === 'fixed_adjustment' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Fixed Price Difference (৳) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="-4"
                      value={formAdjustmentValue}
                      onChange={(e) => setFormAdjustmentValue(Number(e.target.value))}
                      className="text-xs h-9 font-mono font-bold"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Amount added or subtracted from base price
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Rounding Policy</Label>
                    <select
                      value={formRoundingRule}
                      onChange={(e) => setFormRoundingRule(e.target.value as RoundingRule)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                    >
                      <option value="none">No rounding</option>
                      <option value="round_1">Round to nearest ৳1</option>
                      <option value="round_5">Round to nearest ৳5</option>
                    </select>
                  </div>
                </div>
              )}

              {formRuleType === 'fixed_price' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Fixed Selling Price (৳ / {selectedProduct?.unit || 'Unit'}) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formFixedPrice}
                      onChange={(e) => setFormFixedPrice(Number(e.target.value))}
                      className="text-xs h-9 font-mono font-bold text-blue-600 dark:text-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Rounding Policy</Label>
                    <select
                      value={formRoundingRule}
                      onChange={(e) => setFormRoundingRule(e.target.value as RoundingRule)}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                    >
                      <option value="none">No rounding</option>
                      <option value="round_1">Round to nearest ৳1</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LIVE PRICE PREVIEW BOX */}
          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Calculated {CUSTOMER_TYPES_META[formCustomerType]?.label} Rate
              </span>
              <span className="text-[11px] text-slate-500">
                Base: ৳{selectedProduct?.selling_price || 0} → Adjusted Final Rate:
              </span>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                ৳{livePreview.calculatedPrice} <span className="text-xs font-normal text-slate-500">/ {selectedProduct?.unit || 'unit'}</span>
              </div>
            </div>
          </div>

          {/* Commercial Minimums & Validity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Min Billable Qty</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 10"
                value={formMinBillableQty || ''}
                onChange={(e) => setFormMinBillableQty(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Minimum Charge (৳)</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 250"
                value={formMinCharge || ''}
                onChange={(e) => setFormMinCharge(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Effective From</Label>
              <Input
                type="date"
                value={formEffectiveFrom}
                onChange={(e) => setFormEffectiveFrom(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Effective Until</Label>
              <Input
                type="date"
                value={formEffectiveUntil}
                onChange={(e) => setFormEffectiveUntil(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold mb-1 block">Notes / Reason for Commercial Tariff</Label>
            <Input
              placeholder="e.g. Annual wholesale advertising agency pricing contract"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRuleModalOpen(false)}
              disabled={isPending}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm"
            >
              {isPending ? 'Saving Rule...' : editingRule ? 'Update Pricing Rule' : 'Save Pricing Rule'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* ======================================================== */}
      {/* MODAL: BULK PRICING */}
      {/* ======================================================== */}
      <ModalDialog
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        size="2xl"
        hideFooter={true}
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                Bulk Customer-Type Pricing
              </span>
              <p className="text-xs text-slate-500">
                Apply standardized percentage discounts or tariffs across multiple catalog items at once.
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4 pt-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Target Customer Type</Label>
              <select
                value={bulkCustomerType}
                onChange={(e) => setBulkCustomerType(e.target.value as PricingCustomerType)}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold"
              >
                <option value="reseller">Reseller (রিসেলার)</option>
                <option value="corporate">Corporate (কর্পোরেট)</option>
                <option value="agency">Agency (এজেন্সি)</option>
                <option value="government">Government (সরকারি)</option>
                <option value="regular">Regular (নিয়মিত)</option>
                <option value="retail">Retail (খুচরা)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Adjustment Type</Label>
              <select
                value={bulkAdjustmentType}
                onChange={(e) => setBulkAdjustmentType(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold"
              >
                <option value="percentage">Percentage Discount / Markup (%)</option>
                <option value="fixed">Fixed Price Difference (৳)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {bulkAdjustmentType === 'percentage' ? 'Discount % (e.g. -15)' : 'Difference ৳'}
              </Label>
              <Input
                type="number"
                step="0.5"
                value={bulkAdjustmentValue}
                onChange={(e) => setBulkAdjustmentValue(Number(e.target.value))}
                className="text-xs h-9 font-mono font-bold"
                required
              />
            </div>
          </div>

          {/* Product Multi-select box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Select Products to Apply ({bulkProductIds.length} of {products.length} selected)
              </Label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setBulkProductIds(products.map((p) => p.id))}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setBulkProductIds([])}
                  className="text-slate-500 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/50">
              {products.map((p) => {
                const isChecked = bulkProductIds.includes(p.id)
                const base = Number(p.selling_price) || 0
                const calculated = bulkAdjustmentType === 'percentage'
                  ? Math.round(base * (1 + bulkAdjustmentValue / 100) * 100) / 100
                  : Math.max(0, base + bulkAdjustmentValue)

                return (
                  <label
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkProductIds((prev) => [...prev, p.id])
                          } else {
                            setBulkProductIds((prev) => prev.filter((id) => id !== p.id))
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({p.sku})</span>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <span className="text-slate-400 line-through mr-2">৳{base}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">৳{calculated}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={bulkOverrideExisting}
              onChange={(e) => setBulkOverrideExisting(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Overwrite existing custom pricing rules for these items</span>
          </label>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkModalOpen(false)}
              disabled={isPending}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || bulkProductIds.length === 0}
              className="w-full sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm"
            >
              {isPending ? 'Applying...' : `Apply Bulk Pricing (${bulkProductIds.length} Items)`}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* ======================================================== */}
      {/* MODAL: COPY PRICING */}
      {/* ======================================================== */}
      <ModalDialog
        open={isCopyModalOpen}
        onOpenChange={setIsCopyModalOpen}
        size="lg"
        hideFooter={true}
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                Copy Pricing Between Customer Types
              </span>
              <p className="text-xs text-slate-500">
                Clone all rules from one category into another with optional percentage adjustments.
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCopySubmit} className="space-y-4 pt-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Source Customer Type</Label>
              <select
                value={copySourceType}
                onChange={(e) => setCopySourceType(e.target.value as PricingCustomerType)}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold"
              >
                <option value="retail">Retail (খুচরা)</option>
                <option value="reseller">Reseller (রিসেলার)</option>
                <option value="corporate">Corporate (কর্পোরেট)</option>
                <option value="agency">Agency (এজেন্সি)</option>
                <option value="government">Government (সরকারি)</option>
                <option value="regular">Regular (নিয়মিত)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Target Customer Type</Label>
              <select
                value={copyTargetType}
                onChange={(e) => setCopyTargetType(e.target.value as PricingCustomerType)}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400"
              >
                <option value="regular">Regular (নিয়মিত)</option>
                <option value="reseller">Reseller (রিসেলার)</option>
                <option value="corporate">Corporate (কর্পোরেট)</option>
                <option value="agency">Agency (এজেন্সি)</option>
                <option value="government">Government (সরকারি)</option>
                <option value="retail">Retail (খুচরা)</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Optional Modifier (%)</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                placeholder="0"
                value={copyModifierPercent}
                onChange={(e) => setCopyModifierPercent(Number(e.target.value))}
                className="text-xs h-9 font-mono font-bold pr-8"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              e.g. -5% to make target 5% cheaper than source rates, or 0% for exact clone
            </span>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={copyOverrideExisting}
              onChange={(e) => setCopyOverrideExisting(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Overwrite existing rules for {copyTargetType}</span>
          </label>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCopyModalOpen(false)}
              disabled={isPending}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || copySourceType === copyTargetType}
              className="w-full sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm"
            >
              {isPending ? 'Copying...' : `Copy to ${copyTargetType}`}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

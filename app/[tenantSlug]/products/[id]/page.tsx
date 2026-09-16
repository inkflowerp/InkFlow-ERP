'use client'

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Package,
  ArrowLeft,
  DollarSign,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Sliders,
  Layers,
  History,
  ShieldCheck,
  Edit3,
  Archive,
  Trash2,
  Plus,
  Wrench,
  Truck,
  Scissors,
  Sparkles,
  TrendingUp,
  Building2,
  FileSpreadsheet,
  Receipt,
  FileCheck,
  Check,
  AlertTriangle,
  RefreshCw,
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
import type {
  ProductRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceHistoryRecord,
  ProductUsageStats,
} from '@/types/product.types'
import {
  getProductByIdAction,
  updateProductPriceAction,
  archiveProductAction,
  deleteProductAction,
  createProductVariantAction,
  deleteProductVariantAction,
  getProductPriceHistoryAction,
  getProductUsageStatsAction,
  checkProductDeletionSafetyAction,
} from '@/actions/product.actions'
import { cn } from '@/lib/utils'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id

  const [product, setProduct] = useState<ProductRecord | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([])
  const [usageStats, setUsageStats] = useState<ProductUsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Active detail tab
  const [activeTab, setActiveTab] = useState<'overview' | 'production' | 'variants' | 'formula' | 'history' | 'usage'>('overview')

  // Modals
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
  const [newPrice, setNewPrice] = useState<number>(0)
  const [priceReason, setPriceReason] = useState('')

  // Add Variant Modal
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false)
  const [newVariant, setNewVariant] = useState({
    variant_name: '',
    sku_suffix: '',
    gsm: 0,
    thickness_mm: 0,
    finish: '',
    color: '',
    size_spec: '',
    price_adjustment: 0,
    cost_adjustment: 0,
  })

  // Delete Safety
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletionSafety, setDeletionSafety] = useState<{ isSafe: boolean; references: any; reason?: string } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Load product data authoritatively
  const loadProductData = async () => {
    if (!productId) return
    setIsLoading(true)
    setFetchError(null)

    try {
      const [prodRes, histRes, statsRes] = await Promise.all([
        getProductByIdAction(productId, companyId),
        getProductPriceHistoryAction(productId, companyId),
        getProductUsageStatsAction(productId, companyId),
      ])

      if (prodRes.success && prodRes.data) {
        setProduct(prodRes.data)
        setNewPrice(prodRes.data.selling_price)
      } else {
        setFetchError(prodRes.error || 'Product record not found in database.')
      }

      if (histRes.success && histRes.data) {
        setPriceHistory(histRes.data)
      }

      if (statsRes.success && statsRes.data) {
        setUsageStats(statsRes.data)
      }
    } catch (err: any) {
      setFetchError(err.message || 'Error loading product details.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProductData()
  }, [productId, companyId])

  // Handle Price Adjustment
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    if (!priceReason.trim()) {
      showNotification('Please provide a reason for the price revision.', 'error')
      return
    }

    startTransition(async () => {
      try {
        const res = await updateProductPriceAction(product.id, newPrice, priceReason, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to update price.', 'error')
          return
        }
        showNotification(`Price updated to ৳${newPrice} and logged in audit history.`)
        setIsPriceModalOpen(false)
        setPriceReason('')
        loadProductData()
      } catch (err: any) {
        showNotification(err.message || 'Price adjustment failed.', 'error')
      }
    })
  }

  // Handle Add Variant
  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !newVariant.variant_name.trim()) return

    startTransition(async () => {
      try {
        const res = await createProductVariantAction({
          product_id: product.id,
          variant_name: newVariant.variant_name.trim(),
          sku_suffix: newVariant.sku_suffix.trim() || null,
          gsm: newVariant.gsm ? Number(newVariant.gsm) : null,
          thickness_mm: newVariant.thickness_mm ? Number(newVariant.thickness_mm) : null,
          finish: newVariant.finish.trim() || null,
          color: newVariant.color.trim() || null,
          size_spec: newVariant.size_spec.trim() || null,
          price_adjustment: Number(newVariant.price_adjustment) || 0,
          cost_adjustment: Number(newVariant.cost_adjustment) || 0,
        }, companyId)

        if (!res.success) {
          showNotification(res.error || 'Failed to create variant.', 'error')
          return
        }

        showNotification(`Added variant '${newVariant.variant_name}'.`)
        setIsAddVariantOpen(false)
        setNewVariant({
          variant_name: '',
          sku_suffix: '',
          gsm: 0,
          thickness_mm: 0,
          finish: '',
          color: '',
          size_spec: '',
          price_adjustment: 0,
          cost_adjustment: 0,
        })
        loadProductData()
      } catch (err: any) {
        showNotification(err.message || 'Variant creation failed.', 'error')
      }
    })
  }

  // Handle Delete Variant
  const handleDeleteVariant = async (variantId: string) => {
    if (!product) return
    startTransition(async () => {
      try {
        const res = await deleteProductVariantAction(variantId, product.id, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to delete variant.', 'error')
          return
        }
        showNotification('Variant deleted.')
        loadProductData()
      } catch (err: any) {
        showNotification(err.message || 'Failed to delete variant.', 'error')
      }
    })
  }

  // Handle Archive / Restore
  const handleToggleArchive = async () => {
    if (!product) return
    const isCurrentlyActive = product.is_active !== false
    startTransition(async () => {
      try {
        const res = await archiveProductAction(product.id, isCurrentlyActive, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to update status.', 'error')
          return
        }
        showNotification(`${isCurrentlyActive ? 'Archived' : 'Restored'} '${product.name}'.`)
        loadProductData()
      } catch (err: any) {
        showNotification(err.message || 'Error updating status.', 'error')
      }
    })
  }

  // Handle Delete Safety Check & Initiation
  const handleInitiateDelete = async () => {
    if (!product) return
    setIsDeleteOpen(true)
    const safetyRes = await checkProductDeletionSafetyAction(product.id, companyId)
    if (safetyRes.success && safetyRes.data) {
      setDeletionSafety(safetyRes.data)
    } else {
      setDeletionSafety({ isSafe: false, references: { quotations: 1, invoices: 0, jobs: 0, customerRates: 0 }, reason: 'Could not verify references. Archiving is recommended.' })
    }
  }

  // Confirm Delete / Archive
  const handleConfirmDelete = async () => {
    if (!product) return
    startTransition(async () => {
      try {
        const res = await deleteProductAction(product.id, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to delete product.', 'error')
          return
        }
        if (res.deletionResult?.archived) {
          showNotification(`Product was archived because historical references exist.`)
          setIsDeleteOpen(false)
          loadProductData()
        } else {
          showNotification(`Product permanently deleted.`)
          router.push(`/${slug}/products`)
        }
      } catch (err: any) {
        showNotification(err.message || 'Failed to delete.', 'error')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl pb-12">
        <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (fetchError || !product) {
    return (
      <div className="space-y-6 max-w-6xl pb-12">
        <Link
          href={`/${slug}/products`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Product Catalog
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Layers className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Product Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {fetchError || 'The product record you are looking for does not exist in your tenant catalog.'}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Button size="sm" onClick={loadProductData} variant="outline" className="text-xs">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
            </Button>
            <Button asChild size="sm" className="text-xs bg-blue-600 hover:bg-blue-700">
              <Link href={`/${slug}/products`}>View All Products</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const marginPercent =
    product.selling_price > 0
      ? Math.round(((product.selling_price - product.base_cost) / product.selling_price) * 100)
      : 0

  const formula = product.pricing_formula

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Back Link */}
      <div>
        <Link
          href={`/${slug}/products`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Product Catalog
        </Link>

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {product.name}
              </h1>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                {product.product_type?.replace('_', ' ')}
              </span>
              {product.is_active !== false ? (
                <Badge className="bg-emerald-500 text-white text-[11px]">Active</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 border-slate-300 text-[11px]">Archived</Badge>
              )}
            </div>

            {product.name_bn && (
              <div className="text-sm font-medium text-slate-500 font-bengali">{product.name_bn}</div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{product.sku}</span>
              <span>•</span>
              <span className="capitalize">{product.category?.replace('_', ' ')}</span>
              <span>•</span>
              <span className="uppercase font-mono font-semibold text-blue-600">Unit: {product.unit}</span>
              {product.material_spec && (
                <>
                  <span>•</span>
                  <span>{product.material_spec}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setIsPriceModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
            >
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />
              Adjust Price
            </Button>

            <Link href={`/${slug}/pricing`}>
              <Button size="sm" variant="outline" className="text-xs">
                <Calculator className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                Live Estimator
              </Button>
            </Link>

            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleArchive}
              className="text-xs text-slate-600 dark:text-slate-300"
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              {product.is_active !== false ? 'Archive' : 'Restore'}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleInitiateDelete}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={cn(
            'p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border shadow-xs animate-in fade-in-0',
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
          )}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Internal Base Cost</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            <CurrencyDisplay amount={product.base_cost} />
          </div>
          <span className="text-[11px] text-slate-400">COGS benchmark per {product.unit}</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-600 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Catalog Selling Rate</span>
          <div className="text-2xl font-black text-blue-600 mt-1 font-mono">
            <CurrencyDisplay amount={product.selling_price} />
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Standard customer price</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Minimum Floor Price</span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 font-mono">
            <CurrencyDisplay amount={product.min_price} />
          </div>
          <span className="text-[11px] text-amber-600">Discounts cannot fall below this</span>
        </Card>

        <Card className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Standard Margin</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {marginPercent}%
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            VAT: {product.tax_rate}% NBR compliant
          </span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap',
            activeTab === 'overview' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
          )}
        >
          Overview & Specs
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap',
            activeTab === 'production' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
          )}
        >
          Production Rules
        </button>
        <button
          onClick={() => setActiveTab('variants')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap',
            activeTab === 'variants' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
          )}
        >
          Variants ({product.variants?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('formula')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap',
            activeTab === 'formula' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
          )}
        >
          Pricing Formula
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap',
            activeTab === 'history' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
          )}
        >
          Price History ({priceHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap',
            activeTab === 'usage' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
          )}
        >
          Commercial Usage
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & SPECS */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold">Product Overview & Specifications</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">Description (English)</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {product.description || 'No English description provided.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">বিবরণ (বাংলা)</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-bengali">
                  {product.description_bn || 'কোন বাংলা বিবরণ যোগ করা হয়নি।'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Billing Unit</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 uppercase">{product.unit}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Material Spec</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{product.material_spec || 'Standard Spec'}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Dimensions Spec</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{product.dimensions_spec || 'Custom Sizes'}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Tax Rate</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{product.tax_rate}% VAT</span>
              </div>
            </div>

            {product.internal_notes && (
              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs space-y-1">
                <strong className="text-amber-800 dark:text-amber-300 font-bold block">Internal Workshop Notes:</strong>
                <p className="text-amber-900 dark:text-amber-200">{product.internal_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PRODUCTION RULES */}
      {/* ======================================================== */}
      {activeTab === 'production' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold">Production Routing & Workflow Rules</CardTitle>
            <CardDescription className="text-xs">
              Automated stage provisioning when quotations convert into production job orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Default Department</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{product.default_department || 'Printing'}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Estimated Production Time</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {product.estimated_production_time_hours || 4} Hours
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 col-span-2">
                <span className="text-slate-400 block">Default Finishing</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{product.default_finishing || 'Standard Finishing'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Required Operational Stages:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { label: 'Requires Pre-Press Design', active: product.requires_design },
                  { label: 'Requires Customer Approval', active: product.requires_approval },
                  { label: 'Requires Machine Production', active: product.requires_production !== false },
                  { label: 'Requires Metal/Sign Fabrication', active: product.requires_fabrication },
                  { label: 'Requires Post-Press Finishing', active: product.requires_finishing },
                  { label: 'Requires Site Installation', active: product.requires_installation },
                  { label: 'Requires Delivery Dispatch', active: product.requires_delivery },
                ].map((st, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-2.5 rounded-lg border flex items-center gap-2',
                      st.active
                        ? 'bg-blue-50/60 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
                    )}
                  >
                    <div className={cn('h-2 w-2 rounded-full', st.active ? 'bg-blue-600' : 'bg-slate-300')} />
                    <span>{st.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {product.production_instructions && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <strong className="text-slate-800 dark:text-slate-200 font-bold block">Operator Instructions:</strong>
                <p className="text-slate-600 dark:text-slate-400">{product.production_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 3: VARIANTS */}
      {/* ======================================================== */}
      {activeTab === 'variants' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Product Media Variants</CardTitle>
              <CardDescription className="text-xs">
                Thickness, GSM, color, finish, and price/cost adjustments.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAddVariantOpen(true)} className="text-xs bg-blue-600 hover:bg-blue-700">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Variant
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Variant Name</th>
                  <th className="py-3 px-3">SKU Suffix</th>
                  <th className="py-3 px-3">GSM / Thickness</th>
                  <th className="py-3 px-3">Finish & Color</th>
                  <th className="py-3 px-3">Price Adjustment</th>
                  <th className="py-3 px-3">Cost Adjustment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(!product.variants || product.variants.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No variants registered for this product.
                    </td>
                  </tr>
                ) : (
                  product.variants.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{v.variant_name}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{v.sku_suffix || '-'}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {v.gsm ? `${v.gsm} GSM` : ''} {v.thickness_mm ? `${v.thickness_mm}mm` : ''}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{v.finish || v.color || 'Standard'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">
                        {v.price_adjustment > 0 ? `+৳${v.price_adjustment}` : `৳${v.price_adjustment}`}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {v.cost_adjustment > 0 ? `+৳${v.cost_adjustment}` : `৳${v.cost_adjustment}`}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteVariant(v.id)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PRICING FORMULA */}
      {/* ======================================================== */}
      {activeTab === 'formula' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  Structured Pricing & Costing Formula Engine
                </CardTitle>
                <CardDescription className="text-xs">
                  Declarative, non-eval mathematical rules evaluated safely in real-time.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" /> Safe Non-Eval Rule
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg font-mono border border-slate-200 dark:border-slate-800">
              <strong>Active Rule Template: </strong>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{formula?.model || 'dimensional_area'}</span>
              <div className="mt-1 text-slate-500 font-sans text-xs">
                Formula: Area(sft) = Width(ft) × Height(ft) × Qty. Planned Waste: {formula?.waste_factor_percent || 5}%.
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Material Cost Rate</span>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">
                  ৳{formula?.material_rate || 0} / sft
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Print Machine Rate</span>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">
                  ৳{formula?.print_rate || formula?.machine_rate || 0} / sft
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Finishing Rate</span>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">
                  ৳{formula?.finishing_rate || 3} / ft
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Fabrication / Metal</span>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">
                  ৳{formula?.fabrication_rate || 0} / sft
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 5: PRICE HISTORY AUDIT TRAIL */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-purple-600" />
              Price Adjustment Audit Trail
            </CardTitle>
            <CardDescription className="text-xs">
              Immutable PostgreSQL log of catalog price revisions and reason documentation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-3">Previous Price</th>
                  <th className="py-3 px-3">New Price</th>
                  <th className="py-3 px-4">Reason for Change</th>
                  <th className="py-3 px-3">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {priceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No historical price changes recorded for this item.
                    </td>
                  </tr>
                ) : (
                  priceHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {h.created_at ? new Date(h.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-3 line-through text-slate-400 font-mono">
                        <CurrencyDisplay amount={h.old_price} />
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-600 font-mono">
                        <CurrencyDisplay amount={h.new_price} />
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{h.reason}</td>
                      <td className="py-3 px-3 text-slate-500">{h.changed_by_name || 'Owner'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 6: COMMERCIAL USAGE */}
      {/* ======================================================== */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Used in Quotations</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                {usageStats?.quotationCount || 0}
              </div>
              <span className="text-[11px] text-slate-400">Formal quotes created</span>
            </Card>

            <Card className="p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Used in Invoices</span>
              <div className="text-2xl font-black text-blue-600 mt-1 font-mono">
                {usageStats?.invoiceCount || 0}
              </div>
              <span className="text-[11px] text-blue-600/80 font-medium">Billed commercial sales</span>
            </Card>

            <Card className="p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Active Job Orders</span>
              <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
                {usageStats?.jobCount || 0}
              </div>
              <span className="text-[11px] text-slate-400">Production floor tasks</span>
            </Card>

            <Card className="p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Billed Revenue</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                ৳{(usageStats?.totalRevenueBDT || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-600/80 font-medium">
                Last sold: {usageStats?.lastSoldDate || 'Never'}
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADJUST PRICE MODAL */}
      {/* ======================================================== */}
      <ModalDialog
        open={isPriceModalOpen}
        onOpenChange={setIsPriceModalOpen}
        size="md"
        title={
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-base">Adjust Catalog Selling Price</span>
          </div>
        }
      >
        <form onSubmit={handleUpdatePrice} className="space-y-4 pt-1">
          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl text-xs space-y-1.5 border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Base Cost:</span>
              <span className="font-mono font-bold">৳{product.base_cost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Selling Price:</span>
              <span className="font-mono font-bold text-blue-600">৳{product.selling_price} / {product.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Minimum Floor Price:</span>
              <span className="font-mono font-bold text-amber-600">৳{product.min_price}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">New Selling Price (৳ BDT) <span className="text-rose-500">*</span></Label>
            <Input
              type="number"
              step="0.1"
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="text-xs h-9 font-mono font-bold text-blue-600"
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Reason for Revision (Audit Trail) <span className="text-rose-500">*</span></Label>
            <Input
              placeholder="e.g. Supplier flex roll raw material price increase"
              value={priceReason}
              onChange={(e) => setPriceReason(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPriceModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="text-xs bg-blue-600 hover:bg-blue-700 font-bold">
              {isPending ? 'Saving...' : 'Save & Log Audit History'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* ======================================================== */}
      {/* ADD VARIANT MODAL */}
      {/* ======================================================== */}
      <ModalDialog
        open={isAddVariantOpen}
        onOpenChange={setIsAddVariantOpen}
        size="md"
        title={
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-base">Add Product Variant</span>
          </div>
        }
      >
        <form onSubmit={handleCreateVariant} className="space-y-3.5 pt-1 text-xs">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Variant Name <span className="text-rose-500">*</span></Label>
            <Input
              placeholder="e.g. 440 GSM Heavy Duty or 5mm Cast Acrylic"
              value={newVariant.variant_name}
              onChange={(e) => setNewVariant({ ...newVariant, variant_name: e.target.value })}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">SKU Suffix</Label>
              <Input
                placeholder="e.g. 440GSM"
                value={newVariant.sku_suffix}
                onChange={(e) => setNewVariant({ ...newVariant, sku_suffix: e.target.value })}
                className="text-xs h-9 font-mono uppercase"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">GSM</Label>
              <Input
                type="number"
                placeholder="440"
                value={newVariant.gsm || ''}
                onChange={(e) => setNewVariant({ ...newVariant, gsm: Number(e.target.value) })}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Price Adjustment (৳)</Label>
              <Input
                type="number"
                placeholder="+5"
                value={newVariant.price_adjustment || ''}
                onChange={(e) => setNewVariant({ ...newVariant, price_adjustment: Number(e.target.value) })}
                className="text-xs h-9 font-mono font-bold text-blue-600"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Cost Adjustment (৳)</Label>
              <Input
                type="number"
                placeholder="+3"
                value={newVariant.cost_adjustment || ''}
                onChange={(e) => setNewVariant({ ...newVariant, cost_adjustment: Number(e.target.value) })}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddVariantOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="text-xs bg-blue-600 hover:bg-blue-700 font-bold">
              {isPending ? 'Saving...' : 'Add Variant'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* ======================================================== */}
      {/* DELETE / ARCHIVE MODAL */}
      {/* ======================================================== */}
      <ModalDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        size="md"
        title={
          <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
            <AlertTriangle className="h-5 w-5" />
            <span>Confirm Deletion / Archive</span>
          </div>
        }
      >
        <div className="space-y-4 pt-1 text-xs">
          <p className="text-slate-700 dark:text-slate-300">
            Are you sure you want to remove <strong>{product.name}</strong> ({product.sku})?
          </p>

          {deletionSafety && !deletionSafety.isSafe && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 space-y-1">
              <strong className="block">Protected Historical Record</strong>
              <p>{deletionSafety.reason}</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-1">
                Clicking confirm will safely <strong>Archive / Deactivate</strong> this item instead of deleting it.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isPending ? 'Processing...' : deletionSafety?.isSafe ? 'Permanently Delete' : 'Archive Product'}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </div>
  )
}

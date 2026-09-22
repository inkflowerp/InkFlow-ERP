'use client'

import React, { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
  Scale,
  Percent,
  Coins,
  Boxes,
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
import { MaterialConfigModal } from '@/components/products/material-config-modal'
import { ServiceConfigModal } from '@/components/products/service-config-modal'
import { ReadyProductModal } from '@/components/products/ready-product-modal'
import { OutsourceProductModal } from '@/components/products/outsource-product-modal'
import {
  getProductByIdAction,
  updateProductAction,
  updateProductPriceAction,
  archiveProductAction,
  deleteProductAction,
  createProductVariantAction,
  deleteProductVariantAction,
  getProductPriceHistoryAction,
  getProductUsageStatsAction,
  checkProductDeletionSafetyAction,
  getProductSupplierPricesAction,
  getPriceOverridesAction,
} from '@/actions/product.actions'
import { getMachineriesAction } from '@/actions/machinery.actions'
import type {
  ProductRecord,
  ProductVariantRecord,
  ProductFormulaRecord,
  PriceHistoryRecord,
  ProductUsageStats,
  ProductSupplierPriceRecord,
  PriceOverrideRecord,
} from '@/types/product.types'
import type { MachineryRecord } from '@/types/machinery.types'
import {
  calculateEffectiveUnitCost,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  normalizePricingMethod,
  isServiceProduct,
  isReadyProduct,
  isMaterialProduct,
  isOutsourceProduct,
  getProductEntityKind,
  getProductEntityKindLabel,
} from '@/lib/units'
import { cn } from '@/lib/utils'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const productId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [product, setProduct] = useState<ProductRecord | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([])
  const [supplierPrices, setSupplierPrices] = useState<ProductSupplierPriceRecord[]>([])
  const [priceOverrides, setPriceOverrides] = useState<PriceOverrideRecord[]>([])
  const [usageStats, setUsageStats] = useState<ProductUsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Active detail tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'commercial'
    | 'price_tiers'
    | 'cost_breakdown'
    | 'recipe'
    | 'suppliers'
    | 'production'
    | 'variants'
    | 'history'
    | 'usage'
  >('overview')

  // Modals
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)
  const [isReadyProductModalOpen, setIsReadyProductModalOpen] = useState(false)
  const [isOutsourceModalOpen, setIsOutsourceModalOpen] = useState(false)
  const [machineries, setMachineries] = useState<MachineryRecord[]>([])
  const [newPrice, setNewPrice] = useState<number>(0)
  const [newPurchasePrice, setNewPurchasePrice] = useState<number>(0)
  const [newTargetMargin, setNewTargetMargin] = useState<number>(35)
  const [newWastage, setNewWastage] = useState<number>(0)
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

  const handleOpenEdit = () => {
    if (!product) return
    if (isOutsourceProduct(product)) {
      setIsOutsourceModalOpen(true)
    } else if (isServiceProduct(product)) {
      setIsServiceModalOpen(true)
    } else if (isMaterialProduct(product)) {
      setIsMaterialModalOpen(true)
    } else {
      setIsReadyProductModalOpen(true)
    }
  }

  const handleSaveProductConfig = async (productData: Partial<ProductRecord>) => {
    if (!product) return
    const res = await updateProductAction(product.id, productData, companyId)
    if (!res.success) throw new Error(res.error || 'Failed to update item.')
    showNotification(`Updated '${productData.name || product.name}' successfully.`)
    await loadProductData()
  }

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
      const [prodRes, histRes, statsRes, suppRes, overrideRes, machRes] = await Promise.all([
        getProductByIdAction(productId, companyId),
        getProductPriceHistoryAction(productId, companyId),
        getProductUsageStatsAction(productId, companyId),
        getProductSupplierPricesAction(productId, companyId),
        getPriceOverridesAction(productId, 50, companyId),
        getMachineriesAction(),
      ])

      if (machRes.success && machRes.data) {
        setMachineries(machRes.data)
      }

      if (prodRes.success && prodRes.data) {
        setProduct(prodRes.data)
        setNewPrice(prodRes.data.selling_price)
        setNewPurchasePrice(prodRes.data.purchase_price || 0)
        setNewTargetMargin(prodRes.data.target_margin_percentage || 35)
        setNewWastage(prodRes.data.default_wastage_percentage || 0)
      } else {
        setFetchError(prodRes.error || 'Product record not found in database.')
      }

      if (histRes.success && histRes.data) {
        setPriceHistory(histRes.data)
      }

      if (suppRes.success && suppRes.data) {
        setSupplierPrices(suppRes.data)
      }

      if (overrideRes.success && overrideRes.data) {
        setPriceOverrides(overrideRes.data)
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

  // Commercial economics derivation
  const commercialEconomics = useMemo(() => {
    if (!product) return null

    const isService =
      product.commercial_type === 'service' ||
      product.commercial_type === 'installation' ||
      product.commercial_type === 'delivery' ||
      product.measurement_type === 'job'

    const purchasePrice = Number(product.purchase_price) || 0
    const conversionRatio = Math.max(0.0001, Number(product.conversion_ratio) || 1.0)
    const wastage = Number(product.default_wastage_percentage) || 0
    const targetMargin = Number(product.target_margin_percentage) || 35.0
    const sellingPrice = Number(product.selling_price) || 0

    let effectiveMaterialCost = Number(product.base_cost) || 0
    let usableUnits = conversionRatio
    if (!isService && purchasePrice > 0) {
      const calc = calculateEffectiveUnitCost({
        purchasePrice,
        conversionRatio,
        defaultWastagePercent: wastage,
      })
      effectiveMaterialCost = calc.effectiveCostPerSellingUnit
      usableUnits = calc.expectedUsableUnits
    }

    // Direct Cost Breakdown Rollup
    const cb = product.cost_breakdown || {}
    const extraDirectCost =
      Number(cb.ink_cost || 0) +
      Number(cb.machine_cost || 0) +
      Number(cb.labor_cost || 0) +
      Number(cb.finishing_cost || 0) +
      Number(cb.fabrication_cost || 0) +
      Number(cb.installation_cost || 0) +
      Number(cb.delivery_cost || 0) +
      Number(cb.other_direct_cost || 0)

    // Components Recipe Rollup
    const componentsCost = (product.components || []).reduce(
      (acc, c) => acc + (Number(c.unit_cost || 0) * Number(c.quantity || 1) * (1 + (Number(c.waste_percent || 0) / 100))),
      0
    )

    const totalDirectCost = effectiveMaterialCost + extraDirectCost + componentsCost
    const hasDirectExtras = extraDirectCost > 0 || componentsCost > 0
    const costBasisType = hasDirectExtras ? 'direct_cost' : 'material'
    const activeCostBasis = hasDirectExtras ? totalDirectCost : effectiveMaterialCost

    const suggestedSellingPrice = calculateSuggestedSellingPrice(activeCostBasis, targetMargin)
    const marginCalc = calculateGrossMargin(activeCostBasis, sellingPrice)

    return {
      isService,
      purchaseUnit: product.purchase_unit || 'roll',
      sellingUnit: product.selling_unit || product.unit || 'sqft',
      purchasePrice,
      conversionRatio,
      wastage,
      usableUnits: Math.round(usableUnits * 100) / 100,
      effectiveMaterialCost: Math.round(effectiveMaterialCost * 100) / 100,
      extraDirectCost: Math.round(extraDirectCost * 100) / 100,
      componentsCost: Math.round(componentsCost * 100) / 100,
      totalDirectCost: Math.round(totalDirectCost * 100) / 100,
      costBasisType,
      activeCostBasis: Math.round(activeCostBasis * 100) / 100,
      targetMargin,
      suggestedSellingPrice,
      grossProfit: marginCalc.grossProfit,
      grossMarginPercent: marginCalc.grossMarginPercent,
      pricingMethod: normalizePricingMethod(product.pricing_method || product.measurement_type),
      minBillableQty: Number(product.min_billable_quantity || 0),
      minOrderQty: Number(product.min_order_quantity || 0),
      minimumCharge: Number(product.minimum_charge || 0),
    }
  }, [product])

  // Handle Price Adjustment with Commercial Log
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    if (!priceReason.trim()) {
      showNotification('Please provide a reason for the price revision.', 'error')
      return
    }

    startTransition(async () => {
      try {
        const res = await updateProductPriceAction(
          product.id,
          newPrice,
          priceReason,
          companyId,
          {
            newPurchasePrice,
            newTargetMarginPercent: newTargetMargin,
            newWastagePercent: newWastage,
          }
        )
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
      setDeletionSafety({
        isSafe: false,
        references: { quotations: 1, invoices: 0, jobs: 0, customerRates: 0 },
        reason: 'Could not verify references. Archiving is recommended.',
      })
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
          router.push(getTenantNavHref('/products', pathname, slug))
        }
      } catch (err: any) {
        showNotification(err.message || 'Failed to delete.', 'error')
      }
    })
  }

  if (!mounted || isLoading) {
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
          href={getTenantNavHref('/products', pathname, slug)}
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
              <Link href={getTenantNavHref('/products', pathname, slug)}>View All Products</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const formula = product.pricing_formula

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Back Link */}
      <div>
        <Link
          href={getTenantNavHref('/products', pathname, slug)}
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
              <span
                className={cn(
                  'capitalize px-2 py-0.5 rounded text-xs font-bold border',
                  isOutsourceProduct(product)
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                    : isServiceProduct(product)
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                    : isMaterialProduct(product)
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
                )}
              >
                {getProductEntityKindLabel(product)}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 uppercase">
                {commercialEconomics?.pricingMethod?.replace('_', ' ') || 'Per Area'}
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
              <span className="uppercase font-mono font-semibold text-blue-600">
                Sell: {product.selling_unit || product.unit}
              </span>
              {product.purchase_price && product.purchase_price > 0 ? (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    Buy: ৳{product.purchase_price}/{product.purchase_unit || 'roll'}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleOpenEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
            >
              <Boxes className="mr-1.5 h-3.5 w-3.5" />
              Edit {isOutsourceProduct(product) ? 'Outsource Product' : isServiceProduct(product) ? 'Service' : isMaterialProduct(product) ? 'Material' : 'Product'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPriceModalOpen(true)}
              className="text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />
              Adjust Price
            </Button>

            <Link href={getTenantNavHref('/quotations', pathname, slug)}>
              <Button size="sm" variant="outline" className="text-xs font-bold">
                <Tag className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
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

      {/* Commercial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {commercialEconomics?.costBasisType === 'direct_cost' ? 'Est. Direct Cost' : 'Effective Unit Cost'}
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            <CurrencyDisplay amount={commercialEconomics?.activeCostBasis || product.base_cost} />
          </div>
          <span className="text-[11px] text-slate-400">
            per {product.selling_unit || product.unit} (
            {commercialEconomics?.costBasisType === 'direct_cost' ? 'Direct Job Cost' : 'Raw Material Yield'}
            )
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-600 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Catalog Selling Rate</span>
          <div className="text-2xl font-black text-blue-600 mt-1 font-mono">
            <CurrencyDisplay amount={product.selling_price} />
          </div>
          <span className="text-[11px] text-blue-600 font-medium">
            Pricing: {commercialEconomics?.pricingMethod?.replace('_', ' ')}
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">3 Commercial Minimums</span>
          <div className="text-xs font-bold text-amber-900 dark:text-amber-300 mt-1 space-y-0.5 font-mono">
            <div>MOQ: {product.min_order_quantity || 1} {product.selling_unit || 'unit'}</div>
            <div>Min Billable: {product.min_billable_quantity || 0} {product.selling_unit || 'unit'}</div>
            <div>Min Charge: ৳{product.minimum_charge || 0}</div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
            Gross Margin % ({commercialEconomics?.costBasisType === 'direct_cost' ? 'Direct Cost' : 'Material'})
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {commercialEconomics?.grossMarginPercent || 0}%
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Profit: ৳{commercialEconomics?.grossProfit || 0} / {product.selling_unit || product.unit}
          </span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Specs' },
          { id: 'commercial', label: 'Commercial & Yield' },
          { id: 'price_tiers', label: 'Price Tiers' },
          { id: 'cost_breakdown', label: 'Direct Cost Breakdown' },
          { id: 'recipe', label: `Recipe / Bundle (${product.components?.length || 0})` },
          { id: 'suppliers', label: `Suppliers (${supplierPrices.length})` },
          { id: 'production', label: 'Production Rules' },
          { id: 'variants', label: `Variants (${product.variants?.length || 0})` },
          { id: 'history', label: `Price History (${priceHistory.length + priceOverrides.length})` },
          { id: 'usage', label: 'Commercial Usage' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-3 py-1.5 rounded-lg transition-all whitespace-nowrap',
              activeTab === tab.id ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
            )}
          >
            {tab.label}
          </button>
        ))}
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
                <span className="text-slate-400 block">Pricing Method</span>
                <span className="font-mono font-bold text-blue-700 uppercase">{commercialEconomics?.pricingMethod?.replace('_', ' ')}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Selling Unit</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 uppercase">{product.selling_unit || product.unit}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Material Spec</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{product.material_spec || 'Standard Spec'}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block">Tax Rate</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{product.tax_rate}% VAT</span>
              </div>
            </div>

            {/* Low-Margin Protection Summary */}
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs space-y-1">
              <strong className="text-blue-900 dark:text-blue-300 font-bold block">Commercial Governance:</strong>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700 dark:text-slate-300 pt-1">
                <div>Allow Manual Price Override: <strong className="text-slate-900 dark:text-white">{product.allow_manual_override !== false ? 'Yes' : 'No'}</strong></div>
                <div>Min Allowed Margin Floor: <strong className="text-emerald-700">{product.min_allowed_margin_percent || 15}%</strong></div>
                <div>Min Order Quantity (MOQ): <strong className="text-slate-900 dark:text-white">{product.min_order_quantity || 1} {product.selling_unit}</strong></div>
              </div>
            </div>

            {/* Outsource Subcontract Details (if Outsource Product) */}
            {(isOutsourceProduct(product) || product.is_outsource) && (
              <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-bold text-sm">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span>Outsource Vendor & Subcontract Production</span>
                  </div>
                  <Badge className="bg-purple-600 text-white text-[10px]">Non-Inventory Item</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700 dark:text-slate-300">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-900/40">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Vendor Name</span>
                    <strong className="text-slate-900 dark:text-white text-xs block mt-0.5">
                      {product.vendor_name || product.outsource_config?.vendor_name || 'Third-Party Vendor'}
                    </strong>
                    {(product.vendor_phone || product.outsource_config?.vendor_phone) && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        📞 {product.vendor_phone || product.outsource_config?.vendor_phone}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-900/40">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Turnaround Lead Time</span>
                    <strong className="text-amber-700 dark:text-amber-400 text-xs block mt-0.5">
                      ⏱️ {product.turnaround_days ?? product.outsource_config?.turnaround_days ?? 3} Business Days
                    </strong>
                    <span className="text-[10px] text-slate-400">Target Fulfillment Time</span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-900/40">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Vendor Item Code / Ref</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-xs block mt-0.5">
                      {product.vendor_item_code || product.outsource_config?.vendor_item_code || '—'}
                    </strong>
                    <span className="text-[10px] text-slate-400">Supplier Reference ID</span>
                  </div>
                </div>

                {(product.vendor_address || product.outsource_config?.vendor_address) && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Vendor Address / Delivery Point:</span> {product.vendor_address || product.outsource_config?.vendor_address}
                  </div>
                )}

                {(product.outsource_notes || product.outsource_config?.vendor_notes) && (
                  <div className="p-2.5 bg-purple-100/50 dark:bg-purple-900/30 rounded-lg text-purple-900 dark:text-purple-200 text-[11px]">
                    <span className="font-bold">Subcontract Instructions / Spec: </span>
                    {product.outsource_notes || product.outsource_config?.vendor_notes}
                  </div>
                )}

                <p className="text-[11px] text-purple-700 dark:text-purple-300 italic">
                  💡 Non-Inventory Rule: Subcontracted on-demand from third-party vendor upon order placement. Does not track warehouse bin stock or consume raw material media rolls.
                </p>
              </div>
            )}

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
      {/* TAB 2: COMMERCIAL ECONOMICS & YIELD */}
      {/* ======================================================== */}
      {activeTab === 'commercial' && commercialEconomics && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Boxes className="h-4 w-4 text-blue-600" />
              Commercial Purchase Economics, Conversion & Usable Yield
            </CardTitle>
            <CardDescription className="text-xs">
              Mathematical modeling of how raw materials are purchased, converted, wasted, costed, and priced.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            {!commercialEconomics.isService ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Purchase Tariff</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                    ৳{commercialEconomics.purchasePrice}
                  </div>
                  <span className="text-[11px] text-slate-500">per 1 {commercialEconomics.purchaseUnit}</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Conversion Ratio</span>
                  <div className="text-lg font-bold font-mono text-blue-600 mt-1">
                    1 : {commercialEconomics.conversionRatio}
                  </div>
                  <span className="text-[11px] text-slate-500">{commercialEconomics.sellingUnit} per {commercialEconomics.purchaseUnit}</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Expected Wastage</span>
                  <div className="text-lg font-bold font-mono text-amber-600 mt-1">
                    {commercialEconomics.wastage}%
                  </div>
                  <span className="text-[11px] text-slate-500">Yield: {commercialEconomics.usableUnits} usable {commercialEconomics.sellingUnit}</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Effective Material Cost</span>
                  <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
                    ৳{commercialEconomics.effectiveMaterialCost}
                  </div>
                  <span className="text-[11px] text-slate-500">per {commercialEconomics.sellingUnit} (yield-adjusted)</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-blue-900 dark:text-blue-300">
                <strong>Service / Installation Item:</strong> Direct billing without raw material roll conversion. Selling Unit: <strong>{commercialEconomics.sellingUnit}</strong>.
              </div>
            )}

            {/* 3 Minimums Rule Explanation */}
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
              <strong className="text-amber-900 dark:text-amber-300 font-bold block text-xs">
                Three Distinct Commercial Minimum Rules:
              </strong>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">1. Physical MOQ</span>
                  <div className="text-sm font-bold font-mono mt-0.5">{product.min_order_quantity || 1} {commercialEconomics.sellingUnit}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Minimum physical quantity the workshop accepts.</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">2. Min Billable Qty</span>
                  <div className="text-sm font-bold font-mono mt-0.5 text-blue-600">{product.min_billable_quantity || 0} {commercialEconomics.sellingUnit}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Minimum quantity used for invoice billing.</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">3. Minimum Charge</span>
                  <div className="text-sm font-bold font-mono mt-0.5 text-emerald-600">৳{product.minimum_charge || 0}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Minimum monetary amount charged per item.</p>
                </div>
              </div>
            </div>

            {/* Pricing & Margin Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Pricing Method:</span>
                <span className="font-mono font-bold text-purple-700 uppercase">{commercialEconomics.pricingMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Target Gross Margin %:</span>
                <span className="font-mono font-bold">{commercialEconomics.targetMargin}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Suggested Selling Price:</span>
                <span className="font-mono font-bold text-emerald-600">৳{commercialEconomics.suggestedSellingPrice} / {commercialEconomics.sellingUnit}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Actual Catalog Selling Rate:</span>
                <span className="font-mono font-bold text-blue-600 text-sm">৳{product.selling_price} / {commercialEconomics.sellingUnit}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">
                  Calculated Margin ({commercialEconomics.costBasisType === 'direct_cost' ? 'Direct Cost Basis' : 'Material Cost Basis'}):
                </span>
                <span className="font-mono font-bold text-emerald-600 text-sm">{commercialEconomics.grossMarginPercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PRICE TIERS */}
      {/* ======================================================== */}
      {activeTab === 'price_tiers' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-600" />
              Multi-Tier Pricing Architecture
            </CardTitle>
            <CardDescription className="text-xs">
              Configured customer segment price tiers. Hierarchy: Customer Override → Price Tier → Catalog Default.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { key: 'retail', label: 'Retail', color: 'border-l-blue-500' },
                { key: 'corporate', label: 'Corporate', color: 'border-l-indigo-500' },
                { key: 'dealer', label: 'Dealer', color: 'border-l-amber-500' },
                { key: 'wholesale', label: 'Wholesale', color: 'border-l-emerald-500' },
                { key: 'custom', label: 'Custom / Special', color: 'border-l-purple-500' },
              ].map((tier) => {
                const tierPrice = (product.price_tiers as any)?.[tier.key] ?? product.selling_price
                const tierMargin = calculateGrossMargin(commercialEconomics?.activeCostBasis || product.base_cost, tierPrice)
                return (
                  <div key={tier.key} className={cn('p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 border-l-4 shadow-xs', tier.color)}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{tier.label}</span>
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                      ৳{tierPrice}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                      {tierMargin.grossMarginPercent}% Margin
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 4: DIRECT COST BREAKDOWN */}
      {/* ======================================================== */}
      {activeTab === 'cost_breakdown' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-600" />
              Estimated Direct Job Cost Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Distinguishing raw material cost from total direct job costs (ink, machine, labor, finishing, installation, delivery).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Raw Material</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{commercialEconomics?.effectiveMaterialCost || product.base_cost}</span>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Ink & Consumables</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{product.cost_breakdown?.ink_cost || 0}</span>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Machine Depreciation</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{product.cost_breakdown?.machine_cost || 0}</span>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Direct Labor</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{product.cost_breakdown?.labor_cost || 0}</span>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Finishing Work</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{product.cost_breakdown?.finishing_cost || 0}</span>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Sign / Frame Fabrication</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{product.cost_breakdown?.fabrication_cost || 0}</span>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Site Installation</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{product.cost_breakdown?.installation_cost || 0}</span>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Delivery Dispatch</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{product.cost_breakdown?.delivery_cost || 0}</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex justify-between items-center text-xs">
              <div>
                <strong className="text-emerald-900 dark:text-emerald-300 font-bold block">
                  Total Estimated Direct Unit Cost: ৳{commercialEconomics?.totalDirectCost} / {product.selling_unit}
                </strong>
                <span className="text-emerald-700 dark:text-emerald-400">
                  Margin calculation basis: <strong>{commercialEconomics?.costBasisType === 'direct_cost' ? 'Estimated Direct Cost' : 'Estimated Material Cost'}</strong>
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-slate-500 block text-[10px] uppercase">Selling Tariff</span>
                <span className="text-base font-bold text-blue-600">৳{product.selling_price}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 5: RECIPE / BUNDLE */}
      {/* ======================================================== */}
      {activeTab === 'recipe' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              Bill of Materials (BOM) & Component Recipe
            </CardTitle>
            <CardDescription className="text-xs">
              Complete deliverable assembled from multiple raw materials, hardware, and service components.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Component Item</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Qty</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3">Waste %</th>
                  <th className="py-3 px-3">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(!product.components || product.components.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No recipe components registered for this product (standard simple product).
                    </td>
                  </tr>
                ) : (
                  product.components.map((c, idx) => {
                    const lineCost = (Number(c.unit_cost) || 0) * (Number(c.quantity) || 1) * (1 + (Number(c.waste_percent || 0) / 100))
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{c.component_name}</td>
                        <td className="py-3 px-3 capitalize text-slate-500">{c.production_role || 'material'}</td>
                        <td className="py-3 px-3 font-mono">{c.quantity}</td>
                        <td className="py-3 px-3 font-mono uppercase">{c.unit}</td>
                        <td className="py-3 px-3 font-mono text-amber-600">{c.waste_percent || 0}%</td>
                        <td className="py-3 px-3 font-mono">৳{c.unit_cost}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">৳{lineCost.toFixed(2)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 6: SUPPLIER QUOTES */}
      {/* ======================================================== */}
      {activeTab === 'suppliers' && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Supplier-Specific Purchase Economics
            </CardTitle>
            <CardDescription className="text-xs">
              Multi-vendor procurement rates, lead times, and MOQ tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-3">Supplier Code / SKU</th>
                  <th className="py-3 px-3">Purchase Unit</th>
                  <th className="py-3 px-3">Purchase Price</th>
                  <th className="py-3 px-3">MOQ</th>
                  <th className="py-3 px-3">Lead Time</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {supplierPrices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No supplier-specific price quotes recorded. Default purchase price: ৳{product.purchase_price || 0}.
                    </td>
                  </tr>
                ) : (
                  supplierPrices.map((sp) => (
                    <tr key={sp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{sp.supplier_name}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{sp.notes || '-'}</td>
                      <td className="py-3 px-3 uppercase font-mono">{sp.purchase_unit}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">৳{sp.purchase_price}</td>
                      <td className="py-3 px-3 font-mono">{sp.moq || 1}</td>
                      <td className="py-3 px-3 font-mono">{sp.lead_time_days ? `${sp.lead_time_days} days` : '-'}</td>
                      <td className="py-3 px-4 text-right">
                        {sp.is_preferred ? (
                          <Badge className="bg-emerald-500 text-white text-[10px]">Preferred Vendor</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">Secondary</Badge>
                        )}
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
      {/* TAB 7: PRODUCTION RULES */}
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
      {/* TAB 8: VARIANTS */}
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
      {/* TAB 9: PRICE HISTORY & OVERRIDES */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-purple-600" />
                Price Adjustment Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable PostgreSQL log of catalog price revisions and commercial changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-3">Previous Price</th>
                    <th className="py-3 px-3">New Price</th>
                    <th className="py-3 px-3">Purchase Price</th>
                    <th className="py-3 px-4">Reason for Change</th>
                    <th className="py-3 px-3">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {priceHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
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
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {h.new_purchase_price ? `৳${h.new_purchase_price}` : '-'}
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

          {/* Overrides Audit Trail */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Low-Margin Quotation & Line Override Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Authorized salesperson discounts and low-margin price exceptions logged in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Catalog Price</th>
                    <th className="py-3 px-3">Overridden Price</th>
                    <th className="py-3 px-3">Standard Margin</th>
                    <th className="py-3 px-3">Overridden Margin</th>
                    <th className="py-3 px-4">Reason / Business Justification</th>
                    <th className="py-3 px-3">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {priceOverrides.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No quotation price overrides recorded for this product.
                      </td>
                    </tr>
                  ) : (
                    priceOverrides.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {po.created_at ? new Date(po.created_at).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono line-through text-slate-400">
                          ৳{po.original_price}
                        </td>
                        <td className="py-3 px-3 font-bold font-mono text-rose-600">
                          ৳{po.overridden_price}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {po.original_margin_percent ? `${po.original_margin_percent}%` : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-600">
                          {po.overridden_margin_percent ? `${po.overridden_margin_percent}%` : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {po.reason || 'Management approval'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{po.authorized_by || 'Manager'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: COMMERCIAL USAGE */}
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
        hideFooter={true}
        title={
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-base">Adjust Commercial Price & Tariffs</span>
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
              <span className="font-mono font-bold text-blue-600">৳{product.selling_price} / {product.selling_unit || product.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Minimum Floor Price:</span>
              <span className="font-mono font-bold text-amber-600">৳{product.min_price}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">New Purchase Price (৳)</Label>
              <Input
                type="number"
                step="1"
                value={newPurchasePrice}
                onChange={(e) => setNewPurchasePrice(Number(e.target.value))}
                className="text-xs h-9 font-mono font-semibold"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">New Selling Price (৳) <span className="text-rose-500">*</span></Label>
              <Input
                type="number"
                step="0.1"
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="text-xs h-9 font-mono font-bold text-blue-600"
                required
              />
            </div>
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
        hideFooter={true}
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
        hideFooter={true}
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

      {/* Edit Configuration Modals */}
      <MaterialConfigModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        onSave={handleSaveProductConfig}
        initialData={product}
      />

      <ServiceConfigModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSave={handleSaveProductConfig}
        initialData={product}
        machineries={machineries}
      />

      <ReadyProductModal
        isOpen={isReadyProductModalOpen}
        onClose={() => setIsReadyProductModalOpen(false)}
        onSave={handleSaveProductConfig}
        initialData={product}
      />

      <OutsourceProductModal
        isOpen={isOutsourceModalOpen}
        onClose={() => setIsOutsourceModalOpen(false)}
        onSave={handleSaveProductConfig}
        initialData={product}
      />
    </div>
  )
}

'use client'

import React, { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Package,
  Plus,
  Search,
  Tag,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Layers,
  Calculator,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Archive,
  Trash2,
  MoreHorizontal,
  FileSpreadsheet,
  Check,
  Building2,
  Clock,
  Wrench,
  Truck,
  Scissors,
  Sparkles,
  Share2,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import type { ProductRecord, ProductType, UnitOfMeasure, PricingMethod, ResolvedProductPrice } from '@/types/product.types'
import {
  getProductsAction,
  createProductAction,
  updateProductAction,
  updateProductPriceAction,
  archiveProductAction,
  deleteProductAction,
  checkProductDeletionSafetyAction,
  resolveProductCustomerPriceAction,
} from '@/actions/product.actions'
import { createQuotationAction } from '@/actions/quotation.actions'
import { calculateJobPricing, convertToFeet } from '@/lib/pricing-engine'
import { cn } from '@/lib/utils'

export default function ProductsCatalogPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id

  // Data state
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter & Search
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'low_margin' | 'archived'>('active')

  // Notification alert
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [pricingProduct, setPricingProduct] = useState<ProductRecord | null>(null)
  const [newPrice, setNewPrice] = useState<number>(0)
  const [priceReason, setPriceReason] = useState<string>('')
  const [deletingProduct, setDeletingProduct] = useState<ProductRecord | null>(null)
  const [deletionSafety, setDeletionSafety] = useState<{ isSafe: boolean; references: any; reason?: string } | null>(null)

  // Fast Quote Modal State
  const [fastQuoteProduct, setFastQuoteProduct] = useState<ProductRecord | null>(null)
  const [quoteCustomerName, setQuoteCustomerName] = useState('')
  const [quoteCustomerPhone, setQuoteCustomerPhone] = useState('')
  const [quoteWidth, setQuoteWidth] = useState<number>(10)
  const [quoteHeight, setQuoteHeight] = useState<number>(4)
  const [quoteDimUnit, setQuoteDimUnit] = useState<'ft' | 'inch' | 'm'>('ft')
  const [quoteQuantity, setQuoteQuantity] = useState<number>(1)
  const [quoteIncludeHemming, setQuoteIncludeHemming] = useState(true)
  const [quoteIncludeEyelets, setQuoteIncludeEyelets] = useState(true)
  const [quoteIncludeLamination, setQuoteIncludeLamination] = useState(false)
  const [quoteIncludeInstallation, setQuoteIncludeInstallation] = useState(false)
  const [quoteIncludeDelivery, setQuoteIncludeDelivery] = useState(false)
  const [quoteDiscountFlat, setQuoteDiscountFlat] = useState<number>(0)
  const [quoteDiscountPercent, setQuoteDiscountPercent] = useState<number>(0)
  const [quoteRateOverride, setQuoteRateOverride] = useState<number | null>(null)
  const [resolvedPriceInfo, setResolvedPriceInfo] = useState<ResolvedProductPrice | null>(null)
  const [createdQuoteNumber, setCreatedQuoteNumber] = useState<string | null>(null)

  // Form State for Create/Edit Modal
  const [formData, setFormData] = useState({
    name: '',
    name_bn: '',
    sku: '',
    category: 'flex_banner',
    product_type: 'print_service' as ProductType,
    unit: 'sft' as UnitOfMeasure,
    material_spec: '',
    dimensions_spec: '',
    description: '',
    description_bn: '',
    base_cost: 0,
    selling_price: 0,
    min_price: 0,
    tax_rate: 7.5,
    requires_design: false,
    requires_approval: false,
    requires_production: true,
    requires_fabrication: false,
    requires_finishing: false,
    requires_installation: false,
    requires_delivery: false,
    default_department: 'printing',
    estimated_production_time_hours: 4.0,
    default_finishing: '',
    production_instructions: '',
    internal_notes: '',
    target_margin_percent: 40.0,
    waste_factor_percent: 5.0,
  })

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4500)
  }

  // Load products authoritatively
  const loadProducts = async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await getProductsAction(companyId, false)
      if (res.success && res.data) {
        setProducts(res.data)
      } else {
        setFetchError(res.error || 'Failed to load catalog items from database.')
      }
    } catch (err: any) {
      setFetchError(err.message || 'Network error fetching products.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [companyId])

  // Handle open create modal
  const handleOpenCreate = () => {
    const check = checkCanCreate('max_products')
    if (!check.allowed) {
      openLimitExceededModal('max_products')
      return
    }
    setEditingProduct(null)
    setFormData({
      name: '',
      name_bn: '',
      sku: `PRD-${Date.now().toString().slice(-4)}`,
      category: 'flex_banner',
      product_type: 'print_service',
      unit: 'sft',
      material_spec: '',
      dimensions_spec: '',
      description: '',
      description_bn: '',
      base_cost: 12.0,
      selling_price: 20.0,
      min_price: 15.0,
      tax_rate: 7.5,
      requires_design: false,
      requires_approval: false,
      requires_production: true,
      requires_fabrication: false,
      requires_finishing: true,
      requires_installation: false,
      requires_delivery: false,
      default_department: 'printing',
      estimated_production_time_hours: 4.0,
      default_finishing: 'Standard Hemming & Eyelets',
      production_instructions: '',
      internal_notes: '',
      target_margin_percent: 40.0,
      waste_factor_percent: 5.0,
    })
    setIsCreateOpen(true)
  }

  // Handle open edit modal
  const handleOpenEdit = (p: ProductRecord) => {
    setEditingProduct(p)
    setFormData({
      name: p.name,
      name_bn: p.name_bn || '',
      sku: p.sku,
      category: p.category || 'flex_banner',
      product_type: p.product_type || 'print_service',
      unit: p.unit || 'sft',
      material_spec: p.material_spec || '',
      dimensions_spec: p.dimensions_spec || '',
      description: p.description || '',
      description_bn: p.description_bn || '',
      base_cost: Number(p.base_cost) || 0,
      selling_price: Number(p.selling_price) || 0,
      min_price: Number(p.min_price) || 0,
      tax_rate: Number(p.tax_rate) !== undefined ? Number(p.tax_rate) : 7.5,
      requires_design: Boolean(p.requires_design),
      requires_approval: Boolean(p.requires_approval),
      requires_production: p.requires_production !== undefined ? Boolean(p.requires_production) : true,
      requires_fabrication: Boolean(p.requires_fabrication),
      requires_finishing: Boolean(p.requires_finishing),
      requires_installation: Boolean(p.requires_installation),
      requires_delivery: Boolean(p.requires_delivery),
      default_department: p.default_department || 'printing',
      estimated_production_time_hours: Number(p.estimated_production_time_hours) || 4.0,
      default_finishing: p.default_finishing || '',
      production_instructions: p.production_instructions || '',
      internal_notes: p.internal_notes || '',
      target_margin_percent: p.pricing_formula?.default_margin_percent || 40.0,
      waste_factor_percent: p.pricing_formula?.waste_factor_percent || 5.0,
    })
    setIsCreateOpen(true)
  }

  // Handle Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.sku.trim()) {
      showNotification('Product Name and SKU are required.', 'error')
      return
    }

    startTransition(async () => {
      try {
        const payload: any = {
          name: formData.name.trim(),
          name_bn: formData.name_bn.trim() || null,
          sku: formData.sku.trim().toUpperCase(),
          category: formData.category,
          product_type: formData.product_type,
          unit: formData.unit,
          material_spec: formData.material_spec.trim() || null,
          dimensions_spec: formData.dimensions_spec.trim() || null,
          description: formData.description.trim() || null,
          description_bn: formData.description_bn.trim() || null,
          base_cost: Number(formData.base_cost) || 0,
          selling_price: Number(formData.selling_price) || 0,
          min_price: Number(formData.min_price) || 0,
          tax_rate: Number(formData.tax_rate) || 7.5,
          requires_design: formData.requires_design,
          requires_approval: formData.requires_approval,
          requires_production: formData.requires_production,
          requires_fabrication: formData.requires_fabrication,
          requires_finishing: formData.requires_finishing,
          requires_installation: formData.requires_installation,
          requires_delivery: formData.requires_delivery,
          default_department: formData.default_department,
          estimated_production_time_hours: Number(formData.estimated_production_time_hours) || 4,
          default_finishing: formData.default_finishing.trim() || null,
          production_instructions: formData.production_instructions.trim() || null,
          internal_notes: formData.internal_notes.trim() || null,
          pricing_formula: {
            model: 'dimensional_area',
            material_rate: Number(formData.base_cost) * 0.6,
            print_rate: Number(formData.base_cost) * 0.4,
            finishing_rate: 3,
            waste_factor_percent: Number(formData.waste_factor_percent) || 5.0,
            default_margin_percent: Number(formData.target_margin_percent) || 40.0,
          },
        }

        if (editingProduct) {
          const res = await updateProductAction(editingProduct.id, payload, companyId)
          if (!res.success) {
            showNotification(res.error || 'Failed to update product.', 'error')
            return
          }
          showNotification(`Updated product '${res.data?.name}'.`)
        } else {
          const res = await createProductAction(payload, companyId)
          if (!res.success) {
            showNotification(res.error || 'Failed to create product.', 'error')
            return
          }
          refreshUsage()
          showNotification(`Registered new product '${res.data?.name}' into catalog.`)
        }

        setIsCreateOpen(false)
        loadProducts()
      } catch (err: any) {
        showNotification(err.message || 'Database mutation failed.', 'error')
      }
    })
  }

  // Handle Price Adjustment
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pricingProduct) return
    if (!priceReason.trim()) {
      showNotification('Please provide an audit reason for this price change.', 'error')
      return
    }

    startTransition(async () => {
      try {
        const res = await updateProductPriceAction(pricingProduct.id, newPrice, priceReason, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to update price.', 'error')
          return
        }
        showNotification(`Price for '${pricingProduct.name}' updated to ৳${newPrice} with audit log.`)
        setPricingProduct(null)
        setPriceReason('')
        loadProducts()
      } catch (err: any) {
        showNotification(err.message || 'Price update failed.', 'error')
      }
    })
  }

  // Handle Archive / Restore
  const handleToggleArchive = async (p: ProductRecord) => {
    const isCurrentlyActive = p.is_active !== false
    startTransition(async () => {
      try {
        const res = await archiveProductAction(p.id, isCurrentlyActive, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to toggle archive status.', 'error')
          return
        }
        showNotification(`${isCurrentlyActive ? 'Archived' : 'Restored'} '${p.name}'.`)
        loadProducts()
      } catch (err: any) {
        showNotification(err.message || 'Failed to update status.', 'error')
      }
    })
  }

  // Check Deletion Safety & Open Delete Dialog
  const handleInitiateDelete = async (p: ProductRecord) => {
    setDeletingProduct(p)
    const safetyRes = await checkProductDeletionSafetyAction(p.id, companyId)
    if (safetyRes.success && safetyRes.data) {
      setDeletionSafety(safetyRes.data)
    } else {
      setDeletionSafety({ isSafe: false, references: { quotations: 1, invoices: 0, jobs: 0, customerRates: 0 }, reason: 'Could not verify references. Archiving is recommended.' })
    }
  }

  // Confirm Delete / Archive
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return
    startTransition(async () => {
      try {
        const res = await deleteProductAction(deletingProduct.id, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to delete product.', 'error')
          return
        }
        if (res.deletionResult?.archived) {
          showNotification(`Product archived safely because historical references exist.`)
        } else {
          showNotification(`Product '${deletingProduct.name}' permanently deleted.`)
        }
        setDeletingProduct(null)
        setDeletionSafety(null)
        loadProducts()
      } catch (err: any) {
        showNotification(err.message || 'Delete operation failed.', 'error')
      }
    })
  }

  // Open Fast Quote Modal
  const handleOpenFastQuote = async (p: ProductRecord) => {
    setFastQuoteProduct(p)
    setQuoteCustomerName('')
    setQuoteCustomerPhone('')
    setQuoteWidth(10)
    setQuoteHeight(4)
    setQuoteDimUnit('ft')
    setQuoteQuantity(1)
    setQuoteIncludeHemming(true)
    setQuoteIncludeEyelets(true)
    setQuoteIncludeLamination(false)
    setQuoteIncludeInstallation(false)
    setQuoteIncludeDelivery(false)
    setQuoteDiscountFlat(0)
    setQuoteDiscountPercent(0)
    setQuoteRateOverride(null)
    setCreatedQuoteNumber(null)

    // Resolve base price
    try {
      const priceRes = await resolveProductCustomerPriceAction(p.id, undefined, undefined, companyId)
      if (priceRes.success && priceRes.data) {
        setResolvedPriceInfo(priceRes.data)
      }
    } catch {}
  }

  // Fast Quote Live Calculation
  const fastQuoteCalculation = useMemo(() => {
    if (!fastQuoteProduct) return null

    const effectiveRate = quoteRateOverride !== null
      ? quoteRateOverride
      : (resolvedPriceInfo?.effectiveRate || fastQuoteProduct.selling_price || 0)

    const wFt = convertToFeet(quoteWidth, quoteDimUnit)
    const hFt = convertToFeet(quoteHeight, quoteDimUnit)
    const singleAreaSft = Math.round(wFt * hFt * 100) / 100
    const totalAreaSft = singleAreaSft * quoteQuantity
    const perimeterFt = 2 * (wFt + hFt) * quoteQuantity

    const printSubtotal = Math.round(totalAreaSft * effectiveRate)
    const hemmingCharge = quoteIncludeHemming ? Math.round(perimeterFt * 2.5) : 0
    const eyeletCount = quoteIncludeEyelets ? Math.max(4, Math.round(perimeterFt / 2.5)) : 0
    const eyeletCharge = quoteIncludeEyelets ? eyeletCount * 5 : 0
    const laminationCharge = quoteIncludeLamination ? Math.round(totalAreaSft * 8) : 0
    const installationCharge = quoteIncludeInstallation ? Math.max(500, Math.round(totalAreaSft * 12)) : 0
    const deliveryCharge = quoteIncludeDelivery ? 350 : 0

    const addonsTotal = hemmingCharge + eyeletCharge + laminationCharge + installationCharge + deliveryCharge
    const subtotal = printSubtotal + addonsTotal

    const discountAmount = Math.min(subtotal, quoteDiscountFlat + Math.round((subtotal * quoteDiscountPercent) / 100))
    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount)
    const vatAmount = Math.round((subtotalAfterDiscount * (fastQuoteProduct.tax_rate || 7.5)) / 100)
    const grandTotal = subtotalAfterDiscount + vatAmount

    // Estimated Cost & Profit
    const estCost = Math.round((totalAreaSft * (fastQuoteProduct.base_cost || 0)) + (hemmingCharge * 0.4) + (eyeletCharge * 0.4) + (laminationCharge * 0.5) + (installationCharge * 0.4))
    const estProfit = Math.max(0, subtotalAfterDiscount - estCost)
    const estMargin = subtotalAfterDiscount > 0 ? Math.round((estProfit / subtotalAfterDiscount) * 100) : 0

    return {
      singleAreaSft,
      totalAreaSft,
      perimeterFt,
      effectiveRate,
      printSubtotal,
      hemmingCharge,
      eyeletCharge,
      eyeletCount,
      laminationCharge,
      installationCharge,
      deliveryCharge,
      addonsTotal,
      subtotal,
      discountAmount,
      subtotalAfterDiscount,
      vatAmount,
      grandTotal,
      estCost,
      estProfit,
      estMargin,
      isBelowFloor: effectiveRate < (fastQuoteProduct.min_price || 0),
    }
  }, [
    fastQuoteProduct,
    quoteWidth,
    quoteHeight,
    quoteDimUnit,
    quoteQuantity,
    quoteRateOverride,
    resolvedPriceInfo,
    quoteIncludeHemming,
    quoteIncludeEyelets,
    quoteIncludeLamination,
    quoteIncludeInstallation,
    quoteIncludeDelivery,
    quoteDiscountFlat,
    quoteDiscountPercent,
  ])

  // Execute Quotation Creation from Fast Quote Modal
  const handleGenerateFastQuotation = async () => {
    if (!fastQuoteProduct || !fastQuoteCalculation) return
    if (!quoteCustomerName.trim() || !quoteCustomerPhone.trim()) {
      showNotification('Customer Name and Mobile Number are required to create a formal quotation.', 'error')
      return
    }

    startTransition(async () => {
      try {
        const finishingList: string[] = []
        if (quoteIncludeHemming) finishingList.push('Hemming & Tape')
        if (quoteIncludeEyelets) finishingList.push(`${fastQuoteCalculation.eyeletCount} Eyelets`)
        if (quoteIncludeLamination) finishingList.push('Thermal Lamination')
        if (quoteIncludeInstallation) finishingList.push('Site Installation')
        if (quoteIncludeDelivery) finishingList.push('Delivery Dispatch')

        const res = await createQuotationAction({
          customer_name: quoteCustomerName.trim(),
          customer_phone: quoteCustomerPhone.trim(),
          new_customer: {
            name: quoteCustomerName.trim(),
            mobile: quoteCustomerPhone.trim(),
            address: 'Dhaka, Bangladesh',
            save_customer: true,
          },
          items: [
            {
              id: `item-${Date.now()}`,
              product_id: fastQuoteProduct.id,
              description: `${fastQuoteProduct.name} (${quoteWidth}${quoteDimUnit} x ${quoteHeight}${quoteDimUnit})`,
              description_bn: fastQuoteProduct.name_bn || null,
              material_spec: fastQuoteProduct.material_spec || null,
              width: quoteWidth,
              height: quoteHeight,
              dimension_unit: quoteDimUnit,
              area_sft: fastQuoteCalculation.totalAreaSft,
              quantity: quoteQuantity,
              unit: fastQuoteProduct.unit || 'sft',
              unit_rate: fastQuoteCalculation.effectiveRate,
              rate_source: resolvedPriceInfo?.source === 'custom' ? 'custom' : 'default',
              finishing: finishingList.join(', ') || null,
              installation_required: quoteIncludeInstallation,
              material_cost: fastQuoteCalculation.estCost,
              item_total: fastQuoteCalculation.subtotal,
            },
          ],
          discount_amount: fastQuoteCalculation.discountAmount,
          vat_rate: fastQuoteProduct.tax_rate || 7.5,
          installation_required: quoteIncludeInstallation,
          notes: `Instant Fast Quote generated from Product Catalog for ${fastQuoteProduct.name}.`,
          language_mode: 'bilingual',
        }, companyId)

        if (!res.success || !res.data) {
          showNotification(res.error || 'Failed to generate quotation.', 'error')
          return
        }

        setCreatedQuoteNumber(res.data.quotation_number)
        showNotification(`Formal Quotation ${res.data.quotation_number} generated successfully!`)
      } catch (err: any) {
        showNotification(err.message || 'Error generating quotation.', 'error')
      }
    })
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.name_bn && p.name_bn.includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        (p.material_spec && p.material_spec.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))

      const matchCategory =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        p.product_type === selectedCategory

      const margin = p.selling_price > 0
        ? ((p.selling_price - p.base_cost) / p.selling_price) * 100
        : 0

      let matchStatus = true
      if (statusFilter === 'active') matchStatus = p.is_active !== false
      else if (statusFilter === 'archived') matchStatus = p.is_active === false
      else if (statusFilter === 'low_margin') matchStatus = margin < 20 && p.is_active !== false

      return matchSearch && matchCategory && matchStatus
    })
  }, [products, search, selectedCategory, statusFilter])

  // Business Owner Signal Metrics
  const metrics = useMemo(() => {
    const active = products.filter((p) => p.is_active !== false)
    const archived = products.filter((p) => p.is_active === false)
    const lowMargin = active.filter((p) => {
      const m = p.selling_price > 0 ? ((p.selling_price - p.base_cost) / p.selling_price) * 100 : 0
      return m < 20
    })
    const avgMargin = active.length > 0
      ? Math.round(
          active.reduce((acc, p) => {
            const m = p.selling_price > 0 ? ((p.selling_price - p.base_cost) / p.selling_price) * 100 : 0
            return acc + m
          }, 0) / active.length
        )
      : 0

    return {
      totalActive: active.length,
      totalArchived: archived.length,
      lowMarginCount: lowMargin.length,
      avgMargin,
    }
  }, [products])

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Header */}
      <PageHeader
        titleEn="Products & Services Catalog"
        titleBn="পণ্য ও সেবা ক্যাটালগ"
        descriptionEn="Commercial source of truth for print media, fabrication shop fees, installation tariffs, and floor cost benchmarks."
        descriptionBn="প্রিন্টিং মিডিয়া, সাইনেজ তৈরি, ইনস্টলেশন চার্জ এবং উৎপাদন খরচের সেন্ট্রাল মাস্টার।"
        icon={Package}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProducts}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Refresh
            </Button>

            <Link href={`/${slug}/pricing`}>
              <Button variant="outline" size="sm" className="text-xs bangla-text">
                <Calculator className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                {tBilingual('Live Estimator', 'লাইভ ক্যালকুলেটর')}
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs bangla-text shadow-sm"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Product / Service', 'নতুন পণ্য / সেবা')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div
          className={cn(
            'p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border shadow-xs transition-all animate-in fade-in-0',
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
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

      {/* Fetch Error Retry Banner */}
      {fetchError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadProducts} className="text-xs shrink-0">
            <RefreshCw className="mr-1.5 h-3 w-3" /> Retry Connection
          </Button>
        </div>
      )}

      {/* Business Owner Operational Signal Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 border-l-4 border-l-blue-600 bg-white dark:bg-slate-900/60 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Active Catalog Items</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.totalActive}
          </div>
          <span className="text-[11px] text-slate-400">Available for fast quotes</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900/60 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Average Catalog Margin</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {metrics.avgMargin}%
          </div>
          <span className="text-[11px] text-emerald-600/80 font-medium">Standard catalog markup</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900/60 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Low Margin Alert (&lt;20%)</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {metrics.lowMarginCount}
          </div>
          <span className="text-[11px] text-amber-600/80 font-medium">Review raw material cost</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-slate-400 bg-white dark:bg-slate-900/60 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Archived Items</span>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
            {metrics.totalArchived}
          </div>
          <span className="text-[11px] text-slate-400">Preserved historical references</span>
        </Card>
      </div>

      {/* Search, Category & Status Filters */}
      <Card className="p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by English name, বাংলা নাম, SKU, material spec..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-auto h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Categories (সকল ক্যাটাগরি)</option>
              <option value="flex_banner">Flex & Vinyl Banner</option>
              <option value="backlit_flex">Backlit Signage</option>
              <option value="vinyl_sticker">Vinyl & Stickers</option>
              <option value="rigid_board">Rigid Board Mounts</option>
              <option value="signage_3d">3D Letter & Signage</option>
              <option value="display_stand">Display & Standee</option>
              <option value="commercial_print">Visiting Card & Leaflet</option>
              <option value="print_service">Print Services</option>
              <option value="fabrication_service">Fabrication Services</option>
              <option value="installation_service">Installation Services</option>
              <option value="material">Raw Materials</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-full md:w-auto text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('active')}
              className={cn(
                'px-3 py-1 rounded-md transition-all',
                statusFilter === 'active' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
              )}
            >
              Active ({metrics.totalActive})
            </button>
            <button
              onClick={() => setStatusFilter('low_margin')}
              className={cn(
                'px-3 py-1 rounded-md transition-all',
                statusFilter === 'low_margin' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs' : 'text-slate-500'
              )}
            >
              Low Margin ({metrics.lowMarginCount})
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={cn(
                'px-3 py-1 rounded-md transition-all',
                statusFilter === 'archived' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500'
              )}
            >
              Archived ({metrics.totalArchived})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-3 py-1 rounded-md transition-all',
                statusFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500'
              )}
            >
              All
            </button>
          </div>
        </div>
      </Card>

      {/* Catalog Table & Mobile Cards */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Catalog Master Items</span>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {filteredProducts.length}
              </Badge>
            </CardTitle>
            <span className="text-xs text-slate-400">PostgreSQL Authoritative Tariff & Specifications</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredProducts.length === 0 && (
            <div className="p-12 text-center space-y-3">
              <Package className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Products Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No catalog items matched your current filter criteria. Create a new product or reset your search.
              </p>
              <Button size="sm" onClick={handleOpenCreate} className="mt-2 text-xs bg-blue-600 hover:bg-blue-700">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add New Item
              </Button>
            </div>
          )}

          {/* Desktop Table View */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3">Base Cost</th>
                    <th className="py-3 px-3">Selling Rate</th>
                    <th className="py-3 px-3">Floor Price</th>
                    <th className="py-3 px-3">Gross Margin</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.map((item) => {
                    const marginPercent =
                      item.selling_price > 0
                        ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 100)
                        : 0

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        {/* Item & SKU */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/${slug}/products/${item.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 flex items-center gap-1.5 group"
                          >
                            <span>{item.name}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                          </Link>
                          {item.name_bn && (
                            <div className="text-xs text-slate-500 font-medium font-bengali">{item.name_bn}</div>
                          )}
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {item.sku} {item.material_spec ? `• ${item.material_spec}` : ''}
                          </div>
                        </td>

                        {/* Product Type */}
                        <td className="py-3.5 px-3">
                          <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                            {item.product_type?.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Unit */}
                        <td className="py-3.5 px-3">
                          <span className="uppercase font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            {item.unit}
                          </span>
                        </td>

                        {/* Base Cost */}
                        <td className="py-3.5 px-3 text-xs font-medium text-slate-500">
                          <CurrencyDisplay amount={item.base_cost} />
                        </td>

                        {/* Selling Rate */}
                        <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                          <CurrencyDisplay amount={item.selling_price} />
                          <span className="text-xs font-normal text-slate-400">/{item.unit}</span>
                        </td>

                        {/* Min Price Floor */}
                        <td className="py-3.5 px-3 text-xs text-amber-700 dark:text-amber-400 font-medium">
                          <CurrencyDisplay amount={item.min_price} />
                        </td>

                        {/* Gross Margin */}
                        <td className="py-3.5 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border',
                              marginPercent >= 35
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                                : marginPercent >= 20
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                            )}
                          >
                            {marginPercent}%
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {item.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Archived
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Fast Quote Button */}
                            <Button
                              size="sm"
                              onClick={() => handleOpenFastQuote(item)}
                              className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                            >
                              <Calculator className="h-3 w-3 mr-1" />
                              Quote
                            </Button>

                            {/* Adjust Price Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPricingProduct(item)
                                setNewPrice(item.selling_price)
                              }}
                              className="h-7 text-xs px-2"
                              title="Adjust selling price with audit log"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Price
                            </Button>

                            {/* Edit Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(item)}
                              className="h-7 text-xs px-2"
                            >
                              Edit
                            </Button>

                            {/* Archive / Restore */}
                            {item.is_active !== false ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleArchive(item)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                title="Archive Product"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleArchive(item)}
                                className="h-7 text-xs px-2 text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
                                title="Restore Product"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Restore
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleInitiateDelete(item)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete Item"
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
          )}

          {/* Mobile Card View (390 x 844) */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((item) => {
                const marginPercent =
                  item.selling_price > 0
                    ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 100)
                    : 0

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/${slug}/products/${item.id}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600"
                        >
                          {item.name}
                        </Link>
                        {item.name_bn && (
                          <div className="text-xs text-slate-500 font-medium font-bengali">{item.name_bn}</div>
                        )}
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {item.sku} • {item.material_spec || 'Standard Spec'}
                        </div>
                      </div>
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 shrink-0">
                        {item.product_type?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Selling Rate</span>
                        <div className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          ৳{item.selling_price}/{item.unit}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Base Cost</span>
                        <div className="font-mono text-xs text-slate-500">
                          ৳{item.base_cost}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 uppercase block">Margin</span>
                        <div className="font-mono font-bold text-xs text-emerald-600">
                          {marginPercent}%
                        </div>
                      </div>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {item.is_active !== false ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenFastQuote(item)}
                          className="flex-1 h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        >
                          <Calculator className="h-3.5 w-3.5 mr-1" /> Fast Quote
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleToggleArchive(item)}
                          className="flex-1 h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restore Item
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPricingProduct(item)
                          setNewPrice(item.selling_price)
                        }}
                        className="h-9 px-3 text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Price
                      </Button>
                      <Link
                        href={`/${slug}/products/${item.id}`}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* MODAL 1: FAST QUOTE DIRECTLY FROM PRODUCT */}
      {/* ======================================================== */}
      <ModalDialog
        open={Boolean(fastQuoteProduct)}
        onOpenChange={(open) => !open && setFastQuoteProduct(null)}
        size="2xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  Fast Estimate & Quotation
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                  Instant Quote
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                {fastQuoteProduct?.name} ({fastQuoteProduct?.sku})
              </p>
            </div>
          </div>
        }
      >
        {fastQuoteProduct && fastQuoteCalculation && (
          <div className="space-y-4 pt-1">
            {/* Created Confirmation Banner */}
            {createdQuoteNumber && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-900">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Quotation Created: {createdQuoteNumber}</span>
                </div>
                <p className="text-xs text-emerald-800">
                  The quotation has been saved authoritatively in PostgreSQL and can now be dispatched to the client.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link href={`/${slug}/quotations`}>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                      View in Quotations Module
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => setCreatedQuoteNumber(null)} className="text-xs">
                    Create Another
                  </Button>
                </div>
              </div>
            )}

            {!createdQuoteNumber && (
              <>
                {/* Customer Details */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 space-y-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    1. Customer Information
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Customer / Company Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. ABC Advertising Ltd"
                        value={quoteCustomerName}
                        onChange={(e) => setQuoteCustomerName(e.target.value)}
                        className="text-xs h-9"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. 01711223344"
                        value={quoteCustomerPhone}
                        onChange={(e) => setQuoteCustomerPhone(e.target.value)}
                        className="text-xs h-9"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensions & Quantity */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 space-y-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    2. Dimensions & Quantity
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Width</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={quoteWidth}
                        onChange={(e) => setQuoteWidth(Math.max(0.1, Number(e.target.value)))}
                        className="text-xs h-9 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Height</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={quoteHeight}
                        onChange={(e) => setQuoteHeight(Math.max(0.1, Number(e.target.value)))}
                        className="text-xs h-9 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Unit</Label>
                      <select
                        value={quoteDimUnit}
                        onChange={(e) => setQuoteDimUnit(e.target.value as any)}
                        className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium"
                      >
                        <option value="ft">Feet (ft)</option>
                        <option value="inch">Inches (in)</option>
                        <option value="m">Meters (m)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Quantity (Pcs)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quoteQuantity}
                        onChange={(e) => setQuoteQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-xs h-9 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Calculated Billable Area:</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                      {fastQuoteCalculation.singleAreaSft} SFT × {quoteQuantity} pcs = {fastQuoteCalculation.totalAreaSft} SFT
                    </span>
                  </div>
                </div>

                {/* Add-ons & Finishing */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 space-y-2.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    3. Finishing & Reusable Add-ons
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={quoteIncludeHemming}
                        onChange={(e) => setQuoteIncludeHemming(e.target.checked)}
                        className="rounded"
                      />
                      <span>Hemming (৳{fastQuoteCalculation.hemmingCharge})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={quoteIncludeEyelets}
                        onChange={(e) => setQuoteIncludeEyelets(e.target.checked)}
                        className="rounded"
                      />
                      <span>Eyelets ({fastQuoteCalculation.eyeletCount} pcs - ৳{fastQuoteCalculation.eyeletCharge})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={quoteIncludeLamination}
                        onChange={(e) => setQuoteIncludeLamination(e.target.checked)}
                        className="rounded"
                      />
                      <span>Lamination (৳{fastQuoteCalculation.laminationCharge})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={quoteIncludeInstallation}
                        onChange={(e) => setQuoteIncludeInstallation(e.target.checked)}
                        className="rounded"
                      />
                      <span>Installation (৳{fastQuoteCalculation.installationCharge})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={quoteIncludeDelivery}
                        onChange={(e) => setQuoteIncludeDelivery(e.target.checked)}
                        className="rounded"
                      />
                      <span>Delivery (৳{fastQuoteCalculation.deliveryCharge})</span>
                    </label>
                  </div>
                </div>

                {/* Instant Financial Calculation Readout */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 p-4 space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      Print Subtotal ({fastQuoteCalculation.totalAreaSft} SFT @ ৳{fastQuoteCalculation.effectiveRate}):
                    </span>
                    <span className="font-mono font-semibold">৳{fastQuoteCalculation.printSubtotal}</span>
                  </div>

                  {fastQuoteCalculation.addonsTotal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Finishing & Service Add-ons:</span>
                      <span className="font-mono font-semibold">৳{fastQuoteCalculation.addonsTotal}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">VAT ({fastQuoteProduct.tax_rate || 7.5}%):</span>
                    <span className="font-mono">৳{fastQuoteCalculation.vatAmount}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Quotation Total:</span>
                      <span className="text-[11px] text-emerald-600 font-semibold">
                        Est. Cost: ৳{fastQuoteCalculation.estCost} • Profit: ৳{fastQuoteCalculation.estProfit} ({fastQuoteCalculation.estMargin}%)
                      </span>
                    </div>
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                      ৳{fastQuoteCalculation.grandTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFastQuoteProduct(null)}
                    className="w-full sm:w-auto text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGenerateFastQuotation}
                    disabled={isPending}
                    className="w-full sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm"
                  >
                    {isPending ? 'Generating Quotation...' : 'Create Formal Quotation'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </ModalDialog>

      {/* ======================================================== */}
      {/* MODAL 2: CREATE / EDIT PRODUCT (4 CLEAN SECTIONS) */}
      {/* ======================================================== */}
      <ModalDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        size="3xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {editingProduct ? 'Edit Catalog Item' : tBilingual('Register New Product / Tariff', 'নতুন প্রোডাক্ট / রেট যোগ করুন')}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                  PostgreSQL Master
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Configure printing media, fabrication item, or service rates
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 pt-1">
          {/* Section 1: Item Identity */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Item Identity', 'আইটেমের বিবরণ')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Product / Service Name (English) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Star Flex Banner 320 GSM"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Item Name (Bangla)
                </Label>
                <Input
                  placeholder="যেমন: স্টার ফ্লেক্স ব্যানার"
                  value={formData.name_bn}
                  onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                  className="text-xs h-9 font-bengali"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  SKU / Item Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="PRD-FLX-01"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="text-xs h-9 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Category
                </Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                >
                  <option value="flex_banner">Flex Banner</option>
                  <option value="backlit_flex">Backlit Flex</option>
                  <option value="vinyl_sticker">Vinyl Sticker</option>
                  <option value="rigid_board">Rigid Board Mount</option>
                  <option value="signage_3d">3D Letter Signage</option>
                  <option value="display_stand">Display Standee</option>
                  <option value="commercial_print">Commercial Print / Cards</option>
                  <option value="general_print">General Print Service</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Product Type
                </Label>
                <select
                  value={formData.product_type}
                  onChange={(e) => setFormData({ ...formData, product_type: e.target.value as ProductType })}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                >
                  <option value="print_service">Print Service</option>
                  <option value="fabrication_service">Fabrication Service</option>
                  <option value="installation_service">Installation Service</option>
                  <option value="finished_product">Finished Product</option>
                  <option value="material">Raw Material</option>
                  <option value="custom_job">Custom Job</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Selling & Unit Configuration */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Selling & Tariff Configuration
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Billing Unit <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitOfMeasure })}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium uppercase font-mono"
                >
                  <option value="sft">Square Feet (sft)</option>
                  <option value="pcs">Piece (pcs)</option>
                  <option value="rft">Running Feet (rft)</option>
                  <option value="inch">Inch (inch)</option>
                  <option value="meter">Meter (m)</option>
                  <option value="sheet">Sheet</option>
                  <option value="roll">Roll</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="ltr">Liter (ltr)</option>
                  <option value="hr">Labor Hour (hr)</option>
                  <option value="set">Set</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Selling Rate (৳ BDT) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.selling_price || ''}
                  onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                  className="text-xs h-9 font-mono font-bold text-blue-600"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Base Cost (COGS) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.base_cost || ''}
                  onChange={(e) => setFormData({ ...formData, base_cost: Number(e.target.value) })}
                  className="text-xs h-9 font-mono font-semibold"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Min Floor Price <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.min_price || ''}
                  onChange={(e) => setFormData({ ...formData, min_price: Number(e.target.value) })}
                  className="text-xs h-9 font-mono font-semibold text-amber-600"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Production & Workflow Rules */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Production & Workflow Requirements
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Material Specification</Label>
                <Input
                  placeholder="e.g. 280 GSM Frontlit Chinese Media"
                  value={formData.material_spec}
                  onChange={(e) => setFormData({ ...formData, material_spec: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Default Department</Label>
                <select
                  value={formData.default_department}
                  onChange={(e) => setFormData({ ...formData, default_department: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                >
                  <option value="printing">Large Format Printing</option>
                  <option value="fabrication">Metal / Acrylic Fabrication</option>
                  <option value="finishing">Finishing & Binding</option>
                  <option value="design">Pre-Press & Design</option>
                  <option value="installation">Site Installation</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.requires_design}
                  onChange={(e) => setFormData({ ...formData, requires_design: e.target.checked })}
                  className="rounded"
                />
                <span>Requires Design</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.requires_approval}
                  onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  className="rounded"
                />
                <span>Requires Approval</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.requires_finishing}
                  onChange={(e) => setFormData({ ...formData, requires_finishing: e.target.checked })}
                  className="rounded"
                />
                <span>Requires Finishing</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.requires_installation}
                  onChange={(e) => setFormData({ ...formData, requires_installation: e.target.checked })}
                  className="rounded"
                />
                <span>Requires Installation</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.requires_delivery}
                  onChange={(e) => setFormData({ ...formData, requires_delivery: e.target.checked })}
                  className="rounded"
                />
                <span>Requires Delivery</span>
              </label>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm"
            >
              {isPending ? 'Saving...' : editingProduct ? 'Update Product' : 'Register Product'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* ======================================================== */}
      {/* MODAL 3: ADJUST PRICE WITH MANDATORY AUDIT REASON */}
      {/* ======================================================== */}
      <ModalDialog
        open={Boolean(pricingProduct)}
        onOpenChange={(open) => !open && setPricingProduct(null)}
        size="lg"
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  Adjust Catalog Selling Price
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                  Audit Logged
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                {pricingProduct?.name} ({pricingProduct?.sku})
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleUpdatePrice} className="space-y-4 pt-1">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Current Base Cost:</span>
              <span className="font-mono font-bold">৳{pricingProduct?.base_cost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Current Selling Price:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                ৳{pricingProduct?.selling_price} / {pricingProduct?.unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Minimum Floor Price:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                ৳{pricingProduct?.min_price}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                New Selling Price (৳ BDT / {pricingProduct?.unit}) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.1"
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="text-xs h-9 font-mono font-bold text-blue-600 dark:text-blue-400"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Reason for Price Adjustment (Audit Trail) <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Raw solvent media and ink import duty increase"
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPricingProduct(null)}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
            >
              {isPending ? 'Logging Price...' : 'Save & Log Audit History'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* ======================================================== */}
      {/* MODAL 4: DELETE / ARCHIVE SAFETY CONFIRMATION */}
      {/* ======================================================== */}
      <ModalDialog
        open={Boolean(deletingProduct)}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
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
            Are you sure you want to remove <strong>{deletingProduct?.name}</strong> ({deletingProduct?.sku})?
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeletingProduct(null)
                setDeletionSafety(null)
              }}
              className="text-xs"
            >
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

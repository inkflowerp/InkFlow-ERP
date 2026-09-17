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
  Percent,
  Coins,
  Scale,
  Boxes,
  HelpCircle,
  ShieldCheck,
  Building,
  UserCheck,
  ListPlus,
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  Hammer,
  Palette,
  Info,
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
import type {
  ProductRecord,
  ProductType,
  UnitOfMeasure,
  PricingMethod,
  ResolvedProductPrice,
  CommercialProductType,
  MeasurementType,
  ProductComponent,
  ProductPriceTiers,
  ProductCostBreakdown,
  ProductSupplierPriceRecord,
  CostBasisType,
} from '@/types/product.types'
import {
  getProductsAction,
  createProductAction,
  updateProductAction,
  updateProductPriceAction,
  archiveProductAction,
  deleteProductAction,
  checkProductDeletionSafetyAction,
  resolveProductCustomerPriceAction,
  getProductSupplierPricesAction,
  saveProductSupplierPriceAction,
  deleteProductSupplierPriceAction,
  getPriceOverridesAction,
} from '@/actions/product.actions'
import { getCategoriesAction } from '@/actions/category.actions'
import { CategoryModal } from '@/components/categories/category-modal'
import { EntityTypeSelectorModal } from '@/components/products/entity-type-selector-modal'
import { ReadyProductModal } from '@/components/products/ready-product-modal'
import { ServiceConfigModal } from '@/components/products/service-config-modal'
import { MaterialConfigModal } from '@/components/products/material-config-modal'
import { PrintingMethodModal } from '@/components/products/printing-method-modal'
import { FinishingOptionModal } from '@/components/products/finishing-option-modal'
import { AdditionalOptionModal } from '@/components/products/additional-option-modal'
import { InstallationOptionModal } from '@/components/products/installation-option-modal'
import {
  getPrintingMethodsAction,
  savePrintingMethodAction,
  deletePrintingMethodAction,
  getFinishingOptionsAction,
  saveFinishingOptionAction,
  deleteFinishingOptionAction,
  getAdditionalOptionsAction,
  saveAdditionalOptionAction,
  deleteAdditionalOptionAction,
  getInstallationOptionsAction,
  saveInstallationOptionAction,
  deleteInstallationOptionAction,
} from '@/actions/configuration-masters.actions'
import type {
  PrintingMethod,
  FinishingOptionRecord,
  AdditionalOptionRecord,
  InstallationOptionRecord,
} from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { createQuotationAction } from '@/actions/quotation.actions'
import { convertToFeet } from '@/lib/pricing-engine'
import {
  calculateEffectiveUnitCost,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  applyMinimumCharge,
  calculateCommercialPricing,
  normalizePricingMethod,
  COMMERCIAL_PRODUCT_TYPES,
  MEASUREMENT_TYPES,
  COMMON_PURCHASE_UNITS,
  COMMON_SELLING_UNITS,
  PRICING_METHODS,
  PRICING_METHOD_OPTIONS,
} from '@/lib/units'
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
  const [selectedType, setSelectedType] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'low_margin' | 'archived'>('active')
  const [entityTypeFilter, setEntityTypeFilter] = useState<'all' | 'product' | 'service' | 'material' | 'finishing' | 'additional' | 'installation' | 'printing_methods'>('all')

  // Notification alert
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Configuration Masters State
  const [printingMethods, setPrintingMethods] = useState<PrintingMethod[]>([])
  const [finishingOptions, setFinishingOptions] = useState<FinishingOptionRecord[]>([])
  const [additionalOptions, setAdditionalOptions] = useState<AdditionalOptionRecord[]>([])
  const [installationOptions, setInstallationOptions] = useState<InstallationOptionRecord[]>([])

  // Rebuilt V3 Modals State
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false)
  const [isReadyProductModalOpen, setIsReadyProductModalOpen] = useState(false)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)

  // Configuration Master Modals State
  const [isPrintingMethodModalOpen, setIsPrintingMethodModalOpen] = useState(false)
  const [editingPrintingMethod, setEditingPrintingMethod] = useState<PrintingMethod | null>(null)
  const [isFinishingModalOpen, setIsFinishingModalOpen] = useState(false)
  const [editingFinishing, setEditingFinishing] = useState<FinishingOptionRecord | null>(null)
  const [isAdditionalModalOpen, setIsAdditionalModalOpen] = useState(false)
  const [editingAdditional, setEditingAdditional] = useState<AdditionalOptionRecord | null>(null)
  const [isInstallationModalOpen, setIsInstallationModalOpen] = useState(false)
  const [editingInstallation, setEditingInstallation] = useState<InstallationOptionRecord | null>(null)

  // Legacy modal state fallback
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formTab, setFormTab] = useState<'basic' | 'units' | 'pricing' | 'costing' | 'components' | 'suppliers' | 'production' | 'advanced'>('basic')
  const [expandedSections, setExpandedSections] = useState<{
    purchasing?: boolean
    production?: boolean
    minimums?: boolean
    costing?: boolean
    components?: boolean
  }>({})

  const toggleSection = (key: 'purchasing' | 'production' | 'minimums' | 'costing' | 'components') => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [pricingProduct, setPricingProduct] = useState<ProductRecord | null>(null)
  const [newPrice, setNewPrice] = useState<number>(0)
  const [newPurchasePrice, setNewPurchasePrice] = useState<number>(0)
  const [newTargetMargin, setNewTargetMargin] = useState<number>(35)
  const [newWastage, setNewWastage] = useState<number>(0)
  const [priceReason, setPriceReason] = useState<string>('')
  const [deletingProduct, setDeletingProduct] = useState<ProductRecord | null>(null)
  const [deletionSafety, setDeletionSafety] = useState<{ isSafe: boolean; references: any; reason?: string } | null>(null)

  // Supplier quote state
  const [supplierPrices, setSupplierPrices] = useState<ProductSupplierPriceRecord[]>([])
  const [newSupplier, setNewSupplier] = useState({
    supplier_name: '',
    supplier_sku: '',
    purchase_unit: 'roll',
    conversion_ratio: 1640,
    purchase_price: 8500,
    moq: 1,
    lead_time_days: 2,
    notes: '',
  })

  // Component recipe state
  const [newComponent, setNewComponent] = useState<ProductComponent>({
    component_product_id: '',
    name: '',
    quantity: 1,
    unit: 'pcs',
    waste_percent: 0,
    cost_contribution: 0,
    is_required: true,
    production_role: 'material',
  })

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
    commercial_type: 'production_product' as CommercialProductType,
    measurement_type: 'area' as MeasurementType,
    pricing_method: 'per_area' as PricingMethod,
    purchase_unit: 'roll',
    purchase_price: 8500,
    selling_unit: 'sft',
    conversion_ratio: 1640,
    production_unit: 'sft',
    default_wastage_percentage: 5.0,
    target_margin_percentage: 40.0,
    minimum_charge: 0,
    min_order_quantity: 1.0,
    min_billable_quantity: 0,
    allow_manual_override: true,
    min_allowed_margin_percent: 15.0,
    price_tiers: {
      retail: 28,
      corporate: 26,
      dealer: 24,
      wholesale: 22,
      custom: 0,
    } as ProductPriceTiers,
    cost_breakdown: {
      material: 5.46,
      ink: 0,
      labor: 0,
      machine: 0,
      finishing: 0,
      fabrication: 0,
      installation: 0,
      delivery: 0,
      other_direct_cost: 0,
    } as ProductCostBreakdown,
    components: [] as ProductComponent[],
    vat_applicable: false,
    is_tax_inclusive: false,
    roll_width_ft: 10,
    roll_length_ft: 164,
    sheet_width_ft: 4,
    sheet_length_ft: 8,
    unit: 'sft' as UnitOfMeasure,
    material_spec: '',
    dimensions_spec: '',
    description: '',
    description_bn: '',
    base_cost: 5.46,
    selling_price: 28.0,
    min_price: 22.0,
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

  // Category State
  const [categories, setCategories] = useState<ProductCategoryRecord[]>([])
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategoryRecord | null>(null)

  const loadCategories = async () => {
    try {
      const res = await getCategoriesAction(companyId, false)
      if (res.success && res.data) {
        setCategories(res.data)
      }
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }

  // Load configuration masters
  const loadPrintingMethods = async () => {
    try {
      const data = await getPrintingMethodsAction()
      if (data) setPrintingMethods(data)
    } catch (err) {
      console.error('Failed to load printing methods', err)
    }
  }

  const loadFinishingOptions = async () => {
    try {
      const data = await getFinishingOptionsAction()
      if (data) setFinishingOptions(data)
    } catch (err) {
      console.error('Failed to load finishing options', err)
    }
  }

  const loadAdditionalOptions = async () => {
    try {
      const data = await getAdditionalOptionsAction()
      if (data) setAdditionalOptions(data)
    } catch (err) {
      console.error('Failed to load additional options', err)
    }
  }

  const loadInstallationOptions = async () => {
    try {
      const data = await getInstallationOptionsAction()
      if (data) setInstallationOptions(data)
    } catch (err) {
      console.error('Failed to load installation options', err)
    }
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
    loadPrintingMethods()
    loadFinishingOptions()
    loadAdditionalOptions()
    loadInstallationOptions()
  }, [companyId])

  // Handlers for Configuration Masters
  const handleSavePrintingMethod = async (data: Partial<PrintingMethod>) => {
    const res = await savePrintingMethodAction({ ...data, id: editingPrintingMethod?.id })
    if (res) {
      showNotification(`Printing method '${data.name}' saved successfully.`)
      await loadPrintingMethods()
    }
  }

  const handleDeletePrintingMethod = async (id: string) => {
    const res = await deletePrintingMethodAction(id)
    if (res) {
      showNotification('Printing method deleted.')
      await loadPrintingMethods()
    }
  }

  const handleSaveFinishingOption = async (data: Partial<FinishingOptionRecord>) => {
    const res = await saveFinishingOptionAction({ ...data, id: editingFinishing?.id })
    if (res) {
      showNotification(`Finishing option '${data.name}' saved.`)
      await loadFinishingOptions()
    }
  }

  const handleDeleteFinishingOption = async (id: string) => {
    const res = await deleteFinishingOptionAction(id)
    if (res) {
      showNotification('Finishing option deleted.')
      await loadFinishingOptions()
    }
  }

  const handleSaveAdditionalOption = async (data: Partial<AdditionalOptionRecord>) => {
    const res = await saveAdditionalOptionAction({ ...data, id: editingAdditional?.id })
    if (res) {
      showNotification(`Additional option '${data.name}' saved.`)
      await loadAdditionalOptions()
    }
  }

  const handleDeleteAdditionalOption = async (id: string) => {
    const res = await deleteAdditionalOptionAction(id)
    if (res) {
      showNotification('Additional option deleted.')
      await loadAdditionalOptions()
    }
  }

  const handleSaveInstallationOption = async (data: Partial<InstallationOptionRecord>) => {
    const res = await saveInstallationOptionAction({ ...data, id: editingInstallation?.id })
    if (res) {
      showNotification(`Installation option '${data.name}' saved.`)
      await loadInstallationOptions()
    }
  }

  const handleDeleteInstallationOption = async (id: string) => {
    const res = await deleteInstallationOptionAction(id)
    if (res) {
      showNotification('Installation option deleted.')
      await loadInstallationOptions()
    }
  }

  const handleSelectEntityType = (type: 'product' | 'service' | 'material' | 'finishing' | 'additional' | 'installation' | 'printing_method') => {
    setEditingProduct(null)
    if (type === 'product') {
      setIsReadyProductModalOpen(true)
    } else if (type === 'service') {
      setIsServiceModalOpen(true)
    } else if (type === 'material') {
      setIsMaterialModalOpen(true)
    } else if (type === 'printing_method') {
      setEditingPrintingMethod(null)
      setIsPrintingMethodModalOpen(true)
    } else if (type === 'finishing') {
      setEditingFinishing(null)
      setIsFinishingModalOpen(true)
    } else if (type === 'additional') {
      setEditingAdditional(null)
      setIsAdditionalModalOpen(true)
    } else if (type === 'installation') {
      setEditingInstallation(null)
      setIsInstallationModalOpen(true)
    }
  }

  // Computed live commercial numbers for create/edit modal
  const liveCommercialMath = useMemo(() => {
    const isService =
      formData.commercial_type === 'service' ||
      formData.commercial_type === 'installation' ||
      formData.commercial_type === 'delivery' ||
      formData.measurement_type === 'job'

    const purchasePrice = isService ? 0 : Number(formData.purchase_price) || 0
    const conversionRatio = Math.max(0.0001, Number(formData.conversion_ratio) || 1.0)
    const wastage = isService ? 0 : Math.max(0, Number(formData.default_wastage_percentage) || 0)
    const targetMargin = Number(formData.target_margin_percentage) || 35.0
    const currentSellingPrice = Number(formData.selling_price) || 0

    let effectiveMaterialCost = Number(formData.base_cost) || 0
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

    // Direct cost breakdown sum
    const cb = formData.cost_breakdown || {}
    const extraDirectCost =
      (Number(cb.ink) || 0) +
      (Number(cb.labor) || 0) +
      (Number(cb.machine) || 0) +
      (Number(cb.finishing) || 0) +
      (Number(cb.fabrication) || 0) +
      (Number(cb.installation) || 0) +
      (Number(cb.delivery) || 0) +
      (Number(cb.other_direct_cost) || 0)

    // Components cost rollup (if any)
    const componentsCost = (formData.components || []).reduce((acc, c) => {
      const cCost = Number(c.cost_contribution) || 0
      const cQty = Number(c.quantity) || 1
      const cWaste = Number(c.waste_percent) || 0
      return acc + (cCost * cQty * (1 + cWaste / 100))
    }, 0)

    const totalDirectCost = effectiveMaterialCost + extraDirectCost + componentsCost
    const costBasisType: CostBasisType = (extraDirectCost > 0 || componentsCost > 0) ? 'direct_cost' : 'material'
    const costBasis = costBasisType === 'direct_cost' ? totalDirectCost : effectiveMaterialCost

    const suggestedSellingPrice = calculateSuggestedSellingPrice(costBasis, targetMargin)
    const marginCalc = calculateGrossMargin(costBasis, currentSellingPrice)

    return {
      isService,
      usableUnits: Math.round(usableUnits * 100) / 100,
      effectiveMaterialCost: Math.round(effectiveMaterialCost * 100) / 100,
      extraDirectCost: Math.round(extraDirectCost * 100) / 100,
      componentsCost: Math.round(componentsCost * 100) / 100,
      totalDirectCost: Math.round(totalDirectCost * 100) / 100,
      costBasisType,
      costBasis: Math.round(costBasis * 100) / 100,
      suggestedSellingPrice,
      grossProfit: marginCalc.grossProfit,
      grossMarginPercent: marginCalc.grossMarginPercent,
    }
  }, [
    formData.commercial_type,
    formData.measurement_type,
    formData.purchase_price,
    formData.conversion_ratio,
    formData.default_wastage_percentage,
    formData.target_margin_percentage,
    formData.selling_price,
    formData.base_cost,
    formData.cost_breakdown,
    formData.components,
  ])

  // Load supplier prices when editing
  const loadSupplierPrices = async (prodId: string) => {
    try {
      const res = await getProductSupplierPricesAction(prodId, companyId)
      if (res.success && res.data) {
        setSupplierPrices(res.data)
      } else {
        setSupplierPrices([])
      }
    } catch {
      setSupplierPrices([])
    }
  }

  // Product Type and Pricing Definition Cards
  const PRODUCT_TYPE_CARDS = [
    {
      type: 'production_product' as CommercialProductType,
      label: 'Product',
      label_bn: 'পণ্য',
      description: 'Physical item that you sell or produce',
      icon: Package,
    },
    {
      type: 'service' as CommercialProductType,
      label: 'Service',
      label_bn: 'সেবা',
      description: 'A service such as design, installation, delivery, etc.',
      icon: Sparkles,
    },
    {
      type: 'material' as CommercialProductType,
      label: 'Material',
      label_bn: 'কাঁচামাল',
      description: 'Raw material or substrate stock item',
      icon: Layers,
    },
    {
      type: 'finishing' as CommercialProductType,
      label: 'Finishing',
      label_bn: 'ফিনিশিং',
      description: 'Lamination, eyelet, binding, cutting, etc.',
      icon: Scissors,
    },
    {
      type: 'fabrication' as CommercialProductType,
      label: 'Fabrication',
      label_bn: 'ফেব্রিকেশন',
      description: 'Fabrication work such as acrylic, metal, ACP',
      icon: Wrench,
    },
    {
      type: 'installation' as CommercialProductType,
      label: 'Installation',
      label_bn: 'ইনস্টলেশন',
      description: 'Installation or fitting service',
      icon: Building2,
    },
    {
      type: 'delivery' as CommercialProductType,
      label: 'Delivery',
      label_bn: 'ডেলিভারি',
      description: 'Delivery / transport service',
      icon: Truck,
    },
    {
      type: 'package' as CommercialProductType,
      label: 'Package',
      label_bn: 'প্যাকেজ',
      description: 'Combination of products/services',
      icon: Boxes,
    },
  ]

  const PRICING_PILLS: { id: PricingMethod; label: string; unit: string; symbol: string }[] = [
    { id: 'per_area', label: 'Per Sqft', unit: 'sft', symbol: '৳ / sqft' },
    { id: 'per_piece', label: 'Per Piece', unit: 'pcs', symbol: '৳ / piece' },
    { id: 'per_job', label: 'Per Job', unit: 'job', symbol: '৳ / job' },
    { id: 'per_hour', label: 'Per Hour', unit: 'hr', symbol: '৳ / hour' },
    { id: 'per_length', label: 'Per Ft', unit: 'ft', symbol: '৳ / ft' },
    { id: 'per_weight', label: 'Per Kg', unit: 'kg', symbol: '৳ / kg' },
    { id: 'fixed', label: 'Fixed Price', unit: 'pcs', symbol: 'Fixed ৳' },
    { id: 'formula', label: 'Formula', unit: 'sft', symbol: 'Formula' },
  ]

  const handleSelectProductType = (type: CommercialProductType) => {
    let defaultSellingUnit = formData.selling_unit || 'sft'
    let defaultPurchaseUnit = formData.purchase_unit || 'roll'
    let defaultPricingMethod: PricingMethod = formData.pricing_method || 'per_area'
    let defaultMeasurementType: MeasurementType = formData.measurement_type || 'area'
    let defaultDepartment = formData.default_department || 'printing'
    let requiresProduction = formData.requires_production
    let requiresFinishing = formData.requires_finishing
    let requiresFabrication = formData.requires_fabrication
    let requiresInstallation = formData.requires_installation
    let requiresDelivery = formData.requires_delivery

    if (type === 'ready_product') {
      defaultSellingUnit = 'pcs'
      defaultPurchaseUnit = 'pcs'
      defaultPricingMethod = 'per_piece'
      defaultMeasurementType = 'piece'
      defaultDepartment = 'printing'
      requiresProduction = false
    } else if (type === 'service') {
      defaultSellingUnit = 'job'
      defaultPurchaseUnit = 'pcs'
      defaultPricingMethod = 'per_job'
      defaultMeasurementType = 'job'
      defaultDepartment = 'design'
      requiresProduction = false
      requiresFinishing = false
      requiresFabrication = false
      requiresInstallation = false
      requiresDelivery = false
    } else if (type === 'material') {
      defaultSellingUnit = 'sft'
      defaultPurchaseUnit = 'roll'
      defaultPricingMethod = 'per_area'
      defaultMeasurementType = 'area'
      defaultDepartment = 'printing'
      requiresProduction = false
    } else if (type === 'finishing') {
      defaultSellingUnit = 'sft'
      defaultPurchaseUnit = 'roll'
      defaultPricingMethod = 'per_area'
      defaultMeasurementType = 'area'
      defaultDepartment = 'finishing'
      requiresProduction = false
      requiresFinishing = true
    } else if (type === 'fabrication') {
      defaultSellingUnit = 'sft'
      defaultPurchaseUnit = 'sheet'
      defaultPricingMethod = 'per_area'
      defaultMeasurementType = 'area'
      defaultDepartment = 'fabrication'
      requiresProduction = true
      requiresFabrication = true
    } else if (type === 'installation') {
      defaultSellingUnit = 'sft'
      defaultPurchaseUnit = 'pcs'
      defaultPricingMethod = 'per_area'
      defaultMeasurementType = 'area'
      defaultDepartment = 'installation'
      requiresProduction = false
      requiresInstallation = true
    } else if (type === 'delivery') {
      defaultSellingUnit = 'job'
      defaultPurchaseUnit = 'pcs'
      defaultPricingMethod = 'per_job'
      defaultMeasurementType = 'job'
      defaultDepartment = 'printing'
      requiresProduction = false
      requiresDelivery = true
    } else if (type === 'package') {
      defaultSellingUnit = 'pcs'
      defaultPurchaseUnit = 'pcs'
      defaultPricingMethod = 'per_piece'
      defaultMeasurementType = 'piece'
      defaultDepartment = 'printing'
      requiresProduction = true
    } else if (type === 'production_product') {
      defaultSellingUnit = 'sft'
      defaultPurchaseUnit = 'roll'
      defaultPricingMethod = 'per_area'
      defaultMeasurementType = 'area'
      defaultDepartment = 'printing'
      requiresProduction = true
    }

    setFormData((prev) => ({
      ...prev,
      commercial_type: type,
      product_type:
        type === 'ready_product'
          ? 'ready_product'
          : type === 'service'
          ? 'service'
          : type === 'material'
          ? 'material'
          : type === 'finishing'
          ? 'finishing'
          : type === 'fabrication'
          ? 'fabrication'
          : type === 'installation'
          ? 'installation'
          : type === 'delivery'
          ? 'delivery'
          : type === 'package'
          ? 'package_bundle'
          : 'print_service',
      selling_unit: defaultSellingUnit,
      purchase_unit: defaultPurchaseUnit,
      unit: defaultSellingUnit as UnitOfMeasure,
      pricing_method: defaultPricingMethod,
      measurement_type: defaultMeasurementType,
      default_department: defaultDepartment,
      requires_production: requiresProduction,
      requires_finishing: requiresFinishing,
      requires_fabrication: requiresFabrication,
      requires_installation: requiresInstallation,
      requires_delivery: requiresDelivery,
    }))
  }

  const handlePricingMethodSelect = (opt: typeof PRICING_PILLS[0]) => {
    setFormData((prev) => ({
      ...prev,
      pricing_method: opt.id,
      selling_unit: opt.unit,
      unit: opt.unit as UnitOfMeasure,
      measurement_type:
        opt.id === 'per_area'
          ? 'area'
          : opt.id === 'per_piece'
          ? 'piece'
          : opt.id === 'per_job'
          ? 'job'
          : opt.id === 'per_hour'
          ? 'time'
          : opt.id === 'per_length'
          ? 'length'
          : opt.id === 'per_weight'
          ? 'weight'
          : prev.measurement_type,
    }))
  }

  // Rebuilt V3 Modal Handlers
  const handleOpenCreate = () => {
    const check = checkCanCreate('max_products')
    if (!check.allowed) {
      openLimitExceededModal('max_products')
      return
    }
    setEditingProduct(null)
    setIsTypeSelectorOpen(true)
  }

  const handleOpenEdit = (p: ProductRecord) => {
    setEditingProduct(p)
    if (p.entity_type === 'service' || p.product_type === 'print_service' || p.product_type === 'service') {
      setIsServiceModalOpen(true)
    } else if (p.entity_type === 'material' || p.product_type === 'material') {
      setIsMaterialModalOpen(true)
    } else {
      setIsReadyProductModalOpen(true)
    }
  }

  const handleSaveRebuiltProduct = async (productData: Partial<ProductRecord>) => {
    if (editingProduct) {
      const res = await updateProductAction(editingProduct.id, productData, companyId)
      if (!res.success) throw new Error(res.error || 'Failed to update item.')
      showNotification(`Updated '${productData.name || editingProduct.name}' successfully.`)
    } else {
      const res = await createProductAction(productData as any, companyId)
      if (!res.success) throw new Error(res.error || 'Failed to create item.')
      refreshUsage()
      showNotification(`Registered new item '${productData.name}' into catalog.`)
    }
    await loadProducts()
  }

  // Legacy open modal fallback
  const handleOpenLegacyCreate = () => {
    const check = checkCanCreate('max_products')
    if (!check.allowed) {
      openLimitExceededModal('max_products')
      return
    }
    setEditingProduct(null)
    setSupplierPrices([])
    setFormTab('basic')
    setExpandedSections({})
    setFormData({
      name: '',
      name_bn: '',
      sku: `PRD-${Date.now().toString().slice(-4)}`,
      category: 'flex_banner',
      product_type: 'print_service',
      commercial_type: 'production_product',
      measurement_type: 'area',
      pricing_method: 'per_area',
      purchase_unit: 'roll',
      purchase_price: 8500,
      selling_unit: 'sft',
      conversion_ratio: 1640,
      production_unit: 'sft',
      default_wastage_percentage: 5.0,
      target_margin_percentage: 40.0,
      minimum_charge: 0,
      min_order_quantity: 1.0,
      min_billable_quantity: 0,
      allow_manual_override: true,
      min_allowed_margin_percent: 15.0,
      price_tiers: {
        retail: 28,
        corporate: 26,
        dealer: 24,
        wholesale: 22,
        custom: 0,
      },
      cost_breakdown: {
        material: 5.46,
        ink: 0,
        labor: 0,
        machine: 0,
        finishing: 0,
        fabrication: 0,
        installation: 0,
        delivery: 0,
        other_direct_cost: 0,
      },
      components: [],
      vat_applicable: false,
      is_tax_inclusive: false,
      roll_width_ft: 10,
      roll_length_ft: 164,
      sheet_width_ft: 4,
      sheet_length_ft: 8,
      unit: 'sft',
      material_spec: '',
      dimensions_spec: '',
      description: '',
      description_bn: '',
      base_cost: 5.46,
      selling_price: 28.0,
      min_price: 22.0,
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
    })
    setIsCreateOpen(true)
  }

  const handleOpenLegacyEdit = (p: ProductRecord) => {
    setEditingProduct(p)
    setFormData({
      name: p.name,
      name_bn: p.name_bn || '',
      sku: p.sku,
      category: p.category || 'flex_banner',
      product_type: p.product_type || 'print_service',
      commercial_type: p.commercial_type || 'production_product',
      measurement_type: p.measurement_type || 'area',
      pricing_method: p.pricing_method || 'per_area',
      purchase_unit: p.purchase_unit || 'roll',
      purchase_price: Number(p.purchase_price) || 0,
      selling_unit: p.selling_unit || p.unit || 'sft',
      conversion_ratio: Number(p.conversion_ratio) || 1.0,
      production_unit: p.production_unit || p.unit || 'sft',
      default_wastage_percentage: Number(p.default_wastage_percentage) || 0,
      target_margin_percentage: Number(p.target_margin_percentage) || 35.0,
      minimum_charge: Number(p.minimum_charge) || 0,
      min_order_quantity: Number(p.min_order_quantity) || 1.0,
      min_billable_quantity: Number(p.min_billable_quantity) || 0,
      allow_manual_override: p.allow_manual_override !== false,
      min_allowed_margin_percent: Number(p.min_allowed_margin_percent) || 15.0,
      price_tiers: p.price_tiers || {
        retail: Number(p.selling_price) || 0,
        corporate: Number(p.selling_price) || 0,
        dealer: Number(p.selling_price) || 0,
        wholesale: Number(p.selling_price) || 0,
        custom: 0,
      },
      cost_breakdown: p.cost_breakdown || {
        material: Number(p.base_cost) || 0,
        ink: 0,
        labor: 0,
        machine: 0,
        finishing: 0,
        fabrication: 0,
        installation: 0,
        delivery: 0,
        other_direct_cost: 0,
      },
      components: p.components || [],
      vat_applicable: Boolean(p.vat_applicable),
      is_tax_inclusive: Boolean(p.is_tax_inclusive),
      roll_width_ft: Number(p.roll_width_ft) || 10,
      roll_length_ft: Number(p.roll_length_ft) || 164,
      sheet_width_ft: Number(p.sheet_width_ft) || 4,
      sheet_length_ft: Number(p.sheet_length_ft) || 8,
      unit: p.unit || 'sft',
      material_spec: p.material_spec || '',
      dimensions_spec: p.dimensions_spec || '',
      description: p.description || '',
      description_bn: p.description_bn || '',
      base_cost: Number(p.base_cost) || 0,
      selling_price: Number(p.selling_price) || 0,
      min_price: Number(p.min_price) || 0,
      tax_rate: p.tax_rate !== undefined && p.tax_rate !== null && !isNaN(Number(p.tax_rate)) ? Number(p.tax_rate) : 7.5,
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
          commercial_type: formData.commercial_type,
          measurement_type: formData.measurement_type,
          pricing_method: formData.pricing_method || 'per_area',
          purchase_unit: formData.purchase_unit,
          purchase_price: Number(formData.purchase_price) || 0,
          selling_unit: formData.selling_unit || formData.unit,
          conversion_ratio: Number(formData.conversion_ratio) || 1.0,
          production_unit: formData.production_unit || formData.unit,
          default_wastage_percentage: Number(formData.default_wastage_percentage) || 0,
          target_margin_percentage: Number(formData.target_margin_percentage) || 35.0,
          minimum_charge: Number(formData.minimum_charge) || 0,
          min_order_quantity: Number(formData.min_order_quantity) || 1.0,
          min_billable_quantity: Number(formData.min_billable_quantity) || 0,
          allow_manual_override: formData.allow_manual_override,
          min_allowed_margin_percent: Number(formData.min_allowed_margin_percent) || 15.0,
          price_tiers: formData.price_tiers,
          cost_breakdown: formData.cost_breakdown,
          components: formData.components,
          vat_applicable: formData.vat_applicable,
          is_tax_inclusive: formData.is_tax_inclusive,
          roll_width_ft: Number(formData.roll_width_ft) || null,
          roll_length_ft: Number(formData.roll_length_ft) || null,
          sheet_width_ft: Number(formData.sheet_width_ft) || null,
          sheet_length_ft: Number(formData.sheet_length_ft) || null,
          unit: formData.selling_unit || formData.unit,
          material_spec: formData.material_spec.trim() || null,
          dimensions_spec: formData.dimensions_spec.trim() || null,
          description: formData.description.trim() || null,
          description_bn: formData.description_bn.trim() || null,
          base_cost: liveCommercialMath.effectiveMaterialCost || Number(formData.base_cost) || 0,
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
            material_rate: (liveCommercialMath.effectiveMaterialCost || Number(formData.base_cost)) * 0.6,
            print_rate: (liveCommercialMath.effectiveMaterialCost || Number(formData.base_cost)) * 0.4,
            finishing_rate: 3,
            waste_factor_percent: Number(formData.default_wastage_percentage) || 0,
            default_margin_percent: Number(formData.target_margin_percentage) || 35.0,
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

  // Handle Price Adjustment with Commercial Audit
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pricingProduct) return
    if (!priceReason.trim()) {
      showNotification('Please provide an audit reason for this price change.', 'error')
      return
    }

    startTransition(async () => {
      try {
        const res = await updateProductPriceAction(
          pricingProduct.id,
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
        showNotification(`Price for '${pricingProduct.name}' updated to ৳${newPrice} with full audit log.`)
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
      setDeletionSafety({
        isSafe: false,
        references: { quotations: 1, invoices: 0, jobs: 0, customerRates: 0 },
        reason: 'Could not verify references. Archiving is recommended.',
      })
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

  // Fast Quote Live Calculation with Pricing Method, Min Billable Qty, Minimum Charge & Direct Cost Breakdown
  const fastQuoteCalculation = useMemo(() => {
    if (!fastQuoteProduct) return null

    const effectiveRate =
      quoteRateOverride !== null
        ? quoteRateOverride
        : resolvedPriceInfo?.effectiveRate || fastQuoteProduct.selling_price || 0

    const commercialCalc = calculateCommercialPricing({
      pricingMethod: fastQuoteProduct.pricing_method || 'per_area',
      quantity: quoteQuantity,
      width: quoteWidth,
      height: quoteHeight,
      dimensionUnit: quoteDimUnit,
      catalogSellingPrice: effectiveRate,
      unitPrice: effectiveRate,
      effectiveMaterialCost: Number(fastQuoteProduct.base_cost) || 0,
      costBreakdown: fastQuoteProduct.cost_breakdown,
      components: fastQuoteProduct.components,
      minBillableQuantity: Number(fastQuoteProduct.min_billable_quantity) || 0,
      minOrderQuantity: Number(fastQuoteProduct.min_order_quantity) || 1,
      minimumCharge: Number(fastQuoteProduct.minimum_charge) || 0,
      defaultWastagePercent: Number(fastQuoteProduct.default_wastage_percentage) || 0,
      minAllowedMarginPercent: Number(fastQuoteProduct.min_allowed_margin_percent) || 15,
    })

    const wFt = convertToFeet(quoteWidth, quoteDimUnit)
    const hFt = convertToFeet(quoteHeight, quoteDimUnit)
    const perimeterFt = 2 * (wFt + hFt) * quoteQuantity

    const printSubtotal = commercialCalc.baseLineTotal
    const hemmingCharge = quoteIncludeHemming ? Math.round(perimeterFt * 2.5) : 0
    const eyeletCount = quoteIncludeEyelets ? Math.max(4, Math.round(perimeterFt / 2.5)) : 0
    const eyeletCharge = quoteIncludeEyelets ? eyeletCount * 5 : 0
    const laminationCharge = quoteIncludeLamination ? Math.round(commercialCalc.calculatedQuantity * 8) : 0
    const installationCharge = quoteIncludeInstallation ? Math.max(500, Math.round(commercialCalc.calculatedQuantity * 12)) : 0
    const deliveryCharge = quoteIncludeDelivery ? 350 : 0

    const addonsTotal = hemmingCharge + eyeletCharge + laminationCharge + installationCharge + deliveryCharge
    const calculatedSubtotal = printSubtotal + addonsTotal

    // Minimum Charge Floor Enforcement
    const minCharge = Number(fastQuoteProduct.minimum_charge) || 0
    const minChargeResult = applyMinimumCharge(calculatedSubtotal, minCharge)
    const subtotal = minChargeResult.finalAmount
    const isMinChargeApplied = minChargeResult.isMinimumApplied || commercialCalc.isMinimumChargeApplied

    const discountAmount = Math.min(subtotal, quoteDiscountFlat + Math.round((subtotal * quoteDiscountPercent) / 100))
    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount)
    const vatAmount = Math.round((subtotalAfterDiscount * (fastQuoteProduct.tax_rate || 7.5)) / 100)
    const grandTotal = subtotalAfterDiscount + vatAmount

    // Internal Cost & Profit breakdown
    const estMaterialCost = commercialCalc.estimatedMaterialCost
    const estAddonsCost =
      (hemmingCharge * 0.4) + (eyeletCharge * 0.4) + (laminationCharge * 0.5) + (installationCharge * 0.4) + (deliveryCharge * 0.6)
    const estTotalCost = Math.round((commercialCalc.estimatedDirectCost + estAddonsCost) * 100) / 100
    const estGrossProfit = Math.max(0, subtotalAfterDiscount - estTotalCost)
    const estMargin = subtotalAfterDiscount > 0 ? Math.round(((subtotalAfterDiscount - estTotalCost) / subtotalAfterDiscount) * 1000) / 10 : 0

    return {
      singleAreaSft: commercialCalc.singleAreaSqft || (Math.round(wFt * hFt * 100) / 100),
      totalAreaSft: commercialCalc.calculatedQuantity,
      actualQuantity: commercialCalc.actualQuantity,
      billableQuantity: commercialCalc.billableQuantity,
      isMinBillableApplied: commercialCalc.isMinBillableApplied,
      pricingMethod: commercialCalc.pricingMethod,
      costBasisType: commercialCalc.costBasisType,
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
      calculatedSubtotal,
      minCharge,
      isMinChargeApplied,
      subtotal,
      discountAmount,
      subtotalAfterDiscount,
      vatAmount,
      grandTotal,
      expectedConsumption: commercialCalc.expectedConsumption,
      estMaterialCost,
      estTotalCost,
      estGrossProfit,
      estMargin,
      isBelowFloor: effectiveRate < (fastQuoteProduct.min_price || 0),
      belowMinMargin: commercialCalc.isBelowMinAllowedMargin,
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
              unit: fastQuoteProduct.selling_unit || fastQuoteProduct.unit || 'sft',
              unit_rate: fastQuoteCalculation.effectiveRate,
              rate_source: resolvedPriceInfo?.source === 'custom' ? 'custom' : 'default',
              finishing: finishingList.join(', ') || null,
              installation_required: quoteIncludeInstallation,
              material_cost: fastQuoteCalculation.estMaterialCost,
              item_total: fastQuoteCalculation.subtotal,
            },
          ],
          discount_amount: fastQuoteCalculation.discountAmount,
          vat_rate: fastQuoteProduct.tax_rate || 7.5,
          installation_required: quoteIncludeInstallation,
          notes: `Instant Fast Quote generated from Product Master 2.1 for ${fastQuoteProduct.name}.`,
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

      const matchType =
        selectedType === 'all' ||
        p.commercial_type === selectedType ||
        p.product_type === selectedType

      const matchEntityType =
        entityTypeFilter === 'all' ||
        p.entity_type === entityTypeFilter ||
        (entityTypeFilter === 'product' && (p.product_type === 'ready_product' || p.commercial_type === 'ready_product')) ||
        (entityTypeFilter === 'service' && (p.product_type === 'print_service' || p.commercial_type === 'service')) ||
        (entityTypeFilter === 'material' && (p.product_type === 'material' || p.commercial_type === 'material')) ||
        (entityTypeFilter === 'finishing' && (p.product_type === 'finishing' || p.commercial_type === 'finishing')) ||
        (entityTypeFilter === 'additional' && (p.product_type === 'additional' || p.commercial_type === 'additional')) ||
        (entityTypeFilter === 'installation' && (p.product_type === 'installation' || p.commercial_type === 'installation'))

      const margin =
        p.selling_price > 0
          ? ((p.selling_price - p.base_cost) / p.selling_price) * 100
          : 0

      let matchStatus = true
      if (statusFilter === 'active') matchStatus = p.is_active !== false
      else if (statusFilter === 'archived') matchStatus = p.is_active === false
      else if (statusFilter === 'low_margin') matchStatus = margin < 20 && p.is_active !== false

      return matchSearch && matchCategory && matchType && matchEntityType && matchStatus
    })
  }, [products, search, selectedCategory, selectedType, entityTypeFilter, statusFilter])

  // Business Owner Signal Metrics
  const metrics = useMemo(() => {
    const active = products.filter((p) => p.is_active !== false)
    const archived = products.filter((p) => p.is_active === false)
    const lowMargin = active.filter((p) => {
      const m = p.selling_price > 0 ? ((p.selling_price - p.base_cost) / p.selling_price) * 100 : 0
      return m < 20
    })
    const avgMargin =
      active.length > 0
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
        titleEn="Products & Services"
        titleBn="পণ্য ও সেবা"
        descriptionEn="Commercial catalog & specifications • Ready products, services, raw media, and commercial tariffs"
        descriptionBn="রেডি প্রোডাক্ট, প্রিন্টিং সার্ভিস, কাঁচামাল ও কমার্শিয়াল ট্যারিফ নিয়ন্ত্রণ কেন্দ্র"
        icon={Package}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs h-9 gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{tBilingual('New Product / Service', 'নতুন পণ্য / সেবা')}</span>
            </Button>

            <Link href={`/${slug}/pricing`}>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold shadow-xs h-9 gap-1.5 cursor-pointer"
              >
                <Calculator className="h-4 w-4 text-blue-600" />
                <span>{tBilingual('Live Estimator', 'লাইভ ক্যালকুলেটর')}</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={loadProducts}
              disabled={isLoading}
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold shadow-xs h-9 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              <span>Refresh</span>
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

      {/* Business Owner KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Total Active Catalog Items */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Catalog Items
          </div>
          <div className="text-lg sm:text-xl font-bold font-numeric tabular-nums text-slate-900 dark:text-white mt-1">
            {metrics.totalActive}
          </div>
          <div className="text-xs text-slate-500 font-numeric tabular-nums mt-0.5">
            Commercial Master Active
          </div>
        </Card>

        {/* 2. Average Gross Margin */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Average Gross Margin
          </div>
          <div className="text-lg sm:text-xl font-bold font-numeric tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.avgMargin}%
          </div>
          <div className="text-xs text-emerald-600/90 font-numeric tabular-nums mt-0.5">
            Yield-Adjusted Profitability
          </div>
        </Card>

        {/* 3. Low Margin Alert */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Low Margin Alert (&lt;20%)
          </div>
          <div className="text-lg sm:text-xl font-bold font-numeric tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {metrics.lowMarginCount}
          </div>
          <div className="text-xs text-amber-600/90 font-numeric tabular-nums mt-0.5">
            Review Raw Purchase Tariffs
          </div>
        </Card>

        {/* 4. Archived Items */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Archived Items
          </div>
          <div className="text-lg sm:text-xl font-bold font-numeric tabular-nums text-slate-900 dark:text-white mt-1">
            {metrics.totalArchived}
          </div>
          <div className="text-xs text-slate-500 font-numeric tabular-nums mt-0.5">
            Historical Snapshots Preserved
          </div>
        </Card>
      </div>

      {/* Main Navigation Tabs Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'all', label: 'All Items' },
          { id: 'product', label: 'Ready Products' },
          { id: 'service', label: 'Services' },
          { id: 'material', label: 'Raw Materials' },
          { id: 'finishing', label: 'Finishing' },
          { id: 'additional', label: 'Additional Work' },
          { id: 'installation', label: 'Installation & Delivery' },
          { id: 'printing_methods', label: 'Printing Methods' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setEntityTypeFilter(tab.id as any)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              entityTypeFilter === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search, Category, Commercial Type & Status Filters */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by English name, বাংলা নাম, SKU, material spec..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>

        {/* Category Dropdown & Quick Add */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="all">All Categories (সকল ক্যাটাগরি)</option>
            {categories.length > 0 ? (
              categories.map((cat) => (
                <option key={cat.id} value={cat.slug || cat.name}>
                  {cat.name} {cat.name_bn ? `(${cat.name_bn})` : ''}
                </option>
              ))
            ) : (
              <>
                <option value="flex_banner">Flex & Vinyl Banner</option>
                <option value="backlit_flex">Backlit Signage</option>
                <option value="vinyl_sticker">Vinyl & Stickers</option>
                <option value="rigid_board">Rigid Board Mounts</option>
                <option value="signage_3d">3D Letter & Signage</option>
                <option value="display_stand">Display & Standee</option>
                <option value="commercial_print">Visiting Card & Leaflet</option>
                <option value="finishing">Finishing & Binding</option>
                <option value="installation">Installation & Site Work</option>
                <option value="design_service">Design & Artwork</option>
                <option value="delivery_logistics">Delivery & Logistics</option>
              </>
            )}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingCategory(null)
              setIsCategoryModalOpen(true)
            }}
            title="Add New Category"
            className="h-9 px-2.5 text-xs text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Category
          </Button>
        </div>

        {/* Commercial Type Dropdown */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="all">All Commercial Types</option>
            {COMMERCIAL_PRODUCT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
          <button
            onClick={() => setStatusFilter('active')}
            className={cn(
              'px-3 py-1.5 rounded-md transition-all cursor-pointer',
              statusFilter === 'active' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Active ({metrics.totalActive})
          </button>
          <button
            onClick={() => setStatusFilter('low_margin')}
            className={cn(
              'px-3 py-1.5 rounded-md transition-all cursor-pointer',
              statusFilter === 'low_margin' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Low Margin ({metrics.lowMarginCount})
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={cn(
              'px-3 py-1.5 rounded-md transition-all cursor-pointer',
              statusFilter === 'archived' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Archived ({metrics.totalArchived})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-md transition-all cursor-pointer',
              statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            All
          </button>
        </div>
      </div>

      {/* Printing Methods Master View vs Catalog Table */}
      {entityTypeFilter === 'printing_methods' ? (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Printing Technologies & Methods</span>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {printingMethods.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Configurable printing methods (Eco-Solvent, UV Flatbed, UV Roll, DTF, Sublimation, Latex, etc.) usable across all Print Services without code deployments.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingPrintingMethod(null)
                setIsPrintingMethodModalOpen(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs shrink-0"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Printing Method
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {printingMethods.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Palette className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Printing Methods Configured</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add printing methods to bind compatible materials, ink rates, and production rules.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPrintingMethod(null)
                    setIsPrintingMethodModalOpen(true)
                  }}
                  className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Printing Method
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Method Name</th>
                      <th className="py-3 px-3">Code</th>
                      <th className="py-3 px-3">Compatible Media</th>
                      <th className="py-3 px-3">Default Ink</th>
                      <th className="py-3 px-3">Base Cost / sqft</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {printingMethods.map((pm) => (
                      <tr key={pm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div>{pm.name}</div>
                          {pm.name_bn && <div className="text-xs text-slate-500 font-medium font-bengali">{pm.name_bn}</div>}
                          {pm.description && <div className="text-[11px] text-slate-400 font-normal">{pm.description}</div>}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {pm.code || '—'}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(pm.compatible_material_types || []).map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px] uppercase font-mono">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-300">
                          {pm.default_ink_type || 'Standard CMYK'}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">
                          ৳{pm.cost_per_sqft || 0}/sft
                        </td>
                        <td className="py-3.5 px-3">
                          {pm.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingPrintingMethod(pm)
                                setIsPrintingMethodModalOpen(true)
                              }}
                              className="h-7 text-xs px-2"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePrintingMethod(pm.id)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete Method"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Catalog Table & Mobile Cards */
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Commercial Master Items</span>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {filteredProducts.length}
                </Badge>
              </CardTitle>
              <span className="text-xs text-slate-400">PostgreSQL Authoritative Units, Conversion & Costing</span>
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
                    <th className="py-3 px-3">Purchase Economics</th>
                    <th className="py-3 px-3">Effective Cost</th>
                    <th className="py-3 px-3">Selling Rate</th>
                    <th className="py-3 px-3">Gross Margin</th>
                    <th className="py-3 px-3">Min Charge</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.map((item) => {
                    const marginPercent =
                      item.selling_price > 0
                        ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 1000) / 10
                        : 0

                    const isService =
                      item.commercial_type === 'service' ||
                      item.commercial_type === 'installation' ||
                      item.commercial_type === 'delivery'

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

                        {/* Commercial Product Type */}
                        <td className="py-3.5 px-3">
                          <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                            {(item.commercial_type || item.product_type)?.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Purchase Economics (Roll / Sheet / Box) */}
                        <td className="py-3.5 px-3">
                          {!isService && item.purchase_price && item.purchase_price > 0 ? (
                            <div>
                              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                ৳{item.purchase_price} / {item.purchase_unit || 'roll'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                1 {item.purchase_unit || 'roll'} = {item.conversion_ratio || 1} {item.selling_unit || item.unit}
                                {item.default_wastage_percentage ? ` (${item.default_wastage_percentage}% waste)` : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No Purchase Unit</span>
                          )}
                        </td>

                        {/* Effective Unit Cost */}
                        <td className="py-3.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
                          <CurrencyDisplay amount={item.base_cost} />
                          <span className="text-[10px] text-slate-400 font-normal">/{item.selling_unit || item.unit}</span>
                        </td>

                        {/* Selling Rate */}
                        <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white font-mono">
                          <CurrencyDisplay amount={item.selling_price} />
                          <span className="text-xs font-normal text-slate-400">/{item.selling_unit || item.unit}</span>
                        </td>

                        {/* Gross Margin % */}
                        <td className="py-3.5 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border font-mono',
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

                        {/* Minimum Charge */}
                        <td className="py-3.5 px-3 text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                          {item.minimum_charge && item.minimum_charge > 0 ? (
                            <span className="text-blue-600 font-bold">৳{item.minimum_charge}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
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
                                setNewPurchasePrice(item.purchase_price || 0)
                                setNewTargetMargin(item.target_margin_percentage || 35)
                                setNewWastage(item.default_wastage_percentage || 0)
                              }}
                              className="h-7 text-xs px-2"
                              title="Adjust commercial price with audit log"
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

          {/* Mobile Card View (390 x 844 touch friendly) */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((item) => {
                const marginPercent =
                  item.selling_price > 0
                    ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 1000) / 10
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
                        {(item.commercial_type || item.product_type)?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Commercial Economics Badges */}
                    {item.purchase_price && item.purchase_price > 0 ? (
                      <div className="text-xs font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        Buy: <strong>৳{item.purchase_price}/{item.purchase_unit}</strong> (1 {item.purchase_unit} = {item.conversion_ratio} {item.selling_unit})
                      </div>
                    ) : null}

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-center border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Selling Rate</span>
                        <div className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          ৳{item.selling_price}/{item.selling_unit || item.unit}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Eff. Cost</span>
                        <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
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
                          setNewPurchasePrice(item.purchase_price || 0)
                          setNewTargetMargin(item.target_margin_percentage || 35)
                          setNewWastage(item.default_wastage_percentage || 0)
                        }}
                        className="h-9 px-2.5 text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Price
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(item)}
                        className="h-9 px-2.5 text-xs"
                      >
                        Edit
                      </Button>
                      <Link
                        href={`/${slug}/products/${item.id}`}
                        className="inline-flex items-center justify-center h-9 px-2.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
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
      )}

      {/* ======================================================== */}
      {/* MODAL 1: FAST QUOTE WITH MINIMUM CHARGE & COST ESTIMATOR */}
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
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400">
                        Print Subtotal ({fastQuoteCalculation.totalAreaSft} {fastQuoteProduct.selling_unit || 'SFT'} @ ৳{fastQuoteCalculation.effectiveRate}):
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize font-mono">
                        {fastQuoteCalculation.pricingMethod?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="font-mono font-semibold">৳{fastQuoteCalculation.printSubtotal}</span>
                  </div>

                  {fastQuoteCalculation.isMinBillableApplied && (
                    <div className="flex justify-between text-xs text-amber-800 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/40 p-2 rounded-md border border-amber-200 dark:border-amber-800">
                      <span>Minimum Billable Quantity Rule Applied:</span>
                      <span className="font-mono">
                        Actual {fastQuoteCalculation.actualQuantity} → Billed as {fastQuoteCalculation.billableQuantity} {fastQuoteProduct.selling_unit || 'sqft'}
                      </span>
                    </div>
                  )}

                  {fastQuoteCalculation.addonsTotal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Finishing & Service Add-ons:</span>
                      <span className="font-mono font-semibold">৳{fastQuoteCalculation.addonsTotal}</span>
                    </div>
                  )}

                  {fastQuoteCalculation.isMinChargeApplied && (
                    <div className="flex justify-between text-xs text-blue-700 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 p-2 rounded-md border border-blue-200 dark:border-blue-800">
                      <span>Minimum Charge Floor Applied (min ৳{fastQuoteCalculation.minCharge}):</span>
                      <span className="font-mono">৳{fastQuoteCalculation.subtotal}</span>
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
                        Est. Cost: ৳{fastQuoteCalculation.estTotalCost} • Gross Profit: ৳{fastQuoteCalculation.estGrossProfit} ({fastQuoteCalculation.estMargin}%)
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Margin Based On: {fastQuoteCalculation.costBasisType === 'direct_cost' ? 'Estimated Direct Job Cost' : 'Material Cost'}
                      </span>
                    </div>
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                      ৳{fastQuoteCalculation.grandTotal.toLocaleString()}
                    </div>
                  </div>

                  {/* Internal-Only Commercial Production Readout */}
                  <div className="mt-2 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-slate-500">Internal Commercial Analysis:</span>
                    <div className="flex justify-between">
                      <span>Expected Material Consumption (incl. {fastQuoteProduct.default_wastage_percentage || 0}% waste):</span>
                      <span className="font-mono font-bold">{fastQuoteCalculation.expectedConsumption} {fastQuoteProduct.selling_unit || 'SFT'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Effective Unit Material Cost:</span>
                      <span className="font-mono">৳{fastQuoteProduct.base_cost} / {fastQuoteProduct.selling_unit || 'sft'}</span>
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
      {/* MODAL 2: CREATE / EDIT PRODUCT (SIMPLIFIED & PROGRESSIVE) */}
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
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {editingProduct ? 'Update product details and commercial rules.' : 'Create a product or service your business sells.'}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 pt-1 max-h-[78vh] overflow-y-auto pr-1">
          {/* STEP 1: WHAT ARE YOU SELLING? */}
          <div>
            <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-2">
              1. What are you selling?
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRODUCT_TYPE_CARDS.map((card) => {
                const Icon = card.icon
                const isSelected = formData.commercial_type === card.type
                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => handleSelectProductType(card.type)}
                    className={cn(
                      'flex flex-col items-start p-2.5 rounded-xl border text-left transition-all relative overflow-hidden',
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg',
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <span className="text-xs font-bold block">{card.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-1 mt-0.5">
                      {card.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* STEP 2: BASIC INFORMATION */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
              2. Basic Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold mb-1 block">
                  Product Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Star Flex Banner 320 GSM, Vinyl Sticker, Graphic Design..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-sm font-medium h-9"
                  required
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold block">
                    Category <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null)
                      setIsCategoryModalOpen(true)
                    }}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="h-3 w-3" /> New Category
                  </button>
                </div>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="" disabled>Select category...</option>
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.slug || cat.name}>
                        {cat.parent_name ? `${cat.parent_name} → ` : ''}{cat.name} {cat.name_bn ? `(${cat.name_bn})` : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="flex_banner">Flex Banner</option>
                      <option value="vinyl_sticker">Vinyl Sticker</option>
                      <option value="display_stand">Display Stand</option>
                      <option value="finishing">Finishing</option>
                      <option value="services">Services & Design</option>
                      <option value="delivery_logistics">Delivery</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Bengali Name (Optional)
                </Label>
                <Input
                  placeholder="যেমন: স্টার ফ্লেক্স ব্যানার"
                  value={formData.name_bn}
                  onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                  className="text-xs h-9 font-bengali"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  SKU / Item Code (Optional)
                </Label>
                <Input
                  placeholder="PRD-FLX-01"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="text-xs h-9 font-mono uppercase text-slate-600 dark:text-slate-400"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Description (Optional)</Label>
                <Input
                  placeholder="Customer-facing notes or specifications..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: HOW DO YOU CHARGE? */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
              3. How do you charge?
            </span>

            <div>
              <Label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Pricing Method
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PRICING_PILLS.map((opt) => {
                  const isSelected = formData.pricing_method === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePricingMethodSelect(opt)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Selling Price <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">৳</span>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.00"
                    value={formData.selling_price || ''}
                    onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                    className="pl-7 pr-16 text-sm font-bold font-mono h-9 text-blue-600 dark:text-blue-400"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">
                    / {formData.selling_unit || 'unit'}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Sell By (Selling Unit)
                </Label>
                <select
                  value={formData.selling_unit}
                  onChange={(e) => setFormData({ ...formData, selling_unit: e.target.value, unit: e.target.value as UnitOfMeasure })}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium uppercase font-mono"
                >
                  {COMMON_SELLING_UNITS.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 4: OPTIONAL ADVANCED SETTINGS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pt-1">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Advanced Settings (Optional)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Optional settings for purchasing, production allowances, minimums, costing and components.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {!liveCommercialMath.isService && (
                <button
                  type="button"
                  onClick={() => toggleSection('purchasing')}
                  className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
                    expandedSections.purchasing
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  )}
                >
                  <span>Purchasing</span>
                  {expandedSections.purchasing ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}

              {(formData.requires_production || formData.commercial_type === 'production_product' || formData.commercial_type === 'fabrication' || formData.commercial_type === 'material') && (
                <button
                  type="button"
                  onClick={() => toggleSection('production')}
                  className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
                    expandedSections.production
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  )}
                >
                  <span>Production</span>
                  {expandedSections.production ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleSection('minimums')}
                className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
                  expandedSections.minimums
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                )}
              >
                <span>Minimums</span>
                {expandedSections.minimums ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleSection('costing')}
                className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
                  expandedSections.costing
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  )}
              >
                <span>Costing</span>
                {expandedSections.costing ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleSection('components')}
                className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
                  expandedSections.components
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                )}
              >
                <span>Components ({formData.components?.length || 0})</span>
                {expandedSections.components ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* SUBSECTION A: PURCHASING & MEDIA SPECS */}
            {expandedSections.purchasing && !liveCommercialMath.isService && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Purchasing & Material Conversion
                  </span>
                  <span className="text-[11px] text-slate-500">How you buy raw materials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Purchase Unit</Label>
                    <select
                      value={formData.purchase_unit}
                      onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium uppercase font-mono"
                    >
                      {COMMON_PURCHASE_UNITS.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.name} ({u.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Purchase Price (৳ BDT)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.purchase_price || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                      className="text-xs h-9 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-400">per 1 {formData.purchase_unit}</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Conversion Ratio
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.conversion_ratio || ''}
                      onChange={(e) => setFormData({ ...formData, conversion_ratio: Number(e.target.value) })}
                      className="text-xs h-9 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-400">
                      1 {formData.purchase_unit} = {formData.conversion_ratio} {formData.selling_unit}
                    </span>
                  </div>
                </div>

                {/* Roll Dimension Helper */}
                {formData.purchase_unit === 'roll' && (
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        Roll Dimension Helper (1 Roll Area)
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono bg-white">
                        {formData.roll_width_ft}ft × {formData.roll_length_ft}ft = {Math.round((formData.roll_width_ft || 0) * (formData.roll_length_ft || 0))} sqft
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Roll Width (Feet)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={formData.roll_width_ft || ''}
                          onChange={(e) => {
                            const w = Number(e.target.value) || 0
                            const l = formData.roll_length_ft || 0
                            const ratio = Math.round(w * l)
                            setFormData({ ...formData, roll_width_ft: w, conversion_ratio: ratio > 0 ? ratio : formData.conversion_ratio })
                          }}
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Roll Length (Feet)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={formData.roll_length_ft || ''}
                          onChange={(e) => {
                            const l = Number(e.target.value) || 0
                            const w = formData.roll_width_ft || 0
                            const ratio = Math.round(w * l)
                            setFormData({ ...formData, roll_length_ft: l, conversion_ratio: ratio > 0 ? ratio : formData.conversion_ratio })
                          }}
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label className="text-[11px] font-semibold mb-1 block">Derived Ratio</Label>
                        <div className="h-8 px-3 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 flex items-center font-mono font-bold text-xs text-blue-700 dark:text-blue-300">
                          {formData.conversion_ratio} sqft / roll
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION B: PRODUCTION DETAILS */}
            {expandedSections.production && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  Production Rules & Geometric Allowances
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Extra Width Needed for Production (Allowance)
                    </Label>
                    <Input
                      type="number"
                      step="0.05"
                      placeholder="e.g. 0.25 ft"
                      value={formData.dimensions_spec ? (formData.dimensions_spec.includes('x') ? formData.dimensions_spec.split('x')[0] : '') : '0.25'}
                      onChange={(e) => {
                        const w = e.target.value
                        const l = formData.dimensions_spec?.includes('x') ? formData.dimensions_spec.split('x')[1] : '0.25'
                        setFormData({ ...formData, dimensions_spec: `${w}x${l}` })
                      }}
                      className="text-xs h-9 font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Bleed / grip allowance (feet)</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Extra Length Needed for Production (Allowance)
                    </Label>
                    <Input
                      type="number"
                      step="0.05"
                      placeholder="e.g. 0.25 ft"
                      value={formData.dimensions_spec ? (formData.dimensions_spec.includes('x') ? formData.dimensions_spec.split('x')[1] : '') : '0.25'}
                      onChange={(e) => {
                        const l = e.target.value
                        const w = formData.dimensions_spec?.includes('x') ? formData.dimensions_spec.split('x')[0] : '0.25'
                        setFormData({ ...formData, dimensions_spec: `${w}x${l}` })
                      }}
                      className="text-xs h-9 font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Lead / tail allowance (feet)</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Expected Production Wastage (%)
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.default_wastage_percentage || ''}
                      onChange={(e) => setFormData({ ...formData, default_wastage_percentage: Number(e.target.value) })}
                      className="text-xs h-9 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-400">Statistical scrap (e.g. 5%)</span>
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
                      checked={formData.requires_production}
                      onChange={(e) => setFormData({ ...formData, requires_production: e.target.checked })}
                      className="rounded"
                    />
                    <span>Requires Production</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.requires_fabrication}
                      onChange={(e) => setFormData({ ...formData, requires_fabrication: e.target.checked })}
                      className="rounded"
                    />
                    <span>Requires Fabrication</span>
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
                </div>
              </div>
            )}

            {/* SUBSECTION C: MINIMUM CHARGES */}
            {expandedSections.minimums && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  3-Way Minimum Separation (MOQ vs Min Billable Qty vs Min Charge)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">1. Minimum Order Qty (MOQ)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.min_order_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, min_order_quantity: Number(e.target.value) })}
                      className="text-xs h-9 font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Order cutoff (e.g. 1 pc)</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">2. Minimum Quantity You Charge For</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.min_billable_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, min_billable_quantity: Number(e.target.value) })}
                      className="text-xs h-9 font-mono text-amber-600 font-bold"
                    />
                    <span className="text-[10px] text-slate-400">Billing floor (e.g. 20 sqft min)</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">3. Minimum Charge (৳ BDT)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.minimum_charge || ''}
                      onChange={(e) => setFormData({ ...formData, minimum_charge: Number(e.target.value) })}
                      className="text-xs h-9 font-mono font-bold text-blue-600"
                    />
                    <span className="text-[10px] text-slate-400">Money floor (e.g. ৳500 min)</span>
                  </div>
                </div>
              </div>
            )}

            {/* SUBSECTION D: COSTING & MARGINS */}
            {expandedSections.costing && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    Direct Cost Breakdown & Target Margins
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Total Cost: ৳{liveCommercialMath.totalDirectCost} / {formData.selling_unit}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Ink Cost</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.cost_breakdown?.ink || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_breakdown: { ...formData.cost_breakdown, ink: Number(e.target.value) },
                        })
                      }
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Labor Cost</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.cost_breakdown?.labor || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_breakdown: { ...formData.cost_breakdown, labor: Number(e.target.value) },
                        })
                      }
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Machine Depr.</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.cost_breakdown?.machine || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_breakdown: { ...formData.cost_breakdown, machine: Number(e.target.value) },
                        })
                      }
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Finishing</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.cost_breakdown?.finishing || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_breakdown: { ...formData.cost_breakdown, finishing: Number(e.target.value) },
                        })
                      }
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Fabrication</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.cost_breakdown?.fabrication || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_breakdown: { ...formData.cost_breakdown, fabrication: Number(e.target.value) },
                        })
                      }
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Installation</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.cost_breakdown?.installation || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_breakdown: { ...formData.cost_breakdown, installation: Number(e.target.value) },
                        })
                      }
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Delivery</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.cost_breakdown?.delivery || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_breakdown: { ...formData.cost_breakdown, delivery: Number(e.target.value) },
                        })
                      }
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Target Margin %</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.target_margin_percentage || ''}
                      onChange={(e) => setFormData({ ...formData, target_margin_percentage: Number(e.target.value) })}
                      className="text-xs h-8 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Suggested Price Card */}
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span>Suggested Selling Price: ৳{liveCommercialMath.suggestedSellingPrice} / {formData.selling_unit}</span>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                      Based on cost ৳{liveCommercialMath.costBasis} @ {formData.target_margin_percentage}% margin.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, selling_price: liveCommercialMath.suggestedSellingPrice })}
                    className="text-xs bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs shrink-0"
                  >
                    Apply Suggested Price
                  </Button>
                </div>
              </div>
            )}

            {/* SUBSECTION E: MATERIALS & COMPONENTS */}
            {expandedSections.components && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Materials & Components (Recipe / BOM)
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    Rollup: ৳{liveCommercialMath.componentsCost}
                  </Badge>
                </div>

                {/* Components Table */}
                {formData.components && formData.components.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-2 px-3">Item Name</th>
                          <th className="py-2 px-2">Qty</th>
                          <th className="py-2 px-2">Unit</th>
                          <th className="py-2 px-2">Cost (৳)</th>
                          <th className="py-2 px-2">Role</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {formData.components.map((comp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                              {comp.name || 'Component'}
                            </td>
                            <td className="py-2 px-2">{comp.quantity}</td>
                            <td className="py-2 px-2 uppercase">{comp.unit}</td>
                            <td className="py-2 px-2">৳{comp.cost_contribution}</td>
                            <td className="py-2 px-2 font-sans capitalize">{comp.production_role || 'material'}</td>
                            <td className="py-2 px-3 text-right font-sans">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...formData.components]
                                  next.splice(idx, 1)
                                  setFormData({ ...formData, components: next })
                                }}
                                className="text-rose-600 hover:text-rose-800 p-1"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 text-center border border-dashed rounded-lg text-xs text-slate-400">
                    No child components added. Simple products do not require components.
                  </div>
                )}

                {/* Add Component Subform */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block uppercase">
                    Add Component Item
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="col-span-2 sm:col-span-2">
                      <Label className="text-[10px] mb-0.5 block">Item Name</Label>
                      <Input
                        placeholder="e.g. X-Stand Hardware"
                        value={newComponent.name}
                        onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] mb-0.5 block">Qty</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newComponent.quantity}
                        onChange={(e) => setNewComponent({ ...newComponent, quantity: Number(e.target.value) })}
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] mb-0.5 block">Unit</Label>
                      <Input
                        placeholder="pcs"
                        value={newComponent.unit}
                        onChange={(e) => setNewComponent({ ...newComponent, unit: e.target.value })}
                        className="text-xs h-8 uppercase font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] mb-0.5 block">Cost (৳)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={newComponent.cost_contribution}
                        onChange={(e) => setNewComponent({ ...newComponent, cost_contribution: Number(e.target.value) })}
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!newComponent.name?.trim()) return
                        setFormData({
                          ...formData,
                          components: [...(formData.components || []), { ...newComponent }],
                        })
                        setNewComponent({
                          component_product_id: '',
                          name: '',
                          quantity: 1,
                          unit: 'pcs',
                          waste_percent: 0,
                          cost_contribution: 0,
                          is_required: true,
                          production_role: 'material',
                        })
                      }}
                      className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Component
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
              {isPending ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* ======================================================== */}
      {/* MODAL 3: ADJUST PRICE WITH COMMERCIAL AUDIT TRAIL */}
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
                  Adjust Commercial Price & Tariffs
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
              <span className="text-slate-600 dark:text-slate-400">Current Purchase Price:</span>
              <span className="font-mono font-bold">৳{pricingProduct?.purchase_price} / {pricingProduct?.purchase_unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Current Effective Unit Cost:</span>
              <span className="font-mono font-bold">৳{pricingProduct?.base_cost} / {pricingProduct?.selling_unit || pricingProduct?.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Current Selling Rate:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                ৳{pricingProduct?.selling_price} / {pricingProduct?.selling_unit || pricingProduct?.unit}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  New Purchase Price (৳ / {pricingProduct?.purchase_unit || 'Unit'})
                </Label>
                <Input
                  type="number"
                  step="1"
                  value={newPurchasePrice}
                  onChange={(e) => setNewPurchasePrice(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  New Selling Rate (৳ / {pricingProduct?.selling_unit || pricingProduct?.unit}) <span className="text-rose-500">*</span>
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

      {/* ======================================================== */}
      {/* MODAL 5: CATEGORY CREATION / EDITING MODAL */}
      {/* ======================================================== */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={(cat) => {
          loadCategories()
          setFormData((prev) => ({ ...prev, category: cat.slug || cat.name }))
          showNotification(`Category "${cat.name}" saved successfully.`, 'success')
        }}
        existingCategories={categories}
        editingCategory={editingCategory}
      />

      {/* ======================================================== */}
      {/* REBUILT V3 ARCHITECTURAL MODALS */}
      {/* ======================================================== */}
      <EntityTypeSelectorModal
        isOpen={isTypeSelectorOpen}
        onClose={() => setIsTypeSelectorOpen(false)}
        onSelect={handleSelectEntityType}
      />

      <ReadyProductModal
        isOpen={isReadyProductModalOpen}
        onClose={() => {
          setIsReadyProductModalOpen(false)
          setEditingProduct(null)
        }}
        onSave={handleSaveRebuiltProduct}
        initialData={editingProduct}
        categories={categories}
      />

      <ServiceConfigModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false)
          setEditingProduct(null)
        }}
        onSave={handleSaveRebuiltProduct}
        initialData={editingProduct}
        categories={categories}
        availableMaterials={products.filter((p) => p.entity_type === 'material' || p.product_type === 'material') as any}
        printingMethods={printingMethods}
        finishingMasterOptions={finishingOptions}
        additionalMasterOptions={additionalOptions}
        installationMasterOptions={installationOptions}
      />

      <MaterialConfigModal
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false)
          setEditingProduct(null)
        }}
        onSave={handleSaveRebuiltProduct}
        initialData={editingProduct}
        categories={categories}
      />

      {/* Standalone Configuration Master Modals */}
      <PrintingMethodModal
        open={isPrintingMethodModalOpen}
        onOpenChange={setIsPrintingMethodModalOpen}
        method={editingPrintingMethod}
        onSave={handleSavePrintingMethod}
      />

      <FinishingOptionModal
        open={isFinishingModalOpen}
        onOpenChange={setIsFinishingModalOpen}
        finishing={editingFinishing}
        onSave={handleSaveFinishingOption}
      />

      <AdditionalOptionModal
        open={isAdditionalModalOpen}
        onOpenChange={setIsAdditionalModalOpen}
        additional={editingAdditional}
        products={products}
        onSave={handleSaveAdditionalOption}
      />

      <InstallationOptionModal
        open={isInstallationModalOpen}
        onOpenChange={setIsInstallationModalOpen}
        installation={editingInstallation}
        onSave={handleSaveInstallationOption}
      />
    </div>
  )
}

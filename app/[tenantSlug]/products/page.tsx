'use client'

import React, { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
 MoreVertical,
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
 Printer,
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
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
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
import { OutsourceProductModal } from '@/components/products/outsource-product-modal'
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
import { getMachineriesAction } from '@/actions/machinery.actions'
import type {
 PrintingMethod,
 FinishingOptionRecord,
 AdditionalOptionRecord,
 InstallationOptionRecord,
} from '@/types/product.types'
import type { MachineryRecord } from '@/types/machinery.types'
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
 isServiceProduct,
 isReadyProduct,
 isMaterialProduct,
 isOutsourceProduct,
 getProductEntityKind,
 getProductEntityKindLabel,
 getProductConversionRatio,
} from '@/lib/units'
import { cn } from '@/lib/utils'

export default function ProductsCatalogPage() {
 const params = useParams()
 const router = useRouter()
 const pathname = usePathname()
 const { company } = useTenant()
 const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
 const { locale, tBilingual } = useI18n()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
 const companyId = company?.id

  // Hydration state
 const [mounted, setMounted] = useState(false)
 useEffect(() => {
 setMounted(true)
  }, [])

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
 const [entityTypeFilter, setEntityTypeFilter] = useState<'all' | 'product' | 'service' | 'material' | 'outsource' | 'finishing' | 'additional' | 'installation' | 'printing_methods'>('all')

  // Notification alert
 const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Configuration Masters State
 const [printingMethods, setPrintingMethods] = useState<PrintingMethod[]>([])
 const [finishingOptions, setFinishingOptions] = useState<FinishingOptionRecord[]>([])
 const [additionalOptions, setAdditionalOptions] = useState<AdditionalOptionRecord[]>([])
 const [installationOptions, setInstallationOptions] = useState<InstallationOptionRecord[]>([])
 const [machineries, setMachineries] = useState<MachineryRecord[]>([])

  // Rebuilt V3 Modals State
 const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false)
 const [isReadyProductModalOpen, setIsReadyProductModalOpen] = useState(false)
 const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
 const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)
 const [isOutsourceModalOpen, setIsOutsourceModalOpen] = useState(false)

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

  // 3-dot dropdown menu state for catalog tables
 const [activeMenuProductId, setActiveMenuProductId] = useState<string | null>(null)

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
 roll_width_ft: null as number | null,
 roll_length_ft: null as number | null,
 sheet_width_ft: null as number | null,
 sheet_length_ft: null as number | null,
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
 if (res && res.success && Array.isArray(res.data)) {
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
 if (Array.isArray(data)) setPrintingMethods(data)
    } catch (err) {
 console.error('Failed to load printing methods', err)
    }
  }

 const loadFinishingOptions = async () => {
 try {
 const data = await getFinishingOptionsAction()
 if (Array.isArray(data)) setFinishingOptions(data)
    } catch (err) {
 console.error('Failed to load finishing options', err)
    }
  }

 const loadAdditionalOptions = async () => {
 try {
 const data = await getAdditionalOptionsAction()
 if (Array.isArray(data)) setAdditionalOptions(data)
    } catch (err) {
 console.error('Failed to load additional options', err)
    }
  }

 const loadInstallationOptions = async () => {
 try {
 const data = await getInstallationOptionsAction()
 if (Array.isArray(data)) setInstallationOptions(data)
    } catch (err) {
 console.error('Failed to load installation options', err)
    }
  }

 const loadMachineries = async () => {
 try {
 const res = await getMachineriesAction()
 if (res && res.success && Array.isArray(res.data)) {
 setMachineries(res.data)
      }
    } catch (err) {
 console.error('Failed to load machineries', err)
    }
  }

 useEffect(() => {
 loadProducts()
 loadCategories()
 loadPrintingMethods()
 loadFinishingOptions()
 loadAdditionalOptions()
 loadInstallationOptions()
 loadMachineries()

 const handleRealtimeSync = () => {
 loadProducts()
 loadCategories()
 loadPrintingMethods()
 loadFinishingOptions()
 loadAdditionalOptions()
 loadInstallationOptions()
 loadMachineries()
    }

 if (typeof window !== 'undefined') {
 window.addEventListener('printflow_table_synced:products', handleRealtimeSync)
 window.addEventListener('printflow_table_synced:product_categories', handleRealtimeSync)
 window.addEventListener('printflow_table_synced:machines', handleRealtimeSync)
 window.addEventListener('printflow_table_synced', handleRealtimeSync)
 window.addEventListener('printflow_data_sync', handleRealtimeSync)
 window.addEventListener('storage', handleRealtimeSync)
    }

 return () => {
 if (typeof window !== 'undefined') {
 window.removeEventListener('printflow_table_synced:products', handleRealtimeSync)
 window.removeEventListener('printflow_table_synced:product_categories', handleRealtimeSync)
 window.removeEventListener('printflow_table_synced:machines', handleRealtimeSync)
 window.removeEventListener('printflow_table_synced', handleRealtimeSync)
 window.removeEventListener('printflow_data_sync', handleRealtimeSync)
 window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [companyId])

  // Close 3-dot dropdown menu on outside click
 useEffect(() => {
 const handleDocumentClick = (e: MouseEvent) => {
 const target = e.target as HTMLElement | null
 if (!target?.closest('[data-product-menu]')) {
 setActiveMenuProductId(null)
      }
    }
 if (typeof window !== 'undefined') {
 window.addEventListener('click', handleDocumentClick)
    }
 return () => {
 if (typeof window !== 'undefined') {
 window.removeEventListener('click', handleDocumentClick)
      }
    }
  }, [])

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

 const handleSelectEntityType = (type: 'product' | 'service' | 'material' | 'outsource' | 'finishing' | 'additional' | 'installation' | 'printing_method') => {
 setEditingProduct(null)
 if (type === 'product') {
 setIsReadyProductModalOpen(true)
    } else if (type === 'service') {
 setIsServiceModalOpen(true)
    } else if (type === 'material') {
 setIsMaterialModalOpen(true)
    } else if (type === 'outsource') {
 setIsOutsourceModalOpen(true)
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
 const conversionRatio = getProductConversionRatio(formData)
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
 if (isOutsourceProduct(p)) {
 setIsOutsourceModalOpen(true)
    } else if (isServiceProduct(p)) {
 setIsServiceModalOpen(true)
    } else if (isMaterialProduct(p)) {
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
 roll_width_ft: null,
 roll_length_ft: null,
 sheet_width_ft: null,
 sheet_length_ft: null,
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
 conversion_ratio: getProductConversionRatio(p),
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
 conversion_ratio: getProductConversionRatio(formData),
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
 address: '',
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

  // Refresh all catalog & configuration masters
 const handleRefreshAll = async () => {
 setIsLoading(true)
 setFetchError(null)
 try {
 await Promise.all([
 loadProducts(),
 loadCategories(),
 loadPrintingMethods(),
 loadFinishingOptions(),
 loadAdditionalOptions(),
 loadInstallationOptions(),
      ])
 showNotification('Catalog & Configuration Masters refreshed successfully.', 'success')
    } catch (err: any) {
 setFetchError(err.message || 'Error refreshing catalog data.')
 showNotification(err.message || 'Error refreshing catalog data.', 'error')
    } finally {
 setIsLoading(false)
    }
  }

  // Direct entity creation launchers
 const handleOpenCreateService = () => {
 const check = checkCanCreate('max_products')
 if (!check.allowed) {
 openLimitExceededModal('max_products')
 return
    }
 setEditingProduct(null)
 setIsServiceModalOpen(true)
  }

 const handleOpenCreateProduct = () => {
 const check = checkCanCreate('max_products')
 if (!check.allowed) {
 openLimitExceededModal('max_products')
 return
    }
 setEditingProduct(null)
 setIsReadyProductModalOpen(true)
  }

 const handleOpenCreateMaterial = () => {
 const check = checkCanCreate('max_products')
 if (!check.allowed) {
 openLimitExceededModal('max_products')
 return
    }
 setEditingProduct(null)
 setIsMaterialModalOpen(true)
  }

 const handleOpenCreateOutsource = () => {
 const check = checkCanCreate('max_products')
 if (!check.allowed) {
 openLimitExceededModal('max_products')
 return
    }
 setEditingProduct(null)
 setIsOutsourceModalOpen(true)
  }

  // Entity Type Helpers
 const isServiceItem = isServiceProduct
 const isMaterialItem = isMaterialProduct
 const isReadyProductItem = isReadyProduct
 const isOutsourceItem = isOutsourceProduct

  // Live Tab Counts Memo
 const tabCounts = useMemo(() => {
 const serviceCount = products.filter(isServiceItem).length
 const materialCount = products.filter(isMaterialItem).length
 const productCount = products.filter(isReadyProductItem).length
 const outsourceCount = products.filter(isOutsourceItem).length

 return {
 all: products.length,
 service: serviceCount,
 product: productCount,
 material: materialCount,
 outsource: outsourceCount,
 finishing: finishingOptions.length,
 additional: additionalOptions.length,
 installation: installationOptions.length,
 printing_methods: printingMethods.length,
    }
  }, [products, finishingOptions, additionalOptions, installationOptions, printingMethods])

  // Filtered Products (Catalog Items)
 const filteredProducts = useMemo(() => {
 return products.filter((p) => {
 const q = search.toLowerCase().trim()
 const matchSearch =
        !q ||
 p.name.toLowerCase().includes(q) ||
        (p.name_bn && p.name_bn.includes(q)) ||
 p.sku.toLowerCase().includes(q) ||
        (p.material_spec && p.material_spec.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.dimensions_spec && p.dimensions_spec.toLowerCase().includes(q)) ||
        (p.vendor_name && p.vendor_name.toLowerCase().includes(q))

 const matchCategory =
 selectedCategory === 'all' ||
 p.category === selectedCategory ||
 p.product_type === selectedCategory

 const matchType =
 selectedType === 'all' ||
 p.commercial_type === selectedType ||
 p.product_type === selectedType

 let matchEntityType = true
 if (entityTypeFilter === 'product') {
 matchEntityType = isReadyProductItem(p)
      } else if (entityTypeFilter === 'service') {
 matchEntityType = isServiceItem(p)
      } else if (entityTypeFilter === 'material') {
 matchEntityType = isMaterialItem(p)
      } else if (entityTypeFilter === 'outsource') {
 matchEntityType = isOutsourceItem(p)
      } else if (
 entityTypeFilter === 'finishing' ||
 entityTypeFilter === 'additional' ||
 entityTypeFilter === 'installation' ||
 entityTypeFilter === 'printing_methods'
      ) {
 matchEntityType = false
      }

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

  // Filtered Finishing Options
 const filteredFinishingOptions = useMemo(() => {
 const q = search.toLowerCase().trim()
 return finishingOptions.filter((f) => {
 const matchSearch =
        !q ||
 f.name.toLowerCase().includes(q) ||
        (f.name_bn && f.name_bn.includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.pricing_method && f.pricing_method.toLowerCase().includes(q))

 let matchStatus = true
 if (statusFilter === 'active') matchStatus = f.is_active !== false
 else if (statusFilter === 'archived') matchStatus = f.is_active === false

 return matchSearch && matchStatus
    })
  }, [finishingOptions, search, statusFilter])

  // Filtered Additional Options
 const filteredAdditionalOptions = useMemo(() => {
 const q = search.toLowerCase().trim()
 return additionalOptions.filter((a) => {
 const matchSearch =
        !q ||
 a.name.toLowerCase().includes(q) ||
        (a.name_bn && a.name_bn.includes(q)) ||
        (a.pricing_method && a.pricing_method.toLowerCase().includes(q))

 let matchStatus = true
 if (statusFilter === 'active') matchStatus = a.is_active !== false
 else if (statusFilter === 'archived') matchStatus = a.is_active === false

 return matchSearch && matchStatus
    })
  }, [additionalOptions, search, statusFilter])

  // Filtered Installation Options
 const filteredInstallationOptions = useMemo(() => {
 const q = search.toLowerCase().trim()
 return installationOptions.filter((i) => {
 const matchSearch =
        !q ||
 i.name.toLowerCase().includes(q) ||
        (i.name_bn && i.name_bn.includes(q)) ||
        (i.fulfillment_type && i.fulfillment_type.toLowerCase().includes(q)) ||
        (i.pricing_method && i.pricing_method.toLowerCase().includes(q))

 let matchStatus = true
 if (statusFilter === 'active') matchStatus = i.is_active !== false
 else if (statusFilter === 'archived') matchStatus = i.is_active === false

 return matchSearch && matchStatus
    })
  }, [installationOptions, search, statusFilter])

  // Filtered Printing Methods
 const filteredPrintingMethods = useMemo(() => {
 const q = search.toLowerCase().trim()
 return printingMethods.filter((pm) => {
 const matchSearch =
        !q ||
 pm.name.toLowerCase().includes(q) ||
        (pm.name_bn && pm.name_bn.includes(q)) ||
        (pm.code && pm.code.toLowerCase().includes(q)) ||
        (pm.description && pm.description.toLowerCase().includes(q)) ||
        (pm.default_ink_type && pm.default_ink_type.toLowerCase().includes(q))

 let matchStatus = true
 if (statusFilter === 'active') matchStatus = pm.is_active !== false
 else if (statusFilter === 'archived') matchStatus = pm.is_active === false

 return matchSearch && matchStatus
    })
  }, [printingMethods, search, statusFilter])

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

 const renderProductActionMenu = (item: ProductRecord, idx: number, totalCount: number) => {
 const isOpen = activeMenuProductId === item.id
 return (
      <td className="py-3.5 px-4 text-center whitespace-nowrap w-[70px] min-w-[70px]">
        <div className="relative inline-block text-left"data-product-menu>
          <Button
 size="sm"variant="ghost"onClick={(e) => {
 e.stopPropagation()
 setActiveMenuProductId(isOpen ? null : item.id)
            }}
 className={cn(
              'h-8 w-8 p-0 rounded-lg transition-colors cursor-pointer mx-auto flex items-center justify-center',
 isOpen
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
            )}
 title={tBilingual('Actions', 'অ্যাকশন')}
 aria-label="Product Actions"aria-expanded={isOpen}
          >
            <MoreVertical className="h-4 w-4"/>
          </Button>

          {isOpen && (
            <div
 className={cn(
                'absolute right-0 w-56 bg-card border border-border rounded-xl shadow-xs z-50 py-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100',
 idx >= totalCount - 2 && totalCount >= 3
                  ? 'bottom-full mb-1'
                  : 'top-full mt-1'
              )}
            >
              {/* 1. Fast Quote */}
              <button
 type="button"onClick={() => {
 setActiveMenuProductId(null)
 handleOpenFastQuote(item)
                }}
 className="w-full text-left px-3 py-2 hover:bg-primary/10 dark:hover:bg-primary/10 flex items-center gap-2.5 text-foreground hover:text-primary dark:hover:text-primary transition-colors cursor-pointer">
                <Calculator className="h-3.5 w-3.5 text-primary shrink-0"/>
                <span className="font-medium">{tBilingual('Fast Quote Calculator', 'কোটেশন ক্যালকুলেটর')}</span>
              </button>

              {/* 2. Adjust Commercial Price / Tariff */}
              <button
 type="button"onClick={() => {
 setActiveMenuProductId(null)
 setPricingProduct(item)
 setNewPrice(item.selling_price)
 setNewPurchasePrice(item.purchase_price || 0)
 setNewTargetMargin(item.target_margin_percentage || 35)
 setNewWastage(item.default_wastage_percentage || 0)
                }}
 className="w-full text-left px-3 py-2 hover:bg-warning-surface dark:hover:bg-warning-surface flex items-center gap-2.5 text-foreground hover:text-warning dark:hover:text-warning transition-colors cursor-pointer">
                <Edit3 className="h-3.5 w-3.5 text-warning shrink-0"/>
                <span>{tBilingual('Adjust Price & Margin', 'মূল্য ও মার্জিন নির্ধারণ')}</span>
              </button>

              {/* 3. Edit Item Specs */}
              <button
 type="button"onClick={() => {
 setActiveMenuProductId(null)
 handleOpenEdit(item)
                }}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-foreground transition-colors cursor-pointer">
                <Sliders className="h-3.5 w-3.5 text-primary shrink-0"/>
                <span>{tBilingual('Edit Details & Specs', 'তথ্য ও স্পেসিফিকেশন')}</span>
              </button>

              {/* 4. View Detail Cockpit */}
              <Link
 href={getTenantNavHref(`/products/${item.id}`, pathname, slug)}
 onClick={() => setActiveMenuProductId(null)}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                <span>{tBilingual('Open Product Cockpit', 'প্রোডাক্ট ককপিট')}</span>
              </Link>

              {/* Divider */}
              <div className="my-1 border-t border-border"/>

              {/* 5. Archive / Restore */}
              {item.is_active !== false ? (
                <button
 type="button"onClick={() => {
 setActiveMenuProductId(null)
 handleToggleArchive(item)
                  }}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-muted-foreground transition-colors cursor-pointer">
                  <Archive className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                  <span>{tBilingual('Archive Item', 'আইটেম আর্কাইভ করুন')}</span>
                </button>
              ) : (
                <button
 type="button"onClick={() => {
 setActiveMenuProductId(null)
 handleToggleArchive(item)
                  }}
 className="w-full text-left px-3 py-2 hover:bg-success-surface dark:hover:bg-success-surface flex items-center gap-2.5 text-success text-success transition-colors cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 text-success shrink-0"/>
                  <span>{tBilingual('Restore Item', 'আইটেম পুনরুদ্ধার করুন')}</span>
                </button>
              )}

              {/* 6. Delete */}
              <button
 type="button"onClick={() => {
 setActiveMenuProductId(null)
 handleInitiateDelete(item)
                }}
 className="w-full text-left px-3 py-2 hover:bg-danger-surface dark:hover:bg-danger-surface flex items-center gap-2.5 text-destructive text-destructive transition-colors cursor-pointer">
                <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0"/>
                <span>{tBilingual('Delete Item', 'আইটেম মুছে ফেলুন')}</span>
              </button>
            </div>
          )}
        </div>
      </td>
    )
  }

 if (!mounted) {
 return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-1/3"/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl"/>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl"/>
      </div>
    )
  }

 return (
    <PanelAccessGuard
 module="products"action="view"panelTitle="Products & Commercial Masters"panelTitleBn="পণ্য ও বাণিজ্যিক মাস্টার্স">
      <div className="space-y-6 pb-12">
      {/* Page Header with Direct Action Launchers */}
      <PageHeader
 titleEn="Products & Commercial Masters"titleBn="পণ্য ও বাণিজ্যিক মাস্টার্স"descriptionEn="Unified commercial catalog • Print services, ready products, raw materials, finishing & logistics tariffs"descriptionBn="প্রিন্টিং সার্ভিস, রেডি প্রোডাক্ট, কাঁচামাল, ফিনিশিং ও ডেলিভারি ট্যারিফ নিয়ন্ত্রণ কেন্দ্র"icon={Package}
 iconColor="text-primary"actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
 size="sm"onClick={handleOpenCreate}
 className="gap-1.5">
              <Plus className="h-4 w-4"/>
              <span>{tBilingual('New Product / Service', 'নতুন পণ্য / সেবা')}</span>
            </Button>

            <Button
 variant="outline"size="sm"onClick={handleRefreshAll}
 disabled={isLoading}
 className="h-9 w-9 p-0"title="Refresh all catalog and master records"aria-label="Refresh all catalog and master records">
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </Button>
          </div>
        }
      />

      {/* Notification Toast */}
      {notification && (
        <div
 className={cn(
            'p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border shadow-xs transition-all animate-in fade-in-0',
 notification.type === 'success'
              ? 'bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border'
              : 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive border-danger-border'
          )}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
          ) : (
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0"/>
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Fetch Error Retry Banner */}
      {fetchError && (
        <div className="p-4 bg-danger-surface bg-danger-surface border border-danger-border border-danger-border rounded-xl flex items-center justify-between gap-3 text-xs text-destructive text-destructive">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0"/>
            <span>{fetchError}</span>
          </div>
          <Button size="sm"variant="outline"onClick={handleRefreshAll} className="text-xs shrink-0">
            <RefreshCw className="mr-1.5 h-3 w-3"/> {tBilingual('Retry Connection', 'পুনরায় চেষ্টা করুন')}
          </Button>
        </div>
      )}

      {/* Business Owner KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Total Active Catalog Items */}
        <Card className="p-3.5 bg-card border-border shadow-xs">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {tBilingual('Active Catalog Items', 'সক্রিয় পণ্য তালিকা')}
          </div>
          <div className="text-lg sm:text-xl font-bold font-numeric tabular-nums text-foreground mt-1">
            {metrics.totalActive}
          </div>
          <div className="text-xs text-muted-foreground font-numeric tabular-nums mt-0.5">
            {tBilingual(`${tabCounts.service} Services • ${tabCounts.product} Products • ${tabCounts.material} Materials • ${tabCounts.outsource} Outsource`, `${tabCounts.service}টি সার্ভিস • ${tabCounts.product}টি পণ্য • ${tabCounts.material}টি কাঁচামাল • ${tabCounts.outsource}টি আউটসোর্স`)}
          </div>
        </Card>

        {/* 2. Average Gross Margin */}
        <Card className="p-3.5 bg-card border-success-border border-success-border/60 shadow-xs">
          <div className="text-xs font-bold text-success text-success uppercase tracking-wider">
            {tBilingual('Average Gross Margin', 'গড় গ্রস মার্জিন')}
          </div>
          <div className="text-lg sm:text-xl font-bold font-numeric tabular-nums text-success text-success mt-1">
            {metrics.avgMargin}%
          </div>
          <div className="text-xs text-success/90 font-numeric tabular-nums mt-0.5">
            {tBilingual('Yield-Adjusted Profitability', 'উৎপাদন ও অপচয় সমন্বিত লাভ')}
          </div>
        </Card>

        {/* 3. Low Margin Alert */}
        <Card className="p-3.5 bg-card border-warning-border border-warning-border/60 shadow-xs">
          <div className="text-xs font-bold text-warning text-warning uppercase tracking-wider">
            {tBilingual('Low Margin Alert (<20%)', 'স্বল্প মার্জিন সতর্কতা (<২০%)')}
          </div>
          <div className="text-lg sm:text-xl font-bold font-numeric tabular-nums text-warning text-warning mt-1">
            {metrics.lowMarginCount}
          </div>
          <div className="text-xs text-warning/90 font-numeric tabular-nums mt-0.5">
            {tBilingual('Review Raw Purchase Tariffs', 'কাঁচামাল ক্রয় দর যাচাই করুন')}
          </div>
        </Card>

        {/* 4. Configuration Masters */}
        <Card className="p-3.5 bg-card border-border shadow-xs">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {tBilingual('Configuration Masters', 'কনফিগারেশন মাস্টার্স')}
          </div>
          <div className="text-lg sm:text-xl font-bold font-numeric tabular-nums text-foreground mt-1">
            {tabCounts.finishing + tabCounts.additional + tabCounts.installation + tabCounts.printing_methods}
          </div>
          <div className="text-xs text-muted-foreground font-numeric tabular-nums mt-0.5">
            {tBilingual('Finishing, Addons, Logistics & Inks', 'ফিনিশিং, অতিরিক্ত কাজ, লজিস্টিকস ও কালি')}
          </div>
        </Card>
      </div>

      {/* 9 Specialized Commercial Navigation Tabs with Live Counts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border scrollbar-thin">
        {[
          { id: 'all', label: tBilingual('All Items', 'সকল আইটেম'), count: tabCounts.all, icon: Package },
          { id: 'service', label: tBilingual('Services', 'সার্ভিসসমূহ'), count: tabCounts.service, icon: Printer },
          { id: 'product', label: tBilingual('Ready Products', 'প্রস্তুত পণ্য'), count: tabCounts.product, icon: Package },
          { id: 'material', label: tBilingual('Raw Materials', 'কাঁচামাল'), count: tabCounts.material, icon: Layers },
          { id: 'outsource', label: tBilingual('Outsource Products', 'আউটসোর্স পণ্য'), count: tabCounts.outsource, icon: Share2 },
          { id: 'finishing', label: tBilingual('Finishing Masters', 'ফিনিশিং মাস্টার'), count: tabCounts.finishing, icon: Scissors },
          { id: 'additional', label: tBilingual('Additional Work', 'অতিরিক্ত কাজ'), count: tabCounts.additional, icon: PlusCircle },
          { id: 'installation', label: tBilingual('Installation & Delivery', 'ইনস্টলেশন ও ডেলিভারি'), count: tabCounts.installation, icon: Truck },
          { id: 'printing_methods', label: tBilingual('Printing Methods', 'প্রিন্টিং পদ্ধতি'), count: tabCounts.printing_methods, icon: Palette },
        ].map((tab) => {
 const Icon = tab.icon
 const isActive = entityTypeFilter === tab.id
 return (
            <button
 key={tab.id}
 type="button"onClick={() => setEntityTypeFilter(tab.id as any)}
 className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 border',
 isActive
                  ? 'bg-surface-inset text-foreground border-border dark:border-white shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted dark:hover:bg-muted'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0"/>
              <span>{tab.label}</span>
              <span
 className={cn(
                  'px-1.5 py-0.5 text-xs rounded-full tabular-nums font-bold',
 isActive
                    ? 'bg-card/20 text-white '
                    : 'bg-muted text-muted-foreground '
                )}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search, Category, Commercial Type & Status Filters */}
      <div className="p-3 bg-card rounded-xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input
 placeholder={tBilingual('Search by name, SKU, specs, pricing...', 'পণ্য বা সেবার নাম, কোড, স্পেক বা দাম দিয়ে খুঁজুন...')}value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-8 text-xs h-9"/>
        </div>

        {/* Category Dropdown & Quick Add (Catalog Tabs only) */}
        {entityTypeFilter !== 'printing_methods' && entityTypeFilter !== 'installation' && (
          <div className="flex items-center gap-1.5">
            <select
 value={selectedCategory}
 onChange={(e) => setSelectedCategory(e.target.value)}
 className="h-9 px-3 rounded-lg border border-input bg-card text-xs font-semibold">
              <option value="all">{tBilingual("All Categories", "সকল ক্যাটাগরি")}</option>
              {categories.length > 0 ? (
 categories.map((cat) => (
                  <option key={cat.id} value={cat.slug || cat.name}>
                    {locale === 'bn' ? (cat.name_bn || cat.name) : cat.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="flex_banner">{tBilingual("Flex & Vinyl Banner", "ফ্লেক্স ও ভিনাইল ব্যানার")}</option>
                  <option value="backlit_flex">{tBilingual("Backlit Signage", "ব্যাকলিট সাইনেজ")}</option>
                  <option value="vinyl_sticker">{tBilingual("Vinyl & Stickers", "ভিনাইল ও স্টিকার")}</option>
                  <option value="rigid_board">{tBilingual("Rigid Board Mounts", "রিজিড বোর্ড মাউন্ট")}</option>
                  <option value="signage_3d">{tBilingual("3D Letter & Signage", "থ্রিডি লেটার সাইনেজ")}</option>
                  <option value="display_stand">{tBilingual("Display & Standee", "ডিসপ্লে ও স্ট্যান্ডি")}</option>
                  <option value="commercial_print">{tBilingual("Visiting Card & Leaflet", "ভিজিটিং কার্ড ও লিফলেট")}</option>
                  <option value="finishing">{tBilingual("Finishing & Binding", "ফিনিশিং ও বাইন্ডিং")}</option>
                  <option value="installation">{tBilingual("Installation & Site Work", "ইনস্টলেশন ও সাইট কাজ")}</option>
                  <option value="design_service">{tBilingual("Design & Artwork", "ডিজাইন ও আর্টওয়ার্ক")}</option>
                  <option value="delivery_logistics">{tBilingual("Delivery & Logistics", "ডেলিভারি ও লজিস্টিকস")}</option>
                </>
              )}
            </select>
            <Button
 type="button"variant="outline"size="sm"onClick={() => {
 setEditingCategory(null)
 setIsCategoryModalOpen(true)
              }}
 title="Add New Category"className="h-9 px-2.5 text-xs text-muted-foreground border-input hover:border-primary/20 hover:text-primary shrink-0">
              <Plus className="h-3.5 w-3.5 mr-1"/>
 Category
            </Button>
          </div>
        )}

        {/* Commercial Type Dropdown (Catalog Tabs only) */}
        {(entityTypeFilter === 'all' || entityTypeFilter === 'product' || entityTypeFilter === 'service' || entityTypeFilter === 'material' || entityTypeFilter === 'outsource') && (
          <div>
            <select
 value={selectedType}
 onChange={(e) => setSelectedType(e.target.value)}
 className="h-9 px-3 rounded-lg border border-input bg-card text-xs font-semibold">
              <option value="all">{tBilingual('All Commercial Types', 'সকল পণ্যের ধরন')}</option>
              {COMMERCIAL_PRODUCT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {locale === 'bn' ? (t.label_bn || t.label) : t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-bold">
          <button
 onClick={() => setStatusFilter('active')}
 className={cn(
              'px-3 py-1.5 rounded-md transition-all cursor-pointer',
 statusFilter === 'active' ? 'bg-card text-primary text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            )}
          >{tBilingual('Active', 'সক্রিয়')}</button>
          <button onClick={() => setStatusFilter('low_margin')}
 className={cn(
              'px-3 py-1.5 rounded-md transition-all cursor-pointer',
 statusFilter === 'low_margin' ? 'bg-card text-warning text-warning shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            )}
          >{tBilingual('Low Margin', 'কম মার্জিন')}</button>
          <button onClick={() => setStatusFilter('archived')}
 className={cn(
              'px-3 py-1.5 rounded-md transition-all cursor-pointer',
 statusFilter === 'archived' ? 'bg-card text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            )}
          >{tBilingual('Archived', 'আর্কাইভড')}</button>
          <button onClick={() => setStatusFilter('all')}
 className={cn(
              'px-3 py-1.5 rounded-md transition-all cursor-pointer',
 statusFilter === 'all' ? 'bg-card text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            )}
          >{tBilingual('All', 'সকল')}</button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: PRINTING METHODS MASTER TAB                     */}
      {/* ======================================================== */}
      {entityTypeFilter === 'printing_methods' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Printing Technologies & Methods', 'প্রিন্টিং টেকনোলজি ও মেথডস')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold">
                  {filteredPrintingMethods.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
 Configurable printing methods (Eco-Solvent, UV Flatbed, UV Roll, DTF, Sublimation, Latex, etc.) usable across all Print Services.
              </CardDescription>
            </div>
            <Button
 size="sm"onClick={() => {
 setEditingPrintingMethod(null)
 setIsPrintingMethodModalOpen(true)
              }}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
 Add Printing Method
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPrintingMethods.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Palette className="h-10 w-10 text-muted-foreground mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Printing Methods Found', 'কোনো প্রিন্টিং পদ্ধতি পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('Add printing technologies to bind compatible raw media, ink rates, and production speeds.', 'কাঁচামাল, কালির দর ও উৎপাদন গতির সাথে যুক্ত করতে নতুন প্রিন্টিং প্রযুক্তি যুক্ত করুন।')}
                </p>
                <Button
 size="sm"onClick={() => {
 setEditingPrintingMethod(null)
 setIsPrintingMethodModalOpen(true)
                  }}
 className="mt-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-3.5 w-3.5 mr-1"/> Add Printing Method
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Method Name & Description', 'পদ্ধতির নাম ও বিবরণ')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Code', 'কোড')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Compatible Media', 'উপযোগী মিডিয়া')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Default Ink System', 'ডিফল্ট কালি সিস্টেম')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Base Cost / sqft', 'বেস খরচ / বর্গফুট')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-right bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredPrintingMethods.map((pm) => (
                      <tr key={pm.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <div>{pm.name}</div>
                          {pm.name_bn && <div className="text-xs text-muted-foreground font-medium font-bengali">{pm.name_bn}</div>}
                          {pm.description && <div className="text-xs text-muted-foreground font-normal">{pm.description}</div>}
                        </td>
                        <td className="py-3.5 px-3 tabular-nums text-xs text-muted-foreground">
                          {pm.code ? <Badge variant="secondary"className="tabular-nums text-xs">{pm.code}</Badge> : '—'}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(pm.compatible_material_types || []).map((t) => (
                              <Badge key={t} variant="secondary"className="text-xs uppercase tabular-nums">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-muted-foreground">
                          {pm.default_ink_type || 'Standard CMYK'}
                        </td>
                        <td className="py-3.5 px-3 tabular-nums font-semibold text-xs text-foreground">
                          ৳{pm.cost_per_sqft || 0}/sft
                        </td>
                        <td className="py-3.5 px-3">
                          {pm.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                              <span className="h-1.5 w-1.5 rounded-full bg-success"/> {tBilingual('Active', 'সক্রিয়')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
 size="sm"variant="outline"onClick={() => {
 setEditingPrintingMethod(pm)
 setIsPrintingMethodModalOpen(true)
                              }}
 className="h-7 text-xs px-2">
 Edit
                            </Button>
                            <Button
 size="sm"variant="ghost"onClick={() => handleDeletePrintingMethod(pm.id)}
 className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-danger-surface"title="Delete Method">
                              <Trash2 className="h-3.5 w-3.5"/>
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
      )}

      {/* ======================================================== */}
      {/* VIEW 2: FINISHING MASTERS TAB                           */}
      {/* ======================================================== */}
      {entityTypeFilter === 'finishing' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Post-Press Finishing & Fabrication Masters', 'পোস্ট-প্রেস ফিনিশিং ও ফেব্রিকেশন মাস্টার্স')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold">
                  {filteredFinishingOptions.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
 Configurable finishing operations (Hemming, Eyelets, Lamination, Binding, Seaming, Foam Mounts, Framing) selectable inside services and quotations.
              </CardDescription>
            </div>
            <Button
 size="sm"onClick={() => {
 setEditingFinishing(null)
 setIsFinishingModalOpen(true)
              }}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
 Add Finishing Option
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {filteredFinishingOptions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Scissors className="h-10 w-10 text-muted-foreground mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Finishing Options Configured', 'কোনো ফিনিশিং অপশন পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('Add finishing operations with custom pricing methods (per sqft, per linear ft, per piece, or fixed) to attach them to services.', 'সার্ভিসের সাথে যুক্ত করতে প্রতি বর্গফুট, রানিং ফুট বা পিস ভিত্তিক ফিনিশিং অপশন যুক্ত করুন।')}
                </p>
                <Button
 size="sm"onClick={() => {
 setEditingFinishing(null)
 setIsFinishingModalOpen(true)
                  }}
 className="mt-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-3.5 w-3.5 mr-1"/> Add Finishing Option
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Finishing Name', 'ফিনিশিংয়ের নাম')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Category', 'ক্যাটাগরি')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Pricing Method', 'মূল্য পদ্ধতি')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Unit Cost', 'একক খরচ')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Selling Price', 'বিক্রয় মূল্য')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Gross Margin', 'মোট মার্জিন')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Linked Material', 'যুক্ত কাঁচামাল')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-right bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredFinishingOptions.map((f) => {
 const margin =
 f.selling_price > 0
                          ? Math.round(((f.selling_price - (f.cost || 0)) / f.selling_price) * 100)
                          : 0
 const linkedMat = products.find((p) => p.id === f.material_id)

 return (
                        <tr key={f.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-foreground">
                            <div>{f.name}</div>
                            {f.name_bn && <div className="text-xs text-muted-foreground font-medium font-bengali">{f.name_bn}</div>}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-muted text-foreground">
                              {f.category?.replace('_', ' ') || 'General'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs text-foreground">
                            <Badge variant="outline"className="text-xs uppercase">
                              {f.pricing_method?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs text-muted-foreground">
                            ৳{f.cost || 0}
                          </td>
                          <td className="py-3.5 px-3 tabular-nums font-bold text-xs text-foreground">
                            ৳{f.selling_price || 0}
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs">
                            <span
 className={cn(
                                'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border',
 margin >= 35
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                                  : 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                              )}
                            >
                              {margin}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-xs text-muted-foreground">
                            {linkedMat ? (
                              <span className="text-primary font-semibold">{linkedMat.name}</span>
                            ) : (
                              <span className="text-muted-foreground italic">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            {f.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success"/> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
 size="sm"variant="outline"onClick={() => {
 setEditingFinishing(f)
 setIsFinishingModalOpen(true)
                                }}
 className="h-7 text-xs px-2">
 Edit
                              </Button>
                              <Button
 size="sm"variant="ghost"onClick={() => handleDeleteFinishingOption(f.id)}
 className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-danger-surface"title="Delete Finishing Option">
                                <Trash2 className="h-3.5 w-3.5"/>
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
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: ADDITIONAL WORK MASTERS TAB                     */}
      {/* ======================================================== */}
      {entityTypeFilter === 'additional' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Additional Work & Catalog Addons', 'অতিরিক্ত কাজ ও ক্যাটালগ অ্যাড-অন')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold">
                  {filteredAdditionalOptions.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
 Reusable hardware items, stand accessories, framing, and add-on charges linked to catalog products.
              </CardDescription>
            </div>
            <Button
 size="sm"onClick={() => {
 setEditingAdditional(null)
 setIsAdditionalModalOpen(true)
              }}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
 Add Additional Option
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAdditionalOptions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <PlusCircle className="h-10 w-10 text-muted-foreground mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Additional Options Configured', 'কোনো অতিরিক্ত অপশন পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('Add hardware accessories, stands, or extra charges to attach them directly to jobs and quotes.', 'কোটেশন বা জবের সাথে যুক্ত করতে স্ট্যান্ড বা অতিরিক্ত ফি যুক্ত করুন।')}
                </p>
                <Button
 size="sm"onClick={() => {
 setEditingAdditional(null)
 setIsAdditionalModalOpen(true)
                  }}
 className="mt-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-3.5 w-3.5 mr-1"/> Add Additional Option
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Option Name', 'অপশনের নাম')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Linked Catalog Item', 'যুক্ত পণ্য')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Pricing Method', 'মূল্য পদ্ধতি')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Unit Cost', 'একক খরচ')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Selling Price', 'বিক্রয় মূল্য')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Gross Margin', 'মোট মার্জিন')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-right bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredAdditionalOptions.map((a) => {
 const margin =
 a.selling_price > 0
                          ? Math.round(((a.selling_price - (a.cost || 0)) / a.selling_price) * 100)
                          : 0
 const linkedProduct = products.find((p) => p.id === a.product_id)

 return (
                        <tr key={a.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-foreground">
                            <div>{a.name}</div>
                            {a.name_bn && <div className="text-xs text-muted-foreground font-medium font-bengali">{a.name_bn}</div>}
                          </td>
                          <td className="py-3.5 px-3 text-xs text-muted-foreground">
                            {linkedProduct ? (
                              <span className="text-primary font-semibold">{linkedProduct.name}</span>
                            ) : (
                              <span className="text-muted-foreground italic">None (Custom)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs">
                            <Badge variant="outline"className="text-xs uppercase">
                              {a.pricing_method?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs text-muted-foreground">
                            ৳{a.cost || 0}
                          </td>
                          <td className="py-3.5 px-3 tabular-nums font-bold text-xs text-foreground">
                            ৳{a.selling_price || 0}
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs">
                            <span
 className={cn(
                                'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border',
 margin >= 35
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                                  : 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                              )}
                            >
                              {margin}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            {a.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success"/> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
 size="sm"variant="outline"onClick={() => {
 setEditingAdditional(a)
 setIsAdditionalModalOpen(true)
                                }}
 className="h-7 text-xs px-2">
 Edit
                              </Button>
                              <Button
 size="sm"variant="ghost"onClick={() => handleDeleteAdditionalOption(a.id)}
 className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-danger-surface"title="Delete Additional Option">
                                <Trash2 className="h-3.5 w-3.5"/>
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
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: INSTALLATION & DELIVERY MASTERS TAB              */}
      {/* ======================================================== */}
      {entityTypeFilter === 'installation' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Installation, Logistics & Dispatch Masters', 'ইনস্টলেশন, লজিস্টিকস ও ডেলিভারি মাস্টার্স')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold">
                  {filteredInstallationOptions.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
 Configurable site installations, height tiers, delivery dispatches, and logistics tariffs with automated production task integration.
              </CardDescription>
            </div>
            <Button
 size="sm"onClick={() => {
 setEditingInstallation(null)
 setIsInstallationModalOpen(true)
              }}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
 Add Installation Option
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {filteredInstallationOptions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Truck className="h-10 w-10 text-muted-foreground mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Installation & Delivery Options Configured', 'কোনো ইনস্টলেশন বা ডেলিভারি অপশন পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('Add installation tariffs or delivery zones with automatic shop-floor task generation upon order confirmation.', 'অর্ডারের সাথে স্বয়ংক্রিয় টাস্ক তৈরি করতে ইনস্টলেশন রেট বা ডেলিভারি জোন যুক্ত করুন।')}
                </p>
                <Button
 size="sm"onClick={() => {
 setEditingInstallation(null)
 setIsInstallationModalOpen(true)
                  }}
 className="mt-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-3.5 w-3.5 mr-1"/> Add Installation Option
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 bangla-text">{tBilingual('Scope Name', 'কাজের নাম')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Fulfillment Scope', 'কাজের ক্ষেত্র')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Production Task', 'প্রোডাকশন টাস্ক')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Pricing Method', 'মূল্য পদ্ধতি')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Unit Cost', 'একক খরচ')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Selling Rate', 'বিক্রয় দর')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Gross Margin', 'মোট মার্জিন')}</th>
                      <th className="py-3 px-3 bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-right bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredInstallationOptions.map((i) => {
 const margin =
 i.selling_price > 0
                          ? Math.round(((i.selling_price - (i.cost || 0)) / i.selling_price) * 100)
                          : 0

 return (
                        <tr key={i.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-foreground">
                            <div>{i.name}</div>
                            {i.name_bn && <div className="text-xs text-muted-foreground font-medium font-bengali">{i.name_bn}</div>}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20 bg-primary/10 text-primary">
                              {i.fulfillment_type || 'Installation'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            {i.creates_task ? (
                              <Badge className="bg-success-surface text-success border-success-border bg-success-surface/60 text-success text-xs">
                                🛠️ Auto-Task
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No Task</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs">
                            <Badge variant="outline"className="text-xs uppercase">
                              {i.pricing_method?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs text-muted-foreground">
                            ৳{i.cost || 0}
                          </td>
                          <td className="py-3.5 px-3 tabular-nums font-bold text-xs text-foreground">
                            ৳{i.selling_price || 0}
                          </td>
                          <td className="py-3.5 px-3 tabular-nums text-xs">
                            <span
 className={cn(
                                'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border',
 margin >= 35
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                                  : 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                              )}
                            >
                              {margin}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            {i.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success"/> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
 size="sm"variant="outline"onClick={() => {
 setEditingInstallation(i)
 setIsInstallationModalOpen(true)
                                }}
 className="h-7 text-xs px-2">
 Edit
                              </Button>
                              <Button
 size="sm"variant="ghost"onClick={() => handleDeleteInstallationOption(i.id)}
 className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-danger-surface"title="Delete Installation Option">
                                <Trash2 className="h-3.5 w-3.5"/>
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
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* VIEW 5: SERVICES SPECIALIZED TABLE                       */}
      {/* ======================================================== */}
      {entityTypeFilter === 'service' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Printing & Fabrication Services Master', 'প্রিন্টিং ও ফেব্রিকেশন সার্ভিসেস মাস্টার')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold">
                  {filteredProducts.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
 Large format, signage, offset, and fabrication services configured with substrate dimensions, allowances, and finishing options.
              </CardDescription>
            </div>
            <Button
 size="sm"onClick={handleOpenCreateService}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
 New Service
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse"/>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Printer className="h-10 w-10 text-muted-foreground mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Services Found', 'কোনো সার্ভিস পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('Create high-performance printing services with media allowances, dimension presets, and finishing tariffs.', 'সাইজ প্রিসেট ও ফিনিশিং ট্যারিফ সহ নতুন প্রিন্টিং সার্ভিস তৈরি করুন।')}
                </p>
                <Button size="sm"onClick={handleOpenCreateService} className="mt-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-3.5 w-3.5 mr-1"/> Add Service
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px] bangla-text">{tBilingual('Service & SKU', 'সার্ভিস ও এসকেইউ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Print Media', 'প্রিন্ট মিডিয়া')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Pricing Model', 'প্রাইসিং মডেল')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Dimension Presets', 'সাইজ ও মাপ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Finishing', 'ফিনিশিং')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Base Cost', 'বেস খরচ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Selling Rate', 'বিক্রয় দর')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Gross Margin', 'মোট মার্জিন')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Min Charge', 'সর্বনিম্ন চার্জ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap w-[70px] min-w-[70px] bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredProducts.map((item, idx) => {
 const marginPercent =
 item.selling_price > 0
                          ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 1000) / 10
                          : 0
 const presets = item.service_config?.dimension_presets || item.service_config?.presets || []
 const finishings = item.service_config?.finishing_options || []

 return (
                        <tr key={item.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <Link
 href={getTenantNavHref(`/products/${item.id}`, pathname, slug)}
 className="font-bold text-foreground hover:text-primary flex items-center gap-1.5 group">
                              <span>{locale === 'bn' ? (item.name_bn || item.name) : item.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity"/>
                            </Link>
                            <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                              {item.sku} • {item.category || 'printing'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <Badge variant="outline"className="text-xs font-medium whitespace-nowrap">
                              {item.service_config?.printable_material_name || item.material_spec || 'Standard Media'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums text-xs text-foreground">
                            <Badge variant="secondary"className="text-xs uppercase whitespace-nowrap">
                              {(item.pricing_method || item.service_config?.pricing_method || 'per_area').replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {presets.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[160px]">
                                {presets.slice(0, 2).map((p, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-muted text-xs tabular-nums rounded whitespace-nowrap">
                                    {p.width}&apos;×{p.length}&apos;
                                  </span>
                                ))}
                                {presets.length > 2 && (
                                  <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">+{presets.length - 2} more</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic whitespace-nowrap">Custom Dimensions</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {finishings.length > 0 ? (
                              <Badge variant="secondary"className="text-xs whitespace-nowrap">
                                {finishings.length} options
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic whitespace-nowrap">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <CurrencyDisplay amount={item.base_cost} />
                              <span className="text-xs text-muted-foreground">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums font-bold text-xs text-foreground">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <CurrencyDisplay amount={item.selling_price} />
                              <span className="text-xs font-normal text-muted-foreground">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-center tabular-nums text-xs">
                            <span
 className={cn(
                                'inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold border',
 marginPercent >= 35
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                                  : marginPercent >= 20
                                  ? 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                                  : 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning'
                              )}
                            >
                              {marginPercent}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-center text-xs tabular-nums">
                            {item.minimum_charge ? <span className="text-primary font-bold">৳{item.minimum_charge}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-center">
                            {item.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success"/> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> {tBilingual('Archived', 'আর্কাইভড')}
                              </span>
                            )}
                          </td>
                          {renderProductActionMenu(item, idx, filteredProducts.length)}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* VIEW 6: READY PRODUCTS SPECIALIZED TABLE                 */}
      {/* ======================================================== */}
      {entityTypeFilter === 'product' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Ready Products & Display Hardware', 'প্রস্তুত পণ্য ও ডিসপ্লে হার্ডওয়্যার')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold">
                  {filteredProducts.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
 Finished physical units (Rollup standees, X-banners, POP displays, acrylic stands, frames) with dimensions and tiered pricing.
              </CardDescription>
            </div>
            <Button
 size="sm"onClick={handleOpenCreateProduct}
 className="bg-primary hover:bg-primary text-white text-xs shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
 New Ready Product
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse"/>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Package className="h-10 w-10 text-muted-foreground mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Ready Products Found', 'কোনো প্রস্তুত পণ্য পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('Add finished display hardware or stock products with packaging specifications and tiered dealer pricing.', 'প্যাকেজিং স্পেসিফিকেশন ও ডিলার প্রাইসিং সহ ফিনিশড ডিসপ্লে পণ্য যুক্ত করুন।')}
                </p>
                <Button size="sm"onClick={handleOpenCreateProduct} className="mt-2 text-xs bg-primary hover:bg-primary text-white">
                  <Plus className="h-3.5 w-3.5 mr-1"/> Add Ready Product
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px] bangla-text">{tBilingual('Product & SKU', 'পণ্য ও এসকেইউ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Physical Dimensions & Spec', 'পরিমাপ ও বিবরণ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Packaging & MOQ', 'প্যাকেজিং ও নূন্যতম অর্ডার')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Price Tiers', 'মূল্যের স্তর')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Unit Cost', 'একক খরচ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Selling Rate', 'বিক্রয় দর')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Gross Margin', 'মোট মার্জিন')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap w-[70px] min-w-[70px] bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredProducts.map((item, idx) => {
 const marginPercent =
 item.selling_price > 0
                          ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 1000) / 10
                          : 0
 const tiers = item.price_tiers || {}

 return (
                        <tr key={item.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <Link
 href={getTenantNavHref(`/products/${item.id}`, pathname, slug)}
 className="font-bold text-foreground hover:text-primary flex items-center gap-1.5 group">
                              <span>{item.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity"/>
                            </Link>
                            {item.name_bn && (
                              <div className="text-xs text-muted-foreground font-medium font-bengali">{item.name_bn}</div>
                            )}
                            <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                              {item.sku} • {item.category || 'hardware'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-xs text-foreground whitespace-nowrap">
                              {item.dimensions_spec || item.material_spec || 'Standard Dimension'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                            <span className="whitespace-nowrap">📦 MOQ: {item.min_order_quantity || 1} {item.unit || 'pcs'}</span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 text-xs tabular-nums">
                              {tiers.corporate ? (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary bg-primary/10 text-primary rounded border border-primary/20 whitespace-nowrap">
 Corp: ৳{tiers.corporate}
                                </span>
                              ) : null}
                              {tiers.dealer ? (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary bg-primary/10 text-primary rounded border border-primary/20 whitespace-nowrap">
 Dealer: ৳{tiers.dealer}
                                </span>
                              ) : null}
                              {tiers.wholesale ? (
                                <span className="px-1.5 py-0.5 bg-success-surface text-success bg-success-surface text-success rounded border border-success-border whitespace-nowrap">
 WS: ৳{tiers.wholesale}
                                </span>
                              ) : null}
                              {!tiers.corporate && !tiers.dealer && !tiers.wholesale && (
                                <span className="text-muted-foreground italic whitespace-nowrap">Standard Retail</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <CurrencyDisplay amount={item.base_cost} />
                              <span className="text-xs text-muted-foreground">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums font-bold text-xs text-foreground">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <CurrencyDisplay amount={item.selling_price} />
                              <span className="text-xs font-normal text-muted-foreground">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-center tabular-nums text-xs">
                            <span
 className={cn(
                                'inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold border',
 marginPercent >= 35
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                                  : marginPercent >= 20
                                  ? 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                                  : 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning'
                              )}
                            >
                              {marginPercent}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-center">
                            {item.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success"/> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> Archived
                              </span>
                            )}
                          </td>
                          {renderProductActionMenu(item, idx, filteredProducts.length)}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* VIEW 7: RAW MATERIALS & MEDIA SPECIALIZED TABLE          */}
      {/* ======================================================== */}
      {entityTypeFilter === 'material' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Raw Materials & Media Master', 'কাঁচামাল ও মিডিয়া মাস্টার')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold">
                  {filteredProducts.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
 Roll media, rigid substrate boards, ink stocks, and hardware materials with dimensional conversion ratios and yield costing.
              </CardDescription>
            </div>
            <Button
 size="sm"onClick={handleOpenCreateMaterial}
 className="bg-success hover:bg-success text-white text-xs shrink-0">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
 New Raw Material
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse"/>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Layers className="h-10 w-10 text-muted-foreground mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Raw Materials Found', 'কোনো কাঁচামাল পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('Add media (rolls, sheets, inks) with bulk procurement rates, dimensional conversion ratios, and wastage factors.', 'পাইকারি ক্রয় দর ও রূপান্তর হিসাব সহ কাঁচামাল যুক্ত করুন।')}
                </p>
                <Button size="sm"onClick={handleOpenCreateMaterial} className="mt-2 text-xs bg-success hover:bg-success text-white">
                  <Plus className="h-3.5 w-3.5 mr-1"/> Add Raw Material
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px] bangla-text">{tBilingual('Material Name & SKU', 'কাঁচামালের নাম ও এসকেইউ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Media Form & Geometry', 'মিডিয়া আকার ও পরিমাপ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Purchase Economics', 'ক্রয় দর ও হিসাব')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Yield & Conversion', 'উৎপাদন ও রূপান্তর')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Compatible Printing', 'উপযোগী প্রিন্টিং')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Effective Cost / Unit', 'কার্যকর খরচ / একক')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap w-[70px] min-w-[70px] bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredProducts.map((item, idx) => {
 const printingList = item.material_config?.compatible_printing_methods || item.printing_methods || []

 return (
                        <tr key={item.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <Link
 href={getTenantNavHref(`/products/${item.id}`, pathname, slug)}
 className="font-bold text-foreground hover:text-primary flex items-center gap-1.5 group">
                              <span>{item.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity"/>
                            </Link>
                            {item.name_bn && (
                              <div className="text-xs text-muted-foreground font-medium font-bengali">{item.name_bn}</div>
                            )}
                            <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                              {item.sku} • {item.material_spec || 'Standard Grade'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {item.roll_width_ft && item.roll_length_ft ? (
                              <Badge variant="outline"className="text-xs tabular-nums bg-primary/10/50 whitespace-nowrap">
 Roll: {item.roll_width_ft}&apos; × {item.roll_length_ft}&apos;
                              </Badge>
                            ) : item.sheet_width_ft && item.sheet_length_ft ? (
                              <Badge variant="outline"className="text-xs tabular-nums bg-success-surface/50 whitespace-nowrap">
 Sheet: {item.sheet_width_ft}&apos; × {item.sheet_length_ft}&apos;
                              </Badge>
                            ) : (
                              <Badge variant="outline"className="text-xs tabular-nums whitespace-nowrap">
 Unit ({item.unit})
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {item.purchase_price && item.purchase_price > 0 ? (
                              <div>
                                <div className="tabular-nums text-xs font-bold text-foreground whitespace-nowrap">
                                  ৳{item.purchase_price} / {item.purchase_unit || 'roll'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic whitespace-nowrap">No Purchase Tariff</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                            <div className="whitespace-nowrap">1 {item.purchase_unit || 'roll'} = {getProductConversionRatio(item)} {item.selling_unit || item.unit}</div>
                            {item.default_wastage_percentage ? (
                              <div className="text-xs text-warning whitespace-nowrap">({item.default_wastage_percentage}% waste allowance)</div>
                            ) : null}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {printingList.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {printingList.map((m, idx) => (
                                  <Badge key={idx} variant="secondary"className="text-xs uppercase tabular-nums whitespace-nowrap">
                                    {m}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic whitespace-nowrap">Universal Media</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums font-bold text-xs text-foreground">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <span>৳{item.base_cost}</span>
                              <span className="text-xs font-normal text-muted-foreground">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-center">
                            {item.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success"/> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> Archived
                              </span>
                            )}
                          </td>
                          {renderProductActionMenu(item, idx, filteredProducts.length)}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* VIEW 7.5: OUTSOURCE PRODUCTS (NON-INVENTORY) TABLE       */}
      {/* ======================================================== */}
      {entityTypeFilter === 'outsource' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Outsource Products & Subcontract Services', 'আউটসোর্স পণ্য ও সাব-কন্ট্রাক্ট সার্ভিস')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold text-primary border-primary/20">
                  {filteredProducts.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
 Subcontracted non-inventory products (Offset leaflets, neon flex signs, computer embroidery, special foil/die-cut, 3D channel letters) routed directly to third-party vendors.
              </CardDescription>
            </div>
            <Button
 size="sm"onClick={handleOpenCreateOutsource}
 className="bg-primary hover:bg-primary text-white text-xs shrink-0 font-bold">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
 New Outsource Product
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse"/>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Share2 className="h-10 w-10 text-primary mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Outsource Products Found', 'কোনো আউটসোর্স পণ্য পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('Add non-inventory outsource items with third-party vendor cost, turnaround lead time, and multi-tier pricing.', 'ভেন্ডর খরচ ও সময়সীমা উল্লেখ করে আউটসোর্স আইটেম যুক্ত করুন।')}
                </p>
                <Button size="sm"onClick={handleOpenCreateOutsource} className="mt-2 text-xs bg-primary hover:bg-primary text-white">
                  <Plus className="h-3.5 w-3.5 mr-1"/> Add Outsource Product
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px] bangla-text">{tBilingual('Product & SKU', 'পণ্য ও এসকেইউ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Subcontract Vendor', 'সাব-কন্ট্রাক্ট ভেন্ডর')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Lead Time & Inventory', 'সময় ও স্টক')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Price Tiers', 'মূল্যের স্তর')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Vendor Cost', 'ভেন্ডর খরচ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Selling Rate', 'বিক্রয় দর')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Gross Margin', 'মোট মার্জিন')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap w-[70px] min-w-[70px] bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredProducts.map((item, idx) => {
 const marginPercent =
 item.selling_price > 0
                          ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 1000) / 10
                          : 0
 const tiers = item.price_tiers || {}
 const vendorName = item.vendor_name || item.outsource_config?.vendor_name || 'Vendor Subcontract'
 const vendorPhone = item.vendor_phone || item.outsource_config?.vendor_phone
 const turnaround = item.turnaround_days ?? item.outsource_config?.turnaround_days ?? 3

 return (
                        <tr key={item.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <Link
 href={getTenantNavHref(`/products/${item.id}`, pathname, slug)}
 className="font-bold text-foreground hover:text-primary flex items-center gap-1.5 group">
                              <span>{item.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity"/>
                            </Link>
                            {item.name_bn && (
                              <div className="text-xs text-muted-foreground font-medium font-bengali">{item.name_bn}</div>
                            )}
                            <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                              {item.sku} • {item.category || 'outsource'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-xs text-foreground flex items-center gap-1 whitespace-nowrap">
                              <Building2 className="h-3 w-3 text-primary"/>
                              <span>{vendorName}</span>
                            </div>
                            {vendorPhone && (
                              <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{vendorPhone}</div>
                            )}
                            {item.vendor_item_code && (
                              <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">Ref: {item.vendor_item_code}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground whitespace-nowrap">
                                <Clock className="h-3 w-3 text-warning"/>
                                {turnaround} {turnaround === 1 ? 'day' : 'days'}
                              </span>
                              <Badge variant="outline"className="text-xs bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary w-fit whitespace-nowrap">
 Non-Inventory
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 text-xs tabular-nums">
                              {tiers.corporate ? (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary bg-primary/10 text-primary rounded border border-primary/20 whitespace-nowrap">
 Corp: ৳{tiers.corporate}
                                </span>
                              ) : null}
                              {tiers.dealer ? (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary bg-primary/10 text-primary rounded border border-primary/20 whitespace-nowrap">
 Dealer: ৳{tiers.dealer}
                                </span>
                              ) : null}
                              {tiers.wholesale ? (
                                <span className="px-1.5 py-0.5 bg-success-surface text-success bg-success-surface text-success rounded border border-success-border whitespace-nowrap">
 WS: ৳{tiers.wholesale}
                                </span>
                              ) : null}
                              {!tiers.corporate && !tiers.dealer && !tiers.wholesale && (
                                <span className="text-muted-foreground italic whitespace-nowrap">Standard Retail</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <CurrencyDisplay amount={item.base_cost} />
                              <span className="text-xs text-muted-foreground">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap tabular-nums font-bold text-xs text-foreground">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <CurrencyDisplay amount={item.selling_price} />
                              <span className="text-xs font-normal text-muted-foreground">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-center tabular-nums text-xs">
                            <span
 className={cn(
                                'inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold border',
 marginPercent >= 35
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                                  : marginPercent >= 20
                                  ? 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                                  : 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning'
                              )}
                            >
                              {marginPercent}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-center">
                            {item.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success"/> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> Archived
                              </span>
                            )}
                          </td>
                          {renderProductActionMenu(item, idx, filteredProducts.length)}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* VIEW 8: UNIFIED ALL COMMERCIAL CATALOG ITEMS             */}
      {/* ======================================================== */}
      {entityTypeFilter === 'all' && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-border bg-muted">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Commercial Master Catalog', 'কমার্শিয়াল মাস্টার ক্যাটালগ')}</span>
                <Badge variant="outline"className="text-xs tabular-nums font-bold">
                  {filteredProducts.length}
                </Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground">{tBilingual("PostgreSQL Authoritative Units, Conversion & Costing", "ইউনিট কনভার্সন ও নির্ভরযোগ্য কস্টিং")}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Loading Skeleton */}
            {isLoading && (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse"/>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredProducts.length === 0 && (
              <div className="p-12 text-center space-y-3">
                <Package className="h-10 w-10 text-muted-foreground mx-auto"/>
                <h3 className="text-sm font-bold text-foreground">{tBilingual('No Products Found', 'কোনো পণ্য পাওয়া যায়নি')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {tBilingual('No catalog items matched your current filter criteria. Create a new product or reset your search.', 'আপনার ফিল্টারের সাথে মিলে এমন কোনো পণ্য পাওয়া যায়নি। নতুন পণ্য তৈরি করুন অথবা ফিল্টার রিসেট করুন।')}
                </p>
                <Button size="sm"onClick={handleOpenCreate} className="mt-2 text-xs bg-primary hover:bg-primary">
                  <Plus className="h-3.5 w-3.5 mr-1"/> {tBilingual('Add New Item', 'নতুন আইটেম যোগ করুন')}
                </Button>
              </div>
            )}

            {/* Desktop Table View */}
            {!isLoading && filteredProducts.length > 0 && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px] bangla-text">{tBilingual('Item & SKU', 'আইটেম ও এসকেইউ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Entity Kind', 'পণ্যের ধরন')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Purchase Economics', 'ক্রয় দর ও হিসাব')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Effective Cost', 'কার্যকর খরচ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap bangla-text">{tBilingual('Selling Rate', 'বিক্রয় দর')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Gross Margin', 'মোট মার্জিন')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Min Charge', 'সর্বনিম্ন চার্জ')}</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap w-[70px] min-w-[70px] bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredProducts.map((item, idx) => {
 const marginPercent =
 item.selling_price > 0
                          ? Math.round(((item.selling_price - item.base_cost) / item.selling_price) * 1000) / 10
                          : 0

 const isService = isServiceItem(item)
 const isMaterial = isMaterialItem(item)

 return (
                        <tr key={item.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                          {/* Item & SKU */}
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <Link
 href={getTenantNavHref(`/products/${item.id}`, pathname, slug)}
 className="font-bold text-foreground hover:text-primary flex items-center gap-1.5 group">
                              <span>{item.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity"/>
                            </Link>
                            {item.name_bn && (
                              <div className="text-xs text-muted-foreground font-medium font-bengali">{item.name_bn}</div>
                            )}
                            <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                              {item.sku} {item.material_spec ? `• ${item.material_spec}` : ''}
                            </div>
                          </td>

                          {/* Entity Kind Badge */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
 className={cn(
                                'inline-flex items-center whitespace-nowrap capitalize px-2 py-0.5 rounded text-xs font-semibold border',
 isOutsourceProduct(item)
                                  ? 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                                  : isServiceProduct(item)
                                  ? 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                                  : isMaterialProduct(item)
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                                  : 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                              )}
                            >
                              {getProductEntityKindLabel(item, locale)}
                            </span>
                          </td>

                          {/* Purchase Economics */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {!isService && item.purchase_price && item.purchase_price > 0 ? (
                              <div>
                                <div className="tabular-nums text-xs font-bold text-foreground whitespace-nowrap">
                                  ৳{item.purchase_price} / {item.purchase_unit || 'roll'}
                                </div>
                                <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                  1 {item.purchase_unit || 'roll'} = {getProductConversionRatio(item)} {item.selling_unit || item.unit}
                                  {item.default_wastage_percentage ? ` (${item.default_wastage_percentage}% waste)` : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic whitespace-nowrap">{tBilingual('No Purchase Unit', 'ক্রয় একক নেই')}</span>
                            )}
                          </td>

                          {/* Effective Unit Cost */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-xs font-semibold text-muted-foreground tabular-nums">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <CurrencyDisplay amount={item.base_cost} />
                              <span className="text-xs text-muted-foreground font-normal">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>

                          {/* Selling Rate */}
                          <td className="py-3.5 px-3 whitespace-nowrap font-bold text-foreground tabular-nums">
                            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                              <CurrencyDisplay amount={item.selling_price} />
                              <span className="text-xs font-normal text-muted-foreground">/{item.selling_unit || item.unit}</span>
                            </span>
                          </td>

                          {/* Gross Margin % */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-center">
                            <span
 className={cn(
                                'inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold border tabular-nums',
 marginPercent >= 35
                                  ? 'bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border'
                                  : marginPercent >= 20
                                  ? 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border'
                                  : 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning border-warning-border'
                              )}
                            >
                              {marginPercent}%
                            </span>
                          </td>

                          {/* Minimum Charge */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-center text-xs tabular-nums font-medium text-muted-foreground">
                            {item.minimum_charge && item.minimum_charge > 0 ? (
                              <span className="text-primary font-bold">৳{item.minimum_charge}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-center">
                            {item.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success text-success">
                                <span className="h-1.5 w-1.5 rounded-full bg-success"/> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"/> Archived
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          {renderProductActionMenu(item, idx, filteredProducts.length)}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile Card View (390 x 844 touch friendly) */}
            {!isLoading && filteredProducts.length > 0 && (
              <div className="md:hidden divide-y divide-border dark:divide-border">
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
                          href={getTenantNavHref(`/products/${item.id}`, pathname, slug)}
                          className="font-bold text-sm text-foreground hover:text-primary">
                          {locale === 'bn' ? (item.name_bn || item.name) : item.name}
                        </Link>
                          <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                            {item.sku} • {item.material_spec || 'Standard Spec'}
                          </div>
                        </div>
                        <span
 className={cn(
                            'capitalize px-2 py-0.5 rounded text-xs font-semibold border shrink-0',
 isOutsourceProduct(item)
                              ? 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                              : isServiceProduct(item)
                              ? 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                              : isMaterialProduct(item)
                              ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                              : 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary'
                          )}
                        >
                          {getProductEntityKindLabel(item, locale)}
                        </span>
                      </div>

                      {/* Commercial Economics Badges */}
                      {item.purchase_price && item.purchase_price > 0 ? (
                        <div className="text-xs tabular-nums text-muted-foreground bg-muted p-2 rounded-lg border border-border">
 {tBilingual('Buy:', 'ক্রয়:')} <strong>৳{item.purchase_price}/{item.purchase_unit || 'roll'}</strong> (1 {item.purchase_unit || 'roll'} = {getProductConversionRatio(item)} {item.selling_unit || item.unit})
                        </div>
                      ) : null}

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted rounded-lg text-center border border-border">
                        <div>
                          <span className="text-xs text-muted-foreground uppercase block">{tBilingual('Selling Rate', 'বিক্রয় দর')}</span>
                          <div className="tabular-nums font-bold text-xs text-primary text-primary">
                            ৳{item.selling_price}/{item.selling_unit || item.unit}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground uppercase block">{tBilingual('Eff. Cost', 'কার্যকর খরচ')}</span>
                          <div className="tabular-nums text-xs text-muted-foreground">
                            ৳{item.base_cost}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-success uppercase block">{tBilingual('Margin', 'মার্জিন')}</span>
                          <div className="tabular-nums font-bold text-xs text-success">
                            {marginPercent}%
                          </div>
                        </div>
                      </div>

                      {/* Mobile Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {item.is_active !== false ? (
                          <Button
 size="sm"onClick={() => handleOpenFastQuote(item)}
 className="flex-1 h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                            <Calculator className="h-3.5 w-3.5 mr-1"/> {tBilingual('Fast Quote', 'দ্রুত কোটেশন')}
                          </Button>
                        ) : (
                          <Button
 size="sm"onClick={() => handleToggleArchive(item)}
 className="flex-1 h-9 text-xs font-bold bg-success hover:bg-success text-white shadow-xs">
                            <RefreshCw className="h-3.5 w-3.5 mr-1"/> {tBilingual('Restore Item', 'আইটেম পুনরুদ্ধার করুন')}
                          </Button>
                        )}
                        <Button
 size="sm"variant="outline"onClick={() => {
 setPricingProduct(item)
 setNewPrice(item.selling_price)
 setNewPurchasePrice(item.purchase_price || 0)
 setNewTargetMargin(item.target_margin_percentage || 35)
 setNewWastage(item.default_wastage_percentage || 0)
                          }}
 className="h-9 px-2.5 text-xs">
                          <Edit3 className="h-3.5 w-3.5 mr-1"/> {tBilingual('Price', 'দর')}
                        </Button>
                        <Button
 size="sm"variant="outline"onClick={() => handleOpenEdit(item)}
 className="h-9 px-2.5 text-xs">{tBilingual('Edit', 'সম্পাদনা')}</Button>
                        <Link
 href={getTenantNavHref(`/products/${item.id}`, pathname, slug)}
 className="inline-flex items-center justify-center h-9 px-2.5 rounded-md text-xs font-semibold border border-input text-foreground hover:bg-muted">{tBilingual('Detail', 'বিস্তারিত')}</Link>
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
 size="2xl"hideFooter={true}
 title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0">
              <Calculator className="h-5 w-5"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-foreground">
 Fast Estimate & Quotation
                </span>
                <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-1.5 bg-primary/10 text-primary border-primary/20">
 Instant Quote
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
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
              <div className="p-4 bg-success-surface border border-success-border rounded-xl space-y-2 text-success">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-success"/>
                  <span>Quotation Created: {createdQuoteNumber}</span>
                </div>
                <p className="text-xs text-success">
 The quotation has been saved authoritatively in PostgreSQL and can now be dispatched to the client.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link href={getTenantNavHref('/quotations', pathname, slug)}>
                    <Button size="sm"className="bg-success hover:bg-success text-white text-xs">
 View in Quotations Module
                    </Button>
                  </Link>
                  <Button size="sm"variant="outline"onClick={() => setCreatedQuoteNumber(null)} className="text-xs">
 Create Another
                  </Button>
                </div>
              </div>
            )}

            {!createdQuoteNumber && (
              <>
                {/* Customer Details */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    1. Customer Information
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
 Customer / Company Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
 placeholder={tBilingual("e.g. ABC Advertising Ltd", "যেমন: এবিসি অ্যাডভারটাইজিং লি:")}value={quoteCustomerName}
 onChange={(e) => setQuoteCustomerName(e.target.value)}
 className="text-xs h-9"required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
 Mobile Number (WhatsApp) <span className="text-destructive">*</span>
                      </Label>
                      <Input
 placeholder="e.g. 01711223344"value={quoteCustomerPhone}
 onChange={(e) => setQuoteCustomerPhone(e.target.value)}
 className="text-xs h-9"required
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensions & Quantity */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    2. Dimensions & Quantity
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Width</Label>
                      <Input
 type="number"step="0.1"value={quoteWidth}
 onChange={(e) => setQuoteWidth(Math.max(0.1, Number(e.target.value)))}
 className="text-xs h-9 tabular-nums font-bold"/>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Height</Label>
                      <Input
 type="number"step="0.1"value={quoteHeight}
 onChange={(e) => setQuoteHeight(Math.max(0.1, Number(e.target.value)))}
 className="text-xs h-9 tabular-nums font-bold"/>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Unit</Label>
                      <select
 value={quoteDimUnit}
 onChange={(e) => setQuoteDimUnit(e.target.value as any)}
 className="w-full h-9 rounded-lg border border-input bg-card px-2.5 text-xs font-medium">
                        <option value="ft">{tBilingual("Feet (ft)", "ফুট (ft)")}</option>
                        <option value="inch">{tBilingual("Inches (in)", "ইঞ্চি (in)")}</option>
                        <option value="m">{tBilingual("Meters (m)", "মিটার (m)")}</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Quantity (Pcs)</Label>
                      <Input
 type="number"min="1"value={quoteQuantity}
 onChange={(e) => setQuoteQuantity(Math.max(1, parseInt(e.target.value) || 1))}
 className="text-xs h-9 tabular-nums font-bold"/>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-primary/10/60 bg-primary/10 rounded-lg text-xs">
                    <span className="text-muted-foreground">Calculated Billable Area:</span>
                    <span className="tabular-nums font-bold text-primary text-primary">
                      {fastQuoteCalculation.singleAreaSft} SFT × {quoteQuantity} pcs = {fastQuoteCalculation.totalAreaSft} SFT
                    </span>
                  </div>
                </div>

                {/* Add-ons & Finishing */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    3. Finishing & Reusable Add-ons
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                      <input
 type="checkbox"checked={quoteIncludeHemming}
 onChange={(e) => setQuoteIncludeHemming(e.target.checked)}
 className="rounded"/>
                      <span>Hemming (৳{fastQuoteCalculation.hemmingCharge})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                      <input
 type="checkbox"checked={quoteIncludeEyelets}
 onChange={(e) => setQuoteIncludeEyelets(e.target.checked)}
 className="rounded"/>
                      <span>Eyelets ({fastQuoteCalculation.eyeletCount} pcs - ৳{fastQuoteCalculation.eyeletCharge})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                      <input
 type="checkbox"checked={quoteIncludeLamination}
 onChange={(e) => setQuoteIncludeLamination(e.target.checked)}
 className="rounded"/>
                      <span>Lamination (৳{fastQuoteCalculation.laminationCharge})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                      <input
 type="checkbox"checked={quoteIncludeInstallation}
 onChange={(e) => setQuoteIncludeInstallation(e.target.checked)}
 className="rounded"/>
                      <span>Installation (৳{fastQuoteCalculation.installationCharge})</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                      <input
 type="checkbox"checked={quoteIncludeDelivery}
 onChange={(e) => setQuoteIncludeDelivery(e.target.checked)}
 className="rounded"/>
                      <span>Delivery (৳{fastQuoteCalculation.deliveryCharge})</span>
                    </label>
                  </div>
                </div>

                {/* Instant Financial Calculation Readout */}
                <div className="rounded-xl border border-border bg-muted p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
 Print Subtotal ({fastQuoteCalculation.totalAreaSft} {fastQuoteProduct.selling_unit || 'SFT'} @ ৳{fastQuoteCalculation.effectiveRate}):
                      </span>
                      <Badge variant="outline"className="text-xs capitalize tabular-nums">
                        {fastQuoteCalculation.pricingMethod?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="tabular-nums font-semibold">৳{fastQuoteCalculation.printSubtotal}</span>
                  </div>

                  {fastQuoteCalculation.isMinBillableApplied && (
                    <div className="flex justify-between text-xs text-warning text-warning font-semibold bg-warning-surface bg-warning-surface p-2 rounded-md border border-warning-border border-warning-border">
                      <span>Minimum Billable Quantity Rule Applied:</span>
                      <span className="tabular-nums">
 Actual {fastQuoteCalculation.actualQuantity} → Billed as {fastQuoteCalculation.billableQuantity} {fastQuoteProduct.selling_unit || 'sqft'}
                      </span>
                    </div>
                  )}

                  {fastQuoteCalculation.addonsTotal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Finishing & Service Add-ons:</span>
                      <span className="tabular-nums font-semibold">৳{fastQuoteCalculation.addonsTotal}</span>
                    </div>
                  )}

                  {fastQuoteCalculation.isMinChargeApplied && (
                    <div className="flex justify-between text-xs text-primary text-primary font-semibold bg-primary/10 bg-primary/10 p-2 rounded-md border border-primary/20 border-border">
                      <span>Minimum Charge Floor Applied (min ৳{fastQuoteCalculation.minCharge}):</span>
                      <span className="tabular-nums">৳{fastQuoteCalculation.subtotal}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">VAT ({fastQuoteProduct.tax_rate || 7.5}%):</span>
                    <span className="tabular-nums">৳{fastQuoteCalculation.vatAmount}</span>
                  </div>

                  <div className="pt-2 border-t border-border flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Quotation Total:</span>
                      <span className="text-xs text-success font-semibold">
 Est. Cost: ৳{fastQuoteCalculation.estTotalCost} • Gross Profit: ৳{fastQuoteCalculation.estGrossProfit} ({fastQuoteCalculation.estMargin}%)
                      </span>
                      <span className="text-xs text-muted-foreground block">
 Margin Based On: {fastQuoteCalculation.costBasisType === 'direct_cost' ? 'Estimated Direct Job Cost' : 'Material Cost'}
                      </span>
                    </div>
                    <div className="text-xl font-black text-primary text-primary tabular-nums">
                      ৳{fastQuoteCalculation.grandTotal.toLocaleString()}
                    </div>
                  </div>

                  {/* Internal-Only Commercial Production Readout */}
                  <div className="mt-2 p-2.5 bg-muted rounded-lg text-xs text-muted-foreground space-y-1">
                    <span className="font-bold block uppercase tracking-wider text-xs text-muted-foreground">Internal Commercial Analysis:</span>
                    <div className="flex justify-between">
                      <span>Expected Material Consumption (incl. {fastQuoteProduct.default_wastage_percentage || 0}% waste):</span>
                      <span className="tabular-nums font-bold">{fastQuoteCalculation.expectedConsumption} {fastQuoteProduct.selling_unit || 'SFT'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Effective Unit Material Cost:</span>
                      <span className="tabular-nums">৳{fastQuoteProduct.base_cost} / {fastQuoteProduct.selling_unit || 'sft'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border">
                  <Button
 type="button"variant="outline"onClick={() => setFastQuoteProduct(null)}
 className="w-full sm:w-auto text-xs">
 Cancel
                  </Button>
                  <Button
 type="button"onClick={handleGenerateFastQuotation}
 disabled={isPending}
 className="w-full sm:w-auto text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 shadow-sm">
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
 size="3xl"hideFooter={true}
 title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0">
              <Package className="h-5 w-5"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {editingProduct ? 'Update product details and commercial rules.' : 'Create a product or service your business sells.'}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 pt-1 max-h-[78vh] overflow-y-auto pr-1">
          {/* STEP 1: WHAT ARE YOU SELLING? */}
          <div>
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
              1. What are you selling?
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRODUCT_TYPE_CARDS.map((card) => {
 const Icon = card.icon
 const isSelected = formData.commercial_type === card.type
 return (
                  <button
 key={card.type}
 type="button"onClick={() => handleSelectProductType(card.type)}
 className={cn(
                      'flex flex-col items-start p-2.5 rounded-xl border text-left transition-all relative overflow-hidden',
 isSelected
                        ? 'border-border bg-primary/10/70 bg-primary/10 text-primary text-primary shadow-xs ring-1 focus:ring-ring'
                        : 'border-border bg-card hover:border-input text-foreground '
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg',
 isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground '
                      )}>
                        <Icon className="h-4 w-4"/>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary text-primary"/>
                      )}
                    </div>
                    <span className="text-xs font-bold block">{card.label}</span>
                    <span className="text-xs text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                      {card.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* STEP 2: BASIC INFORMATION */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              2. Basic Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold mb-1 block">
 Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
 placeholder={tBilingual("e.g. Star Flex Banner 320 GSM, Vinyl Sticker...", "যেমন: স্টার ফ্লেক্স ব্যানার ৩২০ জিএসএম, ভিনাইল স্টিকার...")}value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="text-sm font-medium h-9"required
 autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold block">
 Category <span className="text-destructive">*</span>
                  </Label>
                  <button
 type="button"onClick={() => {
 setEditingCategory(null)
 setIsCategoryModalOpen(true)
                    }}
 className="text-xs text-primary text-primary hover:text-primary font-semibold flex items-center gap-1 hover:underline">
                    <Plus className="h-3 w-3"/> New Category
                  </button>
                </div>
                <select
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground focus:border-primary/20 focus:outline-none"required
                >
                  <option value="" disabled>{tBilingual("Select category...", "ক্যাটাগরি নির্বাচন করুন...")}</option>
                  {categories.length > 0 ? (
 categories.map((cat) => (
                      <option key={cat.id} value={cat.slug || cat.name}>
                        {cat.parent_name ? `${cat.parent_name} → ` : ''}{cat.name} {cat.name_bn ? `(${cat.name_bn})` : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="flex_banner">{tBilingual("Flex Banner", "ফ্লেক্স ব্যানার")}</option>
                      <option value="vinyl_sticker">{tBilingual("Vinyl Sticker", "ভিনাইল স্টিকার")}</option>
                      <option value="display_stand">{tBilingual("Display Stand", "ডিসপ্লে স্ট্যান্ড")}</option>
                      <option value="finishing">{tBilingual("Finishing", "ফিনিশিং")}</option>
                      <option value="services">{tBilingual("Services & Design", "সার্ভিস ও ডিজাইন")}</option>
                      <option value="delivery_logistics">{tBilingual("Delivery", "ডেলিভারি")}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
 Bengali Name (Optional)
                </Label>
                <Input
 placeholder="যেমন: স্টার ফ্লেক্স ব্যানার"value={formData.name_bn}
 onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
 className="text-xs h-9 font-bengali"/>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
 SKU / Item Code (Optional)
                </Label>
                <Input
 placeholder={tBilingual("PRD-FLX-01", "PRD-FLX-01")}value={formData.sku}
 onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
 className="text-xs h-9 tabular-nums uppercase text-muted-foreground"/>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Description (Optional)</Label>
                <Input
 placeholder={tBilingual("Customer-facing notes or specifications...", "গ্রাহকের জন্য বিশেষ নোট বা বিবরণ...")}value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 className="text-xs h-9"/>
              </div>
            </div>
          </div>

          {/* STEP 3: HOW DO YOU CHARGE? */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              3. How do you charge?
            </span>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
 Pricing Method
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PRICING_PILLS.map((opt) => {
 const isSelected = formData.pricing_method === opt.id
 return (
                    <button
 key={opt.id}
 type="button"onClick={() => handlePricingMethodSelect(opt)}
 className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
 isSelected
                          ? 'bg-primary text-white border-border shadow-xs'
                          : 'bg-muted text-foreground border-border hover:border-input'
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
 Selling Price <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-muted-foreground">৳</span>
                  <Input
 type="number"step="0.1"placeholder="0.00"value={formData.selling_price || ''}
 onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
 className="pl-7 pr-16 text-sm font-bold tabular-nums h-9 text-primary text-primary"required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">
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
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium uppercase tabular-nums">
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
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Advanced Settings (Optional)
                </h4>
                <p className="text-xs text-muted-foreground">
 Optional settings for purchasing, production allowances, minimums, costing and components.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {!liveCommercialMath.isService && (
                <button
 type="button"onClick={() => toggleSection('purchasing')}
 className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
 expandedSections.purchasing
                      ? 'border-primary/20 bg-primary/10 bg-primary/10 text-primary text-primary shadow-xs'
                      : 'border-border bg-card text-foreground hover:border-input'
                  )}
                >
                  <span>Purchasing</span>
                  {expandedSections.purchasing ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
                </button>
              )}

              {(formData.requires_production || formData.commercial_type === 'production_product' || formData.commercial_type === 'fabrication' || formData.commercial_type === 'material') && (
                <button
 type="button"onClick={() => toggleSection('production')}
 className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
 expandedSections.production
                      ? 'border-primary/20 bg-primary/10 bg-primary/10 text-primary text-primary shadow-xs'
                      : 'border-border bg-card text-foreground hover:border-input'
                  )}
                >
                  <span>Production</span>
                  {expandedSections.production ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
                </button>
              )}

              <button
 type="button"onClick={() => toggleSection('minimums')}
 className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
 expandedSections.minimums
                    ? 'border-primary/20 bg-primary/10 bg-primary/10 text-primary text-primary shadow-xs'
                    : 'border-border bg-card text-foreground hover:border-input'
                )}
              >
                <span>Minimums</span>
                {expandedSections.minimums ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
              </button>

              <button
 type="button"onClick={() => toggleSection('costing')}
 className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
 expandedSections.costing
                    ? 'border-primary/20 bg-primary/10 bg-primary/10 text-primary text-primary shadow-xs'
                    : 'border-border bg-card text-foreground hover:border-input'
                  )}
              >
                <span>Costing</span>
                {expandedSections.costing ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
              </button>

              <button
 type="button"onClick={() => toggleSection('components')}
 className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all',
 expandedSections.components
                    ? 'border-primary/20 bg-primary/10 bg-primary/10 text-primary text-primary shadow-xs'
                    : 'border-border bg-card text-foreground hover:border-input'
                )}
              >
                <span>Components ({formData.components?.length || 0})</span>
                {expandedSections.components ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
              </button>
            </div>

            {/* SUBSECTION A: PURCHASING & MEDIA SPECS */}
            {expandedSections.purchasing && !liveCommercialMath.isService && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
 Purchasing & Material Conversion
                  </span>
                  <span className="text-xs text-muted-foreground">How you buy raw materials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Purchase Unit</Label>
                    <select
 value={formData.purchase_unit}
 onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium uppercase tabular-nums">
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
 type="number"step="1"value={formData.purchase_price || ''}
 onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
 className="text-xs h-9 tabular-nums font-bold"/>
                    <span className="text-xs text-muted-foreground">per 1 {formData.purchase_unit}</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
 Conversion Ratio
                    </Label>
                    <Input
 type="number"step="0.01"value={formData.conversion_ratio || ''}
 onChange={(e) => setFormData({ ...formData, conversion_ratio: Number(e.target.value) })}
 className="text-xs h-9 tabular-nums font-bold"/>
                    <span className="text-xs text-muted-foreground">
                      1 {formData.purchase_unit} = {formData.conversion_ratio} {formData.selling_unit}
                    </span>
                  </div>
                </div>

                {/* Roll Dimension Helper */}
                {formData.purchase_unit === 'roll' && (
                  <div className="p-3 bg-primary/10/60 bg-primary/10 rounded-xl border border-primary/20 border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary text-primary">
 Roll Dimension Helper (1 Roll Area)
                      </span>
                      <Badge variant="outline"className="text-xs tabular-nums bg-card">
                        {formData.roll_width_ft}ft × {formData.roll_length_ft}ft = {Math.round((formData.roll_width_ft || 0) * (formData.roll_length_ft || 0))} sqft
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">Roll Width (Feet)</Label>
                        <Input
 type="number"step="0.5"value={formData.roll_width_ft || ''}
 onChange={(e) => {
 const w = Number(e.target.value) || 0
 const l = formData.roll_length_ft || 0
 const ratio = Math.round(w * l)
 setFormData({ ...formData, roll_width_ft: w, conversion_ratio: ratio > 0 ? ratio : formData.conversion_ratio })
                          }}
 className="text-xs h-8 tabular-nums"/>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">Roll Length (Feet)</Label>
                        <Input
 type="number"step="1"value={formData.roll_length_ft || ''}
 onChange={(e) => {
 const l = Number(e.target.value) || 0
 const w = formData.roll_width_ft || 0
 const ratio = Math.round(w * l)
 setFormData({ ...formData, roll_length_ft: l, conversion_ratio: ratio > 0 ? ratio : formData.conversion_ratio })
                          }}
 className="text-xs h-8 tabular-nums"/>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label className="text-xs font-semibold mb-1 block">Derived Ratio</Label>
                        <div className="h-8 px-3 rounded-md bg-card border border-primary/20 border-border flex items-center tabular-nums font-bold text-xs text-primary text-primary">
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
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
 Production Rules & Geometric Allowances
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
 Extra Width Needed for Production (Allowance)
                    </Label>
                    <Input
 type="number"step="0.05"placeholder="e.g. 0.25 ft"value={formData.dimensions_spec ? (formData.dimensions_spec.includes('x') ? formData.dimensions_spec.split('x')[0] : '') : '0.25'}
 onChange={(e) => {
 const w = e.target.value
 const l = formData.dimensions_spec?.includes('x') ? formData.dimensions_spec.split('x')[1] : '0.25'
 setFormData({ ...formData, dimensions_spec: `${w}x${l}` })
                      }}
 className="text-xs h-9 tabular-nums"/>
                    <span className="text-xs text-muted-foreground">Bleed / grip allowance (feet)</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
 Extra Length Needed for Production (Allowance)
                    </Label>
                    <Input
 type="number"step="0.05"placeholder="e.g. 0.25 ft"value={formData.dimensions_spec ? (formData.dimensions_spec.includes('x') ? formData.dimensions_spec.split('x')[1] : '') : '0.25'}
 onChange={(e) => {
 const l = e.target.value
 const w = formData.dimensions_spec?.includes('x') ? formData.dimensions_spec.split('x')[0] : '0.25'
 setFormData({ ...formData, dimensions_spec: `${w}x${l}` })
                      }}
 className="text-xs h-9 tabular-nums"/>
                    <span className="text-xs text-muted-foreground">Lead / tail allowance (feet)</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
 Expected Production Wastage (%)
                    </Label>
                    <Input
 type="number"step="0.5"value={formData.default_wastage_percentage || ''}
 onChange={(e) => setFormData({ ...formData, default_wastage_percentage: Number(e.target.value) })}
 className="text-xs h-9 tabular-nums font-bold"/>
                    <span className="text-xs text-muted-foreground">Statistical scrap (e.g. 5%)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                    <input
 type="checkbox"checked={formData.requires_design}
 onChange={(e) => setFormData({ ...formData, requires_design: e.target.checked })}
 className="rounded"/>
                    <span>Requires Design</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                    <input
 type="checkbox"checked={formData.requires_approval}
 onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
 className="rounded"/>
                    <span>Requires Approval</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                    <input
 type="checkbox"checked={formData.requires_production}
 onChange={(e) => setFormData({ ...formData, requires_production: e.target.checked })}
 className="rounded"/>
                    <span>Requires Production</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                    <input
 type="checkbox"checked={formData.requires_fabrication}
 onChange={(e) => setFormData({ ...formData, requires_fabrication: e.target.checked })}
 className="rounded"/>
                    <span>Requires Fabrication</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                    <input
 type="checkbox"checked={formData.requires_finishing}
 onChange={(e) => setFormData({ ...formData, requires_finishing: e.target.checked })}
 className="rounded"/>
                    <span>Requires Finishing</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted">
                    <input
 type="checkbox"checked={formData.requires_installation}
 onChange={(e) => setFormData({ ...formData, requires_installation: e.target.checked })}
 className="rounded"/>
                    <span>Requires Installation</span>
                  </label>
                </div>
              </div>
            )}

            {/* SUBSECTION C: MINIMUM CHARGES */}
            {expandedSections.minimums && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  3-Way Minimum Separation (MOQ vs Min Billable Qty vs Min Charge)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">1. Minimum Order Qty (MOQ)</Label>
                    <Input
 type="number"step="1"value={formData.min_order_quantity || ''}
 onChange={(e) => setFormData({ ...formData, min_order_quantity: Number(e.target.value) })}
 className="text-xs h-9 tabular-nums"/>
                    <span className="text-xs text-muted-foreground">Order cutoff (e.g. 1 pc)</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">2. Minimum Quantity You Charge For</Label>
                    <Input
 type="number"step="1"value={formData.min_billable_quantity || ''}
 onChange={(e) => setFormData({ ...formData, min_billable_quantity: Number(e.target.value) })}
 className="text-xs h-9 tabular-nums text-warning font-bold"/>
                    <span className="text-xs text-muted-foreground">Billing floor (e.g. 20 sqft min)</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">3. Minimum Charge (৳ BDT)</Label>
                    <Input
 type="number"step="1"value={formData.minimum_charge || ''}
 onChange={(e) => setFormData({ ...formData, minimum_charge: Number(e.target.value) })}
 className="text-xs h-9 tabular-nums font-bold text-primary"/>
                    <span className="text-xs text-muted-foreground">Money floor (e.g. ৳500 min)</span>
                  </div>
                </div>
              </div>
            )}

            {/* SUBSECTION D: COSTING & MARGINS */}
            {expandedSections.costing && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
 Direct Cost Breakdown & Target Margins
                  </span>
                  <Badge variant="outline"className="text-xs tabular-nums">
 Total Cost: ৳{liveCommercialMath.totalDirectCost} / {formData.selling_unit}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Ink Cost</Label>
                    <Input
 type="number"step="0.1"value={formData.cost_breakdown?.ink || ''}
 onChange={(e) =>
 setFormData({
                          ...formData,
 cost_breakdown: { ...formData.cost_breakdown, ink: Number(e.target.value) },
                        })
                      }
 className="text-xs h-8 tabular-nums"/>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Labor Cost</Label>
                    <Input
 type="number"step="0.1"value={formData.cost_breakdown?.labor || ''}
 onChange={(e) =>
 setFormData({
                          ...formData,
 cost_breakdown: { ...formData.cost_breakdown, labor: Number(e.target.value) },
                        })
                      }
 className="text-xs h-8 tabular-nums"/>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Machine Depr.</Label>
                    <Input
 type="number"step="0.1"value={formData.cost_breakdown?.machine || ''}
 onChange={(e) =>
 setFormData({
                          ...formData,
 cost_breakdown: { ...formData.cost_breakdown, machine: Number(e.target.value) },
                        })
                      }
 className="text-xs h-8 tabular-nums"/>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Finishing</Label>
                    <Input
 type="number"step="0.1"value={formData.cost_breakdown?.finishing || ''}
 onChange={(e) =>
 setFormData({
                          ...formData,
 cost_breakdown: { ...formData.cost_breakdown, finishing: Number(e.target.value) },
                        })
                      }
 className="text-xs h-8 tabular-nums"/>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Fabrication</Label>
                    <Input
 type="number"step="0.1"value={formData.cost_breakdown?.fabrication || ''}
 onChange={(e) =>
 setFormData({
                          ...formData,
 cost_breakdown: { ...formData.cost_breakdown, fabrication: Number(e.target.value) },
                        })
                      }
 className="text-xs h-8 tabular-nums"/>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Installation</Label>
                    <Input
 type="number"step="0.1"value={formData.cost_breakdown?.installation || ''}
 onChange={(e) =>
 setFormData({
                          ...formData,
 cost_breakdown: { ...formData.cost_breakdown, installation: Number(e.target.value) },
                        })
                      }
 className="text-xs h-8 tabular-nums"/>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Delivery</Label>
                    <Input
 type="number"step="0.1"value={formData.cost_breakdown?.delivery || ''}
 onChange={(e) =>
 setFormData({
                          ...formData,
 cost_breakdown: { ...formData.cost_breakdown, delivery: Number(e.target.value) },
                        })
                      }
 className="text-xs h-8 tabular-nums"/>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Target Margin %</Label>
                    <Input
 type="number"step="1"value={formData.target_margin_percentage || ''}
 onChange={(e) => setFormData({ ...formData, target_margin_percentage: Number(e.target.value) })}
 className="text-xs h-8 tabular-nums font-bold"/>
                  </div>
                </div>

                {/* Suggested Price Card */}
                <div className="p-3 bg-success-surface/60 bg-success-surface rounded-xl border border-success-border border-success-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-success text-success">
                      <Sparkles className="h-4 w-4 text-success"/>
                      <span>Suggested Selling Price: ৳{liveCommercialMath.suggestedSellingPrice} / {formData.selling_unit}</span>
                    </div>
                    <p className="text-xs text-success/80 text-success/80 mt-0.5">
 Based on cost ৳{liveCommercialMath.costBasis} @ {formData.target_margin_percentage}% margin.
                    </p>
                  </div>
                  <Button
 type="button"size="sm"variant="outline"onClick={() => setFormData({ ...formData, selling_price: liveCommercialMath.suggestedSellingPrice })}
 className="text-xs bg-card hover:bg-success-surface text-success border-success-border shadow-xs shrink-0">
 Apply Suggested Price
                  </Button>
                </div>
              </div>
            )}

            {/* SUBSECTION E: MATERIALS & COMPONENTS */}
            {expandedSections.components && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
 Materials & Components (Recipe / BOM)
                  </span>
                  <Badge variant="outline"className="tabular-nums text-xs">
 Rollup: ৳{liveCommercialMath.componentsCost}
                  </Badge>
                </div>

                {/* Components Table */}
                {formData.components && formData.components.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted font-semibold text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3 bangla-text">{tBilingual('Item Name', 'আইটেমের নাম')}</th>
                          <th className="py-2 px-2 bangla-text">{tBilingual('Qty', 'পরিমাণ')}</th>
                          <th className="py-2 px-2 bangla-text">{tBilingual('Unit', 'একক')}</th>
                          <th className="py-2 px-2 bangla-text">{tBilingual('Cost (৳)', 'খরচ (৳)')}</th>
                          <th className="py-2 px-2 bangla-text">{tBilingual('Role', 'ভূমিকা')}</th>
                          <th className="py-2 px-3 text-right bangla-text">{tBilingual('Action', 'অ্যাকশন')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border tabular-nums">
                        {formData.components.map((comp, idx) => (
                          <tr key={idx} className="hover:bg-muted">
                            <td className="py-2 px-3 font-sans font-semibold text-foreground">
                              {comp.name || 'Component'}
                            </td>
                            <td className="py-2 px-2">{comp.quantity}</td>
                            <td className="py-2 px-2 uppercase">{comp.unit}</td>
                            <td className="py-2 px-2">৳{comp.cost_contribution}</td>
                            <td className="py-2 px-2 font-sans capitalize">{comp.production_role || 'material'}</td>
                            <td className="py-2 px-3 text-right font-sans">
                              <button
 type="button"onClick={() => {
 const next = [...formData.components]
 next.splice(idx, 1)
 setFormData({ ...formData, components: next })
                                }}
 className="text-destructive hover:text-destructive p-1">
                                <X className="h-3.5 w-3.5"/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 text-center border border-dashed rounded-lg text-xs text-muted-foreground">
 No child components added. Simple products do not require components.
                  </div>
                )}

                {/* Add Component Subform */}
                <div className="p-3 bg-muted rounded-xl border border-border space-y-2">
                  <span className="text-xs font-bold text-foreground block uppercase">
 Add Component Item
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="col-span-2 sm:col-span-2">
                      <Label className="text-xs mb-0.5 block">Item Name</Label>
                      <Input
 placeholder={tBilingual("e.g. X-Stand Hardware", "যেমন: এক্স-স্ট্যান্ড হার্ডওয়্যার")}value={newComponent.name}
 onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
 className="text-xs h-8"/>
                    </div>
                    <div>
                      <Label className="text-xs mb-0.5 block">Qty</Label>
                      <Input
 type="number"step="0.1"value={newComponent.quantity}
 onChange={(e) => setNewComponent({ ...newComponent, quantity: Number(e.target.value) })}
 className="text-xs h-8 tabular-nums"/>
                    </div>
                    <div>
                      <Label className="text-xs mb-0.5 block">Unit</Label>
                      <Input
 placeholder={tBilingual("pcs", "পিস")}value={newComponent.unit}
 onChange={(e) => setNewComponent({ ...newComponent, unit: e.target.value })}
 className="text-xs h-8 uppercase tabular-nums"/>
                    </div>
                    <div>
                      <Label className="text-xs mb-0.5 block">Cost (৳)</Label>
                      <Input
 type="number"step="1"value={newComponent.cost_contribution}
 onChange={(e) => setNewComponent({ ...newComponent, cost_contribution: Number(e.target.value) })}
 className="text-xs h-8 tabular-nums"/>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
 type="button"size="sm"onClick={() => {
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
 className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Plus className="h-3 w-3 mr-1"/> Add Component
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border">
            <Button
 type="button"variant="outline"onClick={() => setIsCreateOpen(false)}
 className="w-full sm:w-auto text-xs font-semibold">
 Cancel
            </Button>
            <Button
 type="submit"disabled={isPending}
 className="w-full sm:w-auto text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 shadow-sm">
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
 size="lg"hideFooter={true}
 title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0">
              <Tag className="h-5 w-5"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-foreground">
 Adjust Commercial Price & Tariffs
                </span>
                <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-1.5 bg-primary/10 text-primary border-primary/20">
 Audit Logged
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {pricingProduct?.name} ({pricingProduct?.sku})
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleUpdatePrice} className="space-y-4 pt-1">
          <div className="rounded-xl border border-primary/20 border-border/60 bg-primary/10/50 bg-primary/10 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Purchase Price:</span>
              <span className="tabular-nums font-bold">৳{pricingProduct?.purchase_price} / {pricingProduct?.purchase_unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Effective Unit Cost:</span>
              <span className="tabular-nums font-bold">৳{pricingProduct?.base_cost} / {pricingProduct?.selling_unit || pricingProduct?.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Selling Rate:</span>
              <span className="tabular-nums font-bold text-primary text-primary">
                ৳{pricingProduct?.selling_price} / {pricingProduct?.selling_unit || pricingProduct?.unit}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
 New Purchase Price (৳ / {pricingProduct?.purchase_unit || 'Unit'})
                </Label>
                <Input
 type="number"step="1"value={newPurchasePrice}
 onChange={(e) => setNewPurchasePrice(Number(e.target.value))}
 className="text-xs h-9 tabular-nums"/>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
 New Selling Rate (৳ / {pricingProduct?.selling_unit || pricingProduct?.unit}) <span className="text-destructive">*</span>
                </Label>
                <Input
 type="number"step="0.1"value={newPrice}
 onChange={(e) => setNewPrice(Number(e.target.value))}
 className="text-xs h-9 tabular-nums font-bold text-primary text-primary"required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
 Reason for Price Adjustment (Audit Trail) <span className="text-destructive">*</span>
              </Label>
              <Input
 placeholder={tBilingual("e.g. Raw solvent media and ink import duty increase", "যেমন: কাঁচামাল ও কালির আমদানি শুল্ক বৃদ্ধি")}value={priceReason}
 onChange={(e) => setPriceReason(e.target.value)}
 className="text-xs h-9"required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border">
            <Button
 type="button"variant="outline"onClick={() => setPricingProduct(null)}
 className="w-full sm:w-auto text-xs">
 Cancel
            </Button>
            <Button
 type="submit"disabled={isPending}
 className="w-full sm:w-auto text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5">
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
 size="md"hideFooter={true}
 title={
          <div className="flex items-center gap-2 text-destructive font-bold text-base">
            <AlertTriangle className="h-5 w-5"/>
            <span>Confirm Deletion / Archive</span>
          </div>
        }
      >
        <div className="space-y-4 pt-1 text-xs">
          <p className="text-foreground">
 Are you sure you want to remove <strong>{deletingProduct?.name}</strong> ({deletingProduct?.sku})?
          </p>

          {deletionSafety && !deletionSafety.isSafe && (
            <div className="p-3 bg-warning-surface bg-warning-surface border border-warning-border border-warning-border rounded-lg text-warning text-warning space-y-1">
              <strong className="block">Protected Historical Record</strong>
              <p>{deletionSafety.reason}</p>
              <p className="text-xs text-warning text-warning pt-1">
 Clicking confirm will safely <strong>Archive / Deactivate</strong> this item instead of deleting it.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
 variant="outline"size="sm"onClick={() => {
 setDeletingProduct(null)
 setDeletionSafety(null)
              }}
 className="text-xs">
 Cancel
            </Button>
            <Button
 size="sm"onClick={handleConfirmDelete}
 disabled={isPending}
 className="text-xs bg-destructive hover:bg-destructive text-white font-bold">
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
 showNotification(`Category"${cat.name}"saved successfully.`, 'success')
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
 machineries={machineries}
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
 printingMethods={printingMethods}
      />

      <OutsourceProductModal
 isOpen={isOutsourceModalOpen}
 onClose={() => {
 setIsOutsourceModalOpen(false)
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
 machineries={machineries}
 onSave={handleSavePrintingMethod}
      />

      <FinishingOptionModal
 open={isFinishingModalOpen}
 onOpenChange={setIsFinishingModalOpen}
 finishing={editingFinishing}
 materials={products.filter((p) => p.product_type === 'material' || (p as any).entity_type === 'material')}
 machineries={machineries}
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
    </PanelAccessGuard>
  )
}

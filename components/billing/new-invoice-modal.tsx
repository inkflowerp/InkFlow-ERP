'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  MessageSquare,
  Mail,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Search,
  X,
  UserCheck,
  CreditCard,
  Sparkles,
  AlertOctagon,
  FileText,
  Clock,
  Layers,
  Palette,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CustomerRecord, ResolvedProductRate } from '@/types/crm.types'
import { InvoiceRecord, InvoiceType } from '@/types/billing.types'
import { ProductRecord } from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  searchInvoiceCustomersAction,
  resolveCustomerPricingAction,
  createInvoiceAction,
  sendInvoiceAction,
  getInvoiceProductsAction,
  CreateInvoiceItemInput,
} from '@/actions/billing.actions'
import { evaluateStockAvailability, StockAvailabilityResult } from '@/lib/domain/stock-availability'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import type { MaterialRecord, InventoryRollRecord, InventoryStockBalanceRecord, InventoryRemnantRecord } from '@/types/inventory.types'

export interface NewInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedCustomerId?: string
  preselectedQuotationId?: string
  preselectedSalesOrderId?: string
  preselectedCustomerName?: string
  preselectedCustomerPhone?: string
  preselectedCustomerEmail?: string
  preselectedCustomerAddress?: string
  preselectedCompanyName?: string
  preselectedItems?: any[]
  preselectedRequestId?: string
  preselectedDesignJobId?: string
  preselectedItemsSummary?: string
  preselectedEstimatedAmount?: number
  preselectedNotes?: string
  preselectedDiscountAmount?: number
  preselectedVatPercentage?: number
  preselectedAdvanceAmount?: number
  onInvoiceCreated?: (invoice: InvoiceRecord) => void
}

interface ItemRowState {
  id: string
  productId?: string
  item_kind?: 'service' | 'ready_product' | 'material' | 'custom'
  product_type?: string
  itemName: string
  dimensions_spec?: string
  width: string
  height: string
  dimension_unit?: 'ft' | 'inch' | 'm' | string
  quantity: number
  unit: string
  rate: number
  finishing: string
  rateSource?: 'custom' | 'last_invoice' | 'default' | 'manual'
  tier_applied?: string
  moq?: number
  pcs_per_carton?: number
  unit_cost?: number
  available_dimension_presets?: Array<{ label?: string; width: number; length: number; unit?: string }>
  available_finishing_options?: Array<{ id: string; name: string; pricing_method?: string; unit_price?: number; unit_cost?: number }>
  printable_material_name?: string
  showAdvanced?: boolean
  isManualRate?: boolean
  design_required?: boolean
  customer_approval_required?: boolean
}

const FINISHING_OPTIONS = [
  'None',
  'Cutting',
  'Eyelet / Grommets',
  'Lamination (Gloss)',
  'Lamination (Matt)',
  'Folding',
  'Mounting (PVC Board)',
  'Pocket & Pipe',
  'Hemming / Border',
  'Stitching',
  'Perforation',
  'Die Cutting',
]

const UNIT_OPTIONS = [
  { value: 'sft', label: 'SFT (স্কয়ার ফুট)' },
  { value: 'pcs', label: 'PCS (পিস)' },
  { value: 'set', label: 'SET (সেট)' },
  { value: 'rft', label: 'RFT (রানিং ফুট)' },
  { value: 'roll', label: 'ROLL (রোল)' },
  { value: 'sheet', label: 'SHEET (শিট)' },
  { value: 'box', label: 'BOX (বক্স)' },
  { value: 'pack', label: 'PACK (প্যাক)' },
  { value: 'pair', label: 'PAIR (জোড়া)' },
  { value: 'sqin', label: 'SQIN (ইঞ্চি)' },
]

export function NewInvoiceModal({
  open,
  onOpenChange,
  preselectedCustomerId,
  preselectedQuotationId,
  preselectedSalesOrderId,
  preselectedCustomerName,
  preselectedCustomerPhone,
  preselectedCustomerEmail,
  preselectedCustomerAddress,
  preselectedCompanyName,
  preselectedItems,
  preselectedRequestId,
  preselectedDesignJobId,
  preselectedItemsSummary,
  preselectedEstimatedAmount,
  preselectedNotes,
  preselectedDiscountAmount,
  preselectedVatPercentage,
  preselectedAdvanceAmount,
  onInvoiceCreated,
}: NewInvoiceModalProps) {
  const { company } = useTenant()
  const { locale } = useI18n()
  const tenantSlug = company?.slug || 'my-company'

  // Products catalog & pricing cache
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [customerRates, setCustomerRates] = useState<ResolvedProductRate[]>([])

  // Mode: Simple vs Advanced
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)

  // Customer Form Fields
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [customerId, setCustomerId] = useState<string | undefined>(undefined)
  const [customerName, setCustomerName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [address, setAddress] = useState('')
  const [customerType, setCustomerType] = useState<'retail' | 'reseller' | 'corporate' | 'government'>('retail')
  const [emailAddress, setEmailAddress] = useState('')
  const [saveCustomer, setSaveCustomer] = useState(true)

  // Document metadata
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('sales_invoice')
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank' | 'cheque' | 'other_mfs'>('cash')
  const [notes, setNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [quotationId, setQuotationId] = useState<string | undefined>(preselectedQuotationId)
  const [salesOrderId, setSalesOrderId] = useState<string | undefined>(preselectedSalesOrderId)

  // Credit Limit Override
  const [creditOverrideReason, setCreditOverrideReason] = useState('')
  const [confirmCreditOverride, setConfirmCreditOverride] = useState(false)

  // Search suggestions dropdown
  const [searchResults, setSearchResults] = useState<CustomerRecord[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isExistingCustomerSelected, setIsExistingCustomerSelected] = useState(false)

  // Items State
  const [items, setItems] = useState<ItemRowState[]>([
    {
      id: `item-${Date.now()}-1`,
      productId: '',
      item_kind: 'service',
      itemName: 'Pana Flex Banner Print',
      width: '4',
      height: '6',
      dimension_unit: 'ft',
      quantity: 1,
      unit: 'sft',
      rate: 22,
      finishing: 'None',
      rateSource: 'default',
      showAdvanced: false,
    },
  ])

  // Financials State
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [vatPercentage, setVatPercentage] = useState<number>(0)
  const [advanceAmount, setAdvanceAmount] = useState<number>(0)

  // Feedback & Action states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'save' | 'print' | 'send' | null>(null)
  const [savedInvoice, setSavedInvoice] = useState<InvoiceRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [communicationStatus, setCommunicationStatus] = useState<{
    status: 'idle' | 'success' | 'failed'
    message: string
    channel?: string
    format?: string
  }>({ status: 'idle', message: '' })

  // Send Dropdown state
  const [showSendMenu, setShowSendMenu] = useState(false)
  const sendMenuRef = useRef<HTMLDivElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Inventory state for stock availability checking
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [stockBalances, setStockBalances] = useState<InventoryStockBalanceRecord[]>([])
  const [physicalRolls, setPhysicalRolls] = useState<InventoryRollRecord[]>([])
  const [remnants, setRemnants] = useState<InventoryRemnantRecord[]>([])

  // Fetch active catalog products and inventory data
  useEffect(() => {
    if (!open) return
    getInvoiceProductsAction(company?.id).then((res) => {
      if (res.success && res.data) {
        setProducts(res.data)
      }
    })

    const matList = PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, company?.id) || []
    const rollList = PrintERPDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, company?.id) || []
    const balList = PrintERPDataStore.getAll<InventoryStockBalanceRecord>(STORAGE_KEYS.INVENTORY_STOCK_BALANCES, company?.id) || []
    const remList = PrintERPDataStore.getAll<InventoryRemnantRecord>(STORAGE_KEYS.INVENTORY_REMNANTS, company?.id) || []

    setMaterials(matList)
    setPhysicalRolls(rollList)
    setStockBalances(balList)
    setRemnants(remList)
  }, [open, company?.id])

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(e.target as Node)) {
        setShowSendMenu(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Auto-fill when preselected customer ID, sales order ID, or request details are provided
  useEffect(() => {
    if (open) {
      if (preselectedSalesOrderId) {
        setSalesOrderId(preselectedSalesOrderId)
      }
      if (preselectedQuotationId) {
        setQuotationId(preselectedQuotationId)
      }
      if (preselectedNotes) {
        setNotes(preselectedNotes)
      }
      if (preselectedDiscountAmount !== undefined) {
        setDiscountAmount(Number(preselectedDiscountAmount) || 0)
      }
      if (preselectedVatPercentage !== undefined) {
        setVatPercentage(Number(preselectedVatPercentage) || 0)
      }
      if (preselectedAdvanceAmount !== undefined) {
        setAdvanceAmount(Number(preselectedAdvanceAmount) || 0)
      }

      if (preselectedCustomerId) {
        searchInvoiceCustomersAction(preselectedCustomerId, company?.id).then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            handleSelectCustomer(res.data[0])
            // If explicit overrides were passed alongside customerId, respect them
            if (preselectedCustomerPhone) setPhoneNumber(preselectedCustomerPhone)
            if (preselectedCustomerAddress) setAddress(preselectedCustomerAddress)
            if (preselectedCompanyName) setCompanyName(preselectedCompanyName)
            if (preselectedCustomerEmail) setEmailAddress(preselectedCustomerEmail)
          }
        })
      } else if (preselectedCustomerName) {
        setCustomerName(preselectedCustomerName)
        if (preselectedCustomerPhone) {
          setPhoneNumber(preselectedCustomerPhone)
        }
      }

      if (preselectedCompanyName) {
        setCompanyName(preselectedCompanyName)
      }
      if (preselectedCustomerAddress) {
        setAddress(preselectedCustomerAddress)
      }
      if (preselectedCustomerEmail) {
        setEmailAddress(preselectedCustomerEmail)
      }

      if (Array.isArray(preselectedItems) && preselectedItems.length > 0) {
        const mappedItems: ItemRowState[] = preselectedItems.map((it, idx) => {
          const matchingProduct = products.find(
            (p) =>
              p.id === it.productId ||
              p.id === it.product_id ||
              p.name.toLowerCase() === (it.itemName || it.item_name || '').toLowerCase()
          )

          const isService =
            it.item_kind === 'service' ||
            (it.item_kind !== 'ready_product' &&
              it.item_kind !== 'material' &&
              Boolean(Number(it.width) > 0 && Number(it.height) > 0)) ||
            matchingProduct?.product_type === 'service' ||
            matchingProduct?.product_type === 'print_service' ||
            matchingProduct?.product_type === 'fabrication_service'
          const isReady =
            it.item_kind === 'ready_product' ||
            matchingProduct?.product_type === 'ready_product' ||
            matchingProduct?.product_type === 'finished_product' ||
            (matchingProduct?.product_type as any) === 'finished_good'
          const isMat =
            it.item_kind === 'material' ||
            (matchingProduct?.product_type as any) === 'raw_material' ||
            matchingProduct?.product_type === 'material'

          // Strictly prioritize the rate filled on the order / invoice request
          const resolvedRate =
            (Number(it.rate) > 0 ? Number(it.rate) : undefined) ??
            (Number(it.unit_price) > 0 ? Number(it.unit_price) : undefined) ??
            Number(matchingProduct?.selling_price) ||
            Number((matchingProduct as any)?.base_price) ||
            (isReady ? 50 : 25)

          return {
            id: `item-${Date.now()}-${idx + 1}`,
            productId: matchingProduct?.id || it.productId || it.product_id || '',
            item_kind: isService ? 'service' : isReady ? 'ready_product' : isMat ? 'material' : 'service',
            product_type: matchingProduct?.product_type || it.product_type,
            itemName: it.itemName || it.item_name || matchingProduct?.name || 'Printing Service Item',
            dimensions_spec: it.dimensions_spec || (matchingProduct as any)?.dimensions_spec || undefined,
            width: String(it.width ?? (isService ? '4' : '0')),
            height: String(it.height ?? (isService ? '6' : '0')),
            dimension_unit: it.dimension_unit || (matchingProduct?.service_config?.default_unit as any) || 'ft',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || matchingProduct?.selling_unit || matchingProduct?.unit || (isService ? 'sft' : 'pcs'),
            rate: resolvedRate,
            finishing: it.finishing || 'None',
            rateSource: it.rate || it.unit_price ? 'custom' : matchingProduct ? 'default' : 'manual',
            available_dimension_presets:
              matchingProduct?.service_config?.dimension_presets ||
              (matchingProduct as any)?.dimension_presets ||
              [],
            available_finishing_options:
              matchingProduct?.service_config?.finishing_options ||
              (matchingProduct as any)?.finishing_options ||
              [],
            printable_material_name:
              it.material_spec ||
              matchingProduct?.service_config?.printable_material_name ||
              (matchingProduct as any)?.material_spec,
            design_required: Boolean(it.design_required),
            customer_approval_required: it.customer_approval_required !== false,
            showAdvanced: Boolean(it.showAdvanced),
          }
        })
        setItems(mappedItems)
      } else if (preselectedItemsSummary) {
        setItems((prev) => {
          if (
            prev.length === 1 &&
            (!prev[0].productId ||
              prev[0].itemName === 'Printing Service Item' ||
              prev[0].itemName === 'Flex Banner 10x4' ||
              prev[0].itemName === 'Pana Flex Banner Print')
          ) {
            return [
              {
                ...prev[0],
                itemName: preselectedItemsSummary,
                rate:
                  preselectedEstimatedAmount && preselectedEstimatedAmount > 0
                    ? preselectedEstimatedAmount
                    : prev[0].rate,
                quantity: 1,
              },
            ]
          }
          return prev
        })
      }
    }
  }, [
    open,
    preselectedCustomerId,
    preselectedSalesOrderId,
    preselectedQuotationId,
    preselectedCustomerName,
    preselectedCustomerPhone,
    preselectedCustomerEmail,
    preselectedCustomerAddress,
    preselectedCompanyName,
    preselectedItems,
    preselectedItemsSummary,
    preselectedEstimatedAmount,
    preselectedNotes,
    preselectedDiscountAmount,
    preselectedVatPercentage,
    preselectedAdvanceAmount,
    products,
    company?.id,
  ])

  // Customer keyword search
  useEffect(() => {
    if (!customerName.trim() || isExistingCustomerSelected) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await searchInvoiceCustomersAction(customerName, company?.id)
        if (res.success && res.data && res.data.length > 0) {
          setSearchResults(res.data)
          setShowSuggestions(true)
        } else {
          setSearchResults([])
          setShowSuggestions(false)
        }
      } catch (err) {
        console.error('Customer search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [customerName, isExistingCustomerSelected, company?.id])

  // Select existing customer & auto-fill without creating duplicates
  const handleSelectCustomer = async (cust: CustomerRecord) => {
    setSelectedCustomer(cust)
    setCustomerId(cust.id)
    setCustomerName(cust.name)
    setCompanyName(cust.company_name || '')
    setPhoneNumber(cust.mobile)
    setWhatsappNumber(cust.whatsapp || '')
    setAddress(cust.address || '')
    const typeMapping = ['retail', 'reseller', 'corporate', 'government'].includes(cust.customer_type || '')
      ? (cust.customer_type as any)
      : 'retail'
    setCustomerType(typeMapping)
    setEmailAddress(cust.email || '')
    setIsExistingCustomerSelected(true)
    setShowSuggestions(false)
    setErrorMessage(null)

    // Resolve 3-tier customer pricing
    try {
      const rateRes = await resolveCustomerPricingAction(cust.id, company?.id)
      if (rateRes.success && rateRes.data) {
        setCustomerRates(rateRes.data)
        setItems((prev) =>
          prev.map((item) => {
            if (item.productId && !item.isManualRate) {
              const resolved = rateRes.data?.find((r) => r.productId === item.productId)
              if (resolved) {
                return {
                  ...item,
                  rate: resolved.effectiveRate,
                  rateSource: resolved.source,
                }
              }
            }
            return item
          })
        )
      }
    } catch (err) {
      console.error('Failed to resolve customer pricing:', err)
    }
  }

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val)
    if (isExistingCustomerSelected) {
      setIsExistingCustomerSelected(false)
      setSelectedCustomer(null)
      setCustomerId(undefined)
      setCustomerRates([])
    }
  }

  // Categorized product catalog lists
  const servicesList = useMemo(() => {
    return products.filter(
      (p) =>
        p.is_service ||
        p.entity_type === 'service' ||
        p.product_type === 'service' ||
        p.product_type === 'print_service' ||
        p.product_type === 'fabrication_service' ||
        p.product_type === 'installation_service' ||
        p.pricing_method?.startsWith('per_') ||
        p.unit === 'sft' ||
        p.unit === 'sqft' ||
        p.unit === 'rft'
    )
  }, [products])

  const readyProductsList = useMemo(() => {
    return products.filter(
      (p) =>
        p.is_ready_product ||
        p.entity_type === 'product' ||
        p.commercial_type === 'ready_product' ||
        p.product_type === 'ready_product' ||
        p.product_type === 'finished_product'
    )
  }, [products])

  const materialsList = useMemo(() => {
    return products.filter(
      (p) =>
        p.entity_type === 'material' ||
        p.product_type === 'material' ||
        (!servicesList.some((s) => s.id === p.id) && !readyProductsList.some((r) => r.id === p.id))
    )
  }, [products, servicesList, readyProductsList])

  // Line Item Handlers
  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      setItems((prev) => {
        const next = [...prev]
        next[index] = {
          ...next[index],
          productId: '',
          item_kind: 'custom',
          tier_applied: undefined,
          moq: undefined,
          pcs_per_carton: undefined,
          available_dimension_presets: [],
          available_finishing_options: [],
          printable_material_name: undefined,
        }
        return next
      })
      return
    }

    const prd = products.find((p) => p.id === productId)
    if (!prd) return

    setItems((prev) => {
      const next = [...prev]
      const current = next[index]

      const defaultPrice = Number(prd.selling_price) || Number((prd as any).base_price) || 20
      let effectiveRate = defaultPrice
      let rateSrc: 'custom' | 'last_invoice' | 'default' = 'default'
      let tierApplied: string | undefined = undefined

      if (customerId && customerRates.length > 0) {
        const resolved = customerRates.find((r) => r.productId === prd.id)
        if (resolved) {
          effectiveRate = resolved.effectiveRate
          rateSrc = resolved.source
        }
      }

      const isService =
        prd.is_service ||
        prd.entity_type === 'service' ||
        prd.product_type === 'service' ||
        prd.product_type === 'print_service' ||
        prd.product_type === 'fabrication_service' ||
        prd.product_type === 'installation_service' ||
        prd.pricing_method?.startsWith('per_') ||
        prd.unit === 'sft' ||
        prd.unit === 'sqft' ||
        prd.unit === 'rft'

      const isReady =
        prd.is_ready_product ||
        prd.entity_type === 'product' ||
        prd.commercial_type === 'ready_product' ||
        prd.product_type === 'ready_product' ||
        prd.product_type === 'finished_product'

      const isMat = prd.entity_type === 'material' || prd.product_type === 'material'

      const itemKind: 'service' | 'ready_product' | 'material' | 'custom' = isService
        ? 'service'
        : isReady
        ? 'ready_product'
        : isMat
        ? 'material'
        : 'service'

      // Tier price resolution for ready products if not overridden by rate map
      if (isReady && prd.price_tiers && rateSrc === 'default') {
        const cType = (customerType || selectedCustomer?.customer_type || 'retail').toLowerCase()
        if (cType === 'corporate' && (prd.price_tiers['corporate'] || prd.price_tiers['corporate_price'])) {
          effectiveRate = Number(prd.price_tiers['corporate'] ?? prd.price_tiers['corporate_price'])
          tierApplied = 'Corporate Tier'
        } else if ((cType === 'reseller' || cType === 'dealer') && (prd.price_tiers['dealer'] || prd.price_tiers['dealer_price'])) {
          effectiveRate = Number(prd.price_tiers['dealer'] ?? prd.price_tiers['dealer_price'])
          tierApplied = 'Dealer Tier'
        } else if (cType === 'wholesale' && (prd.price_tiers['wholesale'] || prd.price_tiers['wholesale_price'])) {
          effectiveRate = Number(prd.price_tiers['wholesale'] ?? prd.price_tiers['wholesale_price'])
          tierApplied = 'Wholesale Tier'
        } else if (cType === 'vip' && (prd.price_tiers['vip'] || prd.price_tiers['vip_price'])) {
          effectiveRate = Number(prd.price_tiers['vip'] ?? prd.price_tiers['vip_price'])
          tierApplied = 'VIP Tier'
        }
      }

      const dimensionPresets =
        prd.service_config?.dimension_presets ||
        prd.service_config?.presets ||
        (prd as any).dimension_presets ||
        []

      const finishingOptions =
        prd.service_config?.finishing_options ||
        (prd as any).finishing_options ||
        []

      const printableMaterial =
        prd.service_config?.printable_material_name ||
        prd.printable_material_name ||
        prd.material_spec

      let w = isReady ? '0' : (current.width || '4')
      let h = isReady ? '0' : (current.height || '6')
      let dimUnit = current.dimension_unit || (prd.service_config?.default_unit as any) || 'ft'

      if (isService && (!current.width || current.width === '0') && (!current.height || current.height === '0')) {
        if (dimensionPresets.length > 0) {
          w = String(dimensionPresets[0].width || 4)
          h = String(dimensionPresets[0].length || 6)
          dimUnit = dimensionPresets[0].unit || 'ft'
        } else {
          w = '4'
          h = '6'
        }
      }

      const prdUnit = isReady
        ? prd.selling_unit || prd.unit || (prd as any).unit_of_measure || 'pcs'
        : prd.selling_unit || prd.unit || (prd as any).unit_of_measure || 'sft'

      next[index] = {
        ...current,
        productId: prd.id,
        item_kind: itemKind,
        product_type: prd.product_type,
        itemName: prd.name,
        dimensions_spec: (prd.dimensions_spec || (isReady ? (prd as any).size_spec : undefined)) || undefined,
        width: w,
        height: h,
        dimension_unit: dimUnit,
        unit: prdUnit,
        rate: effectiveRate,
        rateSource: rateSrc,
        tier_applied: tierApplied,
        moq: prd.min_order_quantity || undefined,
        pcs_per_carton: (prd as any).pcs_per_carton || undefined,
        unit_cost: Number(prd.effective_unit_cost ?? prd.base_cost) || 0,
        isManualRate: false,
        available_dimension_presets: dimensionPresets,
        available_finishing_options: finishingOptions,
        printable_material_name: printableMaterial || undefined,
      }
      return next
    })
  }

  const handleToggleItemKind = (index: number, newKind: 'service' | 'ready_product') => {
    setItems((prev) => {
      const next = [...prev]
      const current = next[index]
      next[index] = {
        ...current,
        item_kind: newKind,
        width: newKind === 'service' ? (current.width || '4') : '0',
        height: newKind === 'service' ? (current.height || '6') : '0',
        unit: newKind === 'service' ? 'sft' : 'pcs',
      }
      return next
    })
  }

  const handleApplyPreset = (index: number, preset: { width: number; length: number; unit?: string }) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        width: String(preset.width),
        height: String(preset.length),
        dimension_unit: preset.unit || next[index].dimension_unit || 'ft',
      }
      return next
    })
  }

  const handleToggleAdvanced = (index: number) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], showAdvanced: !next[index].showAdvanced }
      return next
    })
  }

  const handleItemChange = (index: number, field: keyof ItemRowState, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      const current = { ...next[index], [field]: value }
      if (field === 'rate') {
        current.isManualRate = true
        current.rateSource = 'manual'
      }
      next[index] = current
      return next
    })
  }

  const handleAddItem = () => {
    const defaultProduct = servicesList[0] || products[0]
    const defaultPrice = defaultProduct
      ? Number(defaultProduct.selling_price) || Number((defaultProduct as any).base_price) || 25
      : 25
    const defaultUnit = defaultProduct ? defaultProduct.unit || (defaultProduct as any).unit_of_measure || 'sft' : 'sft'

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        productId: defaultProduct?.id || '',
        item_kind: 'service',
        itemName: defaultProduct?.name || 'Printing Service Item',
        width: '4',
        height: '6',
        dimension_unit: 'ft',
        quantity: 1,
        unit: defaultUnit,
        rate: defaultPrice,
        finishing: 'None',
        rateSource: 'default',
        showAdvanced: false,
      },
    ])
  }

  const handleAddReadyProductItem = () => {
    const defaultProduct = readyProductsList[0] || products.find((p) => p.entity_type === 'product')
    const defaultPrice = defaultProduct ? Number(defaultProduct.selling_price) || 500 : 500
    const defaultUnit = defaultProduct ? defaultProduct.selling_unit || defaultProduct.unit || 'pcs' : 'pcs'

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        productId: defaultProduct?.id || '',
        item_kind: 'ready_product',
        itemName: defaultProduct?.name || 'Ready Product / Display Stand',
        width: '0',
        height: '0',
        dimension_unit: 'ft',
        quantity: 1,
        unit: defaultUnit,
        rate: defaultPrice,
        finishing: 'None',
        rateSource: 'default',
        dimensions_spec: defaultProduct?.dimensions_spec || undefined,
        moq: defaultProduct?.min_order_quantity || undefined,
        pcs_per_carton: (defaultProduct as any)?.pcs_per_carton || undefined,
        unit_cost: Number(defaultProduct?.effective_unit_cost ?? defaultProduct?.base_cost) || 0,
        showAdvanced: false,
      },
    ])
  }

  const handleAddCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        productId: '',
        item_kind: 'custom',
        itemName: 'Custom Line Item',
        width: '4',
        height: '6',
        dimension_unit: 'ft',
        quantity: 1,
        unit: 'sft',
        rate: 0,
        finishing: 'None',
        rateSource: 'custom',
        showAdvanced: false,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculate line items
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty = Math.max(0.01, Number(item.quantity) || 1)
      const rate = Math.max(0, Number(item.rate) || 0)
      const w = Number(item.width) || 0
      const h = Number(item.height) || 0
      const isReady = item.item_kind === 'ready_product'

      let lineTotal = 0
      let area = 0
      if (!isReady && w > 0 && h > 0 && (item.unit === 'sft' || item.unit === 'sqft' || item.unit === 'sqin' || item.dimension_unit === 'ft' || item.dimension_unit === 'inch' || item.dimension_unit === 'm')) {
        if (item.dimension_unit === 'inch' || item.unit === 'sqin') {
          area = (w * h) / 144
        } else if (item.dimension_unit === 'm') {
          area = w * h * 10.7639
        } else {
          area = w * h
        }
        lineTotal = Math.round(area * qty * rate)
      } else {
        lineTotal = Math.round(qty * rate)
      }

      return {
        ...item,
        area,
        lineTotal,
      }
    })
  }, [items])

  // Overall Totals
  const subtotal = useMemo(() => {
    return calculatedItems.reduce((sum, it) => sum + it.lineTotal, 0)
  }, [calculatedItems])

  const subtotalAfterDiscount = useMemo(() => {
    return Math.max(0, subtotal - (Number(discountAmount) || 0))
  }, [subtotal, discountAmount])

  const vatAmount = useMemo(() => {
    return Math.round((subtotalAfterDiscount * (Number(vatPercentage) || 0)) / 100)
  }, [subtotalAfterDiscount, vatPercentage])

  const grandTotal = useMemo(() => {
    return subtotalAfterDiscount + vatAmount
  }, [subtotalAfterDiscount, vatAmount])

  const effectiveAdvance = useMemo(() => {
    return Math.min(grandTotal, Math.max(0, Number(advanceAmount) || 0))
  }, [grandTotal, advanceAmount])

  const dueAmount = useMemo(() => {
    return Math.max(0, grandTotal - effectiveAdvance)
  }, [grandTotal, effectiveAdvance])

  // Customer Credit Calculations
  const customerOutstanding = Number(selectedCustomer?.total_due_balance) || 0
  const customerCreditLimit = Number(selectedCustomer?.credit_limit) || 0
  const availableCredit = customerCreditLimit > 0 ? customerCreditLimit - customerOutstanding : Infinity
  const projectedOutstanding = customerOutstanding + dueAmount
  const isCreditLimitExceeded = customerCreditLimit > 0 && projectedOutstanding > customerCreditLimit
  const creditExceededBy = isCreditLimitExceeded ? projectedOutstanding - customerCreditLimit : 0

  // Save-First Core Validation & Persistence
  const persistInvoice = async (): Promise<InvoiceRecord | null> => {
    setErrorMessage(null)

    if (!customerName.trim()) {
      setErrorMessage('Customer Name is required.')
      return null
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Phone Number is required.')
      return null
    }
    if (!address.trim()) {
      setErrorMessage('Address is required.')
      return null
    }
    if (items.length === 0) {
      setErrorMessage('At least one item is required.')
      return null
    }

    if (isCreditLimitExceeded && !confirmCreditOverride) {
      setErrorMessage(
        `Customer credit limit exceeded by ৳${creditExceededBy.toLocaleString()}. Please authorize the override below to proceed.`
      )
      return null
    }

    const payloadItems: CreateInvoiceItemInput[] = calculatedItems.map((it) => ({
      product_id: it.productId || undefined,
      item_kind: it.item_kind || (it.width && it.height ? 'service' : 'ready_product'),
      product_type: it.product_type || undefined,
      item_name: it.itemName,
      dimensions_spec: it.dimensions_spec || undefined,
      width: Number(it.width) || undefined,
      height: Number(it.height) || undefined,
      dimension_unit: it.dimension_unit || undefined,
      area_sft: it.area ? Number(it.area.toFixed(2)) : undefined,
      quantity: Number(it.quantity) || 1,
      unit: it.unit,
      unit_price: Number(it.rate) || 0,
      tier_applied: it.tier_applied || undefined,
      moq: it.moq || undefined,
      unit_cost: it.unit_cost || undefined,
      finishing: it.finishing,
      design_required: Boolean(it.design_required),
      customer_approval_required: it.customer_approval_required !== false,
      total_price: it.lineTotal,
    }))

    const payload = {
      customer_id: customerId,
      new_customer: !customerId
        ? {
            name: customerName.trim(),
            company_name: companyName.trim() || undefined,
            mobile: phoneNumber.trim(),
            whatsapp: whatsappNumber.trim() || undefined,
            address: address.trim(),
            customer_type: customerType,
            email: emailAddress.trim() || undefined,
            save_customer: saveCustomer,
          }
        : undefined,
      customer_name: customerName.trim(),
      customer_company: companyName.trim() || undefined,
      customer_phone: phoneNumber.trim(),
      customer_whatsapp: whatsappNumber.trim() || undefined,
      customer_address: address.trim(),
      customer_email: emailAddress.trim() || undefined,
      customer_type: customerType,
      invoice_type: invoiceType,
      invoice_date: invoiceDate,
      due_date: dueDate,
      discount_amount: Number(discountAmount) || 0,
      vat_percentage: Number(vatPercentage) || 0,
      advance_amount: effectiveAdvance,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      terms_and_conditions: termsAndConditions.trim() || undefined,
      quotation_id: quotationId,
      sales_order_id: salesOrderId,
      credit_override_reason: isCreditLimitExceeded ? creditOverrideReason || 'Authorized credit limit override' : undefined,
      items: payloadItems,
    }

    setIsSubmitting(true)

    try {
      const result = await createInvoiceAction(payload, company?.id)
      if (!result.success || !result.data) {
        setErrorMessage(result.error || 'Failed to save invoice.')
        return null
      }

      setSavedInvoice(result.data)
      if (onInvoiceCreated) {
        onInvoiceCreated(result.data)
      }
      return result.data
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  // Action: Save & Exit
  const handleSaveOnly = async () => {
    setSubmittingAction('save')
    const invoice = await persistInvoice()
    setSubmittingAction(null)
    if (invoice) {
      onOpenChange(false)
    }
  }

  // Action: Save & Print PDF
  const handleSaveAndPrint = async () => {
    setSubmittingAction('print')
    const invoice = await persistInvoice()
    setSubmittingAction(null)
    if (invoice) {
      window.open(`/${tenantSlug}/billing/${invoice.id}`, '_blank')
      onOpenChange(false)
    }
  }

  // Action: Save & Send via WhatsApp or Email
  const handleSaveAndSend = async (channel: 'whatsapp' | 'email') => {
    setShowSendMenu(false)
    setSubmittingAction('send')
    const invoice = await persistInvoice()

    if (!invoice) {
      setSubmittingAction(null)
      return
    }

    setCommunicationStatus({
      status: 'idle',
      message: `Dispatching ${channel.toUpperCase()} message...`,
      channel,
    })

    try {
      const res = await sendInvoiceAction(
        {
          invoiceId: invoice.id,
          channel,
          format: 'pdf',
        },
        company?.id
      )

      if (res.success) {
        setCommunicationStatus({
          status: 'success',
          message: `Invoice #${invoice.invoice_number} dispatched via ${channel.toUpperCase()} successfully!`,
          channel,
        })
        if (channel === 'whatsapp' && res.data?.whatsappUrl) {
          window.open(res.data.whatsappUrl, '_blank')
        }
      } else {
        setCommunicationStatus({
          status: 'failed',
          message: res.error || `Failed to send via ${channel.toUpperCase()}`,
          channel,
        })
      }
    } catch (err: any) {
      setCommunicationStatus({
        status: 'failed',
        message: err.message || `Communication dispatch error`,
        channel,
      })
    } finally {
      setSubmittingAction(null)
    }
  }

  const getRateBadge = (source?: 'custom' | 'last_invoice' | 'default' | 'manual') => {
    if (source === 'custom') {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] py-0">Custom Rate</Badge>
    }
    if (source === 'last_invoice') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] py-0">Last Inv Rate</Badge>
    }
    if (source === 'manual') {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] py-0">Manual</Badge>
    }
    return <Badge variant="outline" className="text-slate-500 text-[10px] py-0">Default</Badge>
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="5xl"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'bn' ? 'নতুন চালান / ইনভয়েস তৈরি' : 'Create New Commercial Invoice'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Easier than Excel • Faster than paper • Save-First Guarantee
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5',
                isAdvancedMode
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400'
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{isAdvancedMode ? 'Advanced Mode Active' : 'Simple Mode'}</span>
            </button>
          </div>
        </div>
      }
      hideFooter
    >
      <div className="space-y-4 pt-1 pb-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2 animate-in fade-in-0">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Action Required:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* COMMUNICATION STATUS BANNER */}
        {communicationStatus.message && (
          <div
            className={cn(
              'p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in-0',
              communicationStatus.status === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200'
                : communicationStatus.status === 'failed'
                ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200'
                : 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200'
            )}
          >
            {communicationStatus.status === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : communicationStatus.status === 'failed' ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
            )}
            <span>{communicationStatus.message}</span>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: CUSTOMER SEARCH & DETAILS
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Customer Information
              </h3>
            </div>

            {isExistingCustomerSelected && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                <UserCheck className="h-3.5 w-3.5" />
                Customer Linked & Pricing Resolved
              </span>
            )}
          </div>

          {/* Customer Search & Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="relative" ref={searchContainerRef}>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Type name to search or enter new..."
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  className="text-xs h-9 pr-8"
                  required
                />
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>

              {/* Suggestions */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="p-2.5 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 cursor-pointer text-xs"
                    >
                      <div className="font-bold text-slate-900 dark:text-slate-100">{cust.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{cust.mobile} {cust.company_name ? `• ${cust.company_name}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Phone Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="01XXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Company Name (Optional)</Label>
              <Input
                placeholder="Business / Organization"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold mb-1 block">
                Billing Address <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Full address for delivery & invoice"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Email (for PDF Invoice)</Label>
              <Input
                type="email"
                placeholder="client@domain.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* CUSTOMER CREDIT HUD */}
          {selectedCustomer && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs animate-in fade-in-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding Balance</span>
                <span className="font-mono font-bold text-rose-600 text-sm">{formatBDT(customerOutstanding)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Credit Limit</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                  {customerCreditLimit > 0 ? `${formatBDT(customerCreditLimit)}` : 'No Limit'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Credit</span>
                <span className={cn('font-mono font-bold text-sm', availableCredit > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {customerCreditLimit > 0 ? `${formatBDT(Math.max(0, availableCredit))}` : 'Unlimited'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Category</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                  {selectedCustomer.customer_type || 'Retail'}
                </Badge>
              </div>
            </div>
          )}

          {/* CREDIT LIMIT WARNING MODAL / BANNER */}
          {isCreditLimitExceeded && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-2 text-amber-900 dark:text-amber-200 animate-in fade-in-0">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertOctagon className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Credit Limit Warning: Projected Outstanding Exceeds Credit Limit</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div>Outstanding: <strong>{formatBDT(customerOutstanding)}</strong></div>
                <div>New Due: <strong>{formatBDT(dueAmount)}</strong></div>
                <div>Limit: <strong>{formatBDT(customerCreditLimit)}</strong></div>
                <div className="text-rose-600 font-bold">Exceeds By: <strong>{formatBDT(creditExceededBy)}</strong></div>
              </div>
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmCreditOverride}
                    onChange={(e) => setConfirmCreditOverride(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>Authorize Credit Limit Override</span>
                </label>
                {confirmCreditOverride && (
                  <Input
                    placeholder="Enter authorization reason (e.g. Approved by CFO / Owner)..."
                    value={creditOverrideReason}
                    onChange={(e) => setCreditOverrideReason(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-900 font-medium"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2: INVOICE ITEMS & SPECS (PRODUCT & SERVICE AWARE)
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Invoice Items & Specs ({items.length})
                </h3>
                <p className="text-[10px] text-slate-400">
                  Billing & Fulfillment: Supports Printing Services, Ready Products & Hardware, and Materials.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs font-bold gap-1 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Service / Catalog Item
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddReadyProductItem}
                className="h-7 text-xs font-bold gap-1 text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Ready Product
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomItem}
                className="h-7 text-xs font-bold gap-1 text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Add Custom Item
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const calc = calculatedItems[index]
              const isService = item.item_kind === 'service' || (item.item_kind !== 'ready_product' && item.item_kind !== 'material' && Boolean(Number(item.width) > 0 && Number(item.height) > 0))
              const isReadyProduct = item.item_kind === 'ready_product'
              const isMaterial = item.item_kind === 'material'
              const isCustom = !item.productId

              // Internal estimated economics
              const estimatedUnitCost = item.unit_cost || 0
              const estimatedDirectCost = isService ? (calc?.area || 1) * (Number(item.quantity) || 1) * estimatedUnitCost : (Number(item.quantity) || 1) * estimatedUnitCost
              const total = Number(calc?.lineTotal) || 0
              const estMarginPercent = total > 0 && estimatedDirectCost > 0
                ? Math.round(((total - estimatedDirectCost) / total) * 100)
                : 0

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-all"
                >
                  {/* Item Header & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded">
                        Item #{index + 1}
                      </span>

                      {/* Item Kind Badge */}
                      {isService && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 text-[10px] font-bold">
                          🖨️ Printing & Service
                        </Badge>
                      )}
                      {isReadyProduct && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
                          📦 Ready Product
                        </Badge>
                      )}
                      {isMaterial && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 text-[10px] font-bold">
                          🧵 Raw Material
                        </Badge>
                      )}
                      {isCustom && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">
                          ✨ Custom Item
                        </Badge>
                      )}

                      {/* Tier Rate Applied Badge */}
                      {item.tier_applied && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold">
                          💎 {item.tier_applied}
                        </Badge>
                      )}

                      {/* Rate Source */}
                      {getRateBadge(item.rateSource)}

                      {/* MOQ Notice */}
                      {item.moq && item.quantity < item.moq && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          Below MOQ ({item.moq} {item.unit})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAdvanced(index)}
                        className="h-7 px-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 text-xs font-semibold cursor-pointer"
                      >
                        {item.showAdvanced ? 'Simple Specs' : 'More Specs'}
                      </Button>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Primary Product Selection & Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <Label className="text-xs font-semibold mb-1 block">Select Catalog Item</Label>
                      <select
                        value={item.productId || ''}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <option value="">-- Custom Item (No Catalog) --</option>

                        {servicesList.length > 0 && (
                          <optgroup label="🖨️ Printing & Fabrication Services">
                            {servicesList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit || 'sft'}) - ৳{p.selling_price}
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {readyProductsList.length > 0 && (
                          <optgroup label="📦 Ready Products & Display Hardware">
                            {readyProductsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit || 'pcs'}) - ৳{p.selling_price}
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {materialsList.length > 0 && (
                          <optgroup label="🧵 Raw Materials">
                            {materialsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit || 'roll'}) - ৳{p.selling_price}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    <div className="sm:col-span-7">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold block">
                          Item Description / Service Name <span className="text-rose-500">*</span>
                        </Label>
                        {isCustom && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 mr-1">Mode:</span>
                            <button
                              type="button"
                              onClick={() => handleToggleItemKind(index, 'service')}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer',
                                isService ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                              )}
                            >
                              📐 Sqft Area
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleItemKind(index, 'ready_product')}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer',
                                isReadyProduct ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                              )}
                            >
                              📦 Unit Pcs
                            </button>
                          </div>
                        )}
                      </div>
                      <Input
                        placeholder="e.g. Star Flex Banner 40ft × 20ft with Eyelets"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                        className="text-xs h-9 font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* REAL-TIME NON-BLOCKING STOCK AVAILABILITY WARNING */}
                  {(() => {
                    const matchingProduct = products.find((p) => p.id === item.productId || p.name === item.itemName)
                    const stockAvail = evaluateStockAvailability({
                      service: matchingProduct,
                      materialId: (matchingProduct?.service_config as any)?.required_material_id || matchingProduct?.service_config?.required_materials?.[0]?.material_id,
                      customerWidthFt: Number(item.width) || 0,
                      customerLengthFt: Number(item.height) || 0,
                      quantity: item.quantity,
                      materials,
                      stockBalances,
                      physicalRolls,
                      remnants,
                    })

                    if (stockAvail.status === 'INSUFFICIENT_FOR_ORDER') {
                      return (
                        <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between gap-2 animate-in fade-in-0">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>INSUFFICIENT FOR THIS ORDER:</span>
                            <span className="font-normal">{stockAvail.warningMessage}</span>
                          </div>
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] shrink-0">
                            Non-blocking Warning
                          </Badge>
                        </div>
                      )
                    }

                    if (stockAvail.status === 'LOW_STOCK') {
                      return (
                        <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-800 dark:text-yellow-300 text-[11px] flex items-center justify-between gap-2 animate-in fade-in-0">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                            <span>LOW STOCK ALERT:</span>
                            <span className="font-normal">{stockAvail.warningMessage}</span>
                          </div>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px] shrink-0">
                            Reorder Threshold
                          </Badge>
                        </div>
                      )
                    }

                    if (stockAvail.status === 'GEOMETRY_INCOMPATIBLE') {
                      return (
                        <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-800 dark:text-rose-300 text-[11px] flex items-center justify-between gap-2 animate-in fade-in-0">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertOctagon className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span>PHYSICAL WIDTH INCOMPATIBLE:</span>
                            <span className="font-normal">{stockAvail.warningMessage}</span>
                          </div>
                          <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] shrink-0">
                            Physical Roll Alert
                          </Badge>
                        </div>
                      )
                    }

                    return null
                  })()}

                  {/* Dimension Presets for Services */}
                  {isService && item.available_dimension_presets && item.available_dimension_presets.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-bold text-slate-400 mr-1">Standard Sizes:</span>
                      {item.available_dimension_presets.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleApplyPreset(index, preset)}
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer',
                            item.width === String(preset.width) && item.height === String(preset.length)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                          )}
                        >
                          {preset.label || `${preset.width} × ${preset.length} ${preset.unit || 'ft'}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* SERVICE CONTROLS (Width × Height + Unit + Qty + Rate + Dynamic Finishing) */}
                  {isService && (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Width</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={item.width}
                          onChange={(e) => handleItemChange(index, 'width', e.target.value)}
                          className="text-xs h-9 font-mono"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Height</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={item.height}
                          onChange={(e) => handleItemChange(index, 'height', e.target.value)}
                          className="text-xs h-9 font-mono"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Dim. Unit</Label>
                        <select
                          value={item.dimension_unit || 'ft'}
                          onChange={(e) => handleItemChange(index, 'dimension_unit', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                        >
                          <option value="ft">ft (ফুট)</option>
                          <option value="inch">inch (ইঞ্চি)</option>
                          <option value="m">m (মিটার)</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Qty (Prints)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value) || 1)}
                          className="text-xs h-9 font-mono font-bold"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Rate / sft (৳)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value) || 0)}
                          className="text-xs h-9 font-mono font-bold text-blue-600 dark:text-blue-400"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Finishing</Label>
                        <select
                          value={item.finishing || 'None'}
                          onChange={(e) => handleItemChange(index, 'finishing', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                        >
                          <option value="None">None</option>
                          {item.available_finishing_options && item.available_finishing_options.length > 0 ? (
                            item.available_finishing_options.map((f) => (
                              <option key={f.id} value={f.name}>
                                {f.name} {f.unit_price ? `(+৳${f.unit_price})` : ''}
                              </option>
                            ))
                          ) : (
                            FINISHING_OPTIONS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* READY PRODUCT CONTROLS (Physical Spec + Discrete Unit + Qty + Rate) */}
                  {isReadyProduct && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="sm:col-span-5 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Physical Specs & Packaging</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {item.dimensions_spec ? (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px]">
                              📐 {item.dimensions_spec}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Standard Factory Size</span>
                          )}
                          {item.pcs_per_carton ? (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              📦 {item.pcs_per_carton} pcs/box
                            </span>
                          ) : null}
                          {item.moq ? (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              Min Order: {item.moq} {item.unit}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <Label className="text-[11px] font-semibold mb-1 block">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value) || 1)}
                          className="text-xs h-9 font-mono font-bold"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="text-[11px] font-semibold mb-1 block">Unit</Label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                        >
                          <option value="pcs">pcs (পিস)</option>
                          <option value="set">set (সেট)</option>
                          <option value="pack">pack (প্যাক)</option>
                          <option value="box">box (বক্স)</option>
                          <option value="pair">pair (জোড়া)</option>
                          <option value="carton">carton (কার্টুন)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="text-[11px] font-semibold mb-1 block">Unit Price (৳)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value) || 0)}
                          className="text-xs h-9 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* RAW MATERIAL CONTROLS */}
                  {isMaterial && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Quantity</Label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value) || 1)}
                          className="text-xs h-9 font-mono font-bold"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Usage Unit</Label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                        >
                          <option value="roll">roll (রোল)</option>
                          <option value="sheet">sheet (শিট)</option>
                          <option value="sft">sft (স্কয়ার ফুট)</option>
                          <option value="rft">rft (রানিং ফুট)</option>
                          <option value="kg">kg (কেজি)</option>
                          <option value="liter">liter (লিটার)</option>
                          <option value="pcs">pcs (পিস)</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Rate / Unit (৳)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value) || 0)}
                          className="text-xs h-9 font-mono font-bold text-purple-600 dark:text-purple-400"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Material Spec</Label>
                        <Input
                          placeholder="e.g. 280 GSM Frontlit"
                          value={item.dimensions_spec || ''}
                          onChange={(e) => handleItemChange(index, 'dimensions_spec', e.target.value)}
                          className="text-xs h-9"
                        />
                      </div>
                    </div>
                  )}

                  {/* Substrate / Printable Material pill for service */}
                  {isService && item.printable_material_name && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>Linked Substrate: <strong>{item.printable_material_name}</strong></span>
                    </div>
                  )}

                  {/* WORKFLOW GATING CONFIGURATION PER ITEM */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-100/70 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(item.design_required)}
                          onChange={(e) => {
                            const val = e.target.checked
                            handleItemChange(index, 'design_required', val)
                            if (val && item.customer_approval_required === undefined) {
                              handleItemChange(index, 'customer_approval_required', true)
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1">
                          <Palette className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          Design Required (ডিজাইন প্রয়োজন)
                        </span>
                      </label>

                      {item.design_required && (
                        <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer select-none pl-2 border-l border-slate-300 dark:border-slate-700 animate-in fade-in-0">
                          <input
                            type="checkbox"
                            checked={item.customer_approval_required !== false}
                            onChange={(e) => handleItemChange(index, 'customer_approval_required', e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                          />
                          <span>Customer Approval Required (অনুমোদন প্রয়োজন)</span>
                        </label>
                      )}
                    </div>

                    {item.design_required ? (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                        Auto Designer Task
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Direct Production Ready
                      </Badge>
                    )}
                  </div>

                  {/* Advanced Specs Drawer */}
                  {(item.showAdvanced || isAdvancedMode) && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs animate-in fade-in-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Advanced Production Specs
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[11px] font-semibold mb-1 block">Material / Structure Spec</Label>
                          <Input
                            placeholder="e.g. 3mm Cast Acrylic, 280 GSM Frontlit"
                            value={item.dimensions_spec || ''}
                            onChange={(e) => handleItemChange(index, 'dimensions_spec', e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-semibold mb-1 block">Item Internal Cost (৳)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={item.unit_cost || ''}
                            onChange={(e) => handleItemChange(index, 'unit_cost', Number(e.target.value) || 0)}
                            className="text-xs h-8 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Line Calculation Summary HUD */}
                  <div className="flex flex-wrap items-center justify-between text-xs pt-1.5 px-1 text-slate-500 font-medium border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      {(calc?.area || 0) > 0 ? (
                        <span>
                          Area: <strong>{calc?.area.toFixed(2)} sft</strong> ({item.width}ft × {item.height}ft × {item.quantity})
                        </span>
                      ) : (
                        <span>
                          Quantity: <strong>{item.quantity} {item.unit}</strong>
                        </span>
                      )}

                      {estimatedDirectCost > 0 && (
                        <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                          Est. Cost: ৳{Math.round(estimatedDirectCost)} • Margin: {estMarginPercent}%
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 mr-2">Line Total:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {formatBDT(calc?.lineTotal || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: FINANCIAL TOTALS & SETTLEMENT
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Financial Totals & Settlement
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Subtotal</Label>
              <div className="h-9 px-3 flex items-center bg-slate-100 dark:bg-slate-800 rounded-md font-mono font-bold text-slate-900 dark:text-white">
                {formatBDT(subtotal)}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Discount (৳)</Label>
              <Input
                type="number"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 text-xs font-mono font-bold"
                placeholder="0.00"
                min={0}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">VAT (%)</Label>
              <Input
                type="number"
                value={vatPercentage || ''}
                onChange={(e) => setVatPercentage(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 text-xs font-mono font-bold"
                placeholder="0%"
                min={0}
                max={100}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Grand Total</Label>
              <div className="h-9 px-3 flex items-center bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md font-mono font-black text-blue-700 dark:text-blue-300 text-sm">
                {formatBDT(grandTotal)}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Advance / Paid Now (৳)</Label>
              <Input
                type="number"
                value={advanceAmount || ''}
                onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 text-xs font-mono font-bold"
                placeholder="0.00"
                min={0}
                max={grandTotal}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Balance Due</Label>
              <div className={cn(
                'h-9 px-3 flex items-center rounded-md font-mono font-black text-sm border',
                dueAmount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              )}>
                {formatBDT(dueAmount)}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="cash">Cash Counter</option>
                <option value="bkash">bKash Merchant</option>
                <option value="nagad">Nagad Wallet</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Bank Cheque</option>
                <option value="other_mfs">Other MFS</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Advanced collapsible fields */}
          {isAdvancedMode && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in-0">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Invoice Notes / Special Instructions</Label>
                <Input
                  placeholder="Notes printed on invoice..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Terms & Conditions</Label>
                <Input
                  placeholder="Delivery upon full payment, no return on custom prints..."
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          STANDARDIZED MODAL BOTTOM ACTION BAR
         ========================================================================= */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Cancel
        </Button>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          {/* Direct Print Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAndPrint}
            disabled={isSubmitting}
            className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Save & Print PDF</span>
          </Button>

          {/* Send via WhatsApp / Email Dropdown */}
          <div className="relative" ref={sendMenuRef}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSendMenu(!showSendMenu)}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span>Save & Send</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>

            {showSendMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-52 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => handleSaveAndSend('whatsapp')}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAndSend('email')}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>Send PDF via Email</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Save Button */}
          <Button
            type="button"
            onClick={handleSaveOnly}
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Invoice...</span>
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                <span>Save Invoice</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}

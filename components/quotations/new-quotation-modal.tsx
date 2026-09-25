'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  User,
  Building2,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Send,
  Printer,
  Save,
  Loader2,
  ShieldCheck,
  Tag,
  Truck,
  Wrench,
  FileSpreadsheet,
  UserCheck,
  Sparkles,
  Layers,
  BookOpen,
  DollarSign,
  Palette,
  Lightbulb,
  Gift,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { useSubscription } from '@/hooks/use-subscription'
import {
  searchQuotationCustomersAction,
  resolveQuotationRatesAction,
  getQuotationProductsAction,
  createQuotationAction,
  sendQuotationAction,
} from '@/actions/quotation.actions'
import { createProductAction } from '@/actions/product.actions'
import { checkCustomerDuplicateAction } from '@/actions/customer.actions'
import {
  QuotationRecord,
  CreateQuotationItemInput,
  CreateQuotationPayload,
  QuotationDeliveryMethod,
  RateSource,
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_TERMS_BN,
} from '@/types/quotation.types'
import { CustomerRecord, ResolvedProductRate, DuplicateCheckResponse } from '@/types/crm.types'
import { ProductRecord } from '@/types/product.types'
import { normalizeBdPhone, formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { calculateCommercialPricing, isServiceProduct, isReadyProduct, isMaterialProduct } from '@/lib/units'
import {
  STANDARD_FINISHING_OPTIONS,
  STANDARD_ADD_ON_OPTIONS,
  getFinishingRate,
  getAddOnRate,
} from '@/lib/finishing-addons'

interface CatalogComboboxProps {
  products: ProductRecord[]
  selectedProductId?: string | null
  onSelectProduct: (productId: string) => void
  onCustomSelect?: () => void
}

function CatalogItemCombobox({
  products = [],
  selectedProductId,
  onSelectProduct,
  onCustomSelect,
}: CatalogComboboxProps) {
  const safeProducts = Array.isArray(products) ? products : []
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const selectedProduct = useMemo(() => {
    return safeProducts.find((p) => p.id === selectedProductId)
  }, [safeProducts, selectedProductId])

  // Close when clicked outside
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [])

  const filteredProducts = useMemo(() => {
    const term = keyword.toLowerCase().trim()
    if (!term) return safeProducts
    return safeProducts.filter((p) => {
      return (
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        ((p as any).code && (p as any).code.toLowerCase().includes(term)) ||
        ((p as any).name_bn && (p as any).name_bn.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.product_type && p.product_type.toLowerCase().includes(term))
      )
    })
  }, [products, keyword])

  const digitalServices = useMemo(() => filteredProducts.filter((p) => isServiceProduct(p) && p.category !== 'signage_3d' && p.category !== 'offset_print'), [filteredProducts])
  const signageServices = useMemo(() => filteredProducts.filter((p) => p.category === 'signage_3d' || p.product_type === 'fabrication_service'), [filteredProducts])
  const readyProducts = useMemo(() => filteredProducts.filter((p) => isReadyProduct(p)), [filteredProducts])
  const materials = useMemo(() => filteredProducts.filter((p) => isMaterialProduct(p)), [filteredProducts])

  // Flat list of selectable items for arrow key navigation
  const flatSelectableItems = useMemo(() => {
    const list: Array<{ id: string; type: 'custom' | 'product'; product?: ProductRecord }> = [
      { id: '', type: 'custom' }
    ]
    digitalServices.forEach((p) => list.push({ id: p.id, type: 'product', product: p }))
    signageServices.forEach((p) => list.push({ id: p.id, type: 'product', product: p }))
    readyProducts.forEach((p) => list.push({ id: p.id, type: 'product', product: p }))
    materials.forEach((p) => list.push({ id: p.id, type: 'product', product: p }))
    return list
  }, [digitalServices, signageServices, readyProducts, materials])

  // Reset highlightedIndex when keyword changes or menu opens
  useEffect(() => {
    setHighlightedIndex(0)
  }, [keyword, isOpen])

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && itemRefs.current.has(highlightedIndex)) {
      itemRefs.current.get(highlightedIndex)?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, isOpen])

  const handleSelect = (item: { id: string; type: 'custom' | 'product'; product?: ProductRecord }) => {
    if (item.type === 'custom' || !item.id) {
      onSelectProduct('')
      if (onCustomSelect) onCustomSelect()
    } else {
      onSelectProduct(item.id)
    }
    setIsOpen(false)
    setKeyword('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % flatSelectableItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + flatSelectableItems.length) % flatSelectableItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatSelectableItems[highlightedIndex]) {
        handleSelect(flatSelectableItems[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Input
          placeholder="Search products & services catalog (e.g. flex, vinyl, card, 3D)..."
          value={isOpen ? keyword : selectedProduct ? selectedProduct.name : keyword}
          onFocus={() => {
            setIsOpen(true)
            setKeyword('')
          }}
          onChange={(e) => {
            setKeyword(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="text-xs h-9 pr-14 font-medium"
        />
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
          {selectedProductId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectProduct('')
                setKeyword('')
                if (onCustomSelect) onCustomSelect()
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              title="Clear to Custom Item"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {/* Custom Item option (Index 0) */}
          <div
            ref={(el) => {
              if (el) itemRefs.current.set(0, el)
              else itemRefs.current.delete(0)
            }}
            onMouseEnter={() => setHighlightedIndex(0)}
            onClick={() => handleSelect({ id: '', type: 'custom' })}
            className={cn(
              "p-2.5 cursor-pointer font-semibold flex items-center justify-between transition-colors",
              highlightedIndex === 0
                ? "bg-blue-100/90 dark:bg-blue-950/70 border-l-4 border-blue-600 text-blue-900 dark:text-blue-100"
                : !selectedProductId
                ? "bg-blue-50/80 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            )}
          >
            <span>✨ -- Custom Item (Manual Specification) --</span>
            <div className="flex items-center gap-1.5">
              {highlightedIndex === 0 && <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">↵ Enter</span>}
              {!selectedProductId && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
            </div>
          </div>

          {/* Digital Printing Services */}
          {digitalServices.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 uppercase tracking-wider flex items-center gap-1">
                <span>🎨 Digital & Large Format Print ({digitalServices.length})</span>
              </div>
              {digitalServices.map((p) => {
                const isSelected = selectedProductId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect({ id: p.id, type: 'product', product: p })}
                    className={cn(
                      "p-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                      isSelected
                        ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        : "hover:bg-blue-50/70 dark:hover:bg-blue-950/40"
                    )}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {p.sku && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{p.sku}</span>}
                        <span>Unit: {p.unit || 'sft'}</span>
                        {p.printable_material_name && <span className="text-indigo-600">• {p.printable_material_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        ৳{p.selling_price}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 3D Signage & Fabrication Services */}
          {signageServices.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 uppercase tracking-wider flex items-center gap-1">
                <span>💡 3D Signage & Fabrication ({signageServices.length})</span>
              </div>
              {signageServices.map((p) => {
                const isSelected = selectedProductId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect({ id: p.id, type: 'product', product: p })}
                    className={cn(
                      "p-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                      isSelected
                        ? "bg-amber-50 font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        : "hover:bg-amber-50/70 dark:hover:bg-amber-950/40"
                    )}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {p.sku && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{p.sku}</span>}
                        <span>Unit: {p.unit || 'sft'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        ৳{p.selling_price}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ready Products */}
          {readyProducts.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 uppercase tracking-wider flex items-center gap-1">
                <span>📦 Ready Products & Merchandise ({readyProducts.length})</span>
              </div>
              {readyProducts.map((p) => {
                const isSelected = selectedProductId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect({ id: p.id, type: 'product', product: p })}
                    className={cn(
                      "p-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                      isSelected
                        ? "bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40"
                    )}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {p.sku && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{p.sku}</span>}
                        <span>Unit: {p.unit || 'pcs'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{p.selling_price}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Raw Materials */}
          {materials.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30 uppercase tracking-wider flex items-center gap-1">
                <span>🧵 Raw Materials ({materials.length})</span>
              </div>
              {materials.map((p) => {
                const isSelected = selectedProductId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect({ id: p.id, type: 'product', product: p })}
                    className={cn(
                      "p-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                      isSelected
                        ? "bg-purple-50 font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                        : "hover:bg-purple-50/70 dark:hover:bg-purple-950/40"
                    )}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {p.sku && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{p.sku}</span>}
                        <span>Unit: {p.unit || 'roll'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        ৳{p.selling_price}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="p-4 text-center text-slate-400">
              No catalog items match &quot;{keyword}&quot;. You can use it as a custom item description.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface CustomerSuggestionsDropdownProps {
  results: CustomerRecord[]
  highlightedIndex: number
  onSelect: (cust: CustomerRecord) => void
  onHover: (idx: number) => void
}

function CustomerSuggestionsDropdown({
  results,
  highlightedIndex,
  onSelect,
  onHover,
}: CustomerSuggestionsDropdownProps) {
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (itemRefs.current.has(highlightedIndex)) {
      itemRefs.current.get(highlightedIndex)?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  return (
    <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-in fade-in-0">
      {results.map((cust, idx) => {
        const isHighlighted = idx === highlightedIndex
        return (
          <div
            key={cust.id}
            ref={(el) => {
              if (el) itemRefs.current.set(idx, el)
              else itemRefs.current.delete(idx)
            }}
            onMouseEnter={() => onHover(idx)}
            onClick={() => onSelect(cust)}
            className={cn(
              'p-2.5 cursor-pointer transition-colors flex items-center justify-between gap-2',
              isHighlighted
                ? 'bg-blue-50 dark:bg-blue-950/70 border-l-4 border-blue-600 text-blue-900 dark:text-blue-100'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
            )}
          >
            <div className="min-w-0">
              <div className="font-bold flex items-center gap-1.5 truncate">
                <span>{cust.name}</span>
                {cust.name_bn && (
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    ({cust.name_bn})
                  </span>
                )}
                {cust.company_name && (
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate">
                    • {cust.company_name}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex flex-wrap items-center gap-2 mt-0.5">
                <span>📞 {cust.mobile}</span>
                {cust.email && <span className="truncate">✉️ {cust.email}</span>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {cust.customer_type || cust.customer_category || 'Retail'}
              </span>
              {isHighlighted && (
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  ↵ Enter
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export interface NewQuotationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuotationCreated?: (quote: QuotationRecord) => void
  companyId?: string
  tenantSlug?: string
}

interface ItemFormState extends CreateQuotationItemInput {
  tempId: string
  item_kind: 'service' | 'ready_product' | 'material' | 'custom' | 'custom_manufacturing' | 'outsource'
  isSignageProduct?: boolean
  isOffsetProduct?: boolean
  showAdvanced?: boolean
  pcs_per_carton?: number | null
  base_rate?: number
  finishing_rate?: number
  add_on?: string
  add_on_rate?: number
  isManualRate?: boolean
  available_dimension_presets?: Array<{ label?: string; width: number; length: number; unit?: string }>
  available_finishing_options?: Array<{ id: string; name: string; pricing_method?: string; unit_price?: number; unit_cost?: number }>
  printable_material_name?: string
  stock_status?: string
}

const DEFAULT_ITEM = (tempId: string): ItemFormState => ({
  tempId,
  product_id: null,
  item_kind: 'service',
  category_preset: 'digital_print',
  description: 'Pana Flex Banner Print',
  description_bn: 'পানা ফ্লেক্স ব্যানার প্রিন্ট',
  material_spec: '280 GSM Chinese Frontlit Flex',
  dimensions_spec: '',
  width: '' as any,
  height: '' as any,
  dimension_unit: 'ft',
  quantity: 1,
  unit: 'sft',
  base_rate: 22,
  unit_rate: 22,
  unit_cost: 12,
  finishing: 'None',
  finishing_rate: 0,
  add_on: 'None',
  add_on_rate: 0,
  rate_source: 'default',
  color_spec: '',
  artwork_required: false,
  installation_required: false,
  item_total: 0,
  isSignageProduct: false,
  isOffsetProduct: false,
  showAdvanced: false,
  available_dimension_presets: [
    { label: '8 × 4 ft', width: 8, length: 4, unit: 'ft' },
    { label: '10 × 4 ft', width: 10, length: 4, unit: 'ft' },
    { label: '12 × 5 ft', width: 12, length: 5, unit: 'ft' },
    { label: '20 × 10 ft', width: 20, length: 10, unit: 'ft' },
  ],
  available_finishing_options: [],
})

export function NewQuotationModal({
  open,
  onOpenChange,
  onQuotationCreated,
  companyId,
  tenantSlug,
}: NewQuotationModalProps) {
  const { locale, tBilingual } = useI18n()
  const { company, currentUser } = useTenant()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const slug = tenantSlug || company?.slug || PrintERPDataStore.getActiveTenantSlug() || 'classic-printer'

  // -------------------------------------------------------------
  // CUSTOMER STATE (Multi-field keyword search)
  // -------------------------------------------------------------
  const [activeCustomerSearchField, setActiveCustomerSearchField] = useState<'name' | 'phone' | 'company' | 'email' | null>(null)
  const [searchResults, setSearchResults] = useState<CustomerRecord[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)

  // Customer Form Fields
  const [customerName, setCustomerName] = useState('')
  const [customerNameBn, setCustomerNameBn] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerWhatsapp, setCustomerWhatsapp] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerType, setCustomerType] = useState<string>('retail')
  const [saveCustomer, setSaveCustomer] = useState(true)

  // Duplicate Warning
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResponse | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  // -------------------------------------------------------------
  // QUOTATION METADATA
  // -------------------------------------------------------------
  const [quotationDate, setQuotationDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toISOString().split('T')[0]
  })
  const [referenceNo, setReferenceNo] = useState('')
  const [salespersonName, setSalespersonName] = useState('')

  // -------------------------------------------------------------
  // ITEMS BUILDER & PRICING
  // -------------------------------------------------------------
  const [items, setItems] = useState<ItemFormState[]>([DEFAULT_ITEM('item-1')])
  const [productsCatalog, setProductsCatalog] = useState<ProductRecord[]>([])
  const [resolvedRatesMap, setResolvedRatesMap] = useState<Map<string, ResolvedProductRate>>(new Map())

  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountPercentValue, setDiscountPercentValue] = useState<number>(0)
  const [vatRate, setVatRate] = useState<number>(7.5)

  // Bangladeshi Commercial Terms (Advance 50% standard)
  const [advancePercentage, setAdvancePercentage] = useState<number>(50)
  const [customAdvanceAmount, setCustomAdvanceAmount] = useState<number | null>(null)
  const [paymentMethodNote, setPaymentMethodNote] = useState<string>('50% Advance with Work Order, 50% on Delivery/Challan. (bKash/Nagad/Bank Transfer)')

  // -------------------------------------------------------------
  // DELIVERY & NOTES
  // -------------------------------------------------------------
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<QuotationDeliveryMethod>('customer_pickup')
  const [installationRequired, setInstallationRequired] = useState(false)

  const [customerNotes, setCustomerNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState(() =>
    locale === 'bn' ? DEFAULT_QUOTATION_TERMS_BN : DEFAULT_QUOTATION_TERMS
  )
  const [internalNotes, setInternalNotes] = useState('')

  // -------------------------------------------------------------
  // UI & SUBMISSION STATE
  // -------------------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saveSuccessQuote, setSaveSuccessQuote] = useState<QuotationRecord | null>(null)
  const [sendDropdownOpen, setSendDropdownOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null)

  // Quick-Add Product Modal State
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddIndex, setQuickAddIndex] = useState<number>(0)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddCategory, setQuickAddCategory] = useState('flex_banner')
  const [quickAddUnit, setQuickAddUnit] = useState<any>('sft')
  const [quickAddPrice, setQuickAddPrice] = useState<number>(0)
  const [quickAddMinPrice, setQuickAddMinPrice] = useState<number>(0)
  const [isSavingQuickProduct, setIsSavingQuickProduct] = useState(false)
  const [quickProductError, setQuickProductError] = useState<string | null>(null)

  // Customer Search Container Refs
  const nameSearchRef = useRef<HTMLDivElement>(null)
  const phoneSearchRef = useRef<HTMLDivElement>(null)
  const companySearchRef = useRef<HTMLDivElement>(null)
  const emailSearchRef = useRef<HTMLDivElement>(null)
  const sendDropdownRef = useRef<HTMLDivElement>(null)
  const effectiveCompanyId = company?.id || company?.slug || slug || companyId

  const handleOpenQuickAdd = (index: number) => {
    setQuickAddIndex(index)
    setQuickAddName('')
    setQuickAddCategory('flex_banner')
    setQuickAddUnit('sft')
    setQuickAddPrice(0)
    setQuickAddMinPrice(0)
    setQuickProductError(null)
    setQuickAddOpen(true)
  }

  const handleSaveQuickProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddName.trim()) {
      setQuickProductError('Product name is required.')
      return
    }
    setIsSavingQuickProduct(true)
    setQuickProductError(null)
    try {
      const sku = `PRD-${Date.now().toString().slice(-4)}`
      const res = await createProductAction(
        {
          name: quickAddName.trim(),
          sku,
          category: quickAddCategory,
          product_type: 'print_service',
          unit: quickAddUnit,
          selling_price: Math.max(0, Number(quickAddPrice) || 0),
          min_price: Math.max(0, Number(quickAddMinPrice) || 0),
        },
        effectiveCompanyId
      )
      if (!res.success || !res.data) {
        setQuickProductError(res.error || 'Failed to create product.')
        setIsSavingQuickProduct(false)
        return
      }

      const created = res.data
      setProductsCatalog((prev) => [...prev, created])
      setQuickAddOpen(false)
      setIsSavingQuickProduct(false)

      // Immediately select into target quotation item line
      handleProductSelect(quickAddIndex, created.id)
    } catch (err: any) {
      setQuickProductError(err.message || 'Error creating product.')
      setIsSavingQuickProduct(false)
    }
  }

  // Set default salesperson name from authenticated user
  useEffect(() => {
    if (currentUser?.profile?.full_name) {
      setSalespersonName(currentUser.profile.full_name)
    } else if (company?.name) {
      setSalespersonName('Sales Manager')
    }
  }, [currentUser, company])

  // Load products catalog on modal open
  useEffect(() => {
    if (open) {
      getQuotationProductsAction(effectiveCompanyId)
        .then((res) => {
          if (res && res.success && Array.isArray(res.data)) {
            setProductsCatalog(res.data)
          }
        })
        .catch((err) => {
          console.warn('[NewQuotationModal] getQuotationProductsAction error:', err?.message)
        })
    }
  }, [open, effectiveCompanyId])

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const clickedInsideCustomerField =
        (nameSearchRef.current && nameSearchRef.current.contains(e.target as Node)) ||
        (phoneSearchRef.current && phoneSearchRef.current.contains(e.target as Node)) ||
        (companySearchRef.current && companySearchRef.current.contains(e.target as Node)) ||
        (emailSearchRef.current && emailSearchRef.current.contains(e.target as Node))

      if (!clickedInsideCustomerField) {
        setShowCustomerDropdown(false)
        setActiveCustomerSearchField(null)
      }
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(e.target as Node)) {
        setSendDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSaveSuccessQuote(null)
      setSubmitError(null)
      setSendSuccessMsg(null)
      setIsSubmitting(false)
      setIsSending(false)
    }
  }, [open])

  // Auto-prefill item from Live Estimator session if available
  useEffect(() => {
    if (!open || typeof window === 'undefined') return

    const prefillRaw = sessionStorage.getItem('printerp_estimator_prefill')
    if (!prefillRaw) return

    try {
      const prefill = JSON.parse(prefillRaw)
      sessionStorage.removeItem('printerp_estimator_prefill')

      if (prefill.customerType) {
        setCustomerType(prefill.customerType)
      }

      if (prefill.productId) {
        const prod = productsCatalog.find((p) => p.id === prefill.productId)
        const isReadyProd = prod ? isReadyProduct(prod) : false
        const isMat = prod ? isMaterialProduct(prod) : false
        const isService = prod ? isServiceProduct(prod) : true
        const isSignage = prod?.category === 'signage_3d' || prod?.category === 'rigid_board'
        const isOffset = prod?.category === 'offset_print'

        const w = prefill.width ?? ''
        const h = prefill.height ?? ''
        const qty = Number(prefill.quantity) || 1
        const dimUnit = prefill.dimensionUnit || 'ft'
        const baseRate = Number(prefill.baseRate) || (prod ? Number(prod.selling_price) : 0)
        const unitRate = Number(prefill.unitRate) || baseRate

        const lineMath = calculateLineTotal(
          Number(w) || 0,
          Number(h) || 0,
          qty,
          unitRate,
          prod,
          dimUnit
        )

        setItems([
          {
            ...DEFAULT_ITEM('item-1'),
            product_id: prefill.productId,
            item_kind: isService ? 'service' : isReadyProd ? 'ready_product' : isMat ? 'material' : 'service',
            category_preset: isSignage ? 'signage_fabrication' : isOffset ? 'offset_print' : isReadyProd ? 'ready_merchandise' : 'digital_print',
            description: prod ? prod.name : (prefill.productName || 'Custom Print Item'),
            description_bn: prod?.name_bn || '',
            material_spec: prod?.printable_material_name || prod?.material_spec || '',
            dimensions_spec: prod?.dimensions_spec || '',
            width: w as any,
            height: h as any,
            dimension_unit: dimUnit,
            quantity: qty,
            unit: prefill.unit || prod?.unit || 'sft',
            base_rate: baseRate,
            unit_rate: unitRate,
            unit_cost: prod ? Number(prod.effective_unit_cost ?? prod.base_cost) || 0 : 0,
            rate_source: 'default',
            tier_applied: prefill.customerType ? `${prefill.customerType.toUpperCase()} Tier` : null,
            area_sft: lineMath.area,
            item_total: lineMath.total > 0 ? lineMath.total : Number(prefill.totalEstimated) || 0,
            isSignageProduct: isSignage,
            isOffsetProduct: isOffset,
          },
        ])
      }
    } catch (e) {
      console.warn('[Quotation] Failed to consume estimator prefill:', e)
    }
  }, [open, productsCatalog])

  // -------------------------------------------------------------
  // DEBOUNCED MULTI-FIELD CUSTOMER SEARCH
  // -------------------------------------------------------------
  useEffect(() => {
    if (!activeCustomerSearchField || selectedCustomer) {
      setSearchResults([])
      setShowCustomerDropdown(false)
      return
    }

    let query = ''
    if (activeCustomerSearchField === 'name') query = customerName
    else if (activeCustomerSearchField === 'phone') query = customerPhone
    else if (activeCustomerSearchField === 'company') query = customerCompany
    else if (activeCustomerSearchField === 'email') query = customerEmail

    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      setShowCustomerDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true)
      try {
        const res = await searchQuotationCustomersAction(trimmed, effectiveCompanyId)
        if (res.success && res.data && res.data.length > 0) {
          setSearchResults(res.data)
          setShowCustomerDropdown(true)
          setCustomerHighlightedIndex(0)
        } else {
          setSearchResults([])
          setShowCustomerDropdown(false)
        }
      } catch (err) {
        console.error('Customer search error:', err)
      } finally {
        setIsSearchingCustomers(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [
    activeCustomerSearchField,
    customerName,
    customerPhone,
    customerCompany,
    customerEmail,
    selectedCustomer,
    effectiveCompanyId,
  ])

  // Handle Customer Selection
  const handleSelectCustomer = async (cust: CustomerRecord) => {
    setSelectedCustomer(cust)
    setCustomerName(cust.name || '')
    setCustomerNameBn(cust.name_bn || '')
    setCustomerCompany(cust.company_name || '')
    setCustomerPhone(cust.mobile || '')
    setCustomerWhatsapp(cust.whatsapp || cust.mobile || '')
    setCustomerEmail(cust.email || '')
    setCustomerAddress(cust.address || '')
    const typeMapping = ['retail', 'reseller', 'corporate', 'government'].includes(cust.customer_type || '')
      ? (cust.customer_type as any)
      : 'retail'
    setCustomerType(typeMapping)
    setShowCustomerDropdown(false)
    setActiveCustomerSearchField(null)
    setCustomerHighlightedIndex(0)
    setDuplicateWarning(null)

    // Resolve 3-tier rates for this customer
    const res = await resolveQuotationRatesAction(cust.id, effectiveCompanyId)
    if (res.success && res.data) {
      const map = new Map<string, ResolvedProductRate>()
      for (const r of res.data) {
        map.set(r.productId, r)
      }
      setResolvedRatesMap(map)

      // Update existing item rates if products are selected
      setItems((prev) =>
        prev.map((it) => {
          if (it.product_id && map.has(it.product_id) && !it.isManualRate) {
            const resolved = map.get(it.product_id)!
            const baseRate = resolved.effectiveRate
            const fRate = getFinishingRate(it.finishing, it.available_finishing_options)
            const aRate = getAddOnRate(it.add_on)
            const effectiveRate = baseRate + fRate + aRate

            const prod = productsCatalog.find((p) => p.id === it.product_id)
            const lineMath = calculateLineTotal(
              Number(it.width) || 0,
              Number(it.height) || 0,
              it.quantity || 1,
              effectiveRate,
              prod,
              it.dimension_unit
            )
            return {
              ...it,
              base_rate: baseRate,
              finishing_rate: fRate,
              add_on_rate: aRate,
              unit_rate: effectiveRate,
              rate_source: resolved.source,
              area_sft: lineMath.area,
              item_total: lineMath.total,
            }
          }
          return it
        })
      )
    }
  }

  const handleCustomerFieldChange = (
    field: 'name' | 'phone' | 'company' | 'email',
    val: string
  ) => {
    if (field === 'name') setCustomerName(val)
    else if (field === 'phone') setCustomerPhone(val)
    else if (field === 'company') setCustomerCompany(val)
    else if (field === 'email') setCustomerEmail(val)

    setActiveCustomerSearchField(field)
    setCustomerHighlightedIndex(0)

    if (selectedCustomer) {
      setSelectedCustomer(null)
      setResolvedRatesMap(new Map())
    }
  }

  const handleCustomerKeyDown = (
    field: 'name' | 'phone' | 'company' | 'email',
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!showCustomerDropdown || searchResults.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setActiveCustomerSearchField(field)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCustomerHighlightedIndex((prev) => (prev + 1) % searchResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCustomerHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (searchResults[customerHighlightedIndex]) {
        handleSelectCustomer(searchResults[customerHighlightedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowCustomerDropdown(false)
      setActiveCustomerSearchField(null)
    }
  }

  const handleClearCustomer = () => {
    setSelectedCustomer(null)
    setActiveCustomerSearchField(null)
    setCustomerName('')
    setCustomerNameBn('')
    setCustomerCompany('')
    setCustomerPhone('')
    setCustomerWhatsapp('')
    setCustomerEmail('')
    setCustomerAddress('')
    setCustomerType('retail')
    setResolvedRatesMap(new Map())
  }

  // Handle New Customer Duplicate Check
  useEffect(() => {
    if (selectedCustomer) {
      setDuplicateWarning(null)
      return
    }

    if (!customerPhone.trim() && !customerName.trim() && !customerCompany.trim()) {
      setDuplicateWarning(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true)
      const res = await checkCustomerDuplicateAction(
        {
          mobile: customerPhone,
          whatsapp: customerWhatsapp,
          name: customerName,
          company_name: customerCompany,
        },
        effectiveCompanyId
      )
      setIsCheckingDuplicate(false)
      if (res.success && res.data && res.data.hasDuplicate) {
        setDuplicateWarning(res.data)
      } else {
        setDuplicateWarning(null)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [selectedCustomer, customerPhone, customerWhatsapp, customerName, customerCompany, effectiveCompanyId])

  // -------------------------------------------------------------
  // PRICING CALCULATIONS
  // -------------------------------------------------------------
  const calculateItemArea = (w: number, h: number, qty: number, dimUnit: 'ft' | 'inch' | 'm' = 'ft') => {
    if (w <= 0 || h <= 0) return 0
    if (dimUnit === 'inch') {
      return Math.round(((w * h) / 144) * qty * 100) / 100
    }
    if (dimUnit === 'm') {
      return Math.round(w * h * 10.7639 * qty * 100) / 100
    }
    return Math.round(w * h * qty * 100) / 100
  }

  const calculateLineTotal = (
    w: number,
    h: number,
    qty: number,
    rate: number,
    prod?: ProductRecord | null,
    dimUnit: 'ft' | 'inch' | 'm' = 'ft'
  ) => {
    const calc = calculateCommercialPricing({
      pricingMethod: prod?.pricing_method,
      unitPrice: rate,
      quantity: qty,
      width: w,
      height: h,
      dimensionUnit: dimUnit,
      minBillableQuantity: prod && prod.min_billable_quantity !== undefined && prod.min_billable_quantity !== null ? Math.max(0, Number(prod.min_billable_quantity)) : 0,
      minOrderQuantity: prod && prod.min_order_quantity !== undefined && prod.min_order_quantity !== null ? Math.max(0, Number(prod.min_order_quantity)) : 1,
      minimumCharge: prod && prod.minimum_charge !== undefined ? Math.max(0, Number(prod.minimum_charge)) : 0,
      materialUnitCost: prod ? Number(prod.effective_unit_cost ?? prod.base_cost) || 0 : 0,
    })
    return {
      area: calc.areaSqft || calculateItemArea(w, h, qty, dimUnit),
      total: calc.finalAmount,
      calcResult: calc,
    }
  }

  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      setItems((prev) => {
        const copy = [...prev]
        const current = copy[index]
        copy[index] = {
          ...current,
          product_id: null,
          item_kind: 'custom',
          tier_applied: null,
          moq: null,
          pcs_per_carton: null,
          available_dimension_presets: [],
          available_finishing_options: [],
          printable_material_name: undefined,
        }
        return copy
      })
      return
    }

    const prod = productsCatalog.find((p) => p.id === productId)
    if (!prod) return

    const resolved = resolvedRatesMap.get(prod.id)
    let rate = resolved ? resolved.effectiveRate : Number(prod.selling_price) || 0
    let source: RateSource = resolved ? resolved.source : 'default'
    let tierApplied: string | null = null

    // Detect item kind
    const isService = isServiceProduct(prod)
    const isReadyProd = isReadyProduct(prod)
    const isMat = isMaterialProduct(prod)

    const itemKind: 'service' | 'ready_product' | 'material' | 'custom' = isService
      ? 'service'
      : isReadyProd
      ? 'ready_product'
      : isMat
      ? 'material'
      : 'service'

    // Customer tier pricing resolution for ready products if not already resolved by rate map
    if (isReadyProd && prod.price_tiers && !resolved) {
      const cType = (customerType || selectedCustomer?.customer_type || 'retail').toLowerCase()
      if (cType === 'corporate' && (prod.price_tiers['corporate'] || prod.price_tiers['corporate_price'])) {
        rate = Number(prod.price_tiers['corporate'] ?? prod.price_tiers['corporate_price'])
        tierApplied = 'Corporate Tier'
      } else if ((cType === 'reseller' || cType === 'dealer') && (prod.price_tiers['dealer'] || prod.price_tiers['dealer_price'])) {
        rate = Number(prod.price_tiers['dealer'] ?? prod.price_tiers['dealer_price'])
        tierApplied = 'Dealer Tier'
      } else if (cType === 'wholesale' && (prod.price_tiers['wholesale'] || prod.price_tiers['wholesale_price'])) {
        rate = Number(prod.price_tiers['wholesale'] ?? prod.price_tiers['wholesale_price'])
        tierApplied = 'Wholesale Tier'
      } else if (cType === 'vip' && (prod.price_tiers['vip'] || prod.price_tiers['vip_price'])) {
        rate = Number(prod.price_tiers['vip'] ?? prod.price_tiers['vip_price'])
        tierApplied = 'VIP Tier'
      }
    }

    const isSignage =
      prod.category === 'signage_3d' ||
      prod.category === 'rigid_board' ||
      prod.category === 'backlit_flex' ||
      prod.product_type === 'fabrication_service'

    const isOffset =
      prod.category === 'offset_print' ||
      prod.category === 'packaging' ||
      prod.name.toLowerCase().includes('card') ||
      prod.name.toLowerCase().includes('memo') ||
      prod.name.toLowerCase().includes('pad')

    // Extract dimension presets
    const dimensionPresets =
      prod.service_config?.dimension_presets ||
      prod.service_config?.presets ||
      (prod as any).dimension_presets ||
      []

    // Extract finishing options
    const finishingOptions =
      prod.service_config?.finishing_options ||
      (prod as any).finishing_options ||
      []

    const printableMaterial =
      prod.service_config?.printable_material_name ||
      prod.printable_material_name ||
      prod.material_spec

    setItems((prev) => {
      const copy = [...prev]
      const current = copy[index]

      let w = isReadyProd || isMat ? 0 : (current.width || '')
      let h = isReadyProd || isMat ? 0 : (current.height || '')
      let dimUnit = current.dimension_unit || (prod.service_config?.default_unit as any) || 'ft'

      const baseRate = rate
      const finishing = 'None'
      const finishingRate = 0
      const addOn = 'None'
      const addOnRate = 0
      const effectiveRate = baseRate + finishingRate + addOnRate

      const lineMath = calculateLineTotal(
        Number(w) || 0,
        Number(h) || 0,
        current.quantity || prod.min_order_quantity || 1,
        effectiveRate,
        prod,
        dimUnit
      )

      copy[index] = {
        ...current,
        product_id: prod.id,
        item_kind: itemKind,
        product_type: prod.product_type,
        category_preset: isSignage ? 'signage_fabrication' : isOffset ? 'offset_print' : isReadyProd ? 'ready_merchandise' : 'digital_print',
        description: prod.name,
        description_bn: prod.name_bn || '',
        material_spec: printableMaterial || prod.material_spec || current.material_spec || '',
        dimensions_spec: prod.dimensions_spec || (isReadyProd ? (prod as any).size_spec : null),
        width: w as any,
        height: h as any,
        dimension_unit: dimUnit,
        unit: isReadyProd ? prod.selling_unit || prod.unit || 'pcs' : isMat ? 'roll' : (prod.selling_unit || prod.unit || 'sft'),
        base_rate: baseRate,
        finishing: finishing,
        finishing_rate: finishingRate,
        add_on: addOn,
        add_on_rate: addOnRate,
        unit_rate: effectiveRate,
        unit_cost: Number(prod.effective_unit_cost ?? prod.base_cost) || 0,
        rate_source: source,
        tier_applied: tierApplied,
        moq: prod.min_order_quantity || null,
        pcs_per_carton: (prod as any).pcs_per_carton || null,
        area_sft: lineMath.area,
        item_total: lineMath.total,
        isSignageProduct: isSignage,
        isOffsetProduct: isOffset,
        installation_required: isSignage ? current.installation_required : (prod.requires_installation || false),
        available_dimension_presets: dimensionPresets,
        available_finishing_options: finishingOptions,
        printable_material_name: printableMaterial || undefined,
        isManualRate: false,
      }
      return copy
    })
  }

  const handleToggleItemKind = (index: number, newKind: 'service' | 'ready_product') => {
    setItems((prev) => {
      const copy = [...prev]
      const current = copy[index]
      const w = newKind === 'service' ? (current.width || '') : 0
      const h = newKind === 'service' ? (current.height || '') : 0
      const unit = newKind === 'service' ? 'sft' : 'pcs'
      const lineMath = calculateLineTotal(Number(w) || 0, Number(h) || 0, current.quantity || 1, current.unit_rate || 0, null, current.dimension_unit)
      copy[index] = {
        ...current,
        item_kind: newKind,
        width: w as any,
        height: h as any,
        unit,
        area_sft: lineMath.area,
        item_total: lineMath.total,
      }
      return copy
    })
  }

  const handleApplyPresetDimension = (index: number, preset: { width: number; length: number; unit?: string }) => {
    setItems((prev) => {
      const copy = [...prev]
      const current = copy[index]
      const w = preset.width
      const h = preset.length
      const dimUnit = (preset.unit as any) || current.dimension_unit || 'ft'
      const prod = current.product_id ? productsCatalog.find((p) => p.id === current.product_id) : null
      const lineMath = calculateLineTotal(w, h, current.quantity || 1, current.unit_rate || 0, prod, dimUnit)
      copy[index] = {
        ...current,
        width: w as any,
        height: h as any,
        dimension_unit: dimUnit,
        area_sft: lineMath.area,
        item_total: lineMath.total,
      }
      return copy
    })
  }

  const handleToggleAdvanced = (index: number) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], showAdvanced: !copy[index].showAdvanced }
      return copy
    })
  }

  const handleItemChange = (index: number, field: keyof ItemFormState, value: any) => {
    setItems((prev) => {
      const copy = [...prev]
      const item = { ...copy[index] }

      if (field === 'finishing') {
        const fRate = getFinishingRate(value, item.available_finishing_options)
        const base = item.base_rate !== undefined ? item.base_rate : (Number(item.unit_rate) || 0)
        const aRate = item.add_on_rate || 0
        item.finishing = value
        item.finishing_rate = fRate
        item.unit_rate = base + fRate + aRate
      } else if (field === 'add_on') {
        const aRate = getAddOnRate(value)
        const base = item.base_rate !== undefined ? item.base_rate : (Number(item.unit_rate) || 0)
        const fRate = item.finishing_rate || 0
        item.add_on = value
        item.add_on_rate = aRate
        item.unit_rate = base + fRate + aRate
      } else if (field === 'unit_rate') {
        const typedRate = parseFloat(value) || 0
        item.unit_rate = typedRate
        item.isManualRate = true
        item.rate_source = 'override'
        item.base_rate = Math.max(0, typedRate - (item.finishing_rate || 0) - (item.add_on_rate || 0))
      } else {
        (item as any)[field] = value
      }

      const isReady = item.item_kind === 'ready_product'
      const w = isReady ? 0 : (Number(field === 'width' ? value : item.width) || 0)
      const h = isReady ? 0 : (Number(field === 'height' ? value : item.height) || 0)
      const qty = Number(field === 'quantity' ? value : item.quantity) || 1
      const rate = Number(item.unit_rate) || 0
      const dimUnit = (field === 'dimension_unit' ? value : item.dimension_unit) || 'ft'

      const prod = item.product_id ? productsCatalog.find((p) => p.id === item.product_id) : null

      const lineMath = calculateLineTotal(w, h, qty, rate, prod, dimUnit)

      item.area_sft = lineMath.area
      item.item_total = lineMath.total
      copy[index] = item
      return copy
    })
  }

  const handleAddItem = () => {
    setItems((prev) => [...prev, DEFAULT_ITEM(`item-${Date.now()}`)])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Summary Totals
  const calculatedSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.item_total) || 0), 0)
  }, [items])

  const calculatedTotalCost = useMemo(() => {
    return items.reduce((sum, it) => {
      const unitCost = it.unit_cost || 0
      const cost = (it.area_sft || 0) > 0 ? (it.area_sft || 0) * unitCost : (it.quantity || 1) * unitCost
      return sum + (cost > 0 ? cost : Math.round((Number(it.item_total) || 0) * 0.55))
    }, 0)
  }, [items])

  const effectiveDiscountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((calculatedSubtotal * Math.min(100, Math.max(0, discountPercentValue))) / 100)
    }
    return Math.min(calculatedSubtotal, Math.max(0, discountAmount))
  }, [calculatedSubtotal, discountType, discountPercentValue, discountAmount])

  const subtotalAfterDiscount = useMemo(() => {
    return Math.max(0, calculatedSubtotal - effectiveDiscountAmount)
  }, [calculatedSubtotal, effectiveDiscountAmount])

  const calculatedVat = useMemo(() => {
    return Math.round((subtotalAfterDiscount * Math.max(0, vatRate)) / 100)
  }, [subtotalAfterDiscount, vatRate])

  const calculatedGrandTotal = useMemo(() => {
    return subtotalAfterDiscount + calculatedVat
  }, [subtotalAfterDiscount, calculatedVat])

  const calculatedAdvanceAmount = useMemo(() => {
    if (customAdvanceAmount !== null) return customAdvanceAmount
    return Math.round((calculatedGrandTotal * advancePercentage) / 100)
  }, [calculatedGrandTotal, advancePercentage, customAdvanceAmount])

  const calculatedDueOnDelivery = useMemo(() => {
    return Math.max(0, calculatedGrandTotal - calculatedAdvanceAmount)
  }, [calculatedGrandTotal, calculatedAdvanceAmount])

  const overallGrossProfit = useMemo(() => {
    return Math.round(subtotalAfterDiscount - calculatedTotalCost)
  }, [subtotalAfterDiscount, calculatedTotalCost])

  const overallMarginPercent = useMemo(() => {
    return calculatedGrandTotal > 0
      ? Math.round((overallGrossProfit / (subtotalAfterDiscount || 1)) * 100)
      : 40
  }, [calculatedGrandTotal, overallGrossProfit, subtotalAfterDiscount])

  // Form Validation
  const validateForm = (): string | null => {
    const finalName = selectedCustomer ? selectedCustomer.name : customerName
    if (!finalName || !finalName.trim()) {
      return 'Customer Name is required.'
    }

    const finalPhone = selectedCustomer ? selectedCustomer.mobile : customerPhone
    if (!finalPhone || !finalPhone.trim()) {
      return 'Customer Phone Number is required.'
    }

    const digits = finalPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      return 'Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX).'
    }

    if (!items || items.length === 0) {
      return 'Quotation must have at least one valid line item.'
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.description || !it.description.trim()) {
        return `Item #${i + 1} description is required.`
      }
      if (!it.quantity || it.quantity < 1) {
        return `Item #${i + 1} quantity must be at least 1.`
      }
      if (typeof it.unit_rate !== 'number' || it.unit_rate < 0) {
        return `Item #${i + 1} rate must be 0 or higher.`
      }
    }

    return null
  }

  // Build Creation Payload
  const buildPayload = (): CreateQuotationPayload => {
    const finalItems: CreateQuotationItemInput[] = items.map((it) => ({
      product_id: it.product_id || undefined,
      item_kind: it.item_kind || (it.width && it.height ? 'service' : 'ready_product'),
      product_type: it.product_type || undefined,
      category_preset: it.category_preset || undefined,
      description: it.description.trim(),
      description_bn: it.description_bn?.trim() || undefined,
      material_spec: it.material_spec?.trim() || undefined,
      dimensions_spec: it.dimensions_spec?.trim() || undefined,
      width: Number(it.width) || 0,
      height: Number(it.height) || 0,
      dimension_unit: it.dimension_unit || 'ft',
      area_sft: Number(it.area_sft) || 0,
      quantity: Math.max(1, Number(it.quantity) || 1),
      unit: it.unit || 'pcs',
      unit_rate: Number(it.unit_rate) || 0,
      unit_cost: it.unit_cost || undefined,
      rate_source: it.rate_source || 'default',
      tier_applied: it.tier_applied || undefined,
      moq: it.moq || undefined,
      finishing: it.finishing || undefined,
      selected_finishing: it.selected_finishing || undefined,
      selected_add_ons: it.selected_add_ons || undefined,
      selected_installation: it.selected_installation || undefined,
      color_spec: it.color_spec || undefined,
      artwork_required: it.artwork_required || false,
      installation_required: it.installation_required || false,
      offset_specs: it.offset_specs || undefined,
      signage_specs: it.signage_specs || undefined,
      item_total: Number(it.item_total) || 0,
    }))

    const basePayload = {
      quotation_date: quotationDate,
      valid_until: validUntil,
      reference_no: referenceNo.trim() || undefined,
      salesperson_name: salespersonName.trim() || currentUser?.profile?.full_name || 'Sales Representative',
      items: finalItems,
      discount_amount: effectiveDiscountAmount,
      vat_rate: vatRate,
      advance_percentage: advancePercentage,
      advance_amount: calculatedAdvanceAmount,
      due_on_delivery: calculatedDueOnDelivery,
      payment_method_note: paymentMethodNote.trim() || undefined,
      delivery_date: deliveryDate || undefined,
      delivery_location: deliveryLocation.trim() || undefined,
      delivery_method: deliveryMethod,
      installation_required: installationRequired,
      notes: customerNotes.trim() || undefined,
      terms_and_conditions: termsAndConditions.trim() || undefined,
      internal_notes: internalNotes.trim() || undefined,
      language_mode: locale === 'bn' ? 'bn' as const : 'en' as const,
    }

    if (selectedCustomer) {
      return {
        ...basePayload,
        customer_id: selectedCustomer.id,
        customer_name: customerName.trim() || selectedCustomer.name,
        customer_name_bn: customerNameBn.trim() || selectedCustomer.name_bn || undefined,
        customer_company: customerCompany.trim() || selectedCustomer.company_name || undefined,
        customer_phone: customerPhone.trim() || selectedCustomer.mobile,
        customer_whatsapp: customerWhatsapp.trim() || selectedCustomer.whatsapp || undefined,
        customer_email: customerEmail.trim() || selectedCustomer.email || undefined,
        customer_address: customerAddress.trim() || selectedCustomer.address || undefined,
        customer_type: customerType || selectedCustomer.customer_type || 'retail',
      }
    }

    return {
      ...basePayload,
      new_customer: {
        name: customerName.trim(),
        company_name: customerCompany.trim() || undefined,
        mobile: customerPhone.trim(),
        whatsapp: customerWhatsapp.trim() || undefined,
        email: customerEmail.trim() || undefined,
        address: customerAddress.trim() || 'Dhaka, Bangladesh',
        customer_type: (customerType as any) || 'retail',
        save_customer: saveCustomer,
      },
      customer_name: customerName.trim(),
      customer_name_bn: customerNameBn.trim() || undefined,
      customer_company: customerCompany.trim() || undefined,
      customer_phone: customerPhone.trim(),
      customer_whatsapp: customerWhatsapp.trim() || undefined,
      customer_email: customerEmail.trim() || undefined,
      customer_address: customerAddress.trim() || undefined,
      customer_type: customerType || 'retail',
    }
  }

  // Core Save Function
  const handleSaveQuotation = async (): Promise<QuotationRecord | null> => {
    const errorMsg = validateForm()
    if (errorMsg) {
      setSubmitError(errorMsg)
      return null
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const payload = buildPayload()
      const res = await createQuotationAction(payload, effectiveCompanyId, slug)

      if (res.success && res.data) {
        try {
          PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, res.data, slug)
          PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, res.data)
        } catch {}

        setSaveSuccessQuote(res.data)
        refreshUsage()
        if (onQuotationCreated) {
          onQuotationCreated(res.data)
        }
        return res.data
      } else {
        setSubmitError(res.error || 'Failed to create quotation.')
        return null
      }
    } catch (err: any) {
      setSubmitError(err.message || 'An unexpected error occurred.')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveAndClose = async () => {
    const saved = await handleSaveQuotation()
    if (saved) {
      onOpenChange(false)
    }
  }

  // Multi-Channel Dispatch Handler (WhatsApp / Email)
  const handleSend = async (channel: 'whatsapp' | 'email', format: 'pdf' | 'text') => {
    let quoteToUse = saveSuccessQuote
    if (!quoteToUse) {
      quoteToUse = await handleSaveQuotation()
      if (!quoteToUse) return
    }

    setSendDropdownOpen(false)

    if (channel === 'whatsapp') {
      const rawPhone = quoteToUse.customer_whatsapp || quoteToUse.customer_phone || customerPhone || ''
      const clean = rawPhone.replace(/\D/g, '')
      const formatted = clean.startsWith('880') ? clean : clean.startsWith('0') ? `88${clean}` : `880${clean}`

      const itemsSummary = quoteToUse.items
        .map((it, idx) => `${idx + 1}. ${it.description} (${it.area_sft > 0 ? `${it.width}×${it.height}ft = ${it.area_sft}sft` : `${it.quantity} ${it.unit}`}) - ${formatBDT(it.item_total)}`)
        .join('\n')

      const text = encodeURIComponent(
        `প্রিয় ${quoteToUse.customer_name},\n\nআপনার জন্য ${company?.name || 'InkFlow'} এর অফিশিয়াল কোটেশন প্রস্তুত করা হয়েছে:\n` +
        `কোটেশন নং: #${quoteToUse.quotation_number}\n` +
        `তারিখ: ${quoteToUse.quotation_date} (মেয়াদ: ${quoteToUse.valid_until} পর্যন্ত)\n\n` +
        `আইটেম বিবরণ:\n${itemsSummary}\n\n` +
        `মোট মূল্য: ${formatBDT(quoteToUse.grand_total)}\n` +
        `অগ্রিম প্রদেয় (৫০%): ${formatBDT(quoteToUse.advance_amount || Math.round(quoteToUse.grand_total * 0.5))}\n` +
        `ডেলিভারির সময় অবশিষ্ট: ${formatBDT(quoteToUse.due_on_delivery || Math.round(quoteToUse.grand_total * 0.5))}\n\n` +
        `পেমেন্ট নির্দেশিকা: bKash/Nagad/Bank Transfer প্রযোজ্য।\n` +
        `অনুমোদনের জন্য অনুগ্রহ করে মেসেজের রিপ্লাই দিন অথবা কল করুন। ধন্যবাদ!`
      )
      window.open(`https://wa.me/${formatted}?text=${text}`, '_blank')
    }

    setIsSending(true)
    setSendSuccessMsg(null)
    try {
      const res = await sendQuotationAction(
        {
          quotationId: quoteToUse.id,
          channel,
          format,
        },
        effectiveCompanyId
      )
      if (res.success) {
        setSendSuccessMsg(`Quotation dispatched via ${channel.toUpperCase()} successfully!`)
      } else {
        setSubmitError(res.error || `Failed to send via ${channel}.`)
      }
    } catch (err: any) {
      setSubmitError(err.message || `Error sending quotation via ${channel}.`)
    } finally {
      setIsSending(false)
    }
  }

  const handlePrint = async () => {
    let quoteToUse = saveSuccessQuote
    if (!quoteToUse) {
      quoteToUse = await handleSaveQuotation()
      if (!quoteToUse) return
    }
    window.open(`/${company?.slug || 'classic-printer'}/quotations/${quoteToUse.id}?print=true`, '_blank')
  }

  return (
    <>
      <ModalDialog
        open={open}
        onOpenChange={onOpenChange}
        size="5xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>New Commercial Quotation</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-mono font-semibold">
                  Bangladesh Commercial Master 2.3
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Digital Print • Offset Packaging • 3D Signage
              </p>
            </div>
          </div>
        }
        hideFooter
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 pb-4 text-slate-900 dark:text-slate-100">
          {/* Submission Alerts */}
          {submitError && (
            <div className="p-3 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 rounded-xl border border-red-200 text-xs flex items-center gap-2 animate-in fade-in-0">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {sendSuccessMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 rounded-xl border border-emerald-200 text-xs flex items-center gap-2 animate-in fade-in-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{sendSuccessMsg}</span>
            </div>
          )}

          {/* =========================================================================
              SECTION 1: CUSTOMER INFORMATION
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

              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-semibold">
                    <UserCheck className="h-3 w-3 mr-1 text-emerald-600" />
                    Existing Customer Selected
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearCustomer}
                    className="h-6 text-[11px] text-slate-400 hover:text-slate-700"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Search directory or type new customer
                </span>
              )}
            </div>

            {/* Customer Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Customer Name with Search Dropdown */}
              <div className="relative" ref={nameSearchRef}>
                <Label htmlFor="custNameInput" className="text-xs font-semibold mb-1 block">
                  Customer Name <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="custNameInput"
                    placeholder="Search name or type new..."
                    value={customerName}
                    onChange={(e) => handleCustomerFieldChange('name', e.target.value)}
                    onFocus={() => {
                      setActiveCustomerSearchField('name')
                      if (customerName.trim().length > 0 && !selectedCustomer) {
                        setShowCustomerDropdown(true)
                      }
                    }}
                    onKeyDown={(e) => handleCustomerKeyDown('name', e)}
                    className="text-xs h-9 pr-8 font-medium"
                    autoFocus
                  />
                  {isSearchingCustomers && activeCustomerSearchField === 'name' && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {activeCustomerSearchField === 'name' && showCustomerDropdown && !selectedCustomer && searchResults.length > 0 && (
                  <CustomerSuggestionsDropdown
                    results={searchResults}
                    highlightedIndex={customerHighlightedIndex}
                    onSelect={handleSelectCustomer}
                    onHover={setCustomerHighlightedIndex}
                  />
                )}
              </div>

              {/* Mobile Phone with Search Dropdown */}
              <div className="relative" ref={phoneSearchRef}>
                <Label htmlFor="custPhoneInput" className="text-xs font-semibold mb-1 block">
                  Mobile Phone <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="custPhoneInput"
                    placeholder="017XXXXXXXX"
                    value={customerPhone}
                    onChange={(e) => handleCustomerFieldChange('phone', e.target.value)}
                    onFocus={() => {
                      setActiveCustomerSearchField('phone')
                      if (customerPhone.trim().length > 0 && !selectedCustomer) {
                        setShowCustomerDropdown(true)
                      }
                    }}
                    onKeyDown={(e) => handleCustomerKeyDown('phone', e)}
                    className="text-xs h-9 pr-8 font-numeric tabular-nums"
                  />
                  {isSearchingCustomers && activeCustomerSearchField === 'phone' && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {activeCustomerSearchField === 'phone' && showCustomerDropdown && !selectedCustomer && searchResults.length > 0 && (
                  <CustomerSuggestionsDropdown
                    results={searchResults}
                    highlightedIndex={customerHighlightedIndex}
                    onSelect={handleSelectCustomer}
                    onHover={setCustomerHighlightedIndex}
                  />
                )}
              </div>

              {/* Company Name with Search Dropdown */}
              <div className="relative" ref={companySearchRef}>
                <Label htmlFor="custCompanyInput" className="text-xs font-semibold mb-1 block">
                  Company Name
                </Label>
                <div className="relative">
                  <Input
                    id="custCompanyInput"
                    placeholder="e.g. Acme Advertising Ltd."
                    value={customerCompany}
                    onChange={(e) => handleCustomerFieldChange('company', e.target.value)}
                    onFocus={() => {
                      setActiveCustomerSearchField('company')
                      if (customerCompany.trim().length > 0 && !selectedCustomer) {
                        setShowCustomerDropdown(true)
                      }
                    }}
                    onKeyDown={(e) => handleCustomerKeyDown('company', e)}
                    className="text-xs h-9 pr-8"
                  />
                  {isSearchingCustomers && activeCustomerSearchField === 'company' && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {activeCustomerSearchField === 'company' && showCustomerDropdown && !selectedCustomer && searchResults.length > 0 && (
                  <CustomerSuggestionsDropdown
                    results={searchResults}
                    highlightedIndex={customerHighlightedIndex}
                    onSelect={handleSelectCustomer}
                    onHover={setCustomerHighlightedIndex}
                  />
                )}
              </div>

              {/* Row 2: Address, Email, Customer Type */}
              <div>
                <Label htmlFor="custAddressInput" className="text-xs font-semibold mb-1 block">
                  Delivery / Office Address
                </Label>
                <Input
                  id="custAddressInput"
                  placeholder="e.g. 14 Motijheel C/A, Dhaka"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="relative" ref={emailSearchRef}>
                <Label htmlFor="custEmailInput" className="text-xs font-semibold mb-1 block">
                  Email Address
                </Label>
                <Input
                  id="custEmailInput"
                  type="email"
                  placeholder="client@domain.com"
                  value={customerEmail}
                  onChange={(e) => handleCustomerFieldChange('email', e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="custTypeSelect" className="text-xs font-semibold mb-1 block">
                  Customer Type <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="custTypeSelect"
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="retail">{tBilingual('Retail / Walk-in', 'খুচরা গ্রাহক')}</option>
                  <option value="reseller">{tBilingual('Reseller / Dealer', 'রিসেলার / ডিলার')}</option>
                  <option value="corporate">{tBilingual('Corporate', 'কর্পোরেট')}</option>
                  <option value="government">{tBilingual('Government / Org', 'সরকারি প্রতিষ্ঠান')}</option>
                </select>
              </div>
            </div>

            {/* Save Customer Checkbox */}
            {!selectedCustomer && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    id="saveCustCheck"
                    checked={saveCustomer}
                    onChange={(e) => setSaveCustomer(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Save customer details to directory for future quotations & orders</span>
                </label>
              </div>
            )}

            {/* Duplicate Detection Alert */}
            {duplicateWarning && duplicateWarning.matches.length > 0 && !selectedCustomer && (
              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Existing Customer Found</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Profile matches <strong>{duplicateWarning.matches[0].customer.name}</strong> (
                  {duplicateWarning.matches[0].customer.mobile}
                  {duplicateWarning.matches[0].customer.company_name ? ` • ${duplicateWarning.matches[0].customer.company_name}` : ''}).
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSelectCustomer(duplicateWarning.matches[0].customer)}
                  className="h-7 text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
                >
                  Use Existing Customer Profile
                </Button>
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTION 2: QUOTATION METADATA
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Quotation Information & Validity
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <Label htmlFor="quoteDate" className="text-xs font-semibold mb-1 block">
                  Quotation Date
                </Label>
                <Input
                  id="quoteDate"
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="validUntil" className="text-xs font-semibold mb-1 block">
                  Valid Until
                </Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="refNo" className="text-xs font-semibold mb-1 block">
                  Reference / PO #
                </Label>
                <Input
                  id="refNo"
                  placeholder="e.g. PO-9842"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="salesperson" className="text-xs font-semibold mb-1 block">
                  Prepared By / Salesperson
                </Label>
                <Input
                  id="salesperson"
                  placeholder="Sales Representative"
                  value={salespersonName}
                  onChange={(e) => setSalespersonName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 3: ITEM BUILDER (MULTI-ITEM ESTIMATOR)
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Quotation Line Items ({items.length})
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Connected to Products & Services Catalog with accurate area, GSM, and finishing formulas.
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
                  Add Catalog Item
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tempId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                    const customItem = DEFAULT_ITEM(tempId)
                    customItem.description = 'Custom Fabrication / Printing Work'
                    customItem.rate_source = 'custom'
                    setItems([...items, customItem])
                  }}
                  className="h-7 text-xs font-bold gap-1 text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Add Custom Item
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const isService = item.item_kind === 'service' || (item.item_kind !== 'ready_product' && item.item_kind !== 'material' && Boolean(item.width && item.height))
                const isReadyProduct = item.item_kind === 'ready_product'
                const isMaterial = item.item_kind === 'material'
                const isCustom = !item.product_id

                // Internal estimated economics
                const estimatedUnitCost = item.unit_cost || 0
                const estimatedDirectCost = isService ? (item.area_sft || 1) * estimatedUnitCost : (item.quantity || 1) * estimatedUnitCost
                const total = Number(item.item_total) || 0
                const estMarginPercent = total > 0 && estimatedDirectCost > 0
                  ? Math.round(((total - estimatedDirectCost) / total) * 100)
                  : 0

                return (
                  <div
                    key={item.tempId}
                    className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-all"
                  >
                    {/* Item Header & Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded">
                          Item #{index + 1}
                        </span>

                        {/* Item Kind & Category Badge */}
                        {item.category_preset === 'digital_print' && (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-[10px] font-bold">
                            🎨 Digital Print
                          </Badge>
                        )}
                        {item.category_preset === 'offset_print' && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                            📑 Offset & Packaging
                          </Badge>
                        )}
                        {item.category_preset === 'signage_fabrication' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold">
                            💡 3D Signage
                          </Badge>
                        )}
                        {item.category_preset === 'ready_merchandise' && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-[10px] font-bold">
                            🎁 Merchandise
                          </Badge>
                        )}

                        {isCustom && (
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold">
                            ✨ Custom Item
                          </Badge>
                        )}

                        {item.tier_applied && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[10px] font-bold">
                            💎 {item.tier_applied}
                          </Badge>
                        )}

                        {item.moq && item.quantity < item.moq && (
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/50 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
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
                          {item.showAdvanced ? 'Simple Specs' : 'Detailed Specs'}
                        </Button>

                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs cursor-pointer"
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
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs font-semibold block">Connect Product / Service</Label>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAdd(index)}
                            className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Quick Add
                          </button>
                        </div>
                        <CatalogItemCombobox
                          products={productsCatalog}
                          selectedProductId={item.product_id}
                          onSelectProduct={(pId) => handleProductSelect(index, pId)}
                          onCustomSelect={() => handleProductSelect(index, '')}
                        />
                      </div>

                      <div className="sm:col-span-7">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs font-semibold block">
                            Item Description & Specs <span className="text-rose-500">*</span>
                          </Label>
                          {isCustom && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 mr-1">Pricing Mode:</span>
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
                          placeholder="e.g. Star Flex Banner 40ft × 20ft with Eyelets & Lamination"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="text-xs h-9 font-medium"
                        />
                      </div>
                    </div>

                    {/* Standard Dimension Presets */}
                    {isService && Array.isArray(item.available_dimension_presets) && item.available_dimension_presets.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] font-bold text-slate-400 mr-1">Standard Sizes:</span>
                        {item.available_dimension_presets.map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleApplyPresetDimension(index, preset)}
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer',
                              item.width === preset.width && item.height === preset.length
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                            )}
                          >
                            {preset.label || `${preset.width} × ${preset.length} ${preset.unit || 'ft'}`}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* SERVICE CONTROLS: [Width] [Height] [Dim. Unit] [Qty] [Finishing] [Add on] [Rate] */}
                    {isService && (
                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-start">
                        <div className="sm:col-span-1">
                          <Label className="text-[11px] font-semibold block mb-1">Width</Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={item.width ?? ''}
                            onChange={(e) => handleItemChange(index, 'width', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                            className="text-xs h-9 font-mono w-full"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <Label className="text-[11px] font-semibold block mb-1">Height</Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={item.height ?? ''}
                            onChange={(e) => handleItemChange(index, 'height', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                            className="text-xs h-9 font-mono w-full"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <Label className="text-[11px] font-semibold block mb-1">Unit</Label>
                          <select
                            value={item.dimension_unit || 'ft'}
                            onChange={(e) => handleItemChange(index, 'dimension_unit', e.target.value)}
                            className="w-full h-9 px-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          >
                            <option value="ft">{tBilingual('ft', 'ফুট')}</option>
                            <option value="inch">{tBilingual('inch', 'ইঞ্চি')}</option>
                            <option value="m">{tBilingual('m', 'মিটার')}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-1">
                          <Label className="text-[11px] font-semibold block mb-1">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="text-xs h-9 font-mono font-bold w-full"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[11px] font-semibold">Finishing</Label>
                            {(item.finishing_rate ?? 0) > 0 && (
                              <span className="text-[10px] text-indigo-600 font-mono font-bold">
                                +৳{item.finishing_rate}
                              </span>
                            )}
                          </div>
                          <select
                            value={item.finishing || 'None'}
                            onChange={(e) => handleItemChange(index, 'finishing', e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          >
                            {Array.isArray(item.available_finishing_options) && item.available_finishing_options.length > 0 ? (
                              <>
                                <option value="None">None (+৳0)</option>
                                {item.available_finishing_options.map((f) => (
                                  <option key={f.id} value={f.name}>
                                    {f.name} {f.unit_price ? `(+৳${f.unit_price})` : ''}
                                  </option>
                                ))}
                              </>
                            ) : Array.isArray(STANDARD_FINISHING_OPTIONS) ? (
                              STANDARD_FINISHING_OPTIONS.map((f) => (
                                <option key={f.id} value={f.name}>
                                  {f.name} {f.rate > 0 ? `(+৳${f.rate})` : '(+৳0)'}
                                </option>
                              ))
                            ) : (
                              <option value="None">None</option>
                            )}
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[11px] font-semibold">Add on</Label>
                            {(item.add_on_rate ?? 0) > 0 && (
                              <span className="text-[10px] text-purple-600 font-mono font-bold">
                                +৳{item.add_on_rate}
                              </span>
                            )}
                          </div>
                          <select
                            value={item.add_on || 'None'}
                            onChange={(e) => handleItemChange(index, 'add_on', e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          >
                            {Array.isArray(STANDARD_ADD_ON_OPTIONS) && STANDARD_ADD_ON_OPTIONS.map((a) => (
                              <option key={a.id} value={a.name}>
                                {a.name} {a.rate > 0 ? `(+৳${a.rate})` : '(+৳0)'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[11px] font-semibold block mb-1">
                            Rate / {item.dimension_unit || 'sft'} (৳)
                          </Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={item.unit_rate ?? ''}
                            onChange={(e) => handleItemChange(index, 'unit_rate', e.target.value)}
                            className="text-xs h-9 font-mono font-bold text-blue-600 dark:text-blue-400 w-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* READY PRODUCT CONTROLS */}
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
                              <span className="text-slate-400 italic text-[11px]">Standard Factory Unit</span>
                            )}
                            {item.pcs_per_carton ? (
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                📦 {item.pcs_per_carton} pcs/box
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
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="text-xs h-9 font-mono font-bold"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[11px] font-semibold mb-1 block">Unit</Label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          >
                            <option value="pcs">{tBilingual('pcs', 'পিস')}</option>
                            <option value="set">{tBilingual('set', 'সেট')}</option>
                            <option value="pack">{tBilingual('pack', 'প্যাক')}</option>
                            <option value="box">{tBilingual('box', 'বক্স')}</option>
                            <option value="pair">{tBilingual('pair', 'জোড়া')}</option>
                            <option value="carton">{tBilingual('carton', 'কার্টুন')}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-[11px] font-semibold mb-1 block">Unit Price (৳)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={item.unit_rate || ''}
                            onChange={(e) => handleItemChange(index, 'unit_rate', parseFloat(e.target.value) || 0)}
                            className="text-xs h-9 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* Substrate Pill */}
                    {isService && item.printable_material_name && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>Linked Catalog Substrate: <strong>{item.printable_material_name}</strong></span>
                      </div>
                    )}

                    {/* Detailed Production & Technical Specs Drawer */}
                    {item.showAdvanced && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs animate-in fade-in-0">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="text-[11px] uppercase font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Wrench className="h-3.5 w-3.5 text-blue-600" />
                            Technical Fabrication & Print Specifications
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-[11px] font-semibold mb-1 block">Substrate / Material Spec</Label>
                            <Input
                              placeholder="e.g. 300 GSM Art Card, 3mm Acrylic"
                              value={item.material_spec || ''}
                              onChange={(e) => handleItemChange(index, 'material_spec', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] font-semibold mb-1 block">Color Spec / Ink Mode</Label>
                            <Input
                              placeholder="e.g. 4/4 Color CMYK, Spot Gold"
                              value={item.color_spec || ''}
                              onChange={(e) => handleItemChange(index, 'color_spec', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>

                          <div className="flex items-center gap-4 pt-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.installation_required}
                                onChange={(e) => handleItemChange(index, 'installation_required', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              <span className="text-xs font-semibold">Site Fitting</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.artwork_required}
                                onChange={(e) => handleItemChange(index, 'artwork_required', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              <span className="text-xs font-semibold">Design Req.</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Line Calculation Summary HUD */}
                    <div className="flex flex-wrap items-center justify-between text-xs pt-1.5 px-1 text-slate-500 font-medium border-t border-slate-200/50 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        {(item.area_sft || 0) > 0 ? (
                          <span>
                            Total Area: <strong>{item.area_sft} sft</strong> ({item.width}ft × {item.height}ft × {item.quantity})
                          </span>
                        ) : (
                          <span>
                            Total Quantity: <strong>{item.quantity} {item.unit}</strong>
                          </span>
                        )}

                        {estimatedDirectCost > 0 && (
                          <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                            Est. Direct Cost: ৳{estimatedDirectCost} • Margin: {estMarginPercent}%
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 mr-2">Line Total:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {formatBDT(Number(item.item_total))}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add Item Bottom Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddItem}
                  className="w-full h-9 text-xs font-bold gap-1.5 text-blue-600 border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100/70 rounded-lg cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Printing Service Line
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const tempId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                    const readyItem = DEFAULT_ITEM(tempId)
                    readyItem.item_kind = 'ready_product'
                    readyItem.unit = 'pcs'
                    readyItem.width = 0
                    readyItem.height = 0
                    readyItem.description = 'Ready Display Product / Merch'
                    setItems([...items, readyItem])
                  }}
                  className="w-full h-9 text-xs font-bold gap-1.5 text-emerald-700 border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 rounded-lg cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Ready Product Line
                </Button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 4: PRICING, DISCOUNT & BANGLADESHI ADVANCE TERMS HUD
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Commercial Pricing, VAT & Advance Payment HUD
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Discount Input */}
              <div className="sm:col-span-4">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold">Negotiated Discount</Label>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={cn(
                        'px-1.5 py-0.5 rounded cursor-pointer',
                        discountType === 'fixed'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-500 hover:bg-slate-200'
                      )}
                    >
                      ৳ BDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={cn(
                        'px-1.5 py-0.5 rounded cursor-pointer',
                        discountType === 'percent'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-500 hover:bg-slate-200'
                      )}
                    >
                      %
                    </button>
                  </div>
                </div>
                {discountType === 'fixed' ? (
                  <Input
                    type="number"
                    placeholder="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="text-xs h-9 font-mono"
                  />
                ) : (
                  <Input
                    type="number"
                    placeholder="0 %"
                    value={discountPercentValue || ''}
                    onChange={(e) => setDiscountPercentValue(parseFloat(e.target.value) || 0)}
                    className="text-xs h-9 font-mono"
                  />
                )}
              </div>

              {/* VAT Selector */}
              <div className="sm:col-span-3">
                <Label className="text-xs font-semibold mb-1 block">NBR Mushak-6.3 VAT</Label>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value={0}>0% (Non-VAT / Exempt)</option>
                  <option value={5}>5% (Service VAT)</option>
                  <option value={7.5}>7.5% (Standard Print VAT)</option>
                  <option value={15}>15% (Full Standard NBR VAT)</option>
                </select>
              </div>

              {/* Advance Requirement Selector */}
              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold">Advance Payment Terms</Label>
                  <span className="text-[10px] text-blue-600 font-bold">Standard: 50%</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '50% Adv', val: 50 },
                    { label: '100% Full', val: 100 },
                    { label: '30% Adv', val: 30 },
                    { label: '0% Post', val: 0 },
                  ].map((adv) => (
                    <button
                      key={adv.val}
                      type="button"
                      onClick={() => {
                        setAdvancePercentage(adv.val)
                        setCustomAdvanceAmount(null)
                      }}
                      className={cn(
                        'h-9 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                        advancePercentage === adv.val && customAdvanceAmount === null
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-white dark:bg-slate-900 border-slate-300 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      )}
                    >
                      {adv.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Commercial Master Financial Summary Display Box */}
            <div className="p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-xl space-y-3 shadow-lg">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Subtotal</span>
                  <span className="font-mono font-bold text-slate-200">{formatBDT(calculatedSubtotal)}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Discount</span>
                  <span className="font-mono font-bold text-rose-300">-{formatBDT(effectiveDiscountAmount)}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">VAT ({vatRate}%)</span>
                  <span className="font-mono font-bold text-slate-200">+{formatBDT(calculatedVat)}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-cyan-300 uppercase font-bold block">Grand Total</span>
                  <span className="font-mono font-black text-cyan-300 text-base">{formatBDT(calculatedGrandTotal)}</span>
                </div>
              </div>

              {/* Commercial Advance & Delivery Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-300 uppercase font-bold block">অগ্রিম প্রদেয় (Advance Required)</span>
                    <span className="text-xs text-emerald-200 font-medium">Work order confirmation</span>
                  </div>
                  <span className="font-mono font-black text-emerald-300 text-lg">
                    {formatBDT(calculatedAdvanceAmount)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-300 uppercase font-bold block">{tBilingual('Due on Delivery', 'ডেলিভারির সময় প্রদেয়')}</span>
                    <span className="text-xs text-amber-200 font-medium">Upon Challan delivery</span>
                  </div>
                  <span className="font-mono font-black text-amber-300 text-lg">
                    {formatBDT(calculatedDueOnDelivery)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 5: DELIVERY & LOGISTICS
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Delivery & Logistics
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <Label htmlFor="delDate" className="text-xs font-semibold mb-1 block">
                  Expected Delivery Date
                </Label>
                <Input
                  id="delDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="delMethod" className="text-xs font-semibold mb-1 block">
                  Delivery Method
                </Label>
                <select
                  id="delMethod"
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as QuotationDeliveryMethod)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value="customer_pickup">{tBilingual('Customer Pickup', 'গ্রাহক পিকআপ')}</option>
                  <option value="company_delivery">{tBilingual('Company Delivery', 'আমাদের ডেলিভারি')}</option>
                  <option value="courier">{tBilingual('Courier Service', 'কুরিয়ার সার্ভিস (সুন্দরবন / এসএ)')}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="delLoc" className="text-xs font-semibold mb-1 block">
                  Delivery Location / Site
                </Label>
                <Input
                  id="delLoc"
                  placeholder="e.g. Uttara Sector 4, Dhaka"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 6: TERMS, PAYMENT INSTRUCTIONS & INTERNAL NOTES
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                6
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Commercial Terms & Payment Accounts
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="custNotes" className="text-xs font-semibold mb-1 block">
                  Payment Instructions & Accounts
                </Label>
                <textarea
                  id="custNotes"
                  rows={3}
                  placeholder="bKash Merchant: 017XXXXXXXX, Bank AC: ..."
                  value={paymentMethodNote}
                  onChange={(e) => setPaymentMethodNote(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="termsCond" className="text-xs font-semibold mb-1 block">
                  Terms & Conditions (Printed)
                </Label>
                <textarea
                  id="termsCond"
                  rows={3}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Label htmlFor="intNotes" className="text-xs text-amber-800 dark:text-amber-300 font-bold block">
                    Internal Notes & Floor Margin
                  </Label>
                  <span className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-1.5 py-0.2 rounded font-bold">
                    Private / Staff Only
                  </span>
                </div>
                <textarea
                  id="intNotes"
                  rows={3}
                  placeholder="Private cost estimates, subcontractor rates, internal margins..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 7: ACTIONS BAR (SAVE-FIRST GUARANTEE)
             ========================================================================= */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs min-h-[40px] cursor-pointer"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Print Button (Saves first) */}
              <Button
                type="button"
                variant="outline"
                onClick={handlePrint}
                disabled={isSubmitting || isSending}
                className="flex-1 sm:flex-initial text-xs min-h-[40px] border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="h-4 w-4 mr-1.5 text-slate-600 dark:text-slate-400" />
                Print Proposal
              </Button>

              {/* Send Dropdown Menu (Saves first) */}
              <div className="relative flex-1 sm:flex-initial" ref={sendDropdownRef}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSendDropdownOpen(!sendDropdownOpen)}
                  disabled={isSubmitting || isSending}
                  className="w-full text-xs min-h-[40px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1.5" />
                  )}
                  Send Customer
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>

                {sendDropdownOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="p-1.5 font-bold text-slate-400 uppercase text-[10px]">
                      WhatsApp Direct (Bangla / English)
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => handleSend('whatsapp', 'pdf')}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-lg cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">Send WhatsApp</div>
                          <div className="text-[10px] text-slate-400">Includes items, advance payable & terms</div>
                        </div>
                      </button>
                    </div>

                    <div className="p-1.5 font-bold text-slate-400 uppercase text-[10px]">
                      Email Proposal
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => handleSend('email', 'pdf')}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-lg cursor-pointer"
                      >
                        <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">Send Email with PDF</div>
                          <div className="text-[10px] text-slate-400">Formal A4 PDF document</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Quotation Primary Button */}
              <Button
                type="button"
                onClick={handleSaveAndClose}
                disabled={isSubmitting || isSending}
                className="flex-1 sm:flex-initial text-xs min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1.5" />
                    Save Quotation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </ModalDialog>

      {/* QUICK ADD PRODUCT MODAL */}
      <ModalDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        title="Quick Add Product to Catalog"
        description="Creates an authoritative product in PostgreSQL and inserts it directly into this quote."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveQuickProduct} className="p-4 space-y-3.5 text-xs">
          {quickProductError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200">
              {quickProductError}
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold mb-1 block">Product / Service Name *</Label>
            <Input
              placeholder="e.g. PVC Board Print (3mm)"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              className="text-xs h-9"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Category</Label>
              <select
                value={quickAddCategory}
                onChange={(e) => setQuickAddCategory(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="flex_banner">🎨 Flex & Banner</option>
                <option value="vinyl_sticker">🖼️ Vinyl Sticker</option>
                <option value="offset_print">📑 Offset Print & Books</option>
                <option value="signage_3d">💡 3D Signage</option>
                <option value="uv_print">✨ UV Printing</option>
                <option value="ready_product">📦 Ready Product</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Sell By (Unit) *</Label>
              <select
                value={quickAddUnit}
                onChange={(e) => setQuickAddUnit(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium uppercase font-mono"
              >
                <option value="sft">{tBilingual('sft', 'বর্গফুট')}</option>
                <option value="pcs">{tBilingual('pcs', 'পিস')}</option>
                <option value="rft">{tBilingual('rft', 'রানিং ফুট')}</option>
                <option value="set">{tBilingual('set', 'সেট')}</option>
                <option value="box">{tBilingual('box', 'বক্স')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Selling Price (৳) *</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                value={quickAddPrice || ''}
                onChange={(e) => setQuickAddPrice(parseFloat(e.target.value) || 0)}
                className="text-xs h-9 font-mono font-bold"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Min Floor Charge (৳)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                value={quickAddMinPrice || ''}
                onChange={(e) => setQuickAddMinPrice(parseFloat(e.target.value) || 0)}
                className="text-xs h-9 font-mono text-amber-700 dark:text-amber-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickAddOpen(false)}
              disabled={isSavingQuickProduct}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSavingQuickProduct}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 cursor-pointer"
            >
              {isSavingQuickProduct ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save & Add to Quote
            </Button>
          </div>
        </form>
      </ModalDialog>
    </>
  )
}

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
  Search,
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
} from '@/types/quotation.types'
import { CustomerRecord, ResolvedProductRate, DuplicateCheckResponse } from '@/types/crm.types'
import { ProductRecord } from '@/types/product.types'
import { DEFAULT_QUOTATION_TERMS, DEFAULT_QUOTATION_TERMS_BN } from '@/types/quotation.types'
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
  products,
  selectedProductId,
  onSelectProduct,
  onCustomSelect,
}: CatalogComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId)
  }, [products, selectedProductId])

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
    if (!term) return products
    return products.filter((p) => {
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

  const services = useMemo(() => filteredProducts.filter((p) => isServiceProduct(p)), [filteredProducts])
  const readyProducts = useMemo(() => filteredProducts.filter((p) => isReadyProduct(p)), [filteredProducts])
  const materials = useMemo(() => filteredProducts.filter((p) => isMaterialProduct(p)), [filteredProducts])

  // Flat list of selectable items for arrow key navigation
  const flatSelectableItems = useMemo(() => {
    const list: Array<{ id: string; type: 'custom' | 'product'; product?: ProductRecord }> = [
      { id: '', type: 'custom' }
    ]
    services.forEach((p) => list.push({ id: p.id, type: 'product', product: p }))
    readyProducts.forEach((p) => list.push({ id: p.id, type: 'product', product: p }))
    materials.forEach((p) => list.push({ id: p.id, type: 'product', product: p }))
    return list
  }, [services, readyProducts, materials])

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
          placeholder="Type keyword to search catalog (e.g. flex, vinyl, 3D)..."
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
            <span>✨ -- Custom Item (No Catalog) --</span>
            <div className="flex items-center gap-1.5">
              {highlightedIndex === 0 && <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">↵ Enter</span>}
              {!selectedProductId && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
            </div>
          </div>

          {/* Printing Services */}
          {services.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 uppercase tracking-wider">
                🖨️ Printing & Services ({services.length})
              </div>
              {services.map((p, sIdx) => {
                const globalIdx = 1 + sIdx
                const isHighlighted = highlightedIndex === globalIdx
                return (
                  <div
                    key={p.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(globalIdx, el)
                      else itemRefs.current.delete(globalIdx)
                    }}
                    onMouseEnter={() => setHighlightedIndex(globalIdx)}
                    onClick={() => handleSelect({ id: p.id, type: 'product', product: p })}
                    className={cn(
                      "p-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                      isHighlighted
                        ? "bg-blue-100/90 dark:bg-blue-950/70 border-l-4 border-blue-600 text-blue-900 dark:text-blue-100"
                        : selectedProductId === p.id
                        ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        : "hover:bg-blue-50/70 dark:hover:bg-blue-950/40"
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
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        ৳{p.selling_price}
                      </span>
                      {isHighlighted && <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">↵ Enter</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ready Products */}
          {readyProducts.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 uppercase tracking-wider">
                📦 Ready Products ({readyProducts.length})
              </div>
              {readyProducts.map((p, rIdx) => {
                const globalIdx = 1 + services.length + rIdx
                const isHighlighted = highlightedIndex === globalIdx
                return (
                  <div
                    key={p.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(globalIdx, el)
                      else itemRefs.current.delete(globalIdx)
                    }}
                    onMouseEnter={() => setHighlightedIndex(globalIdx)}
                    onClick={() => handleSelect({ id: p.id, type: 'product', product: p })}
                    className={cn(
                      "p-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                      isHighlighted
                        ? "bg-blue-100/90 dark:bg-blue-950/70 border-l-4 border-blue-600 text-blue-900 dark:text-blue-100"
                        : selectedProductId === p.id
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
                      {isHighlighted && <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">↵ Enter</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Raw Materials */}
          {materials.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30 uppercase tracking-wider">
                🧵 Raw Materials ({materials.length})
              </div>
              {materials.map((p, mIdx) => {
                const globalIdx = 1 + services.length + readyProducts.length + mIdx
                const isHighlighted = highlightedIndex === globalIdx
                return (
                  <div
                    key={p.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(globalIdx, el)
                      else itemRefs.current.delete(globalIdx)
                    }}
                    onMouseEnter={() => setHighlightedIndex(globalIdx)}
                    onClick={() => handleSelect({ id: p.id, type: 'product', product: p })}
                    className={cn(
                      "p-2.5 cursor-pointer flex items-center justify-between gap-2 transition-colors",
                      isHighlighted
                        ? "bg-blue-100/90 dark:bg-blue-950/70 border-l-4 border-blue-600 text-blue-900 dark:text-blue-100"
                        : selectedProductId === p.id
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
                      {isHighlighted && <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">↵ Enter</span>}
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
}

interface ItemFormState extends CreateQuotationItemInput {
  tempId: string
  item_kind: 'service' | 'ready_product' | 'material' | 'custom'
  isSignageProduct?: boolean
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
  description: 'Pana Flex Banner Print',
  description_bn: '',
  material_spec: '',
  dimensions_spec: '',
  width: '' as any,
  height: '' as any,
  dimension_unit: 'ft',
  quantity: 1,
  unit: 'sft',
  base_rate: 22,
  unit_rate: 22,
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
  showAdvanced: false,
  available_dimension_presets: [],
  available_finishing_options: [],
})

export function NewQuotationModal({
  open,
  onOpenChange,
  onQuotationCreated,
  companyId = 'c-01',
}: NewQuotationModalProps) {
  const { locale } = useI18n()
  const { company, currentUser } = useTenant()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()

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

  // Quick-Add Product Modal State (Phase 15)
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
  const effectiveCompanyId = company?.id || companyId

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
      getQuotationProductsAction(effectiveCompanyId).then((res) => {
        if (res.success && res.data) {
          setProductsCatalog(res.data)
        }
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

  // Categorized Catalog Lists for intelligent dropdown grouping
  const servicesCatalogList = useMemo(() => {
    return productsCatalog.filter((p) => isServiceProduct(p))
  }, [productsCatalog])

  const readyProductsCatalogList = useMemo(() => {
    return productsCatalog.filter((p) => isReadyProduct(p))
  }, [productsCatalog])

  const materialsCatalogList = useMemo(() => {
    return productsCatalog.filter((p) => isMaterialProduct(p))
  }, [productsCatalog])

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

  const handleApplyPreset = (index: number, preset: { width: number; length: number; unit?: string }) => {
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
      item_total: Number(it.item_total) || 0,
    }))

    if (selectedCustomer) {
      return {
        customer_id: selectedCustomer.id,
        customer_name: customerName.trim() || selectedCustomer.name,
        customer_name_bn: customerNameBn.trim() || selectedCustomer.name_bn || undefined,
        customer_company: customerCompany.trim() || selectedCustomer.company_name || undefined,
        customer_phone: customerPhone.trim() || selectedCustomer.mobile,
        customer_whatsapp: customerWhatsapp.trim() || selectedCustomer.whatsapp || undefined,
        customer_email: customerEmail.trim() || selectedCustomer.email || undefined,
        customer_address: customerAddress.trim() || selectedCustomer.address || undefined,
        customer_type: customerType || selectedCustomer.customer_type || 'retail',
        quotation_date: quotationDate,
        valid_until: validUntil,
        reference_no: referenceNo.trim() || undefined,
        salesperson_name: salespersonName.trim() || currentUser?.profile?.full_name || 'Sales Representative',
        items: finalItems,
        discount_amount: effectiveDiscountAmount,
        vat_rate: vatRate,
        delivery_date: deliveryDate || undefined,
        delivery_location: deliveryLocation.trim() || undefined,
        delivery_method: deliveryMethod,
        installation_required: installationRequired,
        notes: customerNotes.trim() || undefined,
        terms_and_conditions: termsAndConditions.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
        language_mode: locale === 'bn' ? 'bn' : 'en',
      }
    }

    return {
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
      quotation_date: quotationDate,
      valid_until: validUntil,
      reference_no: referenceNo.trim() || undefined,
      salesperson_name: salespersonName.trim() || currentUser?.profile?.full_name || 'Sales Representative',
      items: finalItems,
      discount_amount: effectiveDiscountAmount,
      vat_rate: vatRate,
      delivery_date: deliveryDate || undefined,
      delivery_location: deliveryLocation.trim() || undefined,
      delivery_method: deliveryMethod,
      installation_required: installationRequired,
      notes: customerNotes.trim() || undefined,
      terms_and_conditions: termsAndConditions.trim() || undefined,
      internal_notes: internalNotes.trim() || undefined,
      language_mode: locale === 'bn' ? 'bn' : 'en',
    }
  }

  // Handle Save
  const handleSave = async (): Promise<QuotationRecord | null> => {
    const valErr = validateForm()
    if (valErr) {
      setSubmitError(valErr)
      return null
    }

    const quotaCheck = checkCanCreate('monthly_orders')
    if (!quotaCheck.allowed) {
      openLimitExceededModal('monthly_orders')
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = buildPayload()
      const res = await createQuotationAction(payload, effectiveCompanyId)

      if (!res.success || !res.data) {
        setSubmitError(res.error || 'Failed to create quotation. Please try again.')
        setIsSubmitting(false)
        return null
      }

      const savedQuote = res.data
      setSaveSuccessQuote(savedQuote)
      refreshUsage()
      if (typeof window !== 'undefined') {
        const activeSlug = company?.slug || PrintERPDataStore.getActiveTenantSlug() || 'classic-printer'
        PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, savedQuote, activeSlug)
        PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, savedQuote)
      }
      if (onQuotationCreated) {
        onQuotationCreated(savedQuote)
      }
      setIsSubmitting(false)
      return savedQuote
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save quotation.')
      setIsSubmitting(false)
      return null
    }
  }

  // Handle Save and Close Modal
  const handleSaveAndClose = async () => {
    const saved = await handleSave()
    if (saved) {
      onOpenChange(false)
    }
  }

  // Handle Print Action (Saves first)
  const handlePrint = async () => {
    let quoteToPrint = saveSuccessQuote
    if (!quoteToPrint) {
      quoteToPrint = await handleSave()
    }
    if (!quoteToPrint) return

    const slug = company?.slug || PrintERPDataStore.getActiveTenantSlug() || 'classic-printer'
    window.open(`/quotations/${quoteToPrint.id}?print=true`, '_blank')
  }

  // Handle Send Action (Saves first)
  const handleSend = async (channel: 'whatsapp' | 'email', format: 'pdf' | 'text' = 'pdf') => {
    setSendDropdownOpen(false)
    let quoteToSend = saveSuccessQuote
    if (!quoteToSend) {
      quoteToSend = await handleSave()
    }
    if (!quoteToSend) return

    setIsSending(true)
    setSendSuccessMsg(null)

    try {
      const res = await sendQuotationAction(
        {
          quotationId: quoteToSend.id,
          channel,
          format,
        },
        effectiveCompanyId
      )

      setIsSending(false)
      if (res.success) {
        setSendSuccessMsg(
          channel === 'whatsapp'
            ? `Quotation #${quoteToSend.quotation_number} dispatched to WhatsApp (${quoteToSend.customer_phone}).`
            : `Quotation #${quoteToSend.quotation_number} emailed with PDF attachment to ${quoteToSend.customer_email || quoteToSend.customer_name}.`
        )

        if (channel === 'whatsapp') {
          if (res.data?.whatsappUrl) {
            window.open(res.data.whatsappUrl, '_blank')
          } else {
            const rawPhone = quoteToSend.customer_whatsapp || quoteToSend.customer_phone
            const clean = rawPhone.replace(/\D/g, '')
            const text = encodeURIComponent(
              `Hello ${quoteToSend.customer_name},\nHere is your official quotation #${quoteToSend.quotation_number} from ${company?.name || 'InkFlow'}.\nTotal: ৳${quoteToSend.grand_total} (Valid until ${quoteToSend.valid_until}).\nPlease review and let us know your confirmation.`
            )
            window.open(`https://wa.me/${clean}?text=${text}`, '_blank')
          }
        }
      } else {
        setSubmitError(`Quotation saved, but ${channel} sending failed: ${res.error}`)
      }
    } catch (err: any) {
      setIsSending(false)
      setSubmitError(`Quotation saved, but sending encountered an error: ${err?.message}`)
    }
  }

  const getRateSourceBadge = (source?: RateSource) => {
    switch (source) {
      case 'custom':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
            Custom Rate
          </Badge>
        )
      case 'last_invoice':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[10px] font-bold">
            Last Invoice Rate
          </Badge>
        )
      case 'override':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
            Manual Override
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
            Catalog Rate
          </Badge>
        )
    }
  }

  return (
    <>
      <ModalDialog
        open={open}
        onOpenChange={onOpenChange}
      size="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {locale === 'bn' ? 'নতুন কোটেশন তৈরি করুন' : 'New Quotation'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Easier than Excel • Faster than paper • More organized than WhatsApp
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <div className="space-y-5 pt-1 pb-2">
        {/* Save Success Alert Banner */}
        {saveSuccessQuote && (
          <div className="p-3.5 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Quotation #{saveSuccessQuote.quotation_number} Saved!</strong> Grand Total: ৳{formatBDT(saveSuccessQuote.grand_total)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-7 text-xs bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-300 dark:border-emerald-700"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              View & Print PDF
            </Button>
          </div>
        )}

        {/* Communication Status Banner */}
        {sendSuccessMsg && (
          <div className="p-3 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 rounded-xl border border-blue-200 dark:border-blue-800 text-xs flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600 shrink-0" />
            <span>{sendSuccessMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {submitError && (
          <div className="p-3.5 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 rounded-xl border border-red-300 dark:border-red-800 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Action Alert</span>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: CUSTOMER
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

            {selectedCustomer && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <UserCheck className="h-3.5 w-3.5" />
                  Existing Customer Linked
                </span>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Unified Customer Search & Autocomplete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Row 1: [Customer Name] [Phone Number] [Company Name] */}
            <div className="relative" ref={nameSearchRef}>
              <Label htmlFor="custNameInput" className="text-xs font-semibold mb-1 block">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="custNameInput"
                  placeholder="Search or enter customer name..."
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
                />
                {isSearchingCustomers && activeCustomerSearchField === 'name' ? (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
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

            <div className="relative" ref={phoneSearchRef}>
              <Label htmlFor="custPhoneInput" className="text-xs font-semibold mb-1 block">
                Phone Number <span className="text-rose-500">*</span>
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
                {isSearchingCustomers && activeCustomerSearchField === 'phone' ? (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
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
                {isSearchingCustomers && activeCustomerSearchField === 'company' ? (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
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

            {/* Row 2: [Billing Address] [Email] [Customer Type] */}
            <div>
              <Label htmlFor="custAddressInput" className="text-xs font-semibold mb-1 block">
                Address / Delivery Address
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
              <div className="relative">
                <Input
                  id="custEmailInput"
                  type="email"
                  placeholder="client@domain.com"
                  value={customerEmail}
                  onChange={(e) => handleCustomerFieldChange('email', e.target.value)}
                  onFocus={() => {
                    setActiveCustomerSearchField('email')
                    if (customerEmail.trim().length > 0 && !selectedCustomer) {
                      setShowCustomerDropdown(true)
                    }
                  }}
                  onKeyDown={(e) => handleCustomerKeyDown('email', e)}
                  className="text-xs h-9 pr-8"
                />
                {isSearchingCustomers && activeCustomerSearchField === 'email' ? (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                )}
              </div>

              {/* Suggestions Dropdown */}
              {activeCustomerSearchField === 'email' && showCustomerDropdown && !selectedCustomer && searchResults.length > 0 && (
                <CustomerSuggestionsDropdown
                  results={searchResults}
                  highlightedIndex={customerHighlightedIndex}
                  onSelect={handleSelectCustomer}
                  onHover={setCustomerHighlightedIndex}
                />
              )}
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
                <option value="retail">Retail / Walk-in (খুচরা)</option>
                <option value="reseller">Reseller / Dealer (রিসেলার)</option>
                <option value="corporate">Corporate (কর্পোরেট)</option>
                <option value="government">Government / Org (সরকারি)</option>
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
                <span>Save customer details to directory for future quotations</span>
              </label>
            </div>
          )}

          {/* Duplicate Detection Alert */}
          {duplicateWarning && duplicateWarning.matches.length > 0 && !selectedCustomer && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-2">
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
                Use Existing Customer
              </Button>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2: QUOTATION INFORMATION
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Quotation Information
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
            SECTION 3: ITEM SECTION (MULTI-ITEM BUILDER)
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Quotation Items ({items.length})
                </h3>
                <p className="text-[10px] text-slate-400">
                  Commercial Proposal: items do not reserve or decrement physical inventory.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs font-bold gap-1 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30"
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
                  customItem.description = 'Custom Quotation Item'
                  customItem.rate_source = 'custom'
                  setItems([...items, customItem])
                }}
                className="h-7 text-xs font-bold gap-1 text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Add Custom Item
              </Button>
            </div>
          </div>

          {/* Catalog Empty Soft Notice */}
          {productsCatalog.length === 0 && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
              <span>No catalog products available. You can freely create and price custom quotation items below.</span>
            </div>
          )}

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
                      {getRateSourceBadge(item.rate_source)}

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
                        className="h-7 px-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 text-xs font-semibold"
                      >
                        {item.showAdvanced ? 'Simple Specs' : 'More Specs'}
                      </Button>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
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
                        <Label className="text-xs font-semibold block">Select Catalog Item</Label>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAdd(index)}
                          className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-0.5"
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
                          Item Description <span className="text-rose-500">*</span>
                        </Label>
                        {isCustom && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 mr-1">Mode:</span>
                            <button
                              type="button"
                              onClick={() => handleToggleItemKind(index, 'service')}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-bold transition-all',
                                isService ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                              )}
                            >
                              📐 Sqft Area
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleItemKind(index, 'ready_product')}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-bold transition-all',
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
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="text-xs h-9 font-medium"
                      />
                    </div>
                  </div>

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
                        <div className="h-5 flex items-center mb-1">
                          <Label className="text-[11px] font-semibold truncate whitespace-nowrap">Width</Label>
                        </div>
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
                        <div className="h-5 flex items-center mb-1">
                          <Label className="text-[11px] font-semibold truncate whitespace-nowrap">Height</Label>
                        </div>
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
                        <div className="h-5 flex items-center mb-1">
                          <Label className="text-[11px] font-semibold truncate whitespace-nowrap">Dim. Unit</Label>
                        </div>
                        <select
                          value={item.dimension_unit || 'ft'}
                          onChange={(e) => handleItemChange(index, 'dimension_unit', e.target.value)}
                          className="w-full h-9 px-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                        >
                          <option value="ft">ft (ফুট)</option>
                          <option value="inch">inch (ইঞ্চি)</option>
                          <option value="m">m (মিটার)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <div className="h-5 flex items-center mb-1">
                          <Label className="text-[11px] font-semibold truncate whitespace-nowrap">Qty</Label>
                        </div>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="text-xs h-9 font-mono font-bold w-full"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <div className="h-5 flex items-center justify-between mb-1 gap-1">
                          <Label className="text-[11px] font-semibold truncate whitespace-nowrap">Finishing</Label>
                          {(item.finishing_rate ?? 0) > 0 && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold whitespace-nowrap shrink-0">
                              +৳{item.finishing_rate}
                            </span>
                          )}
                        </div>
                        <select
                          value={item.finishing || 'None'}
                          onChange={(e) => handleItemChange(index, 'finishing', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                        >
                          {item.available_finishing_options && item.available_finishing_options.length > 0 ? (
                            <>
                              <option value="None">None (+৳0)</option>
                              {item.available_finishing_options.map((f) => (
                                <option key={f.id} value={f.name}>
                                  {f.name} {f.unit_price ? `(+৳${f.unit_price})` : ''}
                                </option>
                              ))}
                            </>
                          ) : (
                            STANDARD_FINISHING_OPTIONS.map((f) => (
                              <option key={f.id} value={f.name}>
                                {f.name} {f.rate > 0 ? `(+৳${f.rate})` : '(+৳0)'}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <div className="h-5 flex items-center justify-between mb-1 gap-1">
                          <Label className="text-[11px] font-semibold truncate whitespace-nowrap">Add on</Label>
                          {(item.add_on_rate ?? 0) > 0 && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold whitespace-nowrap shrink-0">
                              +৳{item.add_on_rate}
                            </span>
                          )}
                        </div>
                        <select
                          value={item.add_on || 'None'}
                          onChange={(e) => handleItemChange(index, 'add_on', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                        >
                          {STANDARD_ADD_ON_OPTIONS.map((a) => (
                            <option key={a.id} value={a.name}>
                              {a.name} {a.rate > 0 ? `(+৳${a.rate})` : '(+৳0)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="h-5 flex items-center justify-between mb-1 gap-1">
                          <Label className="text-[11px] font-semibold truncate whitespace-nowrap" title={`Rate per ${item.dimension_unit || 'sft'} (৳)`}>
                            Rate ({item.dimension_unit || 'sft'})
                          </Label>
                          {((item.finishing_rate ?? 0) > 0 || (item.add_on_rate ?? 0) > 0) && (
                            <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap shrink-0" title={`Base: ৳${item.base_rate ?? 0} + Finishing: ৳${item.finishing_rate ?? 0} + Add-on: ৳${item.add_on_rate ?? 0}`}>
                              Base ৳{item.base_rate ?? 0}
                            </span>
                          )}
                        </div>
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
                          value={item.unit_rate || ''}
                          onChange={(e) => handleItemChange(index, 'unit_rate', parseFloat(e.target.value) || 0)}
                          className="text-xs h-9 font-mono font-bold text-emerald-600 dark:text-emerald-400"
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
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                          className="text-xs h-9 font-mono font-bold"
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
                          value={item.unit_rate || ''}
                          onChange={(e) => handleItemChange(index, 'unit_rate', parseFloat(e.target.value) || 0)}
                          className="text-xs h-9 font-mono font-bold text-purple-600 dark:text-purple-400"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold mb-1 block">Material Spec</Label>
                        <Input
                          placeholder="e.g. 280 GSM Frontlit"
                          value={item.material_spec || ''}
                          onChange={(e) => handleItemChange(index, 'material_spec', e.target.value)}
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

                  {/* Advanced Specs Drawer / Panel */}
                  {(item.showAdvanced || item.isSignageProduct) && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs animate-in fade-in-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Advanced Production & Site Specs
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[11px] font-semibold mb-1 block">Material Spec / Substrate</Label>
                          <Input
                            placeholder="e.g. 3mm Cast Acrylic, 280 GSM"
                            value={item.material_spec || ''}
                            onChange={(e) => handleItemChange(index, 'material_spec', e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id={`install-${index}`}
                            checked={item.installation_required}
                            onChange={(e) => handleItemChange(index, 'installation_required', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <Label htmlFor={`install-${index}`} className="text-xs font-semibold cursor-pointer">
                            Installation Required at Site
                          </Label>
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id={`art-${index}`}
                            checked={item.artwork_required}
                            onChange={(e) => handleItemChange(index, 'artwork_required', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <Label htmlFor={`art-${index}`} className="text-xs font-semibold cursor-pointer">
                            Design / Artwork Required
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Line Calculation Summary HUD */}
                  <div className="flex flex-wrap items-center justify-between text-xs pt-1.5 px-1 text-slate-500 font-medium border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      {(item.area_sft || 0) > 0 ? (
                        <span>
                          Area: <strong>{item.area_sft} sft</strong> ({item.width}ft × {item.height}ft × {item.quantity})
                        </span>
                      ) : (
                        <span>
                          Quantity: <strong>{item.quantity} {item.unit}</strong>
                        </span>
                      )}

                      {estimatedDirectCost > 0 && (
                        <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                          Est. Cost: ৳{estimatedDirectCost} • Margin: {estMarginPercent}%
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

            {/* Add Item Buttons below items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddItem}
                className="w-full h-9 text-xs font-bold gap-1.5 text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 hover:bg-blue-100/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Printing Service Item
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
                  readyItem.description = 'Ready Display Product'
                  setItems([...items, readyItem])
                }}
                className="w-full h-9 text-xs font-bold gap-1.5 text-emerald-700 dark:text-emerald-400 border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Ready Product Item
              </Button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: PRICING SUMMARY
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Pricing Summary
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Discount Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold">Overall Discount</Label>
                <div className="flex gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={cn(
                      'px-1.5 py-0.5 rounded cursor-pointer',
                      discountType === 'fixed'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
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
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
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

            {/* VAT Rate */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">VAT Rate (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                className="text-xs h-9 font-mono"
              />
            </div>

            {/* Grand Total Display Box */}
            <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl flex flex-col justify-between shadow-md">
              <div className="flex justify-between text-xs text-blue-100 font-medium">
                <span>Subtotal: {formatBDT(calculatedSubtotal)}</span>
                <span>VAT: +{formatBDT(calculatedVat)}</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-white/15">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Grand Total:</span>
                <span className="text-xl font-black font-mono">{formatBDT(calculatedGrandTotal)}</span>
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
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="customer_pickup">Customer Pickup (গ্রাহক পিকআপ)</option>
                <option value="company_delivery">Company Delivery (আমাদের ডেলিভারি)</option>
                <option value="courier">Courier / Parcel (কুরিয়ার সার্ভিস)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="delLoc" className="text-xs font-semibold mb-1 block">
                Delivery Location
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
            SECTION 6: NOTES & TERMS
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              6
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Notes & Terms
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="custNotes" className="text-xs font-semibold mb-1 block">
                Customer Notes (Printed)
              </Label>
              <textarea
                id="custNotes"
                rows={3}
                placeholder="Notes visible on customer quotation document..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="termsCond" className="text-xs font-semibold mb-1 block">
                Terms & Conditions
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
                  Internal Notes
                </Label>
                <span className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-1.5 py-0.2 rounded font-bold">
                  Private / Staff Only
                </span>
              </div>
              <textarea
                id="intNotes"
                rows={3}
                placeholder="Private cost estimates, vendor notes, internal margins..."
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
            className="w-full sm:w-auto text-xs min-h-[40px]"
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
              Print
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
                Send
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>

              {sendDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="p-1.5 font-bold text-slate-400 uppercase text-[10px]">
                    WhatsApp Direct
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => handleSend('whatsapp', 'pdf')}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-lg cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Send WhatsApp</div>
                        <div className="text-[10px] text-slate-400">Message with document link</div>
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
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Send Email with PDF</div>
                        <div className="text-[10px] text-slate-400">Formal PDF attachment</div>
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

      {/* QUICK ADD PRODUCT MODAL (Phase 15) */}
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
            <Label className="text-xs font-semibold mb-1 block">Product Name *</Label>
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
                <option value="flex_banner">Flex Banner</option>
                <option value="vinyl_sticker">Vinyl Sticker</option>
                <option value="uv_print">UV Printing</option>
                <option value="signage_3d">3D Signage</option>
                <option value="paper_print">Paper Print</option>
                <option value="general_print">General Print</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Sell By (Unit) *</Label>
              <select
                value={quickAddUnit}
                onChange={(e) => setQuickAddUnit(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium uppercase font-mono"
              >
                <option value="sft">sft (স্কয়ার ফুট)</option>
                <option value="pcs">pcs (পিস)</option>
                <option value="rft">rft (রানিং ফুট)</option>
                <option value="inch">inch (ইঞ্চি)</option>
                <option value="ft">ft (ফুট)</option>
                <option value="sheet">sheet (শীট)</option>
                <option value="set">set (সেট)</option>
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
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSavingQuickProduct}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4"
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

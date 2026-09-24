'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  X,
  UserCheck,
  CreditCard,
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
import { formatBDT, tBilingual } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  searchInvoiceCustomersAction,
  resolveCustomerPricingAction,
  createInvoiceAction,
  sendInvoiceAction,
  getInvoiceProductsAction,
} from '@/actions/billing.actions'
import { getCustomerFinancialSummaryAction } from '@/actions/customer.actions'
import { evaluateStockAvailability, type StockAvailabilityResult } from '@/lib/domain/stock-availability'
import type { CreateInvoiceItemInput } from '@/types/billing.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import type { MaterialRecord, InventoryRollRecord, InventoryStockBalanceRecord, InventoryRemnantRecord } from '@/types/inventory.types'
import { isServiceProduct, isReadyProduct, isMaterialProduct } from '@/lib/units'

export interface NewInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedCustomerId?: string
  preselectedQuotationId?: string
  preselectedSalesOrderId?: string
  preselectedCustomerType?: 'retail' | 'reseller' | 'corporate' | 'government'
  preselectedWhatsappNumber?: string
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
  item_kind?: 'service' | 'ready_product' | 'material' | 'custom' | 'custom_manufacturing' | 'outsource'
  product_type?: string
  category_preset?: 'digital_print' | 'offset_print' | 'signage_fabrication' | 'ready_merchandise' | 'custom' | string | null
  itemName: string
  description_bn?: string | null
  material_spec?: string | null
  dimensions_spec?: string
  width: string
  height: string
  dimension_unit?: 'ft' | 'inch' | 'm' | string
  quantity: number
  unit: string
  base_rate?: number
  rate: number
  finishing: string
  finishing_rate?: number
  add_on?: string
  add_on_rate?: number
  rateSource?: 'custom' | 'last_invoice' | 'default' | 'manual'
  tier_applied?: string
  moq?: number
  pcs_per_carton?: number
  unit_cost?: number
  available_dimension_presets?: Array<{ label?: string; width: number; length: number; unit?: string }>
  available_finishing_options?: Array<{ id: string; name: string; pricing_method?: string; unit_price?: number; unit_cost?: number }>
  available_additional_options?: Array<{ id: string; name: string; pricing_method?: string; unit_price?: number; unit_cost?: number }>
  printable_material_name?: string
  showAdvanced?: boolean
  isManualRate?: boolean
  artwork_required?: boolean
  installation_required?: boolean
  selected_installation?: { id: string; name: string; rate?: number; cost?: number } | null
  offset_specs?: {
    paper_gsm?: number | string | null
    color_mode?: string | null
    binding_type?: string | null
    numbering_required?: boolean | null
    numbering_range?: string | null
    ncr_parts?: number | null
    plates_count?: number | null
  } | null
  signage_specs?: {
    letter_height_inch?: number | null
    led_module_type?: string | null
    led_count?: number | null
    power_supply_watts?: number | null
    frame_structure?: string | null
    installation_type?: string | null
  } | null
  design_required?: boolean
  customer_approval_required?: boolean
  workflow_routing?: 'ready_product' | 'design_required' | 'design_ok' | 'ready_production' | 'outsource' | 'custom' | string
}

import {
  STANDARD_FINISHING_OPTIONS,
  STANDARD_ADD_ON_OPTIONS,
  getFinishingRate,
  getAddOnRate,
  type FinishingOptionItem,
  type AddOnOptionItem,
} from '@/lib/finishing-addons'

export {
  STANDARD_FINISHING_OPTIONS,
  STANDARD_ADD_ON_OPTIONS,
  getFinishingRate,
  getAddOnRate,
  type FinishingOptionItem,
  type AddOnOptionItem,
}

const UNIT_OPTIONS = [
  { value: 'sft', label: 'Square Feet (sft)', label_bn: 'বর্গফুট (স্কয়ার ফিট)' },
  { value: 'pcs', label: 'Pieces (pcs)', label_bn: 'পিস' },
  { value: 'piece', label: 'Piece', label_bn: 'পিস' },
  { value: 'set', label: 'Set', label_bn: 'সেট' },
  { value: 'rft', label: 'Running Feet (rft)', label_bn: 'রানিং ফিট' },
  { value: 'roll', label: 'Roll', label_bn: 'রোল' },
  { value: 'sheet', label: 'Sheet', label_bn: 'শীট' },
  { value: 'box', label: 'Box', label_bn: 'বক্স' },
  { value: 'pack', label: 'Pack', label_bn: 'প্যাক' },
  { value: 'pair', label: 'Pair', label_bn: 'জোড়া' },
  { value: 'carton', label: 'Carton', label_bn: 'কার্টুন' },
  { value: 'kg', label: 'Kilogram', label_bn: 'কেজি' },
  { value: 'sqin', label: 'Square Inch (sqin)', label_bn: 'বর্গইঞ্চি' },
]

export function detectProductKind(p: ProductRecord | any): 'ready_product' | 'material' | 'service' {
  if (!p) return 'service'
  if (isServiceProduct(p)) return 'service'
  if (isReadyProduct(p)) return 'ready_product'
  if (isMaterialProduct(p)) return 'material'
  return 'service'
}

interface CatalogComboboxProps {
  products: ProductRecord[]
  selectedProductId?: string
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

  const services = useMemo(() => filteredProducts.filter((p) => detectProductKind(p) === 'service'), [filteredProducts])
  const readyProducts = useMemo(() => filteredProducts.filter((p) => detectProductKind(p) === 'ready_product'), [filteredProducts])
  const materials = useMemo(() => filteredProducts.filter((p) => detectProductKind(p) === 'material'), [filteredProducts])

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
                {cust.customer_type || 'Retail'}
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

export function NewInvoiceModal({
  open,
  onOpenChange,
  preselectedCustomerId,
  preselectedCustomerType,
  preselectedWhatsappNumber,
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
  const router = useRouter()
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

  const isFromDesignWorkOrder = Boolean(preselectedDesignJobId || preselectedRequestId)

  // Document metadata
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('sales_invoice')
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank' | 'cheque' | 'other_mfs'>('cash')
  const [paymentMethodNote, setPaymentMethodNote] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'customer_pickup' | 'company_delivery' | 'courier'>('customer_pickup')
  const [notes, setNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [quotationId, setQuotationId] = useState<string | undefined>(preselectedQuotationId)
  const [salesOrderId, setSalesOrderId] = useState<string | undefined>(preselectedSalesOrderId)


  // Credit Limit Override
  const [creditOverrideReason, setCreditOverrideReason] = useState('')
  const [confirmCreditOverride, setConfirmCreditOverride] = useState(false)

  // Search suggestions dropdown across name, phone, company, email
  const [activeCustomerSearchField, setActiveCustomerSearchField] = useState<'name' | 'phone' | 'company' | 'email' | null>(null)
  const [searchResults, setSearchResults] = useState<CustomerRecord[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [isExistingCustomerSelected, setIsExistingCustomerSelected] = useState(false)

  // Items State (Default width and height are blank without prefilled 4 and 6)
  const [items, setItems] = useState<ItemRowState[]>([
    {
      id: `item-${Date.now()}-1`,
      productId: '',
      item_kind: 'service',
      workflow_routing: 'design_required',
      itemName: 'Pana Flex Banner Print',
      width: '',
      height: '',
      dimension_unit: 'ft',
      quantity: 1,
      unit: 'sft',
      base_rate: 22,
      rate: 22,
      finishing: 'None',
      finishing_rate: 0,
      add_on: 'None',
      add_on_rate: 0,
      rateSource: 'default',
      design_required: true,
      customer_approval_required: true,
      showAdvanced: false,
    },
  ])

  // Financials State
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [vatPercentage, setVatPercentage] = useState<number>(0)
  const [advanceAmount, setAdvanceAmount] = useState<number>(0)
  const [advancePercentage, setAdvancePercentage] = useState<number>(50)


  // Feedback & Action states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'save' | 'print' | 'send' | 'design' | null>(null)
  const [savedInvoice, setSavedInvoice] = useState<InvoiceRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [communicationStatus, setCommunicationStatus] = useState<{
    status: 'idle' | 'success' | 'failed'
    message: string
    channel?: string
    format?: string
  }>({ status: 'idle', message: '' })

  // Send Dropdown state & Customer Search Container Refs
  const [showSendMenu, setShowSendMenu] = useState(false)
  const sendMenuRef = useRef<HTMLDivElement>(null)
  const nameSearchRef = useRef<HTMLDivElement>(null)
  const phoneSearchRef = useRef<HTMLDivElement>(null)
  const companySearchRef = useRef<HTMLDivElement>(null)
  const emailSearchRef = useRef<HTMLDivElement>(null)

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
      const clickedInsideCustomerField =
        (nameSearchRef.current && nameSearchRef.current.contains(e.target as Node)) ||
        (phoneSearchRef.current && phoneSearchRef.current.contains(e.target as Node)) ||
        (companySearchRef.current && companySearchRef.current.contains(e.target as Node)) ||
        (emailSearchRef.current && emailSearchRef.current.contains(e.target as Node))

      if (!clickedInsideCustomerField) {
        setShowSuggestions(false)
        setActiveCustomerSearchField(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Auto-fill when preselected customer ID, sales order ID, or request details are provided
  useEffect(() => {
    if (open) {
      if (preselectedCustomerType) {
        setCustomerType(preselectedCustomerType)
      }
      if (preselectedWhatsappNumber) {
        setWhatsappNumber(preselectedWhatsappNumber)
      }
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
            if (preselectedCustomerType) setCustomerType(preselectedCustomerType)
            if (preselectedCustomerPhone) setPhoneNumber(preselectedCustomerPhone)
            if (preselectedWhatsappNumber) setWhatsappNumber(preselectedWhatsappNumber)
            if (preselectedCustomerAddress) setAddress(preselectedCustomerAddress)
            if (preselectedCompanyName) setCompanyName(preselectedCompanyName)
            if (preselectedCustomerEmail) setEmailAddress(preselectedCustomerEmail)
          }
        })
      } else if (preselectedCustomerName) {
        setCustomerName(preselectedCustomerName)
        if (preselectedCustomerType) setCustomerType(preselectedCustomerType)
        if (preselectedCustomerPhone) setPhoneNumber(preselectedCustomerPhone)
        if (preselectedWhatsappNumber) setWhatsappNumber(preselectedWhatsappNumber)
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

          const detectedKind = matchingProduct ? detectProductKind(matchingProduct) : undefined
          const isReady = it.item_kind === 'ready_product' || detectedKind === 'ready_product'
          const isMat = !isReady && (it.item_kind === 'material' || detectedKind === 'material')
          const isService = !isReady && !isMat

          // Strictly prioritize the rate filled on the order / invoice request
          const resolvedRate =
            (Number(it.rate) > 0 ? Number(it.rate) : undefined) ??
            (Number(it.unit_price) > 0 ? Number(it.unit_price) : undefined) ??
            (Number(matchingProduct?.selling_price) ||
              Number((matchingProduct as any)?.base_price) ||
              (isReady ? 50 : 25))

          const isDesignRequired = isFromDesignWorkOrder
            ? false
            : isService && Boolean(it.design_required)

          const workflowRoutingResolved = isReady
            ? 'ready_product'
            : isMat
            ? 'ready_production'
            : isFromDesignWorkOrder
            ? 'ready_production'
            : it.workflow_routing || (it.design_required ? 'design_required' : 'design_ok')

          return {
            id: `item-${Date.now()}-${idx + 1}`,
            productId: matchingProduct?.id || it.productId || it.product_id || '',
            item_kind: isReady ? 'ready_product' : isMat ? 'material' : 'service',
            product_type: matchingProduct?.product_type || it.product_type,
            itemName: it.itemName || it.item_name || matchingProduct?.name || (isReady ? 'Ready Display Product' : 'Printing Service Item'),
            dimensions_spec: it.dimensions_spec || (matchingProduct as any)?.dimensions_spec || (it.width && it.height ? `${it.width}×${it.height} ${it.dimension_unit || 'ft'}` : undefined),
            width: String(isReady || isMat ? '0' : (it.width !== undefined && it.width !== '' ? it.width : '4')),
            height: String(isReady || isMat ? '0' : (it.height !== undefined && it.height !== '' ? it.height : '6')),
            dimension_unit: isReady ? (it.unit || matchingProduct?.selling_unit || 'pcs') : (it.dimension_unit || (matchingProduct?.service_config?.default_unit as any) || 'ft'),
            quantity: Number(it.quantity) || 1,
            unit: it.unit || matchingProduct?.selling_unit || matchingProduct?.unit || (isReady ? 'pcs' : isMat ? 'roll' : 'sft'),
            rate: resolvedRate,
            finishing: isReady ? 'None' : (it.finishing || 'None'),
            finishing_rate: Number(it.finishing_rate) || (it.finishing && it.finishing !== 'None' ? getFinishingRate(it.finishing) : 0),
            add_on: isReady ? 'None' : (it.add_on || 'None'),
            add_on_rate: Number(it.add_on_rate) || (it.add_on && it.add_on !== 'None' ? getAddOnRate(it.add_on) : 0),
            rateSource: it.rate || it.unit_price ? 'custom' : matchingProduct ? 'default' : 'manual',
            available_dimension_presets:
              matchingProduct?.service_config?.dimension_presets ||
              (matchingProduct as any)?.dimension_presets ||
              [],
            available_finishing_options:
              matchingProduct?.service_config?.finishing_options ||
              (matchingProduct as any)?.finishing_options ||
              [],
            available_additional_options:
              matchingProduct?.service_config?.additional_options ||
              (matchingProduct as any)?.additional_options ||
              [],
            printable_material_name:
              it.material_spec ||
              it.printable_material_name ||
              matchingProduct?.service_config?.printable_material_name ||
              (matchingProduct as any)?.material_spec,
            design_required: isDesignRequired,
            customer_approval_required: !isFromDesignWorkOrder && isService && it.customer_approval_required !== false,
            workflow_routing: workflowRoutingResolved,
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
    preselectedCustomerType,
    preselectedWhatsappNumber,
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

  // Customer keyword search across name, phone, company, email
  useEffect(() => {
    if (!activeCustomerSearchField || isExistingCustomerSelected) {
      setSearchResults([])
      setShowSuggestions(false)
      return
    }

    let query = ''
    if (activeCustomerSearchField === 'name') query = customerName
    else if (activeCustomerSearchField === 'phone') query = phoneNumber
    else if (activeCustomerSearchField === 'company') query = companyName
    else if (activeCustomerSearchField === 'email') query = emailAddress

    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      setShowSuggestions(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await searchInvoiceCustomersAction(trimmed, company?.id)
        if (res.success && res.data && res.data.length > 0) {
          setSearchResults(res.data)
          setShowSuggestions(true)
          setCustomerHighlightedIndex(0)
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
  }, [
    activeCustomerSearchField,
    customerName,
    phoneNumber,
    companyName,
    emailAddress,
    isExistingCustomerSelected,
    company?.id,
  ])

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
    setActiveCustomerSearchField(null)
    setCustomerHighlightedIndex(0)
    setErrorMessage(null)

    // Real-time authoritative customer financial summary fetch
    getCustomerFinancialSummaryAction(cust.id, company?.id)
      .then((finRes) => {
        if (finRes.success && finRes.data) {
          const finData = finRes.data
          setSelectedCustomer((prev) =>
            prev && prev.id === cust.id
              ? {
                  ...prev,
                  total_due_balance: finData.totalDue,
                  credit_limit: finData.creditLimit ?? prev.credit_limit,
                }
              : prev
          )
        }
      })
      .catch(() => {})

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

  const handleCustomerFieldChange = (
    field: 'name' | 'phone' | 'company' | 'email',
    val: string
  ) => {
    if (field === 'name') setCustomerName(val)
    else if (field === 'phone') setPhoneNumber(val)
    else if (field === 'company') setCompanyName(val)
    else if (field === 'email') setEmailAddress(val)

    setActiveCustomerSearchField(field)
    setCustomerHighlightedIndex(0)

    if (isExistingCustomerSelected) {
      setIsExistingCustomerSelected(false)
      setSelectedCustomer(null)
      setCustomerId(undefined)
      setCustomerRates([])
    }
  }

  const handleCustomerKeyDown = (
    field: 'name' | 'phone' | 'company' | 'email',
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!showSuggestions || searchResults.length === 0) {
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
      setShowSuggestions(false)
      setActiveCustomerSearchField(null)
    }
  }

  // Categorized product catalog lists
  const readyProductsList = useMemo(() => {
    return products.filter((p) => detectProductKind(p) === 'ready_product')
  }, [products])

  const materialsList = useMemo(() => {
    return products.filter((p) => detectProductKind(p) === 'material')
  }, [products])

  const servicesList = useMemo(() => {
    return products.filter((p) => detectProductKind(p) === 'service')
  }, [products])

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
          available_additional_options: [],
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

      const itemKind = detectProductKind(prd)
      const isReady = itemKind === 'ready_product'
      const isMat = itemKind === 'material'
      const isService = itemKind === 'service'

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

      const additionalOptions =
        (prd.service_config as any)?.additional_options ||
        (prd as any).additional_options ||
        []

      const printableMaterial =
        prd.service_config?.printable_material_name ||
        prd.printable_material_name ||
        prd.material_spec

      const w = isReady || isMat ? '0' : (current.width || '')
      const h = isReady || isMat ? '0' : (current.height || '')
      const dimUnit = isReady ? (prd.selling_unit || prd.unit || 'pcs') : (current.dimension_unit || (prd.service_config?.default_unit as any) || 'ft')

      const prdUnit = isReady
        ? prd.selling_unit || prd.unit || (prd as any).unit_of_measure || 'pcs'
        : isMat
        ? prd.purchase_unit || prd.unit || 'roll'
        : prd.selling_unit || prd.unit || (prd as any).unit_of_measure || 'sft'

      const curFinishing = isReady ? 'None' : (current.finishing || 'None')
      const curAddOn = isReady ? 'None' : (current.add_on || 'None')
      const finishingRate = getFinishingRate(curFinishing, finishingOptions)
      const addOnRate = getAddOnRate(curAddOn, additionalOptions)
      const totalRate = effectiveRate + finishingRate + addOnRate

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
        base_rate: effectiveRate,
        finishing_rate: finishingRate,
        add_on_rate: addOnRate,
        rate: totalRate,
        rateSource: rateSrc,
        tier_applied: tierApplied,
        moq: prd.min_order_quantity || undefined,
        pcs_per_carton: (prd as any).pcs_per_carton || undefined,
        unit_cost: Number(prd.effective_unit_cost ?? prd.base_cost) || 0,
        isManualRate: false,
        workflow_routing: isReady ? 'ready_product' : isMat ? 'ready_production' : (current.workflow_routing || 'design_required'),
        design_required: isService,
        customer_approval_required: isService,
        available_dimension_presets: dimensionPresets,
        available_finishing_options: finishingOptions,
        available_additional_options: additionalOptions,
        printable_material_name: printableMaterial || undefined,
        finishing: curFinishing,
        add_on: curAddOn,
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
        workflow_routing: newKind === 'ready_product' ? 'ready_product' : 'design_required',
        design_required: newKind === 'service',
        customer_approval_required: newKind === 'service',
        width: newKind === 'service' ? (current.width && current.width !== '0' ? current.width : '') : '0',
        height: newKind === 'service' ? (current.height && current.height !== '0' ? current.height : '') : '0',
        unit: newKind === 'service' ? 'sft' : 'pcs',
        dimension_unit: newKind === 'service' ? 'ft' : 'pcs',
        finishing: newKind === 'ready_product' ? 'None' : (current.finishing || 'None'),
        add_on: newKind === 'ready_product' ? 'None' : (current.add_on || 'None'),
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

      if (field === 'finishing') {
        const fRate = getFinishingRate(value, current.available_finishing_options)
        current.finishing_rate = fRate
        const base = current.base_rate !== undefined ? current.base_rate : (Number(current.rate) - (current.finishing_rate || 0) - (current.add_on_rate || 0))
        current.base_rate = Math.max(0, base)
        current.rate = Math.max(0, current.base_rate + fRate + (current.add_on_rate || 0))
      } else if (field === 'add_on') {
        const aRate = getAddOnRate(value, current.available_additional_options)
        current.add_on_rate = aRate
        const base = current.base_rate !== undefined ? current.base_rate : (Number(current.rate) - (current.finishing_rate || 0) - (current.add_on_rate || 0))
        current.base_rate = Math.max(0, base)
        current.rate = Math.max(0, current.base_rate + (current.finishing_rate || 0) + aRate)
      } else if (field === 'rate') {
        current.isManualRate = true
        current.rateSource = 'manual'
        const fRate = current.finishing_rate || 0
        const aRate = current.add_on_rate || 0
        current.base_rate = Math.max(0, Number(value) - fRate - aRate)
      }

      next[index] = current
      return next
    })
  }

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        productId: '',
        item_kind: 'service',
        workflow_routing: 'design_required',
        itemName: '',
        width: '',
        height: '',
        dimension_unit: 'ft',
        quantity: 1,
        unit: 'sft',
        base_rate: 0,
        rate: 0,
        finishing: 'None',
        finishing_rate: 0,
        add_on: 'None',
        add_on_rate: 0,
        rateSource: 'custom',
        design_required: true,
        customer_approval_required: true,
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

    const payloadItems: CreateInvoiceItemInput[] = calculatedItems.map((it) => {
      const routing =
        it.workflow_routing ||
        (it.item_kind === 'ready_product'
          ? 'ready_product'
          : it.design_required === false
          ? 'design_ok'
          : 'design_required')

      return {
        product_id: it.productId || undefined,
        item_kind: it.item_kind || (it.width && it.height ? 'service' : 'ready_product'),
        product_type: it.product_type || undefined,
        category_preset: it.category_preset || undefined,
        item_name: it.itemName,
        description_bn: it.description_bn || undefined,
        material_spec: it.material_spec || undefined,
        dimensions_spec: it.dimensions_spec || undefined,
        width: Number(it.width) || undefined,
        height: Number(it.height) || undefined,
        dimension_unit: it.dimension_unit || undefined,
        area_sft: it.area ? Number(it.area.toFixed(2)) : undefined,
        quantity: Number(it.quantity) || 1,
        unit: it.unit,
        unit_price: Number(it.rate) || 0,
        rate_source: it.rateSource || 'default',
        tier_applied: it.tier_applied || undefined,
        moq: it.moq || undefined,
        unit_cost: it.unit_cost || undefined,
        finishing: it.finishing,
        add_on: it.add_on,
        add_on_rate: it.add_on_rate,
        artwork_required: Boolean(it.artwork_required),
        installation_required: Boolean(it.installation_required),
        offset_specs: it.offset_specs || undefined,
        signage_specs: it.signage_specs || undefined,
        design_required: routing === 'design_required',
        customer_approval_required: routing === 'design_required' && it.customer_approval_required !== false,
        workflow_routing: routing,
        total_price: it.lineTotal,
      }
    })

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
      customer_name_bn: (selectedCustomer as any)?.name_bn || undefined,
      customer_company: companyName.trim() || undefined,
      customer_phone: phoneNumber.trim(),
      customer_whatsapp: whatsappNumber.trim() || undefined,
      customer_address: address.trim(),
      customer_email: emailAddress.trim() || undefined,
      customer_bin: (selectedCustomer as any)?.bin_number || (selectedCustomer as any)?.bin || undefined,
      customer_tin: (selectedCustomer as any)?.tin_number || undefined,
      customer_type: customerType,
      invoice_type: invoiceType,
      invoice_date: invoiceDate,
      due_date: dueDate,
      discount_amount: Number(discountAmount) || 0,
      vat_percentage: Number(vatPercentage) || 0,
      advance_percentage: advancePercentage,
      advance_amount: effectiveAdvance,
      due_on_delivery: dueAmount,
      payment_method: paymentMethod,
      payment_method_note: paymentMethodNote.trim() || undefined,
      mushak_version: invoiceType === 'vat_invoice' ? '6.3' : undefined,
      reference_no: referenceNo.trim() || undefined,
      delivery_date: deliveryDate || undefined,
      delivery_location: deliveryLocation.trim() || undefined,
      delivery_method: deliveryMethod,
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
      try {
        const allInvs = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
        const filtered = allInvs.filter((i) => i.id !== result.data!.id)
        PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [result.data, ...filtered])
      } catch {}
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
      window.open(`/billing/${invoice.id}`, '_blank')
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Row 1: [Customer Name] [Phone Number] [Company Name] */}
            <div className="relative" ref={nameSearchRef}>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Type name to search or enter new..."
                  value={customerName}
                  onChange={(e) => handleCustomerFieldChange('name', e.target.value)}
                  onFocus={() => {
                    setActiveCustomerSearchField('name')
                    if (customerName.trim().length > 0 && !isExistingCustomerSelected) {
                      setShowSuggestions(true)
                    }
                  }}
                  onKeyDown={(e) => handleCustomerKeyDown('name', e)}
                  className="text-xs h-9 pr-8"
                  required
                />
              </div>

              {/* Suggestions */}
              {activeCustomerSearchField === 'name' && showSuggestions && searchResults.length > 0 && (
                <CustomerSuggestionsDropdown
                  results={searchResults}
                  highlightedIndex={customerHighlightedIndex}
                  onSelect={handleSelectCustomer}
                  onHover={setCustomerHighlightedIndex}
                />
              )}
            </div>

            <div className="relative" ref={phoneSearchRef}>
              <Label className="text-xs font-semibold mb-1 block">
                Phone Number <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="01XXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => handleCustomerFieldChange('phone', e.target.value)}
                  onFocus={() => {
                    setActiveCustomerSearchField('phone')
                    if (phoneNumber.trim().length > 0 && !isExistingCustomerSelected) {
                      setShowSuggestions(true)
                    }
                  }}
                  onKeyDown={(e) => handleCustomerKeyDown('phone', e)}
                  className="text-xs h-9 pr-8 font-mono"
                  required
                />
              </div>

              {/* Suggestions */}
              {activeCustomerSearchField === 'phone' && showSuggestions && searchResults.length > 0 && (
                <CustomerSuggestionsDropdown
                  results={searchResults}
                  highlightedIndex={customerHighlightedIndex}
                  onSelect={handleSelectCustomer}
                  onHover={setCustomerHighlightedIndex}
                />
              )}
            </div>

            <div className="relative" ref={companySearchRef}>
              <Label className="text-xs font-semibold mb-1 block">Company Name (Optional)</Label>
              <div className="relative">
                <Input
                  placeholder="Business / Organization"
                  value={companyName}
                  onChange={(e) => handleCustomerFieldChange('company', e.target.value)}
                  onFocus={() => {
                    setActiveCustomerSearchField('company')
                    if (companyName.trim().length > 0 && !isExistingCustomerSelected) {
                      setShowSuggestions(true)
                    }
                  }}
                  onKeyDown={(e) => handleCustomerKeyDown('company', e)}
                  className="text-xs h-9 pr-8"
                />
              </div>

              {/* Suggestions */}
              {activeCustomerSearchField === 'company' && showSuggestions && searchResults.length > 0 && (
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

            <div className="relative" ref={emailSearchRef}>
              <Label className="text-xs font-semibold mb-1 block">Email (for PDF Invoice)</Label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="client@domain.com"
                  value={emailAddress}
                  onChange={(e) => handleCustomerFieldChange('email', e.target.value)}
                  onFocus={() => {
                    setActiveCustomerSearchField('email')
                    if (emailAddress.trim().length > 0 && !isExistingCustomerSelected) {
                      setShowSuggestions(true)
                    }
                  }}
                  onKeyDown={(e) => handleCustomerKeyDown('email', e)}
                  className="text-xs h-9 pr-8"
                />
              </div>

              {/* Suggestions */}
              {activeCustomerSearchField === 'email' && showSuggestions && searchResults.length > 0 && (
                <CustomerSuggestionsDropdown
                  results={searchResults}
                  highlightedIndex={customerHighlightedIndex}
                  onSelect={handleSelectCustomer}
                  onHover={setCustomerHighlightedIndex}
                />
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Customer Type</Label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="retail">Retail / Walk-in (খুচরা)</option>
                <option value="corporate">Corporate (কর্পোরেট)</option>
                <option value="reseller">Reseller / Dealer (রিসেলার)</option>
                <option value="government">Government / Org (সরকারি)</option>
              </select>
            </div>
          </div>

          {/* Save Customer Checkbox */}
          {!isExistingCustomerSelected && (
            <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={saveCustomer}
                  onChange={(e) => setSaveCustomer(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>Save customer details to directory for future invoices</span>
              </label>
            </div>
          )}

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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Invoice Items & Specs
                </h3>
                <p className="text-[10px] text-slate-400">
                  Billing & Fulfillment: Supports Printing Services, Ready Products & Hardware, and Materials.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
              {items.length} Item{items.length > 1 ? 's' : ''}
            </Badge>
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
                      <CatalogItemCombobox
                        products={products}
                        selectedProductId={item.productId}
                        onSelectProduct={(pid) => handleProductSelect(index, pid)}
                        onCustomSelect={() => handleProductSelect(index, '')}
                      />
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

                  {/* SERVICE CONTROLS ([ Width ] [ Height ] [ Dim. Unit ] [ Qty ] [ Finishing ] [ Add on ] [ Rate ]) */}
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
                          value={item.width}
                          onChange={(e) => handleItemChange(index, 'width', e.target.value)}
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
                          value={item.height}
                          onChange={(e) => handleItemChange(index, 'height', e.target.value)}
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
                          <option value="ft">ft</option>
                          <option value="inch">inch</option>
                          <option value="m">m</option>
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
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value) || 1)}
                          className="text-xs h-9 font-mono font-bold w-full"
                          required
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
                          <option value="None">None (+৳0)</option>
                          {item.available_finishing_options && item.available_finishing_options.length > 0 ? (
                            item.available_finishing_options.map((f) => (
                              <option key={f.id} value={f.name}>
                                {f.name} {f.unit_price ? `(+৳${f.unit_price})` : ''}
                              </option>
                            ))
                          ) : (
                            STANDARD_FINISHING_OPTIONS.filter((f) => f.id !== 'none').map((f) => (
                              <option key={f.id} value={f.name}>
                                {f.name} (+৳{f.rate})
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
                          <option value="None">None (+৳0)</option>
                          {item.available_additional_options && item.available_additional_options.length > 0 ? (
                            item.available_additional_options.map((a) => (
                              <option key={a.id} value={a.name}>
                                {a.name} {a.unit_price ? `(+৳${a.unit_price})` : ''}
                              </option>
                            ))
                          ) : (
                            STANDARD_ADD_ON_OPTIONS.filter((a) => a.id !== 'none').map((a) => (
                              <option key={a.id} value={a.name}>
                                {a.name} (+৳{a.rate})
                              </option>
                            ))
                          )}
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
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value) || 0)}
                          className="text-xs h-9 font-mono font-bold text-blue-600 dark:text-blue-400 w-full"
                          required
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
                          <option value="piece">piece (পিস)</option>
                          <option value="set">set (সেট)</option>
                          <option value="box">box (বক্স)</option>
                          <option value="pack">pack (প্যাক)</option>
                          <option value="pair">pair (জোড়া)</option>
                          <option value="carton">carton (কার্টুন)</option>
                          <option value="kg">kg (কেজি)</option>
                          <option value="sheet">sheet (শিট)</option>
                          <option value="roll">roll (রোল)</option>
                          <option value="bag">bag (ব্যাগ)</option>
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
                        <Label className="text-[11px] font-semibold mb-1 block">Material Spec</Label>
                        <Input
                          placeholder="e.g. 280 GSM Frontlit"
                          value={item.dimensions_spec || ''}
                          onChange={(e) => handleItemChange(index, 'dimensions_spec', e.target.value)}
                          className="text-xs h-9"
                        />
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
                    </div>
                  )}

                  {/* Substrate / Printable Material pill for service */}
                  {isService && item.printable_material_name && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>Linked Substrate: <strong>{item.printable_material_name}</strong></span>
                    </div>
                  )}

                  {/* SERVICE DESIGN STATUS TOGGLE (Design Required vs Design OK or Pre-Press Verified) */}
                  {isService && (
                    isFromDesignWorkOrder || item.workflow_routing === 'ready_production' ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                              Pre-Press Verified (ডিজাইন যাচাই সম্পন্ন)
                            </span>
                            <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80 block">
                              Artwork is pre-press approved in Design Studio. Sent directly to Production Planning & Shop Floor.
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200"
                        >
                          🚀 Production Planning & Shop Floor Direct
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100/80 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Palette className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            Design Status:
                          </span>
                          <div className="inline-flex p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(index, 'workflow_routing', 'design_required')
                                handleItemChange(index, 'design_required', true)
                                handleItemChange(index, 'customer_approval_required', true)
                              }}
                              className={cn(
                                'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                                item.workflow_routing === 'design_required' || (item.design_required !== false && item.workflow_routing !== 'design_ok')
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                              )}
                            >
                              <span>🎨 Design Required</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(index, 'workflow_routing', 'design_ok')
                                handleItemChange(index, 'design_required', false)
                                handleItemChange(index, 'customer_approval_required', false)
                              }}
                              className={cn(
                                'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                                item.workflow_routing === 'design_ok' || item.design_required === false
                                  ? 'bg-cyan-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                              )}
                            >
                              <span>🔍 Design OK</span>
                            </button>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5',
                            item.workflow_routing === 'design_ok' || item.design_required === false
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300'
                          )}
                        >
                          {item.workflow_routing === 'design_ok' || item.design_required === false
                            ? 'Design Panel ➔ Tab: Design Check'
                            : 'Design Panel ➔ Tab: Design Request'}
                        </Badge>
                      </div>
                    )
                  )}

                  {/* Dedicated Domain Production Specs (Offset / Signage / Custom) */}
                  {(item.showAdvanced || isAdvancedMode || item.category_preset === 'offset_print' || item.category_preset === 'signage_fabrication') && (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs animate-in fade-in-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-blue-600" />
                          {item.category_preset === 'offset_print'
                            ? tBilingual('Offset Printing Specifications', 'অফসেট প্রিন্টিং বিবরণ')
                            : item.category_preset === 'signage_fabrication'
                            ? tBilingual('3D Signage & Lighting Specifications', '৩ডি সাইনেজ ও লাইটিং বিবরণ')
                            : tBilingual('Advanced Domain & Material Specs', 'অ্যাডভান্সড স্পেসিফিকেশন')}
                        </span>
                        {item.description_bn && (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {item.description_bn}
                          </span>
                        )}
                      </div>

                      {/* Offset Commercial Specific Inputs */}
                      {(item.category_preset === 'offset_print' || item.offset_specs) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200/80 dark:border-slate-800">
                          <div>
                            <Label className="text-[10px] font-semibold mb-1 block">Paper GSM (জিএসএম)</Label>
                            <select
                              value={item.offset_specs?.paper_gsm || ''}
                              onChange={(e) =>
                                handleItemChange(index, 'offset_specs', {
                                  ...(item.offset_specs || {}),
                                  paper_gsm: e.target.value,
                                })
                              }
                              className="w-full h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                            >
                              <option value="">Select GSM</option>
                              <option value="55">55 GSM (NCR Carbonless)</option>
                              <option value="70">70 GSM (Offset Paper)</option>
                              <option value="80">80 GSM (Executive Offset)</option>
                              <option value="100">100 GSM (White Offset)</option>
                              <option value="120">120 GSM (Art Paper)</option>
                              <option value="150">150 GSM (Art Paper)</option>
                              <option value="300">300 GSM (Art Card)</option>
                              <option value="350">350 GSM (Swedish Card)</option>
                            </select>
                          </div>

                          <div>
                            <Label className="text-[10px] font-semibold mb-1 block">Color Mode (রঙের মোড)</Label>
                            <select
                              value={item.offset_specs?.color_mode || ''}
                              onChange={(e) =>
                                handleItemChange(index, 'offset_specs', {
                                  ...(item.offset_specs || {}),
                                  color_mode: e.target.value,
                                })
                              }
                              className="w-full h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                            >
                              <option value="1/0 Single Color">1/0 Single Color (১ রঙ)</option>
                              <option value="2/0 Two Color">2/0 Two Color (২ রঙ)</option>
                              <option value="4/0 Single-side CMYK">4/0 Single-side 4-Color (একপাশে ৪ রঙ)</option>
                              <option value="4/4 Both-side CMYK">4/4 Both-side 4-Color (উভয়পাশে ৪ রঙ)</option>
                            </select>
                          </div>

                          <div>
                            <Label className="text-[10px] font-semibold mb-1 block">Binding / Packaging</Label>
                            <select
                              value={item.offset_specs?.binding_type || ''}
                              onChange={(e) =>
                                handleItemChange(index, 'offset_specs', {
                                  ...(item.offset_specs || {}),
                                  binding_type: e.target.value,
                                })
                              }
                              className="w-full h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                            >
                              <option value="Bundle Pack">Bundle Pack (বান্ডিল)</option>
                              <option value="Top Gumming">Top Gumming Pad (গাম প্যাড)</option>
                              <option value="Carbonless NCR Pad Binding">NCR Pad Binding (এনসিআর প্যাড)</option>
                              <option value="Saddle Stitch">Saddle Stitch / Staple (পিন বাইন্ডিং)</option>
                              <option value="Hard Binding">Hard Binding (বই বাইন্ডিং)</option>
                              <option value="Box Packaging">Box Packaging (বক্স প্যাকিং)</option>
                            </select>
                          </div>

                          <div>
                            <Label className="text-[10px] font-semibold mb-1 block">Numbering / NCR Part</Label>
                            <Input
                              placeholder="e.g. 0001 - 0500, 3-Part"
                              value={item.offset_specs?.numbering_range || ''}
                              onChange={(e) =>
                                handleItemChange(index, 'offset_specs', {
                                  ...(item.offset_specs || {}),
                                  numbering_range: e.target.value,
                                  numbering_required: Boolean(e.target.value.trim()),
                                })
                              }
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      )}

                      {/* 3D Signage Specific Inputs */}
                      {(item.category_preset === 'signage_fabrication' || item.signage_specs) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200/80 dark:border-slate-800">
                          <div>
                            <Label className="text-[10px] font-semibold mb-1 block">Letter Height (ইঞ্চি)</Label>
                            <Input
                              type="number"
                              placeholder="e.g. 12"
                              value={item.signage_specs?.letter_height_inch || ''}
                              onChange={(e) =>
                                handleItemChange(index, 'signage_specs', {
                                  ...(item.signage_specs || {}),
                                  letter_height_inch: Number(e.target.value) || 0,
                                })
                              }
                              className="text-xs h-8 font-mono"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-semibold mb-1 block">LED Module Type</Label>
                            <Input
                              placeholder="e.g. Korean 3-LED Module"
                              value={item.signage_specs?.led_module_type || ''}
                              onChange={(e) =>
                                handleItemChange(index, 'signage_specs', {
                                  ...(item.signage_specs || {}),
                                  led_module_type: e.target.value,
                                })
                              }
                              className="text-xs h-8"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-semibold mb-1 block">SMPS / Power Supply</Label>
                            <Input
                              placeholder="e.g. 12V 33A Waterproof SMPS"
                              value={item.signage_specs?.power_supply_watts ? `${item.signage_specs.power_supply_watts}W` : ''}
                              onChange={(e) =>
                                handleItemChange(index, 'signage_specs', {
                                  ...(item.signage_specs || {}),
                                  power_supply_watts: Number(e.target.value.replace(/[^0-9]/g, '')) || 0,
                                })
                              }
                              className="text-xs h-8"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-semibold mb-1 block">Frame Structure</Label>
                            <Input
                              placeholder="e.g. 1&quot; MS Pipe Sub-frame"
                              value={item.signage_specs?.frame_structure || ''}
                              onChange={(e) =>
                                handleItemChange(index, 'signage_specs', {
                                  ...(item.signage_specs || {}),
                                  frame_structure: e.target.value,
                                })
                              }
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      )}

                      {/* General Material & Cost Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[11px] font-semibold mb-1 block">Substrate Spec / Description</Label>
                          <Input
                            placeholder="e.g. 3mm Cast Acrylic Face + PVC Foam Return"
                            value={item.material_spec || item.dimensions_spec || ''}
                            onChange={(e) => {
                              handleItemChange(index, 'material_spec', e.target.value)
                              handleItemChange(index, 'dimensions_spec', e.target.value)
                            }}
                            className="text-xs h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-semibold mb-1 block">Item Internal Unit Cost (৳)</Label>
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

            {/* Add Item Button below item */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddItem}
                className="w-full h-9 text-xs font-bold gap-1.5 text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 hover:bg-blue-100/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 rounded-xl cursor-pointer shadow-2xs transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: FINANCIAL TOTALS & BANGLADESHI COMMERCIAL SETTLEMENT
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Financial Totals & Commercial Settlement (চালান ও পেমেন্ট)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Subtotal (মোট বিল)</Label>
              <div className="h-9 px-3 flex items-center bg-slate-100 dark:bg-slate-800 rounded-md font-mono font-bold text-slate-900 dark:text-white">
                {formatBDT(subtotal)}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Discount (ছাড় ৳)</Label>
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
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold block">NBR VAT (ভ্যাট %)</Label>
                <div className="flex items-center gap-1">
                  {[0, 5, 7.5, 15].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setVatPercentage(rate)}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all',
                        vatPercentage === rate
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      )}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
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
              <Label className="text-xs font-semibold mb-1 block">Grand Total (সর্বমোট বিল)</Label>
              <div className="h-9 px-3 flex items-center bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md font-mono font-black text-blue-700 dark:text-blue-300 text-sm">
                {formatBDT(grandTotal)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold block">Advance Paid (অগ্রিম ৳)</Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancePercentage(50)
                      setAdvanceAmount(Math.round(grandTotal * 0.5))
                    }}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 cursor-pointer"
                  >
                    ৫০%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancePercentage(100)
                      setAdvanceAmount(grandTotal)
                    }}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 cursor-pointer"
                  >
                    ১০০%
                  </button>
                </div>
              </div>
              <Input
                type="number"
                value={advanceAmount || ''}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0)
                  setAdvanceAmount(val)
                  if (grandTotal > 0) {
                    setAdvancePercentage(Math.round((val / grandTotal) * 100))
                  }
                }}
                className="h-9 text-xs font-mono font-bold"
                placeholder="0.00"
                min={0}
                max={grandTotal}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Balance Due (ডেলিভারিতে বাকি)</Label>
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
              <Label className="text-xs font-semibold mb-1 block">Payment Method (পরিশোধ মাধ্যম)</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="cash">Cash Counter (ক্যাশ কাউন্টার)</option>
                <option value="bkash">bKash Merchant (বিকাশ)</option>
                <option value="nagad">Nagad Wallet (নগদ)</option>
                <option value="bank">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                <option value="cheque">Bank Cheque (ব্যাংক চেক)</option>
                <option value="other_mfs">Other MFS (অন্যান্য)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Due Date (পরিশোধের শেষ তারিখ)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Additional Commercial Details (Reference, Delivery & Payment Notes) */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <Label className="text-[11px] font-semibold mb-1 block">Ref / Customer PO No. (রেফারেন্স)</Label>
              <Input
                placeholder="e.g. PO-2026-9812 / Work Order Ref"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="h-9 text-xs font-medium"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold mb-1 block">Payment Note / Trx ID (ট্রানজেকশন তথ্য)</Label>
              <Input
                placeholder="e.g. bKash TrxID: 9X29A887B / Cheque No: 48912"
                value={paymentMethodNote}
                onChange={(e) => setPaymentMethodNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold mb-1 block">Delivery Date & Location (ডেলিভারি)</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="h-9 text-xs"
                />
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as any)}
                  className="h-9 px-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value="customer_pickup">কাস্টমার পিকআপ</option>
                  <option value="company_delivery">কোম্পানি ডেলিভারি</option>
                  <option value="courier">সুন্দরবন / এসএ পরিবহন</option>
                </select>
              </div>
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

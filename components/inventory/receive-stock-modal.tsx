'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import type { PurchaseOrderRecord, PurchaseOrderItemRecord } from '@/types/purchase.types'
import type { ProductRecord } from '@/types/product.types'
import { SupplierRecord } from '@/types/crm.types'
import { receiveStockAction, getMaterialsAction, getPriceIntelligenceAction } from '@/actions/inventory.actions'
import { receiveGoodsAction } from '@/actions/purchase.actions'
import { updateProductPriceAction, getProductsAction } from '@/actions/product.actions'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { isMaterialProduct, isReadyProduct, isServiceProduct, isOutsourceProduct } from '@/lib/units'
import { PriceIntelligenceEngine } from '@/lib/domain/price-intelligence-engine'
import { PriceIntelligenceCard } from '@/components/inventory/price-intelligence-card'
import type { ConfiguredMaterialSize, PriceIntelligenceSummary, PriceIntelligenceRecord } from '@/types/price-intelligence.types'
import {
  Truck,
  Package,
  ShieldCheck,
  AlertCircle,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Building,
  Layers,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
  Hash,
  Barcode,
  CheckCheck,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Percent,
  ArrowRight,
  Tag,
  Info,
  Layers3,
  Ruler,
  Droplets,
  Box,
  Wrench,
  Disc,
} from 'lucide-react'
import { formatBDT } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export type MasterPhysicalForm =
  | 'roll'       // Large format rolls (Flex, Vinyl, Canvas, Backlit, Lamination, Banner)
  | 'sheet'      // Rigid sheets & offset boards (PVC, Acrylic, ACP, Foam board, Art card, Swedish board)
  | 'liquid'     // Inks, solvents, chemicals, adhesives (Bottles, Cans, Gallons, Liters)
  | 'hardware'   // Display hardware, merchandise, fasteners (X-Stands, Roll-ups, Pop-ups, Frames, Grommets, LEDs)
  | 'box_pack'   // Boxed goods, packaged accessories, bulk packs
  | 'weight'     // Materials bought by weight (KG, ton)
  | 'piece'      // Discrete pieces, eyelets, stands
  | 'general'    // General physical inventory items

export interface ReceiveStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  products?: ProductRecord[]
  locations: InventoryLocationRecord[]
  orders?: PurchaseOrderRecord[]
  purchaseOrder?: PurchaseOrderRecord | null
  selectedMaterialId?: string
  onSuccess?: () => void
  companyId?: string
}

export interface ItemReceiveRow {
  po_item_id: string
  material_id: string
  material_name: string
  unit: string
  physical_form?: MasterPhysicalForm
  unit_cost: number // Inward purchase rate from PO
  previous_cost: number
  previous_selling_price: number
  new_selling_price: number
  target_margin_percent: number
  update_master_pricing: boolean
  quantity_ordered: number
  quantity_received: number
  quantity_remaining: number
  accepted_quantity: number
  rejected_quantity: number
  damaged_quantity: number
  batch_lot_number: string
  roll_width_ft?: number
  roll_length_ft?: number
}

export interface DirectReceiptItemRow {
  id: string
  material_id: string // Material ID or Product ID or composite variant ID
  parent_id?: string // Underlying base material or product ID
  variant_id?: string
  variant_name?: string
  material_name: string
  sku: string
  unit: string
  master_unit: string
  master_purchase_unit?: string
  available_purchase_units: string[]
  physical_form: MasterPhysicalForm
  item_type: 'material' | 'product'
  category: string
  // Cost & price intelligence
  previous_cost: number
  unit_cost: number // New inward purchase cost
  cost_variance_percent: number
  previous_selling_price: number
  new_selling_price: number // Suggested / edited selling price
  target_margin_percent: number
  update_master_pricing: boolean
  // Intake quantities & lot
  quantity: number
  batch_lot_number: string
  total_cost: number
  // Sizing & variety properties with discrete economics
  is_roll?: boolean
  roll_width_ft?: number | null
  roll_length_ft?: number | null
  roll_area_sft?: number | null
  sheet_size?: string | null
  sheet_area_sft?: number | null
  thickness_mm?: number | null
  available_widths_ft?: number[]
  available_sheet_sizes?: string[]
  configured_sizes?: ConfiguredMaterialSize[]
  selected_size_id?: string
  price_intelligence_summary?: PriceIntelligenceSummary | null
  variants?: any[]
  size_spec?: string | null
  liquid_volume_capacity?: string | null
  pack_quantity?: number | null
  roll_sizes?: any[]
  material_config?: any
  purchase_price_per_sft?: number | null
  production_width_allowance?: number | null
  nominal_width_ft?: number | null
  allowance_ft?: number | null
  gsm?: number | null
  finishing?: string | null
}

export interface UnifiedStockItem {
  id: string
  parent_id?: string
  variant_id?: string
  variant_name?: string
  sku: string
  name: string
  item_type: 'material' | 'product'
  category: string
  category_group: string
  unit: string
  master_unit: string
  master_purchase_unit?: string
  available_purchase_units: string[]
  physical_form: MasterPhysicalForm
  current_stock: number
  previous_cost: number
  previous_selling_price: number
  target_margin_percent: number
  is_variant?: boolean
  is_roll?: boolean
  roll_width_ft?: number | null
  roll_length_ft?: number | null
  roll_area_sft?: number | null
  sheet_size?: string | null
  sheet_area_sft?: number | null
  thickness_mm?: number | null
  available_widths_ft?: number[]
  available_sheet_sizes?: string[]
  variants?: any[]
  size_spec?: string | null
  liquid_volume_capacity?: string | null
  pack_quantity?: number | null
  roll_sizes?: any[]
  material_config?: any
  purchase_price_per_sft?: number | null
  production_width_allowance?: number | null
  allowance_ft?: number | null
  gsm?: number | null
  finishing?: string | null
}

export function detectPhysicalForm(item: {
  category?: string
  name?: string
  unit?: string
  purchase_unit?: string
  is_roll?: boolean
  available_widths_ft?: number[]
  available_sheet_sizes?: any[]
  product_type?: string
  entity_type?: string
  thickness?: string
  variants?: any[]
  material_config?: any
}): MasterPhysicalForm {
  return PriceIntelligenceEngine.detectMaterialPhysicalForm(item) as MasterPhysicalForm
}

export function getAvailablePurchaseUnits(
  form: MasterPhysicalForm,
  masterUnit: string,
  masterPurchaseUnit?: string
): string[] {
  const units = new Set<string>()
  if (masterUnit) units.add(masterUnit.toLowerCase())
  if (masterPurchaseUnit) units.add(masterPurchaseUnit.toLowerCase())

  switch (form) {
    case 'roll':
      units.add('roll')
      units.add('sft')
      units.add('meter')
      units.add('rft')
      break
    case 'sheet':
      units.add('sheet')
      units.add('sft')
      units.add('bundle')
      units.add('box')
      units.add('pcs')
      break
    case 'liquid':
      units.add('bottle')
      units.add('can')
      units.add('ltr')
      units.add('gallon')
      units.add('ml')
      break
    case 'hardware':
    case 'piece':
      units.add('pcs')
      units.add('piece')
      units.add('box')
      units.add('pack')
      units.add('set')
      units.add('pair')
      break
    case 'box_pack':
      units.add('box')
      units.add('pack')
      units.add('pcs')
      units.add('piece')
      units.add('bundle')
      break
    case 'weight':
      units.add('kg')
      units.add('box')
      units.add('bag')
      units.add('ton')
      units.add('pcs')
      break
    default:
      units.add('pcs')
      units.add('piece')
      units.add('box')
      units.add('set')
      break
  }

  return Array.from(units)
}

export function getPhysicalFormBadge(form: MasterPhysicalForm) {
  switch (form) {
    case 'roll':
      return {
        label: 'Roll Media',
        labelBn: 'রোল মিডিয়া',
        icon: Disc,
        badgeStyle: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
      }
    case 'sheet':
      return {
        label: 'Rigid Sheet',
        labelBn: 'রিজিড শিট',
        icon: Layers,
        badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      }
    case 'liquid':
      return {
        label: 'Inks & Chemistry',
        labelBn: 'কালি ও কেমিক্যাল',
        icon: Droplets,
        badgeStyle: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      }
    case 'hardware':
      return {
        label: 'Display Hardware',
        labelBn: 'ডিসপ্লে হার্ডওয়্যার',
        icon: Wrench,
        badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      }
    case 'piece':
      return {
        label: 'Piece Item',
        labelBn: 'পিস আইটেম',
        icon: Package,
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      }
    case 'box_pack':
      return {
        label: 'Boxed / Pack',
        labelBn: 'প্যাকেট ও বক্স',
        icon: Box,
        badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
      }
    case 'weight':
      return {
        label: 'Weight / Mass',
        labelBn: 'ওজন ভিত্তিক',
        icon: Ruler,
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      }
    default:
      return {
        label: 'Inventory Item',
        labelBn: 'ইনভেন্টরি আইটেম',
        icon: Package,
        badgeStyle: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      }
  }
}

export function ReceiveStockModal({
  open,
  onOpenChange,
  materials = [],
  products: initialProducts = [],
  locations = [],
  orders = [],
  purchaseOrder,
  selectedMaterialId,
  onSuccess,
  companyId,
}: ReceiveStockModalProps) {
  const { tBilingual } = useI18n()

  // Mode selection: 'po' (Purchase Order GRN), 'direct' (Direct Spot Purchase), or 'opening' (Opening Balance)
  const [mode, setMode] = useState<'po' | 'direct' | 'opening'>('direct')
  const [selectedPoId, setSelectedPoId] = useState<string>('')

  // Catalog materials & products state
  const [catalogMaterials, setCatalogMaterials] = useState<MaterialRecord[]>(materials)
  const [catalogProducts, setCatalogProducts] = useState<ProductRecord[]>(initialProducts)

  // Keep catalogMaterials synced with materials prop
  useEffect(() => {
    if (materials && materials.length > 0) {
      setCatalogMaterials(materials)
    }
  }, [materials])

  // Suppliers list for direct receipts
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [customSupplierName, setCustomSupplierName] = useState<string>('')

  // Common Header & Logistics
  const [locationId, setLocationId] = useState<string>(locations[0]?.id || '')
  const [receivedDate, setReceivedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [challanNumber, setChallanNumber] = useState('')
  const [supplierDeliveryNote, setSupplierDeliveryNote] = useState('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [notes, setNotes] = useState('')

  // PO-based receiving state
  const [poReceiveRows, setPoReceiveRows] = useState<ItemReceiveRow[]>([])

  // Direct receiving multi-item state
  const [directItems, setDirectItems] = useState<DirectReceiptItemRow[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load products & suppliers & materials from store/server
  useEffect(() => {
    if (open) {
      const supList = PrintERPDataStore.getAll<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, companyId) || []
      setSuppliers(supList)

      let prods = initialProducts
      if (!prods || prods.length === 0) {
        prods = PrintERPDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, companyId) || []
      }
      setCatalogProducts(prods)

      let mats = materials
      if (!mats || mats.length === 0) {
        mats = PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || []
        if (mats.length > 0) setCatalogMaterials(mats)
      }

      // Background fetch products from server if needed
      getProductsAction(companyId, false)
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setCatalogProducts(res.data)
          }
        })
        .catch(() => {})

      // Background fetch materials from server if needed
      getMaterialsAction(companyId)
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setCatalogMaterials(res.data)
          }
        })
        .catch(() => {})
    }
  }, [open, initialProducts, materials, companyId])

  // Real-time dynamic sync: auto-refresh catalog whenever materials or products change
  useEffect(() => {
    const handleRealtimeSync = () => {
      const mats = PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || []
      const prods = PrintERPDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, companyId) || []
      if (mats.length > 0) setCatalogMaterials(mats)
      if (prods.length > 0) setCatalogProducts(prods)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:materials', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:products', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('materials_updated', handleRealtimeSync)
      window.addEventListener('products_updated', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)

      return () => {
        window.removeEventListener('printerp_table_synced:materials', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:products', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('materials_updated', handleRealtimeSync)
        window.removeEventListener('products_updated', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [companyId])

  // Build unified items catalog merging materials and registered products with expanded size & variety options
  const unifiedCatalog = useMemo<UnifiedStockItem[]>(() => {
    const list: UnifiedStockItem[] = []
    const seenIds = new Set<string>()
    const seenSkus = new Set<string>()

    const processItem = (
      rawId: string,
      sku: string,
      name: string,
      isMat: boolean,
      cat: string,
      unit: string,
      cost: number,
      sellPrice: number,
      targetMargin: number,
      currentStock: number,
      variants?: any[],
      available_widths_ft?: number[],
      standard_roll_length_ft?: number,
      available_sheet_sizes?: any[],
      roll_width_ft?: number | null,
      roll_length_ft?: number | null,
      thickness_mm?: number | null,
      purchase_unit?: string,
      dimensions_spec?: string | null,
      liquid_volume_capacity?: string | null,
      pack_quantity?: number | null,
      product_type?: string,
      entity_type?: string,
      roll_sizes?: any[],
      material_config?: any,
      purchase_price_per_sft?: number | null,
      production_width_allowance?: number | null,
      gsm?: number | null,
      finishing?: string | null
    ) => {
      const catLower = (cat + ' ' + name).toLowerCase()
      let catGroup = isMat ? 'Raw Materials & Substrates' : 'Ready Merchandise & Display Hardware'

      const physicalForm = detectPhysicalForm({
        category: cat,
        name: name,
        unit: unit,
        purchase_unit: purchase_unit,
        is_roll: Boolean(roll_width_ft || (available_widths_ft && available_widths_ft.length > 0) || (roll_sizes && roll_sizes.length > 0)),
        available_widths_ft: available_widths_ft,
        available_sheet_sizes: available_sheet_sizes,
        product_type: product_type,
        entity_type: entity_type,
        variants: variants,
        material_config: material_config,
      })

      const isRoll = physicalForm === 'roll'
      const isSheet = physicalForm === 'sheet'

      if (isMat) {
        if (physicalForm === 'roll') {
          catGroup = 'Digital & Large Format Media'
        } else if (physicalForm === 'sheet') {
          catGroup = '3D Signage & Structural Media'
        } else if (physicalForm === 'liquid') {
          catGroup = 'Inks & Finishing Consumables'
        } else if (catLower.includes('paper') || catLower.includes('art card') || catLower.includes('offset') || catLower.includes('card')) {
          catGroup = 'Paper & Offset Sheets'
        }
      } else {
        if (physicalForm === 'hardware' || physicalForm === 'box_pack') {
          catGroup = 'Ready Merchandise & Display Hardware'
        } else {
          catGroup = 'Commercial Ready Products'
        }
      }

      const rollLength = Number(standard_roll_length_ft || roll_length_ft || 164)
      const widths = (available_widths_ft && available_widths_ft.length > 0)
        ? available_widths_ft
        : (roll_width_ft ? [Number(roll_width_ft)] : undefined)

      const sheets: string[] | undefined = (available_sheet_sizes && available_sheet_sizes.length > 0)
        ? available_sheet_sizes.map((s: any) =>
            typeof s === 'string'
              ? s
              : s && typeof s === 'object' && s.label
              ? s.label
              : s && typeof s === 'object' && s.width && s.length
              ? `${s.width}x${s.length} ft`
              : String(s)
          )
        : undefined

      const vars = variants && Array.isArray(variants) ? variants : []
      const defaultWidth = roll_width_ft || (widths && widths.length > 0 ? widths[0] : (isRoll ? 5 : null))
      const defaultRollArea = defaultWidth ? Math.round(defaultWidth * rollLength) : (isRoll ? 820 : null)

      const rawPurchaseUnit = purchase_unit || (material_config as any)?.purchase_unit
      let computedPurchaseUnit: string
      if (physicalForm === 'roll') {
        computedPurchaseUnit = (rawPurchaseUnit && !['sft', 'sqft', 'sq.ft', 'sq_ft'].includes(rawPurchaseUnit.toLowerCase())) ? rawPurchaseUnit : 'roll'
      } else if (physicalForm === 'sheet') {
        computedPurchaseUnit = (rawPurchaseUnit && !['sft', 'sqft', 'sq.ft', 'sq_ft'].includes(rawPurchaseUnit.toLowerCase())) ? rawPurchaseUnit : 'sheet'
      } else if (physicalForm === 'liquid') {
        const cand = (rawPurchaseUnit || unit || '').toLowerCase()
        computedPurchaseUnit = ['ltr', 'liter', 'litre', 'bottle', 'can', 'gallon', 'ml'].includes(cand) ? cand : 'liter'
      } else if (physicalForm === 'hardware' || physicalForm === 'piece') {
        computedPurchaseUnit = rawPurchaseUnit || 'piece'
      } else {
        computedPurchaseUnit = rawPurchaseUnit || unit || 'pcs'
      }

      const availablePurchaseUnits = getAvailablePurchaseUnits(physicalForm, unit, computedPurchaseUnit)

      const activeSizesForCost = PriceIntelligenceEngine.getMaterialActiveSizes({
        physical_form: physicalForm,
        roll_sizes: roll_sizes || (material_config as any)?.roll_sizes,
        material_config: material_config,
        available_widths_ft: widths,
        roll_width_ft: defaultWidth,
        roll_length_ft: isRoll ? rollLength : null,
        purchase_price_per_sft: purchase_price_per_sft ?? (material_config as any)?.purchase_price_per_sft,
        production_width_allowance: production_width_allowance ?? (material_config as any)?.extra_width_allowance_ft ?? (material_config as any)?.production_width_allowance,
        average_cost: cost,
        unit: unit,
        purchase_unit: computedPurchaseUnit,
      })
      const primaryActiveSize = activeSizesForCost[0]
      const effectivePrevCost = (isRoll && primaryActiveSize?.default_supplier_price)
        ? primaryActiveSize.default_supplier_price
        : (isSheet && primaryActiveSize?.default_supplier_price)
        ? primaryActiveSize.default_supplier_price
        : cost

      // Strictly register the single registered master item from Products & Commercial Masters
      list.push({
        id: rawId,
        parent_id: rawId,
        sku: sku || (isMat ? 'MAT' : 'PRD'),
        name: name,
        item_type: isMat ? 'material' : 'product',
        category: cat,
        category_group: catGroup,
        unit: unit || 'pcs',
        master_unit: unit || 'pcs',
        master_purchase_unit: computedPurchaseUnit,
        available_purchase_units: availablePurchaseUnits,
        physical_form: physicalForm,
        current_stock: currentStock,
        previous_cost: effectivePrevCost,
        previous_selling_price: sellPrice > 0 ? sellPrice : Math.round(effectivePrevCost * 1.35),
        target_margin_percent: targetMargin,
        is_roll: isRoll,
        roll_width_ft: defaultWidth,
        roll_length_ft: isRoll ? rollLength : null,
        roll_area_sft: defaultRollArea,
        available_widths_ft: widths,
        available_sheet_sizes: sheets,
        variants: vars,
        thickness_mm: thickness_mm || null,
        size_spec: dimensions_spec || null,
        liquid_volume_capacity: liquid_volume_capacity || null,
        pack_quantity: pack_quantity || null,
        roll_sizes: roll_sizes || (material_config as any)?.roll_sizes,
        material_config: material_config,
        purchase_price_per_sft: purchase_price_per_sft ?? (material_config as any)?.purchase_price_per_sft,
        production_width_allowance: production_width_allowance ?? (material_config as any)?.extra_width_allowance_ft ?? (material_config as any)?.production_width_allowance,
        allowance_ft: production_width_allowance ?? (material_config as any)?.extra_width_allowance_ft ?? null,
        gsm: gsm ?? (material_config as any)?.gsm ?? null,
        finishing: finishing ?? (material_config as any)?.finishing ?? (material_config as any)?.default_finishing ?? null,
      })
    }

    // 1. Process Materials (Raw Materials & Substrates)
    for (const m of catalogMaterials) {
      if (!m || !m.id) continue
      seenIds.add(m.id)
      if (m.sku) seenSkus.add(m.sku.toLowerCase())

      const matchProd =
        catalogProducts.find((p) => p.id === m.id || (p.sku && m.sku && p.sku.toLowerCase() === m.sku.toLowerCase())) ||
        (PrintERPDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, companyId) || []).find((p) => p.id === m.id || (p.sku && m.sku && p.sku.toLowerCase() === m.sku.toLowerCase()))

      const rollSizes = m.roll_sizes || (m as any).material_config?.roll_sizes || matchProd?.roll_sizes || (matchProd?.material_config as any)?.roll_sizes || (matchProd?.pricing_formula as any)?.roll_sizes || (matchProd?.pricing_formula as any)?.material_config?.roll_sizes
      const matConfig = (m as any).material_config || matchProd?.material_config || (matchProd?.pricing_formula as any)?.material_config
      const perSftCost = m.purchase_price_per_sft ?? (m as any).material_config?.purchase_price_per_sft ?? (matchProd?.material_config as any)?.purchase_price_per_sft ?? (matchProd?.pricing_formula as any)?.purchase_price_per_sft ?? (matchProd?.pricing_formula as any)?.material_config?.purchase_price_per_sft
      const allowance = m.production_width_allowance ?? (m as any).material_config?.extra_width_allowance_ft ?? (matchProd?.material_config as any)?.extra_width_allowance_ft ?? matchProd?.production_width_allowance ?? (matchProd?.pricing_formula as any)?.production_width_allowance ?? (matchProd?.pricing_formula as any)?.material_config?.extra_width_allowance_ft ?? 0
      const availableWidths = m.available_widths_ft || (m as any).material_config?.available_widths_ft || matchProd?.available_widths_ft || (matchProd?.material_config as any)?.available_widths_ft
      const stdRollLength = m.standard_roll_length_ft || (m as any).material_config?.standard_roll_length_ft || matchProd?.standard_roll_length_ft || (matchProd?.material_config as any)?.standard_roll_length_ft
      const sheetSizes = m.available_sheet_sizes || (m as any).material_config?.available_sheet_sizes || matchProd?.available_sheet_sizes || (matchProd?.material_config as any)?.available_sheet_sizes
      const purchaseUnit = (m as any).purchase_unit || (m as any).material_config?.purchase_unit || matchProd?.purchase_unit || (matchProd?.material_config as any)?.purchase_unit || m.unit

      const cost = Number(m.average_cost || m.last_purchase_price || m.cost_per_unit || matchProd?.purchase_price || matchProd?.base_cost || 0)
      const estimatedSellingPrice = Math.round(Number(matchProd?.selling_price || (cost > 0 ? cost * 1.35 : 0)))
      const cat = m.category || matchProd?.category || 'General Substrates'
      const thicknessNum = m.thickness ? Number(m.thickness.replace(/[^0-9.]/g, '')) : (matchProd as any)?.thickness_mm ? Number((matchProd as any).thickness_mm) : null

      processItem(
        m.id,
        m.sku || matchProd?.sku || 'MAT',
        m.name || matchProd?.name || 'Material',
        true,
        cat,
        m.unit || matchProd?.unit || 'pcs',
        cost,
        estimatedSellingPrice,
        Number(matchProd?.target_margin_percentage || 35),
        Number(m.current_stock || (matchProd as any)?.current_stock || 0),
        m.variants || matchProd?.variants,
        availableWidths,
        stdRollLength,
        sheetSizes,
        m.roll_width_ft || matchProd?.roll_width_ft,
        m.roll_length_ft || matchProd?.roll_length_ft,
        thicknessNum,
        purchaseUnit,
        (m as any).dimensions_spec || (m as any).size_spec || matchProd?.dimensions_spec,
        (m as any).liquid_volume_capacity || (matchProd as any)?.liquid_volume_capacity,
        (m as any).pack_quantity || (matchProd as any)?.pack_quantity,
        (m as any).product_type || matchProd?.product_type,
        'material',
        rollSizes,
        matConfig,
        perSftCost,
        allowance,
        m.gsm ?? (matchProd as any)?.gsm ?? (matConfig as any)?.gsm ?? null,
        m.default_finishing ?? (m as any)?.finishing ?? (matchProd as any)?.finishing ?? (matConfig as any)?.finishing ?? null
      )
    }

    // 2. Process Catalog Products (Raw Materials & Ready Merchandise)
    for (const p of catalogProducts) {
      if (!p || !p.id) continue
      if (seenIds.has(p.id)) continue
      if (p.sku && seenSkus.has(p.sku.toLowerCase())) continue

      const isNonInventory =
        p.is_service ||
        p.is_outsource ||
        p.is_non_inventory ||
        p.product_type === 'service' ||
        p.product_type === 'SERVICE' ||
        p.product_type === 'print_service' ||
        p.product_type === 'fabrication' ||
        p.product_type === 'fabrication_service' ||
        p.product_type === 'finishing' ||
        p.product_type === 'installation' ||
        p.product_type === 'installation_service' ||
        p.product_type === 'delivery' ||
        p.product_type === 'outsource' ||
        p.product_type === 'outsource_product' ||
        p.product_type === 'custom_job' ||
        isServiceProduct(p) ||
        isOutsourceProduct(p)

      if (isNonInventory) continue

      const isMat = Boolean(
        isMaterialProduct(p) ||
        p.entity_type === 'material' ||
        p.product_type === 'material' ||
        (p.product_type as any) === 'raw_material' ||
        p.commercial_type === 'material' ||
        ['materials', 'roll_media', 'rigid_sheets', 'inks', 'raw_materials'].includes(p.category || '') ||
        (p.sku && (p.sku.startsWith('MAT-') || p.sku.startsWith('RM-')))
      )

      seenIds.add(p.id)
      if (p.sku) seenSkus.add(p.sku.toLowerCase())

      const cost = Number(p.purchase_price || p.base_cost || 0)
      const sellPrice = Number(p.selling_price || 0)
      let margin = Number(p.target_margin_percentage || 0)
      if (margin <= 0 && sellPrice > cost && sellPrice > 0) {
        margin = Math.round(((sellPrice - cost) / sellPrice) * 100)
      }
      if (margin <= 0) margin = 35

      const cat = p.category || (isMat ? 'Raw Material' : 'Ready Product')
      const thicknessNum = (p as any).thickness_mm ? Number((p as any).thickness_mm) : ((p as any).thickness ? Number(String((p as any).thickness).replace(/[^0-9.]/g, '')) : null)

      processItem(
        p.id,
        p.sku || (isMat ? 'MAT' : 'RP'),
        p.name,
        isMat,
        cat,
        String(p.unit || p.selling_unit || 'pcs'),
        cost,
        sellPrice,
        margin,
        Number((p as any).current_stock ?? (p as any).stock ?? 0),
        p.variants,
        p.available_widths_ft,
        p.standard_roll_length_ft,
        p.available_sheet_sizes,
        p.roll_width_ft,
        p.roll_length_ft,
        thicknessNum,
        p.purchase_unit || p.unit,
        p.dimensions_spec,
        (p as any).liquid_volume_capacity,
        (p as any).pack_quantity || p.min_order_quantity,
        p.product_type,
        (p as any).roll_sizes || (p as any).material_config?.roll_sizes,
        (p as any).material_config,
        (p as any).purchase_price_per_sft || (p as any).material_config?.purchase_price_per_sft,
        (p as any).production_width_allowance || (p as any).material_config?.extra_width_allowance_ft,
        (p as any).gsm ?? (p as any).material_config?.gsm ?? null,
        (p as any).finishing ?? (p as any).default_finishing ?? (p as any).material_config?.finishing ?? null
      )
    }

    return list
  }, [catalogMaterials, catalogProducts])

  // Group items by category_group for clean UX dropdown
  const groupedCatalog = useMemo(() => {
    const groups: Record<string, UnifiedStockItem[]> = {}
    for (const item of unifiedCatalog) {
      const g = item.category_group || 'General Products'
      if (!groups[g]) groups[g] = []
      groups[g].push(item)
    }
    return groups
  }, [unifiedCatalog])

  // Helper to build live price intelligence summary for a direct item row
  const computePriceIntelligence = (
    item: UnifiedStockItem | undefined,
    sizeLabel?: string,
    unitPrice?: number,
    supplierId?: string | null,
    configuredSize?: ConfiguredMaterialSize
  ): PriceIntelligenceSummary | null => {
    if (!item) return null
    try {
      const rawHistory = PrintERPDataStore.getAll<PriceIntelligenceRecord>(STORAGE_KEYS.PRICE_INTELLIGENCE, companyId) || []
      return PriceIntelligenceEngine.buildPriceIntelligenceSummary({
        material: item,
        size_label: sizeLabel,
        current_unit_price: Number(unitPrice || item.previous_cost || 0),
        current_supplier_id: supplierId || selectedSupplierId || null,
        history: rawHistory,
        width_ft: configuredSize?.width_ft || item.roll_width_ft,
        length_ft: configuredSize?.length_ft || item.roll_length_ft,
        standard_area_sft: configuredSize?.standard_area_sft || item.roll_area_sft,
        capacity_liters: configuredSize?.capacity_liters,
      })
    } catch {
      return null
    }
  }

  // Initialize or populate Direct Items
  const createInitialDirectRow = (itemId?: string): DirectReceiptItemRow => {
    const target: UnifiedStockItem = (itemId ? unifiedCatalog.find((x) => x.id === itemId || x.parent_id === itemId) : unifiedCatalog[0]) || {
      id: catalogMaterials[0]?.id || 'item-1',
      parent_id: catalogMaterials[0]?.id || 'item-1',
      sku: catalogMaterials[0]?.sku || 'MAT',
      name: catalogMaterials[0]?.name || 'Select Item',
      item_type: 'material' as const,
      category: catalogMaterials[0]?.category || 'General',
      category_group: 'General',
      unit: catalogMaterials[0]?.unit || 'pcs',
      master_unit: catalogMaterials[0]?.unit || 'pcs',
      master_purchase_unit: (catalogMaterials[0] as any)?.purchase_unit || catalogMaterials[0]?.unit || 'pcs',
      available_purchase_units: ['pcs'],
      physical_form: 'general' as const,
      current_stock: 0,
      previous_cost: Number(catalogMaterials[0]?.average_cost || 0),
      previous_selling_price: Math.round(Number(catalogMaterials[0]?.average_cost || 0) * 1.35),
      target_margin_percent: 35,
      is_roll: false,
      roll_width_ft: null,
      roll_length_ft: null,
      roll_area_sft: null,
      sheet_size: null,
      sheet_area_sft: null,
      thickness_mm: null,
      available_widths_ft: undefined,
      available_sheet_sizes: undefined,
      variants: [],
      size_spec: null,
      liquid_volume_capacity: null,
      pack_quantity: null,
    }

    const pForm = target.physical_form || 'general'
    const configuredSizes = PriceIntelligenceEngine.getMaterialActiveSizes(target)
    const initialSize = configuredSizes[0]

    let initialCost = Number(target.previous_cost) || 0
    if (initialSize?.default_supplier_price) {
      initialCost = initialSize.default_supplier_price
    }

    const prevCost = initialCost
    const prevSell = Number(target.previous_selling_price) || 0
    const targetMargin = target.target_margin_percent || (prevSell > prevCost && prevSell > 0 ? Math.round(((prevSell - prevCost) / prevSell) * 100) : 35)
    const suggestedSell = prevSell > 0 ? prevSell : (prevCost > 0 ? Math.ceil(prevCost / (1 - targetMargin / 100)) : 0)
    const availUnits = target.available_purchase_units || getAvailablePurchaseUnits(pForm, target.unit, target.master_purchase_unit)

    const summary = computePriceIntelligence(target, initialSize?.label, initialCost, selectedSupplierId, initialSize)

    return {
      id: `dir-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      material_id: target.id,
      parent_id: target.parent_id || target.id,
      variant_id: target.variant_id,
      variant_name: target.variant_name,
      material_name: target.name,
      sku: target.sku,
      unit: target.master_purchase_unit || target.unit || 'pcs',
      master_unit: target.master_unit || target.unit || 'pcs',
      master_purchase_unit: target.master_purchase_unit || target.unit,
      available_purchase_units: availUnits,
      physical_form: pForm,
      item_type: target.item_type,
      category: target.category,
      previous_cost: prevCost,
      unit_cost: prevCost,
      cost_variance_percent: 0,
      previous_selling_price: prevSell,
      new_selling_price: suggestedSell,
      target_margin_percent: targetMargin,
      update_master_pricing: true,
      quantity: 1,
      batch_lot_number: '',
      total_cost: prevCost * 1,
      is_roll: target.is_roll,
      roll_width_ft: initialSize?.width_ft || target.roll_width_ft,
      roll_length_ft: initialSize?.length_ft || target.roll_length_ft,
      roll_area_sft: initialSize?.standard_area_sft || target.roll_area_sft,
      sheet_size: initialSize?.physical_form === 'sheet' ? initialSize.label : target.sheet_size,
      sheet_area_sft: initialSize?.standard_area_sft || target.sheet_area_sft,
      thickness_mm: initialSize?.thickness_mm || target.thickness_mm,
      available_widths_ft: target.available_widths_ft,
      available_sheet_sizes: target.available_sheet_sizes,
      configured_sizes: configuredSizes,
      selected_size_id: initialSize?.id,
      price_intelligence_summary: summary,
      variants: target.variants,
      size_spec: initialSize?.label || target.size_spec,
      liquid_volume_capacity: target.liquid_volume_capacity,
      pack_quantity: target.pack_quantity,
    }
  }

  // Populate PO Rows with price intelligence
  const populatePoRows = (po: PurchaseOrderRecord) => {
    const rows: ItemReceiveRow[] = (po.items || []).map((item) => {
      const match = unifiedCatalog.find((m) => m.id === item.material_id)
      const prevCost = match?.previous_cost || Number(item.unit_cost) || 0
      const prevSell = match?.previous_selling_price || Math.round(prevCost * 1.35)
      const currentUnitCost = Number(item.unit_cost) || prevCost
      const targetMargin = match?.target_margin_percent || 35
      const suggestedSell = prevSell > 0 && prevCost === currentUnitCost
        ? prevSell
        : (targetMargin < 90 && targetMargin > 0 ? Math.ceil(currentUnitCost / (1 - targetMargin / 100)) : Math.round(currentUnitCost * 1.4))

      const rem = Number(item.quantity_remaining ?? Math.max(0, item.quantity_ordered - item.quantity_received))

      let resolvedWidth = Number((item as any).roll_width_ft || (match as any)?.roll_width_ft || 0)
      if (!resolvedWidth) {
        const matchW = `${item.material_name || ''} ${(item as any).supplier_sku || ''} ${(item as any).description || ''} ${(item as any).notes || ''}`.match(/(\d+(?:\.\d+)?)\s*(?:ft|')/i)
        if (matchW) resolvedWidth = Number(matchW[1])
      }
      let resolvedLength = Number((item as any).roll_length_ft || (match as any)?.roll_length_ft || (match as any)?.standard_roll_length_ft || 0)
      if (!resolvedLength) {
        const matchL = `${item.material_name || ''} ${(item as any).description || ''} ${(item as any).notes || ''}`.match(/[x×]\s*(\d+(?:\.\d+)?)\s*(?:ft|')/i)
        if (matchL) resolvedLength = Number(matchL[1])
      }

      return {
        po_item_id: item.id,
        material_id: item.material_id,
        material_name: item.material_name,
        unit: item.unit,
        unit_cost: currentUnitCost,
        previous_cost: prevCost,
        previous_selling_price: prevSell,
        new_selling_price: suggestedSell,
        target_margin_percent: targetMargin,
        update_master_pricing: true,
        quantity_ordered: Number(item.quantity_ordered),
        quantity_received: Number(item.quantity_received),
        quantity_remaining: rem,
        accepted_quantity: rem,
        rejected_quantity: 0,
        damaged_quantity: 0,
        batch_lot_number: '',
        roll_width_ft: resolvedWidth || (match as any)?.roll_width_ft || undefined,
        roll_length_ft: resolvedLength || (match as any)?.roll_length_ft || undefined,
      }
    })
    setPoReceiveRows(rows)
  }

  // Setup modal on open
  useEffect(() => {
    if (open) {
      setError(null)
      setSuccessMsg(null)
      setLoading(false)

      if (locations.length > 0 && !locationId) {
        const defaultLoc =
          locations.find((l) => l.location_type === 'raw_material_store' || l.location_type === 'main_store') ||
          locations[0]
        setLocationId(defaultLoc.id)
      }

      const initialPo = purchaseOrder || orders.find((o) => o.id === selectedPoId)
      if (initialPo) {
        setMode('po')
        setSelectedPoId(initialPo.id)
        populatePoRows(initialPo)
      } else if (orders.length > 0 && mode === 'po' && !selectedPoId) {
        const firstReceivable =
          orders.find((o) => o.status === 'issued' || o.status === 'partially_received') || orders[0]
        if (firstReceivable) {
          setSelectedPoId(firstReceivable.id)
          populatePoRows(firstReceivable)
        }
      } else {
        setDirectItems([createInitialDirectRow(selectedMaterialId)])
      }
    }
  }, [open, purchaseOrder, selectedMaterialId, companyId, unifiedCatalog.length])

  // Dynamic live sync: update active directItems rows whenever catalog configuration or pricing changes
  useEffect(() => {
    if (!open || directItems.length === 0) return
    setDirectItems((prev) => {
      let hasChanges = false
      const next = prev.map((row) => {
        const matched = unifiedCatalog.find(
          (u) => u.id === row.material_id || u.parent_id === row.material_id || (row.sku && u.sku && u.sku.toLowerCase() === row.sku.toLowerCase())
        )
        if (!matched) return row

        const newConfiguredSizes = PriceIntelligenceEngine.getMaterialActiveSizes(matched)
        const existingSize = newConfiguredSizes.find((s) => s.id === row.selected_size_id)
        const activeSize = existingSize || newConfiguredSizes[0]

        const activeCost =
          activeSize?.default_supplier_price && activeSize.default_supplier_price > 0
            ? activeSize.default_supplier_price
            : matched.previous_cost || row.unit_cost

        const availUnits =
          matched.available_purchase_units ||
          getAvailablePurchaseUnits(matched.physical_form || 'general', matched.unit, matched.master_purchase_unit)

        const targetMargin = row.target_margin_percent || matched.target_margin_percent || 35
        const newSell =
          targetMargin > 0 && targetMargin < 95 && activeCost > 0
            ? Math.ceil(activeCost / (1 - targetMargin / 100))
            : Math.round(activeCost * 1.4)

        const updatedRow: DirectReceiptItemRow = {
          ...row,
          material_name: matched.name,
          sku: matched.sku,
          category: matched.category,
          physical_form: matched.physical_form,
          master_unit: matched.master_unit,
          master_purchase_unit: matched.master_purchase_unit,
          available_purchase_units: availUnits,
          configured_sizes: newConfiguredSizes,
          selected_size_id: activeSize?.id,
          size_spec: activeSize?.label || matched.size_spec,
          roll_width_ft: activeSize?.width_ft || matched.roll_width_ft,
          roll_length_ft: activeSize?.length_ft || matched.roll_length_ft,
          roll_area_sft: activeSize?.standard_area_sft || matched.roll_area_sft,
          sheet_size: activeSize?.physical_form === 'sheet' ? activeSize.label : matched.sheet_size,
          sheet_area_sft: activeSize?.standard_area_sft || matched.sheet_area_sft,
          thickness_mm: activeSize?.thickness_mm || matched.thickness_mm,
          unit: row.unit && availUnits.includes(row.unit.toLowerCase()) ? row.unit : (matched.master_purchase_unit || matched.unit),
          previous_cost: activeCost,
          roll_sizes: matched.roll_sizes,
          material_config: matched.material_config,
          purchase_price_per_sft: matched.purchase_price_per_sft,
          production_width_allowance: matched.production_width_allowance,
        }

        updatedRow.price_intelligence_summary = computePriceIntelligence(
          matched,
          activeSize?.label,
          row.unit_cost === row.previous_cost || row.unit_cost <= 0 ? activeCost : row.unit_cost,
          selectedSupplierId,
          activeSize
        )

        if (row.unit_cost === row.previous_cost || row.unit_cost <= 0) {
          updatedRow.unit_cost = activeCost
          updatedRow.new_selling_price = newSell
          updatedRow.total_cost = Math.round(row.quantity * activeCost)
        }

        hasChanges = true
        return updatedRow
      })

      return hasChanges ? next : prev
    })
  }, [unifiedCatalog, selectedSupplierId, open])

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId)
    const foundPo = orders.find((o) => o.id === poId)
    if (foundPo) {
      populatePoRows(foundPo)
    } else {
      setPoReceiveRows([])
    }
  }

  const handlePoRowChange = (index: number, field: keyof ItemReceiveRow, val: any) => {
    setPoReceiveRows((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: val }

      // Live intelligence on PO row changes
      if (field === 'unit_cost') {
        const cost = Number(val) || 0
        const margin = current.target_margin_percent || 35
        if (margin > 0 && margin < 95) {
          current.new_selling_price = Math.ceil(cost / (1 - margin / 100))
        } else {
          current.new_selling_price = Math.round(cost * 1.4)
        }
      } else if (field === 'new_selling_price') {
        const sell = Number(val) || 0
        const cost = Number(current.unit_cost) || 0
        if (sell > 0 && cost > 0) {
          current.target_margin_percent = Math.round(((sell - cost) / sell) * 100)
        }
      }

      updated[index] = current
      return updated
    })
  }

  const handleReceiveAllRemaining = () => {
    setPoReceiveRows((prev) =>
      prev.map((row) => ({
        ...row,
        accepted_quantity: row.quantity_remaining,
        rejected_quantity: 0,
        damaged_quantity: 0,
      }))
    )
  }

  const handleClearAllPo = () => {
    setPoReceiveRows((prev) =>
      prev.map((row) => ({
        ...row,
        accepted_quantity: 0,
        rejected_quantity: 0,
        damaged_quantity: 0,
      }))
    )
  }

  // Quick-switch configured size (Width × Length & Discrete Economics) for a direct item line
  const handleSelectConfiguredSize = (index: number, sizeId: string) => {
    setDirectItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index] }
      const matchedSize = (current.configured_sizes || []).find((s) => s.id === sizeId)
      if (!matchedSize) return updated

      current.selected_size_id = matchedSize.id
      current.size_spec = matchedSize.label

      if (matchedSize.physical_form === 'roll') {
        current.roll_width_ft = matchedSize.width_ft || current.roll_width_ft
        current.nominal_width_ft = (matchedSize as any).nominal_width_ft ?? (matchedSize.allowance_ft ? ((matchedSize.width_ft ?? 0) - matchedSize.allowance_ft) : (matchedSize.width_ft ?? current.roll_width_ft ?? null))
        current.allowance_ft = matchedSize.allowance_ft !== undefined ? matchedSize.allowance_ft : 0
        current.roll_length_ft = matchedSize.length_ft || current.roll_length_ft
        current.roll_area_sft = matchedSize.standard_area_sft || (current.roll_width_ft && current.roll_length_ft ? Math.round(current.roll_width_ft * current.roll_length_ft) : 820)
      } else if (matchedSize.physical_form === 'sheet') {
        current.sheet_size = matchedSize.label
        current.sheet_area_sft = matchedSize.standard_area_sft || 32
        current.roll_width_ft = matchedSize.width_ft || (matchedSize as any).width || 8
        current.nominal_width_ft = (matchedSize as any).nominal_width_ft ?? current.roll_width_ft ?? null
        current.allowance_ft = matchedSize.allowance_ft !== undefined ? matchedSize.allowance_ft : 0
        current.roll_length_ft = matchedSize.length_ft || (matchedSize as any).length || 4
        current.thickness_mm = matchedSize.thickness_mm || current.thickness_mm
      } else if (matchedSize.physical_form === 'hardware' || matchedSize.physical_form === 'piece') {
        if (matchedSize.width_ft && matchedSize.length_ft) {
          current.roll_width_ft = matchedSize.width_ft
          current.nominal_width_ft = (matchedSize as any).nominal_width_ft ?? matchedSize.width_ft ?? null
          current.allowance_ft = matchedSize.allowance_ft !== undefined ? matchedSize.allowance_ft : 0
          current.roll_length_ft = matchedSize.length_ft
        }
      }

      if (matchedSize.default_supplier_price && matchedSize.default_supplier_price > 0) {
        current.unit_cost = matchedSize.default_supplier_price
        current.previous_cost = matchedSize.default_supplier_price
        current.total_cost = Math.round(current.quantity * current.unit_cost)

        const margin = current.target_margin_percent || 35
        if (margin > 0 && margin < 95) {
          current.new_selling_price = Math.ceil(current.unit_cost / (1 - margin / 100))
        }
      }

      const baseItem = unifiedCatalog.find((x) => x.id === current.material_id || x.id === current.parent_id)
      current.price_intelligence_summary = computePriceIntelligence(
        baseItem,
        matchedSize.label,
        current.unit_cost,
        selectedSupplierId,
        matchedSize
      )

      updated[index] = current
      return updated
    })
  }

  // Direct item row manipulation with smart cost/price intelligence
  const handleDirectItemChange = (index: number, field: keyof DirectReceiptItemRow, val: any) => {
    setDirectItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: val }

      if (field === 'material_id') {
        const item = unifiedCatalog.find((m) => m.id === val)
        if (item) {
          current.material_name = item.name
          current.sku = item.sku
          current.unit = item.master_purchase_unit || item.unit
          current.master_unit = item.master_unit || item.unit
          current.master_purchase_unit = item.master_purchase_unit || item.unit
          current.available_purchase_units = item.available_purchase_units || getAvailablePurchaseUnits(item.physical_form || 'general', item.unit, item.master_purchase_unit)
          current.physical_form = item.physical_form || 'general'
          current.item_type = item.item_type
          current.category = item.category
          current.parent_id = item.parent_id || item.id
          current.variant_id = item.variant_id
          current.variant_name = item.variant_name
          current.is_roll = item.is_roll
          current.roll_width_ft = item.roll_width_ft
          current.roll_length_ft = item.roll_length_ft
          current.roll_area_sft = item.roll_area_sft
          current.sheet_size = item.sheet_size
          current.sheet_area_sft = item.sheet_area_sft
          current.thickness_mm = item.thickness_mm
          current.available_widths_ft = item.available_widths_ft
          current.available_sheet_sizes = item.available_sheet_sizes
          current.variants = item.variants
          current.size_spec = item.size_spec
          current.liquid_volume_capacity = item.liquid_volume_capacity
          current.pack_quantity = item.pack_quantity

          // Active configured sizes with discrete economics
          const activeSizes = PriceIntelligenceEngine.getMaterialActiveSizes(item)
          current.configured_sizes = activeSizes
          const primarySize = activeSizes[0]
          current.selected_size_id = primarySize?.id

          let activeCost = item.previous_cost
          if (primarySize?.default_supplier_price) {
            activeCost = primarySize.default_supplier_price
          }

          if (primarySize) {
            current.size_spec = primarySize.label
            current.nominal_width_ft = (primarySize as any).nominal_width_ft ?? (primarySize.allowance_ft ? ((primarySize.width_ft ?? 0) - primarySize.allowance_ft) : (primarySize.width_ft ?? null))
            current.allowance_ft = primarySize.allowance_ft !== undefined ? primarySize.allowance_ft : 0
            if (primarySize.physical_form === 'roll') {
              current.roll_width_ft = primarySize.width_ft || current.roll_width_ft
              current.roll_length_ft = primarySize.length_ft || current.roll_length_ft
              current.roll_area_sft = primarySize.standard_area_sft || (current.roll_width_ft && current.roll_length_ft ? Math.round(current.roll_width_ft * current.roll_length_ft) : 820)
            } else if (primarySize.physical_form === 'sheet') {
              current.sheet_size = primarySize.label
              current.sheet_area_sft = primarySize.standard_area_sft || 32
              current.thickness_mm = primarySize.thickness_mm || current.thickness_mm
            }
          }

          current.previous_cost = activeCost
          current.unit_cost = activeCost > 0 ? activeCost : 0
          current.cost_variance_percent = 0
          current.previous_selling_price = item.previous_selling_price
          current.target_margin_percent = item.target_margin_percent || 35

          // Suggest selling price maintaining target margin
          const margin = current.target_margin_percent
          if (item.previous_selling_price > 0 && activeCost === item.previous_cost) {
            current.new_selling_price = item.previous_selling_price
          } else if (current.unit_cost > 0 && margin > 0 && margin < 95) {
            current.new_selling_price = Math.ceil(current.unit_cost / (1 - margin / 100))
          } else {
            current.new_selling_price = Math.round(current.unit_cost * 1.4)
          }

          current.total_cost = Math.round(current.quantity * current.unit_cost)

          // Compute Price Intelligence Summary
          current.price_intelligence_summary = computePriceIntelligence(
            item,
            primarySize?.label,
            current.unit_cost,
            selectedSupplierId,
            primarySize
          )
        }
      }

      // Unit Cost Changed (New Purchase Price) -> Recalculate Variance & Suggested Selling Price & Price Intel
      if (field === 'unit_cost') {
        const newCost = Number(val) || 0
        const prevCost = current.previous_cost
        if (prevCost > 0) {
          current.cost_variance_percent = Math.round(((newCost - prevCost) / prevCost) * 100)
        } else {
          current.cost_variance_percent = 0
        }

        // Maintain target margin % to auto-update new selling price
        const margin = current.target_margin_percent || 35
        if (margin > 0 && margin < 95 && newCost > 0) {
          current.new_selling_price = Math.ceil(newCost / (1 - margin / 100))
        } else if (newCost > 0) {
          current.new_selling_price = Math.round(newCost * 1.4)
        }

        // Live update price intelligence
        const baseItem = unifiedCatalog.find((x) => x.id === current.material_id || x.id === current.parent_id)
        const matchedSize = (current.configured_sizes || []).find((s) => s.id === current.selected_size_id)
        current.price_intelligence_summary = computePriceIntelligence(
          baseItem,
          current.size_spec || undefined,
          newCost,
          selectedSupplierId,
          matchedSize
        )
      }

      // New Selling Price Changed Manually -> Update Gross Profit Margin %
      if (field === 'new_selling_price') {
        const newSell = Number(val) || 0
        const cost = Number(current.unit_cost) || 0
        if (newSell > 0 && cost > 0) {
          current.target_margin_percent = Math.round(((newSell - cost) / newSell) * 100)
        }
      }

      // Target Margin % Changed Manually -> Update New Selling Price
      if (field === 'target_margin_percent') {
        const newMargin = Number(val) || 0
        const cost = Number(current.unit_cost) || 0
        if (newMargin > 0 && newMargin < 95 && cost > 0) {
          current.new_selling_price = Math.ceil(cost / (1 - newMargin / 100))
        }
      }

      const qty = Number(field === 'quantity' ? val : current.quantity) || 0
      const cost = Number(field === 'unit_cost' ? val : current.unit_cost) || 0
      current.total_cost = Math.round(qty * cost)

      updated[index] = current
      return updated
    })
  }

  // Quick-switch variant for a direct item line
  const handleSelectVariant = (index: number, variant: any) => {
    if (!variant) return
    const row = directItems[index]
    if (!row) return
    const matchedSize = (row.configured_sizes || []).find((s) => s.id === `variant-${variant.id}` || s.label.includes(variant.variant_name))
    if (matchedSize) {
      handleSelectConfiguredSize(index, matchedSize.id)
    }
  }

  // Quick-switch roll width for a direct item line
  const handleSelectRollWidth = (index: number, widthFt: number) => {
    const row = directItems[index]
    if (!row) return
    const matchedSize = (row.configured_sizes || []).find((s) => s.width_ft === widthFt || s.id === `width-${widthFt}ft`)
    if (matchedSize) {
      handleSelectConfiguredSize(index, matchedSize.id)
    }
  }

  // Quick-switch sheet size for a direct item line
  const handleSelectSheetSize = (index: number, sheetSize: string) => {
    const row = directItems[index]
    if (!row) return
    const matchedSize = (row.configured_sizes || []).find((s) => s.label.includes(sheetSize) || s.id.includes(sheetSize.replace(/[^a-zA-Z0-9]/g, '')))
    if (matchedSize) {
      handleSelectConfiguredSize(index, matchedSize.id)
    }
  }

  // Quick-switch unit for a direct item line with multi-unit scaling
  const handleSelectUnit = (index: number, newUnit: string) => {
    setDirectItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index] }
      const oldUnit = (current.unit || '').toLowerCase()
      const nUnit = (newUnit || '').toLowerCase()
      current.unit = newUnit

      if (oldUnit === nUnit) return updated

      const rollArea = current.roll_area_sft || (current.roll_width_ft ? current.roll_width_ft * (current.roll_length_ft || 164) : 820)
      const sheetArea = current.sheet_area_sft || 32
      const packQty = current.pack_quantity || 10

      // Helper to scale costs & prices
      const scaleRates = (multiplier: number) => {
        if (multiplier <= 0) return
        if (multiplier >= 1) {
          current.unit_cost = Math.round(current.unit_cost * multiplier)
          current.previous_cost = Math.round(current.previous_cost * multiplier)
          current.new_selling_price = Math.round(current.new_selling_price * multiplier)
          current.previous_selling_price = Math.round(current.previous_selling_price * multiplier)
        } else {
          current.unit_cost = Number((current.unit_cost * multiplier).toFixed(2))
          current.previous_cost = Number((current.previous_cost * multiplier).toFixed(2))
          current.new_selling_price = Number((current.new_selling_price * multiplier).toFixed(2))
          current.previous_selling_price = Number((current.previous_selling_price * multiplier).toFixed(2))
        }
      }

      // Roll Conversions
      if (oldUnit === 'sft' && nUnit === 'roll') {
        scaleRates(rollArea)
      } else if (oldUnit === 'roll' && nUnit === 'sft') {
        scaleRates(1 / rollArea)
      } else if (oldUnit === 'sft' && (nUnit === 'meter' || nUnit === 'rft')) {
        const width = current.roll_width_ft || 5
        scaleRates(nUnit === 'meter' ? width * 3.28084 : width)
      } else if ((oldUnit === 'meter' || oldUnit === 'rft') && nUnit === 'sft') {
        const width = current.roll_width_ft || 5
        scaleRates(1 / (oldUnit === 'meter' ? width * 3.28084 : width))
      }
      // Sheet Conversions
      else if (oldUnit === 'sft' && nUnit === 'sheet') {
        scaleRates(sheetArea)
      } else if (oldUnit === 'sheet' && nUnit === 'sft') {
        scaleRates(1 / sheetArea)
      } else if (oldUnit === 'sheet' && (nUnit === 'bundle' || nUnit === 'box')) {
        scaleRates(nUnit === 'bundle' ? 10 : 25)
      } else if ((oldUnit === 'bundle' || oldUnit === 'box') && nUnit === 'sheet') {
        scaleRates(1 / (oldUnit === 'bundle' ? 10 : 25))
      }
      // Liquid Conversions
      else if ((oldUnit === 'ltr' || oldUnit === 'liter' || oldUnit === 'litre') && nUnit === 'can') {
        scaleRates(5)
      } else if (oldUnit === 'can' && (nUnit === 'ltr' || nUnit === 'liter' || nUnit === 'litre')) {
        scaleRates(1 / 5)
      } else if ((oldUnit === 'ltr' || oldUnit === 'liter' || oldUnit === 'litre') && nUnit === 'gallon') {
        scaleRates(3.785)
      } else if (oldUnit === 'gallon' && (nUnit === 'ltr' || nUnit === 'liter' || nUnit === 'litre')) {
        scaleRates(1 / 3.785)
      } else if ((oldUnit === 'ltr' || oldUnit === 'liter') && nUnit === 'ml') {
        scaleRates(1 / 1000)
      } else if (oldUnit === 'ml' && (nUnit === 'ltr' || nUnit === 'liter')) {
        scaleRates(1000)
      }
      // Hardware / Pack / Box Conversions
      else if ((oldUnit === 'pcs' || oldUnit === 'piece') && (nUnit === 'box' || nUnit === 'pack')) {
        scaleRates(packQty)
      } else if ((oldUnit === 'box' || oldUnit === 'pack') && (nUnit === 'pcs' || nUnit === 'piece')) {
        scaleRates(1 / packQty)
      }
      // Weight Conversions
      else if (oldUnit === 'kg' && nUnit === 'ton') {
        scaleRates(1000)
      } else if (oldUnit === 'ton' && nUnit === 'kg') {
        scaleRates(1 / 1000)
      } else if (oldUnit === 'kg' && nUnit === 'bag') {
        scaleRates(25)
      } else if (oldUnit === 'bag' && nUnit === 'kg') {
        scaleRates(1 / 25)
      }

      current.total_cost = Math.round(current.quantity * current.unit_cost)
      updated[index] = current
      return updated
    })
  }

  const handleAddDirectItem = () => {
    setDirectItems((prev) => [...prev, createInitialDirectRow()])
  }

  const handleRemoveDirectItem = (index: number) => {
    if (directItems.length <= 1) return
    setDirectItems((prev) => prev.filter((_, i) => i !== index))
  }

  const currentPo = orders.find((o) => o.id === selectedPoId) || purchaseOrder

  // Valuation Calculations
  const poTotalAcceptedValuation = useMemo(() => {
    return poReceiveRows.reduce((sum, r) => sum + (Number(r.accepted_quantity) || 0) * (Number(r.unit_cost) || 0), 0)
  }, [poReceiveRows])

  const directTotalValuation = useMemo(() => {
    return directItems.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0)
  }, [directItems])

  const totalItemsCount = useMemo(() => {
    if (mode === 'po') {
      return poReceiveRows.filter((r) => r.accepted_quantity > 0).length
    }
    return directItems.filter((r) => r.quantity > 0).length
  }, [mode, poReceiveRows, directItems])

  // SUBMIT HANDLER
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const effectiveLocationId = locationId || locations[0]?.id

    if (!effectiveLocationId && locations.length > 0) {
      setError('Please select a destination warehouse / store location.')
      return
    }

    if (mode === 'po') {
      if (!selectedPoId && !currentPo) {
        setError('Please select a valid Purchase Order.')
        return
      }

      const effectivePoId = currentPo?.id || selectedPoId
      const itemsToReceive = poReceiveRows.filter((r) => r.accepted_quantity > 0 || r.rejected_quantity > 0 || r.damaged_quantity > 0)

      if (itemsToReceive.length === 0) {
        setError('Please specify an accepted or inspected quantity for at least one item.')
        return
      }

      // Over-receipt client check
      for (const item of itemsToReceive) {
        if (item.accepted_quantity > item.quantity_remaining) {
          setError(
            `Accepted quantity (${item.accepted_quantity}) for ${item.material_name} exceeds remaining ordered balance (${item.quantity_remaining}).`
          )
          return
        }
      }

      setLoading(true)
      try {
        const fullNotes = [
          notes.trim(),
          vehicleNumber ? `Vehicle: ${vehicleNumber.trim()}` : null,
          carrierName ? `Carrier: ${carrierName.trim()}` : null,
        ]
          .filter(Boolean)
          .join(' | ')

        const res = await receiveGoodsAction(
          {
            purchase_order_id: effectivePoId,
            receiving_location_id: effectiveLocationId || null,
            received_date: receivedDate,
            challan_number: challanNumber.trim() || null,
            supplier_delivery_note: supplierDeliveryNote.trim() || null,
            supplier_invoice_number: supplierInvoiceNumber.trim() || null,
            notes: fullNotes || null,
            items_received: itemsToReceive.map((item) => ({
              po_item_id: item.po_item_id,
              material_id: item.material_id,
              material_name: item.material_name,
              current_received: item.accepted_quantity + item.rejected_quantity + item.damaged_quantity,
              accepted_quantity: item.accepted_quantity,
              rejected_quantity: item.rejected_quantity,
              damaged_quantity: item.damaged_quantity,
              unit: item.unit,
              unit_cost: item.unit_cost,
              batch_lot_number: item.batch_lot_number || null,
              roll_width_ft: item.roll_width_ft || null,
              roll_length_ft: item.roll_length_ft || null,
            })),
          },
          companyId
        )

        if (!res.success) {
          setError(res.error || 'Failed to process goods receipt.')
          setLoading(false)
          return
        }

        // Synchronize master product prices for items where update_master_pricing is true
        for (const item of itemsToReceive) {
          if (item.update_master_pricing && item.new_selling_price > 0) {
            try {
              await updateProductPriceAction(
                item.material_id,
                item.new_selling_price,
                `Updated during PO GRN Intake (${currentPo?.po_number || 'PO'})`,
                companyId,
                {
                  newPurchasePrice: item.unit_cost,
                  newTargetMarginPercent: item.target_margin_percent,
                }
              )
            } catch {}
          }
        }

        // Dispatch real-time sync broadcast events
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('printerp_table_synced:products'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:materials'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:stock_ledger'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:purchase_orders'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:pricing_rules'))
        }

        setSuccessMsg('Goods Received Note (GRN) posted, inventory balances updated, and product masters synced successfully!')
        setTimeout(() => {
          onSuccess?.()
          onOpenChange(false)
          resetForm()
        }, 800)
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during goods receiving.')
      } finally {
        setLoading(false)
      }
    } else {
      // Direct Receipt or Opening Balance Mode
      if (directItems.length === 0) {
        setError('Please add at least one item.')
        return
      }

      for (let i = 0; i < directItems.length; i++) {
        const it = directItems[i]
        if (!it.material_id) {
          setError(`Item #${i + 1} selection is required.`)
          return
        }
        if (it.quantity <= 0) {
          setError(`Item #${i + 1} quantity must be greater than zero.`)
          return
        }
      }

      setLoading(true)
      try {
        const supRecord = suppliers.find((s) => s.id === selectedSupplierId)
        const supplierRef =
          supRecord?.supplier_name ||
          customSupplierName.trim() ||
          challanNumber.trim() ||
          supplierInvoiceNumber.trim() ||
          (mode === 'opening' ? 'Opening Balance Migration' : 'Spot Purchase')

        const fullNotes = [
          notes.trim(),
          challanNumber ? `Challan: ${challanNumber.trim()}` : null,
          supplierInvoiceNumber ? `Invoice: ${supplierInvoiceNumber.trim()}` : null,
          vehicleNumber ? `Vehicle: ${vehicleNumber.trim()}` : null,
        ]
          .filter(Boolean)
          .join(' | ')

        // Process each direct item sequentially
        for (const item of directItems) {
          const effectiveMaterialId = item.parent_id || item.material_id.split('__')[0]

          let sizeSpecNotes = ''
          if (item.variant_name) {
            sizeSpecNotes = `Variant: ${item.variant_name}${item.size_spec ? ` (${item.size_spec})` : ''}`
          } else if (item.roll_width_ft) {
            const area = item.roll_area_sft || item.roll_width_ft * (item.roll_length_ft || 164)
            sizeSpecNotes = `Roll Size: ${item.roll_width_ft}ft × ${item.roll_length_ft || 164}ft (${area} sft)`
          } else if (item.sheet_size) {
            sizeSpecNotes = `Sheet Size: ${item.sheet_size}`
          }

          const itemNotesArr = [
            fullNotes,
            item.batch_lot_number ? `Lot: ${item.batch_lot_number}` : null,
            sizeSpecNotes ? `[${sizeSpecNotes}]` : null,
          ].filter(Boolean)

          const combinedItemNotes = itemNotesArr.join(' | ')

          const res = await receiveStockAction(
            {
              material_id: effectiveMaterialId,
              location_id: effectiveLocationId || locations[0]?.id,
              quantity: Number(item.quantity),
              unit_cost: Number(item.unit_cost) || 0,
              is_opening_balance: mode === 'opening',
              supplier_reference: supplierRef,
              supplier_id: selectedSupplierId || null,
              supplier_name: supRecord?.supplier_name || customSupplierName.trim() || null,
              size_label: item.size_spec || (item.roll_width_ft ? `${item.roll_width_ft} ft × ${item.roll_length_ft || 164} ft` : item.sheet_size) || null,
              width_ft: item.roll_width_ft || null,
              length_ft: item.roll_length_ft || null,
              allowance_ft: item.allowance_ft !== undefined ? item.allowance_ft : (item.production_width_allowance ?? 0),
              gsm: item.gsm ?? (item.material_config as any)?.gsm ?? null,
              finishing: item.finishing ?? (item.material_config as any)?.finishing ?? (item.material_config as any)?.default_finishing ?? null,
              physical_form: item.physical_form as any,
              purchase_unit: item.unit || item.master_purchase_unit || 'pcs',
              challan_number: challanNumber.trim() || null,
              supplier_invoice_number: supplierInvoiceNumber.trim() || null,
              batch_lot_number: item.batch_lot_number?.trim() || null,
              purchase_date: receivedDate,
              notes: combinedItemNotes || fullNotes,
              variant_id: item.variant_id || (item.selected_size_id && item.selected_size_id.startsWith('variant-') ? item.selected_size_id.replace('variant-', '') : item.selected_size_id) || null,
              variant_name: item.variant_name || (item.physical_form === 'liquid' || item.physical_form === 'hardware' ? item.size_spec : null) || null,
            },
            companyId
          )

          if (!res.success) {
            setError(res.error || `Failed to receive stock for ${item.material_name}`)
            setLoading(false)
            return
          }

          // If update_master_pricing is enabled, update product price and purchase cost in master
          if (item.update_master_pricing) {
            try {
              await updateProductPriceAction(
                effectiveMaterialId,
                item.new_selling_price || item.previous_selling_price || Math.round(item.unit_cost * 1.35),
                `Updated during Direct Stock Intake (${mode === 'opening' ? 'Opening Balance' : 'Spot Inward'}${sizeSpecNotes ? ' - ' + sizeSpecNotes : ''})`,
                companyId,
                {
                  newPurchasePrice: item.unit_cost,
                  newTargetMarginPercent: item.target_margin_percent,
                }
              )
            } catch {}
          }
        }

        // Dispatch real-time sync broadcast events
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('printerp_table_synced:products'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:materials'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:inventory_rolls'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:stock_ledger'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:pricing_rules'))
        }

        setSuccessMsg(
          mode === 'opening'
            ? 'Opening balances and product master valuations recorded successfully!'
            : 'Direct stock receipt posted and Commercial Master prices synced successfully!'
        )
        setTimeout(() => {
          onSuccess?.()
          onOpenChange(false)
          resetForm()
        }, 800)
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }
  }

  const resetForm = () => {
    setError(null)
    setSuccessMsg(null)
    setChallanNumber('')
    setSupplierDeliveryNote('')
    setSupplierInvoiceNumber('')
    setVehicleNumber('')
    setCarrierName('')
    setNotes('')
    setDirectItems([createInitialDirectRow()])
  }

  const receivableOrders = orders.filter((o) => o.status !== 'received' && o.status !== 'cancelled')

  return (
    <ModalDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
      size="4xl"
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 text-white shadow-md flex items-center justify-center font-bold shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {mode === 'po'
                  ? tBilingual('Goods Receiving Note Intake', 'ক্রয় আদেশ অনুযায়ী মাল গ্রহণ')
                  : mode === 'opening'
                  ? tBilingual('Record Opening Stock Balance', 'প্রারম্ভিক স্টক ব্যালেন্স এন্ট্রি')
                  : tBilingual('Direct Stock Intake & Price Intelligence', 'সরাসরি পণ্য বা কাঁচামাল গ্রহণ')}
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono py-0.5 px-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
              >
                Inward Gate & Master Sync
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Receive raw materials & commercial catalog products, track purchase cost variances, and auto-sync selling prices',
                'কাঁচামাল ও প্রোডাক্ট গ্রহণ, আগের ও নতুন ক্রয় মূল্য যাচাই এবং বিক্রয় মূল্য স্বয়ংক্রিয় আপডেট'
              )}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto min-h-[40px] text-xs font-semibold cursor-pointer"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-[40px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  <span>Processing Intake & Master Sync...</span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {mode === 'po'
                      ? tBilingual('Post Stock Receipt', 'স্টক গ্রহণ নিশ্চিত করুন')
                      : mode === 'opening'
                      ? tBilingual('Save Opening Balance', 'প্রারম্ভিক স্টক সংরক্ষণ করুন')
                      : tBilingual('Confirm Intake & Sync Pricing', 'পণ্য গ্রহণ ও মূল্য আপডেট নিশ্চিত করুন')}
                  </span>
                </div>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1 pb-2">
        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 rounded-xl border border-rose-300 dark:border-rose-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* 3-WAY INTAKE MODE SELECTOR */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('po')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'po'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Truck className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('PO Receiving (GRN)', 'অর্ডার চালান গ্রহণ')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('direct')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'direct'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Package className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Direct Spot Intake', 'সরাসরি পণ্য গ্রহণ')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('opening')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'opening'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Opening Stock', 'প্রারম্ভিক স্টক')}</span>
          </button>
        </div>

        {/* LOGISTICS & WAREHOUSE LOCATION (COMMON BAR) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Destination Store & Challan Documentation', 'গন্তব্য গোডাউন ও চালান তথ্য')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Target Warehouse / Store', 'গন্তব্য গোডাউন')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                required
              >
                {locations.length > 0 ? (
                  locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name} {loc.location_code ? `(${loc.location_code})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="main-store">Main Raw Material Store</option>
                )}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Intake / Received Date', 'গ্রহণের তারিখ')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Delivery Challan / Gate Pass #', 'চালান / গেট পাস নং')}
              </Label>
              <Input
                placeholder="e.g. CH-2026-9012"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Supplier Bill / Tax Invoice #', 'সাপ্লায়ার ইনভয়েস নং')}
              </Label>
              <Input
                placeholder="e.g. INV-8812 / Mushak 6.3"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Transport Vehicle / Truck #', 'গাড়ি / ট্রাক নং')}
              </Label>
              <Input
                placeholder="e.g. Dhaka Metro-Ta 11-2041"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Transport / Courier Name', 'কুরিয়ার / ট্রান্সপোর্ট')}
              </Label>
              <Input
                placeholder="e.g. Sundarban Courier / SA Paribahan"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: PO RECEIVING (GRN) */}
        {/* ========================================================================= */}
        {mode === 'po' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-50 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {tBilingual('Select Inward Purchase Order', 'ক্রয় আদেশ নির্বাচন')}
                </h3>
              </div>

              {poReceiveRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleReceiveAllRemaining}
                    className="h-7 text-[11px] font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700 cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    {tBilingual('Receive All Remaining', 'সব গ্রহণ')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearAllPo}
                    className="h-7 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    {tBilingual('Clear All', 'মুছুন')}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Inward Purchase Order (PO)', 'ক্রয় আদেশ')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={selectedPoId || currentPo?.id || ''}
                onChange={(e) => handlePoChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                required
              >
                <option value="">-- Choose Inward Purchase Order --</option>
                {receivableOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.po_number} — {o.supplier_name} ({o.status.replace('_', ' ')}) — Grand Total: {formatBDT(o.grand_total)}
                  </option>
                ))}
              </select>
            </div>

            {/* PO Intel Banner */}
            {currentPo && (
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Vendor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {currentPo.supplier_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">PO Number:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                    {currentPo.po_number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Expected Date:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
                    {currentPo.expected_delivery_date || currentPo.po_date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">PO Total Value:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {formatBDT(currentPo.grand_total)}
                  </span>
                </div>
              </div>
            )}

            {/* PO Line Items Receiving Grid */}
            {poReceiveRows.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  {tBilingual('Quality Inspection & Intake Lines', 'মান যাচাই ও পণ্য গ্রহণ')}
                </Label>

                <div className="space-y-3">
                  {poReceiveRows.map((row, idx) => {
                    const lineAcceptedVal = Math.round((Number(row.accepted_quantity) || 0) * (Number(row.unit_cost) || 0))
                    const costVariance = row.previous_cost > 0 ? Math.round(((row.unit_cost - row.previous_cost) / row.previous_cost) * 100) : 0

                    return (
                      <div
                        key={row.po_item_id || idx}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3 text-xs"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{row.material_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              PO Order: {row.quantity_ordered} {row.unit} | Received: {row.quantity_received} | Remaining:{' '}
                              <span className="font-bold text-emerald-600">{row.quantity_remaining} {row.unit}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {row.roll_width_ft ? (
                              <Badge variant="outline" className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800">
                                Roll: {row.roll_width_ft}ft × {row.roll_length_ft || 164}ft
                              </Badge>
                            ) : null}
                            <Badge variant="outline" className="text-[10px] font-mono">
                              Rate: {formatBDT(row.unit_cost)} / {row.unit}
                            </Badge>
                          </div>
                        </div>

                        {/* Inspection inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div>
                            <Label className="text-[11px] text-slate-500 mb-0.5 block">Accepted Qty ({row.unit})</Label>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              max={row.quantity_remaining}
                              value={row.accepted_quantity}
                              onChange={(e) => handlePoRowChange(idx, 'accepted_quantity', Number(e.target.value))}
                              className="h-8 text-xs font-mono font-bold border-emerald-300 dark:border-emerald-700"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-slate-500 mb-0.5 block">Rejected Qty</Label>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={row.rejected_quantity}
                              onChange={(e) => handlePoRowChange(idx, 'rejected_quantity', Number(e.target.value))}
                              className="h-8 text-xs font-mono text-rose-600"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-slate-500 mb-0.5 block">Batch / Roll Lot #</Label>
                            <Input
                              placeholder="e.g. Lot-108"
                              value={row.batch_lot_number}
                              onChange={(e) => handlePoRowChange(idx, 'batch_lot_number', e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-slate-500 mb-0.5 block">Inward Value (৳)</Label>
                            <div className="h-8 px-3 rounded-md bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              {formatBDT(lineAcceptedVal)}
                            </div>
                          </div>
                        </div>

                        {/* COST & PRICING INTELLIGENCE PANEL */}
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              Commercial Master Price Intelligence & Sync
                            </span>
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.update_master_pricing}
                                onChange={(e) => handlePoRowChange(idx, 'update_master_pricing', e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                              />
                              Sync Master Pricing
                            </label>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Previous Cost:</span>
                              <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {formatBDT(row.previous_cost)} / {row.unit}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block">PO Inward Cost:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-emerald-600">
                                  {formatBDT(row.unit_cost)}
                                </span>
                                {costVariance !== 0 && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[9px] px-1 py-0 font-mono font-bold',
                                      costVariance > 0
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    )}
                                  >
                                    {costVariance > 0 ? `+${costVariance}% ↗` : `${costVariance}% ↘`}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block">Previous Price:</span>
                              <div className="font-mono text-xs text-slate-500">
                                {formatBDT(row.previous_selling_price)}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block">New Selling Price:</span>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={row.new_selling_price}
                                  onChange={(e) => handlePoRowChange(idx, 'new_selling_price', Number(e.target.value))}
                                  className="h-7 text-xs font-mono font-bold w-24"
                                />
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                                  Margin: {row.target_margin_percent}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* GRN Summary Banner */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Intake Lines Accepted:</span>
                    <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                      {totalItemsCount} material item(s) to post to ledger
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Accepted GRN Value</span>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      {formatBDT(poTotalAcceptedValuation)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2 & 3: DIRECT MATERIAL RECEIPT / OPENING BALANCE */}
        {/* ========================================================================= */}
        {(mode === 'direct' || mode === 'opening') && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-50 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {mode === 'opening'
                    ? tBilingual('Opening Stock Items & Valuation Masters', 'প্রারম্ভিক স্টক আইটেম ও দরপত্র মাস্টার')
                    : tBilingual('Direct Stock Intake & Commercial Masters Catalog', 'সরাসরি পণ্য/কাঁচামাল গ্রহণ ও মাস্টার প্রাইসিং')}
                </h3>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddDirectItem}
                className="h-7 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Add Line', 'নতুন আইটেম')}
              </Button>
            </div>

            {/* Vendor Selector (Only for Direct Receipt) */}
            {mode === 'direct' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Supplier / Mill Vendor', 'সাপ্লায়ার নির্বাচন')}
                  </Label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    <option value="">-- Choose Registered Vendor (Optional) --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplier_name} — 📞 {s.mobile}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Or Custom Spot Vendor / Source', 'অথবা স্পট সাপ্লায়ার')}
                  </Label>
                  <Input
                    placeholder="e.g. Local Chawkbazar Spot Purchase"
                    value={customSupplierName}
                    onChange={(e) => setCustomSupplierName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            )}

            {/* Direct Items List */}
            <div className="space-y-3.5 max-h-[48vh] overflow-y-auto pr-1">
              {directItems.map((item, idx) => {
                const isVariancePositive = item.cost_variance_percent > 0
                const isVarianceNegative = item.cost_variance_percent < 0
                const grossProfitPerUnit = Math.max(0, (item.new_selling_price || 0) - (item.unit_cost || 0))

                const hasVariants = item.variants && item.variants.length > 0
                const hasRollWidths = Boolean(item.is_roll || (item.available_widths_ft && item.available_widths_ft.length > 0))
                const hasSheetSizes = Boolean(item.available_sheet_sizes && item.available_sheet_sizes.length > 0)
                const rollLen = item.roll_length_ft || 164
                const rollArea = item.roll_area_sft || (item.roll_width_ft ? Math.round(item.roll_width_ft * rollLen) : 820)
                const sheetArea = item.sheet_area_sft || 32

                const hasLiquid = item.physical_form === 'liquid'
                const hasHardware = item.physical_form === 'hardware' || item.physical_form === 'box_pack'

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3.5 text-xs shadow-xs"
                  >
                    {/* Item Header with Inherited Physical Form & Purchase Unit Badges */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-mono font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.material_name || 'Select Item'}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 bg-white dark:bg-slate-900">
                          {item.sku || 'SKU'}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] px-1.5 py-0 font-medium',
                            item.item_type === 'product'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          )}
                        >
                          {item.item_type === 'product' ? 'Commercial Master' : 'Registered Material Master'}
                        </Badge>

                        {/* Inherited Physical Form / Classification Badge */}
                        {(() => {
                          const badgeInfo = getPhysicalFormBadge(item.physical_form)
                          const BadgeIcon = badgeInfo.icon
                          return (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-2 py-0 font-bold flex items-center gap-1 border',
                                badgeInfo.badgeStyle
                              )}
                              title="Inherited from Material Master Physical Classification"
                            >
                              <BadgeIcon className="h-3 w-3" />
                              <span>Form: {badgeInfo.label}</span>
                            </Badge>
                          )
                        })()}

                        {/* Inherited Purchase Unit Badge */}
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-mono font-bold uppercase"
                          title="Inherited from Material Master Purchasing Unit"
                        >
                          Purchase Unit: {item.unit || item.master_purchase_unit || 'pcs'}
                        </Badge>

                        {/* Current Active Size Pill */}
                        {(item.size_spec || (item.physical_form === 'roll' && item.roll_width_ft) || (item.physical_form === 'sheet' && item.sheet_size)) && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-semibold"
                          >
                            📏 {item.size_spec || (item.physical_form === 'roll' ? `${item.roll_width_ft || 5}ft Roll (${rollArea} sft)` : item.sheet_size)}
                          </Badge>
                        )}
                      </div>

                      {directItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDirectItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Selector & Quantities Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* 1. Registered Material Master Dropdown (No Free-Text) */}
                      <div className="sm:col-span-6">
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5 block">
                          Material Name (Registered Master) <span className="text-rose-500">*</span>
                        </Label>
                        <select
                          value={item.material_id}
                          onChange={(e) => handleDirectItemChange(idx, 'material_id', e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                          required
                        >
                          <option value="">-- Select Registered Material Master --</option>
                          {Object.entries(groupedCatalog).map(([grpName, grpItems]) => (
                            <optgroup key={grpName} label={`📂 ${grpName}`}>
                              {grpItems.map((m) => {
                                let subRate = ''
                                if (m.physical_form === 'roll' && m.roll_area_sft && m.roll_area_sft > 0 && m.previous_cost > 0) {
                                  const sftRate = Math.round((m.previous_cost / m.roll_area_sft) * 10) / 10
                                  subRate = ` (৳${sftRate}/sqft)`
                                } else if (m.physical_form === 'sheet' && m.sheet_area_sft && m.sheet_area_sft > 0 && m.previous_cost > 0) {
                                  const sftRate = Math.round((m.previous_cost / m.sheet_area_sft) * 10) / 10
                                  subRate = ` (৳${sftRate}/sqft)`
                                }
                                return (
                                  <option key={m.id} value={m.id}>
                                    {m.name} [SKU: {m.sku}] — Prev: {formatBDT(m.previous_cost)}/{m.master_purchase_unit || m.unit}{subRate}
                                  </option>
                                )
                              })}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* 2. Active Configured Roll/Sheet Sizes & Discrete Economics Dropdown */}
                      <div className="sm:col-span-6">
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5 block">
                          Active Configured Size & Economics <span className="text-rose-500">*</span>
                        </Label>
                        {item.configured_sizes && item.configured_sizes.length > 0 ? (
                          <select
                            value={item.selected_size_id || item.configured_sizes[0]?.id}
                            onChange={(e) => handleSelectConfiguredSize(idx, e.target.value)}
                            className="w-full h-9 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 px-2.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200"
                          >
                            {item.configured_sizes.map((sz) => {
                              let ecoDetail = ''
                              if (sz.default_supplier_price && sz.default_supplier_price > 0) {
                                if (sz.physical_form === 'roll' && sz.standard_area_sft && sz.standard_area_sft > 0) {
                                  const ratePerSft = Math.round((sz.default_supplier_price / sz.standard_area_sft) * 10) / 10
                                  ecoDetail = ` — ৳${sz.default_supplier_price.toLocaleString()}/roll (৳${ratePerSft}/sqft)`
                                } else if (sz.physical_form === 'sheet' && sz.standard_area_sft && sz.standard_area_sft > 0) {
                                  const ratePerSft = Math.round((sz.default_supplier_price / sz.standard_area_sft) * 10) / 10
                                  ecoDetail = ` — ৳${sz.default_supplier_price.toLocaleString()}/sheet (৳${ratePerSft}/sqft)`
                                } else {
                                  ecoDetail = ` — ৳${sz.default_supplier_price.toLocaleString()}/${item.unit || 'unit'}`
                                }
                              }
                              return (
                                <option key={sz.id} value={sz.id}>
                                  {sz.label}{ecoDetail}
                                </option>
                              )
                            })}
                          </select>
                        ) : (
                          <Input
                            placeholder="Standard Master Size"
                            value={item.size_spec || 'Standard Master Size'}
                            disabled
                            className="h-9 text-xs bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400"
                          />
                        )}
                      </div>
                    </div>

                    {/* Active Configured Sizing Quick-Pills */}
                    {item.configured_sizes && item.configured_sizes.length > 1 && (
                      <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1 mr-1">
                          <Disc className="h-3 w-3 text-indigo-600" />
                          Configured Sizes:
                        </span>
                        {item.configured_sizes.map((sz) => {
                          const isSelected = item.selected_size_id === sz.id
                          let pillPrice = ''
                          if (sz.default_supplier_price && sz.default_supplier_price > 0) {
                            pillPrice = ` (৳${sz.default_supplier_price.toLocaleString()})`
                          }
                          return (
                            <button
                              key={sz.id}
                              type="button"
                              onClick={() => handleSelectConfiguredSize(idx, sz.id)}
                              className={cn(
                                'text-[11px] py-0.5 px-2.5 rounded-md font-mono transition-all cursor-pointer border',
                                isSelected
                                  ? 'bg-indigo-600 text-white font-bold border-indigo-700 shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                              )}
                            >
                              {sz.label}{pillPrice}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Quantity & Unit Pricing Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      {/* Quantity */}
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block">
                          Quantity ({item.unit || 'Roll'}) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleDirectItemChange(idx, 'quantity', Number(e.target.value))}
                          className="h-9 text-xs font-bold font-mono border-emerald-300 dark:border-emerald-700"
                          required
                        />
                      </div>

                      {/* Unit Purchase Price (Discrete Supplier Rate) */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                            Unit Purchase Price (৳) <span className="text-rose-500">*</span>
                          </Label>
                          {item.cost_variance_percent !== 0 && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] px-1 py-0 font-mono font-bold',
                                isVariancePositive
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              )}
                            >
                              {isVariancePositive ? `+${item.cost_variance_percent}% ↗` : `${item.cost_variance_percent}% ↘`}
                            </Badge>
                          )}
                        </div>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unit_cost}
                          onChange={(e) => handleDirectItemChange(idx, 'unit_cost', Number(e.target.value))}
                          className="h-9 text-xs font-bold font-mono bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700"
                          required
                        />
                      </div>

                      {/* Inward Total Cost */}
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block">
                          Total Value (৳)
                        </Label>
                        <div className="h-9 px-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                          {formatBDT(item.total_cost)}
                        </div>
                      </div>

                      {/* Batch / Lot / Challan Tag */}
                      <div>
                        <Label className="text-[11px] text-slate-500 mb-0.5 block">Batch / Lot / Roll Tag</Label>
                        <Input
                          placeholder="e.g. Lot-1024"
                          value={item.batch_lot_number}
                          onChange={(e) => handleDirectItemChange(idx, 'batch_lot_number', e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* LIVE PRICE INTELLIGENCE HUD & SUPPLIER HISTORY */}
                    {item.price_intelligence_summary && (
                      <PriceIntelligenceCard
                        summary={item.price_intelligence_summary}
                        currentUnitPrice={item.unit_cost}
                        purchaseUnit={item.unit}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Direct Total Summary Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Total Lines Configured:</span>
                <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                  {directItems.length} item line(s) ready for inward post & master price update
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Inward Valuation</span>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {formatBDT(directTotalValuation)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOTES & AUDIT COMMENT */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2 shadow-xs">
          <Label className="text-xs font-semibold block">
            {tBilingual('Receiving Inspection Notes & QC Comments (Optional)', 'পরিদর্শন মন্তব্য ও শর্তাবলী')}
          </Label>
          <textarea
            rows={2}
            placeholder="e.g. Physical stock inspected; rates cross-checked against market invoices; verified by store officer..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </ModalDialog>
  )
}

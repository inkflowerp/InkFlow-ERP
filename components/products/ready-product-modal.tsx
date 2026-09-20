'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Sliders,
  AlertCircle,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Tag,
  Percent,
  Coins,
  Info,
  Layers,
  Warehouse,
  Boxes,
  Truck,
  Scale,
  Maximize2,
  Building,
  CheckCircle2,
  Zap,
  HelpCircle,
  QrCode,
  MapPin,
  Clock,
} from 'lucide-react'
import type { ProductRecord, UnitOfMeasure, ProductPriceTiers } from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { formatBDT } from '@/lib/formatters'
import { calculateGrossMargin } from '@/lib/units'
import { cn } from '@/lib/utils'

interface ReadyProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (productData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
  suppliers?: Array<{ id: string; name: string; contact_person?: string; phone?: string }>
}

export const READY_PRODUCT_UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'piece', label: 'Piece (pcs / পিস)' },
  { value: 'set', label: 'Set (সেট)' },
  { value: 'pack', label: 'Pack (প্যাক)' },
  { value: 'box', label: 'Box / Carton (বক্স)' },
  { value: 'item', label: 'Item (আইটেম)' },
  { value: 'pair', label: 'Pair (জোড়া)' },
  { value: 'roll', label: 'Roll (রোল)' },
  { value: 'liter', label: 'Liter (লিটার)' },
  { value: 'kg', label: 'KG (কেজি)' },
  { value: 'meter', label: 'Meter (মিটার)' },
]

export const READY_PRODUCT_CATEGORIES = [
  { id: 'display_stands', name: 'Display Stands & Rollups (স্ট্যান্ড ও ব্যানার ফ্রেম)', icon: Package },
  { id: 'frames_hardware', name: 'Frames & Snap Displays (ফ্রেম ও ডিসপ্লে হার্ডওয়্যার)', icon: Sliders },
  { id: 'signage_accessories', name: 'Signage Hardware & LED Accessories (সাইন এক্সেসরিজ)', icon: Sparkles },
  { id: 'acrylic_displays', name: 'Acrylic Display Trays & Stands (এক্রিলিক ডিসপ্লে)', icon: Layers },
  { id: 'promo_items', name: 'Promotional Items & Safety Signboards (প্রমোশনাল পণ্য)', icon: Tag },
  { id: 'apparel_blanks', name: 'Apparel & Sublimation Blanks (গার্মেন্টস ও মগ ব্ল্যাঙ্ক)', icon: Boxes },
  { id: 'ready_products', name: 'General Ready Merchandise (সাধারণ রেডি পণ্য)', icon: Package },
]

export const READY_PRODUCT_PRESETS: Array<{
  id: string
  name: string
  name_bn: string
  category: string
  dimensions: string
  material: string
  finish: string
  unit: UnitOfMeasure
  purchaseUnit: string
  defaultCost: number
  defaultSellingPrice: number
  weightKg: number
  pcsPerCarton: number
  hasBag: boolean
  isFoldable: boolean
  description: string
}> = [
  {
    id: 'x_stand_2x5',
    name: 'X-Stand Display Banner 2×5 ft',
    name_bn: 'এক্স-স্ট্যান্ড ডিসপ্লে ব্যানার ২×৫ ফিট',
    category: 'display_stands',
    dimensions: '2ft × 5ft (60 × 160 cm)',
    material: 'Aluminum Central Hub + Flexible Fiberglass Rods',
    finish: 'Black & Silver Anodized',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 420,
    defaultSellingPrice: 750,
    weightKg: 0.85,
    pcsPerCarton: 50,
    hasBag: true,
    isFoldable: true,
    description: 'Lightweight portable X-banner stand with 4 corner hook tensioners. Includes non-woven carry bag.',
  },
  {
    id: 'x_stand_2.5x6',
    name: 'X-Stand Display Banner 2.5×6 ft (Luxury)',
    name_bn: 'এক্স-স্ট্যান্ড ডিসপ্লে ব্যানার ২.৫×৬ ফিট (লাক্সারি)',
    category: 'display_stands',
    dimensions: '2.5ft × 6ft (80 × 180 cm)',
    material: 'Heavy Duty Aluminum + Reinforced Carbon Rods',
    finish: 'Matte Silver & Black',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 580,
    defaultSellingPrice: 1050,
    weightKg: 1.2,
    pcsPerCarton: 40,
    hasBag: true,
    isFoldable: true,
    description: 'High-stability luxury X-stand with adjustable lower hooks and reinforced center locking knob.',
  },
  {
    id: 'rollup_33x80',
    name: 'Roll-up Banner Stand 33×80 in (Heavy Base)',
    name_bn: 'রোল-আপ ব্যানার স্ট্যান্ড ৩৩×৮০ ইঞ্চি (হেভি বেস)',
    category: 'display_stands',
    dimensions: '33in × 80in (85 × 200 cm)',
    material: 'Thick Gauge Extruded Aluminum Cassette + 3-Section Pole',
    finish: 'Silver Anodized Satin Finish',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 1100,
    defaultSellingPrice: 1850,
    weightKg: 2.3,
    pcsPerCarton: 10,
    hasBag: true,
    isFoldable: true,
    description: 'Self-retracting heavy base pull-up banner stand with dual stabilizing feet and padded carry bag.',
  },
  {
    id: 'rollup_3x6.5',
    name: 'Roll-up Banner Stand 3×6.5 ft (Broad Base Luxury)',
    name_bn: 'রোল-আপ ব্যানার স্ট্যান্ড ৩×৬.৫ ফিট (ব্রড বেস লাক্সারি)',
    category: 'display_stands',
    dimensions: '3ft × 6.5ft (90 × 200 cm)',
    material: 'Teardrop Broad Base Heavy Aluminum Alloy (Footless)',
    finish: 'Polished Chrome Endcaps + Matte Silver Base',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 1650,
    defaultSellingPrice: 2650,
    weightKg: 3.5,
    pcsPerCarton: 6,
    hasBag: true,
    isFoldable: true,
    description: 'Luxury footless teardrop pull-up banner stand with high-tension spring roller and padded canvas bag.',
  },
  {
    id: 'promo_table',
    name: 'PVC Promotion Counter Table / Demo Booth',
    name_bn: 'প্রমোশন কাউন্টার টেবিল ও ডেমো বুথ',
    category: 'promo_items',
    dimensions: '32in (W) × 16in (D) × 80in (H with Header)',
    material: 'Hard White PVC Body + Internal Shelf + Metal Support Poles',
    finish: 'Smooth White Printable Finish',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 2400,
    defaultSellingPrice: 3900,
    weightKg: 7.2,
    pcsPerCarton: 1,
    hasBag: true,
    isFoldable: true,
    description: 'Foldable sales promotion sampling table with internal storage shelf, top header board, and nylon carrying case.',
  },
  {
    id: 'popup_curved_3x3',
    name: 'Pop-Up Curved Backdrop Display Stand 3×3 Grid',
    name_bn: 'পপ-আপ কার্ভড ব্যাকড্রপ ডিসপ্লে ৩×৩ গ্রিড',
    category: 'display_stands',
    dimensions: '8ft × 8ft (230 × 230 cm Curved Front)',
    material: 'Aluminum Scissor Frame + Magnetic Channel Bars + PVC Panels',
    finish: 'Black/Silver Frame + Hard Transport Case',
    unit: 'set',
    purchaseUnit: 'set',
    defaultCost: 7800,
    defaultSellingPrice: 12500,
    weightKg: 18.5,
    pcsPerCarton: 1,
    hasBag: true,
    isFoldable: true,
    description: 'Complete magnetic pop-up trade show display with magnetic graphic hangers, spotlights, and wheeled trolley case.',
  },
  {
    id: 'acrylic_sandwich_a4',
    name: 'Acrylic Poster Sandwich Frame A4 (Wall Mount)',
    name_bn: 'এক্রিলিক পোস্টার স্যান্ডউইচ ফ্রেম এ৪ (ওয়াল মাউন্ট)',
    category: 'acrylic_displays',
    dimensions: 'A4 (210 × 297 mm) + 25mm Border',
    material: 'Dual 3mm + 3mm High-Cast Clear Acrylic Sheets',
    finish: 'Diamond Polished Edges + 4 Stainless Steel Standoff Studs',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 380,
    defaultSellingPrice: 720,
    weightKg: 0.65,
    pcsPerCarton: 20,
    hasBag: false,
    isFoldable: false,
    description: 'Crystal clear acrylic floating wall frame with 4 SS wall standoff spacers and mounting screws.',
  },
  {
    id: 'standoff_pins_pack',
    name: 'Stainless Steel Standoff Spacers 19×25mm (Pack of 4)',
    name_bn: 'এসএস স্ট্যান্ডঅফ পিন ১৯×২৫ মিমি (৪ পিস প্যাক)',
    category: 'signage_accessories',
    dimensions: '19mm Diameter × 25mm Barrel Length',
    material: 'SS 304 Solid Stainless Steel with Rubber Washers',
    finish: 'Brushed Silver / Mirror Gold Finish',
    unit: 'pack',
    purchaseUnit: 'pack',
    defaultCost: 110,
    defaultSellingPrice: 220,
    weightKg: 0.18,
    pcsPerCarton: 100,
    hasBag: false,
    isFoldable: false,
    description: 'Precision sign mounting standoff screws with wall anchors and silicone cushion rings.',
  },
  {
    id: 'led_power_supply_12v',
    name: 'LED Rainproof Power Supply 12V 33A 400W',
    name_bn: 'এলইডি রেইনপ্রুফ পাওয়ার সাপ্লাই ১২ভি ৩৩এ ৪০০ওয়াট',
    category: 'signage_accessories',
    dimensions: '220 × 110 × 45 mm',
    material: 'Extruded Aluminum Housing with Heat Sink Fan',
    finish: 'Silver Metal Protective Shell IP65',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 1050,
    defaultSellingPrice: 1650,
    weightKg: 0.75,
    pcsPerCarton: 20,
    hasBag: false,
    isFoldable: false,
    description: 'High-efficiency AC 220V to DC 12V transformer driver for LED injection modules and neon signage.',
  },
  {
    id: 'wet_floor_caution',
    name: 'Safety Caution Board "Caution Wet Floor" (Yellow PVC)',
    name_bn: 'সেফটি কশন বোর্ড "Caution Wet Floor" (হলুদ পিভিসি)',
    category: 'promo_items',
    dimensions: '12in (W) × 24in (H)',
    material: 'Virgin High-Impact Polypropylene Plastic',
    finish: 'Bright Safety Yellow with Red/Black Screen Print',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 280,
    defaultSellingPrice: 550,
    weightKg: 0.65,
    pcsPerCarton: 30,
    hasBag: false,
    isFoldable: true,
    description: 'Two-sided bilingual folding A-frame floor warning cone for commercial buildings and hotels.',
  },
  {
    id: 'blank_tshirt_180gsm',
    name: 'Blank 100% Cotton Round-Neck T-Shirt 180 GSM',
    name_bn: 'ব্ল্যাঙ্ক কটন রাউন্ড-নেক টি-শার্ট ১৮০ জিএসএম',
    category: 'apparel_blanks',
    dimensions: 'Sizes: S / M / L / XL / XXL',
    material: '100% Combed Cotton Single Jersey (Pre-shrunk)',
    finish: 'Bio-Washed Compact Fabric for DTF / Screen Print',
    unit: 'piece',
    purchaseUnit: 'piece',
    defaultCost: 165,
    defaultSellingPrice: 280,
    weightKg: 0.22,
    pcsPerCarton: 100,
    hasBag: true,
    isFoldable: true,
    description: 'Premium drop-shoulder printing blank ready for DTF heat transfer or silk screen print.',
  },
  {
    id: 'sublimation_mug_white',
    name: 'Sublimation Ceramic Coffee Mug 11oz (Grade A)',
    name_bn: 'সাবলিমেশন সিরামিক কফি মগ ১১ আউন্স (গ্রেড এ)',
    category: 'promo_items',
    dimensions: '11oz / 330ml (8.2cm Dia × 9.5cm H)',
    material: 'High-Gloss Coated White Porcelain Ceramic',
    finish: 'Polymer Sublimation Coating for Heat Press',
    unit: 'piece',
    purchaseUnit: 'box',
    defaultCost: 65,
    defaultSellingPrice: 130,
    weightKg: 0.38,
    pcsPerCarton: 36,
    hasBag: false,
    isFoldable: false,
    description: 'Individually white-boxed grade A polymer coated sublimation blank coffee mug.',
  },
]

export function ReadyProductModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
  suppliers = [],
}: ReadyProductModalProps) {
  // 4 Responsive Master Tabs
  const [activeTab, setActiveTab] = useState<'basic' | 'specs' | 'pricing' | 'inventory'>('basic')

  // Tab 1: Basic Identity & Classification
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('display_stands')
  const [unit, setUnit] = useState<UnitOfMeasure>('piece')
  const [purchaseUnit, setPurchaseUnit] = useState<string>('piece')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')

  // Tab 2: Physical Specs & Packaging Geometry
  const [dimensionsSpec, setDimensionsSpec] = useState('')
  const [materialSpec, setMaterialSpec] = useState('')
  const [finishColor, setFinishColor] = useState('')
  const [unitWeightKg, setUnitWeightKg] = useState<number | ''>('')
  const [hasCarryBag, setHasCarryBag] = useState(false)
  const [isFoldable, setIsFoldable] = useState(false)
  const [isOutdoorRated, setIsOutdoorRated] = useState(false)
  const [isMountable, setIsMountable] = useState(false)
  const [pcsPerCarton, setPcsPerCarton] = useState<number | ''>('')
  const [cartonDimensions, setCartonDimensions] = useState('')
  const [cartonWeightKg, setCartonWeightKg] = useState<number | ''>('')
  const [minOrderQty, setMinOrderQty] = useState<number>(1)
  const [minBillableQty, setMinBillableQty] = useState<number>(1)

  // Tab 3: Commercial Pricing & Customer Tiers
  const [sellingPrice, setSellingPrice] = useState<number | ''>('')
  const [baseCost, setBaseCost] = useState<number | ''>('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [freightCost, setFreightCost] = useState<number | ''>('')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [targetMargin, setTargetMargin] = useState<number>(35)
  const [minAllowedMargin, setMinAllowedMargin] = useState<number>(15)

  // Multi-tier customer prices
  const [priceTiers, setPriceTiers] = useState<{
    retail: number | ''
    corporate: number | ''
    dealer: number | ''
    wholesale: number | ''
    custom: number | ''
  }>({
    retail: '',
    corporate: '',
    dealer: '',
    wholesale: '',
    custom: '',
  })

  // Tab 4: Inventory, Suppliers & Taxes
  const [openingStock, setOpeningStock] = useState<number | ''>('')
  const [reorderLevel, setReorderLevel] = useState<number | ''>('')
  const [maxStock, setMaxStock] = useState<number | ''>('')
  const [warehouseLocation, setWarehouseLocation] = useState('')
  const [preferredSupplierId, setPreferredSupplierId] = useState('')
  const [supplierItemCode, setSupplierItemCode] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState<number | ''>('')
  const [vatApplicable, setVatApplicable] = useState(false)
  const [isTaxInclusive, setIsTaxInclusive] = useState(false)
  const [taxRate, setTaxRate] = useState<number>(7.5)
  const [allowManualOverride, setAllowManualOverride] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setBarcode((initialData as any).barcode || '')
      setBrand((initialData as any).brand || '')
      setCategory(initialData.category || 'display_stands')
      setUnit(initialData.selling_unit || initialData.unit || 'piece')
      setPurchaseUnit(initialData.purchase_unit || initialData.unit || 'piece')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')

      setDimensionsSpec(initialData.dimensions_spec || '')
      setMaterialSpec(initialData.material_spec || '')
      setFinishColor((initialData as any).finish_color || '')
      setUnitWeightKg((initialData as any).unit_weight_kg ?? '')
      setHasCarryBag(Boolean((initialData as any).has_carry_bag))
      setIsFoldable(Boolean((initialData as any).is_foldable))
      setIsOutdoorRated(Boolean((initialData as any).is_outdoor_rated))
      setIsMountable(Boolean((initialData as any).is_mountable))
      setPcsPerCarton((initialData as any).pcs_per_carton ?? '')
      setCartonDimensions((initialData as any).carton_dimensions || '')
      setCartonWeightKg((initialData as any).carton_weight_kg ?? '')
      setMinOrderQty(initialData.min_order_quantity || 1)
      setMinBillableQty(initialData.min_billable_quantity || 1)

      const sp = initialData.selling_price || ''
      const cost = initialData.base_cost ?? initialData.purchase_price ?? ''
      setSellingPrice(sp)
      setBaseCost(cost)
      setPurchasePrice(initialData.purchase_price ?? cost)
      setFreightCost((initialData as any).freight_cost ?? '')
      setMinPrice(initialData.min_price || '')
      setTargetMargin(initialData.target_margin_percentage ?? 35)
      setMinAllowedMargin(initialData.min_allowed_margin_percent ?? 15)

      const tiers = initialData.price_tiers || {}
      setPriceTiers({
        retail: tiers.retail ?? sp,
        corporate: tiers.corporate ?? '',
        dealer: tiers.dealer ?? '',
        wholesale: tiers.wholesale ?? '',
        custom: tiers.custom ?? '',
      })

      setOpeningStock((initialData as any).opening_stock ?? '')
      setReorderLevel((initialData as any).reorder_level ?? '')
      setMaxStock((initialData as any).max_stock ?? '')
      setWarehouseLocation((initialData as any).warehouse_location || '')
      setPreferredSupplierId((initialData as any).preferred_supplier_id || '')
      setSupplierItemCode((initialData as any).supplier_item_code || '')
      setLeadTimeDays((initialData as any).lead_time_days ?? '')
      setVatApplicable(Boolean(initialData.vat_applicable))
      setIsTaxInclusive(Boolean(initialData.is_tax_inclusive))
      setTaxRate(initialData.tax_rate ?? 7.5)
      setAllowManualOverride(initialData.allow_manual_override !== false)
    } else {
      setName('')
      setNameBn('')
      setSku(`RP-${Date.now().toString().slice(-5)}`)
      setBarcode('')
      setBrand('')
      setCategory('display_stands')
      setUnit('piece')
      setPurchaseUnit('piece')
      setIsActive(true)
      setDescription('')

      setDimensionsSpec('2ft × 5ft (60 × 160 cm)')
      setMaterialSpec('Aluminum + Fiberglass Tension Rods')
      setFinishColor('Silver Anodized / Black')
      setUnitWeightKg(0.85)
      setHasCarryBag(true)
      setIsFoldable(true)
      setIsOutdoorRated(false)
      setIsMountable(false)
      setPcsPerCarton(50)
      setCartonDimensions('')
      setCartonWeightKg('')
      setMinOrderQty(1)
      setMinBillableQty(1)

      setSellingPrice('')
      setBaseCost('')
      setPurchasePrice('')
      setFreightCost('')
      setMinPrice('')
      setTargetMargin(35)
      setMinAllowedMargin(15)
      setPriceTiers({
        retail: '',
        corporate: '',
        dealer: '',
        wholesale: '',
        custom: '',
      })

      setOpeningStock('')
      setReorderLevel(10)
      setMaxStock('')
      setWarehouseLocation('')
      setPreferredSupplierId('')
      setSupplierItemCode('')
      setLeadTimeDays(3)
      setVatApplicable(false)
      setIsTaxInclusive(false)
      setTaxRate(7.5)
      setAllowManualOverride(true)
    }
    setActiveTab('basic')
    setErrorMessage(null)
  }, [initialData, isOpen])

  // Total Landed Cost (Base Purchase Cost + Freight/Import Surcharge)
  const totalLandedCost = useMemo(() => {
    const pCost = Number(baseCost || purchasePrice) || 0
    const fCost = Number(freightCost) || 0
    return pCost + fCost
  }, [baseCost, purchasePrice, freightCost])

  // Live Gross Margin & Profit Calculation
  const marginMetrics = useMemo(() => {
    const cost = totalLandedCost
    const sp = Number(sellingPrice) || 0
    return calculateGrossMargin(cost, sp)
  }, [totalLandedCost, sellingPrice])

  // Auto-fill price tiers based on standard segment percentages
  const handleAutoFillTiers = () => {
    const sp = Number(sellingPrice) || 0
    if (sp <= 0) return

    setPriceTiers({
      retail: sp,
      corporate: Math.round(sp * 0.95), // 5% discount
      dealer: Math.round(sp * 0.90),    // 10% discount
      wholesale: Math.round(sp * 0.85), // 15% discount
      custom: sp,
    })
  }

  // 1-Click Preset Template Loader
  const handleApplyPreset = (preset: typeof READY_PRODUCT_PRESETS[0]) => {
    setName(preset.name)
    setNameBn(preset.name_bn)
    setCategory(preset.category)
    setDimensionsSpec(preset.dimensions)
    setMaterialSpec(preset.material)
    setFinishColor(preset.finish)
    setUnit(preset.unit)
    setPurchaseUnit(preset.purchaseUnit)
    setBaseCost(preset.defaultCost)
    setPurchasePrice(preset.defaultCost)
    setSellingPrice(preset.defaultSellingPrice)
    setUnitWeightKg(preset.weightKg)
    setPcsPerCarton(preset.pcsPerCarton)
    setHasCarryBag(preset.hasBag)
    setIsFoldable(preset.isFoldable)
    setDescription(preset.description)

    // Auto calculate initial price tiers
    setPriceTiers({
      retail: preset.defaultSellingPrice,
      corporate: Math.round(preset.defaultSellingPrice * 0.95),
      dealer: Math.round(preset.defaultSellingPrice * 0.90),
      wholesale: Math.round(preset.defaultSellingPrice * 0.85),
      custom: preset.defaultSellingPrice,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Product name is required.')
      setActiveTab('basic')
      return
    }

    if (sellingPrice === '' || Number(sellingPrice) < 0) {
      setErrorMessage('Please enter a valid base selling price.')
      setActiveTab('pricing')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const sp = Number(sellingPrice) || 0
      const cost = totalLandedCost
      const purPrice = Number(purchasePrice || baseCost) || cost
      const minimumPrice =
        minPrice !== '' && Number(minPrice) > 0
          ? Number(minPrice)
          : Math.round(sp * (1 - (minAllowedMargin / 100)))

      const finalPriceTiers: ProductPriceTiers = {
        retail: priceTiers.retail !== '' ? Number(priceTiers.retail) : sp,
        corporate: priceTiers.corporate !== '' ? Number(priceTiers.corporate) : sp,
        dealer: priceTiers.dealer !== '' ? Number(priceTiers.dealer) : sp,
        wholesale: priceTiers.wholesale !== '' ? Number(priceTiers.wholesale) : sp,
        custom: priceTiers.custom !== '' ? Number(priceTiers.custom) : sp,
      }

      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `RP-${Date.now().toString().slice(-5)}`,
        barcode: barcode.trim() || undefined,
        brand: brand.trim() || undefined,
        category: category || 'display_stands',
        product_type: 'ready_product',
        entity_type: 'product',
        commercial_type: 'ready_product',
        is_ready_product: true,
        unit,
        selling_unit: unit,
        purchase_unit: purchaseUnit || unit,
        pricing_method: 'per_piece',
        selling_price: sp,
        base_cost: cost,
        purchase_price: purPrice,
        freight_cost: freightCost !== '' ? Number(freightCost) : 0,
        min_price: minimumPrice,
        target_margin_percentage: Number(targetMargin) || 35.0,
        min_allowed_margin_percent: Number(minAllowedMargin) || 15.0,
        cost_basis_type: 'direct_cost',
        price_tiers: finalPriceTiers,
        dimensions_spec: dimensionsSpec.trim() || undefined,
        material_spec: materialSpec.trim() || undefined,
        finish_color: finishColor.trim() || undefined,
        unit_weight_kg: unitWeightKg !== '' ? Number(unitWeightKg) : undefined,
        has_carry_bag: hasCarryBag,
        is_foldable: isFoldable,
        is_outdoor_rated: isOutdoorRated,
        is_mountable: isMountable,
        pcs_per_carton: pcsPerCarton !== '' ? Number(pcsPerCarton) : undefined,
        carton_dimensions: cartonDimensions.trim() || undefined,
        carton_weight_kg: cartonWeightKg !== '' ? Number(cartonWeightKg) : undefined,
        opening_stock: openingStock !== '' ? Number(openingStock) : undefined,
        reorder_level: reorderLevel !== '' ? Number(reorderLevel) : undefined,
        max_stock: maxStock !== '' ? Number(maxStock) : undefined,
        warehouse_location: warehouseLocation.trim() || undefined,
        preferred_supplier_id: preferredSupplierId || undefined,
        supplier_item_code: supplierItemCode.trim() || undefined,
        lead_time_days: leadTimeDays !== '' ? Number(leadTimeDays) : undefined,
        vat_applicable: vatApplicable,
        is_tax_inclusive: isTaxInclusive,
        tax_rate: Number(taxRate) || 0,
        allow_manual_override: allowManualOverride,
        is_active: isActive,
        description: description.trim() || undefined,
        min_order_quantity: minOrderQty || 1,
        min_billable_quantity: minBillableQty || minOrderQty || 1,
        requires_production: false,
        requires_design: false,
        requires_approval: false,
        requires_finishing: false,
        requires_installation: false,
      } as any)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save ready product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const TABS_CONFIG = [
    { id: 'basic', label: '1. Basic & Identity', icon: Package },
    { id: 'specs', label: '2. Physical Specs', icon: Sliders },
    { id: 'pricing', label: '3. Costing & Pricing', icon: DollarSign },
    { id: 'inventory', label: '4. Inventory & Taxes', icon: Warehouse },
  ] as const

  const currentTabIndex = TABS_CONFIG.findIndex((t) => t.id === activeTab)

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0 ring-1 ring-blue-500/20">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Edit Ready Product: ${initialData.name}` : 'New Ready Product Master'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                Ready to Sell
              </Badge>
              {sellingPrice !== '' && Number(sellingPrice) > 0 && (
                <Badge variant="outline" className="text-[10px] font-mono py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  ৳{Number(sellingPrice).toFixed(2)} / {unit}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Finished retail hardware, banner stands, acrylic displays, signage accessories, and print blanks sold by unit.
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentTabIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab(TABS_CONFIG[currentTabIndex - 1].id)}
                className="h-10 px-3.5 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            )}

            {currentTabIndex < TABS_CONFIG.length - 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'basic' && !name.trim()) {
                    setErrorMessage('Product name is required before proceeding.')
                    return
                  }
                  setErrorMessage(null)
                  setActiveTab(TABS_CONFIG[currentTabIndex + 1].id)
                }}
                className="h-10 px-4 rounded-xl font-bold border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1.5 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  <span>{initialData ? 'Update Ready Product' : 'Save Ready Product'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium shadow-xs animate-in fade-in-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 4-Tab Stepper Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700/60">
          {TABS_CONFIG.map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-2 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap text-xs relative',
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold ring-1 ring-slate-200 dark:ring-slate-600'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400')} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: BASIC IDENTITY & 1-CLICK TEMPLATES */}
        {/* ======================================================== */}
        {activeTab === 'basic' && (
          <div className="space-y-4 animate-in fade-in-0">
            {/* Section 1: Core Identification */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Product Identity & Categorization
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Product Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. X-Stand Display 2×5 ft, Roll-up Banner Stand 33×80 in..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 text-xs"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Bengali Name (বাংলা নাম)
                    </Label>
                    <Input
                      placeholder="যেমন: এক্স-স্ট্যান্ড ডিসপ্লে ব্যানার"
                      value={nameBn}
                      onChange={(e) => setNameBn(e.target.value)}
                      className="h-9 text-xs font-bengali"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      SKU / Item Code
                    </Label>
                    <Input
                      placeholder="e.g. XSTAND-2X5"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="h-9 text-xs font-mono uppercase"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Barcode / EAN-13 (ঐচ্ছিক)
                    </Label>
                    <div className="relative">
                      <QrCode className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Scan or enter barcode"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="pl-8 h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold mb-1 block">
                      Category (ক্যাটাগরি)
                    </Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                    >
                      {READY_PRODUCT_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug || c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Brand / Maker
                    </Label>
                    <Input
                      placeholder="e.g. MasterDisplay, China Import"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Selling Unit <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                    >
                      {READY_PRODUCT_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Product Description & Selling Highlights
                  </Label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Professional display stand with high-elastic fiberglass rods, anodized aluminum base, and waterproof padded carry bag..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Active in Sales & Billing Catalog</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PHYSICAL SPECS & PACKAGING GEOMETRY */}
        {/* ======================================================== */}
        {activeTab === 'specs' && (
          <div className="space-y-4 animate-in fade-in-0">
            {/* Section 1: Dimensions & Build Material */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Physical Dimensions & Construction Specs
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Display Dimensions / Size
                  </Label>
                  <Input
                    placeholder="e.g. 2ft × 5ft (60 × 160 cm), 33 × 80 in"
                    value={dimensionsSpec}
                    onChange={(e) => setDimensionsSpec(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Frame / Body Material
                  </Label>
                  <Input
                    placeholder="e.g. Aluminum Profile + Fiberglass Rods"
                    value={materialSpec}
                    onChange={(e) => setMaterialSpec(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Finish / Color
                  </Label>
                  <Input
                    placeholder="e.g. Silver Anodized / Matte Black"
                    value={finishColor}
                    onChange={(e) => setFinishColor(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Unit Net Weight (kg)
                  </Label>
                  <div className="relative">
                    <Scale className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.25"
                      value={unitWeightKg}
                      onChange={(e) => setUnitWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-8 h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Purchase Unit
                  </Label>
                  <select
                    value={purchaseUnit}
                    onChange={(e) => setPurchaseUnit(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                  >
                    {READY_PRODUCT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inclusions & Features Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={hasCarryBag}
                    onChange={(e) => setHasCarryBag(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Includes Carry Bag</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={isFoldable}
                    onChange={(e) => setIsFoldable(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Foldable / Portable</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={isOutdoorRated}
                    onChange={(e) => setIsOutdoorRated(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Outdoor Wind-Rated</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={isMountable}
                    onChange={(e) => setIsMountable(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Wall / Table Mount</span>
                </label>
              </div>
            </div>

            {/* Section 2: Master Carton & Wholesale Packaging */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                  <Boxes className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Master Carton Packing & Order Quantities
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Pieces Per Master Carton
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={pcsPerCarton}
                    onChange={(e) => setPcsPerCarton(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Min Order Quantity (MOQ)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(parseInt(e.target.value) || 1)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Min Billable Quantity
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={minBillableQty}
                    onChange={(e) => setMinBillableQty(parseInt(e.target.value) || 1)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Carton Dimensions (L × W × H cm)
                  </Label>
                  <Input
                    placeholder="e.g. 105 × 40 × 30 cm"
                    value={cartonDimensions}
                    onChange={(e) => setCartonDimensions(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Carton Gross Weight (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 24.5"
                    value={cartonWeightKg}
                    onChange={(e) => setCartonWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: COMMERCIAL PRICING, MARGINS & TIERS */}
        {/* ======================================================== */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 animate-in fade-in-0">
            {/* 1. Base Rates & Landed Cost Breakdown */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Commercial Selling Price & Landed Cost Structure
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Base Selling Price (৳ / {unit}) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 750"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      required
                      className="pl-7 h-9 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Factory Purchase Price (৳)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 420"
                      value={baseCost}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                        setBaseCost(val)
                        setPurchasePrice(val)
                      }}
                      className="pl-7 h-9 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Freight / Landed Add (৳)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 30"
                      value={freightCost}
                      onChange={(e) => setFreightCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-7 h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Floor Protect Price (৳)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Floor rate"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-7 h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Profit & Margin Economics Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Live Yield & Margin Analysis (Landed Cost: ৳{totalLandedCost.toFixed(2)})</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-md',
                      marginMetrics.grossMarginPercent >= targetMargin
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        : marginMetrics.grossMarginPercent >= minAllowedMargin
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                    )}
                  >
                    {marginMetrics.grossMarginPercent >= targetMargin ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" /> Healthy Margin
                      </span>
                    ) : marginMetrics.grossMarginPercent >= minAllowedMargin ? (
                      'Acceptable Margin'
                    ) : (
                      'Below Floor Margin'
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Profit / Unit</span>
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {formatBDT(marginMetrics.grossProfit)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Gross Margin</span>
                    <span
                      className={cn(
                        'text-sm font-black font-mono',
                        marginMetrics.grossMarginPercent >= minAllowedMargin
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {marginMetrics.grossMarginPercent}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Markup</span>
                    <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                      {marginMetrics.markupPercent}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block text-slate-600 dark:text-slate-400">
                      Target Gross Margin (%)
                    </Label>
                    <Input
                      type="number"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 35)}
                      className="h-8 text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block text-slate-600 dark:text-slate-400">
                      Minimum Allowed Margin (%) (Floor)
                    </Label>
                    <Input
                      type="number"
                      value={minAllowedMargin}
                      onChange={(e) => setMinAllowedMargin(parseFloat(e.target.value) || 15)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Customer Tier Pricing */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Customer Tier Segment Rates
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Auto-applied when preparing quotations & sales for specific customer types.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAutoFillTiers}
                  className="h-7 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Auto-calculate Tiers
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {/* Retail Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">Retail</span>
                    <span className="text-[9px] text-slate-400">100%</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder={String(sellingPrice || '0')}
                      value={priceTiers.retail}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          retail: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Corporate Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400">Corporate</span>
                    <span className="text-[9px] text-purple-500 font-medium">-5%</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 712"
                      value={priceTiers.corporate}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          corporate: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Dealer Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">Dealer</span>
                    <span className="text-[9px] text-blue-500 font-medium">-10%</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 675"
                      value={priceTiers.dealer}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          dealer: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Wholesale Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Wholesale</span>
                    <span className="text-[9px] text-emerald-500 font-medium">-15%</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 635"
                      value={priceTiers.wholesale}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          wholesale: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Custom VIP Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Custom</span>
                    <span className="text-[9px] text-amber-500 font-medium">VIP</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Custom"
                      value={priceTiers.custom}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          custom: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: INVENTORY, WAREHOUSE & TAX CONTROL */}
        {/* ======================================================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 animate-in fade-in-0">
            {/* Section 1: Stock Levels & Reorder Triggers */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                  <Warehouse className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Warehouse Stock & Reorder Thresholds
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Initial / Opening Stock ({unit})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Reorder Alert Level ({unit})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="h-9 text-xs font-mono font-bold text-amber-600 dark:text-amber-400"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Max Stock Storage Cap
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 200"
                    value={maxStock}
                    onChange={(e) => setMaxStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Warehouse Bin / Shelf Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="e.g. Main Warehouse - Shelf B-04"
                      value={warehouseLocation}
                      onChange={(e) => setWarehouseLocation(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Procurement Lead Time (Days)
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      placeholder="e.g. 3"
                      value={leadTimeDays}
                      onChange={(e) => setLeadTimeDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="pl-8 h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {suppliers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Preferred Supplier
                    </Label>
                    <select
                      value={preferredSupplierId}
                      onChange={(e) => setPreferredSupplierId(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                    >
                      <option value="">Select Preferred Supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Supplier Catalog / Item Code
                    </Label>
                    <Input
                      placeholder="e.g. SUP-XS-001"
                      value={supplierItemCode}
                      onChange={(e) => setSupplierItemCode(e.target.value)}
                      className="h-9 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Taxes & Governance */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                  <Percent className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Tax & Sales Staff Governance
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={vatApplicable}
                      onChange={(e) => setVatApplicable(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>VAT / Tax Applicable</span>
                  </label>

                  {vatApplicable && (
                    <div className="pl-6 pt-1">
                      <Label className="text-[11px] font-semibold mb-1 block">
                        Tax Rate (%)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-mono max-w-[140px]"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={isTaxInclusive}
                      onChange={(e) => setIsTaxInclusive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Selling Price is Tax-Inclusive</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={allowManualOverride}
                      onChange={(e) => setAllowManualOverride(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Allow Sales Staff Rate Override on Quotations</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  )
}

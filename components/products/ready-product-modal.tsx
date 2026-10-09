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
 ArrowLeft,
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
import { dispatchToast } from '@/components/shared/toast-feedback'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'
import type { ProductRecord, UnitOfMeasure, ProductPriceTiers } from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { formatBDT } from '@/lib/formatters'
import { calculateGrossMargin, isUserSku } from '@/lib/units'

interface ReadyProductModalProps {
 isOpen: boolean
 onClose: () => void
 onSave: (productData: Partial<ProductRecord>) => Promise<void>
 initialData?: ProductRecord | null
 categories?: ProductCategoryRecord[]
 suppliers?: Array<{ id: string; name: string; contact_person?: string; phone?: string }>
 onBack?: () => void
}

export const READY_PRODUCT_UNITS: { value: UnitOfMeasure; label: string; labelBn: string }[] = [
  { value: 'piece', label: 'Piece (pcs)', labelBn: 'পিস (pcs)' },
  { value: 'set', label: 'Set', labelBn: 'সেট' },
  { value: 'pack', label: 'Pack', labelBn: 'প্যাক' },
  { value: 'box', label: 'Box / Carton', labelBn: 'বক্স / কার্টন' },
  { value: 'item', label: 'Item', labelBn: 'আইটেম' },
  { value: 'pair', label: 'Pair', labelBn: 'জোড়া' },
  { value: 'roll', label: 'Roll', labelBn: 'রোল' },
  { value: 'liter', label: 'Liter', labelBn: 'লিটার' },
  { value: 'kg', label: 'KG', labelBn: 'কেজি' },
  { value: 'meter', label: 'Meter', labelBn: 'মিটার' },
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
 name: 'Safety Caution Board"Caution Wet Floor"(Yellow PVC)',
 name_bn: 'সেফটি কশন বোর্ড"Caution Wet Floor"(হলুদ পিভিসি)',
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
 onBack,
}: ReadyProductModalProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
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
 const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

 useEffect(() => {
 if (initialData) {
 setName(initialData.name || '')
 setNameBn(initialData.name_bn || '')
 setSku(isUserSku(initialData.sku) ? initialData.sku : '')
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

  // Accurately separate factory purchase price and freight / landed add
  const savedFreight =
    (initialData as any).freight_cost !== undefined && (initialData as any).freight_cost !== null && (initialData as any).freight_cost !== ''
      ? Number((initialData as any).freight_cost)
      : (initialData.pricing_formula as any)?.freight_cost !== undefined && (initialData.pricing_formula as any)?.freight_cost !== null
      ? Number((initialData.pricing_formula as any)?.freight_cost)
      : (initialData.cost_breakdown as any)?.delivery_cost !== undefined && (initialData.cost_breakdown as any)?.delivery_cost !== null
      ? Number((initialData.cost_breakdown as any)?.delivery_cost)
      : 0

  const savedFactoryPrice =
    (initialData.pricing_formula as any)?.factory_purchase_price !== undefined && (initialData.pricing_formula as any)?.factory_purchase_price !== null
      ? Number((initialData.pricing_formula as any)?.factory_purchase_price)
      : initialData.purchase_price !== undefined && initialData.purchase_price !== null && Number(initialData.purchase_price) > 0
      ? (savedFreight > 0 && Number(initialData.purchase_price) === Number(initialData.base_cost)
          ? Math.max(0, Number(initialData.purchase_price) - savedFreight)
          : Number(initialData.purchase_price))
      : (savedFreight > 0 && Number(initialData.base_cost) > savedFreight
          ? Math.max(0, Number(initialData.base_cost) - savedFreight)
          : (initialData.base_cost ? Number(initialData.base_cost) : ''))

  const inferredFreight =
    savedFreight > 0
      ? savedFreight
      : (typeof savedFactoryPrice === 'number' && Number(initialData.base_cost) > savedFactoryPrice)
      ? Math.round((Number(initialData.base_cost) - savedFactoryPrice) * 100) / 100
      : ''

  setSellingPrice(sp)
  setPurchasePrice(savedFactoryPrice !== '' ? savedFactoryPrice : '')
  setFreightCost(inferredFreight !== 0 && inferredFreight !== '' ? inferredFreight : '')
  setBaseCost(savedFactoryPrice !== '' ? savedFactoryPrice : '')
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

 setOpeningStock(
        (initialData as any).opening_stock ??
        (initialData as any).current_stock ??
        (initialData as any).stock ??
        (initialData.pricing_formula as any)?.opening_stock ??
        (initialData.pricing_formula as any)?.current_stock ??
        (initialData.pricing_formula as any)?.stock ??
        ''
      )
 setReorderLevel(
        (initialData as any).reorder_level ??
        (initialData as any).min_stock_level ??
        (initialData.pricing_formula as any)?.reorder_level ??
        (initialData.pricing_formula as any)?.min_stock_level ??
        ''
      )
 setMaxStock(
        (initialData as any).max_stock ??
        (initialData.pricing_formula as any)?.max_stock ??
        ''
      )
 setWarehouseLocation(
        (initialData as any).warehouse_location ||
        (initialData.pricing_formula as any)?.warehouse_location ||
        ''
      )
 setPreferredSupplierId((initialData as any).preferred_supplier_id || (initialData.pricing_formula as any)?.preferred_supplier_id || '')
 setSupplierItemCode((initialData as any).supplier_item_code || (initialData.pricing_formula as any)?.supplier_item_code || '')
 setLeadTimeDays((initialData as any).lead_time_days ?? (initialData.pricing_formula as any)?.lead_time_days ?? '')
 setVatApplicable(Boolean(initialData.vat_applicable))
 setIsTaxInclusive(Boolean(initialData.is_tax_inclusive))
 setTaxRate(initialData.tax_rate ?? 7.5)
 setAllowManualOverride(initialData.allow_manual_override !== false)
    } else {
 setName('')
 setNameBn('')
 setSku('')
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
  }, [initialData, isOpen])

  // Total Landed Cost (Factory Purchase Cost + Freight/Landed Add)
  const totalLandedCost = useMemo(() => {
    const pCost = Number(purchasePrice !== '' ? purchasePrice : baseCost) || 0
    const fCost = Number(freightCost) || 0
    return pCost + fCost
  }, [purchasePrice, baseCost, freightCost])

  // Live Gross Margin & Profit Calculation
 const marginMetrics = useMemo(() => {
 const cost = totalLandedCost
 const sp = Number(sellingPrice) || 0
 return calculateGrossMargin(cost, sp)
  }, [totalLandedCost, sellingPrice])

  // Sync Customer Tier Segment Rates linked with Price Settings:
  // Wholesale (minimum price), Dealer (+5%), Corporate (+10%), Retail (+15%), VIP (Custom)
  const handleUpdateLinkWithPriceSettings = () => {
    const baseMin =
      minPrice !== '' && Number(minPrice) > 0
        ? Number(minPrice)
        : totalLandedCost > 0
        ? Number(totalLandedCost)
        : purchasePrice !== '' && Number(purchasePrice) > 0
        ? Number(purchasePrice)
        : sellingPrice !== '' && Number(sellingPrice) > 0
        ? Math.round(Number(sellingPrice) / 1.15)
        : 0

    if (baseMin <= 0) {
      dispatchToast({
        type: 'warning',
        title: tBilingual('Minimum Price Required', 'সর্বনিম্ন মূল্য আবশ্যক'),
        message: tBilingual(
          'Please enter Minimum Selling Price or Purchase Price to calculate tier rates.',
          'গ্রাহক স্তরের রেট হিসাব করতে সর্বনিম্ন বিক্রয় মূল্য বা ক্রয় মূল্য প্রদান করুন।'
        ),
      })
      return
    }

    const wholesaleRate = Math.round(baseMin)
    const dealerRate = Math.round(baseMin * 1.05)
    const corporateRate = Math.round(baseMin * 1.10)
    const retailRate = Math.round(baseMin * 1.15)
    const customRate = priceTiers.custom !== '' ? priceTiers.custom : retailRate

    setMinPrice(wholesaleRate)
    setSellingPrice(retailRate)
    setPriceTiers({
      wholesale: wholesaleRate,
      dealer: dealerRate,
      corporate: corporateRate,
      retail: retailRate,
      custom: customRate,
    })

    dispatchToast({
      type: 'success',
      title: tBilingual('Price Settings Linked', 'প্রাইস সেটিংস লিংক সম্পন্ন'),
      message: tBilingual(
        `Tiers updated: Wholesale (৳${wholesaleRate}), Dealer (৳${dealerRate}), Corporate (৳${corporateRate}), Retail (৳${retailRate})`,
        `রেট আপডেট: পাইকারি (৳${wholesaleRate}), ডিলার (৳${dealerRate}), কর্পোরেট (৳${corporateRate}), রিটেইল (৳${retailRate})`
      ),
    })
  }

  const handleAutoFillTiers = handleUpdateLinkWithPriceSettings

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
    setFreightCost('')
    setUnitWeightKg(preset.weightKg)
    setPcsPerCarton(preset.pcsPerCarton)
    setHasCarryBag(preset.hasBag)
    setIsFoldable(preset.isFoldable)
    setDescription(preset.description)

    // Link initial price tiers with price settings formula
    const baseMin = preset.defaultCost
    const ws = baseMin
    const dlr = Math.round(baseMin * 1.05)
    const corp = Math.round(baseMin * 1.10)
    const ret = Math.round(baseMin * 1.15)
    setMinPrice(ws)
    setSellingPrice(preset.defaultSellingPrice || ret)
    setPriceTiers({
      wholesale: ws,
      dealer: dlr,
      corporate: corp,
      retail: preset.defaultSellingPrice || ret,
      custom: preset.defaultSellingPrice || ret,
    })
  }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!name.trim()) {
 setFieldErrors({ name: 'Product name is required.' })
 setActiveTab('basic')
 dispatchToast({
 type: 'warning',
 title: 'Product Name Required',
 message: 'Product name is required before proceeding.',
      })
 return
    }

 if (sellingPrice === '' || Number(sellingPrice) < 0) {
 setFieldErrors({ sellingPrice: 'Please enter a valid base selling price.' })
 setActiveTab('pricing')
 dispatchToast({
 type: 'warning',
 title: 'Selling Price Required',
 message: 'Please enter a valid base selling price.',
      })
 return
    }

 setIsSubmitting(true)
 setFieldErrors({})

 try {
  const sp = Number(sellingPrice) || 0
  const purPrice = Number(purchasePrice !== '' ? purchasePrice : baseCost) || 0
  const fCost = freightCost !== '' ? Number(freightCost) : 0
  const cost = purPrice + fCost
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
    sku: sku.trim() || '',
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
    freight_cost: fCost,
    cost_breakdown: {
      material_cost: purPrice,
      delivery_cost: fCost,
      freight_cost: fCost,
      other_direct_cost: 0,
      total_direct_cost: cost,
    },
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
 opening_stock: (() => {
   if (openingStock !== '') return Number(openingStock)
   return initialData ? Number((initialData as any)?.opening_stock ?? (initialData?.pricing_formula as any)?.opening_stock ?? 0) : undefined
 })(),
 current_stock: (() => {
   if (!initialData) return openingStock !== '' ? Number(openingStock) : undefined
   const prevOpening = Number((initialData as any)?.opening_stock ?? (initialData?.pricing_formula as any)?.opening_stock ?? 0)
   const newOpening = openingStock !== '' ? Number(openingStock) : prevOpening
   const delta = newOpening - prevOpening
   const prevCurrent = Number(
     (initialData as any)?.current_stock ??
     (initialData as any)?.stock ??
     (initialData?.pricing_formula as any)?.current_stock ??
     (initialData?.pricing_formula as any)?.stock ??
     prevOpening
   )
   return Math.max(0, prevCurrent + delta)
 })(),
 stock: (() => {
   if (!initialData) return openingStock !== '' ? Number(openingStock) : undefined
   const prevOpening = Number((initialData as any)?.opening_stock ?? (initialData?.pricing_formula as any)?.opening_stock ?? 0)
   const newOpening = openingStock !== '' ? Number(openingStock) : prevOpening
   const delta = newOpening - prevOpening
   const prevCurrent = Number(
     (initialData as any)?.current_stock ??
     (initialData as any)?.stock ??
     (initialData?.pricing_formula as any)?.current_stock ??
     (initialData?.pricing_formula as any)?.stock ??
     prevOpening
   )
   return Math.max(0, prevCurrent + delta)
 })(),
 reorder_level: reorderLevel !== '' ? Number(reorderLevel) : undefined,
 min_stock_level: reorderLevel !== '' ? Number(reorderLevel) : undefined,
 max_stock: maxStock !== '' ? Number(maxStock) : undefined,
 warehouse_location: warehouseLocation.trim() || undefined,
 preferred_supplier_id: preferredSupplierId || undefined,
 supplier_item_code: supplierItemCode.trim() || undefined,
 lead_time_days: leadTimeDays !== '' ? Number(leadTimeDays) : undefined,
 pricing_formula: {
          ...(typeof initialData?.pricing_formula === 'object' && initialData?.pricing_formula !== null ? initialData.pricing_formula : {}),
          factory_purchase_price: purPrice,
          freight_cost: fCost,
          total_landed_cost: cost,
 opening_stock: (() => {
   if (openingStock !== '') return Number(openingStock)
   return initialData ? Number((initialData as any)?.opening_stock ?? (initialData?.pricing_formula as any)?.opening_stock ?? 0) : undefined
 })(),
 current_stock: (() => {
   if (!initialData) return openingStock !== '' ? Number(openingStock) : undefined
   const prevOpening = Number((initialData as any)?.opening_stock ?? (initialData?.pricing_formula as any)?.opening_stock ?? 0)
   const newOpening = openingStock !== '' ? Number(openingStock) : prevOpening
   const delta = newOpening - prevOpening
   const prevCurrent = Number(
     (initialData as any)?.current_stock ??
     (initialData as any)?.stock ??
     (initialData?.pricing_formula as any)?.current_stock ??
     (initialData?.pricing_formula as any)?.stock ??
     prevOpening
   )
   return Math.max(0, prevCurrent + delta)
 })(),
 stock: (() => {
   if (!initialData) return openingStock !== '' ? Number(openingStock) : undefined
   const prevOpening = Number((initialData as any)?.opening_stock ?? (initialData?.pricing_formula as any)?.opening_stock ?? 0)
   const newOpening = openingStock !== '' ? Number(openingStock) : prevOpening
   const delta = newOpening - prevOpening
   const prevCurrent = Number(
     (initialData as any)?.current_stock ??
     (initialData as any)?.stock ??
     (initialData?.pricing_formula as any)?.current_stock ??
     (initialData?.pricing_formula as any)?.stock ??
     prevOpening
   )
   return Math.max(0, prevCurrent + delta)
 })(),
 reorder_level: reorderLevel !== '' ? Number(reorderLevel) : undefined,
 min_stock_level: reorderLevel !== '' ? Number(reorderLevel) : undefined,
 max_stock: maxStock !== '' ? Number(maxStock) : undefined,
 warehouse_location: warehouseLocation.trim() || undefined,
 preferred_supplier_id: preferredSupplierId || undefined,
 supplier_item_code: supplierItemCode.trim() || undefined,
 lead_time_days: leadTimeDays !== '' ? Number(leadTimeDays) : undefined,
        },
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
 dispatchToast({
 type: 'error',
 title: 'Save Failed',
 message: err.message || 'Failed to save ready product.',
      })
    } finally {
 setIsSubmitting(false)
    }
  }

 const TABS_CONFIG = [
    { id: 'basic', label: tBilingual('1. Basic & Identity', '১. পরিচিতি ও ক্যাটাগরি'), icon: Package },
    { id: 'specs', label: tBilingual('2. Physical Specs', '২. সাইজ ও স্পেক্স'), icon: Sliders },
    { id: 'pricing', label: tBilingual('3. Costing & Pricing', '৩. খরচ ও বিক্রয় মূল্য'), icon: DollarSign },
    { id: 'inventory', label: tBilingual('4. Inventory & Taxes', '৪. ইনভেন্টরি ও ভ্যাট'), icon: Warehouse },
  ] as const

 const currentTabIndex = TABS_CONFIG.findIndex((t) => t.id === activeTab)

 return (
    <ModalDialog
 open={isOpen}
 onOpenChange={(open) => !open && onClose()}
 size="5xl"onSubmit={handleSubmit}
 title={
        <div className="flex items-center gap-3">
          {onBack && !initialData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="h-9 px-2.5 rounded-lg border-border text-foreground hover:bg-muted gap-1.5 shrink-0 cursor-pointer"
              title={tBilingual('Back to selection', 'তালিকায় ফিরে যান')}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-semibold">{tBilingual('Back', 'ফিরে যান')}</span>
            </Button>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold shrink-0 ring-1 focus:ring-ring/20">
            <Package className="h-5 w-5"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">
                {initialData ? (isBn ? `রেডি প্রোডাক্ট সম্পাদনা: ${initialData.name_bn || initialData.name}` : `Edit Ready Product: ${initialData.name}`) : tBilingual('Ready Product', 'রেডি প্রোডাক্ট')}
              </span>
              <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
 Ready to Sell
              </Badge>
              {sellingPrice !== '' && Number(sellingPrice) > 0 && (
                <Badge variant="outline"className="text-xs tabular-nums py-0.5 px-2 bg-success-surface text-success border-success-border">
                  ৳{Number(sellingPrice).toFixed(2)} / {unit}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
 {tBilingual('Finished retail hardware, banner stands, acrylic displays, signage accessories, and print blanks sold by unit.', 'রেডি রিটেইল হার্ডওয়্যার, ব্যানার স্ট্যান্ড, এক্রিলিক ডিসপ্লে, সাইনেজ এক্সেসরিজ এবং প্রিন্ট ব্ল্যাঙ্ক ইউনিট বা পিস হিসেবে বিক্রয়।')}
            </p>
          </div>
        </div>
      }
 footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div>
            {currentTabIndex > 0 ? (
              <Button
 type="button"variant="outline"onClick={() => setActiveTab(TABS_CONFIG[currentTabIndex - 1].id)}
 className="h-10 px-4 rounded-xl font-bold border-input text-foreground hover:bg-muted gap-1.5 cursor-pointer">
                <ChevronLeft className="w-4 h-4"/>
                <span>{tBilingual('Back', 'পূর্ববর্তী ধাপ')}</span>
              </Button>
            ) : onBack && !initialData ? (
              <Button
 type="button"variant="outline"onClick={onBack}
 className="h-10 px-4 rounded-xl font-bold border-input text-foreground hover:bg-muted gap-1.5 cursor-pointer">
                <ArrowLeft className="w-4 h-4"/>
                <span>{tBilingual('Back to Selection', 'তালিকায় ফিরে যান')}</span>
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {currentTabIndex < TABS_CONFIG.length - 1 && (
              <Button
 type="button"variant="outline"onClick={() => {
 if (activeTab === 'basic' && !name.trim()) {
 setFieldErrors({ name: 'Product name is required before proceeding.' })
 dispatchToast({
 type: 'warning',
 title: 'Product Name Required',
 message: 'Product name is required before proceeding.',
                    })
 return
                  }
 setFieldErrors({})
 setActiveTab(TABS_CONFIG[currentTabIndex + 1].id)
                }}
 className="h-10 px-4 rounded-xl font-bold border-primary/20 text-primary border-border text-primary hover:bg-primary/10 dark:hover:bg-primary/10 gap-1.5 cursor-pointer">
                <span>{tBilingual('Next Step', 'পরবর্তী ধাপ')}</span>
                <ChevronRight className="w-4 h-4"/>
              </Button>
            )}

            {currentTabIndex === TABS_CONFIG.length - 1 && (
              <Button
 type="submit"disabled={isSubmitting}
 className="h-10 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex items-center justify-center gap-2 cursor-pointer">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin"/>
                    <span>{tBilingual('Saving Product...', 'সেভ হচ্ছে...')}</span>
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4"/>
                    <span>{initialData ? tBilingual('Update Ready Product', 'আপডেট সম্পন্ন করুন') : tBilingual('Save Ready Product', 'রেডি প্রোডাক্ট সেভ করুন')}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* 4-Tab Stepper Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-muted rounded-xl text-xs font-bold border border-border /60">
          {TABS_CONFIG.map((tab) => {
 const Icon = tab.icon
 const isSelected = activeTab === tab.id
 return (
              <button
 key={tab.id}
 type="button"onClick={() => setActiveTab(tab.id)}
 className={cn(
                  'px-2 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap text-xs relative',
 isSelected
                    ? 'bg-card text-foreground shadow-xs font-bold ring-1 focus:ring-ring dark:focus:ring-ring'
                    : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground font-medium'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-primary text-primary' : 'text-muted-foreground')} />
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
            <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 {tBilingual('Product Identity & Categorization', 'প্রোডাক্ট পরিচিতি ও ক্যাটাগরি')}
                </h3>
              </div>

              <div className="space-y-3">
                {/* First Row: Product Name (English) | Product Name (Bangla) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Product Name (English)', 'প্রোডাক্টের নাম (ইংরেজি)')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder={tBilingual('e.g. X-Stand Display 2×5 ft, Roll-up Banner Stand 33×80 in...', 'যেমন: এক্স-স্ট্যান্ড ডিসপ্লে ২×৫ ফিট, রোল-আপ ব্যানার ৩৩×৮০ ইঞ্চি...')}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                      }}
                      required
                      className={cn(
                        'h-9 text-xs transition-colors',
                        fieldErrors.name && 'border-destructive focus-visible:ring-destructive bg-destructive/10'
                      )}
                      autoFocus
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-destructive font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
                        <span>{fieldErrors.name}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Product Name (Bangla - Optional)', 'বাংলা নাম (ঐচ্ছিক)')}
                    </Label>
                    <Input
                      placeholder="যেমন: এক্স-স্ট্যান্ড ডিসপ্লে ব্যানার"
                      value={nameBn}
                      onChange={(e) => setNameBn(e.target.value)}
                      className="h-9 text-xs font-bengali"
                    />
                  </div>
                </div>

                {/* Second Row: Purchase Unit | Selling Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Purchase Unit', 'ক্রয় একক')} <span className="text-destructive">*</span>
                    </Label>
                    <select
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-input bg-card px-2 font-medium"
                    >
                      {READY_PRODUCT_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {locale === 'bn' ? u.labelBn : u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Selling Unit', 'বিক্রয় একক')} <span className="text-destructive">*</span>
                    </Label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                      className="w-full h-9 text-xs rounded-md border border-input bg-card px-2 font-medium"
                    >
                      {READY_PRODUCT_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {locale === 'bn' ? u.labelBn : u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Third Row: Category | Brand */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Category', 'ক্যাটাগরি')}
                    </Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-input bg-card px-2 font-medium"
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
                      {tBilingual('Brand / Maker', 'ব্র্যান্ড / প্রস্তুতকারক')}
                    </Label>
                    <Input
                      placeholder={tBilingual('e.g. MasterDisplay, China Import', 'যেমন: মাস্টার ডিসপ্লে, চায়না ইমপোর্ট')}
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Fourth Row: SKU/Item Code | Barcode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('SKU / Item Code', 'আইটেম কোড / SKU')}
                    </Label>
                    <Input
                      placeholder="e.g. XSTAND-2X5"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="h-9 text-xs tabular-nums uppercase"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Barcode / EAN-13 (Optional)', 'বারকোড / EAN-13 (ঐচ্ছিক)')}
                    </Label>
                    <div className="relative">
                      <QrCode className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground"/>
                      <Input
                        placeholder={tBilingual('Scan or enter barcode', 'বারকোড স্ক্যান বা ইনপুট করুন')}
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="pl-8 h-9 text-xs tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Fifth Row: Product Description */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Product Description & Selling Highlights', 'প্রোডাক্ট বিবরণ ও বিক্রয় বৈশিষ্ট্য')}
                  </Label>
                  <textarea
                    rows={2}
                    placeholder={tBilingual('e.g. Professional display stand with high-elastic fiberglass rods, anodized aluminum base, and waterproof padded carry bag...', 'যেমন: ফাইবারগ্লাস রড ও অ্যালুমিনিয়াম বেসসহ প্রফেশনাল ডিসপ্লে স্ট্যান্ড...')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-md border border-input bg-card text-xs focus:ring-1 focus:ring-ring outline-hidden resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-ring"
                    />
                    <span className={cn(isBn && "font-bangla")}>{tBilingual('Active in Sales & Billing Catalog', 'সেলস ও বিলিং ক্যাটালগে সক্রিয়')}</span>
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
            <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  <Sliders className="w-3.5 h-3.5"/>
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
 {tBilingual('Physical Dimensions & Construction Specs', 'সাইজ ও তৈরির স্পেসিফিকেশন')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
 {tBilingual('Display Dimensions / Size', 'ডিসপ্লে সাইজ / মাপ')}
                  </Label>
                  <Input
 placeholder="e.g. 2ft × 5ft (60 × 160 cm), 33 × 80 in"value={dimensionsSpec}
 onChange={(e) => setDimensionsSpec(e.target.value)}
 className="h-9 text-xs"/>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
 {tBilingual('Frame / Body Material', 'বডি / ফ্রেমের উপাদান')}
                  </Label>
                  <Input
 placeholder="e.g. Aluminum Profile + Fiberglass Rods"value={materialSpec}
 onChange={(e) => setMaterialSpec(e.target.value)}
 className="h-9 text-xs"/>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
 {tBilingual('Finish / Color', 'ফিনিশ / রঙ')}
                  </Label>
                  <Input
 placeholder="e.g. Silver Anodized / Matte Black"value={finishColor}
 onChange={(e) => setFinishColor(e.target.value)}
 className="h-9 text-xs"/>
                </div>
              </div>

              <div className="pt-1">
                <div className="max-w-xs">
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Unit Net Weight (kg)', 'প্রতি পিস ওজন (কেজি)')}
                  </Label>
                  <div className="relative">
                    <Scale className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground"/>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.25"
                      value={unitWeightKg}
                      onChange={(e) => setUnitWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-8 h-9 text-xs tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Inclusions & Features Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted dark:hover:bg-muted/60 cursor-pointer text-xs font-medium">
                  <input
 type="checkbox"checked={hasCarryBag}
 onChange={(e) => setHasCarryBag(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
                  <span className={cn(isBn && "font-bangla")}>{tBilingual('Includes Carry Bag', 'ক্যারি ব্যাগ অন্তর্ভুক্ত')}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted dark:hover:bg-muted/60 cursor-pointer text-xs font-medium">
                  <input
 type="checkbox"checked={isFoldable}
 onChange={(e) => setIsFoldable(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
                  <span className={cn(isBn && "font-bangla")}>{tBilingual('Foldable / Portable', 'ভাঁজযোগ্য / বহনযোগ্য')}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted dark:hover:bg-muted/60 cursor-pointer text-xs font-medium">
                  <input
 type="checkbox"checked={isOutdoorRated}
 onChange={(e) => setIsOutdoorRated(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
                  <span className={cn(isBn && "font-bangla")}>{tBilingual('Outdoor Wind-Rated', 'আউটডোর বাতাস-সহনশীল')}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted dark:hover:bg-muted/60 cursor-pointer text-xs font-medium">
                  <input
 type="checkbox"checked={isMountable}
 onChange={(e) => setIsMountable(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
                  <span className={cn(isBn && "font-bangla")}>{tBilingual('Wall / Table Mount', 'দেয়াল / টেবিল মাউন্ট')}</span>
                </label>
              </div>
            </div>

            {/* Section 2: Master Carton & Wholesale Packaging */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-warning-surface text-warning flex items-center justify-center font-bold text-xs">
                  <Boxes className="w-3.5 h-3.5"/>
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{tBilingual('Master Carton Packing & Order Quantities', 'মাস্টার কার্টন প্যাকিং ও অর্ডারের পরিমাণ')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual('Pieces Per Master Carton', 'প্রতি কার্টনে পিস')}</Label>
                  <Input
 type="number"min="1"placeholder="e.g. 50"value={pcsPerCarton}
 onChange={(e) => setPcsPerCarton(e.target.value === '' ? '' : parseInt(e.target.value))}
 className="h-9 text-xs tabular-nums"/>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual('Min Order Quantity (MOQ)', 'সর্বনিম্ন অর্ডার পরিমাণ (MOQ)')}</Label>
                  <Input
 type="number"min="1"value={minOrderQty}
 onChange={(e) => setMinOrderQty(parseInt(e.target.value) || 1)}
 className="h-9 text-xs tabular-nums"/>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual('Min Billable Quantity', 'সর্বনিম্ন বিলযোগ্য পরিমাণ')}</Label>
                  <Input
 type="number"min="1"value={minBillableQty}
 onChange={(e) => setMinBillableQty(parseInt(e.target.value) || 1)}
 className="h-9 text-xs tabular-nums"/>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual('Carton Dimensions (L × W × H cm)', 'কার্টনের আকার (দৈর্ঘ্য × প্রস্থ × উচ্চতা সেমি)')}</Label>
                  <Input
 placeholder={tBilingual('e.g. 105 × 40 × 30 cm', 'যেমন: ১০৫ × ৪০ × ৩০ সেমি')}value={cartonDimensions}
 onChange={(e) => setCartonDimensions(e.target.value)}
 className="h-9 text-xs"/>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual('Carton Gross Weight (kg)', 'কার্টনের মোট ওজন (কেজি)')}</Label>
                  <Input
 type="number"step="0.1"placeholder="e.g. 24.5"value={cartonWeightKg}
 onChange={(e) => setCartonWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
 className="h-9 text-xs tabular-nums"/>
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
            <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-success-surface text-success flex items-center justify-center font-bold text-xs">
                  <DollarSign className="w-3.5 h-3.5"/>
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{tBilingual('Commercial Selling Price & Landed Cost Structure', 'বাণিজ্যিক বিক্রয় মূল্য ও ল্যান্ডেড খরচ কাঠামো')}</h3>
              </div>

              {/* First Row: Purchase Price {update with Receive stock} | Minimum Selling price {link with Price Settings} */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-foreground">
                      {tBilingual('Purchase Price (৳)', 'ক্রয় মূল্য (৳)')}
                    </Label>
                    <Badge variant="outline" className="text-xs py-0 px-1.5 bg-muted text-muted-foreground border-border font-normal">
                      {tBilingual('update with Receive stock', 'স্টক রিসিভের সাথে আপডেট হয়')}
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 420"
                      value={purchasePrice}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                        setPurchasePrice(val)
                        setBaseCost(val)
                      }}
                      className="pl-7 h-9 text-xs tabular-nums font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-foreground">
                      {tBilingual('Minimum Selling Price (৳)', 'সর্বনিম্ন বিক্রয় মূল্য (৳)')} <span className="text-destructive">*</span>
                    </Label>
                    <Badge variant="outline" className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20 font-medium">
                      {tBilingual('link with Price Settings', 'প্রাইস সেটিংসের সাথে লিংক')}
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={tBilingual('e.g. 600', 'যেমন: ৬০০')}
                      value={minPrice}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                        setMinPrice(val)
                      }}
                      className="pl-7 h-9 text-xs tabular-nums font-bold text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Second Row: Freight / Landed Add | Base Selling Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-foreground">
                    {tBilingual('Freight / Landed Add (৳)', 'ভাড়া / ল্যান্ডেড খরচ (৳)')}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 30"
                      value={freightCost}
                      onChange={(e) => setFreightCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-7 h-9 text-xs tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-foreground">
                      {tBilingual(`Base Selling Price (৳ / ${unit})`, `মূল বিক্রয় মূল্য (৳ / ${unit})`)} <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {tBilingual('Standard Retail (+15%)', 'স্ট্যান্ডার্ড রিটেইল (+১৫%)')}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 750"
                      value={sellingPrice}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                        setSellingPrice(val)
                        if (fieldErrors.sellingPrice) setFieldErrors((prev) => ({ ...prev, sellingPrice: '' }))
                      }}
                      required
                      className={cn(
                        'pl-7 h-9 text-xs tabular-nums font-bold text-primary transition-colors',
                        fieldErrors.sellingPrice && 'border-destructive focus-visible:ring-destructive bg-destructive/10'
                      )}
                    />
                  </div>
                  {fieldErrors.sellingPrice && (
                    <p className="text-xs text-destructive font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
                      <span>{fieldErrors.sellingPrice}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Real-time Profit & Margin Economics Card */}
              <div className="p-3.5 bg-muted border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <TrendingUp className="w-4 h-4 text-success"/>
                    <span>{tBilingual('Live Yield & Margin Analysis', 'লাইভ মার্জিন ও লাভ বিশ্লেষণ')} ({tBilingual('Landed Cost:', 'ল্যান্ডেড খরচ:')} ৳{totalLandedCost.toFixed(2)})</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-md',
                      marginMetrics.grossMarginPercent >= targetMargin
                        ? 'bg-success-surface text-success border-success-border'
                        : marginMetrics.grossMarginPercent >= minAllowedMargin
                        ? 'bg-warning-surface text-warning border-warning-border'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    )}
                  >
                    {marginMetrics.grossMarginPercent >= targetMargin ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3"/> Healthy Margin
                      </span>
                    ) : marginMetrics.grossMarginPercent >= minAllowedMargin ? (
                      tBilingual('Acceptable Margin', 'গ্রহণযোগ্য মার্জিন')
                    ) : (
                      tBilingual('Below Floor Margin', 'ফ্লোর মার্জিনের নিচে')
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-card border border-border/60 shadow-2xs">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block">{tBilingual('Profit / Unit', 'লাভ / ইউনিট')}</span>
                    <span className="text-sm font-black tabular-nums text-success">
                      {formatBDT(marginMetrics.grossProfit)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-card border border-border/60 shadow-2xs">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block">{tBilingual('Gross Margin', 'গ্রস মার্জিন')}</span>
                    <span
                      className={cn(
                        'text-sm font-black tabular-nums',
                        marginMetrics.grossMarginPercent >= minAllowedMargin
                          ? 'text-success'
                          : 'text-destructive'
                      )}
                    >
                      {marginMetrics.grossMarginPercent}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-card border border-border/60 shadow-2xs">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block">{tBilingual('Markup', 'মার্কআপ')}</span>
                    <span className="text-sm font-black tabular-nums text-primary">
                      {marginMetrics.markupPercent}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-muted-foreground">{tBilingual('Target Gross Margin (%)', 'টার্গেট গ্রস মার্জিন (%)')}</Label>
                    <Input
                      type="number"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 35)}
                      className="h-8 text-xs tabular-nums font-bold text-success"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block text-muted-foreground">{tBilingual('Minimum Allowed Margin (%) (Floor)', 'সর্বনিম্ন অনুমোদিত মার্জিন (%) (ফ্লোর)')}</Label>
                    <Input
                      type="number"
                      value={minAllowedMargin}
                      onChange={(e) => setMinAllowedMargin(parseFloat(e.target.value) || 15)}
                      className="h-8 text-xs tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Customer Tier Pricing */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    <Tag className="w-3.5 h-3.5"/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {tBilingual('Customer Tier Segment Rates', 'গ্রাহক স্তর অনুযায়ী রেট')}
                      </h3>
                      <Badge variant="outline" className="text-xs py-0 px-2 bg-primary/10 text-primary border-primary/20">
                        {tBilingual('link with Price Settings', 'প্রাইস সেটিংসের সাথে লিংক')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tBilingual(
                        'Wholesale (minimum price), Dealer (+5%), Corporate (+10%), Retail (+15%), VIP (Custom)',
                        'পাইকারি (সর্বনিম্ন দর), ডিলার (+৫%), কর্পোরেট (+১০%), রিটেইল (+১৫%), ভিআইপি (কাস্টম)'
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleUpdateLinkWithPriceSettings}
                  className="h-8 text-xs font-bold text-primary border-primary/30 hover:bg-primary/10 bg-primary/5 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Wholesale (minimum price), Dealer (+5%), Corporate (+10%), Retail (+15%), VIP (Custom)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{tBilingual('Update link with Price Settings', 'প্রাইস সেটিংস লিংক আপডেট')}</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {/* Wholesale Tier (minimum price) */}
                <div className="p-2.5 rounded-lg border border-border bg-muted space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-foreground">
                      {tBilingual('Wholesale', 'হোলসেল')}
                    </span>
                    <Badge variant="outline" className="text-xs py-0 px-1 bg-success-surface text-success border-success-border font-medium">
                      {tBilingual('Min Price', 'মূল দর')}
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-muted-foreground font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder={String(minPrice || '0')}
                      value={priceTiers.wholesale}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          wholesale: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs tabular-nums font-semibold"
                    />
                  </div>
                </div>

                {/* Dealer Tier (+5%) */}
                <div className="p-2.5 rounded-lg border border-border bg-muted space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-primary">
                      {tBilingual('Dealer', 'ডিলার')}
                    </span>
                    <Badge variant="outline" className="text-xs py-0 px-1 bg-primary/10 text-primary border-primary/20 font-medium">
                      +5%
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-muted-foreground font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 630"
                      value={priceTiers.dealer}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          dealer: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs tabular-nums font-semibold"
                    />
                  </div>
                </div>

                {/* Corporate Tier (+10%) */}
                <div className="p-2.5 rounded-lg border border-border bg-muted space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-primary">
                      {tBilingual('Corporate', 'কর্পোরেট')}
                    </span>
                    <Badge variant="outline" className="text-xs py-0 px-1 bg-primary/10 text-primary border-primary/20 font-medium">
                      +10%
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-muted-foreground font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 660"
                      value={priceTiers.corporate}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          corporate: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs tabular-nums font-semibold"
                    />
                  </div>
                </div>

                {/* Retail Tier (+15%) */}
                <div className="p-2.5 rounded-lg border border-border bg-muted space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-foreground">
                      {tBilingual('Retail', 'রিটেইল')}
                    </span>
                    <Badge variant="outline" className="text-xs py-0 px-1 bg-muted text-muted-foreground border-border font-medium">
                      +15%
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-muted-foreground font-bold text-xs">৳</span>
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
                      className="pl-5 h-7 text-xs tabular-nums font-semibold"
                    />
                  </div>
                </div>

                {/* Custom VIP Tier */}
                <div className="p-2.5 rounded-lg border border-border bg-muted space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-warning">
                      {tBilingual('VIP', 'ভিআইপি')}
                    </span>
                    <Badge variant="outline" className="text-xs py-0 px-1 bg-warning-surface text-warning border-warning-border font-medium">
                      Custom
                    </Badge>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-muted-foreground font-bold text-xs">৳</span>
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
                      className="pl-5 h-7 text-xs tabular-nums font-semibold"
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
            <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-success-surface text-success flex items-center justify-center font-bold text-xs">
                  <Warehouse className="w-3.5 h-3.5"/>
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{tBilingual('Warehouse Stock & Reorder Thresholds', 'গুদাম স্টক ও রি-অর্ডার সীমা')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual(`Initial / Opening Stock (${unit})`, `প্রারম্ভিক / ওপেনিং স্টক (${unit})`)}</Label>
                  <Input
 type="number"min="0"placeholder="e.g. 50"value={openingStock}
 onChange={(e) => setOpeningStock(e.target.value === '' ? '' : parseInt(e.target.value))}
 className="h-9 text-xs tabular-nums"/>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual(`Reorder Alert Level (${unit})`, `রি-অর্ডার সতর্কতা সীমা (${unit})`)}</Label>
                  <Input
 type="number"min="0"placeholder="e.g. 10"value={reorderLevel}
 onChange={(e) => setReorderLevel(e.target.value === '' ? '' : parseInt(e.target.value))}
 className="h-9 text-xs tabular-nums font-bold text-warning text-warning"/>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual('Max Stock Storage Cap', 'সর্বোচ্চ স্টক ধারণ ক্ষমতা')}</Label>
                  <Input
 type="number"min="0"placeholder="e.g. 200"value={maxStock}
 onChange={(e) => setMaxStock(e.target.value === '' ? '' : parseInt(e.target.value))}
 className="h-9 text-xs tabular-nums"/>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual('Warehouse Bin / Shelf Location', 'গুদাম বিন / শেলফ অবস্থান')}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground"/>
                    <Input
 placeholder={tBilingual('e.g. Main Warehouse - Shelf B-04', 'যেমন: প্রধান গুদাম - শেলফ B-04')}value={warehouseLocation}
 onChange={(e) => setWarehouseLocation(e.target.value)}
 className="pl-8 h-9 text-xs"/>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">{tBilingual('Procurement Lead Time (Days)', 'সংগ্রহের লিড টাইম (দিন)')}</Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground"/>
                    <Input
 type="number"placeholder="e.g. 3"value={leadTimeDays}
 onChange={(e) => setLeadTimeDays(e.target.value === '' ? '' : parseInt(e.target.value))}
 className="pl-8 h-9 text-xs tabular-nums"/>
                  </div>
                </div>
              </div>

              {suppliers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">{tBilingual('Preferred Supplier', 'পছন্দের সরবরাহকারী')}</Label>
                    <select
 value={preferredSupplierId}
 onChange={(e) => setPreferredSupplierId(e.target.value)}
 className="w-full h-9 text-xs rounded-md border border-input bg-card px-2 font-medium">
                      <option value="">{tBilingual('Select Preferred Supplier...', 'সরবরাহকারী নির্বাচন করুন...')}</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">{tBilingual('Supplier Catalog / Item Code', 'সাপ্লায়ার ক্যাটালগ / আইটেম কোড')}</Label>
                    <Input
 placeholder="e.g. SUP-XS-001"value={supplierItemCode}
 onChange={(e) => setSupplierItemCode(e.target.value)}
 className="h-9 text-xs tabular-nums uppercase"/>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Taxes & Governance */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-muted text-foreground flex items-center justify-center font-bold text-xs">
                  <Percent className="w-3.5 h-3.5"/>
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{tBilingual('Tax & Sales Staff Governance', 'ট্যাক্স ও সেলস স্টাফ নীতিমালা')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
 type="checkbox"checked={vatApplicable}
 onChange={(e) => setVatApplicable(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
                    <span className={cn(isBn && "font-bangla")}>{tBilingual('VAT / Tax Applicable', 'ভ্যাট / ট্যাক্স প্রযোজ্য')}</span>
                  </label>

                  {vatApplicable && (
                    <div className="pl-6 pt-1">
                      <Label className="text-xs font-semibold mb-1 block">{tBilingual('Tax Rate (%)', 'ট্যাক্স হার (%)')}</Label>
                      <Input
 type="number"step="0.1"min="0"value={taxRate}
 onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
 className="h-8 text-xs tabular-nums max-w-[140px]"/>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
 type="checkbox"checked={isTaxInclusive}
 onChange={(e) => setIsTaxInclusive(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
                    <span className={cn(isBn && "font-bangla")}>{tBilingual('Selling Price is Tax-Inclusive', 'বিক্রয় মূল্য ট্যাক্স অন্তর্ভুক্ত')}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
 type="checkbox"checked={allowManualOverride}
 onChange={(e) => setAllowManualOverride(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
                    <span className={cn(isBn && "font-bangla")}>{tBilingual('Allow Sales Staff Rate Override on Quotations', 'কোটেশনে সেলস স্টাফদের রেট পরিবর্তনের অনুমতি দিন')}</span>
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

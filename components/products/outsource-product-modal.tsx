'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
 Share2,
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
 Clock,
 ExternalLink,
 Phone,
 FileText,
 MapPin,
 ShoppingBag,
 Send,
 UserCheck,
} from 'lucide-react'
import { dispatchToast } from '@/components/shared/toast-feedback'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'
import type { ProductRecord, UnitOfMeasure, ProductPriceTiers, OutsourceConfiguration } from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { formatBDT } from '@/lib/formatters'
import { calculateGrossMargin, calculateSuggestedSellingPrice, isUserSku } from '@/lib/units'

interface OutsourceProductModalProps {
 isOpen: boolean
 onClose: () => void
 onSave: (productData: Partial<ProductRecord>) => Promise<void>
 initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
  suppliers?: Array<{ id: string; name: string; contact_person?: string; phone?: string }>
  onBack?: () => void
}

export const OUTSOURCE_PRODUCT_UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'piece', label: 'Piece (pcs / পিস)' },
  { value: 'set', label: 'Set (সেট)' },
  { value: 'pack', label: 'Pack (প্যাক)' },
  { value: 'thousand', label: '1,000 pcs (হাজার পিস)' },
  { value: 'box', label: 'Box / Carton (বক্স)' },
  { value: 'sft', label: 'Square Feet (sft / স্কয়ার ফিট)' },
  { value: 'rft', label: 'Running Feet (rft / রানিং ফিট)' },
  { value: 'job', label: 'Job / Project (জব)' },
  { value: 'meter', label: 'Meter (মিটার)' },
  { value: 'kg', label: 'KG (কেজি)' },
]

export const OUTSOURCE_CATEGORIES = [
  { id: 'offset_printing', name: 'Offset Commercial Printing (অফসেট প্রিন্টিং)', icon: FileText },
  { id: 'neon_signage', name: 'Neon Flex & LED Acrylic (নিওন ফ্লেক্স সাইনেজ)', icon: Sparkles },
  { id: 'embroidery_apparel', name: 'Computer Embroidery & Apparel (এমব্রয়ডারি)', icon: Tag },
  { id: 'special_finishing', name: 'Gold Foil, Emboss & Die-Cutting (ফয়েল ও ডাই-কাটিং)', icon: Layers },
  { id: 'structural_metal', name: 'Heavy Metal & Billboard Structure (মেটাল ফেব্রিকেশন)', icon: Building },
  { id: 'channel_letters', name: '3D Channel Letter Acrylic Bending (থ্রি-ডি লেটার)', icon: Boxes },
  { id: 'promo_gifts', name: 'Corporate Promotional Gift Items (গিফট আইটেম)', icon: ShoppingBag },
  { id: 'vehicle_wrapping', name: 'Vehicle Branding / Wrap Subcontract (গাড়ি র্যাপিং)', icon: Truck },
  { id: 'other_outsource', name: 'General Outsource Service (অন্যান্য আউটসোর্স)', icon: Share2 },
]

export const OUTSOURCE_PRESETS: Array<{
 id: string
 name: string
 name_bn: string
 category: string
 unit: UnitOfMeasure
 purchaseUnit: string
 vendorName: string
 vendorCost: number
 defaultSellingPrice: number
 turnaroundDays: number
 deliveryMethod: string
 specifications: string
 vendorNotes: string
 description: string
}> = [
  {
 id: 'offset_leaflet_1000',
 name: 'Offset Flyer / Leaflet A4 120 GSM (1,000 pcs)',
 name_bn: 'অফসেট লিফলেট এ৪ ১২০ জিএসএম (১,০০০ পিস)',
 category: 'offset_printing',
 unit: 'thousand',
 purchaseUnit: 'thousand',
 vendorName: 'Arambagh Offset Press Network',
 vendorCost: 1800,
 defaultSellingPrice: 2800,
 turnaroundDays: 2,
 deliveryMethod: 'vendor_delivery',
 specifications: 'A4 Size (8.27×11.69 in), 120 GSM Art Paper, 4-Color Both Sides Offset Print, Pack of 1000.',
 vendorNotes: 'High-speed 4-color Heidelberg offset press run. Plate cost included in vendor price.',
 description: '1,000 copies A4 4-color offset flyer printing on premium 120 GSM imported art paper.',
  },
  {
 id: 'neon_flex_custom',
 name: 'Custom LED Neon Flex Sign on Clear Acrylic Base',
 name_bn: 'কাস্টম এলইডি নিওন ফ্লেক্স সাইন এক্রিলিক বেসে',
 category: 'neon_signage',
 unit: 'sft',
 purchaseUnit: 'sft',
 vendorName: 'Neon Craft Studio',
 vendorCost: 450,
 defaultSellingPrice: 750,
 turnaroundDays: 3,
 deliveryMethod: 'shop_pickup',
 specifications: '6mm/8mm Food Grade Silicon LED Neon Flex, 5mm Laser Cut Clear Acrylic Backer, 12V Power Adapter included.',
 vendorNotes: 'Requires vector artwork outline. Hand-bent silicone neon tubing with clear wire harness.',
 description: 'Custom shaped glowing neon sign mounted on laser-profiled clear acrylic with wall spacers and adapter.',
  },
  {
 id: 'computer_embroidery_polo',
 name: 'Computer Embroidery Logo on Polo Shirts / Caps',
 name_bn: 'কম্পিউটার এমব্রয়ডারি লোগো টি-শার্ট / ক্যাপে',
 category: 'embroidery_apparel',
 unit: 'piece',
 purchaseUnit: 'piece',
 vendorName: 'Tongi Embroidery Hub',
 vendorCost: 45,
 defaultSellingPrice: 90,
 turnaroundDays: 2,
 deliveryMethod: 'vendor_delivery',
 specifications: 'Up to 10,000 stitches, 6 thread colors, Tajima high-density multi-head embroidery.',
 vendorNotes: 'Digitizing DST file charge ৳300 waived for orders above 50 pcs.',
 description: 'Precision multi-color Japanese machine embroidery on chest pocket, sleeve, or cap crown.',
  },
  {
 id: 'gold_foil_business_cards',
 name: 'Luxury Gold Foil Stamping + Velvet Matte Cards (500 pcs)',
 name_bn: 'লাক্সারি গোল্ড ফয়েল স্ট্যাম্পিং ভিজিটিং কার্ড (৫০০ পিস)',
 category: 'special_finishing',
 unit: 'set',
 purchaseUnit: 'set',
 vendorName: 'Prestige Foil & Die-Makers',
 vendorCost: 1600,
 defaultSellingPrice: 2800,
 turnaroundDays: 3,
 deliveryMethod: 'shop_pickup',
 specifications: '350 GSM Swedish Board, Soft-Touch Velvet Lamination, Single-side Metallic Hot Foil Stamping.',
 vendorNotes: 'Custom copper hot-stamp block prepared from vector AI/PDF file.',
 description: '500 pcs ultra-premium business cards with hot metallic foil stamping and soft velvet coating.',
  },
  {
 id: 'acrylic_3d_channel_letters',
 name: '3D Acrylic Channel Letters with Samsung LED Backlight',
 name_bn: 'থ্রি-ডি এক্রিলিক চ্যানেল লেটার এলইডি ব্যাকলাইট সহ',
 category: 'channel_letters',
 unit: 'rft',
 purchaseUnit: 'rft',
 vendorName: 'Laser Cut Signage Fab',
 vendorCost: 350,
 defaultSellingPrice: 650,
 turnaroundDays: 4,
 deliveryMethod: 'shop_pickup',
 specifications: '3mm Cast Acrylic Face, 2in Depth Acrylic/SS Return Bending, Samsung 12V IP67 Injection LED Modules.',
 vendorNotes: 'Pre-assembled letter bays with tested LED modules and 12V DC lead wires.',
 description: 'Fabricated 3D raised illuminated box letters with waterproof internal LED injection modules.',
  },
  {
 id: 'die_cut_custom_box',
 name: 'Die-Cut Custom Product Packaging Box (1,000 pcs)',
 name_bn: 'ডাই-কাট কাস্টম প্রোডাক্ট প্যাকেজিং বক্স (১,০০০ পিস)',
 category: 'special_finishing',
 unit: 'thousand',
 purchaseUnit: 'thousand',
 vendorName: 'City Packaging & Die-Cutting',
 vendorCost: 14000,
 defaultSellingPrice: 22000,
 turnaroundDays: 5,
 deliveryMethod: 'vendor_delivery',
 specifications: '350 GSM Duplex/Art Card, 4-Color Print, Glossy Lamination, Precision Steel Rule Die-Cut & Pasting.',
 vendorNotes: 'Includes customized laser wooden die block, creasing, and automatic side gluing.',
 description: 'Custom branded retail packaging boxes folded and glued ready for product insertion.',
  },
]

export function OutsourceProductModal({
 isOpen,
 onClose,
 onSave,
 initialData,
 categories = [],
 suppliers = [],
 onBack,
}: OutsourceProductModalProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
  // 4 Master Tabs
 const [activeTab, setActiveTab] = useState<'basic' | 'costing' | 'vendor_specs' | 'taxes'>('basic')

  // Tab 1: Basic Identity & Vendor Mapping
 const [name, setName] = useState('')
 const [nameBn, setNameBn] = useState('')
 const [sku, setSku] = useState('')
 const [category, setCategory] = useState('offset_printing')
 const [unit, setUnit] = useState<UnitOfMeasure>('piece')
 const [purchaseUnit, setPurchaseUnit] = useState<string>('piece')
 const [isActive, setIsActive] = useState(true)
 const [description, setDescription] = useState('')
 const [descriptionBn, setDescriptionBn] = useState('')

  // Vendor Information
 const [preferredVendorId, setPreferredVendorId] = useState('')
 const [vendorName, setVendorName] = useState('')
 const [vendorPhone, setVendorPhone] = useState('')
 const [vendorAddress, setVendorAddress] = useState('')
 const [vendorItemCode, setVendorItemCode] = useState('')

  // Tab 2: Costing, Markup & Customer Price Tiers
 const [vendorCost, setVendorCost] = useState<number | ''>('')
 const [sellingPrice, setSellingPrice] = useState<number | ''>('')
 const [targetMargin, setTargetMargin] = useState<number>(35)
 const [minAllowedMargin, setMinAllowedMargin] = useState<number>(15)
 const [minPrice, setMinPrice] = useState<number | ''>('')
 const [minOrderQty, setMinOrderQty] = useState<number>(1)
 const [minBillableQty, setMinBillableQty] = useState<number>(1)

  // Price tiers
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

  // Tab 3: Vendor Specs & Turnaround
 const [specifications, setSpecifications] = useState('')
 const [vendorNotes, setVendorNotes] = useState('')
 const [turnaroundDays, setTurnaroundDays] = useState<number | ''>(2)
 const [deliveryMethod, setDeliveryMethod] = useState<'vendor_delivery' | 'shop_pickup' | 'direct_customer_dispatch' | string>('vendor_delivery')

  // Tab 4: Taxes & Governance
 const [vatApplicable, setVatApplicable] = useState(false)
 const [isTaxInclusive, setIsTaxInclusive] = useState(false)
 const [taxRate, setTaxRate] = useState<number>(7.5)
 const [allowManualOverride, setAllowManualOverride] = useState(true)
 const [internalNotes, setInternalNotes] = useState('')

 const [isSubmitting, setIsSubmitting] = useState(false)
 const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

 useEffect(() => {
 if (initialData) {
 setName(initialData.name || '')
 setNameBn(initialData.name_bn || '')
 setSku(isUserSku(initialData.sku) ? initialData.sku : '')
 setCategory(initialData.category || initialData.outsource_category || 'offset_printing')
 setUnit(initialData.selling_unit || initialData.unit || 'piece')
 setPurchaseUnit(initialData.purchase_unit || initialData.unit || 'piece')
 setIsActive(initialData.is_active !== false)
 setDescription(initialData.description || '')
 setDescriptionBn(initialData.description_bn || '')

 const outCfg = initialData.outsource_config || (initialData as any).pricing_formula?.outsource_config || {}
 setPreferredVendorId(initialData.vendor_id || outCfg.vendor_id || '')
 setVendorName(initialData.vendor_name || outCfg.vendor_name || '')
 setVendorPhone(initialData.vendor_phone || outCfg.vendor_phone || '')
 setVendorAddress(initialData.vendor_address || outCfg.vendor_address || '')
 setVendorItemCode(initialData.vendor_item_code || outCfg.vendor_item_code || '')

 const cost = initialData.base_cost ?? initialData.purchase_price ?? outCfg.vendor_unit_cost ?? ''
 const sp = initialData.selling_price || ''
 setVendorCost(cost)
 setSellingPrice(sp)
 setTargetMargin(initialData.target_margin_percentage ?? outCfg.markup_percent ?? 35)
 setMinAllowedMargin(initialData.min_allowed_margin_percent ?? 15)
 setMinPrice(initialData.min_price || '')
 setMinOrderQty(initialData.min_order_quantity || 1)
 setMinBillableQty(initialData.min_billable_quantity || 1)

 const tiers = initialData.price_tiers || {}
 setPriceTiers({
 retail: tiers.retail ?? sp,
 corporate: tiers.corporate ?? '',
 dealer: tiers.dealer ?? '',
 wholesale: tiers.wholesale ?? '',
 custom: tiers.custom ?? '',
      })

 setSpecifications(outCfg.specifications || initialData.material_spec || '')
 setVendorNotes(outCfg.vendor_notes || initialData.outsource_notes || '')
 setTurnaroundDays(initialData.turnaround_days ?? outCfg.turnaround_days ?? 2)
 setDeliveryMethod(outCfg.delivery_method || 'vendor_delivery')

 setVatApplicable(Boolean(initialData.vat_applicable))
 setIsTaxInclusive(Boolean(initialData.is_tax_inclusive))
 setTaxRate(initialData.tax_rate ?? 7.5)
 setAllowManualOverride(initialData.allow_manual_override !== false)
 setInternalNotes(initialData.internal_notes || '')
    } else {
 setName('')
 setNameBn('')
 setSku('')
 setCategory('offset_printing')
 setUnit('piece')
 setPurchaseUnit('piece')
 setIsActive(true)
 setDescription('')
 setDescriptionBn('')

 setPreferredVendorId('')
 setVendorName('')
 setVendorPhone('')
 setVendorAddress('')
 setVendorItemCode('')

 setVendorCost('')
 setSellingPrice('')
 setTargetMargin(35)
 setMinAllowedMargin(15)
 setMinPrice('')
 setMinOrderQty(1)
 setMinBillableQty(1)

 setPriceTiers({
 retail: '',
 corporate: '',
 dealer: '',
 wholesale: '',
 custom: '',
      })

 setSpecifications('')
 setVendorNotes('')
 setTurnaroundDays(2)
 setDeliveryMethod('vendor_delivery')

 setVatApplicable(false)
 setIsTaxInclusive(false)
 setTaxRate(7.5)
 setAllowManualOverride(true)
 setInternalNotes('')
    }
 setActiveTab('basic')
  }, [initialData, isOpen])

  // Live Gross Margin & Markup Calculation
 const marginMetrics = useMemo(() => {
 const cost = Number(vendorCost) || 0
 const sp = Number(sellingPrice) || 0
 return calculateGrossMargin(cost, sp)
  }, [vendorCost, sellingPrice])

  // Live Suggested Selling Price from Target Margin
 const suggestedSellingPrice = useMemo(() => {
 const cost = Number(vendorCost) || 0
 if (cost <= 0) return 0
 return calculateSuggestedSellingPrice(cost, targetMargin)
  }, [vendorCost, targetMargin])

  // Auto-fill price tiers based on standard segment percentages (MUST NOT be less than Vendor Cost)
 const handleAutoFillTiers = () => {
 let sp = Number(sellingPrice) || 0
 const costFloor = Number(vendorCost) || 0
 if (sp <= costFloor && costFloor > 0) {
 sp = Math.ceil(costFloor * (1 + (targetMargin || 35) / 100))
 setSellingPrice(sp)
    }
 if (sp <= 0 && costFloor <= 0) return

 const effectiveSp = sp > 0 ? sp : Math.ceil(costFloor)

 const clampToFloor = (calcVal: number) => {
 const rounded = Math.round(calcVal)
 const floored = Math.max(Math.ceil(costFloor), rounded)
 return floored
    }

 setPriceTiers({
 retail: clampToFloor(effectiveSp),
 corporate: clampToFloor(effectiveSp * 0.95), // 5% discount, clamped to costFloor
 dealer: clampToFloor(effectiveSp * 0.90),    // 10% discount, clamped to costFloor
 wholesale: clampToFloor(effectiveSp * 0.85), // 15% discount, clamped to costFloor
 custom: clampToFloor(effectiveSp * 0.75),
    })
  }

  // 1-Click Outsource Preset Template Loader
 const handleApplyPreset = (preset: typeof OUTSOURCE_PRESETS[0]) => {
 setName(preset.name)
 setNameBn(preset.name_bn)
 setCategory(preset.category)
 setUnit(preset.unit)
 setPurchaseUnit(preset.purchaseUnit)
 setVendorName(preset.vendorName)
 setVendorCost(preset.vendorCost)
 setSellingPrice(preset.defaultSellingPrice)
 setTurnaroundDays(preset.turnaroundDays)
 setDeliveryMethod(preset.deliveryMethod)
 setSpecifications(preset.specifications)
 setVendorNotes(preset.vendorNotes)
 setDescription(preset.description)

    // Auto-fill price tiers
 setPriceTiers({
 retail: preset.defaultSellingPrice,
 corporate: Math.round(preset.defaultSellingPrice * 0.95),
 dealer: Math.round(preset.defaultSellingPrice * 0.90),
 wholesale: Math.round(preset.defaultSellingPrice * 0.85),
 custom: preset.defaultSellingPrice,
    })
  }

 const handleSupplierSelect = (supId: string) => {
 setPreferredVendorId(supId)
 const sup = suppliers.find((s) => s.id === supId)
 if (sup) {
 setVendorName(sup.name)
 if (sup.phone) setVendorPhone(sup.phone)
    }
  }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!name.trim()) {
 setFieldErrors({ name: 'Product name is required before proceeding.' })
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
 setActiveTab('costing')
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
 const cost = Number(vendorCost) || 0
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

 const outsourceConfig: OutsourceConfiguration = {
 vendor_id: preferredVendorId || undefined,
 vendor_name: vendorName.trim() || undefined,
 vendor_phone: vendorPhone.trim() || undefined,
 vendor_address: vendorAddress.trim() || undefined,
 vendor_item_code: vendorItemCode.trim() || undefined,
 vendor_unit_cost: cost,
 purchase_unit: purchaseUnit || unit,
 conversion_ratio: 1,
 markup_percent: Number(targetMargin) || 35.0,
 turnaround_days: turnaroundDays !== '' ? Number(turnaroundDays) : 2,
 delivery_method: deliveryMethod,
 specifications: specifications.trim() || undefined,
 vendor_notes: vendorNotes.trim() || undefined,
 is_non_inventory: true,
      }

 await onSave({
 name: name.trim(),
 name_bn: nameBn.trim() || undefined,
 sku: sku.trim() || '',
 category: category || 'offset_printing',
 outsource_category: category || 'offset_printing',
 product_type: 'outsource',
 entity_type: 'outsource',
 commercial_type: 'outsource',
 is_ready_product: false,
 is_service: false,
 is_outsource: true,
 is_non_inventory: true,
 track_inventory: false,
 unit,
 selling_unit: unit,
 purchase_unit: purchaseUnit || unit,
 pricing_method: unit === 'sft' ? 'per_area' : unit === 'rft' ? 'per_length' : unit === 'job' ? 'per_job' : 'per_piece',
 selling_price: sp,
 base_cost: cost,
 purchase_price: cost,
 min_price: minimumPrice,
 target_margin_percentage: Number(targetMargin) || 35.0,
 min_allowed_margin_percent: Number(minAllowedMargin) || 15.0,
 cost_basis_type: 'direct_cost',
 price_tiers: finalPriceTiers,
 outsource_config: outsourceConfig,
 pricing_formula: {
   ...(typeof initialData?.pricing_formula === 'object' && initialData?.pricing_formula !== null ? initialData.pricing_formula : {}),
   original_product_type: 'outsource',
   product_type: 'outsource',
   entity_type: 'outsource',
   commercial_type: 'outsource',
   is_outsource: true,
   is_non_inventory: true,
   outsource_config: outsourceConfig,
   vendor_id: preferredVendorId || undefined,
   vendor_name: vendorName.trim() || undefined,
   vendor_phone: vendorPhone.trim() || undefined,
   vendor_address: vendorAddress.trim() || undefined,
   vendor_item_code: vendorItemCode.trim() || undefined,
   vendor_unit_cost: cost,
   turnaround_days: turnaroundDays !== '' ? Number(turnaroundDays) : 2,
 },
 vendor_id: preferredVendorId || undefined,
 vendor_name: vendorName.trim() || undefined,
 vendor_phone: vendorPhone.trim() || undefined,
 vendor_address: vendorAddress.trim() || undefined,
 vendor_item_code: vendorItemCode.trim() || undefined,
 vendor_unit_cost: cost,
 turnaround_days: turnaroundDays !== '' ? Number(turnaroundDays) : 2,
 vat_applicable: vatApplicable,
 is_tax_inclusive: isTaxInclusive,
 tax_rate: Number(taxRate) || 0,
 allow_manual_override: allowManualOverride,
 is_active: isActive,
 description: description.trim() || undefined,
 description_bn: descriptionBn.trim() || undefined,
 internal_notes: internalNotes.trim() || undefined,
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
 message: err.message || 'Failed to save outsource product.',
      })
    } finally {
 setIsSubmitting(false)
    }
  }

 const TABS_CONFIG = [
    { id: 'basic', label: tBilingual('1. Identity & Vendor', '১. পরিচিতি ও ভেন্ডর'), icon: Share2 },
    { id: 'costing', label: tBilingual('2. Costing & Pricing', '২. খরচ ও মূল্য নির্ধারণ'), icon: DollarSign },
    { id: 'vendor_specs', label: tBilingual('3. Specs & Lead Time', '৩. স্পেক্স ও ডেলিভারি সময়'), icon: Clock },
    { id: 'taxes', label: tBilingual('4. Taxes & Notes', '৪. ট্যাক্স ও নোট'), icon: Warehouse },
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0 ring-1 focus:ring-ring/20">
            <Share2 className="h-5 w-5"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">
                {initialData ? (isBn ? `আউটসোর্স প্রোডাক্ট সম্পাদনা: ${initialData.name_bn || initialData.name}` : `Edit Outsource Product: ${initialData.name}`) : tBilingual('New Outsource Product', 'নতুন আউটসোর্স প্রোডাক্ট')}
              </span>
              <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-2 bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border">
 Non-Inventory Item
              </Badge>
              {sellingPrice !== '' && Number(sellingPrice) > 0 && (
                <Badge variant="outline"className="text-xs tabular-nums py-0.5 px-2 bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border">
                  ৳{Number(sellingPrice).toFixed(2)} / {unit}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
 {tBilingual('Subcontracted offset printing, neon signs, computer embroidery, hot foil, and special jobs routed to third-party vendors without internal stock depletion.', 'তৃতীয় পক্ষের ভেন্ডর দ্বারা সম্পন্ন অফসেট, নিয়ন সাইন, এমব্রয়ডারি বা বিশেষ কাজ যা নিজস্ব স্টক হ্রাস করে না।')}
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
 className="h-10 px-5 rounded-xl font-bold bg-primary hover:bg-primary text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin"/>
                    <span>{tBilingual('Saving Product...', 'সেভ হচ্ছে...')}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4"/>
                    <span>{initialData ? tBilingual('Update Outsource Product', 'আপডেট সম্পন্ন করুন') : tBilingual('Save Outsource Product', 'আউটসোর্স প্রোডাক্ট সংরক্ষণ করুন')}</span>
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
        {/* TAB 1: BASIC IDENTITY */}
        {/* ======================================================== */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* Product Identity Form */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">
 {tBilingual('Outsource Product Name (English)', 'আউটসোর্স প্রোডাক্টের নাম (ইংরেজি)')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
 value={name}
 onChange={(e) => {
 setName(e.target.value)
 if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                    }}
 placeholder={tBilingual('e.g. Offset Leaflet A4 120 GSM (1,000 pcs)', 'যেমন: অফসেট লিফলেট এ৪ ১২০ জিএসএম (১,০০০ পিস)')}className={cn(
                      'mt-1 h-9 text-xs font-medium transition-colors',
 fieldErrors.name && 'border-danger-border focus-visible:focus:ring-ring bg-danger-surface/30 bg-danger-surface'
                    )}
 required
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive text-destructive font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
                      <span>{fieldErrors.name}</span>
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">
                    নাম (বাংলায়)
                  </Label>
                  <Input
 value={nameBn}
 onChange={(e) => setNameBn(e.target.value)}
 placeholder={tBilingual('উদা: অফসেট লিফলেট এ৪ ১২০ জিএসএম (১,০০০ পিস)', 'যেমন: অফসেট লিফলেট এ৪ ১২০ জিএসএম (১,০০০ পিস)')}className="mt-1 h-9 text-xs font-bengali"/>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className={cn("text-xs font-bold text-foreground", isBn && "font-bangla")}>{tBilingual('SKU Code', 'আইটেম কোড / SKU')}</Label>
                  <Input
 value={sku}
 onChange={(e) => setSku(e.target.value.toUpperCase())}
 placeholder="OUT-1002"className="mt-1 h-9 text-xs tabular-nums font-bold"/>
                </div>

                <div>
                  <Label className={cn("text-xs font-bold text-foreground", isBn && "font-bangla")}>{tBilingual('Category', 'ক্যাটাগরি')}</Label>
                  <select
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-ring">
                    {OUTSOURCE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className={cn("text-xs font-bold text-foreground", isBn && "font-bangla")}>{tBilingual('Selling Unit', 'বিক্রয় একক')}</Label>
                  <select
 value={unit}
 onChange={(e) => {
 const val = e.target.value as UnitOfMeasure
 setUnit(val)
 setPurchaseUnit(val)
                    }}
 className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-ring tabular-nums">
                    {OUTSOURCE_PRODUCT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendor Mapping Section */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary"/>
                  <span className="text-xs font-bold text-foreground">
 {tBilingual('Preferred Outsource Vendor & Contact', 'প্রধান আউটসোর্স ভেন্ডর ও যোগাযোগের তথ্য')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {suppliers.length > 0 && (
                    <div>
                      <Label className={cn("text-xs font-medium text-muted-foreground", isBn && "font-bangla")}>{tBilingual('Select Existing Vendor', 'পূর্ববর্তী ভেন্ডর নির্বাচন করুন')}</Label>
                      <select
 value={preferredVendorId}
 onChange={(e) => handleSupplierSelect(e.target.value)}
 className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-ring">
                        <option value="">{tBilingual('-- Choose Vendor / Press --', '-- ভেন্ডর / প্রেস নির্বাচন করুন --')}</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.phone ? `(${s.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={cn(suppliers.length === 0 ? 'sm:col-span-2' : '')}>
                    <Label className={cn("text-xs font-medium text-muted-foreground", isBn && "font-bangla")}>{tBilingual('Vendor / Workshop Name', 'ভেন্ডর / ওয়ার্কশপের নাম')}</Label>
                    <Input
 value={vendorName}
 onChange={(e) => setVendorName(e.target.value)}
 placeholder={tBilingual('e.g. Arambagh Offset Press / Neon Fab Studio', 'যেমন: আরামবাগ অফসেট প্রেস / নিয়ন ফ্যাব্রিক স্টুডিও')}className="mt-1 h-9 text-xs font-medium"/>
                  </div>

                  <div>
                    <Label className={cn("text-xs font-medium text-muted-foreground", isBn && "font-bangla")}>{tBilingual('Vendor Phone', 'ভেন্ডর মোবাইল নম্বর')}</Label>
                    <Input
 value={vendorPhone}
 onChange={(e) => setVendorPhone(e.target.value)}
 placeholder="017XXXXXXXX"className="mt-1 h-9 text-xs tabular-nums"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className={cn("text-xs font-medium text-muted-foreground", isBn && "font-bangla")}>{tBilingual('Vendor Item / Reference Code', 'ভেন্ডর রেফারেন্স কোড')}</Label>
                    <Input
 value={vendorItemCode}
 onChange={(e) => setVendorItemCode(e.target.value)}
 placeholder="e.g. VEND-REF-409"className="mt-1 h-9 text-xs tabular-nums"/>
                  </div>
                  <div>
                    <Label className={cn("text-xs font-medium text-muted-foreground", isBn && "font-bangla")}>{tBilingual('Vendor Address / Location', 'ভেন্ডর ঠিকানা / লোকেশন')}</Label>
                    <Input
 value={vendorAddress}
 onChange={(e) => setVendorAddress(e.target.value)}
 placeholder="e.g. Arambagh Press Lane, Motijheel, Dhaka"className="mt-1 h-9 text-xs"/>
                  </div>
                </div>
              </div>

              <div>
                <Label className={cn("text-xs font-bold text-foreground", isBn && "font-bangla")}>{tBilingual('Catalog Description', 'ক্যাটালগ বিবরণ')}</Label>
                <Input
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder={tBilingual('Brief description visible in catalog and quote proposal...', 'ক্যাটালগ ও কোটেশনে প্রদর্শিত সংক্ষিপ্ত বিবরণ...')}className="mt-1 h-9 text-xs"/>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: VENDOR COSTING, MARKUP & CUSTOMER TIERS */}
        {/* ======================================================== */}
        {activeTab === 'costing' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-4">
              {/* Live Commercial Margin Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-primary/10/50 bg-primary/10 border border-primary/20 border-border/80">
                <div>
                  <span className="text-xs font-bold uppercase text-primary text-primary tracking-wider block">Vendor Cost (Buy)</span>
                  <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">
                    ৳{Number(vendorCost) || 0}
                  </div>
                  <span className="text-xs text-muted-foreground">per {unit}</span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-primary text-primary tracking-wider block">Selling Price</span>
                  <div className="text-lg font-bold tabular-nums text-primary mt-0.5">
                    ৳{Number(sellingPrice) || 0}
                  </div>
                  <span className="text-xs text-muted-foreground">per {unit}</span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-primary text-primary tracking-wider block">Gross Profit</span>
                  <div className="text-lg font-bold tabular-nums text-success mt-0.5">
                    ৳{marginMetrics.grossProfit}
                  </div>
                  <span className="text-xs text-muted-foreground">Markup: {marginMetrics.markupPercent}%</span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-primary text-primary tracking-wider block">Gross Margin %</span>
                  <div className="text-lg font-bold tabular-nums text-success mt-0.5">
                    {marginMetrics.grossMarginPercent}%
                  </div>
                  <span className="text-xs text-muted-foreground">Target: {targetMargin}%</span>
                </div>
              </div>

              {/* Pricing Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">
 Vendor Purchase Cost (৳) <span className="text-destructive">*</span>
                  </Label>
                  <Input
 type="number"min="0"step="0.01"value={vendorCost}
 onChange={(e) => setVendorCost(e.target.value === '' ? '' : Number(e.target.value))}
 placeholder="e.g. 1800"className="mt-1 h-9 text-xs tabular-nums font-bold"/>
                  <span className="text-xs text-muted-foreground mt-0.5 block">Price paid to third-party subcontractor</span>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Target Margin %</Label>
                  <Input
 type="number"min="1"max="99"value={targetMargin}
 onChange={(e) => setTargetMargin(Number(e.target.value))}
 placeholder="35"className="mt-1 h-9 text-xs tabular-nums font-bold text-primary"/>
                  {suggestedSellingPrice > 0 && (
                    <span className="text-xs text-primary mt-0.5 block font-semibold">
 Suggested: ৳{suggestedSellingPrice} (Click to apply)
                    </span>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">
 Catalog Base Selling Price (৳) <span className="text-destructive">*</span>
                  </Label>
                  <Input
 type="number"min="0"step="0.01"value={sellingPrice}
 onChange={(e) => {
 setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))
 if (fieldErrors.sellingPrice) setFieldErrors((prev) => ({ ...prev, sellingPrice: '' }))
                    }}
 placeholder="e.g. 2800"className={cn(
                      'mt-1 h-9 text-xs tabular-nums font-bold text-primary transition-colors',
 fieldErrors.sellingPrice && 'border-danger-border focus-visible:focus:ring-ring bg-danger-surface/30 bg-danger-surface'
                    )}
 required
                  />
                  {fieldErrors.sellingPrice && (
                    <p className="text-xs text-destructive text-destructive font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
                      <span>{fieldErrors.sellingPrice}</span>
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground mt-0.5 block">Default selling price billed to clients</span>
                </div>
              </div>

              {/* Multi-Tier Customer Pricing */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary"/>
                    <span className="text-xs font-bold text-foreground">
 Multi-Tier Customer Pricing (৳ / {unit})
                    </span>
                  </div>
                  <Button
 type="button"variant="outline"size="sm"onClick={handleAutoFillTiers}
 className="h-7 px-2.5 text-xs font-bold text-foreground border-border hover:bg-muted cursor-pointer">
                    <Sparkles className="w-3 h-3 mr-1"/>
 Auto-Calculate Tiers
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Retail Rate (৳)</Label>
                    <Input
 type="number"value={priceTiers.retail}
 onChange={(e) => setPriceTiers({ ...priceTiers, retail: e.target.value === '' ? '' : Number(e.target.value) })}
 placeholder="Retail"className="mt-1 h-8 text-xs tabular-nums"/>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Corporate (-5%)</Label>
                    <Input
 type="number"value={priceTiers.corporate}
 onChange={(e) => setPriceTiers({ ...priceTiers, corporate: e.target.value === '' ? '' : Number(e.target.value) })}
 placeholder="Corporate"className="mt-1 h-8 text-xs tabular-nums text-primary font-semibold"/>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Dealer (-10%)</Label>
                    <Input
 type="number"value={priceTiers.dealer}
 onChange={(e) => setPriceTiers({ ...priceTiers, dealer: e.target.value === '' ? '' : Number(e.target.value) })}
 placeholder="Dealer"className="mt-1 h-8 text-xs tabular-nums text-warning font-semibold"/>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Wholesale (-15%)</Label>
                    <Input
 type="number"value={priceTiers.wholesale}
 onChange={(e) => setPriceTiers({ ...priceTiers, wholesale: e.target.value === '' ? '' : Number(e.target.value) })}
 placeholder="Wholesale"className="mt-1 h-8 text-xs tabular-nums text-success font-semibold"/>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Custom / VIP</Label>
                    <Input
 type="number"value={priceTiers.custom}
 onChange={(e) => setPriceTiers({ ...priceTiers, custom: e.target.value === '' ? '' : Number(e.target.value) })}
 placeholder="Custom"className="mt-1 h-8 text-xs tabular-nums text-primary font-semibold"/>
                  </div>
                </div>
              </div>

              {/* Order Minimums & Floor Margin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Min Order Quantity (MOQ)</Label>
                  <Input
 type="number"min="1"value={minOrderQty}
 onChange={(e) => setMinOrderQty(Math.max(1, Number(e.target.value)))}
 className="mt-1 h-8 text-xs tabular-nums"/>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Min Allowed Margin Floor %</Label>
                  <Input
 type="number"min="0"max="90"value={minAllowedMargin}
 onChange={(e) => setMinAllowedMargin(Number(e.target.value))}
 className="mt-1 h-8 text-xs tabular-nums text-destructive font-semibold"/>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Minimum Floor Selling Price (৳)</Label>
                  <Input
 type="number"min="0"value={minPrice}
 onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
 placeholder="Floor Price"className="mt-1 h-8 text-xs tabular-nums text-foreground"/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: VENDOR SPECS, LEAD TIME & FULFILLMENT */}
        {/* ======================================================== */}
        {activeTab === 'vendor_specs' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-4">
              {/* Non-Inventory Clarification Banner */}
              <div className="p-3.5 rounded-xl border border-primary/20 border-border/60 bg-primary/10/50 bg-primary/10 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 bg-primary/50 text-primary text-primary shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4"/>
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-primary text-primary block">
 Non-Inventory Item Routing Architecture
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-xs">
 This product is configured as a <strong>Non-Inventory Item</strong>. When included in quotations and job orders, it will <strong>not</strong> consume internal warehouse stock rolls (e.g. flex banner or vinyl rolls) and will bypass internal machine queues, routing directly into vendor procurement and dispatch tickets.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">
 Estimated Vendor Turnaround / Lead Time
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
 type="number"min="1"value={turnaroundDays}
 onChange={(e) => setTurnaroundDays(e.target.value === '' ? '' : Number(e.target.value))}
 placeholder="2"className="h-9 text-xs tabular-nums font-bold w-28"/>
                    <span className="text-xs font-medium text-muted-foreground">Working Days</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Fulfillment / Logistics Method</Label>
                  <select
 value={deliveryMethod}
 onChange={(e) => setDeliveryMethod(e.target.value)}
 className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-ring">
                    <option value="vendor_delivery">Vendor delivers to our print shop (ভেন্ডর শপে ডেলিভারি করবে)</option>
                    <option value="shop_pickup">Our shop representative picks up from vendor (আমাদের লোক ভেন্ডর থেকে পিকআপ করবে)</option>
                    <option value="direct_customer_dispatch">Vendor dispatches directly to client (ভেন্ডর সরাসরি ক্লায়েন্টকে পাঠাবে)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">
 Subcontract Technical Specifications & Artwork Guidelines
                </Label>
                <textarea
 value={specifications}
 onChange={(e) => setSpecifications(e.target.value)}
 placeholder="e.g. 120 GSM Art paper, 4-color offset print, 3mm bleed margin, CMYK color space, vector outline font..."rows={3}
 className="mt-1 w-full p-2.5 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-ring"/>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">
 Vendor Instructions / Plate Preparation Notes
                </Label>
                <textarea
 value={vendorNotes}
 onChange={(e) => setVendorNotes(e.target.value)}
 placeholder="Special instructions communicated to the vendor when issuing purchase order..."rows={2}
 className="mt-1 w-full p-2.5 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-ring"/>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: TAXES, GOVERNANCE & INTERNAL NOTES */}
        {/* ======================================================== */}
        {activeTab === 'taxes' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-border space-y-3">
                  <span className="text-xs font-bold text-foreground block">VAT / Tax Settings</span>
                  
                  <div className="flex items-center gap-2">
                    <input
 type="checkbox"id="vat_app"checked={vatApplicable}
 onChange={(e) => setVatApplicable(e.target.checked)}
 className="rounded text-primary focus:ring-ring h-4 w-4 cursor-pointer"/>
                    <Label htmlFor="vat_app"className="text-xs font-medium cursor-pointer">
 VAT Applicable on this Outsource Product
                    </Label>
                  </div>

                  {vatApplicable && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Standard VAT Rate (%)</Label>
                        <Input
 type="number"step="0.1"value={taxRate}
 onChange={(e) => setTaxRate(Number(e.target.value))}
 placeholder="7.5"className="mt-1 h-8 text-xs tabular-nums w-32"/>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
 type="checkbox"id="tax_inc"checked={isTaxInclusive}
 onChange={(e) => setIsTaxInclusive(e.target.checked)}
 className="rounded text-primary focus:ring-ring h-4 w-4 cursor-pointer"/>
                        <Label htmlFor="tax_inc"className="text-xs font-medium cursor-pointer">
 Selling Price is Tax Inclusive (VAT অন্তর্ভুক্ত)
                        </Label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-border space-y-3">
                  <span className="text-xs font-bold text-foreground block">Pricing Permissions & Safety</span>

                  <div className="flex items-center gap-2">
                    <input
 type="checkbox"id="allow_override"checked={allowManualOverride}
 onChange={(e) => setAllowManualOverride(e.target.checked)}
 className="rounded text-primary focus:ring-ring h-4 w-4 cursor-pointer"/>
                    <Label htmlFor="allow_override"className="text-xs font-medium cursor-pointer">
 Allow Sales Staff to Override Price on Quotation / Invoice
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
 type="checkbox"id="is_active_check"checked={isActive}
 onChange={(e) => setIsActive(e.target.checked)}
 className="rounded text-success focus:ring-ring h-4 w-4 cursor-pointer"/>
                    <Label htmlFor="is_active_check"className="text-xs font-medium cursor-pointer">
 Active & Available in Quotation Catalog
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">
 Internal Workshop Notes (Shielded from Customer Invoices)
                </Label>
                <textarea
 value={internalNotes}
 onChange={(e) => setInternalNotes(e.target.value)}
 placeholder="Private internal notes regarding vendor negotiation, margin caps, or courier contacts..."rows={3}
 className="mt-1 w-full p-2.5 rounded-lg border border-input bg-card text-xs font-medium focus:ring-1 focus:ring-ring"/>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  )
}

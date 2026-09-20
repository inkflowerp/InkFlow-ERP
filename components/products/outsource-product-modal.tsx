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
import type { ProductRecord, UnitOfMeasure, ProductPriceTiers, OutsourceConfiguration } from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { formatBDT } from '@/lib/formatters'
import { calculateGrossMargin, calculateSuggestedSellingPrice } from '@/lib/units'
import { cn } from '@/lib/utils'

interface OutsourceProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (productData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
  suppliers?: Array<{ id: string; name: string; contact_person?: string; phone?: string }>
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
}: OutsourceProductModalProps) {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
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
      setSku(`OUT-${Date.now().toString().slice(-5)}`)
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
    setErrorMessage(null)
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
      setErrorMessage('Product name is required.')
      setActiveTab('basic')
      return
    }

    if (sellingPrice === '' || Number(sellingPrice) < 0) {
      setErrorMessage('Please enter a valid base selling price.')
      setActiveTab('costing')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

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
        markup_percent: marginMetrics.markupPercent,
        turnaround_days: turnaroundDays !== '' ? Number(turnaroundDays) : 2,
        delivery_method: deliveryMethod,
        specifications: specifications.trim() || undefined,
        vendor_notes: vendorNotes.trim() || undefined,
        is_non_inventory: true,
      }

      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `OUT-${Date.now().toString().slice(-5)}`,
        category: category || 'offset_printing',
        product_type: 'outsource',
        entity_type: 'outsource',
        commercial_type: 'outsource',
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
        vendor_id: preferredVendorId || undefined,
        vendor_name: vendorName.trim() || undefined,
        vendor_phone: vendorPhone.trim() || undefined,
        vendor_address: vendorAddress.trim() || undefined,
        vendor_item_code: vendorItemCode.trim() || undefined,
        turnaround_days: turnaroundDays !== '' ? Number(turnaroundDays) : 2,
        outsource_notes: vendorNotes.trim() || undefined,
        outsource_category: category,
        outsource_config: outsourceConfig,
        material_spec: specifications.trim() || undefined,
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
      setErrorMessage(err.message || 'Failed to save outsource product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const TABS_CONFIG = [
    { id: 'basic', label: '1. Identity & Vendor', icon: Share2 },
    { id: 'costing', label: '2. Costing & Pricing', icon: DollarSign },
    { id: 'vendor_specs', label: '3. Specs & Lead Time', icon: Clock },
    { id: 'taxes', label: '4. Taxes & Notes', icon: Warehouse },
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 font-bold shrink-0 ring-1 ring-purple-500/20">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Edit Outsource Product: ${initialData.name}` : 'New Outsource Product'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                Non-Inventory Item
              </Badge>
              {sellingPrice !== '' && Number(sellingPrice) > 0 && (
                <Badge variant="outline" className="text-[10px] font-mono py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  ৳{Number(sellingPrice).toFixed(2)} / {unit}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Subcontracted offset printing, neon signs, computer embroidery, hot foil, and special jobs routed to third-party vendors without internal stock depletion.
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
                className="h-10 px-4 rounded-xl font-bold border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 gap-1.5 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>{initialData ? 'Update Outsource Product' : 'Save Outsource Product'}</span>
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
                <Icon className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400')} />
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
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Outsource Product Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Offset Leaflet A4 120 GSM (1,000 pcs)"
                    className="mt-1 h-9 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    নাম (বাংলায়)
                  </Label>
                  <Input
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    placeholder="উদা: অফসেট লিফলেট এ৪ ১২০ জিএসএম (১,০০০ পিস)"
                    className="mt-1 h-9 text-xs font-bengali"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">SKU Code</Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="OUT-1002"
                    className="mt-1 h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-purple-500"
                  >
                    {OUTSOURCE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Selling Unit</Label>
                  <select
                    value={unit}
                    onChange={(e) => {
                      const val = e.target.value as UnitOfMeasure
                      setUnit(val)
                      setPurchaseUnit(val)
                    }}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-purple-500 font-mono"
                  >
                    {OUTSOURCE_PRODUCT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendor Mapping Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Preferred Outsource Vendor & Contact
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {suppliers.length > 0 && (
                    <div>
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Select Existing Vendor</Label>
                      <select
                        value={preferredVendorId}
                        onChange={(e) => handleSupplierSelect(e.target.value)}
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">-- Choose Vendor / Press --</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.phone ? `(${s.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={cn(suppliers.length === 0 ? 'sm:col-span-2' : '')}>
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Vendor / Workshop Name</Label>
                    <Input
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="e.g. Arambagh Offset Press / Neon Fab Studio"
                      className="mt-1 h-9 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Vendor Phone</Label>
                    <Input
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="mt-1 h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Vendor Item / Reference Code</Label>
                    <Input
                      value={vendorItemCode}
                      onChange={(e) => setVendorItemCode(e.target.value)}
                      placeholder="e.g. VEND-REF-409"
                      className="mt-1 h-9 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Vendor Address / Location</Label>
                    <Input
                      value={vendorAddress}
                      onChange={(e) => setVendorAddress(e.target.value)}
                      placeholder="e.g. Arambagh Press Lane, Motijheel, Dhaka"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Catalog Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description visible in catalog and quote proposal..."
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: VENDOR COSTING, MARKUP & CUSTOMER TIERS */}
        {/* ======================================================== */}
        {activeTab === 'costing' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              {/* Live Commercial Margin Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80">
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 tracking-wider block">Vendor Cost (Buy)</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    ৳{Number(vendorCost) || 0}
                  </div>
                  <span className="text-[10px] text-slate-500">per {unit}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 tracking-wider block">Selling Price</span>
                  <div className="text-lg font-bold font-mono text-blue-600 mt-0.5">
                    ৳{Number(sellingPrice) || 0}
                  </div>
                  <span className="text-[10px] text-slate-500">per {unit}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 tracking-wider block">Gross Profit</span>
                  <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                    ৳{marginMetrics.grossProfit}
                  </div>
                  <span className="text-[10px] text-slate-500">Markup: {marginMetrics.markupPercent}%</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 tracking-wider block">Gross Margin %</span>
                  <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                    {marginMetrics.grossMarginPercent}%
                  </div>
                  <span className="text-[10px] text-slate-500">Target: {targetMargin}%</span>
                </div>
              </div>

              {/* Pricing Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Vendor Purchase Cost (৳) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={vendorCost}
                    onChange={(e) => setVendorCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 1800"
                    className="mt-1 h-9 text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Price paid to third-party subcontractor</span>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Margin %</Label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    placeholder="35"
                    className="mt-1 h-9 text-xs font-mono font-bold text-purple-600"
                  />
                  {suggestedSellingPrice > 0 && (
                    <span className="text-[10px] text-purple-600 mt-0.5 block font-semibold">
                      Suggested: ৳{suggestedSellingPrice} (Click to apply)
                    </span>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Catalog Base Selling Price (৳) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2800"
                    className="mt-1 h-9 text-xs font-mono font-bold text-blue-600"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default selling price billed to clients</span>
                </div>
              </div>

              {/* Multi-Tier Customer Pricing */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Multi-Tier Customer Pricing (৳ / {unit})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFillTiers}
                    className="h-7 px-2.5 text-[11px] font-bold text-purple-700 border-purple-200 hover:bg-purple-50 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Auto-Calculate Tiers
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500">Retail Rate (৳)</Label>
                    <Input
                      type="number"
                      value={priceTiers.retail}
                      onChange={(e) => setPriceTiers({ ...priceTiers, retail: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="Retail"
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500">Corporate (-5%)</Label>
                    <Input
                      type="number"
                      value={priceTiers.corporate}
                      onChange={(e) => setPriceTiers({ ...priceTiers, corporate: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="Corporate"
                      className="mt-1 h-8 text-xs font-mono text-indigo-600 font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500">Dealer (-10%)</Label>
                    <Input
                      type="number"
                      value={priceTiers.dealer}
                      onChange={(e) => setPriceTiers({ ...priceTiers, dealer: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="Dealer"
                      className="mt-1 h-8 text-xs font-mono text-amber-600 font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500">Wholesale (-15%)</Label>
                    <Input
                      type="number"
                      value={priceTiers.wholesale}
                      onChange={(e) => setPriceTiers({ ...priceTiers, wholesale: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="Wholesale"
                      className="mt-1 h-8 text-xs font-mono text-emerald-600 font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500">Custom / VIP</Label>
                    <Input
                      type="number"
                      value={priceTiers.custom}
                      onChange={(e) => setPriceTiers({ ...priceTiers, custom: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="Custom"
                      className="mt-1 h-8 text-xs font-mono text-purple-600 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Order Minimums & Floor Margin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Min Order Quantity (MOQ)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(Math.max(1, Number(e.target.value)))}
                    className="mt-1 h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Min Allowed Margin Floor %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={minAllowedMargin}
                    onChange={(e) => setMinAllowedMargin(Number(e.target.value))}
                    className="mt-1 h-8 text-xs font-mono text-rose-600 font-semibold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Minimum Floor Selling Price (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Floor Price"
                    className="mt-1 h-8 text-xs font-mono text-slate-700 dark:text-slate-300"
                  />
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
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              {/* Non-Inventory Clarification Banner */}
              <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-purple-900 dark:text-purple-200 block">
                    Non-Inventory Item Routing Architecture
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    This product is configured as a <strong>Non-Inventory Item</strong>. When included in quotations and job orders, it will <strong>not</strong> consume internal warehouse stock rolls (e.g. flex banner or vinyl rolls) and will bypass internal machine queues, routing directly into vendor procurement and dispatch tickets.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Estimated Vendor Turnaround / Lead Time
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min="1"
                      value={turnaroundDays}
                      onChange={(e) => setTurnaroundDays(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="2"
                      className="h-9 text-xs font-mono font-bold w-28"
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Working Days</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fulfillment / Logistics Method</Label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="vendor_delivery">Vendor delivers to our print shop (ভেন্ডর শপে ডেলিভারি করবে)</option>
                    <option value="shop_pickup">Our shop representative picks up from vendor (আমাদের লোক ভেন্ডর থেকে পিকআপ করবে)</option>
                    <option value="direct_customer_dispatch">Vendor dispatches directly to client (ভেন্ডর সরাসরি ক্লায়েন্টকে পাঠাবে)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subcontract Technical Specifications & Artwork Guidelines
                </Label>
                <textarea
                  value={specifications}
                  onChange={(e) => setSpecifications(e.target.value)}
                  placeholder="e.g. 120 GSM Art paper, 4-color offset print, 3mm bleed margin, CMYK color space, vector outline font..."
                  rows={3}
                  className="mt-1 w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vendor Instructions / Plate Preparation Notes
                </Label>
                <textarea
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  placeholder="Special instructions communicated to the vendor when issuing purchase order..."
                  rows={2}
                  className="mt-1 w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: TAXES, GOVERNANCE & INTERNAL NOTES */}
        {/* ======================================================== */}
        {activeTab === 'taxes' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">VAT / Tax Settings</span>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="vat_app"
                      checked={vatApplicable}
                      onChange={(e) => setVatApplicable(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                    <Label htmlFor="vat_app" className="text-xs font-medium cursor-pointer">
                      VAT Applicable on this Outsource Product
                    </Label>
                  </div>

                  {vatApplicable && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <Label className="text-xs font-medium text-slate-600">Standard VAT Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={taxRate}
                          onChange={(e) => setTaxRate(Number(e.target.value))}
                          placeholder="7.5"
                          className="mt-1 h-8 text-xs font-mono w-32"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="tax_inc"
                          checked={isTaxInclusive}
                          onChange={(e) => setIsTaxInclusive(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                        />
                        <Label htmlFor="tax_inc" className="text-xs font-medium cursor-pointer">
                          Selling Price is Tax Inclusive (VAT অন্তর্ভুক্ত)
                        </Label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Pricing Permissions & Safety</span>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allow_override"
                      checked={allowManualOverride}
                      onChange={(e) => setAllowManualOverride(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                    />
                    <Label htmlFor="allow_override" className="text-xs font-medium cursor-pointer">
                      Allow Sales Staff to Override Price on Quotation / Invoice
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="is_active_check"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                    />
                    <Label htmlFor="is_active_check" className="text-xs font-medium cursor-pointer">
                      Active & Available in Quotation Catalog
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Internal Workshop Notes (Shielded from Customer Invoices)
                </Label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private internal notes regarding vendor negotiation, margin caps, or courier contacts..."
                  rows={3}
                  className="mt-1 w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  )
}

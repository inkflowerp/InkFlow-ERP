'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ShoppingBag,
  Plus,
  Trash2,
  Calendar,
  Building,
  DollarSign,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Truck,
  FileText,
  CreditCard,
  Search,
  ArrowRight,
  ArrowLeft,
  Info,
  BadgePercent,
  Warehouse,
  ShieldCheck,
  Tag,
  Copy,
  Receipt,
  Phone,
  User,
  MapPin,
  Clock,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { createPurchaseOrderAction } from '@/actions/purchase.actions'
import { SupplierRecord } from '@/types/crm.types'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import { PurchaseOrderRecord, PurchaseOrderItemRecord } from '@/types/purchase.types'
import { ProductRecord, MaterialPurchaseConfig } from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export interface NewPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPurchaseCreated?: (po: PurchaseOrderRecord) => void
  defaultSupplierId?: string
}

export interface PurchaseItemFormState {
  id: string
  item_type: 'material' | 'ready_product' | 'custom'
  material_id: string
  material_name: string
  category?: string
  config_description?: string
  roll_width_ft?: number
  roll_length_ft?: number
  roll_sqft?: number
  current_stock_hint?: number
  reorder_level_hint?: number
  quantity: number
  unit: string
  unit_cost: number
  discount_percent: number
  tax_percent: number
  total_cost: number
  notes?: string
}

const PAYMENT_TERMS_PRESETS = [
  { value: 'immediate', labelEn: '100% Immediate / COD', labelBn: '১০০% নগদ / ডেলিভারিতে পরিশোধ' },
  { value: 'net_7', labelEn: 'Net 7 Days Credit', labelBn: '৭ দিনের বাকিতে পরিশোধ' },
  { value: 'net_15', labelEn: 'Net 15 Days Credit', labelBn: '১৫ দিনের বাকিতে পরিশোধ' },
  { value: 'net_30', labelEn: 'Net 30 Days Credit', labelBn: '৩০ দিনের বাকিতে পরিশোধ' },
  { value: 'advance_50', labelEn: '50% Advance / 50% on Delivery', labelBn: '৫০% অগ্রিম / ৫০% ডেলিভারিতে' },
  { value: 'monthly', labelEn: 'Monthly Ledger Settlement', labelBn: 'মাসিক খতিয়ান সমন্বয়' },
  { value: 'custom', labelEn: 'Custom Agreement', labelBn: 'কাস্টম চুক্তি' },
]

const DELIVERY_METHODS = [
  { value: 'supplier_delivery', labelEn: 'Supplier Delivery to Store', labelBn: 'সাপ্লায়ার ডেলিভারি' },
  { value: 'factory_pickup', labelEn: 'Company Vehicle Pickup', labelBn: 'কোম্পানি পরিবহন পিকআপ' },
  { value: 'courier', labelEn: 'Courier / Third-party Parcel', labelBn: 'কুরিয়ার / ট্রান্সপোর্ট' },
  { value: 'gate_pickup', labelEn: 'Direct Mill Gate Delivery', labelBn: 'মিল গেট ডেলিভারি' },
]

const QUICK_NOTE_TEMPLATES = [
  'Inspect roll grammage and surface coating before unloading.',
  'Include original NBR Mushak 6.3 Tax Invoice / Challan.',
  'Batch test ink viscosity and curing speed upon delivery.',
  'Deliver during morning receiving window (10:00 AM - 1:00 PM).',
]

export function NewPurchaseModal({
  open,
  onOpenChange,
  onPurchaseCreated,
  defaultSupplierId,
}: NewPurchaseModalProps) {
  const { company, currentUser, currentBranch } = useTenant()
  const { locale, tBilingual } = useI18n()
  const { can } = usePermissions()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()

  // Wizard active step: 1: Supplier & Logistics, 2: Materials & Items, 3: Commercials & Terms
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1)

  // Data sources
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [readyProducts, setReadyProducts] = useState<ProductRecord[]>([])
  const [purchaseConfigs, setPurchaseConfigs] = useState<MaterialPurchaseConfig[]>([])
  const [locations, setLocations] = useState<InventoryLocationRecord[]>([])

  // STEP 1: Supplier & Logistics State
  const [supplierMode, setSupplierMode] = useState<'existing' | 'new'>('existing')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(defaultSupplierId || '')
  const [customSupplierName, setCustomSupplierName] = useState<string>('')
  const [supplierPhone, setSupplierPhone] = useState<string>('')
  const [supplierEmail, setSupplierEmail] = useState<string>('')
  const [supplierAddress, setSupplierAddress] = useState<string>('')
  const [supplierContactPerson, setSupplierContactPerson] = useState<string>('')
  const [supplierReference, setSupplierReference] = useState<string>('')
  const [targetLocationId, setTargetLocationId] = useState<string>('')
  const [poDate, setPoDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 5)
    return d.toISOString().split('T')[0]
  })
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal')
  const [deliveryMethod, setDeliveryMethod] = useState<string>('supplier_delivery')

  // STEP 2: Items Catalog State
  const [items, setItems] = useState<PurchaseItemFormState[]>([
    {
      id: `poi-${Date.now()}-1`,
      item_type: 'material',
      material_id: '',
      material_name: '',
      quantity: 1,
      unit: 'roll',
      unit_cost: 0,
      discount_percent: 0,
      tax_percent: 0,
      total_cost: 0,
    },
  ])

  // STEP 3: Commercials, Taxes & Payment State
  const [vatType, setVatType] = useState<'none' | '15' | '7.5' | '5' | 'custom'>('none')
  const [customVatAmount, setCustomVatAmount] = useState<number>(0)
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [shippingCost, setShippingCost] = useState<number>(0)
  const [otherCharges, setOtherCharges] = useState<number>(0)
  const [paymentTerms, setPaymentTerms] = useState<string>('net_15')
  const [customPaymentTerms, setCustomPaymentTerms] = useState<string>('')
  const [advancePaid, setAdvancePaid] = useState<number>(0)
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<'cash' | 'bank' | 'mfs' | 'cheque'>('bank')
  const [advanceRefNumber, setAdvanceRefNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [termsAndConditions, setTermsAndConditions] = useState<string>('')

  // Submission & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load suppliers, materials, products, configurations and warehouse locations
  useEffect(() => {
    if (open) {
      const supList = PrintERPDataStore.getAll<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, company?.id) || []
      const matList = PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, company?.id) || []
      const prodList = (PrintERPDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, company?.id) || [])
        .filter((p) => p.is_active !== false && p.entity_type !== 'service')
      const configList = PrintERPDataStore.getAll<MaterialPurchaseConfig>(STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS, company?.id) || []
      const locList = PrintERPDataStore.getAll<InventoryLocationRecord>(STORAGE_KEYS.LOCATIONS, company?.id) || []

      setSuppliers(supList)
      setMaterials(matList)
      setReadyProducts(prodList)
      setPurchaseConfigs(configList)
      setLocations(locList)
      setErrorMessage(null)
      setSuccessMessage(null)
      setIsSubmitting(false)

      if (locList.length > 0 && !targetLocationId) {
        const defaultLoc = locList.find((l) => l.location_type === 'raw_material_store' || l.location_type === 'main_store') || locList[0]
        setTargetLocationId(defaultLoc.id)
      }

      if (defaultSupplierId) {
        setSelectedSupplierId(defaultSupplierId)
        const targetSup = supList.find((s) => s.id === defaultSupplierId)
        if (targetSup) {
          setSupplierPhone(targetSup.mobile || '')
          setSupplierEmail(targetSup.email || '')
          setSupplierAddress(targetSup.address || '')
          setSupplierContactPerson(targetSup.contact_person || '')
        }
      } else if (supList.length > 0 && !selectedSupplierId && supplierMode === 'existing') {
        setSelectedSupplierId(supList[0].id)
        setSupplierPhone(supList[0].mobile || '')
        setSupplierEmail(supList[0].email || '')
        setSupplierAddress(supList[0].address || '')
        setSupplierContactPerson(supList[0].contact_person || '')
      }
    }
  }, [open, defaultSupplierId, company?.id])

  // Sync supplier details when dropdown changes
  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId)
    const sup = suppliers.find((s) => s.id === supId)
    if (sup) {
      setSupplierPhone(sup.mobile || '')
      setSupplierEmail(sup.email || '')
      setSupplierAddress(sup.address || '')
      setSupplierContactPerson(sup.contact_person || '')
    }
  }

  // Selected supplier entity object
  const currentSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || null
  }, [suppliers, selectedSupplierId])

  // Handle Item Selection (Material, Roll Config, Ready Product, or Custom)
  const handleItemSelect = (index: number, selectionKey: string) => {
    setItems((prev) => {
      const next = [...prev]
      const current = next[index]

      if (!selectionKey) {
        next[index] = {
          ...current,
          material_id: '',
          material_name: '',
          category: undefined,
          config_description: undefined,
          roll_width_ft: undefined,
          roll_length_ft: undefined,
          roll_sqft: undefined,
          current_stock_hint: undefined,
          reorder_level_hint: undefined,
          unit_cost: 0,
          total_cost: 0,
        }
        return next
      }

      // Check custom item selection
      if (selectionKey === 'custom_new') {
        next[index] = {
          ...current,
          item_type: 'custom',
          material_id: `custom-${Date.now()}`,
          material_name: 'Custom Ad-hoc Material',
          category: 'Custom / Spot Order',
          unit: 'pcs',
          unit_cost: 0,
          total_cost: 0,
        }
        return next
      }

      // Check Material Purchase Configuration (e.g. "mpc:mpc-id")
      if (selectionKey.startsWith('mpc:')) {
        const configId = selectionKey.replace('mpc:', '')
        const config = purchaseConfigs.find((c) => c.id === configId)
        const parentMat = materials.find((m) => m.id === config?.material_id)
        if (config && parentMat) {
          const cost = Number(config.purchase_price) || 0
          const qty = Number(current.quantity) || 1
          const discount = Number(current.discount_percent) || 0
          const sqft = Number(config.width_ft) * Number(config.length_ft)
          const lineCost = Math.round(qty * cost * (1 - discount / 100))

          next[index] = {
            ...current,
            item_type: 'material',
            material_id: parentMat.id,
            material_name: `${parentMat.name} (${config.width_ft}ft × ${config.length_ft}ft)`,
            category: parentMat.category,
            config_description: `${config.width_ft}ft × ${config.length_ft}ft Roll (${sqft} sft/roll)`,
            roll_width_ft: config.width_ft,
            roll_length_ft: config.length_ft,
            roll_sqft: sqft,
            current_stock_hint: parentMat.current_stock,
            reorder_level_hint: parentMat.min_stock_level,
            unit: config.unit || 'roll',
            unit_cost: cost,
            total_cost: lineCost,
          }
          return next
        }
      }

      // Check Ready Product (e.g. "prod:prod-id")
      if (selectionKey.startsWith('prod:')) {
        const prodId = selectionKey.replace('prod:', '')
        const prod = readyProducts.find((p) => p.id === prodId)
        if (prod) {
          const cost =
            Number((prod as any).cost_price) ||
            Number((prod as any).purchase_price) ||
            Number(prod.base_cost) ||
            Math.round(Number(prod.selling_price || 0) * 0.6) ||
            0
          const qty = Number(current.quantity) || 1
          const discount = Number(current.discount_percent) || 0
          const lineCost = Math.round(qty * cost * (1 - discount / 100))

          next[index] = {
            ...current,
            item_type: 'ready_product',
            material_id: prod.id,
            material_name: prod.name,
            category: 'Ready Products & Hardware',
            config_description: prod.sku ? `SKU: ${prod.sku} | ${prod.dimensions_spec || 'Hardware'}` : 'Ready Product',
            current_stock_hint: Number((prod as any).current_stock || prod.usage_stats?.jobCount || 0),
            reorder_level_hint: prod.min_order_quantity || 5,
            unit: prod.selling_unit || (prod as any).sell_unit || prod.unit || 'pcs',
            unit_cost: cost,
            total_cost: lineCost,
          }
          return next
        }
      }

      // Check standard Material (e.g. "mat:mat-id")
      const matId = selectionKey.replace('mat:', '')
      const mat = materials.find((m) => m.id === matId)
      if (mat) {
        const cost = Number(mat.last_purchase_price) || Number(mat.average_cost) || 0
        const qty = Number(current.quantity) || 1
        const discount = Number(current.discount_percent) || 0
        const lineCost = Math.round(qty * cost * (1 - discount / 100))

        next[index] = {
          ...current,
          item_type: 'material',
          material_id: mat.id,
          material_name: mat.name,
          category: mat.category,
          config_description: mat.dimension_unit
            ? `${mat.width || 4} × ${mat.length || 164} ${mat.dimension_unit}`
            : undefined,
          current_stock_hint: mat.current_stock,
          reorder_level_hint: mat.min_stock_level,
          unit: mat.unit || 'pcs',
          unit_cost: cost,
          total_cost: lineCost,
        }
      }

      return next
    })
  }

  // Handle Item row updates
  const handleItemChange = (index: number, field: keyof PurchaseItemFormState, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      const current = { ...next[index], [field]: value }
      const qty = Number(field === 'quantity' ? value : current.quantity) || 0
      const cost = Number(field === 'unit_cost' ? value : current.unit_cost) || 0
      const disc = Number(field === 'discount_percent' ? value : current.discount_percent) || 0
      current.total_cost = Math.max(0, Math.round(qty * cost * (1 - disc / 100)))
      next[index] = current
      return next
    })
  }

  // Add Item Row
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `poi-${Date.now()}-${prev.length + 1}`,
        item_type: 'material',
        material_id: '',
        material_name: '',
        quantity: 1,
        unit: 'pcs',
        unit_cost: 0,
        discount_percent: 0,
        tax_percent: 0,
        total_cost: 0,
      },
    ])
  }

  // Duplicate Item Row
  const handleDuplicateItem = (index: number) => {
    const src = items[index]
    if (!src) return
    setItems((prev) => [
      ...prev,
      {
        ...src,
        id: `poi-${Date.now()}-${prev.length + 1}`,
      },
    ])
  }

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculations for Financial Commercials
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0)
  }, [items])

  const calculatedDiscountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((itemsSubtotal * (Number(discountValue) || 0)) / 100)
    }
    return Math.min(itemsSubtotal, Number(discountValue) || 0)
  }, [itemsSubtotal, discountType, discountValue])

  const subtotalAfterDiscount = useMemo(() => {
    return Math.max(0, itemsSubtotal - calculatedDiscountAmount)
  }, [itemsSubtotal, calculatedDiscountAmount])

  const calculatedVatAmount = useMemo(() => {
    if (vatType === '15') return Math.round(subtotalAfterDiscount * 0.15)
    if (vatType === '7.5') return Math.round(subtotalAfterDiscount * 0.075)
    if (vatType === '5') return Math.round(subtotalAfterDiscount * 0.05)
    if (vatType === 'custom') return Number(customVatAmount) || 0
    return 0
  }, [vatType, subtotalAfterDiscount, customVatAmount])

  const grandTotal = useMemo(() => {
    return Math.max(
      0,
      subtotalAfterDiscount + calculatedVatAmount + (Number(shippingCost) || 0) + (Number(otherCharges) || 0)
    )
  }, [subtotalAfterDiscount, calculatedVatAmount, shippingCost, otherCharges])

  const dueAmount = useMemo(() => {
    return Math.max(0, grandTotal - (Number(advancePaid) || 0))
  }, [grandTotal, advancePaid])

  // Step Validation & Navigation
  const validateStep = (step: number): boolean => {
    setErrorMessage(null)

    if (step === 1) {
      if (supplierMode === 'existing') {
        if (!selectedSupplierId) {
          setErrorMessage('Please select a registered supplier from the list.')
          return false
        }
      } else {
        if (!customSupplierName.trim()) {
          setErrorMessage('Supplier Name is required for one-time / spot supplier.')
          return false
        }
        if (!supplierPhone.trim()) {
          setErrorMessage('Supplier Mobile Phone is required.')
          return false
        }
      }
      if (!expectedDate) {
        setErrorMessage('Expected Delivery Date is required.')
        return false
      }
      return true
    }

    if (step === 2) {
      if (items.length === 0) {
        setErrorMessage('Please add at least one material or item.')
        return false
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (!it.material_name.trim()) {
          setErrorMessage(`Item #${i + 1} name or material selection is required.`)
          return false
        }
        if (Number(it.quantity) <= 0) {
          setErrorMessage(`Item #${i + 1} (${it.material_name}) quantity must be greater than 0.`)
          return false
        }
        if (Number(it.unit_cost) < 0) {
          setErrorMessage(`Item #${i + 1} (${it.material_name}) unit rate cannot be negative.`)
          return false
        }
      }
      return true
    }

    return true
  }

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      if (activeStep < 3) {
        setActiveStep((prev) => (prev + 1) as 2 | 3)
      }
    }
  }

  const handlePrevStep = () => {
    setErrorMessage(null)
    if (activeStep > 1) {
      setActiveStep((prev) => (prev - 1) as 1 | 2)
    }
  }

  const resetForm = () => {
    setActiveStep(1)
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(false)
    setSupplierMode('existing')
    setCustomSupplierName('')
    setSupplierPhone('')
    setSupplierEmail('')
    setSupplierAddress('')
    setSupplierContactPerson('')
    setSupplierReference('')
    setPriority('normal')
    setDeliveryMethod('supplier_delivery')
    setVatType('none')
    setCustomVatAmount(0)
    setDiscountType('fixed')
    setDiscountValue(0)
    setShippingCost(0)
    setOtherCharges(0)
    setPaymentTerms('net_15')
    setCustomPaymentTerms('')
    setAdvancePaid(0)
    setAdvanceRefNumber('')
    setNotes('')
    setTermsAndConditions('')
    setItems([
      {
        id: `poi-${Date.now()}-1`,
        item_type: 'material',
        material_id: '',
        material_name: '',
        quantity: 1,
        unit: 'pcs',
        unit_cost: 0,
        discount_percent: 0,
        tax_percent: 0,
        total_cost: 0,
      },
    ])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Permission check
    const canCreate =
      can('create', 'purchases') || can('create', 'inventory') || can('manage', 'inventory')
    if (!canCreate) {
      setErrorMessage('You do not have permission to create purchase orders.')
      return
    }

    const quota = checkCanCreate('monthly_orders')
    if (!quota.allowed) {
      openLimitExceededModal('monthly_orders')
      return
    }

    if (!validateStep(1) || !validateStep(2)) {
      return
    }

    const supName =
      supplierMode === 'existing'
        ? currentSupplier?.supplier_name || 'Selected Supplier'
        : customSupplierName.trim()

    const supPhone =
      supplierMode === 'existing'
        ? currentSupplier?.mobile || supplierPhone || '+8801700000000'
        : supplierPhone.trim()

    const resolvedPaymentTerms =
      paymentTerms === 'custom'
        ? customPaymentTerms.trim() || 'Custom Terms'
        : PAYMENT_TERMS_PRESETS.find((p) => p.value === paymentTerms)?.labelEn || paymentTerms

    setIsSubmitting(true)

    try {
      const poNum = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
      const poItems: PurchaseOrderItemRecord[] = items.map((it) => ({
        id: it.id,
        purchase_order_id: '',
        material_id: it.material_id || `mat-${Date.now()}`,
        material_name: it.material_name,
        supplier_sku: it.config_description || null,
        quantity_ordered: it.quantity,
        quantity_received: 0,
        quantity_remaining: it.quantity,
        unit: it.unit,
        unit_cost: it.unit_cost,
        discount_percent: it.discount_percent || 0,
        tax_percent: it.tax_percent || 0,
        total_cost: it.total_cost,
        expected_date: expectedDate,
        notes: it.notes || null,
      }))

      const payload: Partial<PurchaseOrderRecord> & {
        supplier_id: string
        supplier_name: string
        supplier_phone: string
        items: PurchaseOrderItemRecord[]
      } = {
        company_id: company?.id || 'c-01',
        branch_id: currentBranch?.id || null,
        po_number: poNum,
        supplier_id: supplierMode === 'existing' ? selectedSupplierId : `sup-spot-${Date.now()}`,
        supplier_name: supName,
        supplier_phone: supPhone,
        supplier_email: supplierMode === 'existing' ? currentSupplier?.email : supplierEmail,
        supplier_address: supplierMode === 'existing' ? currentSupplier?.address : supplierAddress,
        supplier_reference: supplierReference || undefined,
        po_date: poDate,
        expected_delivery_date: expectedDate,
        currency: 'BDT',
        payment_terms: resolvedPaymentTerms,
        status: 'issued',
        subtotal: itemsSubtotal,
        vat_amount: calculatedVatAmount,
        discount_amount: calculatedDiscountAmount,
        shipping_cost: Number(shippingCost) || 0,
        other_charges: Number(otherCharges) || 0,
        grand_total: grandTotal,
        paid_amount: Number(advancePaid) || 0,
        due_amount: dueAmount,
        notes: notes || 'Standard procurement order issued via PO Control Hub',
        terms_and_conditions:
          termsAndConditions ||
          `Priority: ${priority.toUpperCase()} | Delivery: ${deliveryMethod} | Target Location: ${
            locations.find((l) => l.id === targetLocationId)?.location_name || 'Main Warehouse'
          }`,
        created_by_name: currentUser?.profile?.full_name || 'Procurement Officer',
        items: poItems,
      }

      // 1. Try server action
      const res = await createPurchaseOrderAction(payload, company?.id)

      let savedPO: PurchaseOrderRecord
      if (res.success && res.data) {
        savedPO = res.data
      } else {
        // Fallback to client data store for offline / dev demo
        savedPO = {
          id: `po-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload,
        } as PurchaseOrderRecord

        PrintERPDataStore.addItem<PurchaseOrderRecord>(STORAGE_KEYS.PURCHASE_ORDERS, savedPO)
      }

      setSuccessMessage(`Purchase Order ${savedPO.po_number} issued successfully!`)
      refreshUsage()
      onPurchaseCreated?.(savedPO)

      setTimeout(() => {
        onOpenChange(false)
        resetForm()
      }, 1000)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to issue purchase order.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-500 to-amber-700 text-white shadow-md flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Issue Purchase Order (PO)', 'নতুন ক্রয় আদেশ (PO) জারি করুন')}
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono py-0.5 px-2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
              >
                Procurement
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Formal procurement commitment with agreed rates, specifications & delivery schedule',
                'মহাজনের দরপত্র, কাঁচামালের স্পেসিফিকেশন ও ডেলিভারি তারিখে অফিশিয়াল পারচেজ অর্ডার'
              )}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="w-full sm:w-auto min-h-[40px] text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                {tBilingual('Previous Step', 'পূর্ববর্তী ধাপ')}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto min-h-[40px] text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {activeStep < 3 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto min-h-[40px] text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 shadow-sm cursor-pointer"
              >
                <span>{tBilingual('Continue to Next Step', 'পরবর্তী ধাপ')}</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[40px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    <span>Issuing Official PO...</span>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{tBilingual('Issue Official PO', 'ক্রয় আদেশ সম্পন্ন করুন')}</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1 pb-2">
        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 rounded-xl border border-rose-300 dark:border-rose-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* STEP PROGRESS NAVIGATION TABS */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              activeStep === 1
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <div
              className={cn(
                'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono',
                activeStep === 1
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              )}
            >
              1
            </div>
            <span className="truncate">{tBilingual('1. Supplier & Logistics', '১. সাপ্লায়ার ও লজিস্টিক')}</span>
          </button>

          <button
            type="button"
            onClick={() => validateStep(1) && setActiveStep(2)}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              activeStep === 2
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <div
              className={cn(
                'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono',
                activeStep === 2
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              )}
            >
              2
            </div>
            <span className="truncate">
              {tBilingual('2. Materials & Items', '২. কাঁচামাল ও আইটেম')} ({items.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => validateStep(1) && validateStep(2) && setActiveStep(3)}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              activeStep === 3
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <div
              className={cn(
                'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono',
                activeStep === 3
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              )}
            >
              3
            </div>
            <span className="truncate">{tBilingual('3. Commercials & Terms', '৩. হিসাব ও শর্তাবলী')}</span>
          </button>
        </div>

        {/* STEP 1: SUPPLIER SELECTION & LOGISTICS */}
        {activeStep === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Supplier Mode Selector */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {tBilingual('Vendor & Supplier Intelligence', 'সরবরাহকারী নির্বাচন')}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setSupplierMode('existing')}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer text-[11px]',
                      supplierMode === 'existing'
                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    {tBilingual('Registered Supplier', 'তালিকাভুক্ত সাপ্লায়ার')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupplierMode('new')}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer text-[11px]',
                      supplierMode === 'new'
                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    {tBilingual('Spot / New Supplier', 'নতুন / স্পট সাপ্লায়ার')}
                  </button>
                </div>
              </div>

              {supplierMode === 'existing' ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Select Registered Supplier', 'সাপ্লায়ার নির্বাচন')} <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                      required
                    >
                      <option value="">-- Choose Registered Material Vendor --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.supplier_name} {s.category ? `[${s.category.replace('_', ' ')}]` : ''} — 📞 {s.mobile}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier Intel Quick Card */}
                  {currentSupplier && (
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Contact Person:</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <User className="h-3.5 w-3.5 text-amber-600" />
                          <span>{currentSupplier.contact_person || 'Managing Director'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Phone & Email:</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3.5 w-3.5 text-amber-600" />
                          <span>{currentSupplier.mobile}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Warehouse Address:</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{currentSupplier.address || 'Dhaka, Bangladesh'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Supplier / Company Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Bengal Paper & Board Mills Ltd."
                      value={customSupplierName}
                      onChange={(e) => setCustomSupplierName(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Mobile Phone Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="+8801700000000"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      className="text-xs h-9 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Contact Person</Label>
                    <Input
                      placeholder="e.g. Tariqul Islam"
                      value={supplierContactPerson}
                      onChange={(e) => setSupplierContactPerson(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Email Address (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="sales@supplier.com"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold mb-1 block">Supplier Address</Label>
                    <Input
                      placeholder="e.g. Naya Bazar Paper Market, Dhaka-1100"
                      value={supplierAddress}
                      onChange={(e) => setSupplierAddress(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Logistics & Delivery Specifications */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {tBilingual('Logistics, Destination & Schedule', 'ডেলিভারি লজিস্টিক ও গন্তব্য')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Destination Store Location', 'গন্তব্য গোডাউন')} <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={targetLocationId}
                    onChange={(e) => setTargetLocationId(e.target.value)}
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
                      <>
                        <option value="main-store">Main Raw Material Store</option>
                        <option value="floor-store">Production Floor Buffer</option>
                        <option value="ink-vault">Ink & Chemistry Vault</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('PO Issue Date', 'আদেশ জারির তারিখ')} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Expected Delivery Date', 'প্রত্যাশিত ডেলিভারি')} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Delivery Method / Transport', 'পরিবহন মাধ্যম')}
                  </Label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    {DELIVERY_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.labelEn} ({m.labelBn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Procurement Priority', 'অগ্রাধিকার')}
                  </Label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    <option value="normal">Normal Priority (সাধারণ)</option>
                    <option value="high">High Priority (জরুরি)</option>
                    <option value="urgent">Critical Urgent / Machine Down (অতি জরুরি)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Supplier Quote / Ref # (Optional)', 'সাপ্লায়ার কোটেশন রেফারেন্স')}
                  </Label>
                  <Input
                    placeholder="e.g. SQ-2026-881"
                    value={supplierReference}
                    onChange={(e) => setSupplierReference(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ITEMS CATALOG & ORDER BUILDER */}
        {activeStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            {/* Header & Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {tBilingual('Purchasable Items & Roll Configurations', 'কাঁচামাল ও আইটেম সংযোজন')}
                </h3>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddItem}
                  className="h-7.5 text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {tBilingual('Add Line Item', 'নতুন আইটেম')}
                </Button>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-mono font-bold flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.material_name || 'Select Material or Hardware Item'}
                      </span>
                      {item.category && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 uppercase font-mono">
                          {item.category}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(idx)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Duplicate line"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Item Selector */}
                    <div className="sm:col-span-5">
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">
                        Item / Substrate / Hardware <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        value={
                          item.item_type === 'custom'
                            ? 'custom_new'
                            : item.item_type === 'ready_product'
                            ? `prod:${item.material_id}`
                            : item.config_description && purchaseConfigs.some((c) => c.material_id === item.material_id)
                            ? `mpc:${purchaseConfigs.find((c) => c.material_id === item.material_id)?.id}`
                            : `mat:${item.material_id}`
                        }
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="w-full h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
                        required
                      >
                        <option value="">-- Choose Item from Catalog --</option>
                        {purchaseConfigs.length > 0 && (
                          <optgroup label="🌀 Roll Media Specific Configurations">
                            {purchaseConfigs.map((c) => {
                              const parentMat = materials.find((m) => m.id === c.material_id)
                              return (
                                <option key={c.id} value={`mpc:${c.id}`}>
                                  {parentMat?.name || 'Material'} — {c.config_name} (@ ৳{c.purchase_price})
                                </option>
                              )
                            })}
                          </optgroup>
                        )}
                        <optgroup label="🧵 Raw Materials & Media Catalog">
                          {materials.map((m) => (
                            <option key={m.id} value={`mat:${m.id}`}>
                              {m.name} ({m.sku}) — Stock: {m.current_stock} {m.unit}
                            </option>
                          ))}
                        </optgroup>
                        {readyProducts.length > 0 && (
                          <optgroup label="✨ Ready Display Products & Hardware">
                            {readyProducts.map((p) => (
                              <option key={p.id} value={`prod:${p.id}`}>
                                {p.name} ({p.sku || 'HW'}) — MOQ: {p.min_order_quantity || 1}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="🛠️ Ad-hoc Non-Catalog Items">
                          <option value="custom_new">+ Add Custom / Spot Purchase Item</option>
                        </optgroup>
                      </select>

                      {/* Custom Item Name input if custom */}
                      {item.item_type === 'custom' && (
                        <div className="mt-1.5">
                          <Input
                            placeholder="Enter custom material name or spec..."
                            value={item.material_name}
                            onChange={(e) => handleItemChange(idx, 'material_name', e.target.value)}
                            className="h-8 text-xs"
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">
                        Qty <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="h-8.5 text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Unit */}
                    <div className="sm:col-span-2">
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">Unit</Label>
                      <Input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="h-8.5 text-xs font-medium"
                        placeholder="roll/sheet/pcs"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="sm:col-span-3">
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">
                        Unit Rate (৳) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_cost}
                        onChange={(e) => handleItemChange(idx, 'unit_cost', Number(e.target.value))}
                        className="h-8.5 text-xs font-mono font-semibold"
                        required
                      />
                    </div>
                  </div>

                  {/* Line Detail Calculation & Stock Hints */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      {item.config_description && (
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {item.config_description}
                        </span>
                      )}
                      {item.current_stock_hint !== undefined && (
                        <span className="text-[10px]">
                          Store Stock: <strong className="text-slate-700 dark:text-slate-200">{item.current_stock_hint}</strong> (Min: {item.reorder_level_hint || 0})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span>
                        {item.quantity} {item.unit} × ৳{formatBDT(item.unit_cost)}
                      </span>
                      <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                        ৳ {formatBDT(item.total_cost)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Total Bar for Step 2 */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {items.length} Order Line(s)
                </Badge>
                <span className="text-slate-500 dark:text-slate-400">Total Quantities Configured</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Subtotal:</span>{' '}
                <span className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono">
                  ৳ {formatBDT(itemsSubtotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: COMMERCIALS, TAXES, ADVANCE & TERMS */}
        {activeStep === 3 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Commercial Adjustments & Taxes */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {tBilingual('Discounts, NBR VAT & Freight Surcharge', 'ছাড়, মূসক/ভ্যাট ও পরিবহন খরচ')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Discount */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('PO Discount', 'কোটেশন ছাড়')}
                  </Label>
                  <div className="flex gap-1.5">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="h-9 w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-semibold"
                    >
                      <option value="fixed">৳ BDT</option>
                      <option value="percent">% Pct</option>
                    </select>
                    <Input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="text-xs h-9 font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* VAT Setup */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('NBR VAT / Tax Rate', 'মূসক / ভ্যাট')}
                  </Label>
                  <select
                    value={vatType}
                    onChange={(e) => setVatType(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    <option value="none">0% Exempted / Nil VAT (ভ্যাট প্রযোজ্য নয়)</option>
                    <option value="15">15% Standard NBR VAT (১৫% আদর্শ মূসক)</option>
                    <option value="7.5">7.5% Truncated VAT (৭.৫% মূসক)</option>
                    <option value="5">5% Retail/Trading VAT (৫% মূসক)</option>
                    <option value="custom">Custom Fixed Amount (কাস্টম ভ্যাট)</option>
                  </select>
                </div>

                {/* Shipping & Freight */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Freight & Carriage (৳)', 'পরিবহন / ক্যারেজ ভাড়া')}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="text-xs h-9 font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              {vatType === 'custom' && (
                <div className="pt-1">
                  <Label className="text-xs font-semibold mb-1 block">Custom Fixed VAT Amount (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={customVatAmount}
                    onChange={(e) => setCustomVatAmount(Number(e.target.value))}
                    className="text-xs h-9 font-mono w-full sm:w-60"
                  />
                </div>
              )}
            </div>

            {/* Payment Terms & Advance Commitment */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {tBilingual('Agreed Payment Terms & Advance Disbursement', 'পেমেন্ট শর্তাবলী ও অগ্রিম')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Payment Terms', 'পরিশোধের শর্ত')} <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    {PAYMENT_TERMS_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Advance Paid Now (৳)', 'বর্তমান অগ্রিম পরিশোধ')}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                    className="text-xs h-9 font-mono font-bold"
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Payment Channel', 'পেমেন্ট মাধ্যম')}
                  </Label>
                  <select
                    value={advancePaymentMethod}
                    onChange={(e) => setAdvancePaymentMethod(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    <option value="bank">Bank Transfer / EFT / RTGS</option>
                    <option value="cash">Cash Counter / Petty Cash</option>
                    <option value="mfs">bKash / Nagad / Rocket</option>
                    <option value="cheque">Account Payee Cheque</option>
                  </select>
                </div>
              </div>

              {advancePaid > 0 && (
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Advance Cheque / Txn Ref #', 'চেক বা ট্রানজেকশন রেফারেন্স')}
                  </Label>
                  <Input
                    placeholder="e.g. Bank Cheque #991024 or bKash TrxID"
                    value={advanceRefNumber}
                    onChange={(e) => setAdvanceRefNumber(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Special Inspection Instructions & Notes */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2.5 shadow-xs">
              <Label className="text-xs font-semibold block">
                {tBilingual('Special Delivery & Quality Terms (Optional)', 'বিশেষ ডেলিভারি ও মান নিয়ন্ত্রণ শর্তাবলী')}
              </Label>

              <div className="flex flex-wrap gap-1.5 pb-1">
                {QUICK_NOTE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNotes((prev) => (prev ? `${prev}\n${tmpl}` : tmpl))}
                    className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    + {tmpl.split(' ')[0]} {tmpl.split(' ')[1]} {tmpl.split(' ')[2]}...
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="e.g. Deliver to Gate 2; inspect roll grammage before unloading; include Mushak 6.3 Challan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Final Financial Commitment Summary */}
            <div className="p-4 rounded-xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-slate-900/5 dark:from-amber-950/40 dark:to-slate-900 border border-amber-300 dark:border-amber-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase">
                  Items Subtotal
                </span>
                <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                  ৳ {formatBDT(itemsSubtotal)}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase">
                  VAT & Freight
                </span>
                <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                  + ৳ {formatBDT(calculatedVatAmount + (Number(shippingCost) || 0))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-bold uppercase">
                  PO Grand Total
                </span>
                <div className="text-base font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                  ৳ {formatBDT(grandTotal)}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold uppercase">
                  Due on Delivery
                </span>
                <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                  ৳ {formatBDT(dueAmount)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  )
}

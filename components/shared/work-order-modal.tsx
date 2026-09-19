'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  FileText,
  Search,
  User,
  Phone,
  Building,
  Mail,
  MapPin,
  CheckCircle2,
  Upload,
  Send,
  Save,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Trash2,
  Palette,
  AlertTriangle,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { CustomerRecord } from '@/types/crm.types'
import { SalesOrderRecord } from '@/types/order.types'
import { DesignJobRecord } from '@/types/design.types'
import { ProductRecord } from '@/types/product.types'
import { getInvoiceProductsAction } from '@/actions/billing.actions'
import { isServiceProduct, isReadyProduct, isMaterialProduct } from '@/lib/units'

interface WorkOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (order: SalesOrderRecord, sentToManager: boolean) => void
  companyId?: string
}

export interface WorkOrderItemState {
  id: string
  productId?: string
  item_kind?: 'service' | 'ready_product' | 'material' | 'custom'
  product_type?: string
  itemName: string
  dimensions_spec?: string
  width: string
  height: string
  dimension_unit?: 'ft' | 'inch' | 'mm' | 'm'
  quantity: number
  unit: string
  finishing: string
  available_dimension_presets?: Array<{ label?: string; width: number; length: number; unit?: string }>
  available_finishing_options?: Array<{ id: string; name: string; unit_price?: number }>
  printable_material_name?: string
  showAdvanced?: boolean
  design_required?: boolean
}

const FINISHING_OPTIONS = [
  'None',
  'Eyelets / Grommets (চারপাশে রিং)',
  'Pocket / Pole Seaming (পাইপ পকেট)',
  'Gloss Cold Lamination (গ্লস লেমিনেশন)',
  'Matt Cold Lamination (ম্যাট লেমিনেশন)',
  'Laser Cut to Shape (লেজার কাটিং)',
  'Mounted on Foam Board (ফোম বোর্ডে পেস্টিং)',
  'LED Module & Power Supply (লাইট সেটআপ)',
  'Double Tape on Back (ডাবল টেপ)',
  'Cutting',
  'Die Cutting',
  'Stitching',
]

export function WorkOrderModal({
  isOpen,
  onClose,
  onSuccess,
  companyId = 'c-01',
}: WorkOrderModalProps) {
  const { tBilingual } = useI18n()
  const { currentUser, company } = useTenant()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const effectiveCompanyId = company?.id || companyId

  const { data: customers = [] } = useDataStore<CustomerRecord[]>(
    STORAGE_KEYS.CUSTOMERS,
    []
  )

  // Products catalog
  const [products, setProducts] = useState<ProductRecord[]>([])

  // Customer search & autofill state (Matching Reference Image 1)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Work Order Routing & Notes (.JPG / .PNG only with paste support)
  const [workflowRouting, setWorkflowRouting] = useState<'design_required' | 'design_ok' | 'ready_production'>('design_required')
  const [notes, setNotes] = useState('')
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null)
  const [referenceProofUrl, setReferenceProofUrl] = useState<string | null>(null)
  const [isRefDragging, setIsRefDragging] = useState(false)

  // Work Order Items State (Matching Reference Image 2 without pricing)
  const [items, setItems] = useState<WorkOrderItemState[]>([
    {
      id: `item-${Date.now()}-1`,
      productId: '',
      item_kind: 'service',
      itemName: 'Eco Solvent Ink (Black)',
      width: '4',
      height: '6',
      dimension_unit: 'ft',
      quantity: 1,
      unit: 'sft',
      finishing: 'None',
      design_required: false,
      showAdvanced: false,
    },
  ])

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Process reference image file (.JPG / .PNG only)
  const processReferenceImageFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const isJpeg = ext === 'jpg' || ext === 'jpeg'
    const isPng = ext === 'png'

    if (!isJpeg && !isPng) {
      setErrorMessage('Unsupported format! Only .JPG and .PNG files are supported.')
      return
    }

    const fmt = isJpeg ? 'jpg' : 'png'
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setReferenceProofUrl(dataUrl)
        setReferenceFileName(file.name || `artwork_${Date.now()}.${fmt}`)
      }
    }
    reader.readAsDataURL(file)
  }

  // Window Clipboard Paste (Ctrl+V) listener when Work Order modal is open
  useEffect(() => {
    if (!isOpen) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue

          const fmt = item.type === 'image/jpeg' ? 'jpg' : 'png'
          const customName = `pasted_brief_${Date.now()}.${fmt}`
          const reader = new FileReader()
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            if (dataUrl) {
              setReferenceProofUrl(dataUrl)
              setReferenceFileName(customName)
            }
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isOpen])

  // Load catalog products
  useEffect(() => {
    if (!isOpen) return
    getInvoiceProductsAction(effectiveCompanyId).then((res) => {
      if (res.success && res.data) {
        setProducts(res.data)
      } else {
        const local = PrintERPDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, effectiveCompanyId) || []
        if (local.length > 0) setProducts(local)
      }
    })
  }, [isOpen, effectiveCompanyId])

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null)
      setSuccessMessage(null)
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Partitioned product lists for dropdown
  const servicesList = useMemo(
    () => products.filter((p) => p.is_active && isServiceProduct(p)),
    [products]
  )

  const readyProductsList = useMemo(
    () => products.filter((p) => p.is_active && isReadyProduct(p)),
    [products]
  )

  const materialsList = useMemo(
    () => products.filter((p) => p.is_active && isMaterialProduct(p)),
    [products]
  )

  // Filtered customer matches
  const customerMatches = useMemo(() => {
    if (!customerName.trim() || selectedCustomerId) return []
    const q = customerName.toLowerCase()
    return (Array.isArray(customers) ? customers : []).filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company_name && c.company_name.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      )
    })
  }, [customerName, selectedCustomerId, customers])

  const handleSelectCustomer = (c: CustomerRecord) => {
    setSelectedCustomerId(c.id)
    setCustomerName(c.name)
    setCustomerPhone(c.mobile || '')
    setCompanyName(c.company_name || '')
    setCustomerAddress(c.address || c.area || '')
    setCustomerEmail(c.email || '')
    setShowCustomerDropdown(false)
  }

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val)
    if (selectedCustomerId) {
      setSelectedCustomerId(null)
    }
    setShowCustomerDropdown(Boolean(val.trim()))
  }

  const handleClearCustomer = () => {
    setCustomerName('')
    setSelectedCustomerId(null)
    setCustomerPhone('')
    setCompanyName('')
    setCustomerAddress('')
    setCustomerEmail('')
    setShowCustomerDropdown(false)
  }

  // Item management methods
  const handleAddItem = (kind: 'service' | 'ready_product' | 'custom' = 'service') => {
    if (kind === 'service') {
      const defaultProduct = servicesList[0] || products[0]
      const dimensionPresets =
        defaultProduct?.service_config?.dimension_presets ||
        defaultProduct?.service_config?.presets ||
        (defaultProduct as any)?.dimension_presets ||
        []
      const finishingOptions =
        defaultProduct?.service_config?.finishing_options ||
        (defaultProduct as any)?.finishing_options ||
        []

      setItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${prev.length + 1}`,
          productId: defaultProduct?.id || '',
          item_kind: 'service',
          product_type: defaultProduct?.product_type || 'service',
          itemName: defaultProduct?.name || 'Printing Service Item',
          width: dimensionPresets.length > 0 ? String(dimensionPresets[0].width) : '4',
          height: dimensionPresets.length > 0 ? String(dimensionPresets[0].length) : '6',
          dimension_unit: (dimensionPresets.length > 0 ? dimensionPresets[0].unit : 'ft') as any,
          quantity: 1,
          unit: defaultProduct?.unit || 'sft',
          finishing: 'None',
          available_dimension_presets: dimensionPresets,
          available_finishing_options: finishingOptions,
          printable_material_name: defaultProduct?.service_config?.printable_material_name || undefined,
          design_required: false,
          showAdvanced: false,
        },
      ])
    } else if (kind === 'ready_product') {
      const defaultProduct = readyProductsList[0]
      setItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${prev.length + 1}`,
          productId: defaultProduct?.id || '',
          item_kind: 'ready_product',
          product_type: 'finished_good',
          itemName: defaultProduct?.name || 'Ready Product / Display Stand',
          dimensions_spec: (defaultProduct as any)?.dimensions_spec || undefined,
          width: '0',
          height: '0',
          dimension_unit: 'ft',
          quantity: 1,
          unit: defaultProduct?.unit || 'pcs',
          finishing: 'None',
          design_required: false,
          showAdvanced: false,
        },
      ])
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${prev.length + 1}`,
          productId: '',
          item_kind: 'service',
          itemName: '',
          width: '4',
          height: '6',
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'sft',
          finishing: 'None',
          design_required: true,
          showAdvanced: false,
        },
      ])
    }
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index: number, productId: string) => {
    setItems((prev) => {
      const next = [...prev]
      const current = next[index]
      if (!productId) {
        next[index] = {
          ...current,
          productId: '',
          item_kind: current.item_kind || 'service',
          itemName: '',
          available_dimension_presets: [],
          available_finishing_options: [],
          printable_material_name: undefined,
        }
        return next
      }

      const prd = products.find((p) => p.id === productId)
      if (!prd) return next

      const isService =
        prd.product_type === 'service' ||
        prd.product_type === 'print_service' ||
        prd.product_type === 'fabrication_service' ||
        (prd as any).is_service ||
        Boolean(prd.service_config)
      const isReady =
        (prd.product_type === 'ready_product' ||
          prd.product_type === 'finished_product' ||
          (prd.product_type as any) === 'finished_good') &&
        !isService
      const isMat =
        prd.product_type === 'material' || (prd.product_type as any) === 'raw_material'

      const itemKind: 'service' | 'ready_product' | 'material' | 'custom' = isService
        ? 'service'
        : isReady
        ? 'ready_product'
        : isMat
        ? 'material'
        : 'service'

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
        dimension_unit: (preset.unit || next[index].dimension_unit || 'ft') as any,
      }
      return next
    })
  }

  const handleItemChange = (index: number, field: keyof WorkOrderItemState, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
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

  // Calculate approximate square footage for services
  const totalSft = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.item_kind !== 'ready_product') {
        const w = Number(item.width) || 0
        const h = Number(item.height) || 0
        const q = Number(item.quantity) || 1
        if (item.dimension_unit === 'inch') {
          return sum + ((w * h) / 144) * q
        } else if (item.dimension_unit === 'mm') {
          return sum + ((w * h) / 92903) * q
        } else if (item.dimension_unit === 'm') {
          return sum + w * h * 10.7639 * q
        }
        return sum + w * h * q
      }
      return sum
    }, 0)
  }, [items])

  const handleSave = async (sendInvoiceRequest: boolean) => {
    setErrorMessage(null)

    const finalName = customerName.trim()
    if (!finalName) {
      setErrorMessage(
        tBilingual(
          'Please specify customer name or search an existing customer.',
          'অনুগ্রহ করে গ্রাহকের নাম দিন অথবা পূর্বের গ্রাহক খুঁজুন।'
        )
      )
      return
    }

    if (!customerPhone.trim()) {
      setErrorMessage(
        tBilingual('Please provide customer phone number.', 'অনুগ্রহ করে মোবাইল নম্বর দিন।')
      )
      return
    }

    if (!customerAddress.trim()) {
      setErrorMessage(
        tBilingual('Please provide customer billing address.', 'অনুগ্রহ করে গ্রাহকের বিলিং ঠিকানা দিন।')
      )
      return
    }

    if (items.length === 0) {
      setErrorMessage(
        tBilingual('Please add at least one work order item.', 'অনুগ্রহ করে অন্তত একটি আইটেম যোগ করুন।')
      )
      return
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].itemName.trim()) {
        setErrorMessage(
          tBilingual(`Please provide description for Item #${i + 1}.`, `আইটেম #${i + 1}-এর বর্ণনা প্রদান করুন।`)
        )
        return
      }
    }

    const orderCheck = checkCanCreate('monthly_orders')
    if (!orderCheck.allowed) {
      setErrorMessage(orderCheck.reason || 'Monthly order quota reached for your plan.')
      openLimitExceededModal('monthly_orders')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Get collision-free document numbers
      const orderNumber = PrintERPDataStore.getNextDocumentNumber(effectiveCompanyId, 'order')
      const orderId = `ord-${Date.now()}`

      // Build Order Items
      const orderItems = items.map((it, idx) => ({
        id: `oi-${Date.now()}-${idx + 1}`,
        item_name: it.itemName,
        product_id: it.productId || undefined,
        width: Number(it.width) || 0,
        height: Number(it.height) || 0,
        dimension_unit: (it.dimension_unit === 'mm' ? 'inch' : it.dimension_unit || 'ft') as 'ft' | 'inch' | 'm',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'sft',
        unit_price: 0,
        total_price: 0,
        material_spec: it.dimensions_spec || null,
      }))

      // Summary string for all items
      const itemsSummary = items
        .map((it) => `${it.itemName}${it.width && it.height && it.item_kind !== 'ready_product' ? ` (${it.width}×${it.height} ${it.dimension_unit || 'ft'})` : ''} × ${it.quantity} ${it.unit}`)
        .join('; ')

      // 2. Build Sales Order record
      const newOrder: SalesOrderRecord = {
        id: orderId,
        company_id: effectiveCompanyId,
        order_number: orderNumber,
        customer_id: selectedCustomerId || `cust-${Date.now()}`,
        customer_name: finalName,
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        salesperson_name: currentUser?.profile?.full_name || 'Designer / Pre-Press',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        priority: 'urgent',
        status: sendInvoiceRequest ? 'confirmed' : 'draft',
        payment_terms: 'advance',
        workflow_routing: workflowRouting,
        commercial_status: sendInvoiceRequest ? 'invoice_requested' : 'invoice_required',
        production_gate_status: 'blocked_commercial',
        subtotal: 0,
        discount_amount: 0,
        vat_amount: 0,
        final_price: 0,
        advance_amount: 0,
        due_amount: 0,
        notes: `Work Order: ${itemsSummary}. Routing: ${workflowRouting}. ${notes}`,
        items: orderItems,
        jobs_count: items.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Persist to store
      PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, newOrder)
      refreshUsage()

      // 3. Create Pre-Press Design Job Ticket for Design Required or Design Check
      let designJobId: string | null = null
      const isDesignReq = workflowRouting === 'design_required' || items.some((i) => i.design_required)
      const isDesignOk = workflowRouting === 'design_ok' && !isDesignReq

      if (isDesignReq || isDesignOk) {
        designJobId = `dsn-${Date.now()}`
        const routingMode = isDesignOk ? 'design_ok' : 'design_required'
        const newDesignJob: DesignJobRecord = {
          id: designJobId,
          company_id: effectiveCompanyId,
          sales_order_id: newOrder.id,
          order_number: orderNumber,
          design_number: `DSN-${orderNumber.replace('ORD-', '')}`,
          customer_id: newOrder.customer_id,
          customer_name: finalName,
          title: items[0]?.itemName || (isDesignOk ? 'Customer Supplied Artwork (Check)' : 'Work Order Artwork'),
          designer_name: currentUser?.profile?.full_name || 'Designer Workbench',
          priority: 'urgent',
          status: isDesignOk ? 'received' : 'designing',
          workflow_routing: routingMode,
          commercial_status: sendInvoiceRequest ? 'invoice_requested' : 'invoice_required',
          customer_approval_required: !isDesignOk,
          deadline: `${newOrder.delivery_date} 18:00`,
          instructions: `Items: ${itemsSummary}. Routing: ${routingMode}. Notes: ${notes}`,
          dimensions_spec: items[0] ? `${items[0].width}×${items[0].height} ${items[0].dimension_unit || 'ft'} (Qty: ${items[0].quantity})` : 'Custom Specs',
          current_version: 1,
          revision_count: 0,
          is_locked: false,
          versions: [
            {
              id: `dv-${Date.now()}`,
              design_job_id: designJobId,
              version_number: 1,
              version_label: isDesignOk ? 'Version 1 (Customer Supplied Artwork)' : 'Version 1 (Initial Brief)',
              proof_file_name: referenceFileName || (isDesignOk ? 'customer_artwork.png' : 'customer_brief.png'),
              proof_file_url:
                referenceProofUrl ||
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
              file_format: (referenceFileName?.endsWith('.jpg') || referenceFileName?.endsWith('.jpeg') ? 'jpg' : 'png') as any,
              change_notes: isDesignOk
                ? 'Customer supplied artwork registered for pre-press check.'
                : 'Initial work order artwork brief registered.',
              uploaded_by_name: currentUser?.profile?.full_name || 'Designer',
              is_approved: isDesignOk,
              created_at: 'Just now',
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, newDesignJob)
      }

      // 4. If Send Invoice Request is selected, dispatch Manager notification & create invoice_requests record
      if (sendInvoiceRequest) {
        const { createInvoiceRequestAction } = await import('@/actions/invoice-request.actions')
        await createInvoiceRequestAction({
          companyId: effectiveCompanyId,
          customerId: newOrder.customer_id,
          customerName: finalName,
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || null,
          customerAddress: customerAddress.trim() || null,
          companyName: companyName.trim() || null,
          items: items.map((it) => ({
            productId: it.productId || undefined,
            product_id: it.productId || undefined,
            item_kind: it.item_kind || 'service',
            product_type: it.product_type || undefined,
            itemName: it.itemName,
            item_name: it.itemName,
            material_spec: (it as any).material_spec || undefined,
            dimensions_spec:
              it.dimensions_spec ||
              (it.width && it.height ? `${it.width}×${it.height} ${it.dimension_unit || 'ft'}` : undefined),
            width: it.width,
            height: it.height,
            dimension_unit: it.dimension_unit || 'ft',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'sft',
            rate: Number((it as any).rate ?? (it as any).unit_price ?? 0),
            unit_price: Number((it as any).unit_price ?? (it as any).rate ?? 0),
            total_price: Number((it as any).total_price ?? 0),
            finishing: it.finishing || 'None',
            design_required: Boolean(it.design_required),
          })),
          salesOrderId: newOrder.id,
          orderNumber: orderNumber,
          designJobId: designJobId,
          designNumber: designJobId ? `DSN-${orderNumber.replace('ORD-', '')}` : null,
          itemsSummary: itemsSummary,
          estimatedAmount: Math.round(totalSft * 50) || 1000,
          notes: `Work order submitted with routing: ${workflowRouting}. Notes: ${notes}`,
        })
      }

      setSuccessMessage(
        sendInvoiceRequest
          ? tBilingual(
              `Work Order #${orderNumber} saved & Invoice Request sent to Manager!`,
              `ওয়ার্ক অর্ডার #${orderNumber} সংরক্ষিত এবং ম্যানেজারের কাছে ইনভয়েস রিকোয়েস্ট পাঠানো হয়েছে!`
            )
          : tBilingual(
              `Work Order #${orderNumber} saved successfully.`,
              `ওয়ার্ক অর্ডার #${orderNumber} সফলভাবে সংরক্ষিত হয়েছে।`
            )
      )

      setTimeout(() => {
        setIsSubmitting(false)
        if (onSuccess) onSuccess(newOrder, sendInvoiceRequest)
        onClose()
      }, 900)
    } catch (err: any) {
      console.error('[WorkOrderModal] Save error:', err)
      setErrorMessage(err.message || 'Failed to save Work Order.')
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="4xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Add Work Order', 'নতুন ওয়ার্ক অর্ডার যোগ করুন')}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                Pre-Press Flow
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Fast pre-press booking with instant invoice dispatch to manager',
                'দ্রুত প্রি-প্রেস বুকিং ও ম্যানেজারের নিকট তাৎক্ষণিক ইনভয়েস প্রেরণের সুবিধা'
              )}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Section 0: Production Workflow Routing */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                ★
              </div>
              <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                {tBilingual('Production Workflow Routing', 'প্রোডাকশন ওয়ার্কফ্লো রাউটিং')}
              </h3>
            </div>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
              {workflowRouting === 'design_required' && '🎨 Designer ➔ Proof ➔ Customer Approval ➔ Print'}
              {workflowRouting === 'design_ok' && '⚡ Artwork Verified ➔ Direct Machine Queue'}
              {workflowRouting === 'ready_production' && '🚀 Fast-Track ➔ Direct Delivery Dispatch'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setWorkflowRouting('design_required')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                workflowRouting === 'design_required'
                  ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-xs ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 opacity-70 hover:opacity-100'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  🎨 Design Required
                </span>
                {workflowRouting === 'design_required' && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Creates Designer task. Requires customer proof approval before printing.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setWorkflowRouting('design_ok')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                workflowRouting === 'design_ok'
                  ? 'border-emerald-600 bg-white dark:bg-slate-900 shadow-xs ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 opacity-70 hover:opacity-100'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  ⚡ Design OK (Print Ready)
                </span>
                {workflowRouting === 'design_ok' && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Print-ready file verified. Skips design step & routes to print floor.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setWorkflowRouting('ready_production')}
              className={cn(
                'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                workflowRouting === 'ready_production'
                  ? 'border-blue-600 bg-white dark:bg-slate-900 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 opacity-70 hover:opacity-100'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  🚀 Ready Production
                </span>
                {workflowRouting === 'ready_production' && (
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Operational fast-track. Readymade goods dispatched directly to delivery.
              </p>
            </button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: CUSTOMER INFORMATION (Exact Layout Matching Reference Image 1)
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                CUSTOMER INFORMATION
              </h3>
            </div>
            {selectedCustomerId && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                <UserCheck className="h-3.5 w-3.5" />
                Existing Customer Linked
              </span>
            )}
          </div>

          {/* Grid Layout strictly matching Image 1: Row 1 (Name, Phone, Company), Row 2 (Address span 2, Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Customer Name * */}
            <div className="relative" ref={searchContainerRef}>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Type name to search or enter new..."
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onFocus={() => {
                    if (customerName.trim() && !selectedCustomerId) {
                      setShowCustomerDropdown(true)
                    }
                  }}
                  className="text-xs h-9 pr-8"
                  required
                />
                {customerName ? (
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {showCustomerDropdown && customerMatches.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {customerMatches.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-2.5 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 cursor-pointer text-xs transition-colors"
                    >
                      <div className="font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {c.mobile} {c.company_name ? `• ${c.company_name}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Number * */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Phone Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="01XXXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>

            {/* Company Name (Optional) */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Company Name (Optional)</Label>
              <Input
                placeholder="Business / Organization"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Billing Address * */}
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold mb-1 block">
                Billing Address <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Full address for delivery & invoice"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            {/* Email (for PDF Invoice) */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Email (for PDF Invoice)</Label>
              <Input
                type="email"
                placeholder="client@domain.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: WORK ORDER ITEMS & SPECS (Matching Reference Image 2 without pricing)
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Work Order Items & Specs', 'আইটেম ও স্পেসিফিকেশন')}
              </h3>
              {totalSft > 0 && (
                <Badge variant="outline" className="text-xs font-mono bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 ml-1">
                  Total Area: {totalSft.toFixed(1)} SFT
                </Badge>
              )}
            </div>

            {/* Add Item Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddItem('service')}
                className="h-7 text-xs font-bold gap-1 text-blue-700 border-blue-300 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Service / Catalog Item
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddItem('ready_product')}
                className="h-7 text-xs font-bold gap-1 text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Ready Product
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddItem('custom')}
                className="h-7 text-xs font-bold gap-1 text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Add Custom Item
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const isService = item.item_kind === 'service' || (item.item_kind !== 'ready_product' && item.item_kind !== 'material' && Boolean(Number(item.width) > 0 && Number(item.height) > 0))
              const isReadyProduct = item.item_kind === 'ready_product'
              const isMaterial = item.item_kind === 'material'
              const isCustom = !item.productId

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-all"
                >
                  {/* Item Header & Badges (Matching Reference Image 2) */}
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
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">
                          Manual
                        </Badge>
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
                          className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Line 1: Select Catalog Item & Item Description */}
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
                                {p.name} ({p.unit || 'sft'})
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {readyProductsList.length > 0 && (
                          <optgroup label="📦 Ready Products & Display Hardware">
                            {readyProductsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit || 'pcs'})
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {materialsList.length > 0 && (
                          <optgroup label="🧵 Raw Materials">
                            {materialsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit || 'roll'})
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
                        placeholder="e.g. Eco Solvent Ink (Black) or Pana Flex Banner 40ft × 20ft"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                        className="text-xs h-9 font-medium"
                        required
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

                  {/* Line 2: Service Controls (Width, Height, Dim Unit, Qty, Finishing) - Pricing OMITTED */}
                  {isService && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
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
                          <option value="mm">mm (মিলিমিটার)</option>
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
                                {f.name}
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

                  {/* Ready Product Controls */}
                  {isReadyProduct && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="sm:col-span-6 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Physical Specs & Packaging</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {item.dimensions_spec ? (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px]">
                              📐 {item.dimensions_spec}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Standard Factory Size</span>
                          )}
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

                      <div className="sm:col-span-3">
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
                    </div>
                  )}

                  {/* Raw Material Controls */}
                  {isMaterial && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    </div>
                  )}

                  {/* Substrate / Printable Material pill for service */}
                  {isService && item.printable_material_name && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>Linked Substrate: <strong>{item.printable_material_name}</strong></span>
                    </div>
                  )}

                  {/* Line 3: Workflow Gating / Design Required per item (Matching Reference Image 2) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-100/70 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <label className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(item.design_required)}
                        onChange={(e) => handleItemChange(index, 'design_required', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        <Palette className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Design Required (ডিজাইন প্রয়োজন)
                      </span>
                    </label>

                    {item.design_required ? (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                        🎨 Design Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        ✨ Direct Production Ready
                      </Badge>
                    )}
                  </div>

                  {/* Advanced Specs Drawer */}
                  {item.showAdvanced && (
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
                            className="text-xs h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-semibold mb-1 block">Item Special Instructions</Label>
                          <Input
                            placeholder="e.g. 1-inch extra margin for framing..."
                            value={item.dimensions_spec ? '' : ''}
                            onChange={(e) => {}}
                            className="text-xs h-9"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 3: Reference Artwork & Pre-Press Notes */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Artwork & Pre-Press Notes', 'রেফারেন্স আর্টওয়ার্ক ও নির্দেশনাবলী')}
            </h3>
          </div>

          {/* DRAG & DROP / PASTE / FILE PICKER ZONE (.JPG / .PNG only) */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsRefDragging(true)
            }}
            onDragLeave={() => setIsRefDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsRefDragging(false)
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processReferenceImageFile(e.dataTransfer.files[0])
              }
            }}
            onClick={() => document.getElementById('woRefFileInput')?.click()}
            className={cn(
              "p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center",
              isRefDragging
                ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40"
                : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900"
            )}
          >
            <input
              id="woRefFileInput"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processReferenceImageFile(e.target.files[0])
                }
              }}
            />
            {referenceProofUrl ? (
              <div className="space-y-1.5">
                <div className="relative max-h-36 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-1">
                  <img
                    src={referenceProofUrl}
                    alt="Reference Artwork"
                    className="max-h-32 object-contain mx-auto"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{referenceFileName} — Click to replace or paste another</span>
                </div>
              </div>
            ) : (
              <div className="py-2 space-y-1">
                <div className="h-8 w-8 mx-auto rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {tBilingual('Click to browse or Drag & Drop .JPG / .PNG', 'ফাইল নির্বাচন করুন অথবা ড্র্যাগ করুন')}
                  </p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    💡 Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste screenshot
                  </p>
                </div>
                <p className="text-[10px] text-slate-400">
                  Supported formats: <strong>.JPG, .JPEG, .PNG</strong>
                </p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              {tBilingual('Special Pre-Press Instructions', 'বিশেষ নির্দেশনাবলী')}
            </Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tBilingual(
                'e.g. Color profile CMYK, add 1 inch bleed on all sides...',
                'যেমন: সিএমওয়াইকে কালার মোড, চারপাশে ১ ইঞ্চি ব্লিড মার্জিন...'
              )}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial min-h-[40px] text-xs font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
              )}
              {tBilingual('Save Draft', 'ড্রাফট সংরক্ষণ')}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial min-h-[40px] text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5" />
              )}
              {tBilingual('Save & Send Invoice Request', 'সংরক্ষণ ও ইনভয়েস রিকোয়েস্ট পাঠান')}
            </Button>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}

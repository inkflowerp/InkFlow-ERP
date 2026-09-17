'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  User,
  Phone,
  MapPin,
  Maximize2,
  CheckCircle2,
  Upload,
  Send,
  Save,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2,
  X,
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

interface WorkOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (order: SalesOrderRecord, sentToManager: boolean) => void
  companyId?: string
}

const COMMON_MATERIALS = [
  'Star Flex Banner (Gloss)',
  'Star Flex Banner (Matt)',
  'Backlit Banner (Signboard)',
  'Vinyl Sticker (Gloss China)',
  'Vinyl Sticker (Matt China)',
  'Reflective Honeycomb Vinyl',
  'Frosted / Sandblast Film',
  'Clear Transparent Sticker',
  'One Way Vision (Perforated)',
  'Foam Board 3mm (Sun Board)',
  'Foam Board 5mm (Sun Board)',
  'Aluminium Composite Panel (ACP)',
  'Cotton Fabric Direct-to-Film (DTF)',
]

const FINISHING_OPTIONS = [
  'Eyelets / Grommets (চারপাশে রিং)',
  'Pocket / Pole Seaming (পাইপ পকেট)',
  'Gloss Cold Lamination (গ্লস লেমিনেশন)',
  'Matt Cold Lamination (ম্যাট লেমিনেশন)',
  'Laser Cut to Shape (লেজার কাটিং)',
  'Mounted on Foam Board (ফোম বোর্ডে পেস্টিং)',
  'LED Module & Power Supply (লাইট সেটআপ)',
  'Double Tape on Back (ডাবল টেপ)',
]

export function WorkOrderModal({
  isOpen,
  onClose,
  onSuccess,
  companyId = 'c-01',
}: WorkOrderModalProps) {
  const { tBilingual } = useI18n()
  const { currentUser } = useTenant()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const { data: customers = [] } = useDataStore<CustomerRecord[]>(
    STORAGE_KEYS.CUSTOMERS,
    []
  )

  // Customer search & autofill
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Work Order specs
  const [material, setMaterial] = useState(COMMON_MATERIALS[0])
  const [width, setWidth] = useState<number | ''>(10)
  const [height, setHeight] = useState<number | ''>(4)
  const [dimensionUnit, setDimensionUnit] = useState<'ft' | 'inch' | 'mm'>('ft')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [unit, setUnit] = useState<'sft' | 'pcs' | 'sets'>('sft')
  const [selectedFinishings, setSelectedFinishings] = useState<string[]>([
    'Eyelets / Grommets (চারপাশে রিং)',
  ])
  const [notes, setNotes] = useState('')
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null)

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null)
      setSuccessMessage(null)
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Filtered customer matches
  const customerMatches = (Array.isArray(customers) ? customers : []).filter((c) => {
    if (!customerSearch.trim()) return false
    const q = customerSearch.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q))
    )
  })

  const handleSelectCustomer = (c: CustomerRecord) => {
    setSelectedCustomerId(c.id)
    setCustomerName(c.name)
    setCustomerPhone(c.mobile || '')
    setCustomerAddress(c.address || c.area || 'Dhaka, Bangladesh')
    setCustomerSearch(c.name)
    setShowCustomerDropdown(false)
  }

  const toggleFinishing = (fin: string) => {
    if (selectedFinishings.includes(fin)) {
      setSelectedFinishings(selectedFinishings.filter((f) => f !== fin))
    } else {
      setSelectedFinishings([...selectedFinishings, fin])
    }
  }

  const numWidth = Number(width) || 1
  const numHeight = Number(height) || 1
  const numQty = Number(quantity) || 1

  // Calculate approximate square footage
  let totalSft = 0
  if (dimensionUnit === 'ft') {
    totalSft = numWidth * numHeight * numQty
  } else if (dimensionUnit === 'inch') {
    totalSft = Number((((numWidth * numHeight) / 144) * numQty).toFixed(2))
  } else {
    totalSft = Number((((numWidth * numHeight) / 92903) * numQty).toFixed(2))
  }

  const handleSave = async (sendInvoiceRequest: boolean) => {
    setErrorMessage(null)

    const finalName = customerName.trim() || customerSearch.trim()
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

    const orderCheck = checkCanCreate('monthly_orders')
    if (!orderCheck.allowed) {
      setErrorMessage(orderCheck.reason || 'Monthly order quota reached for your plan.')
      openLimitExceededModal('monthly_orders')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Get collision-free document numbers
      const orderNumber = PrintERPDataStore.getNextDocumentNumber(companyId, 'order')

      // 2. Build Sales Order record
      const orderId = `ord-${Date.now()}`
      const newOrder: SalesOrderRecord = {
        id: orderId,
        company_id: companyId,
        order_number: orderNumber,
        customer_id: selectedCustomerId || `cust-${Date.now()}`,
        customer_name: finalName,
        customer_phone: customerPhone,
        customer_address: customerAddress || 'Dhaka, Bangladesh',
        salesperson_name: currentUser?.profile?.full_name || 'Designer / Pre-Press',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        priority: 'urgent',
        status: sendInvoiceRequest ? 'confirmed' : 'draft',
        payment_terms: 'advance',
        subtotal: 0,
        discount_amount: 0,
        vat_amount: 0,
        final_price: 0,
        advance_amount: 0,
        due_amount: 0,
        notes: `Work Order: ${material} (${numWidth}×${numHeight} ${dimensionUnit}). Finishing: ${selectedFinishings.join(', ')}. ${notes}`,
        items: [
          {
            id: `oi-${Date.now()}`,
            item_name: material,
            width: numWidth,
            height: numHeight,
            dimension_unit: (dimensionUnit === 'mm' ? 'inch' : dimensionUnit) as 'ft' | 'inch' | 'm',
            quantity: numQty,
            unit: unit,
            unit_price: 0,
            total_price: 0,
          },
        ],
        jobs_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Persist to store
      PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, newOrder)
      refreshUsage()

      // 3. Create Pre-Press Design Job Ticket
      const newDesignJob: DesignJobRecord = {
        id: `dsn-${Date.now()}`,
        company_id: companyId,
        design_number: `DSN-${orderNumber.replace('ORD-', '')}`,
        customer_id: newOrder.customer_id,
        customer_name: finalName,
        title: `${material} (${numWidth}×${numHeight} ${dimensionUnit})`,
        designer_name: currentUser?.profile?.full_name || 'Designer Workbench',
        priority: 'urgent',
        status: 'designing',
        deadline: `${newOrder.delivery_date} 18:00`,
        instructions: `Finishing: ${selectedFinishings.join(', ')}. ${notes}`,
        dimensions_spec: `${numWidth}×${numHeight} ${dimensionUnit} (Qty: ${numQty})`,
        current_version: 1,
        revision_count: 0,
        is_locked: false,
        versions: [
          {
            id: `dv-${Date.now()}`,
            design_job_id: `dsn-${Date.now()}`,
            version_number: 1,
            version_label: 'Version 1 (Initial Brief)',
            proof_file_name: referenceFileName || 'customer_brief.pdf',
            proof_file_url:
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
            file_format: 'ai',
            change_notes: 'Initial work order artwork brief registered.',
            uploaded_by_name: currentUser?.profile?.full_name || 'Designer',
            is_approved: false,
            created_at: 'Just now',
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, newDesignJob)

      // 4. If Send Invoice Request is selected, dispatch Manager notification & task
      if (sendInvoiceRequest) {
        const notifId = `notif-${Date.now()}`
        const managerNotification = {
          id: notifId,
          company_id: companyId,
          roles: ['owner', 'manager', 'accountant'],
          type: 'invoice_request',
          title: `Invoice Request for Order #${orderNumber}`,
          title_bn: `অর্ডার #${orderNumber} এর জন্য ইনভয়েস তৈরির অনুরোধ`,
          message: `${finalName} ordered ${numQty} ${unit} of ${material} (${numWidth}×${numHeight} ${dimensionUnit}). Designer: ${currentUser?.profile?.full_name || 'Designer'}. Please generate official invoice.`,
          message_bn: `${finalName} ${numQty} ${unit} ${material} অর্ডার করেছে। ডিজাইনার: ${currentUser?.profile?.full_name_bn || currentUser?.profile?.full_name || 'ডিজাইনার'}। অফিসিয়াল ইনভয়েস প্রস্তুত করুন।`,
          action_url: `/billing?action=create_invoice&order_id=${newOrder.id}&customer_id=${newOrder.customer_id}`,
          read: false,
          is_read: false,
          created_at: 'Just now',
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.IN_APP_NOTIFICATIONS, managerNotification)
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

        {/* Section 1: Customer Information */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Customer Information', 'গ্রাহকের তথ্য')}
              </h3>
            </div>
            {selectedCustomerId && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium border-0 px-2 py-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Existing Customer Linked', 'সংরক্ষিত গ্রাহক যুক্ত')}
              </Badge>
            )}
          </div>

          <div className="relative">
            <Label className="text-xs font-semibold mb-1 block">
              {tBilingual('Customer Search / Name', 'গ্রাহক অনুসন্ধান / নাম')} <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                placeholder={tBilingual(
                  'Type name, company, or mobile number...',
                  'নাম, কোম্পানি বা মোবাইল নম্বর লিখুন...'
                )}
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setCustomerName(e.target.value)
                  setShowCustomerDropdown(true)
                  if (selectedCustomerId) {
                    setSelectedCustomerId(null)
                  }
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="text-xs h-9 pr-8"
              />
              {customerSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearch('')
                    setCustomerName('')
                    setSelectedCustomerId(null)
                    setCustomerPhone('')
                    setCustomerAddress('')
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {showCustomerDropdown && customerMatches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-800">
                {customerMatches.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {c.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{c.mobile}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {c.company_name ? `${c.company_name} • ` : ''}
                      {c.address || c.area || 'Dhaka'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Phone Number', 'মোবাইল নম্বর')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+880 17..."
                className="text-xs h-9 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Delivery Address / Area', 'ডেলিভারি ঠিকানা / এলাকা')}
              </Label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Fakirapool, Dhaka"
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Material & Dimensions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Material & Dimensions', 'উপাদান ও পরিমাপ')}
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              Total Area: {totalSft} {dimensionUnit === 'ft' ? 'SFT' : dimensionUnit}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold mb-1 block">
              {tBilingual('Design / Material Spec', 'ডিজাইন ও উপাদান')} <span className="text-rose-500">*</span>
            </Label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              {COMMON_MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Width', 'প্রস্থ')}
              </Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value === '' ? '' : Number(e.target.value))}
                className="text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Height', 'উচ্চতা')}
              </Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Dimension Unit', 'পরিমাপক')}
              </Label>
              <select
                value={dimensionUnit}
                onChange={(e) => setDimensionUnit(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="ft">Feet (ফুট)</option>
                <option value="inch">Inch (ইঞ্চি)</option>
                <option value="mm">mm (মিলিমিটার)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Quantity', 'পরিমাণ')}
              </Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Finishing & Special Processing */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Finishing & Fabrication', 'ফিনিশিং ও ফিটিংস')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FINISHING_OPTIONS.map((f) => {
              const isSelected = selectedFinishings.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFinishing(f)}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded flex items-center justify-center border shrink-0',
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{f}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 4: Reference Artwork & Pre-Press Notes */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Artwork & Pre-Press Notes', 'রেফারেন্স আর্টওয়ার্ক ও নির্দেশনাবলী')}
            </h3>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50">
            <Upload className="h-5 w-5 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                {referenceFileName ||
                  tBilingual('No file uploaded yet (Click to browse)', 'কোন ফাইল সংযুক্ত করা হয়নি')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                AI, EPS, PDF, CDR, TIFF, JPG up to 100MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReferenceFileName(`client_brief_${Date.now().toString().slice(-4)}.ai`)}
              className="h-8 text-xs"
            >
              {tBilingual('Simulate Upload', 'ফাইল যুক্ত')}
            </Button>
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
              className="flex-1 sm:flex-initial min-h-[40px] text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
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

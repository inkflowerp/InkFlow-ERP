'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Printer,
  Sparkles,
  Layers,
  Scissors,
  Truck,
  CheckCircle2,
  Calendar,
  DollarSign,
  Phone,
  User,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Calculator,
  Cpu,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { useOperatorMode } from '@/hooks/use-operator-mode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { NextActionModal, NextActionConfig } from '@/components/shared/next-action-modal'
import { CustomerRecord } from '@/types/crm.types'
import { CustomerRepository } from '@/lib/repositories/customer.repository'
import { OrderRepository } from '@/lib/repositories/order.repository'
import { BillingRepository } from '@/lib/repositories/billing.repository'
import { ProductionRepository } from '@/lib/repositories/production.repository'
import { ProductionTaskRepository } from '@/lib/repositories/production-task.repository'
import { createClient } from '@/lib/supabase/client'
import { formatBDT } from '@/lib/formatters'

interface WorkTypePreset {
  id: string
  nameEn: string
  nameBn: string
  defaultUnit: 'sqft' | 'inch' | 'pcs'
  defaultMaterial: string
  defaultFinishing: string[]
  defaultRate: number
  icon: string
}

const WORK_PRESETS: WorkTypePreset[] = [
  {
    id: 'flex_banner',
    nameEn: 'Flex Banner',
    nameBn: 'ফ্লেক্স ব্যানার',
    defaultUnit: 'sqft',
    defaultMaterial: 'Star Flex (China 280gsm)',
    defaultFinishing: ['Eyelet / Ring', 'Seaming / Border Fold'],
    defaultRate: 15,
    icon: 'Printer',
  },
  {
    id: 'vinyl_sticker',
    nameEn: 'Vinyl Sticker',
    nameBn: 'ভিনাইল স্টিকার',
    defaultUnit: 'sqft',
    defaultMaterial: 'Glossy Vinyl White (3M/China)',
    defaultFinishing: ['Cold Lamination (Glossy)'],
    defaultRate: 35,
    icon: 'Layers',
  },
  {
    id: 'acrylic_sign',
    nameEn: 'Acrylic Signboard',
    nameBn: 'এক্রিলিক সাইনবোর্ড',
    defaultUnit: 'sqft',
    defaultMaterial: '3mm Cast Acrylic + LED',
    defaultFinishing: ['Laser Cut', 'LED Lighting', 'Installation'],
    defaultRate: 350,
    icon: 'Cpu',
  },
  {
    id: 'x_banner',
    nameEn: 'X-Banner / Standee',
    nameBn: 'এক্স-ব্যানার ও স্ট্যান্ড',
    defaultUnit: 'pcs',
    defaultMaterial: 'PVC Backlit / Synthetic Banner',
    defaultFinishing: ['X-Stand Metal Frame', 'Eyelets 4 Corners'],
    defaultRate: 650,
    icon: 'Layers',
  },
  {
    id: 'festoon',
    nameEn: 'Festoon / Pole Sign',
    nameBn: 'ফেস্টুন ও ফ্রেম',
    defaultUnit: 'pcs',
    defaultMaterial: 'Normal Flex (240gsm)',
    defaultFinishing: ['Wooden Frame Fitting'],
    defaultRate: 90,
    icon: 'Printer',
  },
  {
    id: 'custom',
    nameEn: 'Custom Job',
    nameBn: 'অন্যান্য কাস্টম কাজ',
    defaultUnit: 'sqft',
    defaultMaterial: 'Custom Specification',
    defaultFinishing: [],
    defaultRate: 50,
    icon: 'Scissors',
  },
]

interface NewWorkWizardProps {
  isOpen?: boolean
  onClose?: () => void
  onSuccess?: (jobData: any) => void
  isInlineModal?: boolean
}

export function NewWorkWizard({
  isOpen = true,
  onClose,
  onSuccess,
  isInlineModal = false,
}: NewWorkWizardProps) {
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const { isSimpleMode } = useOperatorMode()
  const router = useRouter()
  const companyId = company?.id || 'demo-company'
  const tenantSlug = company?.slug || 'my-company'

  // Wizard Steps: 1. Customer, 2. Work & Size, 3. Material & Finishing, 4. Delivery & Review
  const [step, setStep] = useState<number>(1)

  // Customer State
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')

  // Work Type State
  const [selectedPreset, setSelectedPreset] = useState<WorkTypePreset>(WORK_PRESETS[0])
  const [jobTitle, setJobTitle] = useState(WORK_PRESETS[0].nameBn)
  const [width, setWidth] = useState<number>(8)
  const [height, setHeight] = useState<number>(4)
  const [unit, setUnit] = useState<'ft' | 'inch' | 'pcs'>('ft')
  const [quantity, setQuantity] = useState<number>(1)
  const [unitRate, setUnitRate] = useState<number>(WORK_PRESETS[0].defaultRate)
  const [advancePaid, setAdvancePaid] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank'>('cash')

  // Material & Finishing
  const [materialName, setMaterialName] = useState(WORK_PRESETS[0].defaultMaterial)
  const [selectedFinishings, setSelectedFinishings] = useState<string[]>(WORK_PRESETS[0].defaultFinishing)

  // Delivery & Scheduling
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'courier' | 'installation'>('pickup')
  const [notes, setNotes] = useState('')

  // Advanced Mode Options (Progressive Disclosure)
  const [showAdvanced, setShowAdvanced] = useState(!isSimpleMode)
  const [assignedMachine, setAssignedMachine] = useState('Large Format Eco-Solvent #1')
  const [colorProfile, setColorProfile] = useState('CMYK Standard')
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'very_urgent'>('normal')

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Next Action Modal
  const [nextActionConfig, setNextActionConfig] = useState<NextActionConfig | null>(null)

  // Load existing customers on mount
  useEffect(() => {
    async function loadCustomers() {
      try {
        const list = await CustomerRepository.getCustomers(companyId)
        setCustomers(list)
      } catch (_) {}
    }
    loadCustomers()
  }, [companyId])

  // Calculation Helpers
  const totalSqft = unit === 'ft' ? width * height * quantity : unit === 'inch' ? (width * height * quantity) / 144 : quantity
  const totalAmount = Math.round(totalSqft * unitRate)
  const dueAmount = Math.max(0, totalAmount - advancePaid)

  // Select Preset Handler
  const handleSelectPreset = (preset: WorkTypePreset) => {
    setSelectedPreset(preset)
    setJobTitle(preset.nameBn)
    setMaterialName(preset.defaultMaterial)
    setSelectedFinishings(preset.defaultFinishing)
    setUnitRate(preset.defaultRate)
  }

  // Toggle Finishing
  const toggleFinishing = (item: string) => {
    if (selectedFinishings.includes(item)) {
      setSelectedFinishings(selectedFinishings.filter((f) => f !== item))
    } else {
      setSelectedFinishings([...selectedFinishings, item])
    }
  }

  // Filter Customers
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    ((c as any).phone || c.mobile || '').includes(customerSearch) ||
    (c.company_name && c.company_name.toLowerCase().includes(customerSearch.toLowerCase()))
  )

  // Create Quick Customer
  const handleQuickCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setErrorMessage(tBilingual('Customer name and phone are required', 'কাস্টমারের নাম ও মোবাইল নম্বর আবশ্যক'))
      return
    }

    try {
      const created = await CustomerRepository.createCustomer({
        company_id: companyId,
        name: newCustomerName.trim(),
        mobile: newCustomerPhone.trim(),
        address: newCustomerAddress.trim() || undefined,
      })
      setSelectedCustomer(created)
      setCustomers([created, ...customers])
      setIsCreatingCustomer(false)
      setErrorMessage(null)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create customer')
    }
  }

  // Final Order Creation Handler
  const handleCreateNewWork = async () => {
    if (!selectedCustomer) {
      setErrorMessage(tBilingual('Please select or create a customer first', 'দয়া করে একজন কাস্টমার নির্বাচন করুন'))
      setStep(1)
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const custPhone = (selectedCustomer as any).phone || selectedCustomer.mobile || ''

      // 1. Generate Document Numbers transactionally
      const invoiceNumber = await BillingRepository.getNextDocumentNumber(companyId, 'invoice')
      const orderNumber = await BillingRepository.getNextDocumentNumber(companyId, 'order')
      const jobNumber = `JOB-${orderNumber.replace('ORD-', '')}`

      // 2. Create Invoice
      const invoice = await BillingRepository.createInvoice({
        company_id: companyId,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_phone: custPhone,
        customer_address: selectedCustomer.address || '',
        invoice_number: invoiceNumber,
        subtotal: totalAmount,
        discount_amount: 0,
        vat_amount: 0,
        grand_total: totalAmount,
        paid_amount: advancePaid,
        due_amount: dueAmount,
        status: dueAmount === 0 ? 'paid' : advancePaid > 0 ? 'partially_paid' : 'unpaid',
        due_date: deliveryDate,
        created_by_name: 'Workshop Operator',
        items: [
          {
            id: crypto.randomUUID(),
            invoice_id: '',
            item_description: `${jobTitle} (${width}x${height} ${unit}) - ${materialName}`,
            quantity: quantity,
            unit: unit,
            unit_price: unitRate,
            vat_percentage: 0,
            total_price: totalAmount,
          },
        ],
      })

      // 3. Record Advance Payment if made
      if (advancePaid > 0) {
        await BillingRepository.recordPayment({
          company_id: companyId,
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          amount: advancePaid,
          payment_method: paymentMethod,
          invoice_id: invoice.id,
          notes: `Advance for ${jobTitle}`,
          received_by_name: 'Workshop Operator',
        })
      }

      // 4. Create Job Order & Production Job
      const prodJob = await ProductionRepository.createProductionJob({
        company_id: companyId,
        production_job_number: jobNumber,
        customer_name: selectedCustomer.name,
        product_name: jobTitle,
        department: 'printing',
        stage: 'printing',
        status: 'queued',
        priority: priority,
        deadline: deliveryDate,
        dimensions_spec: `${width} × ${height} ${unit}`,
        quantity: quantity,
        material_spec: `${materialName}${selectedFinishings.length ? ' (' + selectedFinishings.join(', ') + ')' : ''}`,
        assigned_workers: [],
        production_instructions: notes || undefined,
        has_rework: false,
        rework_count: 0,
      })

      // 5. Create Production Task
      await ProductionTaskRepository.createTask({
        company_id: companyId,
        production_job_id: prodJob.id,
        task_name: `Print: ${jobTitle} (${width}x${height} ${unit})`,
        stage_name: 'printing',
        quantity: quantity,
        unit: unit,
        status: 'queued',
        customer_name: selectedCustomer.name,
        product_name: jobTitle,
        job_number: jobNumber,
        assigned_machine_name: assignedMachine,
        estimated_duration_minutes: Math.max(15, Math.round(totalSqft * 0.5)),
      })

      // Prepare Next Action Dialog
      const cleanPhone = custPhone.replace(/\D/g, '')
      const formattedPhone = cleanPhone.startsWith('880') ? cleanPhone : cleanPhone.startsWith('0') ? `88${cleanPhone}` : `880${cleanPhone}`
      const whatsappMsg = encodeURIComponent(
        `নমস্কার ${selectedCustomer.name},\nInkFlow এ আপনার কাজ (${jobTitle}) অর্ডার হিসেবে যুক্ত হয়েছে।\nবিল নং: ${invoiceNumber}\nমোট টাকা: ৳${totalAmount.toLocaleString()}\nজমা: ৳${advancePaid.toLocaleString()}\nবাকি: ৳${dueAmount.toLocaleString()}\nডেলিভারি: ${deliveryDate}\nধন্যবাদ!`
      )
      const waUrl = `https://wa.me/${formattedPhone}?text=${whatsappMsg}`

      setNextActionConfig({
        titleEn: 'Work Order Created Successfully!',
        titleBn: 'নতুন কাজ সফলভাবে তৈরি হয়েছে!',
        descriptionEn: `Job #${jobNumber} and Invoice #${invoiceNumber} have been saved and dispatched to the production queue.`,
        descriptionBn: `কাজের টিকিট #${jobNumber} এবং ইনভয়েস #${invoiceNumber} তৈরি হয়েছে এবং প্রোডাকশন কিউতে পাঠানো হয়েছে।`,
        primaryAction: {
          labelEn: 'Send WhatsApp Update',
          labelBn: 'কাস্টমারকে হোয়াটসঅ্যাপ মেসেজ পাঠান',
          onClick: () => {
            window.open(waUrl, '_blank')
            onSuccess?.(prodJob)
            onClose?.()
          },
        },
        secondaryActions: [
          {
            labelEn: 'Go to Floor Terminal',
            labelBn: 'ফ্লোর টার্মিনালে যান (কাজ শুরু করুন)',
            onClick: () => {
              router.push(`/${tenantSlug}/operator`)
              onSuccess?.(prodJob)
              onClose?.()
            },
          },
          {
            labelEn: 'Print Work Ticket',
            labelBn: 'জব টিকিট প্রিন্ট করুন',
            onClick: () => {
              window.print()
            },
          },
          {
            labelEn: '+ Create Another Work',
            labelBn: '+ আরেকটি নতুন কাজ যোগ করুন',
            onClick: () => {
              setStep(1)
              setSelectedCustomer(null)
              setAdvancePaid(0)
              setNotes('')
              setNextActionConfig(null)
            },
          },
        ],
      })
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save new work')
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = (
    <div className="space-y-6">
      {/* Step Progress Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {[
            { num: 1, labelBn: 'কাস্টমার', labelEn: 'Customer' },
            { num: 2, labelBn: 'সাইজ ও পরিমাণ', labelEn: 'Size & Work' },
            { num: 3, labelBn: 'ম্যাটেরিয়াল ও ফিনিশিং', labelEn: 'Material' },
            { num: 4, labelBn: 'ডেলিভারি ও সেভ', labelEn: 'Delivery' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => s.num < step && setStep(s.num)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                step === s.num
                  ? 'bg-blue-600 text-white shadow-sm'
                  : step > s.num
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span>{s.num}.</span>
              <span>{tBilingual(s.labelEn, s.labelBn)}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {showAdvanced ? tBilingual('Simple View', 'সহজ ভিউ') : tBilingual('Advanced View', 'বিস্তারিত ভিউ')}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-2 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: CUSTOMER SELECTION */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {tBilingual('1. Select or Add Customer', '১. কাস্টমার নির্বাচন করুন বা নতুন যোগ করুন')}
            </h3>
            <Button
              type="button"
              size="sm"
              variant={isCreatingCustomer ? 'outline' : 'default'}
              onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
              className="text-xs font-bold"
            >
              {isCreatingCustomer ? tBilingual('Back to List', 'তালিকায় ফিরুন') : tBilingual('+ New Customer', '+ নতুন কাস্টমার')}
            </Button>
          </div>

          {isCreatingCustomer ? (
            <Card className="border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">{tBilingual('Customer Name *', 'কাস্টমারের নাম *')}</Label>
                    <Input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="e.g. Rahim Enterprise / রহিম এন্টারপ্রাইজ"
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">{tBilingual('Mobile / WhatsApp *', 'মোবাইল / হোয়াটসঅ্যাপ *')}</Label>
                    <Input
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="e.g. 01711223344"
                      className="h-10 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{tBilingual('Shop / Delivery Address', 'ঠিকানা (ঐচ্ছিক)')}</Label>
                  <Input
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    placeholder="e.g. Shop 12, Mirpur 10, Dhaka"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={handleQuickCreateCustomer}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-6"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {tBilingual('Save & Continue', 'সংরক্ষণ করে এগিয়ে যান')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder={tBilingual('Search by Name or Phone (নাম বা মোবাইল দিয়ে খুঁজুন)...', 'কাস্টমারের নাম বা মোবাইল নম্বর লিখুন...')}
                className="h-12 text-sm bg-white dark:bg-slate-900 border-slate-300"
              />

              {selectedCustomer && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{selectedCustomer.name}</span>
                      <Badge className="bg-emerald-600 text-white text-[10px]">{tBilingual('Selected', 'নির্বাচিত')}</Badge>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono flex items-center gap-2">
                      <span>📞 {(selectedCustomer as any).phone || selectedCustomer.mobile}</span>
                      {(selectedCustomer as any).current_balance ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold font-sans">
                          (বাকি: ৳{Number((selectedCustomer as any).current_balance).toLocaleString()})
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setStep(2)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4"
                  >
                    {tBilingual('Next Step', 'পরবর্তী ধাপ')} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    {tBilingual('No customer found.', 'কোনো কাস্টমার পাওয়া যায়নি।')}
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIsCreatingCustomer(true)}
                      className="text-xs font-bold text-blue-600 pl-1"
                    >
                      {tBilingual('Create New', 'নতুন তৈরি করুন')}
                    </Button>
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c)
                        setStep(2)
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between hover:bg-blue-50/50 dark:hover:bg-blue-950/30 ${
                        selectedCustomer?.id === c.id
                          ? 'border-blue-500 bg-blue-50/40 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{(c as any).phone || c.mobile}</div>
                      </div>
                      <div className="text-right">
                        {(c as any).current_balance && Number((c as any).current_balance) > 0 ? (
                          <div className="text-rose-600 text-[11px] font-bold">
                            বাকি: ৳{Number((c as any).current_balance).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium">ক্লিয়ার</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: WORK TYPE & SIZE */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-600" />
              {tBilingual('2. What do they want to make?', '২. কী কাজ বানাতে চান?')}
            </h3>
            {selectedCustomer && (
              <Badge variant="outline" className="text-xs font-medium">
                {selectedCustomer.name}
              </Badge>
            )}
          </div>

          {/* Preset Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {WORK_PRESETS.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center space-y-1 ${
                  selectedPreset.id === p.id
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.nameBn}</div>
                <div className="text-[11px] text-slate-500">{p.nameEn}</div>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  ৳{p.defaultRate}/{p.defaultUnit}
                </div>
              </div>
            ))}
          </div>

          {/* Dimensions & Quantity Form */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">{tBilingual('Width (প্রস্থ)', 'প্রস্থ (Width)')}</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    className="h-11 text-base font-bold font-mono text-center"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">{tBilingual('Height (উচ্চতা)', 'উচ্চতা (Height)')}</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    className="h-11 text-base font-bold font-mono text-center"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">{tBilingual('Unit (একক)', 'একক (Unit)')}</Label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="ft">Feet (ফুট)</option>
                    <option value="inch">Inch (ইঞ্চি)</option>
                    <option value="pcs">Pieces (পিস)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">{tBilingual('Quantity (পরিমাণ)', 'পরিমাণ (Qty)')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="h-11 text-base font-bold font-mono text-center text-blue-700"
                  />
                </div>
              </div>

              {/* Calculated Size & Price Bar */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500">মোট মাপ: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
                    {totalSqft.toFixed(1)} {unit === 'pcs' ? 'পিস' : 'স্কয়ার ফিট'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500">রেট: ৳</span>
                  <Input
                    type="number"
                    value={unitRate}
                    onChange={(e) => setUnitRate(parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-xs font-bold text-center font-mono"
                  />
                </div>

                <div>
                  <span className="text-slate-500">মোট বিল: </span>
                  <span className="font-bold text-blue-700 dark:text-blue-300 font-mono text-base">
                    ৳{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> {tBilingual('Back', 'পেছনে')}
            </Button>
            <Button type="button" size="sm" onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-6">
              {tBilingual('Next: Material & Finishing', 'পরবর্তী: ম্যাটেরিয়াল ও ফিনিশিং')} <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: MATERIAL & FINISHING */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              {tBilingual('3. Material & Finishing Selection', '৩. ম্যাটেরিয়াল ও ফিনিশিং')}
            </h3>
            <span className="text-xs text-blue-600 font-bold">{jobTitle}</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{tBilingual('Raw Material Specification', 'কাঁচামাল / মিডিয়া')}</Label>
              <Input
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="e.g. Star Flex / Vinyl White / 3mm Acrylic"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">{tBilingual('Finishing Tasks (ফিনিশিং কাজ)', 'ফিনিশিং নির্বাচন করুন')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Eyelet / Ring (আইলেট রিং)',
                  'Seaming / Border Fold (বর্ডার ভাঁজ)',
                  'Wooden Frame (কাঠের ফ্রেম)',
                  'Metal Frame (লোহার ফ্রেম)',
                  'Cold Lamination (ল্যামিনেশন)',
                  'Die Cut / Shape Cut (কাটিং)',
                  'Fitting / Pasting (ফিটিং)',
                  'LED Wiring (এলইডি লাইটিং)',
                ].map((item) => {
                  const isSelected = selectedFinishings.includes(item)
                  return (
                    <div
                      key={item}
                      onClick={() => toggleFinishing(item)}
                      className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input type="checkbox" checked={isSelected} readOnly className="rounded text-blue-600" />
                      <span className="truncate">{item}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Progressive Disclosure: Advanced Floor Options */}
            {showAdvanced && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 pt-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>{tBilingual('Advanced Production Controls', 'অ্যাডভান্সড প্রোডাকশন সেটিংস')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px]">{tBilingual('Target Machine', 'মেশিন বরাদ্দ')}</Label>
                    <Input value={assignedMachine} onChange={(e) => setAssignedMachine(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{tBilingual('Color Profile', 'কালার প্রোফাইল')}</Label>
                    <Input value={colorProfile} onChange={(e) => setColorProfile(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{tBilingual('Priority', 'জরুরি কিনা')}</Label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full h-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs px-2"
                    >
                      <option value="normal">Normal (স্বাভাবিক)</option>
                      <option value="urgent">Urgent (জরুরি)</option>
                      <option value="very_urgent">Very Urgent (খুব জরুরি)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> {tBilingual('Back', 'পেছনে')}
            </Button>
            <Button type="button" size="sm" onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-6">
              {tBilingual('Next: Delivery & Payment', 'পরবর্তী: ডেলিভারি ও পেমেন্ট')} <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: DELIVERY & PAYMENT & SAVE */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              {tBilingual('4. Delivery, Advance Payment & Confirmation', '৪. ডেলিভারি ও অগ্রিম পেমেন্ট')}
            </h3>
          </div>

          <Card className="border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">{tBilingual('Delivery Due Date *', 'কবে ডেলিভারি দিতে হবে? *')}</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="h-10 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">{tBilingual('Delivery Mode', 'ডেলিভারি মাধ্যম')}</Label>
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value as any)}
                    className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="pickup">Store Pickup (দোকান থেকে নেবে)</option>
                    <option value="courier">Courier / Transport (কুরিয়ার / পরিবহন)</option>
                    <option value="installation">Site Installation (সাইটে গিয়ে লাগানো)</option>
                  </select>
                </div>
              </div>

              {/* Payment Advance */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {tBilingual('Advance Payment Received (অগ্রিম জমা)', 'অগ্রিম টাকা জমা')}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600">মোট বিল: ৳{totalAmount.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">{tBilingual('Advance Amount (৳)', 'জমা টাকা')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max={totalAmount}
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                      className="h-10 text-sm font-bold font-mono text-emerald-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">{tBilingual('Payment Channel', 'পেমেন্ট মাধ্যম')}</Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="cash">Cash (ক্যাশ)</option>
                      <option value="bkash">bKash (বিকাশ)</option>
                      <option value="nagad">Nagad (নগদ)</option>
                      <option value="bank">Bank Transfer (ব্যাংক)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60 dark:border-amber-900/60">
                  <span className="text-slate-600">বাকি থাকবে (Due):</span>
                  <span className={`font-bold font-mono text-sm ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ৳{dueAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{tBilingual('Notes / Instructions', 'বিশেষ নোট বা নির্দেশনা')}</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Design proof approved on WhatsApp / Urgent delivery needed by 4 PM"
                  className="h-10 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStep(3)} className="text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> {tBilingual('Back', 'পেছনে')}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={isSubmitting}
              onClick={handleCreateNewWork}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold h-12 px-8 shadow-md"
            >
              {isSubmitting ? (
                <span>{tBilingual('Saving Work...', 'সংরক্ষণ হচ্ছে...')}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  {tBilingual('Save & Dispatch Work', 'কাজ নিশ্চিত ও সেভ করুন')}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Next Action Dialog Trigger */}
      {nextActionConfig && (
        <NextActionModal
          isOpen={true}
          onClose={() => {
            setNextActionConfig(null)
            onClose?.()
          }}
          config={nextActionConfig}
        />
      )}
    </div>
  )

  if (isInlineModal) {
    return (
      <ModalDialog
        open={isOpen}
        onOpenChange={(open) => !open && onClose?.()}
        title={tBilingual('+ New Work Order', '+ নতুন কাজ তৈরি করুন')}
        size="lg"
        hideFooter={true}
      >
        {content}
      </ModalDialog>
    )
  }

  return content
}

'use client'

import React, { useState, useEffect } from 'react'
import {
  Truck,
  Building,
  User,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Landmark,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  Copy,
  Layers,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import type { SupplierRecord, SupplierCategory, SupplierPaymentTerms } from '@/types/crm.types'
import { normalizeBdPhone } from '@/lib/formatters'
import {
  BANGLADESH_MARKET_HUBS,
  SUPPLIER_CATEGORY_META,
  SUPPLIER_PAYMENT_TERMS,
  BANGLADESH_BANKS,
} from './supplier-types'

interface SupplierModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierToEdit?: SupplierRecord | null
  onSave: (supplier: SupplierRecord) => void
}

type TabKey = 'identity' | 'contact' | 'location' | 'terms' | 'banking'

export function SupplierModal({
  open,
  onOpenChange,
  supplierToEdit,
  onSave,
}: SupplierModalProps) {
  const { company } = useTenant()
  const { tBilingual } = useI18n()

  const isEditing = Boolean(supplierToEdit)

  const [activeTab, setActiveTab] = useState<TabKey>('identity')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    supplier_code: '',
    supplier_name: '',
    name_bn: '',
    company: '',
    category: 'media' as SupplierCategory,
    is_active: true,

    // Contact
    contact_person: '',
    designation: '',
    mobile: '',
    whatsapp: '',
    alt_phone: '',
    email: '',

    // Location & Hub
    market_hub: 'nayabazar',
    address: '',
    district: 'Dhaka',
    division: 'Dhaka',

    // Commercial Terms
    payment_terms: 'credit_15' as SupplierPaymentTerms,
    credit_limit: 500000,
    lead_time_days: 2,
    default_currency: 'BDT',

    // Legal & Banking
    trade_license: '',
    bin: '',
    tin: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    bank_routing_number: '',

    // Notes
    notes: '',
  })

  // Reset or Populate when modal opens
  useEffect(() => {
    if (open) {
      setErrorMsg(null)
      setActiveTab('identity')
      if (supplierToEdit) {
        setFormData({
          supplier_code: supplierToEdit.supplier_code || '',
          supplier_name: supplierToEdit.supplier_name || '',
          name_bn: supplierToEdit.name_bn || '',
          company: supplierToEdit.company || '',
          category: supplierToEdit.category || 'media',
          is_active: supplierToEdit.is_active ?? true,

          contact_person: supplierToEdit.contact_person || '',
          designation: supplierToEdit.designation || '',
          mobile: supplierToEdit.mobile || '',
          whatsapp: supplierToEdit.whatsapp || '',
          alt_phone: supplierToEdit.alt_phone || '',
          email: supplierToEdit.email || '',

          market_hub: supplierToEdit.market_hub || 'nayabazar',
          address: supplierToEdit.address || '',
          district: supplierToEdit.district || 'Dhaka',
          division: supplierToEdit.division || 'Dhaka',

          payment_terms: supplierToEdit.payment_terms || 'credit_15',
          credit_limit: supplierToEdit.credit_limit ?? 500000,
          lead_time_days: supplierToEdit.lead_time_days ?? 2,
          default_currency: supplierToEdit.default_currency || 'BDT',

          trade_license: supplierToEdit.trade_license || '',
          bin: supplierToEdit.bin || '',
          tin: supplierToEdit.tin || '',
          bank_name: supplierToEdit.bank_name || '',
          bank_account_name: supplierToEdit.bank_account_name || '',
          bank_account_number: supplierToEdit.bank_account_number || '',
          bank_branch: supplierToEdit.bank_branch || '',
          bank_routing_number: supplierToEdit.bank_routing_number || '',

          notes: supplierToEdit.notes || '',
        })
      } else {
        const randCode = `SUP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        setFormData({
          supplier_code: randCode,
          supplier_name: '',
          name_bn: '',
          company: '',
          category: 'media',
          is_active: true,

          contact_person: '',
          designation: 'Sales Representative',
          mobile: '',
          whatsapp: '',
          alt_phone: '',
          email: '',

          market_hub: 'nayabazar',
          address: '',
          district: 'Dhaka',
          division: 'Dhaka',

          payment_terms: 'credit_15',
          credit_limit: 500000,
          lead_time_days: 2,
          default_currency: 'BDT',

          trade_license: '',
          bin: '',
          tin: '',
          bank_name: '',
          bank_account_name: '',
          bank_account_number: '',
          bank_branch: '',
          bank_routing_number: '',

          notes: '',
        })
      }
    }
  }, [open, supplierToEdit])

  // 1-Click copy mobile to whatsapp
  const handleCopyMobileToWhatsapp = () => {
    if (formData.mobile) {
      setFormData((prev) => ({ ...prev, whatsapp: prev.mobile }))
    }
  }

  // Handle Hub selection
  const handleHubSelect = (hubId: string) => {
    const hub = BANGLADESH_MARKET_HUBS.find((h) => h.id === hubId)
    if (hub) {
      setFormData((prev) => ({
        ...prev,
        market_hub: hub.id,
        district: hub.district,
        division: hub.division,
        address: prev.address ? prev.address : hub.nameEn,
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!formData.supplier_name.trim()) {
      setErrorMsg(tBilingual('Supplier Name is required.', 'সাপ্লায়ারের নাম অবশ্যই দিতে হবে।'))
      setActiveTab('identity')
      return
    }

    if (!formData.mobile.trim()) {
      setErrorMsg(tBilingual('Primary Mobile number is required.', 'প্রাথমিক মোবাইল নম্বর আবশ্যক।'))
      setActiveTab('contact')
      return
    }

    const normMobile = normalizeBdPhone(formData.mobile)
    if (!normMobile) {
      setErrorMsg(tBilingual('Invalid Bangladesh phone format (e.g. 017XXXXXXXX).', 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: ০১৭XXXXXXXX)।'))
      setActiveTab('contact')
      return
    }

    setLoading(true)

    try {
      const payload: SupplierRecord = {
        id: supplierToEdit?.id || `supp-${Date.now()}`,
        company_id: company?.id || 'c-01',
        branch_id: supplierToEdit?.branch_id || null,
        supplier_code: formData.supplier_code.trim() || `SUP-${Date.now().toString().slice(-4)}`,
        supplier_name: formData.supplier_name.trim(),
        name_bn: formData.name_bn.trim() || null,
        company: formData.company.trim() || null,
        contact_person: formData.contact_person.trim() || null,
        designation: formData.designation.trim() || null,
        mobile: normMobile,
        whatsapp: formData.whatsapp ? normalizeBdPhone(formData.whatsapp) || formData.whatsapp : null,
        alt_phone: formData.alt_phone.trim() || null,
        email: formData.email.trim() || null,

        market_hub: formData.market_hub,
        address: formData.address.trim() || null,
        district: formData.district || 'Dhaka',
        division: formData.division || 'Dhaka',

        category: formData.category,
        payment_terms: formData.payment_terms,
        credit_limit: Number(formData.credit_limit) || 0,
        lead_time_days: Number(formData.lead_time_days) || 1,
        default_currency: formData.default_currency || 'BDT',

        trade_license: formData.trade_license.trim() || null,
        bin: formData.bin.trim() || null,
        tin: formData.tin.trim() || null,
        bank_name: formData.bank_name.trim() || null,
        bank_account_name: formData.bank_account_name.trim() || null,
        bank_account_number: formData.bank_account_number.trim() || null,
        bank_branch: formData.bank_branch.trim() || null,
        bank_routing_number: formData.bank_routing_number.trim() || null,

        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
        outstanding_balance: supplierToEdit?.outstanding_balance ?? 0,
        total_purchases_amount: supplierToEdit?.total_purchases_amount ?? 0,
        created_at: supplierToEdit?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onSave(payload)
      onOpenChange(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save supplier.')
    } finally {
      setLoading(false)
    }
  }

  const currentCategoryMeta = SUPPLIER_CATEGORY_META[formData.category] || SUPPLIER_CATEGORY_META.media
  const CategoryIcon = currentCategoryMeta.icon

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="4xl"
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 font-bold shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {isEditing
                  ? tBilingual('Edit Supplier & Vendor Profile', 'মহাজন ও ভেন্ডর প্রোফাইল সম্পাদনা')
                  : tBilingual('Register New Material Supplier', 'নতুন সাপ্লায়ার / মহাজন যুক্ত করুন')}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono py-0.5 px-2 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
              >
                {formData.supplier_code || 'VENDOR'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Configure commercial credit terms, contact channels, market hubs, and payment terms.',
                'ক্রেডিট সীমা, যোগাযোগের মাধ্যম, মার্কেট হাব এবং পেমেন্টের শর্তাবলী নির্ধারণ করুন।'
              )}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-in fade-in-0">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB NAVIGATION STRIP */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-0.5">
          {[
            { id: 'identity', labelEn: '1. Identity & Material Category', labelBn: '১. পরিচয় ও ক্যাটাগরি', icon: Building },
            { id: 'contact', labelEn: '2. Personnel & Contacts', labelBn: '২. প্রতিনিধি ও যোগাযোগ', icon: User },
            { id: 'location', labelEn: '3. Market Hub & Address', labelBn: '৩. মার্কেট ও ঠিকানা', icon: MapPin },
            { id: 'terms', labelEn: '4. Commercial & Credit', labelBn: '৪. বাকির শর্ত ও সীমা', icon: CreditCard },
            { id: 'banking', labelEn: '5. Tax, BIN & Banking', labelBn: '৫. ট্যাক্স ও ব্যাংক তথ্য', icon: Landmark },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-teal-600 text-teal-700 bg-teal-50/60 dark:bg-teal-950/40 dark:border-teal-400 dark:text-teal-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 dark:text-slate-400'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
              </button>
            )
          })}
        </div>

        {/* TAB CONTENT PANELS */}
        <div className="min-h-[340px]">
          {/* TAB 1: IDENTITY & CATEGORY */}
          {activeTab === 'identity' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {tBilingual('Supplier Entity & Trading Identity', 'সাপ্লায়ারের বাণিজ্যিক পরিচয়')}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="supActiveToggle" className="text-xs font-semibold cursor-pointer">
                      {formData.is_active ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active Vendor
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Inactive</span>
                      )}
                    </Label>
                    <input
                      id="supActiveToggle"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Supplier / Shop Name (English)', 'সাপ্লায়ার / দোকানের নাম (ইংরেজি)')} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Nayabazar Paper House & Media"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Supplier Code', 'সাপ্লায়ার কোড')}
                    </Label>
                    <Input
                      placeholder="e.g. SUP-2024-001"
                      value={formData.supplier_code}
                      onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                      className="text-xs h-9 font-mono uppercase bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Bengali Name (বাংলায় নাম)', 'বাংলায় নাম')}
                    </Label>
                    <Input
                      placeholder="যেমন: নয়াবাজার পেপার হাউস"
                      value={formData.name_bn}
                      onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                      className="text-xs h-9 bangla-text"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Trading House / Parent Company', 'ট্রেডিং প্রতিষ্ঠান / মূল কোম্পানি')}
                    </Label>
                    <Input
                      placeholder="e.g. Bengal Import & Trade Syndicate"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Material Category Picker */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      {tBilingual('Primary Supply Category', 'প্রধান উপাদানের ক্যাটাগরি')} <span className="text-rose-500">*</span>
                    </Label>
                  </div>
                  <span className="text-[11px] text-slate-400">Used for fast purchase PO filtering</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.values(SUPPLIER_CATEGORY_META).map((cat) => {
                    const CatIcon = cat.icon
                    const isSelected = formData.category === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.id as SupplierCategory })}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/50 shadow-xs ring-1 ring-teal-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                        >
                          <CatIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {cat.labelEn.split(' ')[0]}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{cat.labelBn}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONNEL & CONTACTS */}
          {activeTab === 'contact' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {tBilingual('Vendor Personnel & Key Contact', 'যোগাযোগকারী প্রতিনিধি')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Contact Person / Key Representative', 'যোগাযোগকারী ব্যক্তি / সেলস এক্সিকিউটিভ')}
                    </Label>
                    <Input
                      placeholder="e.g. Md. Rafiqul Islam"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Designation / Role', 'পদবী / দায়িত্ব')}
                    </Label>
                    <Input
                      placeholder="e.g. Sales Manager / Partner"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold block">
                        {tBilingual('Primary Mobile', 'প্রধান মোবাইল নম্বর')} <span className="text-rose-500">*</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="01711-XXXXXX"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="text-xs h-9 pl-9 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold block">
                        {tBilingual('WhatsApp Number', 'হোয়াটসঅ্যাপ নম্বর')}
                      </Label>
                      {formData.mobile && formData.mobile !== formData.whatsapp && (
                        <button
                          type="button"
                          onClick={handleCopyMobileToWhatsapp}
                          className="text-[10px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Copy className="h-2.5 w-2.5" /> Same
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <MessageSquare className="absolute left-2.5 top-2.5 h-4 w-4 text-emerald-500" />
                      <Input
                        placeholder="01819-XXXXXX"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="text-xs h-9 pl-9 font-mono text-emerald-700 dark:text-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Alternative Phone / Landline', 'বিকল্প ফোন / টিঅ্যান্ডটি')}
                    </Label>
                    <Input
                      placeholder="02-956XXXX / 019XXXXXXXX"
                      value={formData.alt_phone}
                      onChange={(e) => setFormData({ ...formData, alt_phone: e.target.value })}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Official Email Address', 'অফিসিয়াল ইমেইল')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="sales@vendor.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="text-xs h-9 pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MARKET HUB & ADDRESS */}
          {activeTab === 'location' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {tBilingual('Market Hub & Warehouse Location', 'মার্কেট হাব ও গুদাম ঠিকানা')}
                  </h3>
                </div>

                {/* Hub Presets */}
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    {tBilingual('Select Major Printing & Material Market Hub in Bangladesh', 'বাংলাদেশের প্রধান প্রেস ও মেটেরিয়াল মার্কেট হাব নির্বাচন করুন')}
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {BANGLADESH_MARKET_HUBS.map((hub) => {
                      const isSelected = formData.market_hub === hub.id
                      return (
                        <button
                          key={hub.id}
                          type="button"
                          onClick={() => handleHubSelect(hub.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/50 ring-1 ring-teal-500 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            📍 {hub.nameEn.split(' ')[0]}
                          </div>
                          <div className="text-[10px] text-teal-700 dark:text-teal-400 truncate">{hub.nameBn}</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{hub.area}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('District / Zilla', 'জেলা')}
                    </Label>
                    <Input
                      placeholder="e.g. Dhaka, Bogura, Chittagong"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Division / Region', 'বিভাগ')}
                    </Label>
                    <Input
                      placeholder="e.g. Dhaka Division"
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Detailed Street Address & Shop / Goli No', 'দোকান বা গোডাউনের বিস্তারিত ঠিকানা')}
                  </Label>
                  <Input
                    placeholder="e.g. 42/B, Nayabazar Paper Market (Near Kotwali), Dhaka-1100"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMMERCIAL & CREDIT TERMS */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {tBilingual('Payment Terms & Credit Agreement', 'পেমেন্টের শর্ত ও বাকি চুক্তি')}
                  </h3>
                </div>

                {/* Terms Selector Cards */}
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    {tBilingual('Payment Terms (বিল পরিশোধের চুক্তি)', 'পেমেন্টের শর্তাবলী')}
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SUPPLIER_PAYMENT_TERMS.map((term) => {
                      const isSelected = formData.payment_terms === term.id
                      return (
                        <button
                          key={term.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, payment_terms: term.id as SupplierPaymentTerms })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/50 ring-1 ring-teal-500 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{term.labelEn}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {term.days > 0 ? `${term.days} Days` : 'Spot'}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5 font-medium">
                            {term.labelBn}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 leading-tight">{term.descriptionEn}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Credit Limit (বাকি সীমা ৳ BDT)', 'সর্বোচ্চ বাকি সীমা (৳)')}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                      <Input
                        type="number"
                        step="10000"
                        placeholder="500000"
                        value={formData.credit_limit || ''}
                        onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                        className="text-xs h-9 pl-7 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Typical Delivery Lead Time (Days)', 'ডেলিভারি লিড টাইম (দিন)')}
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        min="1"
                        placeholder="2"
                        value={formData.lead_time_days || ''}
                        onChange={(e) => setFormData({ ...formData, lead_time_days: Number(e.target.value) })}
                        className="text-xs h-9 pl-9 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TAX, BIN & BANKING */}
          {activeTab === 'banking' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {tBilingual('Legal, VAT/BIN & Bank Settlement Details', 'ট্যাক্স, ভ্যাট ও ব্যাংক অ্যাকাউন্ট তথ্য')}
                  </h3>
                </div>

                {/* Legal Identifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Trade License No', 'ট্রেড লাইসেন্স নম্বর')}
                    </Label>
                    <Input
                      placeholder="e.g. TRAD/DNCC/120934"
                      value={formData.trade_license}
                      onChange={(e) => setFormData({ ...formData, trade_license: e.target.value })}
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('BIN / VAT Registration (9/13 Digit)', 'বিআইএন / ভ্যাট নম্বর')}
                    </Label>
                    <Input
                      placeholder="e.g. 001234567-0101"
                      value={formData.bin}
                      onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('TIN Certificate Number', 'টিআইএন নম্বর')}
                    </Label>
                    <Input
                      placeholder="e.g. 192837465012"
                      value={formData.tin}
                      onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                {/* Bank Account Info */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {tBilingual('Bank Account for Cheque / BEFTN Disbursements', 'চেক বা ব্যাংক ট্রান্সফারের তথ্য')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        {tBilingual('Bank Name', 'ব্যাংকের নাম')}
                      </Label>
                      <select
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                      >
                        <option value="">-- Select Bank in Bangladesh --</option>
                        {BANGLADESH_BANKS.map((b, idx) => (
                          <option key={idx} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        {tBilingual('Account Title / Name', 'অ্যাকাউন্টের নাম')}
                      </Label>
                      <Input
                        placeholder="e.g. Nayabazar Paper House Ltd."
                        value={formData.bank_account_name}
                        onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        {tBilingual('Account Number', 'অ্যাকাউন্ট নম্বর')}
                      </Label>
                      <Input
                        placeholder="e.g. 102.120.9842"
                        value={formData.bank_account_number}
                        onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        {tBilingual('Branch Name', 'শাখার নাম')}
                      </Label>
                      <Input
                        placeholder="e.g. Imamganj Branch, Dhaka"
                        value={formData.bank_branch}
                        onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">
                        {tBilingual('Routing Number (9 Digit)', 'রাউটিং নম্বর')}
                      </Label>
                      <Input
                        placeholder="e.g. 090271923"
                        value={formData.bank_routing_number}
                        onChange={(e) => setFormData({ ...formData, bank_routing_number: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Agreement Remarks */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Vendor Agreement Remarks & Special Notes', 'বিশেষ চুক্তি বা বাকির শর্তাবলী নোট')}
                  </Label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Discount 2% on 15-day early clearance. Free delivery for rolls over 5,000 sft."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab !== 'identity' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const tabs: TabKey[] = ['identity', 'contact', 'location', 'terms', 'banking']
                  const prevIdx = tabs.indexOf(activeTab) - 1
                  if (prevIdx >= 0) setActiveTab(tabs[prevIdx])
                }}
                className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> {tBilingual('Back', 'পূর্ববর্তী')}
              </Button>
            )}

            {activeTab !== 'banking' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const tabs: TabKey[] = ['identity', 'contact', 'location', 'terms', 'banking']
                  const nextIdx = tabs.indexOf(activeTab) + 1
                  if (nextIdx < tabs.length) setActiveTab(tabs[nextIdx])
                }}
                className="w-full sm:w-auto min-h-[40px] text-xs font-semibold text-teal-700 dark:text-teal-400"
              >
                {tBilingual('Next Section', 'পরবর্তী ধাপ')} <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}

            {activeTab === 'banking' && (
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-h-[40px] text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm px-6"
              >
                {loading
                  ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...')
                  : isEditing
                  ? tBilingual('Update Supplier Profile', 'সাপ্লায়ার আপডেট করুন')
                  : tBilingual('Register Supplier', 'সাপ্লায়ার সংরক্ষণ করুন')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}

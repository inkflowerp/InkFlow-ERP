'use client'

import { interpolateVariables } from '@/lib/email/interpolate'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import {
 FileText,
 Printer,
 Save,
 CheckCircle2,
 AlertTriangle,
 Languages,
 Eye,
 Sliders,
 Check,
 Landmark,
 ArrowLeft,
 Sparkles,
 Building,
 Mail,
 MessageSquare,
 Copy,
 Layers,
 Code2,
 Smartphone,
 Search,
 User,
 Info,
 ExternalLink,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatters'
import { DEFAULT_DOCUMENT_TEMPLATES } from '@/lib/communication/document-templates'
import {
  DocumentType,
  DocumentLanguageMode,
  DocumentTemplateConfigRecord,
  CompanyTaxSettingsRecord,
  DEFAULT_TAX_SETTINGS,
} from '@/types/tax-and-docs.types'
import {
  SUPPORTED_TEMPLATE_VARIABLES,
  type TemplateVariableDefinition,
} from '@/lib/communication/variables'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { getTenantNavHref, getTenantBaseUrl, formatDocumentUrl } from '@/lib/tenant/tenant-url'

export default function DocumentDesignerPage() {
 const params = useParams()
 const routeSlug = (params?.tenantSlug as string) || ''
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const pathname = usePathname()
 const slug = routeSlug || company?.slug || ''

 const [mounted, setMounted] = useState(false)
 const [selectedDoc, setSelectedDoc] = useState<DocumentType>('quotation')
 const [langMode, setLangMode] = useState<DocumentLanguageMode>('bengali')
 const [activeControlTab, setActiveControlTab] = useState<'pdf' | 'communication'>('pdf')

 useEffect(() => {
 setMounted(true)
  }, [])
 const [previewMode, setPreviewMode] = useState<'pdf' | 'email' | 'whatsapp' | 'variables'>('pdf')
 const [copiedVar, setCopiedVar] = useState<string | null>(null)
 const [variableCategory, setVariableCategory] = useState<'all' | 'company' | 'customer' | 'doc' | 'user'>('all')
 const [variableSearch, setVariableSearch] = useState('')

 const [templates, setTemplates] = useDataStore<Record<DocumentType, DocumentTemplateConfigRecord>>(
 STORAGE_KEYS.DOCUMENT_TEMPLATES,
 DEFAULT_DOCUMENT_TEMPLATES,
 slug
  )
 const [taxSettings] = useDataStore<CompanyTaxSettingsRecord>(
 STORAGE_KEYS.TAX_SETTINGS,
 DEFAULT_TAX_SETTINGS,
 slug
  )
 const [notification, setNotification] = useState<string | null>(null)

 const activeTpl = templates[selectedDoc] || DEFAULT_DOCUMENT_TEMPLATES[selectedDoc]

 const showNotification = (msg: string) => {
 setNotification(msg)
 setTimeout(() => setNotification(null), 3500)
  }

 const handleUpdateTemplate = (fields: Partial<DocumentTemplateConfigRecord>) => {
 setTemplates({
      ...templates,
      [selectedDoc]: {
        ...activeTpl,
        ...fields,
 updated_at: new Date().toISOString(),
      },
    })
 showNotification(`Document template updated for ${selectedDoc.toUpperCase()}.`)
  }

 const copyToClipboard = (text: string) => {
 navigator.clipboard.writeText(text)
 setCopiedVar(text)
 setTimeout(() => setCopiedVar(null), 2000)
  }

  // Insert tag into specific template field
 const handleInsertTag = (fieldKey: 'email_subject' | 'email_body' | 'whatsapp', tag: string) => {
 const isBn = langMode === 'bengali'
 if (fieldKey === 'email_subject') {
 const currentVal = isBn ? (activeTpl.email_subject_template_bn || '') : (activeTpl.email_subject_template || '')
 const updatedVal = currentVal ? `${currentVal} ${tag}` : tag
 handleUpdateTemplate(isBn ? { email_subject_template_bn: updatedVal } : { email_subject_template: updatedVal })
    } else if (fieldKey === 'email_body') {
 const currentVal = isBn ? (activeTpl.email_body_template_bn || '') : (activeTpl.email_body_template || '')
 const updatedVal = currentVal ? `${currentVal} ${tag}` : tag
 handleUpdateTemplate(isBn ? { email_body_template_bn: updatedVal } : { email_body_template: updatedVal })
    } else if (fieldKey === 'whatsapp') {
 const currentVal = isBn ? (activeTpl.whatsapp_template_bn || '') : (activeTpl.whatsapp_template || '')
 const updatedVal = currentVal ? `${currentVal} ${tag}` : tag
 handleUpdateTemplate(isBn ? { whatsapp_template_bn: updatedVal } : { whatsapp_template: updatedVal })
    }
 copyToClipboard(tag)
 showNotification(`Inserted ${tag} into template.`)
  }

  // Sample variables for live rendering preview covering all supported backend tags
 const sampleVariables: Record<string, string> = {
    // Company
 company_name: company?.name || 'Printing Enterprise',
 company_phone: company?.phone || '+880 1711-000000',
 company_email: company?.email || 'billing@example.com',
 company_address: company?.address || '12/A Motijheel C/A, Dhaka',
 company_website: company?.website || getTenantBaseUrl(slug),

    // Customer
 customer_name: 'Ashiqur Rahman',
 customer_company: 'Metro Advertising Ltd.',
 customer_phone: '+880 1711-223344',
 customer_whatsapp: '+880 1711-223344',
 customer_email: 'ashiq@metromedia.com',
 customer_address: 'Gulshan-2, Dhaka-1212',

    // Quotation
 quotation_number: 'Q-2026-0842',
 quotation_date: new Date().toISOString().split('T')[0],
 valid_until: '15 days from issuance',
 quotation_subtotal: '42,000',
 quotation_discount: '0',
 quotation_vat: '3,500',
 quotation_total: '45,500',
 quotation_notes: 'Standard production time 3-5 business days.',

    // Invoice
 invoice_number: 'INV-2026-1055',
 invoice_date: new Date().toISOString().split('T')[0],
 invoice_subtotal: '42,000',
 invoice_discount: '0',
 invoice_vat: '3,500',
 invoice_total: '45,500',
 paid_amount: '20,000',
 due_amount: '25,500',
 payment_status: 'PARTIALLY PAID',

    // User
 prepared_by: 'Kazi Farhan',
 salesperson_name: 'Tanvir Ahmed',

    // Aliases & Backwards Compatibility
 grand_total: '45,500',
 total_amount: '45,500',
 subtotal: '42,000',
 discount_amount: '0',
 vat_amount: '3,500',
 date: new Date().toISOString().split('T')[0],
 due_date: 'Due Upon Receipt',
 items_summary: '• PVC Flex Vinyl Banner (120 sqft) - ৳ 18,000\n• Acrylic LED 3D Letter Signboard (1 set) - ৳ 27,500',
 document_link: formatDocumentUrl(slug, selectedDoc === 'quotation' ? 'quotation' : 'invoice', 'sample-preview'),
  }

  // Active Document Available Variables
 const activeDocVariables = useMemo(() => {
 const list: TemplateVariableDefinition[] = [
      ...SUPPORTED_TEMPLATE_VARIABLES.company,
      ...SUPPORTED_TEMPLATE_VARIABLES.customer,
      ...(selectedDoc === 'quotation' ? SUPPORTED_TEMPLATE_VARIABLES.quotation : SUPPORTED_TEMPLATE_VARIABLES.invoice),
      ...SUPPORTED_TEMPLATE_VARIABLES.user,
    ]
 return list
  }, [selectedDoc])

  // Filtered variables based on search and category
 const filteredVariables = useMemo(() => {
 return activeDocVariables.filter((v) => {
 const matchCat =
 variableCategory === 'all'
          ? true
          : variableCategory === 'doc'
            ? v.category === 'quotation' || v.category === 'invoice'
            : v.category === variableCategory

 const query = variableSearch.trim().toLowerCase()
 const matchSearch =
        !query ||
 v.tag.toLowerCase().includes(query) ||
 v.name.toLowerCase().includes(query) ||
 v.description.toLowerCase().includes(query) ||
 v.example.toLowerCase().includes(query)

 return matchCat && matchSearch
    })
  }, [activeDocVariables, variableCategory, variableSearch])

  // Current communication templates
 const currentEmailSubject =
 langMode === 'bengali'
      ? activeTpl.email_subject_template_bn || (selectedDoc === 'quotation' ? 'বাণিজ্যিক কোটেশন #{{quotation_number}} - {{company_name}} [৳ {{grand_total}}]' : 'বাণিজ্যিক ইনভয়েস #{{invoice_number}} - {{company_name}} [বকেয়া: ৳ {{due_amount}}]')
      : activeTpl.email_subject_template || (selectedDoc === 'quotation' ? 'Official Quotation #{{quotation_number}} from {{company_name}} [৳ {{grand_total}}]' : 'Commercial Sales Invoice #{{invoice_number}} from {{company_name}} [Due: ৳ {{due_amount}}]')

 const currentEmailBody =
 langMode === 'bengali'
      ? activeTpl.email_body_template_bn || (selectedDoc === 'quotation' ? '<p>প্রিয় <strong>{{customer_name}}</strong>,</p><p>আমাদের সাথে যোগাযোগের জন্য ধন্যবাদ। বিস্তারিত কোটেশন পত্রটি এই ইমেইলের সাথে পিডিএফ (PDF) হিসেবে সংযুক্ত করা হলো।</p><p><a href="{{document_link}}">কোটেশন বিস্তারিত দেখুন ও অনুমোদন দিন</a></p>' : '<p>প্রিয় <strong>{{customer_name}}</strong>,</p><p>আপনার কাজের জন্য বিক্রয় চালান বিল <strong>#{{invoice_number}}</strong> প্রস্তুত করা হয়েছে। বিস্তারিত ইনভয়েস পিডিএফ ফাইল সংযুক্ত করা হলো।</p>')
      : activeTpl.email_body_template || (selectedDoc === 'quotation' ? '<p>Dear <strong>{{customer_name}}</strong>,</p><p>Thank you for reaching out. Please find attached our official price proposal for your requested print items.</p><p><a href="{{document_link}}">View & Approve Quotation Online</a></p>' : '<p>Dear <strong>{{customer_name}}</strong>,</p><p>We have generated Invoice <strong>#{{invoice_number}}</strong> for your recent print production.</p>')

 const currentWhatsappText =
 langMode === 'bengali'
      ? activeTpl.whatsapp_template_bn || (selectedDoc === 'quotation' ? '*বাণিজ্যিক দরপত্র (কোটেশন) - {{company_name}}*\n\nপ্রিয় {{customer_name}},\nআপনার কোটেশন বিবরণ:\n📄 কোটেশন নং: #{{quotation_number}}\n💵 সর্বমোট বিল: ৳ {{grand_total}}\n🔗 লিংক: {{document_link}}' : '*বাণিজ্যিক বিক্রয় চালান বিল - {{company_name}}*\n\nপ্রিয় {{customer_name}},\n📄 ইনভয়েস নং: #{{invoice_number}}\n💰 সর্বমোট বিল: ৳ {{grand_total}}\n⚠️ বকেয়া: ৳ {{due_amount}}\n🔗 লিংক: {{document_link}}')
      : activeTpl.whatsapp_template || (selectedDoc === 'quotation' ? '*OFFICIAL QUOTATION - {{company_name}}*\n\nDear {{customer_name}},\n📄 Quotation No: #{{quotation_number}}\n💵 Grand Total: ৳ {{grand_total}}\n🔗 View & Approve: {{document_link}}' : '*COMMERCIAL INVOICE - {{company_name}}*\n\nDear {{customer_name}},\n📄 Invoice No: #{{invoice_number}}\n💰 Grand Total: ৳ {{grand_total}}\n⚠️ Due: ৳ {{due_amount}}\n🔗 Download: {{document_link}}')

  // Rendered Live Interpolations for Preview
 const liveSubject = interpolateVariables(currentEmailSubject, sampleVariables)
 const liveEmailHtml = interpolateVariables(currentEmailBody, sampleVariables)
 const liveWhatsapp = interpolateVariables(currentWhatsappText, sampleVariables)

 const availableVariables = [
    { tag: '{{customer_name}}', desc: 'Customer Name' },
    { tag: '{{company_name}}', desc: 'Your Company' },
    { tag: selectedDoc === 'quotation' ? '{{quotation_number}}' : '{{invoice_number}}', desc: 'Doc Number' },
    { tag: '{{grand_total}}', desc: 'Total Amount' },
    { tag: '{{due_amount}}', desc: 'Due Amount' },
    { tag: '{{paid_amount}}', desc: 'Paid Amount' },
    { tag: '{{date}}', desc: 'Doc Date' },
    { tag: '{{valid_until}}', desc: 'Validity Period' },
    { tag: '{{items_summary}}', desc: 'Item Breakdown' },
    { tag: '{{document_link}}', desc: 'Online Approval / View Link' },
  ]

 if (!mounted) {
 return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-full"/>
        <div className="h-12 bg-muted rounded-xl w-3/4"/>
        <div className="h-96 bg-muted rounded-xl w-full"/>
      </div>
    )
  }

 return (
    <div className="space-y-6 print:max-w-none print:m-0 print:p-0">
      {/* Non-Print Action Bar */}
      <div className="print:hidden space-y-4">
        <PageHeader
 titleEn="Print & SMS Formats"titleBn="ডকুমেন্ট ডিজাইন ও মেসেজ টেমপ্লেট"descriptionEn="Customize print layouts, quotation & invoice email subjects, HTML email bodies, WhatsApp messages, and PDF attachments."descriptionBn="প্রিন্ট লেআউট, কোটেশন ও ইনভয়েস পিডিএফ স্টাইল, ইমেইল বডি এবং হোয়াটসঅ্যাপ নোটিফিকেশন টেমপ্লেট পরিচালনা করুন।"icon={FileText}
 iconColor="text-primary text-primary"actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="border-border bg-card text-foreground hover:bg-muted text-xs cursor-pointer shadow-xs"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {tBilingual('Print Preview', 'প্রিন্ট প্রিভিউ')}
            </Button>
          }
        />

        {/* Notification */}
        {notification && (
          <div className="p-3 bg-success-surface text-success rounded-lg text-xs font-semibold flex items-center gap-2 border border-success-border bg-success-surface text-success border-success-border animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
            <span>{notification}</span>
          </div>
        )}

        {/* Document Selector & Language Switcher Toolbar */}
        <div className="p-3 bg-muted rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Document Types */}
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 touch-scroll w-full sm:w-auto">
            {[
              { id: 'quotation', label: 'Quotation', label_bn: 'দরপত্র' },
              { id: 'invoice', label: 'Sales Invoice', label_bn: 'চালান বিল' },
              { id: 'vat_mushak', label: 'NBR VAT (Mushak 6.3)', label_bn: 'মূসক-৬.৩' },
              { id: 'receipt', label: 'Money Receipt', label_bn: 'মানি রিসিট' },
              { id: 'challan', label: 'Delivery Challan', label_bn: 'ডেলিভারি চালান' },
              { id: 'purchase_order', label: 'Purchase Order', label_bn: 'ক্রয় আদেশ' },
            ].map((doc) => (
              <Button
 key={doc.id}
 size="sm"variant={selectedDoc === doc.id ? 'default' : 'ghost'}
 onClick={() => setSelectedDoc(doc.id as DocumentType)}
 className={`text-xs h-9 sm:h-7 px-3 whitespace-nowrap shrink-0 ${
 selectedDoc === doc.id ? 'bg-primary text-white shadow-xs font-bold' : 'text-muted-foreground '
                }`}
              >
                {tBilingual(doc.label, doc.label_bn)}
              </Button>
            ))}
          </div>

          {/* Language Mode Switcher */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-card p-1 rounded-lg border shrink-0">
            <div className="flex items-center">
              <Languages className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-1"/>
              <span className="text-xs text-muted-foreground mr-2 sm:hidden">Language:</span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { id: 'english', label: 'English' },
                { id: 'bengali', label: 'বাংলা' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLangMode(lang.id as DocumentLanguageMode)}
                  className={`text-xs h-8 sm:h-6 px-3 sm:px-2.5 rounded-md font-bold transition-all cursor-pointer ${
                    langMode === lang.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Controls Sidebar + Live Canvas Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column (Hidden on Print) */}
        <div className="print:hidden space-y-4">
          <Card className="p-4 space-y-4 rounded-xl shadow-xs border-border">
            {/* Control Tabs: PDF Print vs Email / WhatsApp */}
            <div className="flex items-center p-1 bg-muted rounded-xl">
              <button
 type="button"onClick={() => setActiveControlTab('pdf')}
 className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
 activeControlTab === 'pdf'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                {tBilingual('PDF & Print Layout', 'পিডিএফ ও প্রিন্ট লেআউট')}
              </button>
              {(selectedDoc === 'quotation' || selectedDoc === 'invoice') && (
                <button
 type="button"onClick={() => setActiveControlTab('communication')}
 className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
 activeControlTab === 'communication'
                      ? 'bg-card text-primary text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {tBilingual('Email & WhatsApp', 'ইমেইল ও হোয়াটসঅ্যাপ')}
                </button>
              )}
            </div>

            {/* TAB 1: PDF & Print Layout Controls */}
            {activeControlTab === 'pdf' && (
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <Label>বাংলা প্রতিষ্ঠানের নাম (Bengali Company Name)</Label>
                  <Input
 value={activeTpl.company_name_bn || ''}
 onChange={(e) => handleUpdateTemplate({ company_name_bn: e.target.value })}
 placeholder="প্রতিষ্ঠানের নাম"className="h-9 text-xs font-semibold"/>
                </div>

                <div className="space-y-1">
                  <Label>Authorized Signatory Title</Label>
                  <Input
 value={activeTpl.authorized_signatory_title}
 onChange={(e) =>
 handleUpdateTemplate({ authorized_signatory_title: e.target.value })
                    }
 className="h-9 text-xs"/>
                </div>

                <div className="space-y-1">
                  <Label>Footer Terms (English)</Label>
                  <textarea
 rows={3}
 value={activeTpl.footer_terms_en}
 onChange={(e) => handleUpdateTemplate({ footer_terms_en: e.target.value })}
 className="w-full p-2.5 rounded-xl border text-xs bg-card focus:outline-none focus:ring-1 focus:ring-ring"/>
                </div>

                <div className="space-y-1">
                  <Label>শর্তাবলী (বাংলা)</Label>
                  <textarea
 rows={3}
 value={activeTpl.footer_terms_bn}
 onChange={(e) => handleUpdateTemplate({ footer_terms_bn: e.target.value })}
 className="w-full p-2.5 rounded-xl border text-xs bg-card focus:outline-none focus:ring-1 focus:ring-ring"/>
                </div>

                <div className="pt-2 border-t flex justify-between items-center">
                  <Label className="text-xs">Show Company Seal Box</Label>
                  <Button
 size="sm"variant={activeTpl.show_seal_box ? 'default' : 'outline'}
 onClick={() => handleUpdateTemplate({ show_seal_box: !activeTpl.show_seal_box })}
 className="h-7 text-xs px-2.5">
                    {activeTpl.show_seal_box ? 'Enabled' : 'Hidden'}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: Communication Templates Controls (Email Subject, Body, WhatsApp) */}
            {activeControlTab === 'communication' && (
              <div className="space-y-4 text-xs">
                {/* Email Subject Template */}
                <div className="space-y-1.5 p-3 bg-muted rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold flex items-center gap-1.5 text-foreground">
                      <Mail className="h-3.5 w-3.5 text-primary"/>
 Email Subject Template ({langMode === 'bengali' ? 'বাংলা' : 'English'})
                    </Label>
                    <Badge variant="outline"className="text-xs bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive">
 PDF Attached
                    </Badge>
                  </div>
                  <Input
 value={
 langMode === 'bengali'
                        ? activeTpl.email_subject_template_bn || ''
                        : activeTpl.email_subject_template || ''
                    }
 onChange={(e) => {
 if (langMode === 'bengali') {
 handleUpdateTemplate({ email_subject_template_bn: e.target.value })
                      } else {
 handleUpdateTemplate({ email_subject_template: e.target.value })
                      }
                    }}
 placeholder={tBilingual("e.g. Official Quotation #{{quotation_number}} [৳ {{quotation_total}}]", "যেমন: অফিশিয়াল কোটেশন #{{quotation_number}} [৳ {{quotation_total}}]")}className="h-9 text-xs font-medium bg-card"/>
                  {/* Quick-insert tags for Subject */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-xs text-muted-foreground font-medium mr-1">Quick Add:</span>
                    {[
 selectedDoc === 'quotation' ? '{{quotation_number}}' : '{{invoice_number}}',
                      '{{company_name}}',
 selectedDoc === 'quotation' ? '{{quotation_total}}' : '{{invoice_total}}',
                      '{{customer_name}}',
                      ...(selectedDoc === 'invoice' ? ['{{due_amount}}'] : []),
                    ].map((tag) => (
                      <button
 key={tag}
 type="button"onClick={() => handleInsertTag('email_subject', tag)}
 className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-card border border-border text-xs tabular-nums text-foreground hover:border-border hover:text-primary transition-colors"title={`Insert ${tag}`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Body Template */}
                <div className="space-y-1.5 p-3 bg-muted rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold flex items-center gap-1.5 text-foreground">
                      <Code2 className="h-3.5 w-3.5 text-primary"/>
 Email Body Template (HTML Supported)
                    </Label>
                    <span className="text-xs text-muted-foreground">PDF attached automatically</span>
                  </div>
                  <textarea
 rows={6}
 value={
 langMode === 'bengali'
                        ? activeTpl.email_body_template_bn || ''
                        : activeTpl.email_body_template || ''
                    }
 onChange={(e) => {
 if (langMode === 'bengali') {
 handleUpdateTemplate({ email_body_template_bn: e.target.value })
                      } else {
 handleUpdateTemplate({ email_body_template: e.target.value })
                      }
                    }}
 placeholder={tBilingual("<p>Dear {{customer_name}},</p><p>Please find attached...</p>", "<p>প্রিয় {{customer_name}},</p><p>অনুগ্রহ করে সংযুক্ত ফাইলটি দেখুন...</p>")}className="w-full p-2.5 rounded-xl border text-xs tabular-nums bg-card focus:outline-none focus:ring-1 focus:ring-ring"/>
                  {/* Quick-insert tags for Email Body */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-xs text-muted-foreground font-medium mr-1">Quick Add:</span>
                    {[
                      '{{customer_name}}',
                      '{{company_name}}',
 selectedDoc === 'quotation' ? '{{quotation_total}}' : '{{invoice_total}}',
 selectedDoc === 'quotation' ? '{{quotation_date}}' : '{{invoice_date}}',
                      '{{document_link}}',
                      '{{items_summary}}',
                    ].map((tag) => (
                      <button
 key={tag}
 type="button"onClick={() => handleInsertTag('email_body', tag)}
 className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-card border border-border text-xs tabular-nums text-foreground hover:border-border hover:text-primary transition-colors"title={`Insert ${tag}`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* WhatsApp Message Template */}
                <div className="space-y-1.5 p-3 bg-muted rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold flex items-center gap-1.5 text-success text-success">
                      <MessageSquare className="h-3.5 w-3.5"/>
 WhatsApp Message Template ({langMode === 'bengali' ? 'বাংলা' : 'English'})
                    </Label>
                    <span className="text-xs text-muted-foreground">*bold* _italic_</span>
                  </div>
                  <textarea
 rows={6}
 value={
 langMode === 'bengali'
                        ? activeTpl.whatsapp_template_bn || ''
                        : activeTpl.whatsapp_template || ''
                    }
 onChange={(e) => {
 if (langMode === 'bengali') {
 handleUpdateTemplate({ whatsapp_template_bn: e.target.value })
                      } else {
 handleUpdateTemplate({ whatsapp_template: e.target.value })
                      }
                    }}
 placeholder={tBilingual("*QUOTATION - {{company_name}}*\nDear {{customer_name}},\nTotal: ৳ {{quotation_total}}...", "*কোটেশন - {{company_name}}*\nপ্রিয় {{customer_name}},\nমোট: ৳ {{quotation_total}}...")}className="w-full p-2.5 rounded-xl border text-xs tabular-nums bg-card focus:outline-none focus:ring-1 focus:ring-ring"/>
                  {/* Quick-insert tags for WhatsApp */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-xs text-muted-foreground font-medium mr-1">Quick Add:</span>
                    {[
                      '{{customer_name}}',
                      '{{company_name}}',
 selectedDoc === 'quotation' ? '{{quotation_total}}' : '{{invoice_total}}',
                      ...(selectedDoc === 'invoice' ? ['{{due_amount}}', '{{payment_status}}'] : []),
                      '{{document_link}}',
                    ].map((tag) => (
                      <button
 key={tag}
 type="button"onClick={() => handleInsertTag('whatsapp', tag)}
 className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-card border border-border text-xs tabular-nums text-foreground hover:border-success-border hover:text-success transition-colors"title={`Insert ${tag}`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* =========================================================================
 VISIBLE AVAILABLE VARIABLES HELPER PANEL
                   ========================================================================= */}
                <div className="p-3.5 rounded-xl bg-muted border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary"/>
                      <span className="font-bold text-xs text-foreground">Available Variables Helper</span>
                    </div>
                    {copiedVar ? (
                      <Badge variant="outline"className="text-xs bg-success-surface text-success border-success-border bg-success-surface text-success">
 Copied {copiedVar}!
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{filteredVariables.length} supported tags</span>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2.5 top-2.5 text-muted-foreground"/>
                    <input
 type="text"value={variableSearch}
 onChange={(e) => setVariableSearch(e.target.value)}
 placeholder={tBilingual('Search variables (e.g. phone, vat, due)...', 'ভ্যারিয়েবল খুঁজুন (যেমন: phone, vat, due)...')}className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-ring text-foreground"/>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'company', label: '🏢 Company' },
                      { id: 'customer', label: '👤 Customer' },
                      { id: 'doc', label: selectedDoc === 'quotation' ? '📄 Quotation' : '📄 Invoice' },
                      { id: 'user', label: '🧑‍💼 User' },
                    ].map((cat) => (
                      <button
 key={cat.id}
 type="button"onClick={() => setVariableCategory(cat.id as any)}
 className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
 variableCategory === cat.id
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-card text-muted-foreground border border-border hover:border-input'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable Variable Items */}
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 touch-scroll">
                    {filteredVariables.map((v) => (
                      <div
 key={v.tag}
 className="p-2 rounded-xl bg-card border border-border hover:border-primary/20 dark:hover:border-border transition-colors flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="tabular-nums font-bold text-primary text-primary text-xs">
                              {v.tag}
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              {v.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate"title={v.description}>
                            {v.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
 type="button"onClick={() => copyToClipboard(v.tag)}
 className="p-1 rounded bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors"title="Copy variable tag">
                            <Copy className="h-3 w-3"/>
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredVariables.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-xs">
 {tBilingual('No supported variables found matching', 'মিলছে এমন কোনো ভ্যারিয়েবল পাওয়া যায়নি')} &ldquo;{variableSearch}&rdquo;.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* =========================================================================
 LIVE PREVIEW CANVAS (PDF PRINT vs EMAIL vs WHATSAPP vs VARIABLES GUIDE)
           ========================================================================= */}
        <div className="lg:col-span-2 print:col-span-3 print:w-full overflow-x-auto print:overflow-visible space-y-3">
          {/* Live Preview Mode Switcher */}
          <div className="print:hidden flex items-center justify-between p-2 bg-muted rounded-xl border">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 pl-1">
              <Eye className="h-3.5 w-3.5 text-primary" />
              {tBilingual('Live Output Preview:', 'লাইভ আউটপুট প্রিভিউ:')}
            </span>
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setPreviewMode('pdf')}
                className={`text-xs h-7 px-3 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  previewMode === 'pdf'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/70'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                {tBilingual('PDF Document', 'পিডিএফ ডকুমেন্ট')}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('email')}
                className={`text-xs h-7 px-3 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  previewMode === 'email'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/70'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                {tBilingual('Email View', 'ইমেইল প্রিভিউ')}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('whatsapp')}
                className={`text-xs h-7 px-3 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  previewMode === 'whatsapp'
                    ? 'bg-success text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/70'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {tBilingual('WhatsApp', 'হোয়াটসঅ্যাপ')}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('variables')}
                className={`text-xs h-7 px-3 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  previewMode === 'variables'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/70'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {tBilingual('Variables Guide', 'ভ্যারিয়েবল গাইড')}
              </button>
            </div>
          </div>

          {/* VIEW 1: PRINTABLE PDF DOCUMENT CANVAS */}
          {previewMode === 'pdf' && (
            <div className="bg-card text-foreground print:bg-white print:text-foreground print: print: p-4 sm:p-8 lg:p-12 rounded-xl border border-border shadow-xs print:border-none print:shadow-none print:p-0 text-xs space-y-6 min-w-[300px] print:min-w-full">
              {/* Document Header */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-border print:border-border">
                <h1 className="text-lg sm:text-xl font-black tracking-tight print:text-foreground">
                  {langMode === 'bengali'
                    ? activeTpl.company_name_bn || company?.name_bn || company?.name || 'প্রতিষ্ঠানের নাম'
                    : company?.name || 'Company Name'}
                </h1>

                <p className="text-muted-foreground print:text-muted-foreground text-xs">
                  {company?.address || 'Company Address'} • Phone: {company?.phone || 'Phone Number'} • Email: {company?.email || 'billing@company.com'}
                </p>

                {/* NBR Tax Credentials */}
                <div className="pt-1 text-xs tabular-nums text-muted-foreground print:text-muted-foreground flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <span>BIN: <strong className="print:text-foreground">{taxSettings.bin_number || '18291004821'}</strong></span>
                  <span>•</span>
                  <span>TIN: <strong className="print:text-foreground">{taxSettings.tin_number || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Trade License: <strong className="print:text-foreground">{taxSettings.trade_license_number || 'N/A'}</strong></span>
                </div>

                {/* Document Banner */}
                <div className="inline-block mt-3 px-4 sm:px-6 py-1 rounded-full bg-muted print:bg-muted font-black text-xs sm:text-xs tracking-wider uppercase border border-input print:border-input print:text-foreground">
                  {selectedDoc === 'quotation' && (langMode === 'bengali' ? 'আনুষ্ঠানিক বাণিজ্যিক দরপত্র' : 'COMMERCIAL QUOTATION')}
                  {selectedDoc === 'invoice' && (langMode === 'bengali' ? 'বাণিজ্যিক বিক্রয় চালান বিল' : 'COMMERCIAL SALES INVOICE')}
                  {selectedDoc === 'vat_mushak' && 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — কর চালানপত্র [মূসক-৬.৩]'}
                  {selectedDoc === 'receipt' && (langMode === 'bengali' ? 'অর্থ প্রাপ্তি মানি রিসিট' : 'OFFICIAL MONEY RECEIPT')}
                  {selectedDoc === 'challan' && (langMode === 'bengali' ? 'মালামাল ডেলিভারি চালানপত্র' : 'DELIVERY CHALLAN')}
                  {selectedDoc === 'purchase_order' && (langMode === 'bengali' ? 'আনুষ্ঠানিক ক্রয় আদেশ' : 'PURCHASE ORDER')}
                </div>
              </div>

              {/* Recipient & Document Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted print:bg-muted border border-border print:border-input text-xs print:text-foreground">
                <div className="space-y-1">
                  <span className="text-xs uppercase font-bold text-muted-foreground print:text-muted-foreground">
                    {langMode === 'bengali' ? 'প্রাপকের বিবরণ:' : 'Customer / Consignee:'}
                  </span>
                  <div className="font-bold text-sm text-foreground print:text-foreground">Metro Advertising Ltd.</div>
                  <div className="text-muted-foreground print:text-foreground">12 Motijheel C/A, Dhaka-1000</div>
                  <div className="text-muted-foreground print:text-muted-foreground tabular-nums text-xs">BIN: 0029104821 • Contact: +880 1711-223344</div>
                </div>

                <div className="space-y-1 sm:text-right tabular-nums print:text-foreground">
                  <div>Document No: <strong className="text-primary print:text-foreground font-black">{selectedDoc === 'quotation' ? 'Q-2026-0842' : 'INV-2026-1055'}</strong></div>
                  <div>Date: <strong className="print:text-foreground">{formatDate(new Date(), locale)}</strong></div>
                  <div>Payment Terms: <strong className="print:text-foreground">Agreed Terms</strong></div>
                  <div>Pricing Mode: <strong className="uppercase print:text-foreground">{taxSettings.pricing_mode}</strong></div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto -mx-1 px-1 print:overflow-visible">
                <table className="w-full text-left border-collapse border border-input print:border-input text-xs tabular-nums print:text-foreground">
                  <thead className="bg-muted print:bg-muted font-bold border-b border-input print:border-input print:text-foreground">
                    <tr>
                      <th className="p-2 border text-center bangla-text">{tBilingual('SL', 'ক্রম')}</th>
                      <th className="p-2 border bangla-text">{tBilingual('Description', 'বিবরণ')}</th>
                      <th className="p-2 border text-center bangla-text">{tBilingual('Qty', 'পরিমাণ')}</th>
                      <th className="p-2 border text-right bangla-text">{tBilingual('Rate', 'দর')}</th>
                      <th className="p-2 border text-right bangla-text">{tBilingual('Total (৳)', 'মোট (৳)')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border text-center">1</td>
                      <td className="p-2 border font-sans font-bold">PVC Flex Vinyl Banner (10x12 ft, Star Frontlit)</td>
                      <td className="p-2 border text-center tabular-nums">120 sqft</td>
                      <td className="p-2 border text-right tabular-nums">৳ 150</td>
                      <td className="p-2 border text-right font-bold tabular-nums">৳ 18,000</td>
                    </tr>
                    <tr>
                      <td className="p-2 border text-center">2</td>
                      <td className="p-2 border font-sans font-bold">Acrylic 3D LED Backlit Channel Letter Signboard</td>
                      <td className="p-2 border text-center tabular-nums">1 Set</td>
                      <td className="p-2 border text-right tabular-nums">৳ 27,500</td>
                      <td className="p-2 border text-right font-bold tabular-nums">৳ 27,500</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="border"/>
                      <td className="p-2 border text-right font-bold">Subtotal:</td>
                      <td className="p-2 border text-right font-bold">৳ 45,500</td>
                    </tr>
                    <tr className="bg-muted print:bg-muted font-black text-sm print:text-foreground">
                      <td colSpan={3} className="border"/>
                      <td className="p-2 border text-right">Net Payable:</td>
                      <td className="p-2 border text-right text-success print:text-foreground font-bold">৳ 45,500</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Terms and Conditions */}
              <div className="p-3 bg-muted print:bg-muted rounded-lg text-xs text-muted-foreground print:text-foreground space-y-1 border border-border print:border-input page-break-inside-avoid print-avoid-break">
                <strong className="block text-foreground print:text-foreground">
                  {langMode === 'bengali' ? 'শর্তাবলী:' : 'Terms & Conditions:'}
                </strong>
                <div className="whitespace-pre-line">
                  {langMode === 'bengali'
                    ? activeTpl.footer_terms_bn
                    : activeTpl.footer_terms_en}
                </div>
              </div>

              {/* Dual Signatures */}
              <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 text-xs print:pt-12 page-break-inside-avoid print-avoid-break">
                <div className="text-center space-y-2 w-full sm:w-auto">
                  <div className="border-t border-input w-full sm:w-48 pt-1 font-bold print:text-foreground">
                    {langMode === 'bengali' ? 'গ্রাহকের স্বাক্ষর' : 'Customer Acceptance'}
                  </div>
                </div>

                <div className="text-center space-y-2 w-full sm:w-auto">
                  <div className="tabular-nums text-muted-foreground print:text-muted-foreground text-xs">{activeTpl.authorized_signatory_title}</div>
                  <div className="border-t border-input w-full sm:w-60 pt-1 font-bold print:text-foreground">
                    {langMode === 'bengali' ? 'অনুমোদিত স্বাক্ষর ও সিল' : 'Authorized Signature & Seal'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: EMAIL PREVIEW */}
          {previewMode === 'email' && (
            <Card className="border-border rounded-xl overflow-hidden shadow-xs">
              <div className="p-3 bg-muted border-b border-border text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-muted-foreground w-16">Subject:</span>
                  <span className="font-bold text-foreground tabular-nums">{liveSubject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-muted-foreground w-16">Attachment:</span>
                  <Badge variant="outline"className="text-xs bg-danger-surface text-destructive border-danger-border tabular-nums">
                    <FileText className="h-3 w-3 mr-1"/>
                    {selectedDoc === 'quotation' ? 'Quotation-Q-2026-0842.pdf' : 'Invoice-INV-2026-1055.pdf'} (A4 PDF)
                  </Badge>
                </div>
              </div>
              <div className="p-6 bg-card text-foreground text-sm">
                <div
 className="prose prose-sm dark:prose-invert max-w-none [&_.info-card]:p-3 [&_.info-card]:bg-muted [&_.info-card]: [&_.info-card]:rounded-xl [&_.info-card]:border [&_.info-card]:border-border [&_.info-card]:my-3 [&_.btn]:inline-block [&_.btn]:px-4 [&_.btn]:py-2 [&_.btn]:bg-primary [&_.btn]:text-primary-foreground [&_.btn]:rounded-lg [&_.btn]:font-bold [&_.btn]:no-underline [&_.btn]:my-2"dangerouslySetInnerHTML={{ __html: liveEmailHtml }}
                />
              </div>
            </Card>
          )}

          {/* VIEW 3: WHATSAPP PREVIEW */}
          {previewMode === 'whatsapp' && (
            <Card className="border-border rounded-xl overflow-hidden shadow-xs bg-surface-inset p-4">
              <div className="max-w-md mx-auto bg-card p-4 rounded-xl shadow-sm border border-success-border space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border text-xs font-bold text-success text-success">
                  <MessageSquare className="h-4 w-4"/>
                  <span>WhatsApp Message Preview</span>
                </div>
                <div className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                  {liveWhatsapp}
                </div>
                <div className="text-xs text-right text-muted-foreground pt-1">
                  10:45 AM • Delivered
                </div>
              </div>
            </Card>
          )}

          {/* VIEW 4: VARIABLES REFERENCE GUIDE TABLE */}
          {previewMode === 'variables' && (
            <Card className="border-border rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 bg-muted border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary"/>
 Supported Backend Template Variables
                  </h3>
                  <p className="text-xs text-muted-foreground">
 Click any tag to copy it. All variables are reliably provided and populated by the backend.
                  </p>
                </div>
                <Badge variant="outline"className="text-xs tabular-nums">
                  {activeDocVariables.length} Variables Available
                </Badge>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold uppercase text-xs">
                      <th className="pb-2 tabular-nums bangla-text">{tBilingual('Variable Tag', 'ভ্যারিয়েবল ট্যাগ')}</th>
                      <th className="pb-2 bangla-text">{tBilingual('Name', 'নাম')}</th>
                      <th className="pb-2 bangla-text">{tBilingual('Category', 'ক্যাটাগরি')}</th>
                      <th className="pb-2 bangla-text">{tBilingual('Description', 'বিবরণ')}</th>
                      <th className="pb-2 tabular-nums bangla-text">{tBilingual('Example / Live Value', 'উদাহরণ / মান')}</th>
                      <th className="pb-2 text-right bangla-text">{tBilingual('Action', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border/60">
                    {activeDocVariables.map((v) => (
                      <tr key={v.tag} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 tabular-nums font-bold text-primary text-primary">
                          {v.tag}
                        </td>
                        <td className="py-2.5 font-semibold text-foreground">
                          {v.name}
                        </td>
                        <td className="py-2.5">
                          <span className="capitalize px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                            {v.category}
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {v.description}
                        </td>
                        <td className="py-2.5 tabular-nums text-foreground">
                          {sampleVariables[v.tag.replace(/[{}]/g, '')] || v.example}
                        </td>
                        <td className="py-2.5 text-right">
                          <Button
 size="sm"variant="outline"onClick={() => copyToClipboard(v.tag)}
 className="h-6 text-xs px-2">
                            <Copy className="h-2.5 w-2.5 mr-1"/>
 Copy
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

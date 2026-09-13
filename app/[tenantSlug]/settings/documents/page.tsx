'use client'

import React, { useState } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatters'
import {
  DEMO_DOCUMENT_TEMPLATES,
  DEFAULT_TAX_SETTINGS,
} from '@/services/tax-and-docs.service'
import {
  DocumentType,
  DocumentLanguageMode,
  DocumentTemplateConfigRecord,
  CompanyTaxSettingsRecord,
} from '@/types/tax-and-docs.types'
import { CommunicationTemplateService } from '@/services/communication-templates.service'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

export default function DocumentDesignerPage() {
  const { company } = useTenant()
  const { locale } = useI18n()
  const slug = company?.slug || 'my-company'

  const [selectedDoc, setSelectedDoc] = useState<DocumentType>('quotation')
  const [langMode, setLangMode] = useState<DocumentLanguageMode>('bengali')
  const [activeControlTab, setActiveControlTab] = useState<'pdf' | 'communication'>('pdf')
  const [previewMode, setPreviewMode] = useState<'pdf' | 'email' | 'whatsapp'>('pdf')
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  const [templates, setTemplates] = useDataStore<Record<DocumentType, DocumentTemplateConfigRecord>>(
    STORAGE_KEYS.DOCUMENT_TEMPLATES,
    DEMO_DOCUMENT_TEMPLATES
  )
  const [taxSettings] = useDataStore<CompanyTaxSettingsRecord>(
    STORAGE_KEYS.TAX_SETTINGS,
    DEFAULT_TAX_SETTINGS
  )
  const [notification, setNotification] = useState<string | null>(null)

  const activeTpl = templates[selectedDoc] || DEMO_DOCUMENT_TEMPLATES[selectedDoc]

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

  // Sample variables for live rendering preview
  const sampleVariables: Record<string, string> = {
    customer_name: 'Metro Advertising Ltd.',
    customer_company: 'Metro Media Group',
    customer_phone: '+880 1711-223344',
    company_name: company?.name || 'Vision Sign BD',
    quotation_number: 'Q-2026-0842',
    invoice_number: 'INV-2026-1055',
    grand_total: '45,500',
    total_amount: '45,500',
    subtotal: '42,000',
    discount_amount: '0',
    vat_amount: '3,500',
    paid_amount: '20,000',
    due_amount: '25,500',
    date: new Date().toISOString().split('T')[0],
    invoice_date: new Date().toISOString().split('T')[0],
    valid_until: '15 days from issuance',
    due_date: 'Due Upon Receipt',
    items_summary: '• PVC Flex Vinyl Banner (120 sqft) - ৳ 18,000\n• Acrylic LED 3D Letter Signboard (1 set) - ৳ 27,500',
    document_link: `https://printerp.app/${slug}/${selectedDoc === 'quotation' ? 'quotations' : 'billing'}/sample-preview`,
  }

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
  const liveSubject = CommunicationTemplateService.interpolate(currentEmailSubject, sampleVariables)
  const liveEmailHtml = CommunicationTemplateService.interpolate(currentEmailBody, sampleVariables)
  const liveWhatsapp = CommunicationTemplateService.interpolate(currentWhatsappText, sampleVariables)

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

  return (
    <div className="space-y-6 max-w-6xl print:max-w-none print:m-0 print:p-0">
      {/* Non-Print Action Bar */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${slug}/settings`}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                <FileText className="h-6 w-6 text-blue-600" />
                Document Studio &amp; Message Templates
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Customize print layouts, quotation &amp; invoice email subjects, HTML email bodies, WhatsApp messages, and PDF attachments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-xs text-white"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Preview
            </Button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Document Selector & Language Switcher Toolbar */}
        <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Document Types */}
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 touch-scroll w-full sm:w-auto">
            {[
              { id: 'quotation', label: 'Quotation (দরপত্র)' },
              { id: 'invoice', label: 'Sales Invoice (চালান বিল)' },
              { id: 'vat_mushak', label: 'NBR VAT (মূসক-৬.৩)' },
              { id: 'receipt', label: 'Receipt (মানি রিসিট)' },
              { id: 'challan', label: 'Challan (ডেলিভারি)' },
              { id: 'purchase_order', label: 'PO (ক্রয় আদেশ)' },
            ].map((doc) => (
              <Button
                key={doc.id}
                size="sm"
                variant={selectedDoc === doc.id ? 'default' : 'ghost'}
                onClick={() => setSelectedDoc(doc.id as DocumentType)}
                className={`text-xs h-9 sm:h-7 px-3 whitespace-nowrap shrink-0 ${
                  selectedDoc === doc.id ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {doc.label}
              </Button>
            ))}
          </div>

          {/* Language Mode Switcher */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-white dark:bg-slate-950 p-1 rounded-lg border shrink-0">
            <div className="flex items-center">
              <Languages className="h-3.5 w-3.5 text-slate-400 ml-1.5 mr-1" />
              <span className="text-[11px] text-slate-500 mr-2 sm:hidden">Language:</span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { id: 'english', label: 'English' },
                { id: 'bengali', label: 'বাংলা' },
              ].map((lang) => (
                <Button
                  key={lang.id}
                  size="sm"
                  variant={langMode === lang.id ? 'default' : 'ghost'}
                  onClick={() => setLangMode(lang.id as DocumentLanguageMode)}
                  className={`text-xs h-8 sm:h-6 px-3 sm:px-2.5 font-bold ${
                    langMode === lang.id ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {lang.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Controls Sidebar + Live Canvas Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column (Hidden on Print) */}
        <div className="print:hidden space-y-4">
          <Card className="p-4 space-y-4 rounded-2xl shadow-xs border-slate-200 dark:border-slate-800">
            {/* Control Tabs: PDF Print vs Email / WhatsApp */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveControlTab('pdf')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeControlTab === 'pdf'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                PDF &amp; Print Layout
              </button>
              {(selectedDoc === 'quotation' || selectedDoc === 'invoice') && (
                <button
                  type="button"
                  onClick={() => setActiveControlTab('communication')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeControlTab === 'communication'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email &amp; WhatsApp
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
                    placeholder="প্রতিষ্ঠানের নাম"
                    className="h-9 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Authorized Signatory Title</Label>
                  <Input
                    value={activeTpl.authorized_signatory_title}
                    onChange={(e) =>
                      handleUpdateTemplate({ authorized_signatory_title: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Footer Terms (English)</Label>
                  <textarea
                    rows={3}
                    value={activeTpl.footer_terms_en}
                    onChange={(e) => handleUpdateTemplate({ footer_terms_en: e.target.value })}
                    className="w-full p-2.5 rounded-xl border text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label>শর্তাবলী (বাংলা)</Label>
                  <textarea
                    rows={3}
                    value={activeTpl.footer_terms_bn}
                    onChange={(e) => handleUpdateTemplate({ footer_terms_bn: e.target.value })}
                    className="w-full p-2.5 rounded-xl border text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 border-t flex justify-between items-center">
                  <Label className="text-xs">Show Company Seal Box</Label>
                  <Button
                    size="sm"
                    variant={activeTpl.show_seal_box ? 'default' : 'outline'}
                    onClick={() => handleUpdateTemplate({ show_seal_box: !activeTpl.show_seal_box })}
                    className="h-7 text-xs px-2.5"
                  >
                    {activeTpl.show_seal_box ? 'Enabled' : 'Hidden'}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: Communication Templates Controls (Email Subject, Body, WhatsApp) */}
            {activeControlTab === 'communication' && (
              <div className="space-y-4 text-xs">
                {/* Dynamic Variables Pill Box */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>Available Dynamic Variables</span>
                    {copiedVar && <span className="text-emerald-600 font-normal text-[10px]">Copied!</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableVariables.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => copyToClipboard(v.tag)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title={`Click to copy ${v.desc}`}
                      >
                        {v.tag}
                        <Copy className="h-2.5 w-2.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Subject Template */}
                <div className="space-y-1">
                  <Label className="font-bold flex items-center justify-between">
                    <span>Email Subject Template ({langMode === 'bengali' ? 'বাংলা' : 'English'})</span>
                    <Badge variant="outline" className="text-[9px]">
                      PDF Attached
                    </Badge>
                  </Label>
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
                    placeholder="e.g. Official Quotation #{{quotation_number}} [৳ {{grand_total}}]"
                    className="h-9 text-xs font-medium"
                  />
                </div>

                {/* Email Body Template */}
                <div className="space-y-1">
                  <Label className="font-bold">Email Body Template (HTML Supported)</Label>
                  <textarea
                    rows={5}
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
                    placeholder="<p>Dear {{customer_name}},</p><p>Please find attached...</p>"
                    className="w-full p-2.5 rounded-xl border text-xs font-mono bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    The formal PDF document is automatically attached to this email.
                  </p>
                </div>

                {/* WhatsApp Message Template */}
                <div className="space-y-1 pt-2 border-t">
                  <Label className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp Message Template ({langMode === 'bengali' ? 'বাংলা' : 'English'})
                  </Label>
                  <textarea
                    rows={5}
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
                    placeholder="*QUOTATION - {{company_name}}*&#10;Dear {{customer_name}},&#10;Total: ৳ {{grand_total}}..."
                    className="w-full p-2.5 rounded-xl border text-xs font-mono bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Uses WhatsApp formatting (*bold*, _italic_). Includes document approval link.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* =========================================================================
            LIVE PREVIEW CANVAS (PDF PRINT vs EMAIL vs WHATSAPP)
           ========================================================================= */}
        <div className="lg:col-span-2 print:col-span-3 print:w-full overflow-x-auto print:overflow-visible space-y-3">
          {/* Live Preview Mode Switcher */}
          <div className="print:hidden flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pl-1">
              <Eye className="h-3.5 w-3.5 text-blue-600" />
              Live Output Preview:
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={previewMode === 'pdf' ? 'default' : 'ghost'}
                onClick={() => setPreviewMode('pdf')}
                className={`text-xs h-7 px-3 ${previewMode === 'pdf' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600'}`}
              >
                <FileText className="h-3 w-3 mr-1" />
                PDF Document
              </Button>
              <Button
                size="sm"
                variant={previewMode === 'email' ? 'default' : 'ghost'}
                onClick={() => setPreviewMode('email')}
                className={`text-xs h-7 px-3 ${previewMode === 'email' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'}`}
              >
                <Mail className="h-3 w-3 mr-1" />
                Email View
              </Button>
              <Button
                size="sm"
                variant={previewMode === 'whatsapp' ? 'default' : 'ghost'}
                onClick={() => setPreviewMode('whatsapp')}
                className={`text-xs h-7 px-3 ${previewMode === 'whatsapp' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'}`}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* VIEW 1: PRINTABLE PDF DOCUMENT CANVAS */}
          {previewMode === 'pdf' && (
            <div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white print:bg-white print:text-slate-900 print:dark:bg-white print:dark:text-slate-900 p-4 sm:p-8 lg:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0 text-xs space-y-6 min-w-[300px] print:min-w-full">
              {/* Document Header */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-slate-900">
                <h1 className="text-lg sm:text-xl font-black tracking-tight print:text-slate-900">
                  {langMode === 'bengali'
                    ? activeTpl.company_name_bn || company?.name_bn || company?.name || 'প্রতিষ্ঠানের নাম'
                    : company?.name || 'Company Name'}
                </h1>

                <p className="text-slate-500 print:text-slate-600 text-[11px]">
                  {company?.address || 'Company Address'} • Phone: {company?.phone || 'Phone Number'} • Email: {company?.email || 'billing@company.com'}
                </p>

                {/* NBR Tax Credentials */}
                <div className="pt-1 text-[10px] font-mono text-slate-500 print:text-slate-600 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <span>BIN: <strong className="print:text-slate-900">{taxSettings.bin_number || '18291004821'}</strong></span>
                  <span>•</span>
                  <span>TIN: <strong className="print:text-slate-900">{taxSettings.tin_number || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Trade License: <strong className="print:text-slate-900">{taxSettings.trade_license_number || 'N/A'}</strong></span>
                </div>

                {/* Document Banner */}
                <div className="inline-block mt-3 px-4 sm:px-6 py-1 rounded-full bg-slate-100 dark:bg-slate-900 print:bg-slate-100 font-black text-[11px] sm:text-xs tracking-wider uppercase border border-slate-300 dark:border-slate-700 print:border-slate-400 print:text-slate-900">
                  {selectedDoc === 'quotation' && (langMode === 'bengali' ? 'আনুষ্ঠানিক বাণিজ্যিক দরপত্র' : 'COMMERCIAL QUOTATION')}
                  {selectedDoc === 'invoice' && (langMode === 'bengali' ? 'বাণিজ্যিক বিক্রয় চালান বিল' : 'COMMERCIAL SALES INVOICE')}
                  {selectedDoc === 'vat_mushak' && 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — কর চালানপত্র [মূসক-৬.৩]'}
                  {selectedDoc === 'receipt' && (langMode === 'bengali' ? 'অর্থ প্রাপ্তি মানি রিসিট' : 'OFFICIAL MONEY RECEIPT')}
                  {selectedDoc === 'challan' && (langMode === 'bengali' ? 'মালামাল ডেলিভারি চালানপত্র' : 'DELIVERY CHALLAN')}
                  {selectedDoc === 'purchase_order' && (langMode === 'bengali' ? 'আনুষ্ঠানিক ক্রয় আদেশ' : 'PURCHASE ORDER')}
                </div>
              </div>

              {/* Recipient & Document Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300 text-xs print:text-slate-900">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
                    {langMode === 'bengali' ? 'প্রাপকের বিবরণ:' : 'Customer / Consignee:'}
                  </span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white print:text-slate-900">Metro Advertising Ltd.</div>
                  <div className="text-slate-600 dark:text-slate-300 print:text-slate-700">12 Motijheel C/A, Dhaka-1000</div>
                  <div className="text-slate-400 print:text-slate-600 font-mono text-[11px]">BIN: 0029104821 • Contact: +880 1711-223344</div>
                </div>

                <div className="space-y-1 sm:text-right font-mono print:text-slate-900">
                  <div>Document No: <strong className="text-blue-600 print:text-slate-900 font-black">{selectedDoc === 'quotation' ? 'Q-2026-0842' : 'INV-2026-1055'}</strong></div>
                  <div>Date: <strong className="print:text-slate-900">{formatDate(new Date(), locale)}</strong></div>
                  <div>Payment Terms: <strong className="print:text-slate-900">Agreed Terms</strong></div>
                  <div>Pricing Mode: <strong className="uppercase print:text-slate-900">{taxSettings.pricing_mode}</strong></div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto -mx-1 px-1 print:overflow-visible">
                <table className="w-full text-left border-collapse border border-slate-300 dark:border-slate-700 print:border-slate-400 text-xs font-mono print:text-slate-900">
                  <thead className="bg-slate-100 dark:bg-slate-900 print:bg-slate-100 font-bold border-b border-slate-300 dark:border-slate-700 print:border-slate-400 print:text-slate-900">
                    <tr>
                      <th className="p-2 border text-center">SL</th>
                      <th className="p-2 border">Description (বিবরণ)</th>
                      <th className="p-2 border text-center">Qty</th>
                      <th className="p-2 border text-right">Rate</th>
                      <th className="p-2 border text-right">Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border text-center">1</td>
                      <td className="p-2 border font-sans font-bold">PVC Flex Vinyl Banner (10x12 ft, Star Frontlit)</td>
                      <td className="p-2 border text-center font-mono">120 sqft</td>
                      <td className="p-2 border text-right font-mono">৳ 150</td>
                      <td className="p-2 border text-right font-bold font-mono">৳ 18,000</td>
                    </tr>
                    <tr>
                      <td className="p-2 border text-center">2</td>
                      <td className="p-2 border font-sans font-bold">Acrylic 3D LED Backlit Channel Letter Signboard</td>
                      <td className="p-2 border text-center font-mono">1 Set</td>
                      <td className="p-2 border text-right font-mono">৳ 27,500</td>
                      <td className="p-2 border text-right font-bold font-mono">৳ 27,500</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="border" />
                      <td className="p-2 border text-right font-bold">Subtotal:</td>
                      <td className="p-2 border text-right font-bold">৳ 45,500</td>
                    </tr>
                    <tr className="bg-slate-100 dark:bg-slate-900 print:bg-slate-100 font-black text-sm print:text-slate-900">
                      <td colSpan={3} className="border" />
                      <td className="p-2 border text-right">Net Payable:</td>
                      <td className="p-2 border text-right text-emerald-600 print:text-slate-900 font-bold">৳ 45,500</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Terms and Conditions */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 print:bg-slate-50 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-800 space-y-1 border border-slate-200 dark:border-slate-800 print:border-slate-300 page-break-inside-avoid print-avoid-break">
                <strong className="block text-slate-800 dark:text-slate-200 print:text-slate-900">
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
                  <div className="border-t border-slate-400 w-full sm:w-48 pt-1 font-bold print:text-slate-900">
                    {langMode === 'bengali' ? 'গ্রাহকের স্বাক্ষর' : 'Customer Acceptance'}
                  </div>
                </div>

                <div className="text-center space-y-2 w-full sm:w-auto">
                  <div className="font-mono text-slate-400 print:text-slate-600 text-[11px]">{activeTpl.authorized_signatory_title}</div>
                  <div className="border-t border-slate-400 w-full sm:w-60 pt-1 font-bold print:text-slate-900">
                    {langMode === 'bengali' ? 'অনুমোদিত স্বাক্ষর ও সিল' : 'Authorized Signature & Seal'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: EMAIL PREVIEW */}
          {previewMode === 'email' && (
            <Card className="border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-16">Subject:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{liveSubject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-16">Attachment:</span>
                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200 font-mono">
                    <FileText className="h-3 w-3 mr-1" />
                    {selectedDoc === 'quotation' ? 'Quotation-Q-2026-0842.pdf' : 'Invoice-INV-2026-1055.pdf'} (A4 PDF)
                  </Badge>
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none [&_.info-card]:p-3 [&_.info-card]:bg-slate-50 [&_.info-card]:dark:bg-slate-900 [&_.info-card]:rounded-xl [&_.info-card]:border [&_.info-card]:border-slate-200 [&_.info-card]:my-3 [&_.btn]:inline-block [&_.btn]:px-4 [&_.btn]:py-2 [&_.btn]:bg-blue-600 [&_.btn]:text-white [&_.btn]:rounded-lg [&_.btn]:font-bold [&_.btn]:no-underline [&_.btn]:my-2"
                  dangerouslySetInnerHTML={{ __html: liveEmailHtml }}
                />
              </div>
            </Card>
          )}

          {/* VIEW 3: WHATSAPP PREVIEW */}
          {previewMode === 'whatsapp' && (
            <Card className="border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-[#e5ddd5] dark:bg-slate-950 p-4">
              <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <MessageSquare className="h-4 w-4" />
                  <span>WhatsApp Message Preview</span>
                </div>
                <div className="text-xs whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200 leading-relaxed">
                  {liveWhatsapp}
                </div>
                <div className="text-[10px] text-right text-slate-400 pt-1">
                  10:45 AM • Delivered
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

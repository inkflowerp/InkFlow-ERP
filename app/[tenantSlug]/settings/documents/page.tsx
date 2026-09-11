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
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { formatBDT } from '@/lib/formatters'

import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

export default function DocumentDesignerPage() {
  const { company } = useTenant()
  const { locale } = useI18n()
  const slug = company?.slug || 'my-company'

  const [selectedDoc, setSelectedDoc] = useState<DocumentType>('invoice')
  const [langMode, setLangMode] = useState<DocumentLanguageMode>('bengali')
  const [templates, setTemplates] = useDataStore<Record<DocumentType, DocumentTemplateConfigRecord>>(
    STORAGE_KEYS.DOCUMENT_TEMPLATES,
    DEMO_DOCUMENT_TEMPLATES
  )
  const [taxSettings] = useDataStore<CompanyTaxSettingsRecord>(
    STORAGE_KEYS.TAX_SETTINGS,
    DEFAULT_TAX_SETTINGS
  )
  const [notification, setNotification] = useState<string | null>(null)

  const activeTpl = templates[selectedDoc]

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

  return (
    <div className="space-y-6 max-w-6xl print:max-w-none print:m-0 print:p-0">
      {/* Non-Print Action Bar */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${slug}/settings/tax`}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                <FileText className="h-6 w-6 text-blue-600" />
                Document Studio &amp; Layouts
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Customize quotations, invoices, NBR Mushak 6.3, receipts, and delivery challans in English or বাংলা.
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
                  selectedDoc === doc.id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
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

      {/* Grid: Controls Sidebar + Live Printable Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column (Hidden on Print) */}
        <div className="print:hidden space-y-4">
          <Card className="p-4 space-y-3 rounded-2xl">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-blue-600" />
              Template Controls
            </CardTitle>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label>বাংলা প্রতিষ্ঠানের নাম (Bengali Company Name)</Label>
                <Input
                  value={activeTpl.company_name_bn || ''}
                  onChange={(e) => handleUpdateTemplate({ company_name_bn: e.target.value })}
                  className="h-10 sm:h-9 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label>Authorized Signatory Title</Label>
                <Input
                  value={activeTpl.authorized_signatory_title}
                  onChange={(e) =>
                    handleUpdateTemplate({ authorized_signatory_title: e.target.value })
                  }
                  className="h-10 sm:h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label>Footer Terms (English)</Label>
                <textarea
                  rows={3}
                  value={activeTpl.footer_terms_en}
                  onChange={(e) => handleUpdateTemplate({ footer_terms_en: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label>শর্তাবলী (বাংলা)</Label>
                <textarea
                  rows={3}
                  value={activeTpl.footer_terms_bn}
                  onChange={(e) => handleUpdateTemplate({ footer_terms_bn: e.target.value })}
                  className="w-full p-2.5 rounded-xl border text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="pt-2 border-t flex justify-between items-center">
                <Label className="text-xs">Show Company Seal Box</Label>
                <Button
                  size="sm"
                  variant={activeTpl.show_seal_box ? 'default' : 'outline'}
                  onClick={() => handleUpdateTemplate({ show_seal_box: !activeTpl.show_seal_box })}
                  className="h-8 sm:h-6 text-xs sm:text-[10px] px-3 sm:px-2"
                >
                  {activeTpl.show_seal_box ? 'Enabled' : 'Hidden'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* =========================================================================
            LIVE PRINTABLE DOCUMENT PREVIEW CANVAS
           ========================================================================= */}
        <div className="lg:col-span-2 overflow-x-auto">
          <div className="bg-white dark:bg-slate-950 p-4 sm:p-8 lg:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0 text-xs text-slate-900 dark:text-white space-y-6 min-w-[300px]">
            {/* Document Header */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100">
              {/* English & Bengali Company Name */}
              <h1 className="text-lg sm:text-xl font-black tracking-tight">
                {langMode === 'bengali'
                  ? activeTpl.company_name_bn || company?.name_bn || company?.name || 'প্রতিষ্ঠানের নাম'
                  : company?.name || 'Company Name'}
              </h1>

              <p className="text-slate-500 text-[11px]">
                {company?.address || 'Company Address'} • Phone: {company?.phone || 'Phone Number'} • Email: {company?.email || 'billing@company.com'}
              </p>

              {/* NBR Tax Credentials */}
              <div className="pt-1 text-[10px] font-mono text-slate-500 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                <span>BIN: <strong>{taxSettings.bin_number || 'N/A'}</strong></span>
                <span>•</span>
                <span>TIN: <strong>{taxSettings.tin_number || 'N/A'}</strong></span>
                <span>•</span>
                <span>Trade License: <strong>{taxSettings.trade_license_number || 'N/A'}</strong></span>
              </div>

              {/* Document Banner */}
              <div className="inline-block mt-3 px-4 sm:px-6 py-1 rounded-full bg-slate-100 dark:bg-slate-900 font-black text-[11px] sm:text-xs tracking-wider uppercase border border-slate-300 dark:border-slate-700">
                {selectedDoc === 'quotation' && (langMode === 'bengali' ? 'আনুষ্ঠানিক বাণিজ্যিক দরপত্র' : 'COMMERCIAL QUOTATION')}
                {selectedDoc === 'invoice' && (langMode === 'bengali' ? 'বাণিজ্যিক বিক্রয় চালান বিল' : 'COMMERCIAL SALES INVOICE')}
                {selectedDoc === 'vat_mushak' && 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — কর চালানপত্র [মূসক-৬.৩]'}
                {selectedDoc === 'receipt' && (langMode === 'bengali' ? 'অর্থ প্রাপ্তি মানি রিসিট' : 'OFFICIAL MONEY RECEIPT')}
                {selectedDoc === 'challan' && (langMode === 'bengali' ? 'মালামাল ডেলিভারি চালানপত্র' : 'DELIVERY CHALLAN')}
                {selectedDoc === 'purchase_order' && (langMode === 'bengali' ? 'আনুষ্ঠানিক ক্রয় আদেশ' : 'PURCHASE ORDER')}
              </div>
            </div>

            {/* Recipient & Document Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {langMode === 'bengali' ? 'প্রাপকের বিবরণ:' : 'Customer / Consignee:'}
                </span>
                <div className="font-bold text-sm text-slate-900 dark:text-white">[Client / Organization Name]</div>
                <div className="text-slate-600 dark:text-slate-300">[Billing Address & Location]</div>
                <div className="text-slate-400 font-mono text-[11px]">BIN: [Customer BIN] • Contact: [Customer Phone]</div>
              </div>

              <div className="space-y-1 sm:text-right font-mono">
                <div>Document No: <strong className="text-blue-600 font-black">DOC-00001</strong></div>
                <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                <div>Payment Terms: <strong>Agreed Terms</strong></div>
                <div>Pricing Mode: <strong className="uppercase">{taxSettings.pricing_mode}</strong></div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-left border-collapse border border-slate-300 dark:border-slate-700 text-xs font-mono">
                <thead className="bg-slate-100 dark:bg-slate-900 font-bold border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="p-2 border text-center">SL</th>
                    <th className="p-2 border">Description (বিবরণ)</th>
                    <th className="p-2 border text-center">Dimensions</th>
                    <th className="p-2 border text-center">Qty</th>
                    <th className="p-2 border text-right">Rate</th>
                    <th className="p-2 border text-right">Total (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border text-center">1</td>
                    <td className="p-2 border font-sans font-bold">[Item Description / Print Specification]</td>
                    <td className="p-2 border text-center">—</td>
                    <td className="p-2 border text-center">1 Unit</td>
                    <td className="p-2 border text-right">৳ 0</td>
                    <td className="p-2 border text-right font-bold">৳ 0</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="border" />
                    <td className="p-2 border text-right font-bold">Subtotal:</td>
                    <td className="p-2 border text-right font-bold">৳ 0</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="border" />
                    <td className="p-2 border text-right text-blue-600 font-bold">VAT ({taxSettings.default_vat_rate}%):</td>
                    <td className="p-2 border text-right text-blue-600 font-bold">৳ 0</td>
                  </tr>
                  <tr className="bg-slate-100 dark:bg-slate-900 font-black text-sm">
                    <td colSpan={4} className="border" />
                    <td className="p-2 border text-right">Net Payable:</td>
                    <td className="p-2 border text-right text-emerald-600">৳ 0</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Terms and Conditions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <strong className="block text-slate-800 dark:text-slate-200">
                {langMode === 'bengali' ? 'শর্তাবলী:' : 'Terms & Conditions:'}
              </strong>
              <div className="whitespace-pre-line">
                {langMode === 'bengali'
                  ? activeTpl.footer_terms_bn
                  : activeTpl.footer_terms_en}
              </div>
            </div>

            {/* Dual Signatures */}
            <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 text-xs">
              <div className="text-center space-y-2 w-full sm:w-auto">
                <div className="border-t border-slate-400 w-full sm:w-48 pt-1 font-bold">
                  {langMode === 'bengali' ? 'গ্রাহকের স্বাক্ষর' : 'Customer Acceptance'}
                </div>
              </div>

              <div className="text-center space-y-2 w-full sm:w-auto">
                <div className="font-mono text-slate-400 text-[11px]">{activeTpl.authorized_signatory_title}</div>
                <div className="border-t border-slate-400 w-full sm:w-60 pt-1 font-bold">
                  {langMode === 'bengali' ? 'অনুমোদিত স্বাক্ষর ও সিল' : 'Authorized Signature & Seal'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

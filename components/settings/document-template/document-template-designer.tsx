'use client'

import React, { useState, useEffect } from 'react'
import {
  Eye,
  Download,
  CheckCircle2,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import {
  DocumentTypeKey,
  DOCUMENT_TYPE_TABS,
  DocumentTemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
} from '@/types/document-template.types'
import {
  getAllDocumentTemplates,
  saveAllDocumentTemplates,
} from '@/lib/services/document-template.service'
import { TemplateSettingsForm } from './template-settings-form'
import { LiveA4Preview } from './print-a4-preview'

export function DocumentTemplateDesigner() {
  const { company } = useTenant()
  const { tBilingual } = useI18n()

  const [activeDocType, setActiveDocType] = useState<DocumentTypeKey>('quotation')
  const [allTemplates, setAllTemplates] = useState<
    Record<DocumentTypeKey, DocumentTemplateSettings>
  >(DEFAULT_TEMPLATE_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)

  // Load persisted template settings on mount if available in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const loaded = getAllDocumentTemplates(company?.slug)
    setAllTemplates(loaded)
  }, [company?.slug])

  // Current active settings
  const currentSettings = allTemplates[activeDocType] || DEFAULT_TEMPLATE_SETTINGS[activeDocType]

  // Handler for form field updates
  const handleUpdateCurrentSettings = (
    updatedFields: Partial<DocumentTemplateSettings>
  ) => {
    setAllTemplates((prev) => ({
      ...prev,
      [activeDocType]: {
        ...prev[activeDocType],
        ...updatedFields,
        updated_at: new Date().toISOString(),
      },
    }))
  }

  // Save template action
  const handleSaveTemplate = () => {
    setIsSaving(true)
    try {
      saveAllDocumentTemplates(company?.slug, allTemplates)
      setTimeout(() => {
        setIsSaving(false)
        const docName =
          DOCUMENT_TYPE_TABS.find((t) => t.key === activeDocType)?.labelEn ||
          activeDocType
        setSaveSuccessMessage(`${docName} template saved successfully!`)
        setTimeout(() => setSaveSuccessMessage(null), 3500)
      }, 300)
    } catch {
      setIsSaving(false)
    }
  }

  // Print / PDF preview triggers
  const handlePreviewPdf = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const handleDownloadPdf = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  // Sample document options for top header selector
  const sampleDocOptions: { key: DocumentTypeKey; label: string }[] = [
    { key: 'quotation', label: 'Sample Quotation' },
    { key: 'invoice', label: 'Sample Invoice' },
    { key: 'challan', label: 'Sample Delivery Challan' },
    { key: 'receipt', label: 'Sample Payment Receipt' },
    { key: 'purchase_order', label: 'Sample Purchase Order' },
  ]

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {tBilingual('Document Template', 'ডকুমেন্ট টেমপ্লেট')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
            {tBilingual(
              'Customize your quotation, invoice and other document templates.',
              'প্রিন্ট, ডাউনলোড বা কাস্টমারকে পাঠানোর জন্য আপনার কোটেশন ও ইনভয়েস টেমপ্লেট সাজান।'
            )}
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {saveSuccessMessage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success-surface border border-success/30 text-success text-xs font-bold animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Sample Switcher Dropdown */}
          <select
            value={activeDocType}
            onChange={(e) => setActiveDocType(e.target.value as DocumentTypeKey)}
            className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            aria-label="Select document template type"
          >
            {sampleDocOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewPdf}
            className="text-xs font-semibold gap-1.5 cursor-pointer h-9 px-3 bg-card"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview PDF</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="text-xs font-semibold gap-1.5 cursor-pointer h-9 px-3 bg-card"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </Button>
        </div>
      </div>

      {/* 2. DOCUMENT TYPE TABS */}
      <div className="border-b border-border">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none pb-px">
          {DOCUMENT_TYPE_TABS.map((tab) => {
            const isActive = activeDocType === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDocType(tab.key)}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. SPLIT 2-COLUMN WORKSPACE: LEFT = CONFIGURATION, RIGHT = LIVE A4 PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Settings (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <TemplateSettingsForm
            settings={currentSettings}
            onChange={handleUpdateCurrentSettings}
            onSave={handleSaveTemplate}
            isSaving={isSaving}
          />
        </div>

        {/* Right Column: Live A4 Preview (7 cols on lg) */}
        <div className="lg:col-span-7 sticky top-4">
          <LiveA4Preview
            settings={currentSettings}
            activeDocType={activeDocType}
            onDocTypeChange={(newType) => setActiveDocType(newType)}
            companyName={company?.name || 'PrintFlow'}
            companyLogoUrl={company?.logo_url || undefined}
            onPreviewPdf={handlePreviewPdf}
            onDownloadPdf={handleDownloadPdf}
          />
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Printer,
  Download,
  Save,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DocumentTypeKey,
  DOCUMENT_TYPE_TABS,
  DocumentTemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
} from '@/types/document-template.types'
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
    const key = `printflow_doc_designer_templates_${company?.slug || 'default'}`
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        setAllTemplates(JSON.parse(saved))
      }
    } catch {
      // Fallback to default templates
    }
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
    const key = `printflow_doc_designer_templates_${company?.slug || 'default'}`
    try {
      localStorage.setItem(key, JSON.stringify(allTemplates))
      setTimeout(() => {
        setIsSaving(false)
        const docName =
          DOCUMENT_TYPE_TABS.find((t) => t.key === activeDocType)?.labelEn ||
          activeDocType
        setSaveSuccessMessage(`${docName} template saved successfully!`)
        setTimeout(() => setSaveSuccessMessage(null), 3500)
      }, 400)
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

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {tBilingual('Document Template', 'ডকুমেন্ট টেমপ্লেট')}
            </h1>
            <Badge variant="outline" className="text-xs font-bold border-primary/30 text-primary bg-primary/10">
              A4 Designer
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            {tBilingual(
              'Customize how your business documents look when printed, downloaded, or sent to customers.',
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewPdf}
            className="text-xs font-semibold gap-1.5 cursor-pointer h-9 px-3"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Preview PDF</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="text-xs font-semibold gap-1.5 cursor-pointer h-9 px-3"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="text-xs font-bold gap-1.5 cursor-pointer h-9 px-4 bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* 2. DOCUMENT TYPE TABS */}
      <div className="border-b border-border">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-px">
          {DOCUMENT_TYPE_TABS.map((tab) => {
            const isActive = activeDocType === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDocType(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.docCodePrefix.split('-')[0]}
                </span>
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

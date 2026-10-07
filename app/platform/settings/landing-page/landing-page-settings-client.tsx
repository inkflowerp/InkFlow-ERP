'use client'

import React, { useState, useTransition } from 'react'
import {
  Globe,
  Save,
  Send,
  Eye,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Tablet,
  Smartphone,
  Layers,
  Sparkles,
  HelpCircle,
  Search,
  Building2,
  Sliders,
  DollarSign,
  X,
  ExternalLink,
  ArrowLeftRight,
  Megaphone,
} from 'lucide-react'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  saveLandingPageDraftAction,
  publishLandingPageAction,
  resetLandingPageDraftAction,
} from '@/actions/landing-page.actions'
import type {
  LandingPageConfig,
  LandingCompanyConfig,
  LandingFaqItem,
  LandingSectionConfig,
  LandingLanguage,
  LandingTheme,
  ComparisonItemConfig,
} from '@/types/landing-page.types'
import {
  DEFAULT_COMPARISON_CONFIG,
  DEFAULT_COMPANIES_SECTION_CONFIG,
  DEFAULT_FINAL_CTA_CONFIG,
  DEFAULT_LANDING_COMPANIES,
} from '@/lib/marketing/landing-defaults'
import { cn } from '@/lib/utils'

interface SettingsClientProps {
  initialData: {
    draft: LandingPageConfig
    published: LandingPageConfig
    isPublished: boolean
    publishedAt: string | null
    updatedAt: string
  }
}

type TabKey =
  | 'general'
  | 'sections'
  | 'hero'
  | 'comparison'
  | 'companies'
  | 'pricing'
  | 'faq'
  | 'final_cta'
  | 'seo'

export default function LandingPageSettingsClient({ initialData }: SettingsClientProps) {
  const [draft, setDraft] = useState<LandingPageConfig>(() => ({
    ...initialData.draft,
    comparison: initialData.draft.comparison || DEFAULT_COMPARISON_CONFIG,
    companiesSection: initialData.draft.companiesSection || DEFAULT_COMPANIES_SECTION_CONFIG,
    finalCta: initialData.draft.finalCta || DEFAULT_FINAL_CTA_CONFIG,
    companies: initialData.draft.companies?.length ? initialData.draft.companies : DEFAULT_LANDING_COMPANIES,
  }))
  const [activeTab, setActiveTab] = useState<TabKey>('general')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [previewOpen, setPreviewOpen] = useState<boolean>(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  // Edit/Add Company Modal state
  const [companyModalOpen, setCompanyModalOpen] = useState<boolean>(false)
  const [editingCompany, setEditingCompany] = useState<LandingCompanyConfig | null>(null)

  // Edit/Add Comparison Item Modal state
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false)
  const [editingComparison, setEditingComparison] = useState<ComparisonItemConfig | null>(null)

  // Edit/Add FAQ Modal state
  const [faqModalOpen, setFaqModalOpen] = useState<boolean>(false)
  const [editingFaq, setEditingFaq] = useState<LandingFaqItem | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const handleUpdate = (updater: (prev: LandingPageConfig) => LandingPageConfig) => {
    setDraft((prev) => {
      const next = updater(prev)
      setHasUnsavedChanges(true)
      return next
    })
  }

  const handleSaveDraft = () => {
    startTransition(async () => {
      const res = await saveLandingPageDraftAction(draft)
      if (res.success) {
        setHasUnsavedChanges(false)
        showToast('Draft configuration saved successfully.')
      } else {
        showToast(res.error || 'Failed to save draft', 'error')
      }
    })
  }

  const handlePublish = () => {
    startTransition(async () => {
      // First save draft then publish
      await saveLandingPageDraftAction(draft)
      const res = await publishLandingPageAction()
      if (res.success) {
        setHasUnsavedChanges(false)
        showToast('Landing page published to production.')
      } else {
        showToast(res.error || 'Failed to publish landing page', 'error')
      }
    })
  }

  const handleResetToDefault = () => {
    if (!confirm('Are you sure you want to reset all draft settings to system defaults?')) return
    startTransition(async () => {
      const res = await resetLandingPageDraftAction()
      if (res.success) {
        window.location.reload()
      } else {
        showToast('Failed to reset to default', 'error')
      }
    })
  }

  // --- Sections Management ---
  const handleToggleSection = (key: string, enabled: boolean) => {
    handleUpdate((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => (sec.key === key ? { ...sec, enabled } : sec)),
    }))
  }

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    handleUpdate((prev) => {
      const sections = [...prev.sections]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= sections.length) return prev

      const temp = sections[index]
      sections[index] = sections[targetIndex]
      sections[targetIndex] = temp

      // Update sequential orders
      const reordered = sections.map((sec, idx) => ({ ...sec, order: idx + 1 }))
      return { ...prev, sections: reordered }
    })
  }

  // --- Company Management ---
  const handleSaveCompany = (companyData: LandingCompanyConfig) => {
    handleUpdate((prev) => {
      const companies = [...prev.companies]
      const existingIdx = companies.findIndex((c) => c.id === companyData.id)
      if (existingIdx >= 0) {
        companies[existingIdx] = companyData
      } else {
        companies.push({ ...companyData, order: companies.length + 1 })
      }
      return { ...prev, companies }
    })
    setCompanyModalOpen(false)
    setEditingCompany(null)
  }

  const handleDeleteCompany = (id: string) => {
    handleUpdate((prev) => ({
      ...prev,
      companies: prev.companies.filter((c) => c.id !== id),
    }))
  }

  const handleToggleCompanyPublic = (id: string, isPublic: boolean) => {
    handleUpdate((prev) => ({
      ...prev,
      companies: prev.companies.map((c) => (c.id === id ? { ...c, isPublic } : c)),
    }))
  }

  // --- FAQ Management ---
  const handleSaveFaq = (faqData: LandingFaqItem) => {
    handleUpdate((prev) => {
      const faqs = [...prev.faq]
      const existingIdx = faqs.findIndex((f) => f.id === faqData.id)
      if (existingIdx >= 0) {
        faqs[existingIdx] = faqData
      } else {
        faqs.push({ ...faqData, order: faqs.length + 1 })
      }
      return { ...prev, faq: faqs }
    })
    setFaqModalOpen(false)
    setEditingFaq(null)
  }

  const handleDeleteFaq = (id: string) => {
    handleUpdate((prev) => ({
      ...prev,
      faq: prev.faq.filter((f) => f.id !== id),
    }))
  }

  const handleToggleFaqEnabled = (id: string, enabled: boolean) => {
    handleUpdate((prev) => ({
      ...prev,
      faq: prev.faq.map((f) => (f.id === id ? { ...f, enabled } : f)),
    }))
  }

  const handleMoveFaq = (index: number, direction: 'up' | 'down') => {
    handleUpdate((prev) => {
      const faqs = [...prev.faq]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= faqs.length) return prev

      const temp = faqs[index]
      faqs[index] = faqs[targetIndex]
      faqs[targetIndex] = temp

      const reordered = faqs.map((item, idx) => ({ ...item, order: idx + 1 }))
      return { ...prev, faq: reordered }
    })
  }

  // --- Comparison Management ---
  const handleSaveComparisonItem = (itemData: ComparisonItemConfig) => {
    handleUpdate((prev) => {
      const comparison = prev.comparison ? { ...prev.comparison } : { ...DEFAULT_COMPARISON_CONFIG }
      const items = [...(comparison.items || [])]
      const existingIdx = items.findIndex((i) => i.id === itemData.id)
      if (existingIdx >= 0) {
        items[existingIdx] = itemData
      } else {
        items.push(itemData)
      }
      return { ...prev, comparison: { ...comparison, items } }
    })
    setComparisonModalOpen(false)
    setEditingComparison(null)
  }

  const handleDeleteComparisonItem = (id: string) => {
    handleUpdate((prev) => {
      const comparison = prev.comparison ? { ...prev.comparison } : { ...DEFAULT_COMPARISON_CONFIG }
      return {
        ...prev,
        comparison: {
          ...comparison,
          items: (comparison.items || []).filter((i: ComparisonItemConfig) => i.id !== id),
        },
      }
    })
  }

  const handleMoveComparisonItem = (index: number, direction: 'up' | 'down') => {
    handleUpdate((prev) => {
      const comparison = prev.comparison ? { ...prev.comparison } : { ...DEFAULT_COMPARISON_CONFIG }
      const items = [...(comparison.items || [])]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= items.length) return prev

      const temp = items[index]
      items[index] = items[targetIndex]
      items[targetIndex] = temp

      return { ...prev, comparison: { ...comparison, items } }
    })
  }

  const handleResetComparisonToDefaults = () => {
    if (!confirm('Reset all comparison points to system default standards?')) return
    handleUpdate((prev) => ({
      ...prev,
      comparison: DEFAULT_COMPARISON_CONFIG,
    }))
    showToast('Reset comparison points to defaults.')
  }

  const handleResetCompaniesToDefaults = () => {
    if (!confirm('Load recommended Bangladeshi print business logos (Padma, Surma, Jamuna, etc.)?')) return
    handleUpdate((prev) => ({
      ...prev,
      companies: DEFAULT_LANDING_COMPANIES,
      companiesSection: DEFAULT_COMPANIES_SECTION_CONFIG,
    }))
    showToast('Loaded recommended Bangladeshi print shop presets.')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Platform Settings Top Navigation Tabs */}
      <PlatformSettingsNav />

      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              <span>Landing Page Settings</span>
            </h1>
            <span
              className={cn(
                'text-xs px-2.5 py-0.5 rounded-full font-semibold border',
                hasUnsavedChanges
                  ? 'bg-warning-surface text-warning border-warning-surface'
                  : 'bg-success-surface text-success border-success-surface'
              )}
            >
              {hasUnsavedChanges ? 'Unpublished Changes' : 'Published Active'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure copy, workflow sections, trust logos, pricing presentation, and bilingual content.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            className="h-9 px-3 gap-1.5 text-xs font-semibold"
            title="Preview draft landing page"
            aria-label="Preview draft landing page"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            disabled={isPending}
            className="h-9 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Reset draft to system defaults"
            aria-label="Reset draft to system defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="h-9 px-4 gap-1.5 text-xs font-semibold"
            title="Save draft changes"
            aria-label="Save draft changes"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={isPending}
            className="h-9 px-4 gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            title="Publish changes to production"
            aria-label="Publish changes to production"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Publish</span>
          </Button>
        </div>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div
          className={cn(
            'p-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all',
            statusMessage.type === 'success'
              ? 'bg-success-surface text-success border-success-surface'
              : 'bg-destructive/10 text-destructive border-destructive/20'
          )}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-1 pb-px scrollbar-none">
        {[
          { key: 'general', label: 'General', icon: Sliders },
          { key: 'sections', label: 'Sections', icon: Layers },
          { key: 'hero', label: 'Hero', icon: Sparkles },
          { key: 'comparison', label: 'Comparison (Side-by-Side)', icon: ArrowLeftRight },
          { key: 'companies', label: 'Registered Businesses', icon: Building2 },
          { key: 'pricing', label: 'Pricing', icon: DollarSign },
          { key: 'faq', label: 'FAQ', icon: HelpCircle },
          { key: 'final_cta', label: 'Final CTA', icon: Megaphone },
          { key: 'seo', label: 'SEO', icon: Search },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer',
                isActive
                  ? 'border-primary text-primary bg-primary/5 rounded-t-md'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs">
        {/* 1. GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-base font-bold text-foreground">General Landing Page Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control landing page visibility, default language, and presentation theme.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-muted/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-foreground">Landing Page Status</Label>
                  <p className="text-xs text-muted-foreground">
                    When disabled, the root address displays a maintenance notice.
                  </p>
                </div>
                <Switch
                  checked={draft.general.enabled}
                  onCheckedChange={(checked: boolean) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      general: { ...prev.general, enabled: checked },
                    }))
                  }
                  aria-label="Toggle Landing Page Status"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Default Language</Label>
                  <select
                    value={draft.general.defaultLanguage}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        general: {
                          ...prev.general,
                          defaultLanguage: e.target.value as LandingLanguage,
                        },
                      }))
                    }
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    <option value="en">English (Default)</option>
                    <option value="bn">বাংলা (Bengali)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Theme Preference</Label>
                  <select
                    value={draft.general.theme}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        general: { ...prev.general, theme: e.target.value as LandingTheme },
                      }))
                    }
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    <option value="system">System Preference</option>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SECTIONS TAB */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Landing Page Sections</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable, disable, and rearrange the exact sequence of landing page modules.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {draft.sections.map((section, idx) => (
                <div
                  key={section.key}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground tabular-nums w-6">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-foreground">
                        {section.nameEn}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2 font-bangla">
                        ({section.nameBn})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Move Up Button */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move up"
                      aria-label={`Move ${section.nameEn} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                    </button>

                    {/* Move Down Button */}
                    <button
                      type="button"
                      disabled={idx === draft.sections.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move down"
                      aria-label={`Move ${section.nameEn} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                    </button>

                    {/* Toggle Switch */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {section.enabled ? 'ON' : 'OFF'}
                      </span>
                      <Switch
                        checked={section.enabled}
                        onCheckedChange={(checked: boolean) => handleToggleSection(section.key, checked)}
                        aria-label={`Toggle ${section.nameEn}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. HERO TAB */}
        {activeTab === 'hero' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-base font-bold text-foreground">Hero Content (Bilingual)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Minimal copy ensures fast comprehension. Keep text concise and punchy.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Eyebrow (English)</Label>
                  <Input
                    value={draft.hero.eyebrowEn}
                    maxLength={60}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, eyebrowEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Eyebrow (বাংলা)</Label>
                  <Input
                    value={draft.hero.eyebrowBn}
                    maxLength={60}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, eyebrowBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Headline (English)</Label>
                  <Input
                    value={draft.hero.headlineEn}
                    maxLength={90}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, headlineEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Headline (বাংলা)</Label>
                  <Input
                    value={draft.hero.headlineBn}
                    maxLength={90}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, headlineBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-semibold font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Supporting Sentence (English)</Label>
                  <Textarea
                    value={draft.hero.descriptionEn}
                    rows={3}
                    maxLength={200}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, descriptionEn: e.target.value },
                      }))
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Supporting Sentence (বাংলা)</Label>
                  <Textarea
                    value={draft.hero.descriptionBn}
                    rows={3}
                    maxLength={200}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, descriptionBn: e.target.value },
                      }))
                    }
                    className="text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Primary CTA (EN)</Label>
                  <Input
                    value={draft.hero.primaryCtaEn}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, primaryCtaEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Primary CTA (বাংলা)</Label>
                  <Input
                    value={draft.hero.primaryCtaBn}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, primaryCtaBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Primary Link</Label>
                  <Input
                    value={draft.hero.primaryCtaLink}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, primaryCtaLink: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Secondary CTA (EN)</Label>
                  <Input
                    value={draft.hero.secondaryCtaEn}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, secondaryCtaEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Secondary CTA (বাংলা)</Label>
                  <Input
                    value={draft.hero.secondaryCtaBn}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, secondaryCtaBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Secondary Link</Label>
                  <Input
                    value={draft.hero.secondaryCtaLink}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, secondaryCtaLink: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPARISON TAB */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Side-by-Side Comparison Settings
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure direct operational contrasts showing traditional print press chaos vs PrintFlow connected cloud system.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetComparisonToDefaults}
                  className="h-9 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  title="Reset to default comparison points"
                  aria-label="Reset to default comparison points"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset to Standards</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingComparison({
                      id: `cmp-${Date.now()}`,
                      categoryEn: '',
                      categoryBn: '',
                      beforeEn: '',
                      beforeBn: '',
                      afterEn: '',
                      afterBn: '',
                      beforeTagEn: '',
                      beforeTagBn: '',
                      afterTagEn: '',
                      afterTagBn: '',
                    })
                    setComparisonModalOpen(true)
                  }}
                  className="h-9 px-3 gap-1.5 text-xs font-semibold"
                  title="Add new comparison point"
                  aria-label="Add new comparison point"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Comparison Point</span>
                </Button>
              </div>
            </div>

            {/* Section Header Controls */}
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                Section Headlines &amp; Column Headers
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Eyebrow (English)</Label>
                  <Input
                    value={draft.comparison?.eyebrowEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        comparison: { ...prev.comparison, eyebrowEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Eyebrow (বাংলা)</Label>
                  <Input
                    value={draft.comparison?.eyebrowBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        comparison: { ...prev.comparison, eyebrowBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Headline (English)</Label>
                  <Input
                    value={draft.comparison?.headlineEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        comparison: { ...prev.comparison, headlineEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Headline (বাংলা)</Label>
                  <Input
                    value={draft.comparison?.headlineBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        comparison: { ...prev.comparison, headlineBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Subtitle (English)</Label>
                  <Input
                    value={draft.comparison?.descriptionEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        comparison: { ...prev.comparison, descriptionEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Subtitle (বাংলা)</Label>
                  <Input
                    value={draft.comparison?.descriptionBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        comparison: { ...prev.comparison, descriptionBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="space-y-2 p-3 rounded-md border border-destructive/20 bg-destructive/5">
                  <span className="text-xs font-bold text-destructive">Left Column (Without PrintFlow)</span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground">Column Title (EN)</Label>
                    <Input
                      value={draft.comparison?.withoutTitleEn ?? ''}
                      onChange={(e) =>
                        handleUpdate((prev) => ({
                          ...prev,
                          comparison: { ...prev.comparison, withoutTitleEn: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground">Column Title (বাংলা)</Label>
                    <Input
                      value={draft.comparison?.withoutTitleBn ?? ''}
                      onChange={(e) =>
                        handleUpdate((prev) => ({
                          ...prev,
                          comparison: { ...prev.comparison, withoutTitleBn: e.target.value },
                        }))
                      }
                      className="h-8 text-xs font-bangla"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-3 rounded-md border border-success-surface bg-success-surface/10">
                  <span className="text-xs font-bold text-success">Right Column (With PrintFlow)</span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground">Column Title (EN)</Label>
                    <Input
                      value={draft.comparison?.withTitleEn ?? ''}
                      onChange={(e) =>
                        handleUpdate((prev) => ({
                          ...prev,
                          comparison: { ...prev.comparison, withTitleEn: e.target.value },
                        }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground">Column Title (বাংলা)</Label>
                    <Input
                      value={draft.comparison?.withTitleBn ?? ''}
                      onChange={(e) =>
                        handleUpdate((prev) => ({
                          ...prev,
                          comparison: { ...prev.comparison, withTitleBn: e.target.value },
                        }))
                      }
                      className="h-8 text-xs font-bangla"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Items List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                  Comparison Points ({draft.comparison?.items?.length || 0})
                </h3>
              </div>

              {(draft.comparison?.items || []).length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl">
                  <ArrowLeftRight className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h4 className="text-xs font-semibold text-foreground">No comparison items configured</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Click &quot;Reset to Standards&quot; to restore the 6 recommended print industry operational comparison points.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(draft.comparison?.items || []).map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground tabular-nums">
                            #{idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-foreground">
                            {item.categoryEn}
                          </span>
                          <span className="text-xs text-muted-foreground font-bangla">
                            ({item.categoryBn})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-md border border-destructive/20 bg-destructive/5 space-y-1">
                            <div className="flex items-center gap-1.5 text-destructive font-semibold">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span>{item.beforeTagEn || 'Without PrintFlow'}</span>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{item.beforeEn}</p>
                          </div>

                          <div className="p-2.5 rounded-md border border-success-surface bg-success-surface/10 space-y-1">
                            <div className="flex items-center gap-1.5 text-success font-semibold">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              <span>{item.afterTagEn || 'With PrintFlow'}</span>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{item.afterEn}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveComparisonItem(idx, 'up')}
                          className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move up"
                          aria-label={`Move ${item.categoryEn} up`}
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === (draft.comparison?.items?.length || 0) - 1}
                          onClick={() => handleMoveComparisonItem(idx, 'down')}
                          className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move down"
                          aria-label={`Move ${item.categoryEn} down`}
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingComparison(item)
                            setComparisonModalOpen(true)
                          }}
                          className="h-8 px-2.5 text-xs"
                        >
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComparisonItem(item.id)}
                          className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Delete comparison point"
                          aria-label={`Delete ${item.categoryEn}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. REGISTERED COMPANIES TAB */}
        {activeTab === 'companies' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Registered Company Showcase &amp; Carousel</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Display verified Bangladesh print and signage shop logos with continuous smooth auto-scrolling motion.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetCompaniesToDefaults}
                  className="h-9 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  title="Load recommended Bangladeshi print business logos"
                  aria-label="Load recommended Bangladeshi print business logos"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Load BD Presets</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingCompany({
                      id: `comp-${Date.now()}`,
                      name: '',
                      logoUrl: '',
                      city: '',
                      isPublic: true,
                      status: 'active',
                      displayMode: 'logo_name',
                      order: draft.companies.length + 1,
                    })
                    setCompanyModalOpen(true)
                  }}
                  className="h-9 px-3 gap-1.5 text-xs font-semibold"
                  title="Add registered company logo"
                  aria-label="Add registered company logo"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Company</span>
                </Button>
              </div>
            </div>

            {/* Companies Section Configuration Header */}
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                Section Header &amp; Carousel Motion Behavior
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Section Eyebrow (EN)</Label>
                  <Input
                    value={draft.companiesSection?.eyebrowEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        companiesSection: { ...prev.companiesSection, eyebrowEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Section Eyebrow (বাংলা)</Label>
                  <Input
                    value={draft.companiesSection?.eyebrowBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        companiesSection: { ...prev.companiesSection, eyebrowBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Headline (EN)</Label>
                  <Input
                    value={draft.companiesSection?.headlineEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        companiesSection: { ...prev.companiesSection, headlineEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Headline (বাংলা)</Label>
                  <Input
                    value={draft.companiesSection?.headlineBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        companiesSection: { ...prev.companiesSection, headlineBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Subtitle (EN)</Label>
                  <Input
                    value={draft.companiesSection?.descriptionEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        companiesSection: { ...prev.companiesSection, descriptionEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Subtitle (বাংলা)</Label>
                  <Input
                    value={draft.companiesSection?.descriptionBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        companiesSection: { ...prev.companiesSection, descriptionBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={draft.companiesSection?.autoScroll ?? true}
                    onCheckedChange={(checked: boolean) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        companiesSection: { ...prev.companiesSection, autoScroll: checked },
                      }))
                    }
                    id="autoScroll-toggle"
                    aria-label="Toggle logo auto-scroll"
                  />
                  <Label htmlFor="autoScroll-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                    Auto-Scroll Carousel Motion
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Scroll Speed:</Label>
                  <select
                    value={draft.companiesSection?.scrollSpeed ?? 'medium'}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        companiesSection: {
                          ...prev.companiesSection,
                          scrollSpeed: e.target.value as 'slow' | 'medium' | 'fast',
                        },
                      }))
                    }
                    className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="slow">Slow (Subtle &amp; Gentle)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="fast">Fast (Dynamic)</option>
                  </select>
                </div>
              </div>
            </div>

            {draft.companies.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-border rounded-xl">
                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-foreground">No Registered Companies Added</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Click &quot;Load BD Presets&quot; to seed verified print business partner logos (Padma, Surma, Jamuna, Dhaka Color Lab, Prime Sign, etc.).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {draft.companies.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {comp.logoUrl ? (
                        <img
                          src={comp.logoUrl}
                          alt={comp.name}
                          className="h-8 w-8 rounded-md object-contain bg-card border border-border p-1"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {comp.name.substring(0, 2).toUpperCase() || 'CO'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            {comp.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded font-medium border border-border bg-muted">
                            {comp.displayMode === 'logo_name' ? 'Logo + Name' : 'Logo Only'}
                          </span>
                          {comp.city && (
                            <span className="text-xs px-1.5 py-0.5 rounded text-muted-foreground border border-border bg-muted/50">
                              {comp.city}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">Order: {comp.order}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 pr-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {comp.isPublic ? 'Public' : 'Hidden'}
                        </span>
                        <Switch
                          checked={comp.isPublic}
                          onCheckedChange={(checked: boolean) => handleToggleCompanyPublic(comp.id, checked)}
                          aria-label={`Toggle public display for ${comp.name}`}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCompany(comp)
                          setCompanyModalOpen(true)
                        }}
                        className="h-8 px-2.5 text-xs"
                      >
                        Edit
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCompany(comp.id)}
                        className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete company"
                        aria-label={`Delete ${comp.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. PRICING TAB */}
        {activeTab === 'pricing' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-base font-bold text-foreground">Pricing Presentation Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plans, prices, and features remain automatically loaded from your authoritative Supabase subscription system.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-muted/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-foreground">Show Pricing Section</Label>
                  <p className="text-xs text-muted-foreground">
                    Display public plans on the marketing landing page.
                  </p>
                </div>
                <Switch
                  checked={draft.pricing.showPricing}
                  onCheckedChange={(checked: boolean) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      pricing: { ...prev.pricing, showPricing: checked },
                    }))
                  }
                  aria-label="Toggle Pricing Section"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Featured Plan Code</Label>
                  <select
                    value={draft.pricing.featuredPlanCode}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        pricing: { ...prev.pricing, featuredPlanCode: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    <option value="starter">Starter</option>
                    <option value="business">Business (Recommended)</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Section Title (English)</Label>
                  <Input
                    value={draft.pricing.titleEn}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        pricing: { ...prev.pricing, titleEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Section Title (বাংলা)</Label>
                  <Input
                    value={draft.pricing.titleBn}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        pricing: { ...prev.pricing, titleBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Section Subtitle (English)</Label>
                  <Input
                    value={draft.pricing.descriptionEn}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        pricing: { ...prev.pricing, descriptionEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Section Subtitle (বাংলা)</Label>
                  <Input
                    value={draft.pricing.descriptionBn}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        pricing: { ...prev.pricing, descriptionBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. FAQ TAB */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Frequently Asked Questions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Keep questions and answers concise (5–8 core questions recommended).
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingFaq({
                    id: `faq-${Date.now()}`,
                    questionEn: '',
                    questionBn: '',
                    answerEn: '',
                    answerBn: '',
                    enabled: true,
                    order: draft.faq.length + 1,
                  })
                  setFaqModalOpen(true)
                }}
                className="h-9 px-3 gap-1.5 text-xs font-semibold"
                title="Add new FAQ item"
                aria-label="Add new FAQ item"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add FAQ</span>
              </Button>
            </div>

            <div className="space-y-2">
              {draft.faq.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground tabular-nums">
                        #{idx + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                        {item.questionEn}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.answerEn}</p>
                    <p className="text-xs text-muted-foreground/80 font-bangla line-clamp-1">
                      {item.questionBn} — {item.answerBn}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveFaq(idx, 'up')}
                      className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move up"
                      aria-label="Move FAQ up"
                    >
                      <ArrowUp className="h-3 w-3 text-foreground" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === draft.faq.length - 1}
                      onClick={() => handleMoveFaq(idx, 'down')}
                      className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move down"
                      aria-label="Move FAQ down"
                    >
                      <ArrowDown className="h-3 w-3 text-foreground" />
                    </button>

                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(checked: boolean) => handleToggleFaqEnabled(item.id, checked)}
                      aria-label={`Toggle FAQ ${item.questionEn}`}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingFaq(item)
                        setFaqModalOpen(true)
                      }}
                      className="h-8 px-2 text-xs"
                    >
                      Edit
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(item.id)}
                      className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Delete FAQ"
                      aria-label={`Delete FAQ ${item.questionEn}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINAL CTA TAB */}
        {activeTab === 'final_cta' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-base font-bold text-foreground">Final Call to Action (Bilingual)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize bottom conversion banner copy, free trial button, and live demo booking prompts.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Eyebrow (English)</Label>
                  <Input
                    value={draft.finalCta?.eyebrowEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, eyebrowEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Eyebrow (বাংলা)</Label>
                  <Input
                    value={draft.finalCta?.eyebrowBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, eyebrowBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Headline (English)</Label>
                  <Input
                    value={draft.finalCta?.headlineEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, headlineEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Headline (বাংলা)</Label>
                  <Input
                    value={draft.finalCta?.headlineBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, headlineBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-semibold font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Supporting Description (English)</Label>
                  <Textarea
                    rows={3}
                    value={draft.finalCta?.descriptionEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, descriptionEn: e.target.value },
                      }))
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Supporting Description (বাংলা)</Label>
                  <Textarea
                    rows={3}
                    value={draft.finalCta?.descriptionBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, descriptionBn: e.target.value },
                      }))
                    }
                    className="text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Primary CTA (EN)</Label>
                  <Input
                    value={draft.finalCta?.primaryCtaEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, primaryCtaEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Primary CTA (বাংলা)</Label>
                  <Input
                    value={draft.finalCta?.primaryCtaBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, primaryCtaBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Primary Link</Label>
                  <Input
                    value={draft.finalCta?.primaryCtaLink ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, primaryCtaLink: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Secondary CTA (EN)</Label>
                  <Input
                    value={draft.finalCta?.secondaryCtaEn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, secondaryCtaEn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Secondary CTA (বাংলা)</Label>
                  <Input
                    value={draft.finalCta?.secondaryCtaBn ?? ''}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        finalCta: { ...prev.finalCta, secondaryCtaBn: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. SEO TAB */}
        {activeTab === 'seo' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-base font-bold text-foreground">SEO & Metadata</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Essential meta tags for search engines and social link previews.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Meta Title</Label>
                <Input
                  value={draft.seo.metaTitle}
                  maxLength={100}
                  onChange={(e) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      seo: { ...prev.seo, metaTitle: e.target.value },
                    }))
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Meta Description</Label>
                <Textarea
                  value={draft.seo.metaDescription}
                  rows={3}
                  maxLength={250}
                  onChange={(e) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      seo: { ...prev.seo, metaDescription: e.target.value },
                    }))
                  }
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Canonical URL</Label>
                  <Input
                    value={draft.seo.canonicalUrl}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        seo: { ...prev.seo, canonicalUrl: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">OG Image URL</Label>
                  <Input
                    value={draft.seo.ogImageUrl}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        seo: { ...prev.seo, ogImageUrl: e.target.value },
                      }))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT REGISTERED COMPANY */}
      {companyModalOpen && editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {draft.companies.some((c) => c.id === editingCompany.id)
                  ? 'Edit Registered Company'
                  : 'Add Registered Company'}
              </h3>
              <button
                type="button"
                onClick={() => setCompanyModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Company Name</Label>
                <Input
                  value={editingCompany.name}
                  onChange={(e) =>
                    setEditingCompany({ ...editingCompany, name: e.target.value })
                  }
                  placeholder="e.g. ABC Print & Sign"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Logo URL</Label>
                <Input
                  value={editingCompany.logoUrl}
                  onChange={(e) =>
                    setEditingCompany({ ...editingCompany, logoUrl: e.target.value })
                  }
                  placeholder="https://... or /logo.png"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">City / Region</Label>
                  <Input
                    value={editingCompany.city || ''}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, city: e.target.value })
                    }
                    placeholder="e.g. Fakirapool, Dhaka"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Website (Optional)</Label>
                  <Input
                    value={editingCompany.websiteUrl || ''}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, websiteUrl: e.target.value })
                    }
                    placeholder="https://..."
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Display Mode</Label>
                  <select
                    value={editingCompany.displayMode}
                    onChange={(e) =>
                      setEditingCompany({
                        ...editingCompany,
                        displayMode: e.target.value as 'logo_name' | 'logo_only',
                      })
                    }
                    className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="logo_name">Logo + Name</option>
                    <option value="logo_only">Logo Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Order</Label>
                  <Input
                    type="number"
                    value={editingCompany.order}
                    onChange={(e) =>
                      setEditingCompany({
                        ...editingCompany,
                        order: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/40">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-foreground">Public Display</Label>
                  <p className="text-xs text-muted-foreground">Visible on public landing page</p>
                </div>
                <Switch
                  checked={editingCompany.isPublic}
                  onCheckedChange={(checked: boolean) =>
                    setEditingCompany({ ...editingCompany, isPublic: checked })
                  }
                  aria-label="Toggle Public Display"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCompanyModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveCompany(editingCompany)}
                className="h-9 text-xs font-semibold"
              >
                Save Company
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT FAQ */}
      {faqModalOpen && editingFaq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {draft.faq.some((f) => f.id === editingFaq.id) ? 'Edit FAQ Item' : 'Add FAQ Item'}
              </h3>
              <button
                type="button"
                onClick={() => setFaqModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Question (English)</Label>
                <Input
                  value={editingFaq.questionEn}
                  onChange={(e) =>
                    setEditingFaq({ ...editingFaq, questionEn: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Question (বাংলা)</Label>
                <Input
                  value={editingFaq.questionBn}
                  onChange={(e) =>
                    setEditingFaq({ ...editingFaq, questionBn: e.target.value })
                  }
                  className="h-9 text-xs font-bangla"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Answer (English)</Label>
                <Textarea
                  value={editingFaq.answerEn}
                  rows={2}
                  onChange={(e) =>
                    setEditingFaq({ ...editingFaq, answerEn: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Answer (বাংলা)</Label>
                <Textarea
                  value={editingFaq.answerBn}
                  rows={2}
                  onChange={(e) =>
                    setEditingFaq({ ...editingFaq, answerBn: e.target.value })
                  }
                  className="text-xs font-bangla"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFaqModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveFaq(editingFaq)}
                className="h-9 text-xs font-semibold"
              >
                Save FAQ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT COMPARISON POINT */}
      {comparisonModalOpen && editingComparison && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {(draft.comparison?.items || []).some((c) => c.id === editingComparison.id)
                  ? 'Edit Comparison Point'
                  : 'Add Comparison Point'}
              </h3>
              <button
                type="button"
                onClick={() => setComparisonModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category / Operation Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Operational Area (English)</Label>
                  <Input
                    value={editingComparison.categoryEn}
                    onChange={(e) =>
                      setEditingComparison({ ...editingComparison, categoryEn: e.target.value })
                    }
                    placeholder="e.g. Roll Media Inventory"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Operational Area (বাংলা)</Label>
                  <Input
                    value={editingComparison.categoryBn}
                    onChange={(e) =>
                      setEditingComparison({ ...editingComparison, categoryBn: e.target.value })
                    }
                    placeholder="যেমন: রোল স্টক ও কাঁচামাল"
                    className="h-9 text-xs font-bangla"
                  />
                </div>
              </div>

              {/* Without PrintFlow (Before) Box */}
              <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Without PrintFlow (Traditional Pain Point)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Pain Tag (English)</Label>
                    <Input
                      value={editingComparison.beforeTagEn || ''}
                      onChange={(e) =>
                        setEditingComparison({ ...editingComparison, beforeTagEn: e.target.value })
                      }
                      placeholder="e.g. Mid-Job Outages"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Pain Tag (বাংলা)</Label>
                    <Input
                      value={editingComparison.beforeTagBn || ''}
                      onChange={(e) =>
                        setEditingComparison({ ...editingComparison, beforeTagBn: e.target.value })
                      }
                      placeholder="যেমন: মাঝপথে কাজ বন্ধ"
                      className="h-8 text-xs font-bangla"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Problem Description (English)</Label>
                    <Textarea
                      rows={2}
                      value={editingComparison.beforeEn}
                      onChange={(e) =>
                        setEditingComparison({ ...editingComparison, beforeEn: e.target.value })
                      }
                      placeholder="Detailed scenario of what happens without PrintFlow..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Problem Description (বাংলা)</Label>
                    <Textarea
                      rows={2}
                      value={editingComparison.beforeBn}
                      onChange={(e) =>
                        setEditingComparison({ ...editingComparison, beforeBn: e.target.value })
                      }
                      placeholder="সফটওয়্যার ছাড়া কী অসুবিধা হয়..."
                      className="text-xs font-bangla"
                    />
                  </div>
                </div>
              </div>

              {/* With PrintFlow (After) Box */}
              <div className="p-3.5 rounded-lg border border-success-surface bg-success-surface/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-success flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    With PrintFlow (Cloud Solution &amp; Benefit)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Benefit Tag (English)</Label>
                    <Input
                      value={editingComparison.afterTagEn || ''}
                      onChange={(e) =>
                        setEditingComparison({ ...editingComparison, afterTagEn: e.target.value })
                      }
                      placeholder="e.g. Real-Time Roll SFT"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Benefit Tag (বাংলা)</Label>
                    <Input
                      value={editingComparison.afterTagBn || ''}
                      onChange={(e) =>
                        setEditingComparison({ ...editingComparison, afterTagBn: e.target.value })
                      }
                      placeholder="যেমন: লাইভ স্কয়ারফিট স্টক"
                      className="h-8 text-xs font-bangla"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Solution Description (English)</Label>
                    <Textarea
                      rows={2}
                      value={editingComparison.afterEn}
                      onChange={(e) =>
                        setEditingComparison({ ...editingComparison, afterEn: e.target.value })
                      }
                      placeholder="How PrintFlow solves this seamlessly..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Solution Description (বাংলা)</Label>
                    <Textarea
                      rows={2}
                      value={editingComparison.afterBn}
                      onChange={(e) =>
                        setEditingComparison({ ...editingComparison, afterBn: e.target.value })
                      }
                      placeholder="প্রিন্টফ্লো কীভাবে এটি সহজ ও ডিজিটাল করে..."
                      className="text-xs font-bangla"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComparisonModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveComparisonItem(editingComparison)}
                className="h-9 text-xs font-semibold"
              >
                Save Comparison Point
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW DRAWER / FRAME */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col p-2 sm:p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl flex flex-col flex-1 overflow-hidden">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/60">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Draft Landing Page Preview
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  Live View
                </span>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={cn(
                    'p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                    previewDevice === 'desktop'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Desktop View (1200px)"
                  aria-label="Desktop View"
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={cn(
                    'p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                    previewDevice === 'tablet'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Tablet View (768px)"
                  aria-label="Tablet View"
                >
                  <Tablet className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tablet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={cn(
                    'p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                    previewDevice === 'mobile'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Mobile View (375px)"
                  aria-label="Mobile View"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/?preview=true"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline"
                >
                  <span className="hidden sm:inline">Open in new tab</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Close preview"
                  aria-label="Close preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Preview Frame Container */}
            <div className="flex-1 bg-muted/40 overflow-y-auto flex items-start justify-center p-2 sm:p-4">
              <div
                className={cn(
                  'h-full min-h-[600px] bg-background border border-border shadow-md rounded-lg overflow-hidden transition-all duration-300',
                  previewDevice === 'desktop' && 'w-full max-w-6xl',
                  previewDevice === 'tablet' && 'w-[768px]',
                  previewDevice === 'mobile' && 'w-[375px]'
                )}
              >
                <iframe
                  src="/?preview=true"
                  title="PrintFlow Landing Page Preview"
                  className="w-full h-full min-h-[600px] border-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

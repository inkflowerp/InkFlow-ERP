'use client'

import React, { useRef } from 'react'
import {
  FileText,
  Upload,
  RefreshCw,
  Trash2,
  Save,
  Check,
  Sliders,
  LayoutGrid,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  DocumentTemplateSettings,
  DEFAULT_PADDING_CONFIG,
} from '@/types/document-template.types'

interface TemplateSettingsFormProps {
  settings: DocumentTemplateSettings
  onChange: (updated: Partial<DocumentTemplateSettings>) => void
  onSave: () => void
  isSaving?: boolean
}

export function TemplateSettingsForm({
  settings,
  onChange,
  onSave,
  isSaving = false,
}: TemplateSettingsFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // In a browser client, create a local object URL for preview and record metadata
    const objectUrl = URL.createObjectURL(file)
    onChange({
      letterhead_file: {
        name: file.name,
        url: objectUrl,
        size_label: 'A4 • 210 × 297 mm',
        pages: 1,
      },
      use_letterhead: true,
    })
  }

  const handleResetPadding = () => {
    onChange({
      padding_top: DEFAULT_PADDING_CONFIG.top,
      padding_right: DEFAULT_PADDING_CONFIG.right,
      padding_bottom: DEFAULT_PADDING_CONFIG.bottom,
      padding_left: DEFAULT_PADDING_CONFIG.left,
    })
  }

  return (
    <div className="space-y-4">
      {/* 1. GENERAL SETTINGS */}
      <Card className="bg-card border-border shadow-xs">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">
              General Settings
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Template Name */}
            <div className="space-y-1.5">
              <Label htmlFor="template_name" className="text-xs font-semibold text-foreground">
                Template Name
              </Label>
              <Input
                id="template_name"
                value={settings.template_name}
                onChange={(e) => onChange({ template_name: e.target.value })}
                placeholder="Default Quotation (Letterhead)"
                className="h-9 text-xs bg-background border-input text-foreground"
              />
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <Label htmlFor="language_select" className="text-xs font-semibold text-foreground">
                Language
              </Label>
              <select
                id="language_select"
                value={settings.language}
                onChange={(e) =>
                  onChange({
                    language: e.target.value as DocumentTemplateSettings['language'],
                  })
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="english">English</option>
                <option value="bengali">Bengali (বাংলা)</option>
                <option value="bilingual">Bilingual (English + বাংলা)</option>
              </select>
            </div>

            {/* Document Type Selector (Compact 2-Option Pill Selector) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Document Type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ document_type: 'quotation' })}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    settings.document_type === 'quotation'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ${
                      settings.document_type === 'quotation'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40 bg-transparent'
                    }`}
                  >
                    {settings.document_type === 'quotation' && (
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    )}
                  </div>
                  <span>Quotation</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ document_type: 'invoice' })}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    settings.document_type === 'invoice'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ${
                      settings.document_type === 'invoice'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40 bg-transparent'
                    }`}
                  >
                    {settings.document_type === 'invoice' && (
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    )}
                  </div>
                  <span>Invoice</span>
                </button>
              </div>
            </div>

            {/* Page Size */}
            <div className="space-y-1.5">
              <Label htmlFor="page_size_select" className="text-xs font-semibold text-foreground">
                Page Size
              </Label>
              <select
                id="page_size_select"
                value={settings.page_size}
                onChange={(e) =>
                  onChange({
                    page_size: e.target.value as DocumentTemplateSettings['page_size'],
                  })
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="legal">Legal (8.5 × 14 in)</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Orientation
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ orientation: 'portrait' })}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    settings.orientation === 'portrait'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Portrait</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ orientation: 'landscape' })}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    settings.orientation === 'landscape'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Sliders className="h-4 w-4 rotate-90" />
                  <span>Landscape</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. LETTERHEAD SETTINGS */}
      <Card className="bg-card border-border shadow-xs">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">
              Letterhead
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Top Toggle Row */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Use Letterhead</p>
                <p className="text-xs text-muted-foreground">
                  Use your own company letterhead for this template.
                </p>
              </div>
            </div>
            <Switch
              id="letterhead_toggle"
              checked={settings.use_letterhead}
              onCheckedChange={(checked) => onChange({ use_letterhead: checked })}
            />
          </div>

          {settings.use_letterhead && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Upload Dropzone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/60 rounded-xl p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-card border border-border text-primary group-hover:scale-105 transition-transform shrink-0">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      Upload PDF, JPG or PNG
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Recommended: A4 (210 × 297 mm)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 shrink-0 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  Change File
                </Button>
              </div>

              {/* Current File Card with Mini Letterhead Thumbnail */}
              {settings.letterhead_file && (
                <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Miniature A4 Sheet Thumbnail */}
                    <div className="h-11 w-8 rounded-xs border border-border bg-background p-0.5 shadow-2xs flex flex-col justify-between shrink-0 overflow-hidden">
                      <div className="h-2 w-full rounded-2xs bg-primary/40" />
                      <div className="space-y-0.5 px-0.5">
                        <div className="h-0.5 w-3/4 rounded-full bg-muted-foreground/30" />
                        <div className="h-0.5 w-1/2 rounded-full bg-muted-foreground/30" />
                      </div>
                      <div className="h-1.5 w-full rounded-2xs bg-primary/30" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {settings.letterhead_file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {settings.letterhead_file.size_label} • {settings.letterhead_file.pages} page
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                    onClick={() => onChange({ letterhead_file: null })}
                    aria-label="Delete letterhead file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Letterhead Mode & Repeat Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Mode */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Letterhead Mode
                  </Label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="letterhead_mode"
                        checked={settings.letterhead_mode === 'full_page'}
                        onChange={() => onChange({ letterhead_mode: 'full_page' })}
                        className="text-primary focus:ring-ring cursor-pointer"
                      />
                      <span className="font-medium text-foreground">
                        Full Page (Use as background)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="letterhead_mode"
                        checked={settings.letterhead_mode === 'header_footer'}
                        onChange={() => onChange({ letterhead_mode: 'header_footer' })}
                        className="text-primary focus:ring-ring cursor-pointer"
                      />
                      <span className="font-medium text-foreground">
                        Header / Footer Only
                      </span>
                    </label>
                  </div>
                </div>

                {/* Repeat Letterhead */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Repeat Letterhead
                  </Label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="repeat_letterhead"
                        checked={settings.repeat_letterhead === 'every_page'}
                        onChange={() => onChange({ repeat_letterhead: 'every_page' })}
                        className="text-primary focus:ring-ring cursor-pointer"
                      />
                      <span className="font-medium text-foreground">Every Page</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="repeat_letterhead"
                        checked={settings.repeat_letterhead === 'first_page_only'}
                        onChange={() => onChange({ repeat_letterhead: 'first_page_only' })}
                        className="text-primary focus:ring-ring cursor-pointer"
                      />
                      <span className="font-medium text-foreground">First Page Only</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. CONTENT PADDING (SAFE AREA) */}
      <Card className="bg-card border-border shadow-xs">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sliders className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                Content Padding (Safe Area)
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetPadding}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            Set the inner content padding so that your document content does not overlap with the letterhead.
          </p>

          <div className="grid grid-cols-4 gap-2 sm:gap-3 pt-1">
            {/* Top */}
            <div className="space-y-1.5">
              <Label htmlFor="padding_top" className="text-xs font-semibold text-foreground truncate block">
                Padding Top
              </Label>
              <div className="relative">
                <Input
                  id="padding_top"
                  type="number"
                  min="0"
                  max="120"
                  value={settings.padding_top}
                  onChange={(e) => onChange({ padding_top: Number(e.target.value) || 0 })}
                  className="h-9 pr-7 text-xs font-bold tabular-nums bg-background border-input text-foreground text-center"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-1.5">
              <Label htmlFor="padding_right" className="text-xs font-semibold text-foreground truncate block">
                Padding Right
              </Label>
              <div className="relative">
                <Input
                  id="padding_right"
                  type="number"
                  min="0"
                  max="80"
                  value={settings.padding_right}
                  onChange={(e) => onChange({ padding_right: Number(e.target.value) || 0 })}
                  className="h-9 pr-7 text-xs font-bold tabular-nums bg-background border-input text-foreground text-center"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Bottom */}
            <div className="space-y-1.5">
              <Label htmlFor="padding_bottom" className="text-xs font-semibold text-foreground truncate block">
                Padding Bottom
              </Label>
              <div className="relative">
                <Input
                  id="padding_bottom"
                  type="number"
                  min="0"
                  max="120"
                  value={settings.padding_bottom}
                  onChange={(e) => onChange({ padding_bottom: Number(e.target.value) || 0 })}
                  className="h-9 pr-7 text-xs font-bold tabular-nums bg-background border-input text-foreground text-center"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Left */}
            <div className="space-y-1.5">
              <Label htmlFor="padding_left" className="text-xs font-semibold text-foreground truncate block">
                Padding Left
              </Label>
              <div className="relative">
                <Input
                  id="padding_left"
                  type="number"
                  min="0"
                  max="80"
                  value={settings.padding_left}
                  onChange={(e) => onChange({ padding_left: Number(e.target.value) || 0 })}
                  className="h-9 pr-7 text-xs font-bold tabular-nums bg-background border-input text-foreground text-center"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. ITEM DISPLAY MODE */}
      <Card className="bg-card border-border shadow-xs">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">
              Item Display Mode
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="radio"
                name="item_display_mode"
                checked={settings.item_display_mode === 'compact'}
                onChange={() => onChange({ item_display_mode: 'compact' })}
                className="text-primary focus:ring-ring cursor-pointer"
              />
              <span className="font-medium text-foreground">Compact (Single line)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="radio"
                name="item_display_mode"
                checked={settings.item_display_mode === 'detailed'}
                onChange={() => onChange({ item_display_mode: 'detailed' })}
                className="text-primary focus:ring-ring cursor-pointer"
              />
              <span className="font-medium text-foreground">
                Detailed (With specifications)
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 5. OPTIONAL COLLAPSIBLE TERMS & CONDITIONS */}
      <details className="group border border-border rounded-xl bg-card p-4 transition-all">
        <summary className="flex items-center justify-between cursor-pointer font-bold text-xs text-foreground select-none">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Default Document Terms & Conditions</span>
          </div>
          <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="pt-3 space-y-1.5">
          <Textarea
            id="terms_and_conditions"
            rows={5}
            value={settings.terms_and_conditions}
            onChange={(e) => onChange({ terms_and_conditions: e.target.value })}
            placeholder="Enter standard terms, payment milestones, delivery terms..."
            className="text-xs font-mono bg-background border-input text-foreground leading-relaxed resize-y"
          />
        </div>
      </details>

      {/* 6. PRIMARY FULL-WIDTH SAVE BUTTON */}
      <Button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs hover:bg-primary-hover flex items-center justify-center gap-2 cursor-pointer transition-all"
      >
        {isSaving ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Saving Template...</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            <span>Save Template</span>
          </>
        )}
      </Button>
    </div>
  )
}

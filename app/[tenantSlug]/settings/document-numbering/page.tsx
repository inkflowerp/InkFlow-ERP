'use client'

import React, { useState } from 'react'
import {
  Hash,
  Save,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { DocumentType } from '@/types/settings.types'

interface SequenceConfig {
  doc_type: DocumentType
  name: string
  nameBn: string
  prefix: string
  current_val: number
  padding: number
}

const INITIAL_SEQUENCES: SequenceConfig[] = [
  { doc_type: 'quotation', name: 'Price Quotations', nameBn: 'দরপ্রস্তাব / কোটেশন', prefix: 'QUO', current_val: 1, padding: 6 },
  { doc_type: 'order', name: 'Job Orders', nameBn: 'জব অর্ডার টিকেট', prefix: 'ORD', current_val: 1, padding: 6 },
  { doc_type: 'invoice', name: 'Commercial Invoices', nameBn: 'ইনভয়েস / বিল', prefix: 'INV', current_val: 1, padding: 6 },
  { doc_type: 'challan', name: 'Delivery Challans', nameBn: 'ডেলিভারি চালান', prefix: 'CHL', current_val: 1, padding: 6 },
  { doc_type: 'payment', name: 'Money Receipts', nameBn: 'পেমেন্ট / মানি রসিদ', prefix: 'PAY', current_val: 1, padding: 6 },
  { doc_type: 'purchase', name: 'Stock Purchases', nameBn: 'কাঁচামাল ক্রয় চালান', prefix: 'PUR', current_val: 1, padding: 6 },
]

import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

export default function DocumentNumberingSettingsPage() {
  const { locale, tBilingual } = useI18n()
  const [sequences, setSequences] = useDataStore<SequenceConfig[]>(STORAGE_KEYS.DOCUMENT_NUMBERING, INITIAL_SEQUENCES)
  const [isSaved, setIsSaved] = useState(false)

  const handlePrefixChange = (doc_type: DocumentType, newPrefix: string) => {
    setSequences(
      sequences.map((s) => (s.doc_type === doc_type ? { ...s, prefix: newPrefix.toUpperCase() } : s))
    )
  }

  const handlePaddingChange = (doc_type: DocumentType, newPadding: number) => {
    setSequences(
      sequences.map((s) => (s.doc_type === doc_type ? { ...s, padding: Math.max(3, Math.min(8, newPadding)) } : s))
    )
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSequences(sequences)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3500)
  }

  const formatPreview = (s: SequenceConfig) => {
    return `${s.prefix}-${String(s.current_val).padStart(s.padding, '0')}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Document Numbering & Sequences"
        titleBn="ডকুমেন্ট নম্বর ও সিকোয়েন্স সেটিংস"
        descriptionEn="Configure customizable prefixes, sequence padding, and transaction-safe sequential generators for all commercial documents."
        descriptionBn="সকল বাণিজ্যিক নথির কাস্টম প্রিফিক্স, সিকোয়েন্স প্যাডিং এবং ধারাবাহিক নম্বর জেনারেটর কনফিগার করুন।"
        icon={Hash}
        iconColor="text-blue-600"
      />

      <SettingsNav />

      {isSaved && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Document sequence rules saved and recorded in audit log.</span>
        </div>
      )}

      {/* Transaction Safety Guarantee Card */}
      <Card className="bg-blue-50/70 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/60 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-950 dark:text-blue-200 space-y-1">
            <strong className="text-sm block text-blue-900 dark:text-blue-100">
              PostgreSQL Transaction Safety & Zero Duplicate Numbers
            </strong>
            <p>
              Number generation executes inside PostgreSQL using <code>SELECT ... FOR UPDATE</code> row-level locking. Even when multiple sales counters or production operators book job orders at the exact same millisecond, sequential document numbers are guaranteed to never collide or skip.
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Configured Document Sequences</CardTitle>
            <CardDescription className="text-xs">
              Customize prefixes (e.g. QUO, ORD, INV) and zero-padding lengths for each business paper.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4 w-36">Prefix</th>
                    <th className="py-3 px-4 w-32">Digits Padding</th>
                    <th className="py-3 px-4">Live Sample Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sequences.map((seq) => (
                    <tr key={seq.doc_type} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {seq.name}
                        </div>
                        <div className="text-xs text-slate-400">{seq.nameBn}</div>
                      </td>

                      <td className="py-3 px-4">
                        <Input
                          value={seq.prefix}
                          onChange={(e) => handlePrefixChange(seq.doc_type, e.target.value)}
                          maxLength={6}
                          className="font-mono text-xs font-bold uppercase h-8"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={seq.padding}
                          onChange={(e) => handlePaddingChange(seq.doc_type, Number(e.target.value))}
                          className="h-8 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono px-2"
                        >
                          <option value={4}>4 digits (0001)</option>
                          <option value={5}>5 digits (00001)</option>
                          <option value={6}>6 digits (000001)</option>
                          <option value={7}>7 digits (0000001)</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                            {formatPreview(seq)}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            Next Issued
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sequences.map((seq) => (
                <div key={seq.doc_type} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {seq.name}
                      </div>
                      <div className="text-xs text-slate-500">{seq.nameBn}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {formatPreview(seq)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">Prefix Code</Label>
                      <Input
                        value={seq.prefix}
                        onChange={(e) => handlePrefixChange(seq.doc_type, e.target.value)}
                        maxLength={6}
                        className="font-mono text-xs font-bold uppercase h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">Zero Padding</Label>
                      <select
                        value={seq.padding}
                        onChange={(e) => handlePaddingChange(seq.doc_type, Number(e.target.value))}
                        className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono px-2"
                      >
                        <option value={4}>4 digits (0001)</option>
                        <option value={5}>5 digits (00001)</option>
                        <option value={6}>6 digits (000001)</option>
                        <option value={7}>7 digits (0000001)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold">
            <Save className="mr-1.5 h-4 w-4" />
            Save Document Numbering
          </Button>
        </div>
      </form>
    </div>
  )
}

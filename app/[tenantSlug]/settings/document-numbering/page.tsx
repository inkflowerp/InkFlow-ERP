'use client'

import React, { useState, useEffect } from 'react'
import {
 Hash,
 Save,
 CheckCircle2,
 ShieldCheck,
 RotateCcw,
 Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { DocumentType } from '@/types/settings.types'
import { updateCompanySettingsAction } from '@/actions/tenant.actions'

interface SequenceConfig {
 doc_type: DocumentType
 name: string
 nameBn: string
 prefix: string
 current_val: number
 padding: number
}

const INITIAL_SEQUENCES: SequenceConfig[] = [
  { doc_type: 'quotation', name: 'Price Quotations', nameBn: 'মূল্য কোটেশন', prefix: 'QUO', current_val: 1, padding: 6 },
  { doc_type: 'order', name: 'Job Orders', nameBn: 'জব অর্ডার টিকেট', prefix: 'ORD', current_val: 1, padding: 6 },
  { doc_type: 'invoice', name: 'Commercial Invoices', nameBn: 'বাণিজ্যিক ইনভয়েস', prefix: 'INV', current_val: 1, padding: 6 },
  { doc_type: 'challan', name: 'Delivery Challans', nameBn: 'ডেলিভারি চালান', prefix: 'CHL', current_val: 1, padding: 6 },
  { doc_type: 'payment', name: 'Money Receipts', nameBn: 'মানি রসিদ', prefix: 'PAY', current_val: 1, padding: 6 },
  { doc_type: 'purchase', name: 'Stock Purchases', nameBn: 'কাঁচামাল ক্রয় চালান', prefix: 'PUR', current_val: 1, padding: 6 },
]

import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

function normalizeSequences(stored: any, settings?: any): SequenceConfig[] {
 let list: SequenceConfig[] = []
 if (Array.isArray(stored) && stored.length > 0) {
 list = stored
  } else if (stored && typeof stored === 'object' && Array.isArray(stored.sequences) && stored.sequences.length > 0) {
 list = stored.sequences
  } else {
 const obj = (typeof stored === 'object' && stored !== null && !Array.isArray(stored)) ? stored : {}
 list = INITIAL_SEQUENCES.map((def) => {
 let prefix = def.prefix
 if (def.doc_type === 'invoice') prefix = (obj.invoice_prefix || def.prefix).replace(/-$/, '')
 else if (def.doc_type === 'quotation') prefix = (obj.quotation_prefix || def.prefix).replace(/-$/, '')
 else if (def.doc_type === 'challan') prefix = (obj.challan_prefix || def.prefix).replace(/-$/, '')
 else if (def.doc_type === 'order') prefix = (obj.order_prefix || def.prefix).replace(/-$/, '')
 else if (def.doc_type === 'payment') prefix = (obj.money_receipt_prefix || def.prefix).replace(/-$/, '')
 else if (def.doc_type === 'purchase') prefix = (obj.purchase_prefix || def.prefix).replace(/-$/, '')
 return {
        ...def,
 prefix,
 current_val: obj[`seq_${def.doc_type}`] || def.current_val || 1,
 padding: obj[`pad_${def.doc_type}`] || def.padding || 6,
      }
    })
  }

  // Overlay settings from company_settings if present
 return list.map((s) => {
 let prefix = s.prefix
 if (s.doc_type === 'invoice' && settings?.invoice_prefix) {
 prefix = settings.invoice_prefix.replace(/-$/, '')
    } else if (s.doc_type === 'quotation' && settings?.quotation_prefix) {
 prefix = settings.quotation_prefix.replace(/-$/, '')
    } else if (s.doc_type === 'challan' && settings?.challan_prefix) {
 prefix = settings.challan_prefix.replace(/-$/, '')
    }
 return {
      ...s,
 prefix: (prefix || '').toUpperCase(),
 current_val: s.current_val || 1,
 padding: s.padding || 6,
    }
  })
}

export default function DocumentNumberingSettingsPage() {
 const { company, settings, refreshTenant } = useTenant()
 const { locale, tBilingual } = useI18n()
 const [mounted, setMounted] = useState(false)
 const [storeData, setStoreData] = useDataStore<any>(STORAGE_KEYS.DOCUMENT_NUMBERING)
 const [sequences, setSequences] = useState<SequenceConfig[]>(() => normalizeSequences(storeData, settings))
 const [isSaved, setIsSaved] = useState(false)
 const [isLoading, setIsLoading] = useState(false)

 useEffect(() => {
 setMounted(true)
  }, [])

  // Sync with storeData or company_settings on load/change
 useEffect(() => {
 setSequences(normalizeSequences(storeData, settings))
  }, [storeData, settings])

 const handlePrefixChange = (doc_type: DocumentType, newPrefix: string) => {
 setSequences((prev) => {
 const safe = Array.isArray(prev) ? prev : INITIAL_SEQUENCES
 return safe.map((s) => (s.doc_type === doc_type ? { ...s, prefix: newPrefix.toUpperCase() } : s))
    })
  }

 const handlePaddingChange = (doc_type: DocumentType, newPadding: number) => {
 setSequences((prev) => {
 const safe = Array.isArray(prev) ? prev : INITIAL_SEQUENCES
 return safe.map((s) => (s.doc_type === doc_type ? { ...s, padding: Math.max(3, Math.min(8, newPadding)) } : s))
    })
  }

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault()
 setIsLoading(true)
 setIsSaved(false)
 try {
 const safeList = Array.isArray(sequences) ? sequences : INITIAL_SEQUENCES
 const invPrefix = safeList.find((s) => s.doc_type === 'invoice')?.prefix || 'INV'
 const quoPrefix = safeList.find((s) => s.doc_type === 'quotation')?.prefix || 'QUO'
 const chlPrefix = safeList.find((s) => s.doc_type === 'challan')?.prefix || 'CHL'
 const ordPrefix = safeList.find((s) => s.doc_type === 'order')?.prefix || 'ORD'
 const payPrefix = safeList.find((s) => s.doc_type === 'payment')?.prefix || 'PAY'
 const purPrefix = safeList.find((s) => s.doc_type === 'purchase')?.prefix || 'PUR'

 if (company?.id) {
 await updateCompanySettingsAction(company.id, {
 invoice_prefix: `${invPrefix}-`,
 quotation_prefix: `${quoPrefix}-`,
 challan_prefix: `${chlPrefix}-`,
        })
 await refreshTenant()
      }

 const updatedConfig = {
        ...(typeof storeData === 'object' && storeData !== null && !Array.isArray(storeData) ? storeData : {}),
 order_prefix: `${ordPrefix}-`,
 quotation_prefix: `${quoPrefix}-`,
 invoice_prefix: `${invPrefix}-`,
 challan_prefix: `${chlPrefix}-`,
 job_prefix: 'JOB-',
 money_receipt_prefix: `${payPrefix}-`,
 purchase_prefix: `${purPrefix}-`,
 sequences: safeList,
      }
 setStoreData(updatedConfig)
 setIsSaved(true)
 setTimeout(() => setIsSaved(false), 3500)
    } finally {
 setIsLoading(false)
    }
  }

 const formatPreview = (s: SequenceConfig) => {
 return `${s.prefix}-${String(s.current_val || 1).padStart(s.padding || 6, '0')}`
  }

 if (!mounted) {
 return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-full"/>
        <div className="h-12 bg-muted rounded-xl w-3/4"/>
        <div className="h-48 bg-muted rounded-xl w-full"/>
      </div>
    )
  }

 return (
    <div className="space-y-6">
      <PageHeader
 titleEn="Document Numbering & Sequences"titleBn="ডকুমেন্ট নম্বর ও সিকোয়েন্স সেটিংস"descriptionEn="Configure customizable prefixes, sequence padding, and transaction-safe sequential generators for all commercial documents."descriptionBn="সকল বাণিজ্যিক নথির কাস্টম প্রিফিক্স, সিকোয়েন্স প্যাডিং এবং ধারাবাহিক নম্বর জেনারেটর কনফিগার করুন।"icon={Hash}
 iconColor="text-primary"/>

      {isSaved && (
        <div className="p-3 bg-success-surface text-success rounded-lg text-xs font-semibold flex items-center gap-2 border border-success-border bg-success-surface text-success border-success-border animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
          <span>{tBilingual('Document sequence rules saved and recorded in audit log.', 'ডকুমেন্ট সিকোয়েন্স নিয়ম সফলভাবে সংরক্ষিত হয়েছে।')}</span>
        </div>
      )}

      {/* Transaction Safety Guarantee Card */}
      <Card className="bg-primary/10/70 border-primary/20 bg-primary/10 border-border/60 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5"/>
          <div className="text-xs text-primary text-primary space-y-1">
            <strong className="text-sm block text-primary text-primary">
              {tBilingual('PostgreSQL Transaction Safety & Zero Duplicate Numbers', 'পোস্টগ্রিসকুয়েল ট্রানজ্যাকশন নিরাপত্তা ও ডুপ্লিকেটহীন নম্বর')}
            </strong>
            <p>
              {tBilingual(
                'Number generation executes inside PostgreSQL using SELECT ... FOR UPDATE row-level locking. Even when multiple sales counters or production operators book job orders at the exact same millisecond, sequential document numbers are guaranteed to never collide or skip.',
                'পোস্টগ্রিসকুয়েল রো-লেভেল লকিংয়ের মাধ্যমে নম্বর তৈরি হয়। একাধিক কাউন্টার একই সময়ে অর্ডার করলেও কোনো নম্বর ডুপ্লিকেট বা বাদ পড়বে না।'
              )}
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base">{tBilingual('Configured Document Sequences', 'কনফিগার করা ডকুমেন্ট সিকোয়েন্স')}</CardTitle>
            <CardDescription className="text-xs">
              {tBilingual(
                'Customize prefixes (e.g. QUO, ORD, INV) and zero-padding lengths for each business paper.',
                'প্রতিটি ব্যবসায়িক নথির জন্য প্রিফিক্স (যেমন QUO, ORD, INV) এবং ডিজিট প্যাডিং নির্ধারণ করুন।'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4 bangla-text">{tBilingual('Document Type', 'ডকুমেন্টের ধরন')}</th>
                    <th className="py-3 px-4 w-36 bangla-text">{tBilingual('Prefix', 'প্রিফিক্স')}</th>
                    <th className="py-3 px-4 w-32 bangla-text">{tBilingual('Digits Padding', 'ডিজিট প্যাডিং')}</th>
                    <th className="py-3 px-4 bangla-text">{tBilingual('Live Sample Preview', 'লাইভ প্রিভিউ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {(Array.isArray(sequences) ? sequences : INITIAL_SEQUENCES).map((seq) => (
                    <tr key={seq.doc_type} className="hover:bg-muted dark:hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          {locale === 'bn' ? seq.nameBn : seq.name}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Input
 value={seq.prefix}
 onChange={(e) => handlePrefixChange(seq.doc_type, e.target.value)}
 maxLength={6}
 className="tabular-nums text-xs font-bold uppercase h-8"/>
                      </td>

                      <td className="py-3 px-4">
                        <select
 value={seq.padding}
 onChange={(e) => handlePaddingChange(seq.doc_type, Number(e.target.value))}
 className="h-8 w-full rounded-md border border-input bg-card text-xs tabular-nums px-2">
                          <option value={4}>{tBilingual('4 digits (0001)', '৪ ডিজিট (০০০১)')}</option>
                          <option value={5}>{tBilingual('5 digits (00001)', '৫ ডিজিট (০০০০১)')}</option>
                          <option value={6}>{tBilingual('6 digits (000001)', '৬ ডিজিট (০০০০০১)')}</option>
                          <option value={7}>{tBilingual('7 digits (0000001)', '৭ ডিজিট (০০০০০০১)')}</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-bold text-xs px-2.5 py-1 rounded bg-muted text-primary text-primary border border-border">
                            {formatPreview(seq)}
                          </span>
                          <Badge variant="outline"className="text-xs">
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
            <div className="md:hidden divide-y divide-border dark:divide-border">
              {(Array.isArray(sequences) ? sequences : INITIAL_SEQUENCES).map((seq) => (
                <div key={seq.doc_type} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        {locale === 'bn' ? seq.nameBn : seq.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="tabular-nums font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary bg-primary/10 text-primary border border-primary/20 border-border">
                        {formatPreview(seq)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{tBilingual('Prefix Code', 'প্রিফিক্স কোড')}</Label>
                      <Input
 value={seq.prefix}
 onChange={(e) => handlePrefixChange(seq.doc_type, e.target.value)}
 maxLength={6}
 className="tabular-nums text-xs font-bold uppercase h-9"/>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{tBilingual('Zero Padding', 'ডিজিট প্যাডিং')}</Label>
                      <select
 value={seq.padding}
 onChange={(e) => handlePaddingChange(seq.doc_type, Number(e.target.value))}
 className="h-9 w-full rounded-md border border-input bg-card text-xs tabular-nums px-2">
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
          <Button type="submit"isLoading={isLoading} className="bg-primary hover:bg-primary w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold">
            <Save className="mr-1.5 h-4 w-4"/>
            {tBilingual('Save Document Numbering', 'ডকুমেন্ট নাম্বারিং সংরক্ষণ করুন')}
          </Button>
        </div>
      </form>
    </div>
  )
}

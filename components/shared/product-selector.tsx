'use client'

import React, { useState } from 'react'
import { Printer, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export interface ProductTypeOption {
  code: string
  nameEn: string
  nameBn: string
  defaultUnit: string
  category: string
}

const DEFAULT_PRINT_PRODUCTS: ProductTypeOption[] = [
  { code: 'flex_star', nameEn: 'Star Flex Banner (380 GSM)', nameBn: 'স্টার ফ্লেক্স ব্যানার', defaultUnit: 'sft', category: 'flex_banner' },
  { code: 'flex_pana', nameEn: 'Panaflex Lightbox Print', nameBn: 'প্যানাফ্লেক্স সাইনবোর্ড প্রিন্ট', defaultUnit: 'sft', category: 'flex_banner' },
  { code: 'vinyl_sticker', nameEn: 'Glossy Vinyl Sticker (Die-cut)', nameBn: 'গ্লসি ভিনাইল স্টিকার', defaultUnit: 'sft', category: 'sticker_label' },
  { code: 'rollup_standee', nameEn: 'Rollup Banner Standee (2.5x6 ft)', nameBn: 'রোলআপ ব্যানার স্ট্যান্ডী', defaultUnit: 'pcs', category: 'flex_banner' },
  { code: 'acrylic_3d_letter', nameEn: '3D Acrylic Channel Letter (LED Inside)', nameBn: 'থ্রিডি এক্রিলিক চ্যানেল লেটার', defaultUnit: 'inch', category: 'acrylic_signage' },
  { code: 'acp_groove_board', nameEn: 'ACP Board CNC Groove Signboard', nameBn: 'এসিপি বোর্ড সিএনসি সাইনবোর্ড', defaultUnit: 'sft', category: 'acp_signage' },
  { code: 'visiting_card', nameEn: 'Business Card (300 GSM Matte + Spot UV)', nameBn: 'ভিজিটিং কার্ড (স্পট ইউভি)', defaultUnit: 'pack', category: 'digital_print' },
  { code: 'offset_cash_memo', nameEn: 'Cash Memo / Challan Book (3 Part Carbonless)', nameBn: 'ক্যাশ মেমো / চালান বই', defaultUnit: 'pcs', category: 'offset_print' },
  { code: 'led_neon_sign', nameEn: 'Custom Flexible LED Neon Signboard', nameBn: 'কাস্টম এলইডি নিয়ন সাইন', defaultUnit: 'rft', category: 'led_signage' },
  { code: 'corrugated_carton', nameEn: 'Corrugated 3-Ply Packaging Box', nameBn: '৩-প্লাই করোগেটেড কার্টুন বক্স', defaultUnit: 'pcs', category: 'packaging_box' },
]

interface ProductSelectorProps {
  products?: ProductTypeOption[]
  selectedCode?: string
  onSelect: (product: ProductTypeOption) => void
  error?: string
}

export function ProductSelector({
  products = DEFAULT_PRINT_PRODUCTS,
  selectedCode,
  onSelect,
  error,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { t, locale, tBilingual } = useI18n()

  const selected = products.find((p) => p.code === selectedCode)

  const filtered = products.filter(
    (p) =>
      p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameBn.includes(searchTerm)
  )

  return (
    <div className="relative w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full justify-between font-normal text-left h-10 px-3',
          !selected && 'text-slate-400',
          error && 'border-red-500'
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Printer className="h-4 w-4 text-slate-400 shrink-0" />
          {selected ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {tBilingual(selected.nameEn, selected.nameBn)}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                {selected.defaultUnit}
              </Badge>
            </div>
          ) : (
            <span>{t('common.select_option')}</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-40 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800"
              placeholder={t('common.type_to_search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
              {filtered.map((item) => {
                const isSelected = item.code === selectedCode
                return (
                  <div
                    key={item.code}
                    onClick={() => {
                      onSelect(item)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex items-center justify-between rounded-lg p-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800',
                      isSelected && 'bg-blue-50 text-blue-900 dark:bg-blue-950/50'
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {tBilingual(item.nameEn, item.nameBn)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                        {item.defaultUnit}
                      </Badge>
                      {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

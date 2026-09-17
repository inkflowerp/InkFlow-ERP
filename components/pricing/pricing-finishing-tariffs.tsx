'use client'

import React, { useState } from 'react'
import {
  Wrench,
  Printer,
  Truck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
  Scissors,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { useI18n } from '@/i18n/context'
import type {
  FinishingOptionRecord,
  PrintingMethod,
  InstallationOptionRecord,
} from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'

interface PricingFinishingTariffsProps {
  finishingOptions: FinishingOptionRecord[]
  printingMethods: PrintingMethod[]
  installationOptions: InstallationOptionRecord[]
  onSaveFinishing: (data: Partial<FinishingOptionRecord>) => Promise<any>
  onDeleteFinishing: (id: string) => Promise<any>
  onSavePrintingMethod: (data: Partial<PrintingMethod>) => Promise<any>
  onDeletePrintingMethod: (id: string) => Promise<any>
  onSaveInstallation: (data: Partial<InstallationOptionRecord>) => Promise<any>
  onDeleteInstallation: (id: string) => Promise<any>
}

export function PricingFinishingTariffs({
  finishingOptions,
  printingMethods,
  installationOptions,
  onSaveFinishing,
  onDeleteFinishing,
  onSavePrintingMethod,
  onDeletePrintingMethod,
  onSaveInstallation,
  onDeleteInstallation,
}: PricingFinishingTariffsProps) {
  const { tBilingual } = useI18n()

  // Modal State for Finishing Option
  const [isFinishingModalOpen, setIsFinishingModalOpen] = useState(false)
  const [editingFinishing, setEditingFinishing] = useState<FinishingOptionRecord | null>(null)
  const [finForm, setFinForm] = useState({
    name: '',
    name_bn: '',
    pricing_method: 'sqft',
    selling_price: 5,
    cost: 2,
    is_active: true,
  })

  // Modal State for Printing Method
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PrintingMethod | null>(null)
  const [methodForm, setMethodForm] = useState({
    name: '',
    code: '',
    cost_per_sqft: 5,
    is_active: true,
  })

  const handleOpenAddFinishing = () => {
    setEditingFinishing(null)
    setFinForm({
      name: '',
      name_bn: '',
      pricing_method: 'sqft',
      selling_price: 5,
      cost: 2,
      is_active: true,
    })
    setIsFinishingModalOpen(true)
  }

  const handleOpenEditFinishing = (fin: FinishingOptionRecord) => {
    setEditingFinishing(fin)
    setFinForm({
      name: fin.name,
      name_bn: fin.name_bn || '',
      pricing_method: fin.pricing_method || 'sqft',
      selling_price: Number(fin.selling_price) || 0,
      cost: Number(fin.cost) || 0,
      is_active: fin.is_active ?? true,
    })
    setIsFinishingModalOpen(true)
  }

  const handleSaveFinishingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSaveFinishing({
      id: editingFinishing?.id,
      name: finForm.name,
      name_bn: finForm.name_bn || null,
      pricing_method: finForm.pricing_method,
      selling_price: Number(finForm.selling_price),
      cost: Number(finForm.cost),
      is_active: finForm.is_active,
    })
    setIsFinishingModalOpen(false)
  }

  const handleOpenAddMethod = () => {
    setEditingMethod(null)
    setMethodForm({
      name: '',
      code: '',
      cost_per_sqft: 5,
      is_active: true,
    })
    setIsMethodModalOpen(true)
  }

  const handleOpenEditMethod = (m: PrintingMethod) => {
    setEditingMethod(m)
    setMethodForm({
      name: m.name,
      code: m.code || '',
      cost_per_sqft: Number(m.cost_per_sqft) || 0,
      is_active: m.is_active ?? true,
    })
    setIsMethodModalOpen(true)
  }

  const handleSaveMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSavePrintingMethod({
      id: editingMethod?.id,
      name: methodForm.name,
      code: methodForm.code || methodForm.name.toLowerCase().replace(/\s+/g, '_'),
      cost_per_sqft: Number(methodForm.cost_per_sqft),
      is_active: methodForm.is_active,
    })
    setIsMethodModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* 1. FINISHING OPTIONS TARIFFS */}
      <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scissors className="h-4 w-4 text-teal-600" />
                <span>{tBilingual('Finishing & Fabrication Option Tariffs', 'ফিনিশিং ও পোস্ট-প্রেস ট্যারিফ')}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {tBilingual(
                  'Eyelets, Lamination, Hemming, Board Mounting, Laser Die Cut, and Framing rates.',
                  'আইলেট, লেমিনেশন, সেলাই, বোর্ড মাউন্টিং এবং ফ্রেমের প্রতি একক দর।'
                )}
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleOpenAddFinishing}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {tBilingual('Add Finishing Option', 'নতুন ফিনিশিং')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-900/90 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{tBilingual('Finishing Option', 'ফিনিশিং বিবরণ')}</th>
                  <th className="py-3 px-4">{tBilingual('Billing Unit / Method', 'বিলিং মেথড')}</th>
                  <th className="py-3 px-4">{tBilingual('Client Selling Rate (৳)', 'বিক্রয় দর (৳)')}</th>
                  <th className="py-3 px-4">{tBilingual('Internal Cost (৳)', 'অভ্যন্তরীণ খরচ')}</th>
                  <th className="py-3 px-4">{tBilingual('Gross Margin', 'মুনাফা %')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {finishingOptions.map((fin) => {
                  const sell = Number(fin.selling_price) || 0
                  const cost = Number(fin.cost) || 0
                  const marginPct = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0

                  return (
                    <tr key={fin.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{fin.name}</div>
                        {fin.name_bn && (
                          <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium bangla-text">
                            {fin.name_bn}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 uppercase font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {fin.pricing_method || 'sqft'}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-teal-700 dark:text-teal-400 text-sm">
                        ৳ {formatBDT(sell)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        ৳ {formatBDT(cost)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono font-bold ${
                            marginPct >= 40
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {marginPct}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditFinishing(fin)}
                            className="h-7 px-2 text-xs"
                            title="Edit Finishing Option"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Delete finishing option "${fin.name}"?`)) {
                                onDeleteFinishing(fin.id)
                              }
                            }}
                            className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 2. MACHINE PRINTING METHOD SURCHARGES */}
      <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Printer className="h-4 w-4 text-blue-600" />
                <span>{tBilingual('Printing Methods & Resolution Surcharges', 'মেশিন মেথড ও রেজোলিউশন সারচার্জ')}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {tBilingual(
                  'Solvent 4-Pass, Eco-Solvent Fine Art, UV 8-Pass Ultra Vivid print run costs per sft.',
                  'সলভেন্ট, ইকো-সলভেন্ট ও ইউভি মেশিনের প্রতি স্কয়ার ফিট প্রেস রান কস্ট।'
                )}
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleOpenAddMethod}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {tBilingual('Add Printing Method', 'নতুন মেথড')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-900/90 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{tBilingual('Method Name', 'মেথডের নাম')}</th>
                  <th className="py-3 px-4">{tBilingual('Identifier Code', 'কোড')}</th>
                  <th className="py-3 px-4">{tBilingual('Unit', 'একক')}</th>
                  <th className="py-3 px-4">{tBilingual('Print Surcharge (৳)', 'সারচার্জ দর (৳)')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {printingMethods.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{m.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{m.code || '—'}</td>
                    <td className="py-3 px-4 uppercase font-mono font-semibold">sft</td>
                    <td className="py-3 px-4 font-mono font-black text-blue-700 dark:text-blue-400 text-sm">
                      + ৳ {formatBDT(m.cost_per_sqft || 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditMethod(m)}
                          className="h-7 px-2 text-xs"
                          title="Edit Printing Method"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Delete printing method "${m.name}"?`)) {
                              onDeletePrintingMethod(m.id)
                            }
                          }}
                          className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: ADD / EDIT FINISHING OPTION */}
      <ModalDialog
        open={isFinishingModalOpen}
        onOpenChange={setIsFinishingModalOpen}
        title={
          editingFinishing
            ? tBilingual('Edit Finishing Tariff', 'ফিনিশিং ট্যারিফ সম্পাদনা')
            : tBilingual('Add New Finishing Tariff', 'নতুন ফিনিশিং ট্যারিফ যুক্ত করুন')
        }
      >
        <form onSubmit={handleSaveFinishingSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Finishing Name (English)', 'ফিনিশিং নাম (ইংরেজি)')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Gloss Lamination (100 micron)"
                value={finForm.name}
                onChange={(e) => setFinForm({ ...finForm, name: e.target.value })}
                className="text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Bengali Name (বাংলায় নাম)', 'বাংলায় নাম')}
              </Label>
              <Input
                placeholder="যেমন: গ্লস লেমিনেশন"
                value={finForm.name_bn}
                onChange={(e) => setFinForm({ ...finForm, name_bn: e.target.value })}
                className="text-xs h-9 bangla-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Pricing Method / Unit', 'মূল্য নির্ধারণ পদ্ধতি')}
              </Label>
              <select
                value={finForm.pricing_method}
                onChange={(e) => setFinForm({ ...finForm, pricing_method: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono"
              >
                <option value="sqft">sqft (per sqft)</option>
                <option value="per_piece">per_piece (per piece / eyelet)</option>
                <option value="per_linear_ft">per_linear_ft (perimeter rft)</option>
                <option value="fixed">fixed (per job fixed)</option>
                <option value="percentage">percentage</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Client Price (৳ BDT)', 'বিক্রয় দর (৳)')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                value={finForm.selling_price}
                onChange={(e) => setFinForm({ ...finForm, selling_price: Number(e.target.value) })}
                className="text-xs h-9 font-mono font-bold"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Internal Cost (৳ BDT)', 'অভ্যন্তরীণ খরচ')}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={finForm.cost}
                onChange={(e) => setFinForm({ ...finForm, cost: Number(e.target.value) })}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsFinishingModalOpen(false)} className="text-xs h-9">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 px-5">
              {tBilingual('Save Tariff', 'সংরক্ষণ করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: ADD / EDIT PRINTING METHOD */}
      <ModalDialog
        open={isMethodModalOpen}
        onOpenChange={setIsMethodModalOpen}
        title={
          editingMethod
            ? tBilingual('Edit Printing Method Tariff', 'প্রিন্টিং মেথড সম্পাদনা')
            : tBilingual('Add Printing Method Tariff', 'নতুন প্রিন্টিং মেথড যুক্ত করুন')
        }
      >
        <form onSubmit={handleSaveMethodSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Method Name', 'মেথডের নাম')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. UV 8-Pass Ultra Vivid"
                value={methodForm.name}
                onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                className="text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Code Identifier', 'কোড')}
              </Label>
              <Input
                placeholder="e.g. uv_8pass"
                value={methodForm.code}
                onChange={(e) => setMethodForm({ ...methodForm, code: e.target.value })}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Print Surcharge per SFT (৳ BDT)', 'প্রতি স্কয়ার ফিট সারচার্জ দর (৳)')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                value={methodForm.cost_per_sqft}
                onChange={(e) => setMethodForm({ ...methodForm, cost_per_sqft: Number(e.target.value) })}
                className="text-xs h-9 font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsMethodModalOpen(false)} className="text-xs h-9">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-5">
              {tBilingual('Save Method', 'সংরক্ষণ করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

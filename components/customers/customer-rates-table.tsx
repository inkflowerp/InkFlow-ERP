'use client'

import React, { useState } from 'react'
import {
  Tag,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'
import { ResolvedProductRate } from '@/types/crm.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { saveCustomerRateAction, deleteCustomerRateAction } from '@/actions/customer.actions'
import { cn } from '@/lib/utils'

interface CustomerRatesTableProps {
  customerId: string
  rates: ResolvedProductRate[]
  canEdit?: boolean
  companyId?: string
  onRatesUpdated?: () => void
}

export function CustomerRatesTable({
  customerId,
  rates,
  canEdit = true,
  companyId,
  onRatesUpdated,
}: CustomerRatesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editRateValue, setEditRateValue] = useState<string>('')
  const [editNotes, setEditNotes] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 4000)
  }

  const filteredRates = rates.filter((r) => {
    const q = searchTerm.toLowerCase()
    return (
      r.productName.toLowerCase().includes(q) ||
      (r.productNameBn && r.productNameBn.includes(searchTerm)) ||
      r.sku.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    )
  })

  const handleStartEdit = (rate: ResolvedProductRate) => {
    setEditingProductId(rate.productId)
    setEditRateValue(
      rate.customerRate !== null ? String(rate.customerRate) : String(rate.effectiveRate)
    )
    setEditNotes('')
  }

  const handleCancelEdit = () => {
    setEditingProductId(null)
    setEditRateValue('')
    setEditNotes('')
  }

  const handleSaveRate = async (productId: string) => {
    const num = parseFloat(editRateValue)
    if (isNaN(num) || num < 0) {
      showFeedback('error', 'Please enter a valid rate amount (>= 0).')
      return
    }

    setIsSaving(true)
    try {
      const res = await saveCustomerRateAction(customerId, productId, num, editNotes, companyId)
      if (res.success) {
        showFeedback('success', `Customer rate saved: ৳${num}`)
        setEditingProductId(null)
        onRatesUpdated?.()
      } else {
        showFeedback('error', res.error || 'Failed to save customer rate.')
      }
    } catch {
      showFeedback('error', 'Network error while saving rate.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetRate = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this custom rate override and restore automatic priority?')) {
      return
    }

    setIsSaving(true)
    try {
      const res = await deleteCustomerRateAction(customerId, productId, companyId)
      if (res.success) {
        showFeedback('success', 'Custom rate override removed.')
        setEditingProductId(null)
        onRatesUpdated?.()
      } else {
        showFeedback('error', res.error || 'Failed to remove rate override.')
      }
    } catch {
      showFeedback('error', 'Network error while deleting rate.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Immutability & Hierarchy Info Banner */}
      <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-950/60 bg-blue-50/70 dark:bg-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded-md bg-blue-600 text-white shrink-0 mt-0.5">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              Automated 3-Tier Rate Priority Engine
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed mt-0.5">
              Priority: <span className="font-semibold text-blue-600 dark:text-blue-400">Custom Rate</span> &rarr;{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Last Valid Invoice Rate</span> &rarr;{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">Catalog Default Rate</span>.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 shrink-0 bg-white/60 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>Historical invoices remain immutable</span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={cn(
            'p-3 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200',
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          )}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search products & services by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Product / Service</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-3 text-right">Default Rate</th>
                <th className="py-3 px-3 text-right">Last Invoice Rate</th>
                <th className="py-3 px-3 text-right">Customer Rate</th>
                <th className="py-3 px-3 text-center">Active Source</th>
                <th className="py-3 px-3 text-right">Effective Rate</th>
                {canEdit && <th className="py-3 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-8 text-center text-slate-400">
                    No products matched your search filter.
                  </td>
                </tr>
              ) : (
                filteredRates.map((r) => {
                  const isEditing = editingProductId === r.productId

                  return (
                    <tr
                      key={r.productId}
                      className={cn(
                        'hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors',
                        r.hasCustomRate && 'bg-blue-50/20 dark:bg-blue-950/10'
                      )}
                    >
                      {/* Product Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {r.productName}
                        </div>
                        {r.productNameBn && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {r.productNameBn}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {r.sku}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300 uppercase">
                        {r.unit}
                      </td>

                      {/* Default Rate */}
                      <td className="py-3 px-3 text-right font-medium text-slate-500">
                        ৳{r.defaultRate.toFixed(2)}
                      </td>

                      {/* Last Invoice Rate */}
                      <td className="py-3 px-3 text-right">
                        {r.lastInvoiceRate !== null ? (
                          <div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              ৳{r.lastInvoiceRate.toFixed(2)}
                            </span>
                            {r.lastInvoiceNumber && (
                              <div className="text-[10px] text-slate-400 truncate" title={`${r.lastInvoiceNumber} (${r.lastInvoiceDate})`}>
                                {r.lastInvoiceNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No bill</span>
                        )}
                      </td>

                      {/* Customer Rate */}
                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editRateValue}
                            onChange={(e) => setEditRateValue(e.target.value)}
                            className="h-8 w-24 text-right text-xs font-bold"
                            autoFocus
                          />
                        ) : r.customerRate !== null ? (
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            ৳{r.customerRate.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Auto</span>
                        )}
                      </td>

                      {/* Active Source Badge */}
                      <td className="py-3 px-3 text-center">
                        {r.source === 'custom' ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-[10px] font-semibold">
                            Custom Rate
                          </Badge>
                        ) : r.source === 'last_invoice' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                            Last Invoice
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 text-[10px]">
                            Catalog Default
                          </Badge>
                        )}
                      </td>

                      {/* Effective Rate */}
                      <td className="py-3 px-3 text-right font-black text-sm text-slate-900 dark:text-white">
                        ৳{r.effectiveRate.toFixed(2)}
                      </td>

                      {/* Actions */}
                      {canEdit && (
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveRate(r.productId)}
                                disabled={isSaving}
                                className="h-7 px-2 text-[11px] bg-blue-600 hover:bg-blue-700"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className="h-7 px-2 text-[11px]"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEdit(r)}
                                className="h-7 px-2 text-[11px]"
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                {r.hasCustomRate ? 'Edit' : 'Set Custom'}
                              </Button>

                              {r.hasCustomRate && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleResetRate(r.productId)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                  title="Reset to automated fallback"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-2.5">
        {filteredRates.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-950 rounded-xl border p-4">
            No products match your search.
          </div>
        ) : (
          filteredRates.map((r) => {
            const isEditing = editingProductId === r.productId

            return (
              <Card
                key={r.productId}
                className={cn(
                  'border-slate-200 dark:border-slate-800 shadow-sm p-3.5 space-y-3',
                  r.hasCustomRate && 'border-blue-200 dark:border-blue-900 bg-blue-50/10'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {r.productName}
                    </div>
                    {r.productNameBn && (
                      <div className="text-xs text-slate-500">{r.productNameBn}</div>
                    )}
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {r.sku} • {r.unit.toUpperCase()}
                    </div>
                  </div>

                  <div>
                    {r.source === 'custom' ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                        Custom
                      </Badge>
                    ) : r.source === 'last_invoice' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                        Last Invoice
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Default</div>
                    <div className="font-medium text-slate-600 dark:text-slate-400">
                      ৳{r.defaultRate.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Last Invoice</div>
                    <div className="font-medium text-emerald-600 dark:text-emerald-400 truncate">
                      {r.lastInvoiceRate !== null ? `৳${r.lastInvoiceRate.toFixed(2)}` : 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">Effective</div>
                    <div className="font-black text-slate-900 dark:text-white">
                      ৳{r.effectiveRate.toFixed(2)}
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="pt-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editRateValue}
                            onChange={(e) => setEditRateValue(e.target.value)}
                            placeholder="Rate (BDT)"
                            className="h-9 text-sm font-bold"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveRate(r.productId)}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 h-9"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="h-9"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(r)}
                          className="h-8 text-xs font-semibold text-blue-600 dark:text-blue-400"
                        >
                          <Edit2 className="h-3 w-3 mr-1.5" />
                          {r.hasCustomRate ? 'Modify Custom Rate' : 'Set Custom Rate'}
                        </Button>

                        {r.hasCustomRate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetRate(r.productId)}
                            className="h-8 text-xs text-rose-500 hover:text-rose-600"
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

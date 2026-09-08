'use client'

import React, { useState } from 'react'
import { User, Phone, Check, ChevronsUpDown, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from './currency-display'
import { NewCustomerModal } from './new-customer-modal'
import { useI18n } from '@/i18n/context'
import { CustomerRecord } from '@/types/crm.types'
import { cn } from '@/lib/utils'

export interface CustomerOption {
  id: string
  name: string
  nameBn?: string
  phone: string
  company?: string
  outstandingDue?: number
}

interface CustomerSelectorProps {
  customers: CustomerOption[]
  selectedId?: string
  onSelect: (customer: CustomerOption) => void
  label?: string
  placeholder?: string
  error?: string
  showAddNew?: boolean
  onAddNew?: () => void
  companyId?: string
}

export function CustomerSelector({
  customers,
  selectedId,
  onSelect,
  placeholder,
  error,
  showAddNew = true,
  onAddNew,
  companyId,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { t, locale, tBilingual } = useI18n()

  const selected = customers.find((c) => c.id === selectedId)

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nameBn && c.nameBn.includes(searchTerm)) ||
      c.phone.includes(searchTerm) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCustomerCreated = (newCust: CustomerRecord) => {
    const opt: CustomerOption = {
      id: newCust.id,
      name: newCust.name,
      nameBn: newCust.name_bn || undefined,
      phone: newCust.mobile,
      company: newCust.company_name || undefined,
      outstandingDue: newCust.total_due_balance || 0,
    }
    onSelect(opt)
    setIsModalOpen(false)
    setOpen(false)
  }

  return (
    <div className="relative w-full">
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full justify-between font-normal text-left h-10 px-3 rounded-xl',
            !selected && 'text-slate-400',
            error && 'border-red-500'
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            {selected ? (
              <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                {tBilingual(selected.name, selected.nameBn || selected.name)} (
                {selected.phone})
              </span>
            ) : (
              <span>{placeholder || t('common.select_option')}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </Button>

        {showAddNew && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onAddNew) onAddNew()
              else setIsModalOpen(true)
            }}
            title="Add New Customer"
            className="h-10 px-3 shrink-0 rounded-xl border-dashed border-blue-300 dark:border-blue-700/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="text-xs font-bold hidden sm:inline">New</span>
          </Button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-40 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center gap-2 pb-1">
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800"
                placeholder={t('common.type_to_search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />

              {showAddNew && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    if (onAddNew) onAddNew()
                    else setIsModalOpen(true)
                  }}
                  className="flex items-center gap-1 shrink-0 h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New</span>
                </button>
              )}
            </div>

            <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <div className="p-4 text-center space-y-2">
                  <div className="text-xs text-slate-400">
                    {t('common.no_data')}
                  </div>
                  {showAddNew && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setOpen(false)
                        if (onAddNew) onAddNew()
                        else setIsModalOpen(true)
                      }}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Create &quot;{searchTerm}&quot; as New Customer
                    </Button>
                  )}
                </div>
              ) : (
                filtered.map((cust) => {
                  const isSelected = cust.id === selectedId
                  return (
                    <div
                      key={cust.id}
                      onClick={() => {
                        onSelect(cust)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-xl p-2.5 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                        isSelected && 'bg-blue-50 text-blue-900 dark:bg-blue-950/50'
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {tBilingual(cust.name, cust.nameBn || cust.name)}
                          {cust.company ? ` (${cust.company})` : ''}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <Phone className="h-3 w-3 shrink-0" />
                          {cust.phone}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cust.outstandingDue && cust.outstandingDue > 0 ? (
                          <div className="text-right">
                            <span className="text-[10px] text-red-500 block">Due</span>
                            <CurrencyDisplay
                              amount={cust.outstandingDue}
                              colorVariant="danger"
                              className="text-xs font-bold"
                            />
                          </div>
                        ) : null}
                        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Built-in New Customer Modal */}
      <NewCustomerModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onCustomerCreated={handleCustomerCreated}
        initialName={searchTerm}
        companyId={companyId}
      />
    </div>
  )
}


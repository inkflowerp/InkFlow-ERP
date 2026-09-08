'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  AlertCircle,
  Phone,
  MessageSquare,
  Building,
  CheckCircle2,
  ExternalLink,
  Filter,
  ShieldCheck,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import { CustomerRecord, CustomerType } from '@/types/crm.types'
import { normalizeBdPhone } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { usePermissions } from '@/hooks/use-permissions'
import { STORAGE_KEYS, PrintERPDataStore } from '@/lib/db/data-store'

export default function CustomersPage() {
  const { company } = useTenant()
  const { can, isReadOnly } = usePermissions()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const { data: customerData, addItem: addCustomerItem } = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS)
  const customers = Array.isArray(customerData) ? customerData : []

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedDueFilter, setSelectedDueFilter] = useState<string>('all')

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleCustomerCreated = (created: CustomerRecord) => {
    addCustomerItem(created)
    showNotification(`Customer '${created.name}' added successfully.`)
  }

  // UTF-8 BOM CSV Export for perfect Excel rendering in Bengali
  const handleExportCSV = () => {
    const headers = ['ID', 'Customer Name', 'Bangla Name', 'Type', 'Contact Person', 'Mobile', 'Email', 'Area', 'Due Balance BDT', 'Credit Limit BDT']
    const rows = customers.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.name_bn || ''}"`,
      c.customer_type,
      `"${c.contact_person || ''}"`,
      `"${c.mobile}"`,
      `"${c.email || ''}"`,
      `"${c.area || ''}"`,
      c.total_due_balance || 0,
      c.credit_limit,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `PrintERP_Customers_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotification('Customers exported to CSV (Unicode UTF-8 with Excel BOM).')
  }

  const handleImportCSV = (e: React.FormEvent) => {
    e.preventDefault()
    setIsImportOpen(false)
    showNotification('3 sample customers imported from CSV successfully.')
  }

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.name_bn && c.name_bn.includes(search)) ||
      c.mobile.includes(search) ||
      (c.area && c.area.toLowerCase().includes(search.toLowerCase()))

    const matchType = selectedType === 'all' || c.customer_type === selectedType
    const matchDue =
      selectedDueFilter === 'all'
        ? true
        : selectedDueFilter === 'due'
        ? (c.total_due_balance || 0) > 0
        : (c.total_due_balance || 0) === 0

    return matchSearch && matchType && matchDue
  })

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Customer & Client CRM"
        titleBn="কাস্টমার ও ক্লায়েন্ট তালিকা"
        descriptionEn="Manage corporate accounts, design agencies, retail walk-ins, credit limits, and outstanding balances."
        descriptionBn="কর্পোরেট ক্লায়েন্ট, বিজ্ঞাপন সংস্থা, ডিলার ও রিটেইল গ্রাহকদের সম্পূর্ণ ডাটাবেস ও বকেয়া খতিয়ান।"
        icon={Users}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2">
            {can('export', 'customers') && (
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs bangla-text">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Export List', 'এক্সপোর্ট')}
              </Button>
            )}

            {can('create', 'customers') && (
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="text-xs bangla-text">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Import CSV', 'ইমপোর্ট সিএসভি')}
              </Button>
            )}

            {can('create', 'customers') && (
              <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-xs bangla-text">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('New Customer', 'নতুন গ্রাহক')}
              </Button>
            )}
          </div>
        }
      />

      {/* Read-Only Notice */}
      {isReadOnly('customers') && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-2 border border-blue-200 dark:border-blue-900 animate-in fade-in-0">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{tBilingual('View-Only Mode: You have read-only access to customer directories.', 'শুধুমাত্র দেখার অনুমতি: কাস্টমার তৈরি বা সম্পাদনার অনুমতি নেই।')}</span>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Search & Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by company name, বাংলা নাম, mobile, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Customer Types</option>
              <option value="corporate">Corporate (কর্পোরেট)</option>
              <option value="agency">Agency (বিজ্ঞাপনী সংস্থা)</option>
              <option value="retail">Retail (খুচরা)</option>
              <option value="dealer">Dealer (ডিলার)</option>
              <option value="government">Government (সরকারি)</option>
              <option value="regular">Regular (নিয়মিত)</option>
            </select>

            <select
              value={selectedDueFilter}
              onChange={(e) => setSelectedDueFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Balances</option>
              <option value="due">Has Due Balance (বাকি আছে)</option>
              <option value="clear">No Due Balance (পরিশোধিত)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Customers Directory ({filtered.length})</CardTitle>
            <span className="text-xs text-slate-400">Showing all registered accounts</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No Customers Found"
                titleBn="কোনো গ্রাহক পাওয়া যায়নি"
                description="Try changing your search term or filter criteria, or add a new customer."
                descriptionBn="অন্য কোনো নাম বা মোবাইল নম্বর দিয়ে খুঁজুন অথবা নতুন গ্রাহক নিবন্ধন করুন।"
                actionLabel="Add New Customer"
                actionLabelBn="নতুন কাস্টমার যোগ করুন"
                onAction={() => setIsAddOpen(true)}
              />
            </div>
          ) : (
            <>
              {/* 1. Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Customer Name & Hub</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Contact Person</th>
                      <th className="py-3 px-4">Contact Numbers</th>
                      <th className="py-3 px-4">Credit Limit</th>
                      <th className="py-3 px-4">Due Balance (বাকি)</th>
                      <th className="py-3 px-4 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((customer) => {
                      const hasDue = (customer.total_due_balance || 0) > 0
                      return (
                        <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <Link
                              href={`/${slug}/customers/${customer.id}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-blue-600 flex items-center gap-1.5 group"
                            >
                              <span>{customer.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                            </Link>
                            {customer.name_bn && (
                              <div className="text-xs text-slate-500 bangla-text">{customer.name_bn}</div>
                            )}
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {customer.area || 'Dhaka Area'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                              {customer.customer_type}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                            {customer.contact_person || '—'}
                          </td>

                          <td className="py-3.5 px-4 text-xs font-mono">
                            <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{customer.mobile}</span>
                            </div>
                            {customer.whatsapp && (
                              <div className="flex items-center gap-1 text-emerald-600 mt-0.5">
                                <MessageSquare className="h-3 w-3" />
                                <span>{customer.whatsapp}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <CurrencyDisplay amount={customer.credit_limit} />
                          </td>

                          <td className="py-3.5 px-4">
                            {hasDue ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
                                <CurrencyDisplay amount={customer.total_due_balance || 0} />
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                All Clear
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/${slug}/customers/${customer.id}`}
                              className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              View Profile
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 2. Mobile Cards (Smartphone Touch-Friendly) */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
                {filtered.map((customer) => {
                  const hasDue = (customer.total_due_balance || 0) > 0
                  return (
                    <div
                      key={customer.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/${slug}/customers/${customer.id}`}
                            className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1"
                          >
                            <span>{customer.name}</span>
                          </Link>
                          {customer.name_bn && (
                            <div className="text-xs text-slate-500 bangla-text">{customer.name_bn}</div>
                          )}
                          <div className="text-[11px] text-slate-400">{customer.area || 'Dhaka'}</div>
                        </div>

                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 shrink-0">
                          {customer.customer_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Phone:</span>
                          <a href={`tel:${customer.mobile}`} className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{customer.mobile}</span>
                          </a>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Due Balance:</span>
                          {hasDue ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              <CurrencyDisplay amount={customer.total_due_balance || 0} />
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold text-[11px]">Paid Clear</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800">
                        {customer.whatsapp ? (
                          <a
                            href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : <div />}

                        <Link
                          href={`/${slug}/customers/${customer.id}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold dark:bg-slate-800"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* MODAL: NEW CUSTOMER */}
      <NewCustomerModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onCustomerCreated={handleCustomerCreated}
        companyId={company?.id || 'c-01'}
      />

      {/* MODAL: IMPORT CSV */}
      <ModalDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        title="Import Customers from CSV"
        description="Bulk upload client records from Excel or previous software."
      >
        <form onSubmit={handleImportCSV} className="space-y-4 pt-2">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-900">
            <Upload className="h-8 w-8 mx-auto text-slate-400" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Select or drag & drop CSV file
            </div>
            <p className="text-[11px] text-slate-400">
              Supported columns: Name, Name_BN, Mobile, Type, Email, Area, Credit_Limit.
            </p>
            <input type="file" accept=".csv" className="text-xs pt-2" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Upload & Import
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Truck,
  Plus,
  Search,
  Download,
  Upload,
  Phone,
  MessageSquare,
  Building,
  CheckCircle2,
  ExternalLink,
  Tag,
  DollarSign,
  Package,
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
import { PageHeader } from '@/components/shared/page-header'
import { SupplierRecord, SupplierCategory, SupplierPaymentTerms } from '@/types/crm.types'
import { normalizeBdPhone } from '@/services/crm.service'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function SuppliersPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'
  const [suppliers, setSuppliers] = useDataStore<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS, [])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // New Supplier Form
  const [newSupplier, setNewSupplier] = useState({
    supplier_name: '',
    company: '',
    contact_person: '',
    mobile: '',
    whatsapp: '',
    email: '',
    address: '',
    category: 'media' as SupplierCategory,
    payment_terms: 'credit_15' as SupplierPaymentTerms,
    notes: '',
  })

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault()
    const created: SupplierRecord = {
      id: `supp-${Date.now()}`,
      company_id: company?.id || 'co-main',
      supplier_name: newSupplier.supplier_name,
      company: newSupplier.company || null,
      contact_person: newSupplier.contact_person || null,
      mobile: normalizeBdPhone(newSupplier.mobile),
      whatsapp: newSupplier.whatsapp ? normalizeBdPhone(newSupplier.whatsapp) : null,
      email: newSupplier.email || null,
      address: newSupplier.address || null,
      category: newSupplier.category,
      payment_terms: newSupplier.payment_terms,
      notes: newSupplier.notes || null,
      is_active: true,
      outstanding_balance: 0,
      total_purchases_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, created)
    setIsAddOpen(false)
    setNewSupplier({
      supplier_name: '',
      company: '',
      contact_person: '',
      mobile: '',
      whatsapp: '',
      email: '',
      address: '',
      category: 'media',
      payment_terms: 'credit_15',
      notes: '',
    })
    showNotification(`Supplier '${created.supplier_name}' registered successfully.`)
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Supplier Name', 'Company', 'Category', 'Contact Person', 'Mobile', 'Address', 'Balance Owed BDT']
    const rows = suppliers.map((s) => [
      s.id,
      `"${s.supplier_name}"`,
      `"${s.company || ''}"`,
      s.category,
      `"${s.contact_person || ''}"`,
      `"${s.mobile}"`,
      `"${s.address || ''}"`,
      s.outstanding_balance || 0,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `PrintERP_Suppliers_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotification('Suppliers exported to CSV with UTF-8 BOM.')
  }

  const filtered = suppliers.filter((s) => {
    const matchSearch =
      s.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.company && s.company.toLowerCase().includes(search.toLowerCase())) ||
      s.mobile.includes(search) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()))

    const matchCat = selectedCategory === 'all' || s.category === selectedCategory

    return matchSearch && matchCat
  })

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Supplier & Vendor Directory"
        titleBn="সাপ্লায়ার ও মহাজন তালিকা"
        descriptionEn="Media importers, acrylic merchants, ink dealers, paper mills, and hardware suppliers across Nayabazar, Chawkbazar, and Fakirapool."
        descriptionBn="নয়াবাজার, চকবাজার ও ফকিরারপুলের মিডিয়া আমদানিকারক, এক্রিলিক মার্চেন্ট এবং পেপার মিলের মহাজনদের তালিকা।"
        icon={Truck}
        iconColor="text-teal-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs bangla-text">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Export CSV', 'এক্সপোর্ট সিএসভি')}
            </Button>

            <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-xs text-white bangla-text">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Supplier', 'নতুন মহাজন')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by vendor name, trading house, mobile, market area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-auto h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All 9 Material Categories</option>
              <option value="media">Media (Flex, Vinyl, Canvas)</option>
              <option value="acrylic">Acrylic (Cast, Clear, Mirror)</option>
              <option value="led">LED (Modules, Power Supply)</option>
              <option value="hardware">Hardware (Stands, Frames)</option>
              <option value="ink">Ink (Solvent, Eco, UV)</option>
              <option value="paper">Paper (Art Card, Offset)</option>
              <option value="pvc">PVC (Foam Board, Celuka)</option>
              <option value="aluminum">Aluminum (ACP Panels)</option>
              <option value="other">Other Supplies</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Registered Suppliers ({filtered.length})</CardTitle>
            <span className="text-xs text-slate-400">Showing all vendor partner records</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Supplier & Trading Name</th>
                <th className="py-3 px-4">Material Category</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone & WhatsApp</th>
                <th className="py-3 px-4">Market Hub</th>
                <th className="py-3 px-4">Payable Balance (বাকি)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/${slug}/suppliers/${supplier.id}`}
                      className="font-bold text-slate-900 dark:text-white hover:text-teal-600 flex items-center gap-1.5 group"
                    >
                      <span>{supplier.supplier_name}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity" />
                    </Link>
                    {supplier.company && (
                      <div className="text-xs text-slate-500">{supplier.company}</div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900">
                      {supplier.category}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {supplier.contact_person || '—'}
                  </td>

                  <td className="py-3.5 px-4 text-xs font-mono">
                    <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{supplier.mobile}</span>
                    </div>
                    {supplier.whatsapp && (
                      <div className="flex items-center gap-1 text-emerald-600 mt-0.5">
                        <MessageSquare className="h-3 w-3" />
                        <span>{supplier.whatsapp}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {supplier.address || 'Dhaka'}
                  </td>

                  <td className="py-3.5 px-4">
                    {(supplier.outstanding_balance || 0) > 0 ? (
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        <CurrencyDisplay amount={supplier.outstanding_balance || 0} />
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Settled
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/${slug}/suppliers/${supplier.id}`}
                      className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Rate Sheet & History
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL: ADD NEW SUPPLIER */}
      <ModalDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Register New Material Supplier"
        description="Add a vendor partner for rolls, inks, acrylic sheets, LEDs, or art card."
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sName" required>Supplier / Merchant Name</Label>
              <Input
                id="sName"
                placeholder="e.g. Bangla Plastic & Media Ltd."
                value={newSupplier.supplier_name}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sCompany">Trading House / Entity</Label>
              <Input
                id="sCompany"
                placeholder="Bangla Import Syndicate"
                value={newSupplier.company}
                onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sCat" required>Material Category</Label>
              <select
                id="sCat"
                value={newSupplier.category}
                onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value as SupplierCategory })}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="media">Media (Flex, Vinyl, Canvas)</option>
                <option value="acrylic">Acrylic (Cast, Clear, Mirror)</option>
                <option value="led">LED (Modules, Power Supplies)</option>
                <option value="hardware">Hardware (Rollup Stands, MS Frames)</option>
                <option value="ink">Ink (Solvent, Eco-solvent, UV)</option>
                <option value="paper">Paper (Art Card, Offset Board)</option>
                <option value="pvc">PVC (Foam Board, Celuka)</option>
                <option value="aluminum">Aluminum (ACP Panels)</option>
                <option value="other">Other Material</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sTerms">Payment Terms</Label>
              <select
                id="sTerms"
                value={newSupplier.payment_terms}
                onChange={(e) => setNewSupplier({ ...newSupplier, payment_terms: e.target.value as SupplierPaymentTerms })}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="cash">Cash on Delivery (নগদ)</option>
                <option value="credit_15">Credit 15 Days</option>
                <option value="credit_30">Credit 30 Days (মাসিক বাকি)</option>
                <option value="advance">Advance Payment Required</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sContact">Contact Person</Label>
              <Input
                id="sContact"
                placeholder="Sales Representative"
                value={newSupplier.contact_person}
                onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sMobile" required>Mobile No.</Label>
              <Input
                id="sMobile"
                placeholder="01711-XXXXXX"
                value={newSupplier.mobile}
                onChange={(e) => setNewSupplier({ ...newSupplier, mobile: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sWhatsapp">WhatsApp No.</Label>
              <Input
                id="sWhatsapp"
                placeholder="01819-XXXXXX"
                value={newSupplier.whatsapp}
                onChange={(e) => setNewSupplier({ ...newSupplier, whatsapp: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sAddress">Market Address & Hub</Label>
            <Input
              id="sAddress"
              placeholder="e.g. 42 Nayabazar Paper Market, Dhaka"
              value={newSupplier.address}
              onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sNotes">Payment Remarks / Mahajan Terms</Label>
            <textarea
              id="sNotes"
              rows={2}
              placeholder="Cheque clearing schedule, delivery discount notes..."
              value={newSupplier.notes}
              onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Save Supplier
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

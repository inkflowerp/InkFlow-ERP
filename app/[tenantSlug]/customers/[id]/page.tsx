'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  Users,
  ArrowLeft,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Receipt,
  Truck,
  History,
  Plus,
  Save,
  Clock,
  CreditCard,
  Building,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { CustomerRecord, CustomerCommunication } from '@/types/crm.types'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS, PrintERPDataStore } from '@/lib/db/data-store'
import { Edit3 } from 'lucide-react'

import { updateCustomerAction } from '@/actions/customer.actions'

interface CustomerProfilePageProps {
  params: Promise<{ tenantSlug: string; id: string }>
}

export default function CustomerProfilePage({ params }: CustomerProfilePageProps) {
  const resolvedParams = use(params)
  const customerId = resolvedParams.id
  const { company } = useTenant()
  const { locale } = useI18n()
  const slug = company?.slug || 'my-company'

  const { data: customerList, updateItem: updateCustomerItem } = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS)
  const customers = Array.isArray(customerList) ? customerList : []
  const customer = customers.find((c) => c.id === customerId)

  const { data: commList, addItem: addCommItem } = useDataStore<CustomerCommunication[]>(STORAGE_KEYS.COMMUNICATIONS)
  const allComms = Array.isArray(commList) ? commList : []
  const communications = customer ? allComms.filter((c) => c.customer_id === customer.id) : []

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'quotations' | 'invoices' | 'payments' | 'deliveries' | 'comms' | 'notes'
  >('overview')

  const [isLogCommOpen, setIsLogCommOpen] = useState(false)
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Edit Customer form state
  const [editName, setEditName] = useState(customer?.name || '')
  const [editNameBn, setEditNameBn] = useState(customer?.name_bn || '')
  const [editContactPerson, setEditContactPerson] = useState(customer?.contact_person || '')
  const [editMobile, setEditMobile] = useState(customer?.mobile || '')
  const [editWhatsapp, setEditWhatsapp] = useState(customer?.whatsapp || '')
  const [editEmail, setEditEmail] = useState(customer?.email || '')
  const [editArea, setEditArea] = useState(customer?.area || '')
  const [editAddress, setEditAddress] = useState(customer?.address || '')
  const [editCreditLimit, setEditCreditLimit] = useState<number>(customer?.credit_limit || 50000)
  const [editNotes, setEditNotes] = useState(customer?.notes || '')

  // Log comm form
  const [commType, setCommType] = useState<'phone_call' | 'whatsapp_message' | 'meeting' | 'site_visit'>('phone_call')
  const [commSummary, setCommSummary] = useState('')
  const [commDetails, setCommDetails] = useState('')

  // Payment form
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash Counter')
  const [payReference, setPayReference] = useState('')

  if (!customer) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Link
          href={`/${slug}/customers`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Customer Directory
        </Link>
        <Card className="p-12 text-center space-y-3">
          <div className="text-base font-bold text-slate-900 dark:text-white">Customer Not Found</div>
          <p className="text-xs text-slate-500">
            The requested customer profile could not be found or has been removed.
          </p>
          <div>
            <Link
              href={`/${slug}/customers`}
              className="inline-flex items-center text-xs font-bold text-blue-600 hover:underline"
            >
              Return to Customer Directory &rarr;
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleOpenEdit = () => {
    setEditName(customer.name)
    setEditNameBn(customer.name_bn || '')
    setEditContactPerson(customer.contact_person || '')
    setEditMobile(customer.mobile)
    setEditWhatsapp(customer.whatsapp || '')
    setEditEmail(customer.email || '')
    setEditArea(customer.area || '')
    setEditAddress(customer.address || '')
    setEditCreditLimit(customer.credit_limit || 50000)
    setEditNotes(customer.notes || '')
    setEditError(null)
    setIsEditOpen(true)
  }

  const handleSaveCustomerEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) {
      setEditError('Customer name is required.')
      return
    }
    if (!editMobile.trim()) {
      setEditError('Mobile number is required.')
      return
    }

    setIsSavingCustomer(true)
    setEditError(null)

    try {
      const res = await updateCustomerAction(
        customer.id,
        {
          name: editName.trim(),
          name_bn: editNameBn.trim() || null,
          contact_person: editContactPerson.trim() || null,
          mobile: editMobile.trim(),
          whatsapp: editWhatsapp.trim() || null,
          email: editEmail.trim() || null,
          area: editArea.trim() || null,
          address: editAddress.trim() || null,
          credit_limit: Number(editCreditLimit) || 0,
          notes: editNotes.trim() || null,
        },
        customer.company_id || 'c-01'
      )

      if (!res.success) {
        setEditError(res.error || 'Failed to update customer.')
        return
      }

      setIsEditOpen(false)
      showNotification(`Customer '${editName}' updated successfully!`)
    } catch (err: any) {
      setEditError(err?.message || 'Network error occurred while saving customer.')
    } finally {
      setIsSavingCustomer(false)
    }
  }

  const handleAddCommunication = (e: React.FormEvent) => {
    e.preventDefault()
    const item: CustomerCommunication = {
      id: `comm-${Date.now()}`,
      company_id: 'c-01',
      customer_id: customer.id,
      type: commType,
      summary: commSummary,
      details: commDetails,
      logged_by_name: 'Current User (Sales)',
      created_at: 'Just now',
    }
    addCommItem(item)
    setIsLogCommOpen(false)
    setCommSummary('')
    setCommDetails('')
    showNotification('Interaction logged in communication history.')
  }

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(payAmount) || 0
    if (amt <= 0) return

    PrintERPDataStore.recordPaymentCollection({
      customerId: customer.id,
      amount: amt,
      paymentMethod: payMethod,
      notes: `Direct collection at counter for customer ${customer.name}`,
    })

    setIsRecordPayOpen(false)
    showNotification(`Payment of ৳ ${payAmount} recorded via ${payMethod}. Money receipt issued.`)
    setPayAmount('')
  }

  const creditUsedPercent = Math.min(
    100,
    Math.round(((customer.total_due_balance || 0) / (customer.credit_limit || 1)) * 100)
  )

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Back Button & Header */}
      <div>
        <Link
          href={`/${slug}/customers`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Customer Directory
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {customer.name}
              </h1>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                {customer.customer_type}
              </span>
            </div>
            {customer.name_bn && (
              <div className="text-sm font-medium text-slate-500">{customer.name_bn}</div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {customer.mobile}
              </span>
              {customer.whatsapp && (
                <span className="flex items-center gap-1 text-emerald-600 font-mono">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {customer.whatsapp}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {customer.email}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {customer.address || customer.area}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenEdit}
              className="text-xs"
            >
              <Edit3 className="mr-1.5 h-3.5 w-3.5 text-slate-600" />
              Edit Profile
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLogCommOpen(true)}
              className="text-xs"
            >
              <History className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              Log Interaction
            </Button>
            <Button
              size="sm"
              onClick={() => setIsRecordPayOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Collect Payment
            </Button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Total Lifetime Business</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={customer.total_orders_amount || 0} />
          </div>
          <span className="text-[11px] text-slate-400">{customer.total_orders_count || 0} completed jobs</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Total Payments Cleared</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            <CurrencyDisplay amount={(customer.total_orders_amount || 0) - (customer.total_due_balance || 0)} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">bKash, Cash & Cheque</span>
        </Card>

        <Card className={`p-4 border-l-4 ${(customer.total_due_balance || 0) > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Outstanding Due (বাকি টাকা)</span>
            {(customer.total_due_balance || 0) > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                Due
              </Badge>
            )}
          </div>
          <div className="text-2xl font-black text-red-600 mt-1">
            <CurrencyDisplay amount={customer.total_due_balance || 0} />
          </div>
          <span className="text-[11px] text-slate-400">Terms: {customer.payment_terms.replace('_', ' ')}</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Credit Limit Headroom</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {creditUsedPercent}% Used
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={customer.credit_limit} />
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full ${creditUsedPercent > 80 ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${creditUsedPercent}%` }}
            />
          </div>
        </Card>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Customer Info (পরিচিতি)' },
          { id: 'orders', label: 'Job Orders (অর্ডার)' },
          { id: 'quotations', label: 'Quotations (কোটেশন)' },
          { id: 'invoices', label: 'Tax Invoices (বিল)' },
          { id: 'payments', label: 'Payments & Receipts' },
          { id: 'deliveries', label: 'Deliveries & Challans' },
          { id: 'comms', label: 'Communication History' },
          { id: 'notes', label: 'Notes & Files' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                Account & Tax Identifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Customer Type:</span>
                <strong className="text-slate-900 dark:text-white capitalize">{customer.customer_type}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">BIN (ভ্যাট নিবন্ধন):</span>
                <strong className="font-mono text-slate-900 dark:text-white">{customer.bin_no || 'Not Registered'}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">TIN (টিন নং):</span>
                <strong className="font-mono text-slate-900 dark:text-white">{customer.tin_no || 'Not Registered'}</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Payment Terms:</span>
                <span className="text-blue-600 font-semibold">{customer.payment_terms.replace('_', ' ')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                Delivery & Communication Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400">Physical Address:</span>
                <p className="font-medium text-slate-900 dark:text-white">{customer.address}</p>
                {customer.address_bn && <p className="text-slate-500">{customer.address_bn}</p>}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Account Tags:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: ORDERS */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Job Orders History</CardTitle>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Book New Job
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order Code</th>
                  <th className="py-3 px-4">Item & Dimensions</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { code: 'ORD-000101', item: '3D Acrylic Channel Letters (20ft × 4ft)', amount: 145000, date: '02/09/2024', status: 'In Production' },
                  { code: 'ORD-000088', item: 'Star Flex Promo Banners (15 Pcs)', amount: 45000, date: '18/08/2024', status: 'Delivered' },
                  { code: 'ORD-000072', item: 'Rollup Banners Aluminum Stand (10 Pcs)', amount: 28000, date: '04/08/2024', status: 'Delivered' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{row.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{row.item}</td>
                    <td className="py-3 px-4 font-bold"><CurrencyDisplay amount={row.amount} /></td>
                    <td className="py-3 px-4 text-slate-500">{row.date}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: QUOTATIONS */}
      {activeTab === 'quotations' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold">Estimated Quotations</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Quote No.</th>
                  <th className="py-3 px-4">Specifications</th>
                  <th className="py-3 px-4">Estimated Rate</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">QUO-000042</td>
                  <td className="py-3 px-4">Panaflex Backlit Signage Board (80 sft)</td>
                  <td className="py-3 px-4">৳ 220 / sft</td>
                  <td className="py-3 px-4 font-bold"><CurrencyDisplay amount={17600} /></td>
                  <td className="py-3 px-4"><Badge variant="outline">Client Reviewing</Badge></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: INVOICES */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold">Commercial Tax Invoices (Mushak 6.3)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Invoice No.</th>
                  <th className="py-3 px-4">Mushak Ref</th>
                  <th className="py-3 px-4">Invoice Total</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">INV-000142</td>
                  <td className="py-3 px-4 font-mono text-slate-500">MUSHAK-6.3-2024-089</td>
                  <td className="py-3 px-4 font-bold"><CurrencyDisplay amount={145000} /></td>
                  <td className="py-3 px-4 text-emerald-600 font-semibold"><CurrencyDisplay amount={100000} /></td>
                  <td className="py-3 px-4 text-red-600 font-bold"><CurrencyDisplay amount={45000} /></td>
                  <td className="py-3 px-4"><Badge variant="outline" className="bg-amber-50 text-amber-800">Partial</Badge></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: PAYMENTS */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold">Money Receipts & Payment Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt No.</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Collected Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Issued By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">PAY-000095</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">Bank Transfer (City Bank)</td>
                  <td className="py-3 px-4 font-bold text-emerald-600"><CurrencyDisplay amount={100000} /></td>
                  <td className="py-3 px-4 text-slate-500">01/09/2024</td>
                  <td className="py-3 px-4">Accounts Cash Counter</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 6: DELIVERIES */}
      {activeTab === 'deliveries' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold">Delivery Challans & Gate Passes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Challan No.</th>
                  <th className="py-3 px-4">Items Delivered</th>
                  <th className="py-3 px-4">Destination Site</th>
                  <th className="py-3 px-4">Vehicle / Driver</th>
                  <th className="py-3 px-4">Sign-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">CHL-000082</td>
                  <td className="py-3 px-4">Panaflex Banners (15 pcs in rolls)</td>
                  <td className="py-3 px-4">Beximco Tejgaon Plant Facade</td>
                  <td className="py-3 px-4">Pickup Van (Dhaka Metro-Tha-11)</td>
                  <td className="py-3 px-4 text-emerald-600 font-semibold">Signed & Received</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB 7: COMMUNICATIONS */}
      {activeTab === 'comms' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Interaction Log</h3>
            <Button size="sm" onClick={() => setIsLogCommOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Log New Interaction
            </Button>
          </div>

          <div className="space-y-3">
            {communications.map((comm) => (
              <Card key={comm.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                        {comm.type.replace('_', ' ')}
                      </span>
                      <strong className="text-sm text-slate-900 dark:text-white">{comm.summary}</strong>
                    </div>
                    {comm.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">{comm.details}</p>
                    )}
                    <div className="text-[11px] text-slate-400 pt-1">
                      Logged by <strong>{comm.logged_by_name}</strong> • {comm.created_at}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: NOTES */}
      {activeTab === 'notes' && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Internal Account Notes</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {customer.notes || 'No special remarks recorded for this customer.'}
          </p>
        </Card>
      )}

      {/* MODAL: LOG COMMUNICATION */}
      <ModalDialog
        open={isLogCommOpen}
        onOpenChange={setIsLogCommOpen}
        title="Log Customer Interaction"
        description={`Record phone call, WhatsApp conversation, or site inspection for ${customer.name}.`}
      >
        <form onSubmit={handleAddCommunication} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="commType" required>Interaction Channel</Label>
            <select
              id="commType"
              value={commType}
              onChange={(e) => setCommType(e.target.value as typeof commType)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="phone_call">Phone Call (ফোন কল)</option>
              <option value="whatsapp_message">WhatsApp Message / Proof Sharing</option>
              <option value="meeting">Physical Meeting (অফিস মিটিং)</option>
              <option value="site_visit">Site Visit / Measurement (সাইট পরিমাপ)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commSummary" required>Summary Headline</Label>
            <Input
              id="commSummary"
              placeholder="e.g. Discussed 3D acrylic sign quotation and approved design"
              value={commSummary}
              onChange={(e) => setCommSummary(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commDetails">Detailed Notes</Label>
            <textarea
              id="commDetails"
              rows={3}
              placeholder="Action items, commitments made, discount agreement..."
              value={commDetails}
              onChange={(e) => setCommDetails(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsLogCommOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Save Interaction
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: RECORD PAYMENT */}
      <ModalDialog
        open={isRecordPayOpen}
        onOpenChange={setIsRecordPayOpen}
        title="Collect Payment & Issue Money Receipt"
        description={`Record customer payment for outstanding balance (৳ ${customer.total_due_balance || 0} due).`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payAmt" required>Amount (৳ BDT)</Label>
              <Input
                id="payAmt"
                type="number"
                placeholder="e.g. 45000"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payMeth">Payment Method</Label>
              <select
                id="payMeth"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option>Cash Counter</option>
                <option>bKash Merchant</option>
                <option>Nagad</option>
                <option>Bank Deposit / Cheque</option>
              </select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="payRef">Transaction / Receipt Reference</Label>
              <Input
                id="payRef"
                placeholder="e.g. MR-9921 / bKash Txn ID"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsRecordPayOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Record Payment
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: EDIT CUSTOMER */}
      <ModalDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Customer Profile"
        description={`Update contact and billing details for ${customer.name}.`}
      >
        <form onSubmit={handleSaveCustomerEdit} className="space-y-4 pt-2">
          {editError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{editError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="editName" required>Customer Name (English)</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editNameBn">গ্রাহকের নাম (বাংলা)</Label>
              <Input
                id="editNameBn"
                value={editNameBn}
                onChange={(e) => setEditNameBn(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="editMobile" required>Mobile Phone</Label>
              <Input
                id="editMobile"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editWhatsapp">WhatsApp Number</Label>
              <Input
                id="editWhatsapp"
                value={editWhatsapp}
                onChange={(e) => setEditWhatsapp(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="editContactPerson">Contact Person</Label>
              <Input
                id="editContactPerson"
                value={editContactPerson}
                onChange={(e) => setEditContactPerson(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editEmail">Email Address</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="editArea">Area / Commercial Hub</Label>
              <Input
                id="editArea"
                value={editArea}
                onChange={(e) => setEditArea(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editCreditLimit">Credit Limit (৳ BDT)</Label>
              <Input
                id="editCreditLimit"
                type="number"
                value={editCreditLimit}
                onChange={(e) => setEditCreditLimit(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editAddress">Full Address</Label>
            <Input
              id="editAddress"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editNotes">Internal Remarks & Notes</Label>
            <textarea
              id="editNotes"
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={isSavingCustomer} onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingCustomer} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

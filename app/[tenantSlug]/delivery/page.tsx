'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  MapPin,
  Users,
  Wrench,
  Package,
  ExternalLink,
  ShieldCheck,
  Camera,
  Star,
  FileCheck2,
  Send,
  Sparkles,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { FeatureGate } from '@/components/shared/feature-gate'
import {
  DeliveryChallanRecord,
  InstallationRecord,
  DeliveryMethod,
  DeliveryStatus,
  InstallationStatus,
} from '@/types/logistics.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { CustomerRecord } from '@/types/crm.types'

export default function DeliveryLogisticsPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [challans, setChallans] = useDataStore<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS, [])
  const [installations, setInstallations] = useDataStore<InstallationRecord[]>(STORAGE_KEYS.INSTALLATIONS, [])
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [viewMode, setViewMode] = useState<'challans' | 'installations' | 'calendar'>('challans')
  const [search, setSearch] = useState('')

  // Modals
  const [isNewChallanOpen, setIsNewChallanOpen] = useState(false)
  const [isNewInstallationOpen, setIsNewInstallationOpen] = useState(false)
  const [selectedChallanForDelivery, setSelectedChallanForDelivery] = useState<DeliveryChallanRecord | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  // Delivery Confirmation State
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [receiverSignature, setReceiverSignature] = useState('')

  // New Challan Form State
  const [chCustomer, setChCustomer] = useState('')
  const [chMethod, setChMethod] = useState<DeliveryMethod>('company_vehicle')
  const [chAddress, setChAddress] = useState('')
  const [chPerson, setChPerson] = useState('')
  const [chVehicle, setChVehicle] = useState('')
  const [chCost, setChCost] = useState<number>(0)
  const [chDate, setChDate] = useState(new Date().toISOString().split('T')[0])
  const [chDesc, setChDesc] = useState('')
  const [chQty, setChQty] = useState<number>(1)

  // New Installation Form State
  const [insCustomer, setInsCustomer] = useState('')
  const [insSite, setInsSite] = useState('')
  const [insLead, setInsLead] = useState('')
  const [insCrew, setInsCrew] = useState('')
  const [insEquipment, setInsEquipment] = useState('')
  const [insDate, setInsDate] = useState(new Date().toISOString().split('T')[0])
  const [insCost, setInsCost] = useState<number>(4500)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Quick Action: Confirm Delivery
  const handleConfirmDelivery = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChallanForDelivery) return

    PrintERPDataStore.updateItem<DeliveryChallanRecord>(STORAGE_KEYS.DELIVERY_CHALLANS, selectedChallanForDelivery.id, {
      status: 'delivered',
      delivered_at: 'Just now',
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      receiver_signature: receiverSignature,
      updated_at: new Date().toISOString(),
    })

    setSelectedChallanForDelivery(null)
    showNotification(
      `Challan ${selectedChallanForDelivery.challan_number} marked DELIVERED! Receiver: ${receiverName} signed.`
    )
  }

  // Quick Action: Mark Out for Delivery
  const handleMarkOutForDelivery = (challanId: string) => {
    PrintERPDataStore.updateItem<DeliveryChallanRecord>(STORAGE_KEYS.DELIVERY_CHALLANS, challanId, {
      status: 'out_for_delivery',
      updated_at: new Date().toISOString(),
    })
    showNotification('Consignment is now OUT FOR DELIVERY on vehicle.')
  }

  // Quick Action: Create Challan
  const handleCreateChallan = (e: React.FormEvent) => {
    e.preventDefault()
    const customer = customers.find((c: CustomerRecord) => c.id === chCustomer) || customers[0]
    const chNum = `CH-${Date.now().toString().slice(-4)}`

    const newCh: DeliveryChallanRecord = {
      id: `ch-${Date.now()}`,
      company_id: company?.id || 'c-01',
      challan_number: chNum,
      order_number: 'ORD-000001',
      customer_id: customer?.id || 'cust-01',
      customer_name: customer?.name || 'Walk-in Customer',
      customer_phone: customer?.mobile || '',
      delivery_address: chAddress,
      delivery_method: chMethod,
      delivery_person_name: chPerson,
      vehicle_info: chVehicle,
      transport_cost: chCost,
      scheduled_date: chDate,
      status: 'scheduled',
      created_by_name: 'Logistics Officer',
      items: [
        {
          id: `ci-${Date.now()}`,
          product_description: chDesc,
          dimensions_spec: 'Custom Specs',
          quantity: chQty,
          unit: 'piece',
          remarks: 'Inspected for damage prior to transit',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<DeliveryChallanRecord>(STORAGE_KEYS.DELIVERY_CHALLANS, newCh)
    setIsNewChallanOpen(false)
    showNotification(`Delivery Challan ${chNum} issued.`)
  }

  // Quick Action: Schedule Installation
  const handleCreateInstallation = (e: React.FormEvent) => {
    e.preventDefault()
    const customer = customers.find((c: CustomerRecord) => c.id === insCustomer) || customers[0]
    const insNum = `INS-${Date.now().toString().slice(-4)}`

    const newIns: InstallationRecord = {
      id: `ins-${Date.now()}`,
      company_id: company?.id || 'c-01',
      installation_number: insNum,
      order_number: 'ORD-000001',
      customer_id: customer?.id || 'cust-01',
      customer_name: customer?.name || 'Walk-in Customer',
      site_location: insSite,
      installer_lead_name: insLead,
      crew_members: insCrew.split(',').map((s) => s.trim()),
      installation_date: insDate,
      scheduled_time: '10:00 AM - 03:00 PM',
      status: 'scheduled',
      transport_cost: 1500,
      labor_cost: insCost,
      equipment_used: insEquipment,
      site_photos: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<InstallationRecord>(STORAGE_KEYS.INSTALLATIONS, newIns)
    setIsNewInstallationOpen(false)
    showNotification(`Installation job ${insNum} scheduled at ${insSite}.`)
  }

  // Executive Metrics
  const countScheduledToday = challans.filter(
    (ch: DeliveryChallanRecord) => ch.scheduled_date === new Date().toISOString().split('T')[0]
  ).length
  const countOutForDelivery = challans.filter((ch: DeliveryChallanRecord) => ch.status === 'out_for_delivery').length
  const countActiveInstallations = installations.filter(
    (ins: InstallationRecord) => ins.status === 'on_site' || ins.status === 'scheduled'
  ).length
  const countDelivered = challans.filter((ch: DeliveryChallanRecord) => ch.status === 'delivered').length

  const getMethodBadge = (method: DeliveryMethod) => {
    switch (method) {
      case 'company_vehicle':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Company Vehicle
          </span>
        )
      case 'courier':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Courier Service
          </span>
        )
      case 'local_transport':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            Local Hired Transport
          </span>
        )
      case 'customer_pickup':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
            Customer Self-Pickup
          </span>
        )
    }
  }

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Delivered
          </span>
        )
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
            <Truck className="h-3 w-3 text-blue-600" /> Out for Delivery
          </span>
        )
      case 'assigned':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            Vehicle Assigned
          </span>
        )
      case 'scheduled':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            Scheduled
          </span>
        )
    }
  }

  const getInstallationStatusBadge = (status: InstallationStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Completed & Signed
          </span>
        )
      case 'on_site':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
            <Wrench className="h-3 w-3 text-purple-600" /> On Site Fitting
          </span>
        )
      case 'scheduled':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Crew Scheduled
          </span>
        )
    }
  }

  return (
    <FeatureGate feature="delivery_challan">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
      <PageHeader
        titleEn="Delivery, Logistics & On-Site Installation"
        titleBn="ডেলিভারি চালান ও অন-সাইট ইনস্টলেশন"
        descriptionEn="Track multi-method dispatches, printable delivery challans, and on-site rigging crew installations."
        descriptionBn="মাল ডেলিভারি চালানপত্র, কুরিয়ার ট্র্যাকিং এবং সাইট ফিটিং ও সাইনেজ স্থাপন পরিচালনা করুন।"
        icon={Truck}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNewInstallationOpen(true)}
              className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 bangla-text"
            >
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Schedule Installation', 'ইনস্টলেশন শিডিউল')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewChallanOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs text-white bangla-text"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Delivery Challan', 'নতুন ডেলিভারি চালান')}
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

      {/* Executive Logistics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-600">
          <span className="text-xs font-semibold text-slate-500">Scheduled Today</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{countScheduledToday} Dispatches</div>
          <span className="text-[11px] text-slate-400">Loading at factory dock</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Out for Delivery (চলমান)</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{countOutForDelivery} Vans / Trucks</div>
          <span className="text-[11px] text-amber-600 font-medium">In transit to site</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-600">
          <span className="text-xs font-semibold text-slate-500">On-Site Installations</span>
          <div className="text-2xl font-black text-purple-600 mt-1">{countActiveInstallations} Sites</div>
          <span className="text-[11px] text-purple-600 font-medium">Rigging & electrical crews</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold text-slate-500">Successfully Delivered</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{countDelivered} Jobs</div>
          <span className="text-[11px] text-emerald-600 font-medium">Receiver signatures verified</span>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={viewMode === 'challans' ? 'default' : 'ghost'}
            onClick={() => setViewMode('challans')}
            className={`text-xs h-8 px-3.5 ${
              viewMode === 'challans' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Truck className="h-3.5 w-3.5 mr-1.5" />
            Challan Deliveries (চালান সমূহ)
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'installations' ? 'default' : 'ghost'}
            onClick={() => setViewMode('installations')}
            className={`text-xs h-8 px-3.5 ${
              viewMode === 'installations' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            On-Site Installations (ফিটিং)
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() => setViewMode('calendar')}
            className={`text-xs h-8 px-3.5 ${
              viewMode === 'calendar' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Dispatch Calendar (ক্যালেন্ডার)
          </Button>
        </div>

        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by challan #, customer, or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: CHALLAN DELIVERIES TABLE
         ========================================================================= */}
      {viewMode === 'challans' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Delivery Challans & Dispatches ({challans.length})</CardTitle>
              <span className="text-xs text-slate-400">Transit slips with receiver verification</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Challan #</th>
                    <th className="py-3 px-4">Customer & Destination</th>
                    <th className="py-3 px-4">Delivery Method</th>
                    <th className="py-3 px-4">Vehicle / Consignment</th>
                    <th className="py-3 px-4">Scheduled Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {challans.map((ch: DeliveryChallanRecord) => (
                    <tr key={ch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      {/* Challan # */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/${slug}/delivery/${ch.id}`}
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group"
                        >
                          <span>{ch.challan_number}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{ch.order_number}</div>
                      </td>

                      {/* Customer & Address */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {ch.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[220px]">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{ch.delivery_address}</span>
                        </div>
                      </td>

                      {/* Delivery Method */}
                      <td className="py-3.5 px-4">
                        {getMethodBadge(ch.delivery_method)}
                      </td>

                      {/* Vehicle */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {ch.vehicle_info || 'Factory Pickup'}
                        </div>
                        <div className="text-[10px] text-slate-400">{ch.delivery_person_name}</div>
                      </td>

                      {/* Scheduled Date */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {ch.scheduled_date}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getDeliveryStatusBadge(ch.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/${slug}/delivery/${ch.id}`}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                          >
                            Challan PDF
                          </Link>

                          {ch.status === 'scheduled' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkOutForDelivery(ch.id)}
                              className="h-7 text-[11px] px-2 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Dispatch Van
                            </Button>
                          )}

                          {ch.status === 'out_for_delivery' && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedChallanForDelivery(ch)}
                              className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              Confirm Delivery
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {challans.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {tBilingual('No delivery challans found.', 'কোন ডেলিভারি চালান পাওয়া যায়নি।')}
                </div>
              ) : (
                challans.map((ch: DeliveryChallanRecord) => (
                  <div key={ch.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Top: Challan # & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/${slug}/delivery/${ch.id}`}
                        className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>{ch.challan_number}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                      {getDeliveryStatusBadge(ch.status)}
                    </div>

                    {/* Customer & Address */}
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{ch.customer_name}</div>
                      <div className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span>{ch.delivery_address}</span>
                      </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Method</span>
                        <div className="mt-0.5">{getMethodBadge(ch.delivery_method)}</div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Scheduled Date</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{ch.scheduled_date}</span>
                      </div>
                      {ch.vehicle_info && (
                        <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          Vehicle: <strong className="font-mono text-slate-800 dark:text-slate-200">{ch.vehicle_info}</strong>
                          {ch.delivery_person_name && <span> ({ch.delivery_person_name})</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        href={`/${slug}/delivery/${ch.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 min-h-[36px]"
                      >
                        Challan PDF
                      </Link>

                      {ch.status === 'scheduled' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkOutForDelivery(ch.id)}
                          className="h-9 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                          Dispatch Van
                        </Button>
                      )}

                      {ch.status === 'out_for_delivery' && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedChallanForDelivery(ch)}
                          className="h-9 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          Confirm Delivery
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          VIEW 2: ON-SITE INSTALLATIONS TABLE
         ========================================================================= */}
      {viewMode === 'installations' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">On-Site Signage Installations ({installations.length})</CardTitle>
              <span className="text-xs text-slate-400">Field rigging, crane hookups, and customer sign-offs</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Installation #</th>
                    <th className="py-3 px-4">Customer & Site Location</th>
                    <th className="py-3 px-4">Crew Lead & Riggers</th>
                    <th className="py-3 px-4">Scheduled Window</th>
                    <th className="py-3 px-4">Equipment Used</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Customer Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {installations.map((ins: InstallationRecord) => (
                    <tr key={ins.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      {/* Installation # */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          {ins.installation_number}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{ins.order_number}</div>
                      </td>

                      {/* Customer & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {ins.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{ins.site_location}</span>
                        </div>
                      </td>

                      {/* Crew */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {ins.installer_lead_name}
                        </div>
                        <div className="text-[10px] text-slate-400">+{ins.crew_members.length} technicians</div>
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div>{ins.installation_date}</div>
                        <div className="text-[10px] text-slate-400">{ins.scheduled_time}</div>
                      </td>

                      {/* Equipment */}
                      <td className="py-3.5 px-4 text-xs truncate max-w-[180px] text-slate-600 dark:text-slate-300">
                        {ins.equipment_used || 'Standard Hand Tools'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getInstallationStatusBadge(ins.status)}
                      </td>

                      {/* Confirmation */}
                      <td className="py-3.5 px-4 text-xs">
                        {ins.customer_confirmed_by ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200">
                              <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Sign-Off Verified
                            </span>
                            <div className="text-[10px] text-slate-500">{ins.customer_confirmed_by}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Pending site sign-off</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {installations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {tBilingual('No installation jobs found.', 'কোন ইনস্টলেশন কাজ পাওয়া যায়নি।')}
                </div>
              ) : (
                installations.map((ins: InstallationRecord) => (
                  <div key={ins.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Top: Installation # & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                        {ins.installation_number}
                      </span>
                      {getInstallationStatusBadge(ins.status)}
                    </div>

                    {/* Customer & Location */}
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{ins.customer_name}</div>
                      <div className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span>{ins.site_location}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Lead Tech</span>
                        <strong className="text-slate-800 dark:text-slate-200">{ins.installer_lead_name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date & Window</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{ins.installation_date}</span>
                      </div>
                      {ins.equipment_used && (
                        <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          Gear: <span>{ins.equipment_used}</span>
                        </div>
                      )}
                    </div>

                    {/* Sign-off badge if present */}
                    {ins.customer_confirmed_by && (
                      <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs border border-emerald-200">
                        <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                        <span>Signed off by: <strong>{ins.customer_confirmed_by}</strong></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          VIEW 3: DELIVERY & INSTALLATION CALENDAR
         ========================================================================= */}
      {viewMode === 'calendar' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Logistics & Field Dispatch Agenda (চলতি সপ্তাহ)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consolidated schedule view of outgoing delivery transit vans and on-site fitting jobs.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Delivery Runs
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-purple-50 text-purple-800 border border-purple-200">
                <span className="h-2 w-2 rounded-full bg-purple-600" /> Site Installations
              </span>
            </div>
          </div>

          {/* Agenda Days */}
          <div className="space-y-4">
            {(() => {
              const dates = Array.from(
                new Set([
                  ...challans.map((ch: DeliveryChallanRecord) => ch.scheduled_date).filter(Boolean),
                  ...installations.map((ins: InstallationRecord) => ins.installation_date).filter(Boolean),
                ])
              ).sort()

              if (dates.length === 0) {
                return (
                  <div className="p-10 text-center text-slate-500 text-xs">
                    No scheduled deliveries or installations found in this period.
                  </div>
                )
              }

              return dates.map((dateStr) => {
                const dayChallans = challans.filter((ch: DeliveryChallanRecord) => ch.scheduled_date === dateStr)
                const dayInstallations = installations.filter((ins: InstallationRecord) => ins.installation_date === dateStr)

                return (
                  <div key={dateStr} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        📅 {dateStr}
                      </span>
                      <span className="text-slate-400">
                        {dayChallans.length} Deliveries • {dayInstallations.length} Installations
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Deliveries */}
                      {dayChallans.map((ch: DeliveryChallanRecord) => (
                        <div key={ch.id} className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900 space-y-1 text-xs">
                          <div className="flex justify-between font-bold">
                            <span className="text-blue-600 font-mono">{ch.challan_number}</span>
                            <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800">
                              {ch.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{ch.customer_name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{ch.delivery_address}</div>
                        </div>
                      ))}

                      {/* Installations */}
                      {dayInstallations.map((ins: InstallationRecord) => (
                        <div key={ins.id} className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-purple-200 dark:border-purple-900 space-y-1 text-xs">
                          <div className="flex justify-between font-bold">
                            <span className="text-purple-600 font-mono">{ins.installation_number}</span>
                            <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-800">
                              {ins.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{ins.customer_name}</div>
                          <div className="text-[11px] text-slate-500 truncate">📍 {ins.site_location}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Lead: {ins.installer_lead_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </Card>
      )}

      {/* MODAL: CONFIRM DELIVERY SIGN-OFF */}
      <ModalDialog
        open={Boolean(selectedChallanForDelivery)}
        onOpenChange={(open) => !open && setSelectedChallanForDelivery(null)}
        title="Record Final Delivery Sign-Off"
        description="Verify goods handed over to the client representative on site."
      >
        {selectedChallanForDelivery && (
          <form onSubmit={handleConfirmDelivery} className="space-y-4 pt-1">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
              <span className="text-blue-700 dark:text-blue-300 font-bold">Challan: </span>
              <strong>{selectedChallanForDelivery.challan_number}</strong> ({selectedChallanForDelivery.customer_name})
              <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                Destination: {selectedChallanForDelivery.delivery_address}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rcvName" required>Receiver Full Name</Label>
                <Input
                  id="rcvName"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rcvPhone" required>Receiver Mobile Number</Label>
                <Input
                  id="rcvPhone"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rcvSig" required>Receiver Signature / Acknowledgement</Label>
              <Input
                id="rcvSig"
                placeholder="e.g. Received by Md. Zahid Hassan (Official Store Seal)"
                value={receiverSignature}
                onChange={(e) => setReceiverSignature(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setSelectedChallanForDelivery(null)} className="w-full sm:w-auto min-h-[40px]">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Confirm Delivery & Archive Challan
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* MODAL: GENERATE DELIVERY CHALLAN */}
      <ModalDialog
        open={isNewChallanOpen}
        onOpenChange={setIsNewChallanOpen}
        title="Generate New Delivery Challan (চালানপত্র)"
        description="Dispatch printed products or signage structures to the customer site."
      >
        <form onSubmit={handleCreateChallan} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="chCust" required>Customer</Label>
              <select
                id="chCust"
                value={chCustomer}
                onChange={(e) => {
                  setChCustomer(e.target.value)
                  const found = customers.find((c: CustomerRecord) => c.id === e.target.value)
                  if (found) setChAddress(found.address || '')
                }}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="">Select customer...</option>
                {customers.map((c: CustomerRecord) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customer_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chMeth" required>Delivery Method</Label>
              <select
                id="chMeth"
                value={chMethod}
                onChange={(e) => setChMethod(e.target.value as DeliveryMethod)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="company_vehicle">Company Vehicle (Pickup/Van)</option>
                <option value="courier">Courier (Sundarban / SA Paribahan)</option>
                <option value="local_transport">Local Transport (CNG / Hired Truck)</option>
                <option value="customer_pickup">Customer Self-Pickup</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chAddr" required>Delivery Site Address</Label>
            <Input
              id="chAddr"
              value={chAddress}
              onChange={(e) => setChAddress(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="chVeh">Vehicle Number / Courier Consignment</Label>
              <Input
                id="chVeh"
                placeholder="e.g. Dhaka Metro-Tha 11-4829 or SBN-9948102"
                value={chVehicle}
                onChange={(e) => setChVehicle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chDr">Driver / Delivery Person</Label>
              <Input
                id="chDr"
                placeholder="e.g. Selim Mia (01711998877)"
                value={chPerson}
                onChange={(e) => setChPerson(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chPrd" required>Product Description</Label>
            <Input
              id="chPrd"
              value={chDesc}
              onChange={(e) => setChDesc(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="chQ" required>Quantity</Label>
              <Input
                id="chQ"
                type="number"
                min="1"
                value={chQty}
                onChange={(e) => setChQty(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chCst">Transport Cost (৳)</Label>
              <Input
                id="chCst"
                type="number"
                value={chCost}
                onChange={(e) => setChCost(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chDt" required>Scheduled Date</Label>
              <Input
                id="chDt"
                type="date"
                value={chDate}
                onChange={(e) => setChDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewChallanOpen(false)} className="w-full sm:w-auto min-h-[40px]">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Issue Delivery Challan
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: SCHEDULE INSTALLATION */}
      <ModalDialog
        open={isNewInstallationOpen}
        onOpenChange={setIsNewInstallationOpen}
        title="Schedule On-Site Signage Installation"
        description="Deploy rigging technicians, cranes, and safety gear to the client installation site."
      >
        <form onSubmit={handleCreateInstallation} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="insCust" required>Customer</Label>
              <select
                id="insCust"
                value={insCustomer}
                onChange={(e) => setInsCustomer(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="">Select customer...</option>
                {customers.map((c: CustomerRecord) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customer_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="insDate" required>Installation Date</Label>
              <Input
                id="insDate"
                type="date"
                value={insDate}
                onChange={(e) => setInsDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insSite" required>Site Address & Mounting Location</Label>
            <Input
              id="insSite"
              placeholder="e.g. 19 Dhanmondi R/A, Road 7 (Main Entrance Facade)"
              value={insSite}
              onChange={(e) => setInsSite(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="insLead" required>Lead Technician</Label>
              <Input
                id="insLead"
                value={insLead}
                onChange={(e) => setInsLead(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="insCrew">Crew Members (comma separated)</Label>
              <Input
                id="insCrew"
                value={insCrew}
                onChange={(e) => setInsCrew(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insEq">Required Safety Gear & Rigging Equipment</Label>
            <Input
              id="insEq"
              placeholder="e.g. Scaffolding, Safety Harness Belts, Heavy Power Drill, Crane"
              value={insEquipment}
              onChange={(e) => setInsEquipment(e.target.value)}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewInstallationOpen(false)} className="w-full sm:w-auto min-h-[40px]">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto min-h-[40px] bg-purple-600 hover:bg-purple-700 text-white font-bold">
              Dispatch Installation Team
            </Button>
          </div>
        </form>
      </ModalDialog>
      </div>
    </FeatureGate>
  )
}

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
 Calculator,
 Plus,
 Search,
 CheckCircle2,
 AlertTriangle,
 Clock,
 TrendingUp,
 DollarSign,
 ShieldAlert,
 Percent,
 Layers,
 Sparkles,
 Eye,
 ExternalLink,
 ChevronRight,
 TrendingDown,
 Download,
 Filter,
 ShoppingBag,
 Wrench,
 Truck,
 RotateCcw,
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
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { JobCostingRecord, CostHeads, calculateNegotiationMargin } from '@/types/costing.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  getCostingsAction,
  createCostingAction,
  updateCostingAction,
} from '@/actions/costing.actions'
import { FeatureGate } from '@/components/subscriptions/feature-gate'

// Bangladeshi printing industry seed templates for instant costing
const INDUSTRY_PRESETS = [
  {
 id: 'panaflex',
 nameEn: 'Outdoor Panaflex Billboard',
 nameBn: 'আউটডোর পানাফ্লেক্স বিলবোর্ড',
 title: 'Outdoor Panaflex Banner with Frame & Eyelets',
 specs: '20ft × 10ft (200 sqft) • 440 GSM Star Flex • Konica 512i',
 selling: 48000,
 heads: {
 material_cost: 12000,
 ink_cost: 2800,
 machine_cost: 1600,
 printing_cost: 0,
 finishing_cost: 1400,
 labor_cost: 3500,
 fabrication_cost: 6500,
 installation_cost: 4000,
 transport_cost: 1500,
 other_cost: 1200,
    },
  },
  {
 id: 'acrylic_3d',
 nameEn: '3D Acrylic LED Channel Letter Signboard',
 nameBn: 'থ্রিডি অ্যাক্রিলিক এলইডি সাইনবোর্ড',
 title: '3D Acrylic Backlit Golden Mirror Signboard',
 specs: '16ft × 4ft (64 sqft) • 5mm Cast Acrylic • Samsung LED • Meanwell SMPS',
 selling: 85000,
 heads: {
 material_cost: 24000,
 ink_cost: 800,
 machine_cost: 3200,
 printing_cost: 0,
 finishing_cost: 2500,
 labor_cost: 8000,
 fabrication_cost: 14000,
 installation_cost: 6500,
 transport_cost: 2000,
 other_cost: 2000,
    },
  },
  {
 id: 'offset_catalog',
 nameEn: '4-Color Offset Catalog / Brochure',
 nameBn: '৪-রঙা অফসেট ক্যাটালগ ও ব্রোশিউর',
 title: 'Annual Product Catalog 2026 (64 Pages, Hardcover)',
 specs: '1,000 Copies • A4 • Inner 150 GSM Art Paper • Cover 300 GSM Art Card',
 selling: 165000,
 heads: {
 material_cost: 68000,
 ink_cost: 9500,
 machine_cost: 18000,
 printing_cost: 0,
 finishing_cost: 14500,
 labor_cost: 11000,
 fabrication_cost: 0,
 installation_cost: 0,
 transport_cost: 2500,
 other_cost: 3500,
    },
  },
  {
 id: 'die_cut_boxes',
 nameEn: 'Die-Cut Duplex Packaging Boxes',
 nameBn: 'ডাই-কাট ডুপ্লেক্স প্যাকেজিং বক্স',
 title: 'Corrugated Die-Cut Master Packaging Boxes',
 specs: '5,000 Pcs • 350 GSM Duplex + E-Flute • 4-Color Flexo & Die-Cut',
 selling: 195000,
 heads: {
 material_cost: 105000,
 ink_cost: 12000,
 machine_cost: 16000,
 printing_cost: 0,
 finishing_cost: 14000,
 labor_cost: 12000,
 fabrication_cost: 0,
 installation_cost: 0,
 transport_cost: 5000,
 other_cost: 4000,
    },
  },
  {
 id: 'vehicle_wrap',
 nameEn: 'Fleet Vehicle Branding Cast Vinyl Wrap',
 nameBn: 'গাড়ি ব্র্যান্ডিং কাস্ট ভিনাইল র‍্যাপ',
 title: 'Fleet Covered Van Cast Vinyl Wrap Branding',
 specs: '4 Covered Vans (14ft) • 3M Cast Vinyl + Gloss Overlam • Latex 1200 DPI',
 selling: 112000,
 heads: {
 material_cost: 48000,
 ink_cost: 9000,
 machine_cost: 6000,
 printing_cost: 0,
 finishing_cost: 4500,
 labor_cost: 14000,
 fabrication_cost: 0,
 installation_cost: 0,
 transport_cost: 1500,
 other_cost: 2000,
    },
  },
]

const INITIAL_COSTING_SEEDS: JobCostingRecord[] = []

export default function JobCostingPage() {
 const params = useParams()
 const router = useRouter()
 const pathname = usePathname()
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

 const [mounted, setMounted] = useState(false)
 useEffect(() => {
 setMounted(true)
  }, [])

 const [storedCostings, setStoredCostings] = useDataStore<JobCostingRecord[]>(
 STORAGE_KEYS.JOB_COSTINGS,
    []
  )

  // Synchronize authoritative costings from PostgreSQL database
 useEffect(() => {
 if (!company?.id) return
 getCostingsAction(company.id)
      .then((res) => {
 if (res.success && Array.isArray(res.data) && res.data.length > 0) {
 const serverItems = res.data
 const map = new Map<string, JobCostingRecord>()
 serverItems.forEach((item) => map.set(item.id, item))
 storedCostings.forEach((item) => {
 if (!map.has(item.id)) map.set(item.id, item)
            })
 setStoredCostings(Array.from(map.values()))
          }
      })
      .catch(() => {})
  }, [company?.id])

 const costings = useMemo(() => {
 return storedCostings || []
  }, [storedCostings])

 const [search, setSearch] = useState('')
 const [statusFilter, setStatusFilter] = useState<string>('all')

  // Role Shielding State: Allows previewing
  const [isSalesRoleShielded, setIsSalesRoleShielded] = useState<boolean>(false)

  // Negotiation Simulator State
 const [negotiatingJob, setNegotiatingJob] = useState<JobCostingRecord | null>(null)
 const [discountPercent, setDiscountPercent] = useState<number>(5)

  // Record Actuals State (Full 9-head audit)
 const [editingJob, setEditingJob] = useState<JobCostingRecord | null>(null)
 const [actHeads, setActHeads] = useState<{
 material_cost: number
 ink_cost: number
 machine_cost: number
 printing_cost: number
 finishing_cost: number
 labor_cost: number
 fabrication_cost: number
 installation_cost: number
 transport_cost: number
 other_cost: number
  }>({
 material_cost: 0,
 ink_cost: 0,
 machine_cost: 0,
 printing_cost: 0,
 finishing_cost: 0,
 labor_cost: 0,
 fabrication_cost: 0,
 installation_cost: 0,
 transport_cost: 0,
 other_cost: 0,
  })

  // New Job Costing Modal State
 const [isNewCostingOpen, setIsNewCostingOpen] = useState(false)
 const [newJobNumber, setNewJobNumber] = useState(`JOB-${Math.floor(1000 + Math.random() * 9000)}`)
 const [newCustomerName, setNewCustomerName] = useState('')
 const [newItemTitle, setNewItemTitle] = useState('')
 const [newSpecs, setNewSpecs] = useState('')
 const [newSellingPrice, setNewSellingPrice] = useState<number>(50000)
 const [newEstHeads, setNewEstHeads] = useState<{
 material_cost: number
 ink_cost: number
 machine_cost: number
 printing_cost: number
 finishing_cost: number
 labor_cost: number
 fabrication_cost: number
 installation_cost: number
 transport_cost: number
 other_cost: number
  }>({
 material_cost: 15000,
 ink_cost: 3000,
 machine_cost: 2000,
 printing_cost: 0,
 finishing_cost: 1500,
 labor_cost: 4000,
 fabrication_cost: 3000,
 installation_cost: 2500,
 transport_cost: 1500,
 other_cost: 1000,
  })

 const [notification, setNotification] = useState<string | null>(null)

 const showNotification = (msg: string) => {
 setNotification(msg)
 setTimeout(() => setNotification(null), 3500)
  }

  // Filtered Costings
 const filteredCostings = useMemo(() => {
 return costings.filter((c: JobCostingRecord) => {
 const matchesSearch =
 c.job_number.toLowerCase().includes(search.toLowerCase()) ||
 c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
 c.item_title.toLowerCase().includes(search.toLowerCase())

 if (!matchesSearch) return false

 if (statusFilter === 'in_production') return c.status === 'in_production'
 if (statusFilter === 'actualized') return c.status === 'actualized'
 if (statusFilter === 'overrun') return c.status === 'actualized' && (c.variances?.total_variance || 0) > 0
 if (statusFilter === 'saved') return c.status === 'actualized' && (c.variances?.total_variance || 0) < 0

 return true
    })
  }, [costings, search, statusFilter])

  // Executive Profitability Metrics
 const completedJobs = costings.filter((c: JobCostingRecord) => c.status === 'actualized')
 const totalRevenue = completedJobs.reduce((acc: number, c: JobCostingRecord) => acc + c.selling_price, 0)
 const totalActualCost = completedJobs.reduce((acc: number, c: JobCostingRecord) => acc + (c.act?.total_cost || c.est?.total_cost || 0), 0)
 const totalActualProfit = totalRevenue - totalActualCost
 const avgMargin = totalRevenue > 0 ? (totalActualProfit / totalRevenue) * 100 : 0
 const overrunJobsCount = completedJobs.filter((c: JobCostingRecord) => (c.variances?.total_variance || 0) > 0).length
 const totalSavings = completedJobs
    .filter((c: JobCostingRecord) => (c.variances?.total_variance || 0) < 0)
    .reduce((acc: number, c: JobCostingRecord) => acc + Math.abs(c.variances?.total_variance || 0), 0)

  // Handle Preset Selection for New Costing
 const handleApplyPreset = (presetId: string) => {
 const preset = INDUSTRY_PRESETS.find((p) => p.id === presetId)
 if (!preset) return
 setNewItemTitle(preset.title)
 setNewSpecs(preset.specs)
 setNewSellingPrice(preset.selling)
 setNewEstHeads({ ...preset.heads })
  }

  // Calculated New Costing Values
 const newTotalEstCost = Object.values(newEstHeads).reduce((a, b) => a + b, 0)
 const newEstProfit = newSellingPrice - newTotalEstCost
 const newEstMargin = newSellingPrice > 0 ? Number(((newEstProfit / newSellingPrice) * 100).toFixed(1)) : 0

  // Handle Create New Job Costing
 const handleCreateCosting = (e: React.FormEvent) => {
 e.preventDefault()
 if (!newCustomerName.trim() || !newItemTitle.trim()) {
 showNotification('Please provide Customer Name and Job Description.')
 return
    }

 const newRecord: JobCostingRecord = {
 id: `cst-${Date.now()}`,
 company_id: company?.id || '',
 job_number: newJobNumber.trim() || `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
 customer_id: `cust-${Date.now()}`,
 customer_name: newCustomerName.trim(),
 item_title: newItemTitle.trim(),
 dimensions_spec: newSpecs.trim() || 'Custom Print & Finishing Specs',
 quantity: 1,
 unit: 'pcs',
 selling_price: newSellingPrice,
 est: {
        ...newEstHeads,
 total_cost: newTotalEstCost,
 profit: newEstProfit,
 margin_percentage: newEstMargin,
      },
 act: {
 material_cost: 0,
 ink_cost: 0,
 machine_cost: 0,
 printing_cost: 0,
 finishing_cost: 0,
 labor_cost: 0,
 fabrication_cost: 0,
 installation_cost: 0,
 transport_cost: 0,
 other_cost: 0,
 total_cost: 0,
 profit: 0,
 margin_percentage: 0,
      },
 variances: {
 material_variance: 0,
 machine_variance: 0,
 labor_variance: 0,
 finishing_variance: 0,
 transport_variance: 0,
 total_variance: 0,
      },
 costing_snapshot: {},
 labor_cost_mode: 'hourly',
 status: 'in_production',
 notes: 'Job costing sheet initialized from workshop cost calculator.',
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
    }

 const updatedList = [newRecord, ...costings]
 setStoredCostings(updatedList)
 PrintERPDataStore.addItem(STORAGE_KEYS.JOB_COSTINGS, newRecord)
 createCostingAction(newRecord, company?.id).catch((e) =>
 console.warn('[Costing] Server create sync failed:', e)
 )

 setIsNewCostingOpen(false)
 setNewJobNumber(`JOB-${Math.floor(1000 + Math.random() * 9000)}`)
 setNewCustomerName('')
 setNewItemTitle('')
 setNewSpecs('')
 showNotification(`Job Costing ${newRecord.job_number} created and dispatched to production.`)
  }

  // Handle Save Full 9-Head Actuals
 const handleSaveActuals = (e: React.FormEvent) => {
 e.preventDefault()
 if (!editingJob) return

 const newTotalActCost =
 actHeads.material_cost +
 actHeads.ink_cost +
 actHeads.machine_cost +
 actHeads.printing_cost +
 actHeads.finishing_cost +
 actHeads.labor_cost +
 actHeads.fabrication_cost +
 actHeads.installation_cost +
 actHeads.transport_cost +
 actHeads.other_cost

 const newProfit = editingJob.selling_price - newTotalActCost
 const newMargin = editingJob.selling_price > 0 ? (newProfit / editingJob.selling_price) * 100 : 0

 const matVar = actHeads.material_cost - editingJob.est.material_cost
 const macVar = actHeads.machine_cost - editingJob.est.machine_cost
 const labVar = actHeads.labor_cost - editingJob.est.labor_cost
 const finVar = actHeads.finishing_cost - editingJob.est.finishing_cost
 const trVar = actHeads.transport_cost - editingJob.est.transport_cost
 const totVar = newTotalActCost - editingJob.est.total_cost

 const updatedCosting: JobCostingRecord = {
      ...editingJob,
 status: 'actualized',
 act: {
        ...actHeads,
 total_cost: newTotalActCost,
 profit: newProfit,
 margin_percentage: Number(newMargin.toFixed(1)),
      },
 variances: {
 material_variance: matVar,
 machine_variance: macVar,
 labor_variance: labVar,
 finishing_variance: finVar,
 transport_variance: trVar,
 total_variance: totVar,
      },
 updated_at: new Date().toISOString(),
    }

 const updatedList = costings.map((c) => (c.id === editingJob.id ? updatedCosting : c))
 setStoredCostings(updatedList)
 PrintERPDataStore.updateItem<JobCostingRecord>(STORAGE_KEYS.JOB_COSTINGS, editingJob.id, updatedCosting)
 updateCostingAction(editingJob.id, updatedCosting, company?.id).catch((e) =>
 console.warn('[Costing] Server update sync failed:', e)
 )

 setEditingJob(null)
 showNotification(`9-Head actual costs and post-production variance finalized for ${editingJob.job_number}.`)
  }

  // Export Costing Ledger to Excel CSV
 const handleExportCSV = () => {
 if (filteredCostings.length === 0) {
 showNotification('No costing records to export.')
 return
    }

 const headers = [
      'Job Number',
      'Customer',
      'Job Title',
      'Dimensions & Specs',
      'Selling Price (BDT)',
      'Est Material',
      'Est Ink',
      'Est Machine Power',
      'Est Finishing',
      'Est Labor',
      'Est Fabrication',
      'Est Installation',
      'Est Transport',
      'Est Other',
      'Total Est Cost (BDT)',
      'Est Margin %',
      'Total Act Cost (BDT)',
      'Act Margin %',
      'Total Variance (BDT)',
      'Variance Status',
      'Status',
    ]

 const rows = filteredCostings.map((c) => {
 const varStatus =
 c.status !== 'actualized'
          ? 'In Production'
          : (c.variances?.total_variance || 0) < 0
          ? `Saved ${Math.abs(c.variances?.total_variance || 0)}`
          : (c.variances?.total_variance || 0) > 0
          ? `Overrun +${c.variances?.total_variance}`
          : 'On Budget'

 return [
        `"${c.job_number}"`,
        `"${c.customer_name.replace(/"/g, '""')}"`,
        `"${c.item_title.replace(/"/g, '""')}"`,
        `"${(c.dimensions_spec || '').replace(/"/g, '""')}"`,
 c.selling_price,
 c.est.material_cost,
 c.est.ink_cost,
 c.est.machine_cost,
 c.est.finishing_cost,
 c.est.labor_cost,
 c.est.fabrication_cost,
 c.est.installation_cost,
 c.est.transport_cost,
 c.est.other_cost,
 c.est.total_cost,
        `${c.est.margin_percentage}%`,
 c.status === 'actualized' ? c.act.total_cost : '',
 c.status === 'actualized' ? `${c.act.margin_percentage}%` : '',
 c.status === 'actualized' ? c.variances?.total_variance : '',
        `"${varStatus}"`,
        `"${c.status}"`,
      ]
    })

 const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
 const url = URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.href = url
 link.download = `PrintERP_Job_Costings_${new Date().toISOString().split('T')[0]}.csv`
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
 URL.revokeObjectURL(url)
 showNotification('Job Costing ledger exported to CSV successfully.')
  }

  // Negotiation Simulation Data
 const negotiationResult = negotiatingJob
    ? calculateNegotiationMargin(
 negotiatingJob.selling_price,
 negotiatingJob.status === 'actualized' ? negotiatingJob.act.total_cost : negotiatingJob.est.total_cost,
 discountPercent
      )
    : null

 if (!mounted) {
 return (
      <div className="space-y-6 max-w-7xl pb-20 animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-1/3"/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-xl"/>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl"/>
      </div>
    )
  }

 return (
    <PanelAccessGuard
 module="reports"action="view"panelTitle="Job Costing & Profitability Engine"panelTitleBn="কস্টিং ও লাভ-মার্জিন ইঞ্জিন">
      <FeatureGate feature="job_costing">
        <div className="space-y-6 max-w-7xl pb-20">
        {/* Header with Cross-Module Navigation */}
        <PageHeader
 titleEn="Job Costing"titleBn="কস্টিং ও লাভ-মার্জিন ইঞ্জিন"descriptionEn="9-head cost tracking, pre vs post-production variance audits, and sensitive cost shielding during price negotiations."descriptionBn="৯টি খাতে ব্যয় ট্র্যাকিং, উৎপাদন-পূর্ব ও পরবর্তী খরচের তুলনা এবং দরদামের সময় গোপন ব্যয় সুরক্ষা।"icon={Calculator}
 iconColor="text-emerald-600"actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
 variant="outline"size="sm"onClick={handleExportCSV}
 className="gap-1.5">
                <Download className="w-3.5 h-3.5"/>
                <span>{tBilingual('Export CSV', 'এক্সপোর্ট')}</span>
              </Button>

              <Button
 size="sm"onClick={() => setIsNewCostingOpen(true)}
 className="gap-1.5">
                <Plus className="w-4 h-4"/>
                <span>{tBilingual('+ New Costing', '+ কস্টিং গণনা')}</span>
              </Button>
            </div>
          }
        />

        {/* Notification Toast */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0"/>
            <span>{notification}</span>
          </div>
        )}

        {/* Executive Profitability Intelligence Cards */}
        <KpiGrid columns={4}>
          <KpiCard
 titleEn="Average Realized Margin"titleBn="গড় অর্জিত মার্জিন"value={isSalesRoleShielded ? '•••• %' : `${avgMargin.toFixed(1)}%`}
 icon={TrendingUp}
 colorVariant="emerald"badge="Target > 25%"badgeColor="emerald"subtitleEn={`Across ${completedJobs.length} completed production runs`}
 subtitleBn={`${completedJobs.length}টি সম্পন্ন কাজের হিসাব`}
          />
          <KpiCard
 titleEn="Realized Job Profit"titleBn="মোট অর্জিত লাভ"value={isSalesRoleShielded ? '••••••' : totalActualProfit}
 isCurrency={!isSalesRoleShielded}
 icon={DollarSign}
 colorVariant="blue"badge="Audited"badgeColor="blue"subtitleEn={`Total Billed: ${formatBDT(totalRevenue)}`}
 subtitleBn={`মোট বিল: ${formatBDT(totalRevenue)}`}
          />
          <KpiCard
 titleEn="Budget Overruns"titleBn="বাজেট অতিরিক্ত ব্যয়"value={overrunJobsCount}
 unitEn="Jobs"unitBn="টি কাজ"icon={AlertTriangle}
 colorVariant={overrunJobsCount > 0 ? 'amber' : 'emerald'}
 badge={overrunJobsCount > 0 ? 'Requires Audit' : 'Healthy'}
 badgeColor={overrunJobsCount > 0 ? 'amber' : 'emerald'}
 subtitleEn="Transport / overtime variance"subtitleBn="পরিবহন ও অতিরিক্ত সময় ব্যত্যয়"/>
          <KpiCard
 titleEn="Material & Yield Savings"titleBn="কাঁচামাল ও নেস্টিং সাশ্রয়"value={isSalesRoleShielded ? '••••••' : totalSavings}
 isCurrency={!isSalesRoleShielded}
 icon={Sparkles}
 colorVariant="purple"badge="Efficiency"badgeColor="purple"subtitleEn="Saved paper on sheet"subtitleBn="উপযুক্ত গ্যাং-রান নেস্টিং সাশ্রয়"/>
        </KpiGrid>

        {/* Sensitive Cost Notice for Sales Mode */}
        {isSalesRoleShielded && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0"/>
              <span>
                <strong>Sales Representative Protection Active: </strong>
 Factory internal substrate purchase rates, machine electricity costs, and raw margin % are hidden.
              </span>
            </div>
            <span className="tabular-nums text-2xs uppercase font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded shrink-0 self-start sm:self-auto">
 Role: Sales Executive
            </span>
          </div>
        )}

        {/* Main Costing Ledger */}
        <Card className="rounded-xl shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {tBilingual(`Production Job Costings & Margins (${filteredCostings.length})`, `কস্টিং তালিকা (${filteredCostings.length}টি)`)}
                </CardTitle>
                <CardDescription className="text-xs">
 Audited 9-head cost allocation from raw roll unwinding to final on-site installation.
                </CardDescription>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-semibold">
                  <button
 onClick={() => setStatusFilter('all')}
 className={`px-2.5 py-1 rounded-lg transition-all ${
 statusFilter === 'all' ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground'
                    }`}
                  >
 All ({costings.length})
                  </button>
                  <button
 onClick={() => setStatusFilter('in_production')}
 className={`px-2.5 py-1 rounded-lg transition-all ${
 statusFilter === 'in_production' ? 'bg-card shadow-xs text-blue-600' : 'text-muted-foreground'
                    }`}
                  >
 In Production
                  </button>
                  <button
 onClick={() => setStatusFilter('actualized')}
 className={`px-2.5 py-1 rounded-lg transition-all ${
 statusFilter === 'actualized' ? 'bg-card shadow-xs text-emerald-600' : 'text-muted-foreground'
                    }`}
                  >
 Audited
                  </button>
                  <button
 onClick={() => setStatusFilter('overrun')}
 className={`px-2.5 py-1 rounded-lg transition-all ${
 statusFilter === 'overrun' ? 'bg-card shadow-xs text-red-600' : 'text-muted-foreground'
                    }`}
                  >
 Overrun
                  </button>
                  <button
 onClick={() => setStatusFilter('saved')}
 className={`px-2.5 py-1 rounded-lg transition-all ${
 statusFilter === 'saved' ? 'bg-card shadow-xs text-teal-600' : 'text-muted-foreground'
                    }`}
                  >
 Saved
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"/>
                  <Input
 placeholder={tBilingual('Search job #, customer, title...', 'জব নং, গ্রাহক বা কাজের নাম দিয়ে খুঁজুন...')}value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-8 h-8 text-xs bg-card rounded-xl"/>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4 bangla-text">{tBilingual('Job & Client', 'জব ও গ্রাহক')}</th>
                    <th className="py-3 px-4 bangla-text">{tBilingual('Work Description', 'কাজের বিবরণ')}</th>
                    <th className="py-3 px-4 tabular-nums bangla-text">{tBilingual('Selling Price', 'বিক্রয় মূল্য')}</th>
                    <th className="py-3 px-4 tabular-nums bangla-text">{tBilingual('Estimated Cost', 'আনুমানিক খরচ')}</th>
                    <th className="py-3 px-4 tabular-nums bangla-text">{tBilingual('Actual Cost', 'প্রকৃত খরচ')}</th>
                    <th className="py-3 px-4 tabular-nums text-center bangla-text">{tBilingual('Realized Margin', 'অর্জিত মার্জিন')}</th>
                    <th className="py-3 px-4 bangla-text">{tBilingual('Variance Status', 'পার্থক্য অবস্থা')}</th>
                    <th className="py-3 px-4 text-right bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {filteredCostings.map((cst: JobCostingRecord) => (
                    <tr key={cst.id} className="hover:bg-muted dark:hover:bg-muted/40">
                      {/* Job & Customer */}
                      <td className="py-3.5 px-4">
                        <Link
 href={getTenantNavHref(`/costing/${cst.id}`, pathname, slug)}
 className="tabular-nums font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group">
                          <span>{cst.job_number}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"/>
                        </Link>
                        <div className="font-semibold text-foreground mt-0.5">{cst.customer_name}</div>
                      </td>

                      {/* Work Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground max-w-[220px] truncate">
                          {cst.item_title}
                        </div>
                        <div className="text-2xs tabular-nums text-muted-foreground max-w-[220px] truncate">{cst.dimensions_spec}</div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 tabular-nums font-black text-sm text-foreground">
                        {formatBDT(cst.selling_price)}
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-3.5 px-4 tabular-nums text-muted-foreground">
                        {isSalesRoleShielded ? '••••••' : formatBDT(cst.est.total_cost)}
                      </td>

                      {/* Actual Cost */}
                      <td className="py-3.5 px-4 tabular-nums font-bold">
                        {isSalesRoleShielded ? (
                          '••••••'
                        ) : cst.status === 'actualized' ? (
                          <span className="text-foreground">{formatBDT(cst.act.total_cost)}</span>
                        ) : (
                          <span className="text-muted-foreground italic">In progress</span>
                        )}
                      </td>

                      {/* Realized Margin */}
                      <td className="py-3.5 px-4 text-center tabular-nums">
                        {isSalesRoleShielded ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-muted text-muted-foreground">
 Shielded
                          </span>
                        ) : cst.status === 'actualized' ? (
                          <span
 className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-black ${
 cst.act.margin_percentage >= 25
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : cst.act.margin_percentage >= 15
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {cst.act.margin_percentage}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-2xs">Est: {cst.est.margin_percentage}%</span>
                        )}
                      </td>

                      {/* Variance Status */}
                      <td className="py-3.5 px-4">
                        {isSalesRoleShielded ? (
                          <span className="text-2xs text-muted-foreground tabular-nums">Active</span>
                        ) : cst.status === 'actualized' ? (
                          (cst.variances?.total_variance || 0) < 0 ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <TrendingDown className="h-3 w-3 text-emerald-600"/>
 Saved {formatBDT(Math.abs(cst.variances?.total_variance || 0))}
                            </span>
                          ) : (cst.variances?.total_variance || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                              <TrendingUp className="h-3 w-3 text-red-600"/>
 Overrun +{formatBDT(cst.variances.total_variance)}
                            </span>
                          ) : (
                            <span className="text-2xs text-muted-foreground tabular-nums">On Budget</span>
                          )
                        ) : (
                          <span className="text-2xs text-blue-600 tabular-nums font-medium">In Production</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
 size="sm"variant="outline"onClick={() => {
 setNegotiatingJob(cst)
 setDiscountPercent(5)
                            }}
 className="h-7 text-2xs px-2 text-foreground border-input hover:bg-muted rounded-lg">
 Negotiate
                          </Button>

                          {!isSalesRoleShielded && (
                            <Button
 size="sm"onClick={() => {
 setEditingJob(cst)
 setActHeads({
 material_cost: cst.act?.material_cost || cst.est.material_cost,
 ink_cost: cst.act?.ink_cost || cst.est.ink_cost,
 machine_cost: cst.act?.machine_cost || cst.est.machine_cost,
 printing_cost: cst.act?.printing_cost || cst.est.printing_cost || 0,
 finishing_cost: cst.act?.finishing_cost || cst.est.finishing_cost,
 labor_cost: cst.act?.labor_cost || cst.est.labor_cost,
 fabrication_cost: cst.act?.fabrication_cost || cst.est.fabrication_cost,
 installation_cost: cst.act?.installation_cost || cst.est.installation_cost,
 transport_cost: cst.act?.transport_cost || cst.est.transport_cost,
 other_cost: cst.act?.other_cost || cst.est.other_cost,
                                })
                              }}
 className="h-7 text-2xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg">
 Actuals
                            </Button>
                          )}

                          <Link
 href={getTenantNavHref(`/costing/${cst.id}`, pathname, slug)}
 className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">
 Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCostings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                            <Calculator className="w-6 h-6"/>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {tBilingual('No job costings found', 'কোনো জব কস্টিং পাওয়া যায়নি')}
                          </span>
                          <span className="text-xs text-muted-foreground max-w-sm">
                            {tBilingual(
                              'Try adjusting your search criteria or create a new job costing sheet with full 9-head cost tracking.',
                              'অন্য কোনো শব্দ দিয়ে সার্চ করুন অথবা নতুন জব কস্টিং শুরু করতে নিচের বাটনে চাপ দিন।'
                            )}
                          </span>
                          <Button
 size="sm"onClick={() => setIsNewCostingOpen(true)}
 className="mt-2 gap-1.5">
                            <Plus className="w-3.5 h-3.5"/>
                            <span>{tBilingual('New Job Costing', 'নতুন কস্টিং শুরু করুন')}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border dark:divide-border">
              {filteredCostings.map((cst: JobCostingRecord) => (
                <div key={cst.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
 href={getTenantNavHref(`/costing/${cst.id}`, pathname, slug)}
 className="tabular-nums font-bold text-xs text-blue-600 hover:underline">
                        {cst.job_number}
                      </Link>
                      <div className="font-semibold text-sm text-foreground mt-0.5">
                        {cst.customer_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums font-black text-sm text-foreground">
                        {formatBDT(cst.selling_price)}
                      </div>
                      {isSalesRoleShielded ? (
                        <span className="px-2 py-0.5 rounded text-2xs font-bold bg-muted text-muted-foreground">
 Shielded
                        </span>
                      ) : cst.status === 'actualized' ? (
                        <span
 className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-black ${
 cst.act.margin_percentage >= 25
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : cst.act.margin_percentage >= 15
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cst.act.margin_percentage}% Margin
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-2xs">Est: {cst.est.margin_percentage}%</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted p-2.5 rounded-xl border border-border /60">
                    <div className="font-medium text-foreground">{cst.item_title}</div>
                    <div className="text-2xs tabular-nums text-muted-foreground mt-0.5">{cst.dimensions_spec}</div>
                  </div>

                  {/* Costs & Variance Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-muted border border-border">
                      <span className="text-2xs text-muted-foreground block uppercase">Est vs Act Cost</span>
                      <span className="tabular-nums font-semibold">
                        {isSalesRoleShielded
                          ? '••••••'
                          : `${formatBDT(cst.est.total_cost)} / ${cst.status === 'actualized' ? formatBDT(cst.act.total_cost) : '—'}`}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted border border-border">
                      <span className="text-2xs text-muted-foreground block uppercase">Variance</span>
                      {isSalesRoleShielded ? (
                        <span className="tabular-nums text-muted-foreground">••••</span>
                      ) : cst.status === 'actualized' ? (
                        (cst.variances?.total_variance || 0) < 0 ? (
                          <span className="text-2xs font-bold text-emerald-600 tabular-nums">
 Saved {formatBDT(Math.abs(cst.variances?.total_variance || 0))}
                          </span>
                        ) : (cst.variances?.total_variance || 0) > 0 ? (
                          <span className="text-2xs font-bold text-red-600 tabular-nums">
                            +{formatBDT(cst.variances.total_variance)}
                          </span>
                        ) : (
                          <span className="text-2xs text-muted-foreground tabular-nums">On Budget</span>
                        )
                      ) : (
                        <span className="text-2xs text-blue-600 tabular-nums">In Prod</span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
 size="sm"variant="outline"onClick={() => {
 setNegotiatingJob(cst)
 setDiscountPercent(5)
                      }}
 className="flex-1 h-9 text-xs font-semibold rounded-xl">
 Negotiate
                    </Button>

                    {!isSalesRoleShielded && (
                      <Button
 size="sm"onClick={() => {
 setEditingJob(cst)
 setActHeads({
 material_cost: cst.act?.material_cost || cst.est.material_cost,
 ink_cost: cst.act?.ink_cost || cst.est.ink_cost,
 machine_cost: cst.act?.machine_cost || cst.est.machine_cost,
 printing_cost: cst.act?.printing_cost || cst.est.printing_cost || 0,
 finishing_cost: cst.act?.finishing_cost || cst.est.finishing_cost,
 labor_cost: cst.act?.labor_cost || cst.est.labor_cost,
 fabrication_cost: cst.act?.fabrication_cost || cst.est.fabrication_cost,
 installation_cost: cst.act?.installation_cost || cst.est.installation_cost,
 transport_cost: cst.act?.transport_cost || cst.est.transport_cost,
 other_cost: cst.act?.other_cost || cst.est.other_cost,
                          })
                        }}
 className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
 Actuals
                      </Button>
                    )}

                    <Link
 href={getTenantNavHref(`/costing/${cst.id}`, pathname, slug)}
 className="inline-flex items-center justify-center h-9 px-3 rounded-xl text-xs font-semibold border border-input text-foreground hover:bg-muted dark:hover:bg-muted">
 Details
                    </Link>
                  </div>
                </div>
              ))}
              {filteredCostings.length === 0 && (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                    <Calculator className="w-6 h-6"/>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {tBilingual('No job costings found', 'কোনো জব কস্টিং পাওয়া যায়নি')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tBilingual('Click"+ New Costing"to initialize a job costing sheet.', 'নতুন কস্টিং শুরু করতে উপরের বাটনে চাপ দিন।')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* =========================================================================
 MODAL 1: NEW JOB COSTING CALCULATOR & ALLOCATION
           ========================================================================= */}
        <ModalDialog
 open={isNewCostingOpen}
 onOpenChange={(open) => !open && setIsNewCostingOpen(false)}
 title={tBilingual('New Job Costing & 9-Head Allocation', 'নতুন জব কস্টিং ও ৯-খাতে ব্যয় বরাদ্দ')}
 description="Calculate material, ink, machine power, labor, and structure fabrication before confirming job order.">
          <form onSubmit={handleCreateCosting} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
            {/* Quick Industry Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                {tBilingual('Quick Industry Presets', 'শিল্পভিত্তিক দ্রুত প্রিসেট')}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INDUSTRY_PRESETS.map((p) => (
                  <button
 key={p.id}
 type="button"onClick={() => handleApplyPreset(p.id)}
 className="text-left p-3 rounded-xl border border-border hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-xs transition-all group shadow-2xs hover:shadow-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                        {tBilingual(p.nameEn, p.nameBn || p.nameEn)}
                      </span>
                      <span className="text-2xs tabular-nums font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full shrink-0">
                        {formatBDT(p.selling)}
                      </span>
                    </div>
                    <div className="text-2xs text-muted-foreground tabular-nums mt-1.5 truncate">{p.specs}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Job Particulars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <Label htmlFor="newJobNum"className="text-xs">
                  {tBilingual('Job Number', 'জব নম্বর')}
                </Label>
                <Input
 id="newJobNum"value={newJobNumber}
 onChange={(e) => setNewJobNumber(e.target.value)}
 className="h-8 text-xs tabular-nums font-bold"required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="newCustName"className="text-xs">
                  {tBilingual('Customer Name', 'গ্রাহকের নাম')}
                </Label>
                <Input
 id="newCustName"placeholder={tBilingual("e.g. Apex Footwear Ltd.", "যেমন: এপেক্স ফুটওয়্যার লি:")}value={newCustomerName}
 onChange={(e) => setNewCustomerName(e.target.value)}
 className="h-8 text-xs"required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="newItemTitle"className="text-xs">
                {tBilingual('Work / Item Title', 'কাজের বিবরণ')}
              </Label>
              <Input
 id="newItemTitle"placeholder={tBilingual("e.g. Outdoor Panaflex Mega Billboard 20ft × 10ft", "যেমন: আউটডোর প্যানাফ্লেক্স মেগা বিলবোর্ড ২০ ফুট × ১০ ফুট")}value={newItemTitle}
 onChange={(e) => setNewItemTitle(e.target.value)}
 className="h-8 text-xs font-medium"required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newSpecs"className="text-xs">
                {tBilingual('Technical Specs & Dimensions', 'সাইজ ও স্পেক্স')}
              </Label>
              <Input
 id="newSpecs"placeholder={tBilingual("e.g. 20ft × 10ft • 440 GSM Star Flex • Konica 512i • MS Pipe 1 inch", "যেমন: ২০ ফুট × ১০ ফুট • ৪৪০ জিএসএম স্টার ফ্লেক্স • কোনিকা ৫১২আই")}value={newSpecs}
 onChange={(e) => setNewSpecs(e.target.value)}
 className="h-8 text-xs tabular-nums"/>
            </div>

            {/* 9-Head Cost Allocation Grid */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between pb-2">
                <Label className="text-xs font-bold text-foreground">
                  {tBilingual('9-Head Estimated Cost Breakdown', '৯টি ব্যয় খাতের হিসাব')}
                </Label>
                <span className="text-xs tabular-nums font-bold text-muted-foreground">
 Total Cost: {formatBDT(newTotalEstCost)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">1. Substrate (মিডিয়া/বোর্ড)</span>
                  <Input
 type="number"min="0"value={newEstHeads.material_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, material_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">2. Ink (কালি/ইঙ্ক)</span>
                  <Input
 type="number"min="0"value={newEstHeads.ink_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, ink_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">3. Machine Power (বিদ্যুৎ)</span>
                  <Input
 type="number"min="0"value={newEstHeads.machine_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, machine_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">4. Finishing (ল্যামিনেশন)</span>
                  <Input
 type="number"min="0"value={newEstHeads.finishing_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, finishing_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">5. Labor (মজুরি/অপারেটর)</span>
                  <Input
 type="number"min="0"value={newEstHeads.labor_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, labor_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">6. Fabrication (ওয়েল্ডিং)</span>
                  <Input
 type="number"min="0"value={newEstHeads.fabrication_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, fabrication_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">7. Installation (ফিটিং/ক্রেন)</span>
                  <Input
 type="number"min="0"value={newEstHeads.installation_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, installation_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">8. Transport (ভ্যান/সিএনজি)</span>
                  <Input
 type="number"min="0"value={newEstHeads.transport_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, transport_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground block truncate">9. Other (প্যাকেজিং/বাফার)</span>
                  <Input
 type="number"min="0"value={newEstHeads.other_cost}
 onChange={(e) => setNewEstHeads({ ...newEstHeads, other_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"/>
                </div>
              </div>
            </div>

            {/* Selling Price & Margin Summary */}
            <div className="p-3.5 rounded-xl bg-muted border border-border space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="newSellingPrice"className="text-xs font-bold text-foreground">
 Selling Price (বিক্রয় মূল্য ৳)
                </Label>
                <Input
 id="newSellingPrice"type="number"min="0"value={newSellingPrice}
 onChange={(e) => setNewSellingPrice(Number(e.target.value))}
 className="w-32 h-8 text-xs tabular-nums font-black text-right"required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-border tabular-nums">
                <span className="text-muted-foreground">Estimated Gross Profit:</span>
                <span className="font-bold text-blue-600">{formatBDT(newEstProfit)}</span>
              </div>

              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="text-muted-foreground">Estimated Profit Margin:</span>
                <span
 className={`font-black px-2 py-0.5 rounded ${
 newEstMargin >= 25
                      ? 'bg-emerald-100 text-emerald-800'
                      : newEstMargin >= 15
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {newEstMargin}%
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
              <Button type="button"variant="outline"onClick={() => setIsNewCostingOpen(false)} className="w-full sm:w-auto h-10 sm:h-9 rounded-xl">
 Cancel
              </Button>
              <Button type="submit"className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9 rounded-xl">
 Save & Initialize Job Costing
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* =========================================================================
 MODAL 2: CUSTOMER PRICE NEGOTIATION WITH MARGIN GUARD
           ========================================================================= */}
        <ModalDialog
 open={Boolean(negotiatingJob)}
 onOpenChange={(open) => !open && setNegotiatingJob(null)}
 title={tBilingual('Customer Price Negotiation & Margin Guard', 'দরদাম সিমুলেটর ও মার্জিন গার্ড')}
 description="Simulate discount proposal and verify profitability before confirming quotation.">
          {negotiatingJob && negotiationResult && (
            <div className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
              <div className="p-3 bg-muted border border-border rounded-xl space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Job: {negotiatingJob.job_number}</span>
                  <span className="text-blue-600">{negotiatingJob.customer_name}</span>
                </div>
                <div className="text-muted-foreground">{negotiatingJob.item_title}</div>
              </div>

              {/* Discount Slider & Input */}
              <div className="space-y-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
                <div className="flex justify-between items-center text-xs">
                  <Label htmlFor="discSlider"className="font-bold text-blue-900 dark:text-blue-200">
 Proposed Discount Percentage (%)
                  </Label>
                  <div className="flex items-center gap-1 tabular-nums font-black text-sm text-blue-700">
                    <Input
 id="discSlider"type="number"min="0"max="50"value={discountPercent}
 onChange={(e) => setDiscountPercent(Number(e.target.value))}
 className="w-16 h-7 text-xs text-right tabular-nums font-bold rounded-lg"/>
                    <span>%</span>
                  </div>
                </div>

                <input
 type="range"min="0"max="40"step="1"value={discountPercent}
 onChange={(e) => setDiscountPercent(Number(e.target.value))}
 className="w-full accent-blue-600 cursor-pointer"/>
              </div>

              {/* Live Impact Waterfall */}
              <div className="p-4 rounded-xl bg-muted space-y-2 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original List Price:</span>
                  <span className="font-bold">{formatBDT(negotiatingJob.selling_price)}</span>
                </div>

                <div className="flex justify-between text-red-600 font-bold">
                  <span>(-) Proposed Discount:</span>
                  <span>-{formatBDT(negotiationResult.discountAmount)} ({discountPercent}%)</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-border font-black text-sm text-foreground">
                  <span>Final Negotiated Price:</span>
                  <span className="text-blue-600">{formatBDT(negotiationResult.finalPrice)}</span>
                </div>

                {/* Sensitive Margin Display (Hidden if sales rep is shielded) */}
                <div className="flex justify-between pt-2 border-t border-border items-center">
                  <span className="text-muted-foreground">Resulting Profit Margin:</span>
                  {isSalesRoleShielded ? (
                    <span className="font-bold text-muted-foreground">Shielded by Company Policy</span>
                  ) : (
                    <span
 className={`font-black text-sm px-2 py-0.5 rounded ${
 negotiationResult.isSafeMargin
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800 animate-pulse'
                      }`}
                    >
                      {negotiationResult.finalMargin}%
                    </span>
                  )}
                </div>
              </div>

              {/* Safety Threshold Alert */}
              {!negotiationResult.isSafeMargin && !isSalesRoleShielded && (
                <div className="p-3 bg-red-50 text-red-900 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0"/>
                  <span>
                    <strong>Margin Guard Triggered: </strong>
 The proposed price yields a margin below 15%. Requires Managing Director authorization.
                  </span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
                <Button type="button"variant="outline"onClick={() => setNegotiatingJob(null)} className="w-full sm:w-auto h-10 sm:h-9 rounded-xl">
 Cancel
                </Button>
                <Button
 type="button"onClick={() => {
 const updated = costings.map((c) =>
 c.id === negotiatingJob.id
                        ? {
                            ...c,
 selling_price: negotiationResult.finalPrice,
 est: {
                              ...c.est,
 profit: negotiationResult.finalProfit,
 margin_percentage: negotiationResult.finalMargin,
                            },
 updated_at: new Date().toISOString(),
                          }
                        : c
                    )
 setStoredCostings(updated)
 PrintERPDataStore.updateItem<JobCostingRecord>(STORAGE_KEYS.JOB_COSTINGS, negotiatingJob.id, {
 selling_price: negotiationResult.finalPrice,
 est: {
                        ...negotiatingJob.est,
 profit: negotiationResult.finalProfit,
 margin_percentage: negotiationResult.finalMargin,
                      },
                    })
 showNotification(
                      `Quotation updated with approved price of ${formatBDT(negotiationResult.finalPrice)}.`
                    )
 setNegotiatingJob(null)
                  }}
 className={`font-bold text-white w-full sm:w-auto h-10 sm:h-9 rounded-xl ${
 negotiationResult.isSafeMargin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
 Apply Negotiated Price
                </Button>
              </div>
            </div>
          )}
        </ModalDialog>

        {/* =========================================================================
 MODAL 3: RECORD 9-HEAD ACTUAL PRODUCTION COSTS & VARIANCES
           ========================================================================= */}
        <ModalDialog
 open={Boolean(editingJob)}
 onOpenChange={(open) => !open && setEditingJob(null)}
 title={tBilingual('Record Post-Production 9-Head Actual Costs', 'পোস্ট-প্রোডাকশন ৯-খাতে প্রকৃত খরচ এন্ট্রি')}
 description="Update realized substrate consumption, ink bottles, machine hours, and on-site fitting.">
          {editingJob && (
            <form onSubmit={handleSaveActuals} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
              <div className="p-3 rounded-xl bg-muted border text-xs">
                <strong>{editingJob.job_number}</strong>: {editingJob.item_title}
              </div>

              {/* 9-Head Actuals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="space-y-1">
                  <Label className="text-2xs">1. Material (মিডিয়া)</Label>
                  <Input
 type="number"min="0"value={actHeads.material_cost}
 onChange={(e) => setActHeads({ ...actHeads, material_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.material_cost)}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs">2. Ink (কালি)</Label>
                  <Input
 type="number"min="0"value={actHeads.ink_cost}
 onChange={(e) => setActHeads({ ...actHeads, ink_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.ink_cost)}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs">3. Machine Power</Label>
                  <Input
 type="number"min="0"value={actHeads.machine_cost}
 onChange={(e) => setActHeads({ ...actHeads, machine_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.machine_cost)}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs">4. Finishing (ল্যামিনেশন)</Label>
                  <Input
 type="number"min="0"value={actHeads.finishing_cost}
 onChange={(e) => setActHeads({ ...actHeads, finishing_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.finishing_cost)}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs">5. Labor (মজুরি)</Label>
                  <Input
 type="number"min="0"value={actHeads.labor_cost}
 onChange={(e) => setActHeads({ ...actHeads, labor_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.labor_cost)}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs">6. Fabrication (ওয়েল্ডিং)</Label>
                  <Input
 type="number"min="0"value={actHeads.fabrication_cost}
 onChange={(e) => setActHeads({ ...actHeads, fabrication_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.fabrication_cost)}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs">7. Installation (ফিটিং)</Label>
                  <Input
 type="number"min="0"value={actHeads.installation_cost}
 onChange={(e) => setActHeads({ ...actHeads, installation_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.installation_cost)}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs">8. Transport (পরিবহন)</Label>
                  <Input
 type="number"min="0"value={actHeads.transport_cost}
 onChange={(e) => setActHeads({ ...actHeads, transport_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.transport_cost)}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs">9. Other (অন্যান্য)</Label>
                  <Input
 type="number"min="0"value={actHeads.other_cost}
 onChange={(e) => setActHeads({ ...actHeads, other_cost: Number(e.target.value) })}
 className="h-7 text-xs tabular-nums"required
                  />
                  <span className="text-2xs text-muted-foreground tabular-nums block">Est: {formatBDT(editingJob.est.other_cost)}</span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
                <Button type="button"variant="outline"onClick={() => setEditingJob(null)} className="w-full sm:w-auto h-10 sm:h-9 rounded-xl">
 Cancel
                </Button>
                <Button type="submit"className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9 rounded-xl">
 Compute Variance & Finalize Costing
                </Button>
              </div>
            </form>
          )}
        </ModalDialog>
        </div>
      </FeatureGate>
    </PanelAccessGuard>
  )
}

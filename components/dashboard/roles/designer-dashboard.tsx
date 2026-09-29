'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useToast } from '@/components/shared/toast-feedback'
import {
  Palette,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Download,
  Share2,
  Sparkles,
  Printer,
  ExternalLink,
  Copy,
  Check,
  Search,
  FileText,
  SlidersHorizontal,
  Eye,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Phone,
  Send,
  ShieldCheck,
  ArrowRight,
  Maximize2,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { useAuth } from '@/hooks/use-auth'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { ProductionTaskRecord } from '@/types/production.types'
import { DesignJobRecord } from '@/types/design.types'
import { DesignRepository } from '@/lib/repositories/design.repository'
import { sendToPrintOperatorAction } from '@/actions/design.actions'
import {
  PRINT_MACHINERY_LIST,
  WHATSAPP_TEMPLATES,
  WhatsAppTemplateKey,
  sanitizeBangladeshiPhone,
  buildBangladeshiWhatsAppMessage,
} from '@/components/design/types'

interface DesignerDashboardProps {
  tasks: ProductionTaskRecord[]
  onRefresh: () => void
}

export function DesignerDashboard({ tasks, onRefresh }: DesignerDashboardProps) {
  const { tBilingual } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const { company } = useTenant()
  const { user } = useAuth()

  const tenantSlug = company?.slug || 'workspace'
  const companyId = company?.id || tenantSlug
  const userDisplayName = user?.profile?.full_name || user?.email || 'Graphic Designer'

  // Live Design Jobs from Repository
  const [designJobs, setDesignJobs] = useState<DesignJobRecord[]>([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'needs_design' | 'awaiting_approval' | 'revisions' | 'approved'>('all')
  const [showSpecsGuide, setShowSpecsGuide] = useState(false)

  // Global Toast
  const { showToast: dispatchToast } = useToast()
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    dispatchToast({ type, title: msg, titleBn: msg })
  }, [dispatchToast])

  // Modals state
  const [whatsAppModalJob, setWhatsAppModalJob] = useState<DesignJobRecord | null>(null)
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<WhatsAppTemplateKey>('proof')
  const [customPhone, setCustomPhone] = useState('')
  const [customProofUrl, setCustomProofUrl] = useState('')
  const [copiedText, setCopiedText] = useState(false)

  const [releaseModalJob, setReleaseModalJob] = useState<DesignJobRecord | null>(null)
  const [selectedMachineId, setSelectedMachineId] = useState<string>(PRINT_MACHINERY_LIST[0]?.id || '')
  const [preflightConfirmed, setPreflightConfirmed] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)

  // Fetch Design Jobs from DesignRepository
  const loadDesignJobs = useCallback(async () => {
    try {
      const jobs = await DesignRepository.getDesignJobs(companyId)
      setDesignJobs(Array.isArray(jobs) ? jobs : [])
    } catch (err) {
      console.error('Failed to load design jobs in cockpit:', err)
    } finally {
      setIsLoadingJobs(false)
      setIsRefreshing(false)
    }
  }, [companyId])

  useEffect(() => {
    loadDesignJobs()
  }, [loadDesignJobs])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    onRefresh()
    await loadDesignJobs()
    showToast(tBilingual('Queue refreshed successfully', 'ডিজাইন তালিকা সফলভাবে রিফ্রেশ হয়েছে'), 'info')
  }

  // Combine design tasks from production queue and design jobs
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const productionDesignTasks = safeTasks.filter((t) =>
    ((t as any).stage_name || t.department)?.toLowerCase().includes('design') ||
    t.task_name?.toLowerCase().includes('design')
  )

  // Metrics computation
  const metrics = useMemo(() => {
    const totalJobs = designJobs.length
    const awaitingApproval = designJobs.filter((j) => j.status === 'customer_approval' || (j as any).hold_reason === 'customer_approval').length
    const revisions = designJobs.filter((j) => j.status === 'revision').length
    const approvedReady = designJobs.filter((j) => j.status === 'approved' || (j as any).status === 'ready' || (j as any).commercial_status === 'invoice_created').length
    const needsDesign = designJobs.filter((j) => j.status === 'received' || j.status === 'designing' || j.status === 'in_progress').length

    return {
      totalJobs,
      awaitingApproval,
      revisions,
      approvedReady,
      needsDesign,
    }
  }, [designJobs])

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return designJobs.filter((job) => {
      // Tab filter
      if (activeFilterTab === 'needs_design') {
        if (job.status !== 'received' && job.status !== 'designing' && job.status !== 'in_progress') return false
      } else if (activeFilterTab === 'awaiting_approval') {
        if (job.status !== 'customer_approval' && (job as any).hold_reason !== 'customer_approval') return false
      } else if (activeFilterTab === 'revisions') {
        if (job.status !== 'revision') return false
      } else if (activeFilterTab === 'approved') {
        if (job.status !== 'approved' && (job as any).status !== 'ready') return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = job.title?.toLowerCase().includes(q)
        const matchesCustomer = job.customer_name?.toLowerCase().includes(q)
        const matchesNum = (job.design_number || job.order_number || job.id)?.toLowerCase().includes(q)
        const matchesProduct = job.product_name?.toLowerCase().includes(q)
        if (!matchesTitle && !matchesCustomer && !matchesNum && !matchesProduct) return false
      }

      return true
    })
  }, [designJobs, activeFilterTab, searchQuery])

  // Open WhatsApp Modal
  const handleOpenWhatsAppModal = (job: DesignJobRecord) => {
    setWhatsAppModalJob(job)
    setWhatsAppTemplate('proof')
    const phone = (job as any).customer_phone || (job as any).mobile || ''
    setCustomPhone(phone)
    const latestVersion = job.versions && job.versions.length > 0 ? job.versions[job.versions.length - 1] : null
    const proofUrl = latestVersion?.proof_file_url || latestVersion?.file_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/${tenantSlug}/design?job=${job.id}`
    setCustomProofUrl(proofUrl)
    setCopiedText(false)
  }

  // Pre-formatted WhatsApp Message
  const currentWhatsAppMessage = useMemo(() => {
    if (!whatsAppModalJob) return ''
    const latestVersion = whatsAppModalJob.versions && whatsAppModalJob.versions.length > 0 ? whatsAppModalJob.versions[whatsAppModalJob.versions.length - 1] : null
    return buildBangladeshiWhatsAppMessage({
      template: whatsAppTemplate,
      customerName: whatsAppModalJob.customer_name,
      companyName: company?.name || 'InkFlow PrintERP',
      jobTitle: whatsAppModalJob.title || whatsAppModalJob.product_name || 'Printing Job',
      jobNum: whatsAppModalJob.design_number || whatsAppModalJob.order_number || whatsAppModalJob.id,
      invoiceNum: whatsAppModalJob.invoice_number,
      dimensions: whatsAppModalJob.dimensions_spec,
      versionNumber: latestVersion?.version_number || whatsAppModalJob.current_version || 1,
      proofUrl: customProofUrl,
    })
  }, [whatsAppModalJob, whatsAppTemplate, company?.name, customProofUrl])

  // Copy WhatsApp Message
  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(currentWhatsAppMessage)
      setCopiedText(true)
      showToast(tBilingual('Message copied to clipboard', 'মেসেজ কপি করা হয়েছে'), 'success')
      setTimeout(() => setCopiedText(false), 2500)
    } catch {
      showToast(tBilingual('Failed to copy', 'কপি করা সম্ভব হয়নি'), 'error')
    }
  }

  // Open WhatsApp Web Link
  const handleLaunchWhatsApp = () => {
    const sanitized = sanitizeBangladeshiPhone(customPhone)
    const url = `https://wa.me/${sanitized}?text=${encodeURIComponent(currentWhatsAppMessage)}`
    window.open(url, '_blank')
  }

  // Open Release Modal
  const handleOpenReleaseModal = (job: DesignJobRecord) => {
    setReleaseModalJob(job)
    setSelectedMachineId(PRINT_MACHINERY_LIST[0]?.id || '')
    setPreflightConfirmed(false)
  }

  // Confirm Release to Print Operator
  const handleConfirmRelease = async () => {
    if (!releaseModalJob) return
    setIsReleasing(true)
    try {
      const selectedMachine = PRINT_MACHINERY_LIST.find((m) => m.id === selectedMachineId)
      const res = await sendToPrintOperatorAction(
        releaseModalJob.id,
        companyId,
        {
          ...releaseModalJob,
          status: 'approved',
        },
        {
          actorName: userDisplayName,
          assignedMachineId: selectedMachine?.id,
          assignedMachineName: selectedMachine?.name,
        }
      )

      if (res.success) {
        showToast(
          tBilingual(
            `Job #${releaseModalJob.design_number || releaseModalJob.id} released to production!`,
            `কাজটি সফলভাবে প্রেসে পাঠানো হয়েছে!`
          ),
          'success'
        )
        setReleaseModalJob(null)
        await loadDesignJobs()
      } else {
        // Fallback to local DesignRepository direct release
        const localRes = await DesignRepository.sendToPrintOperator(releaseModalJob.id, companyId, {
          actorName: userDisplayName,
          assignedMachineId: selectedMachine?.id,
          assignedMachineName: selectedMachine?.name,
        })
        if (localRes.success) {
          showToast(tBilingual('Released to production successfully', 'সফলভাবে প্রেসে পাঠানো হয়েছে'), 'success')
          setReleaseModalJob(null)
          await loadDesignJobs()
        } else {
          showToast(res.error || localRes.error || 'Failed to release job to operator', 'error')
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Error dispatching to print operator', 'error')
    } finally {
      setIsReleasing(false)
    }
  }

  return (
    <div className="space-y-6">


      {/* Hero Command Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-950 via-purple-900 to-slate-900 p-6 sm:p-7 text-white shadow-xl border border-purple-500/20">
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {tBilingual('Pre-Press Command Center', 'প্রি-প্রেস কমান্ড সেন্টার')}
              </Badge>
              <Badge className="bg-white/10 text-white border-white/15 text-xs tabular-nums font-medium">
                {userDisplayName}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Palette className="h-7 w-7 text-purple-300" />
              <span>{tBilingual('Graphic Design & Pre-Press Cockpit', 'গ্রাফিক ডিজাইন ও প্রি-প্রেস ককপিট')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
              {tBilingual(
                'High-resolution artwork preflighting, client WhatsApp proofing, color separations, and direct print operator dispatch.',
                'ক্লায়েন্ট প্রুফিং, ৩শ ডিপিআই কালার সেপারেশন, ডাই-কাট ফাইল প্রস্তুত ও প্রেসে ফাইল ছাড়ার স্বয়ংক্রিয় কমান্ড।'
              )}
            </p>
          </div>

          {/* Quick Hero Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={() => router.push(getTenantNavHref('/design', pathname, tenantSlug))}
              className="bg-white text-purple-950 hover:bg-purple-50 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 h-10 px-4"
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>{tBilingual('Open Design Studio', 'ডিজাইন স্টুডিও খুলুন')}</span>
            </Button>

            <Button
              onClick={() => router.push(getTenantNavHref('/orders', pathname, tenantSlug))}
              variant="outline"
              className="bg-purple-900/60 hover:bg-purple-800/80 text-white border-purple-400/30 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 h-10 px-4"
            >
              <Layers className="h-4 w-4 text-purple-300" />
              <span>{tBilingual('Work Orders', 'কাজের অর্ডার')}</span>
            </Button>

            <Button
              onClick={handleRefresh}
              variant="ghost"
              disabled={isRefreshing}
              className="h-10 w-10 p-0 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl"
              title="Refresh Queue"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <KpiGrid columns={4}>
        <KpiCard
          titleEn="Active Design Queue"
          titleBn="মোট সক্রিয় ডিজাইন কাজ"
          value={metrics.totalJobs}
          icon={Palette}
          colorVariant="purple"
        />
        <KpiCard
          titleEn="Awaiting Client Proof"
          titleBn="কাস্টমার প্রুফিং বাকি"
          value={metrics.awaitingApproval}
          icon={Clock}
          colorVariant="warning"
        />
        <KpiCard
          titleEn="Revisions Requested"
          titleBn="সংশোধন চাওয়া হয়েছে"
          value={metrics.revisions}
          icon={AlertCircle}
          colorVariant="danger"
        />
        <KpiCard
          titleEn="Ready for Production"
          titleBn="প্রেসে যাওয়ার জন্য প্রস্তুত"
          value={metrics.approvedReady}
          icon={FileCheck}
          colorVariant="success"
        />
      </KpiGrid>

      {/* Pre-Press Machinery Reference & Checklist Bar */}
      <Card className="border border-purple-100 dark:border-purple-900/40 bg-gradient-to-r from-purple-50/50 via-slate-50 to-indigo-50/40 dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/10 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{tBilingual('Pre-Press Technical Reference & Specs', 'প্রি-প্রেস টেকনিক্যাল রেফারেন্স ও মাপ')}</span>
                <Badge variant="outline" className="text-2xs uppercase font-bold text-purple-700 dark:text-purple-400 border-purple-300">
                  Pre-Flight Standard
                </Badge>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {tBilingual(
                  'Offset sheet sizes (Demy, D/Demy, Crown, Royal), 3mm bleeds, CMYK color profiles, and Roland UV contour cut specs.',
                  'অফসেট শিটের স্ট্যান্ডার্ড সাইজ (ডিমাই, ডবল ডিমাই, ক্রাউন, রয়্যাল), ৩মিমি ব্লিড এবং ইউভি কাটিং পাথ গাইড।'
                )}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSpecsGuide(!showSpecsGuide)}
            className="text-xs font-bold text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-100/50 shrink-0 flex items-center gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{showSpecsGuide ? tBilingual('Hide Reference Specs', 'মাপ লুকান') : tBilingual('View Machine Specs Guide', 'মেশিনের মাপ দেখুন')}</span>
            {showSpecsGuide ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>

        {/* Collapsible Specs Panel */}
        {showSpecsGuide && (
          <div className="border-t border-purple-100 dark:border-purple-900/40 p-4 sm:p-5 bg-white/70 dark:bg-slate-950/70 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in-50 duration-200">
            {/* Offset Press Column */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <Printer className="h-4 w-4 text-indigo-600" />
                <span>Commercial Offset Press</span>
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                <li>• <strong>Demy Sheet:</strong> 18" × 23" in (Print area: 17.5" × 22.5")</li>
                <li>• <strong>Double Demy:</strong> 23" × 36" in (Plate: 28" × 40")</li>
                <li>• <strong>Crown Sheet:</strong> 15" × 20" in</li>
                <li>• <strong>Royal Sheet:</strong> 20" × 25" in</li>
                <li>• <strong>Bleed:</strong> 3mm (0.125"), Safe Margin: 4mm from trim</li>
                <li>• <strong>Profile:</strong> CMYK Coated FOGRA39 / 300 DPI</li>
              </ul>
            </div>

            {/* Large Format & UV Column */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <Layers className="h-4 w-4 text-purple-600" />
                <span>Roland & UV Flatbed</span>
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                <li>• <strong>Eco-Solvent Width:</strong> 54 in / 64 in / 10 ft roll</li>
                <li>• <strong>UV Bed:</strong> 8 ft × 4 ft Rigid Acrylic / Foam Board</li>
                <li>• <strong>Contour Cut:</strong> Spot color stroke named <code>CutContour</code> (100% Magenta, 0.25 pt)</li>
                <li>• <strong>Resolution:</strong> 150–300 DPI at 1:1 Scale</li>
                <li>• <strong>File Format:</strong> High-res TIFF or Vector PDF (X-1a)</li>
              </ul>
            </div>

            {/* Digital Laser Column */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Digital Press (Konica/Xerox)</span>
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                <li>• <strong>Standard Sheets:</strong> A4, A3, 12" × 18"</li>
                <li>• <strong>Super A3 Banner:</strong> 13" × 19" (330mm × 487mm)</li>
                <li>• <strong>Media Weight:</strong> 80 GSM Paper up to 350 GSM Art Card</li>
                <li>• <strong>Gripper Margin:</strong> Minimum 5mm unprintable edge</li>
                <li>• <strong>Font Rule:</strong> All fonts converted to Outlines / Curves</li>
              </ul>
            </div>
          </div>
        )}
      </Card>

      {/* Main Design Queue & Filter Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilterTab === 'all'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tBilingual('All Active', 'সকল সক্রিয়')} ({metrics.totalJobs})
            </button>

            <button
              onClick={() => setActiveFilterTab('needs_design')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilterTab === 'needs_design'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tBilingual('Needs Design', 'ডিজাইন বাকি')} ({metrics.needsDesign})
            </button>

            <button
              onClick={() => setActiveFilterTab('awaiting_approval')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilterTab === 'awaiting_approval'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tBilingual('Awaiting Proof', 'প্রুফিং বাকি')} ({metrics.awaitingApproval})
            </button>

            <button
              onClick={() => setActiveFilterTab('revisions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilterTab === 'revisions'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tBilingual('Revisions', 'সংশোধন')} ({metrics.revisions})
            </button>

            <button
              onClick={() => setActiveFilterTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilterTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tBilingual('Ready for Press', 'প্রিন্টে প্রস্তুত')} ({metrics.approvedReady})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder={tBilingual('Search jobs, orders, clients...', 'খুঁজুন...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>

        {/* Job Cards Queue */}
        {isLoadingJobs ? (
          <Card className="border border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-6 w-6 text-purple-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">
                {tBilingual('Loading pre-press design queue...', 'ডিজাইন তালিকা লোড হচ্ছে...')}
              </p>
            </div>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card className="border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
              <div className="h-12 w-12 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center">
                <Palette className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {tBilingual('No design tasks found in this view', 'এই বিভাগে কোনো ডিজাইন কাজ নেই')}
              </h3>
              <p className="text-xs text-slate-500">
                {tBilingual(
                  'All assigned artwork and pre-press tasks are up to date. You can create a new design task or open the full studio.',
                  'বর্তমানে কোনো কাজ পেন্ডিং নেই। নতুন ডিজাইন শুরু করতে স্টুডিওতে যান।'
                )}
              </p>
              <Button
                onClick={() => router.push(getTenantNavHref('/design', pathname, tenantSlug))}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs mt-2"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {tBilingual('Go to Design Studio', 'ডিজাইন স্টুডিওতে যান')}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredJobs.map((job) => {
              const latestVer = job.versions && job.versions.length > 0 ? job.versions[job.versions.length - 1] : null
              const isApproved = job.status === 'approved' || (job as any).status === 'ready'
              const isAwaitingProof = job.status === 'customer_approval'
              const isRevision = job.status === 'revision'
              const isDesigning = job.status === 'designing' || job.status === 'in_progress'

              return (
                <Card
                  key={job.id}
                  className="border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all shadow-xs bg-white dark:bg-slate-900 overflow-hidden"
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Job Info */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs tabular-nums font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          #{job.design_number || job.id}
                        </Badge>

                        {job.order_number && (
                          <Badge variant="outline" className="text-xs tabular-nums font-medium text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900">
                            Order: #{job.order_number}
                          </Badge>
                        )}

                        {/* Status Badge */}
                        {isApproved ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {tBilingual('Pre-Press Approved', 'প্রেসে অনুমোদিত')}
                          </Badge>
                        ) : isAwaitingProof ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-xs font-bold">
                            <Clock className="h-3 w-3 mr-1" />
                            {tBilingual('Awaiting Proof Approval', 'প্রুফিংয়ের অপেক্ষায়')}
                          </Badge>
                        ) : isRevision ? (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 text-xs font-bold">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {tBilingual('Revision Requested', 'সংশোধন প্রয়োজন')}
                          </Badge>
                        ) : isDesigning ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 text-xs font-bold">
                            <Palette className="h-3 w-3 mr-1" />
                            {tBilingual('Designing / Working', 'ডিজাইন চলছে')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-bold">
                            {job.status}
                          </Badge>
                        )}

                        {/* Version tag */}
                        <Badge variant="outline" className="text-2xs tabular-nums font-medium text-slate-600 dark:text-slate-400">
                          v{latestVer?.version_number || job.current_version || 1}
                        </Badge>
                      </div>

                      {/* Title & Specs */}
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                          {job.title || job.product_name || 'Design Work Order'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            <strong>Customer:</strong> {job.customer_name || 'Walk-in Client'}
                          </span>
                          {job.dimensions_spec && (
                            <span>
                              <strong>Size:</strong> {job.dimensions_spec}
                            </span>
                          )}
                          {job.quantity && (
                            <span>
                              <strong>Qty:</strong> {job.quantity} {job.unit || 'Pcs'}
                            </span>
                          )}
                          {job.deadline && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              <strong>Due:</strong> {job.deadline}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Preflight Checklist Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-2xs uppercase font-bold text-slate-400 mr-1">Preflight:</span>
                        <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ CMYK
                        </span>
                        <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ 300 DPI
                        </span>
                        <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ 3mm Bleed
                        </span>
                        <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          ✓ Curves / Vector
                        </span>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* WhatsApp Proof Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenWhatsAppModal(job)}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 h-9"
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1.5" />
                        {tBilingual('WhatsApp Proof', 'প্রুফ পাঠান')}
                      </Button>

                      {/* Release to Operator Button */}
                      <Button
                        size="sm"
                        onClick={() => handleOpenReleaseModal(job)}
                        className={`text-xs font-bold text-white shadow-xs h-9 ${
                          isApproved
                            ? 'bg-slate-700 hover:bg-slate-800'
                            : 'bg-purple-700 hover:bg-purple-800'
                        }`}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        {isApproved ? tBilingual('Re-Dispatch', 'পুনরায় পাঠান') : tBilingual('Release to Press', 'প্রেসে পাঠান')}
                      </Button>

                      {/* Open in Studio Link */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(getTenantNavHref(`/design`, pathname, tenantSlug))}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 h-9 px-2.5"
                        title="Open in Design Studio"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Production Task Queue Section (If any additional operator design tasks exist) */}
      {productionDesignTasks.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>{tBilingual('Production Floor Design Operations', 'ফ্লোর ডিজাইন ও কাটিং টাস্ক')}</span>
            <Badge variant="secondary" className="text-xs tabular-nums">{productionDesignTasks.length}</Badge>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {productionDesignTasks.map((t) => (
              <Card key={t.id} className="border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-2xs tabular-nums font-bold">
                    #{t.job_number || t.task_number}
                  </Badge>
                  <Badge className="text-2xs uppercase font-bold" variant={t.status === 'completed' ? 'default' : 'secondary'}>
                    {t.status}
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2 truncate">
                  {t.task_name}
                </h4>
                <p className="text-2xs text-slate-500 mt-0.5 truncate">
                  Client: {t.customer_name || 'Direct'} • Qty: {t.quantity} {t.unit || 'Pcs'}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Proof Modal */}
      {whatsAppModalJob && (
        <Dialog open={Boolean(whatsAppModalJob)} onOpenChange={(open) => !open && setWhatsAppModalJob(null)}>
          <DialogContent className="max-w-xl p-5 sm:p-6" onClose={() => setWhatsAppModalJob(null)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {tBilingual('Send Artwork Proof via WhatsApp', 'ওয়াটসঅ্যাপে ডিজাইন প্রুফ পাঠান')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Job #{whatsAppModalJob.design_number || whatsAppModalJob.id} • {whatsAppModalJob.customer_name}
                  </p>
                </div>
              </div>

              {/* Template Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tBilingual('Select Proof Message Template', 'মেসেজ টেমপ্লেট নির্বাচন করুন')}:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WHATSAPP_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.key}
                      onClick={() => setWhatsAppTemplate(tmpl.key)}
                      type="button"
                      className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                        whatsAppTemplate === tmpl.key
                          ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>{tmpl.title}</div>
                      <span className="text-2xs text-slate-500 font-normal">{tmpl.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{tBilingual('Customer Mobile', 'মোবাইল নম্বর')}</span>
                  </label>
                  <Input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {tBilingual('Artwork Proof Link', 'প্রুফ প্রিভিউ লিংক')}
                  </label>
                  <Input
                    type="text"
                    value={customProofUrl}
                    onChange={(e) => setCustomProofUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tBilingual('Message Preview', 'মেসেজের বিবরণ')}
                </label>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs tabular-nums text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {currentWhatsAppMessage}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWhatsAppModalJob(null)}
                  className="text-xs"
                >
                  {tBilingual('Cancel', 'বাতিল')}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWhatsApp}
                  className="text-xs font-bold"
                >
                  {copiedText ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                      {tBilingual('Copied!', 'কপি হয়েছে!')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      {tBilingual('Copy Text', 'মেসেজ কপি')}
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  onClick={handleLaunchWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{tBilingual('Open WhatsApp', 'ওয়াটসঅ্যাপে পাঠান')}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Release to Print Operator Modal */}
      {releaseModalJob && (
        <Dialog open={Boolean(releaseModalJob)} onOpenChange={(open) => !open && setReleaseModalJob(null)}>
          <DialogContent className="max-w-lg p-5 sm:p-6" onClose={() => setReleaseModalJob(null)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {tBilingual('Release Artwork to Print Operator', 'প্রেসে ফাইল পাঠানোর চূড়ান্ত নিশ্চিতকরণ')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Job #{releaseModalJob.design_number || releaseModalJob.id} • {releaseModalJob.title}
                  </p>
                </div>
              </div>

              {/* Machine Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tBilingual('Target Printing Machine', 'প্রিন্টিং মেশিন নির্বাচন করুন')}:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {PRINT_MACHINERY_LIST.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMachineId(m.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedMachineId === m.id
                          ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 dark:border-purple-500'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <div className="font-bold text-slate-900 dark:text-slate-100">{m.name}</div>
                      <div className="text-2xs text-slate-500 mt-0.5">{m.specs}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preflight Confirmation Gate */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>{tBilingual('Mandatory Pre-Press Quality Check', 'প্রি-প্রেস কোয়ালিটি চেকলিস্ট')}</span>
                </div>
                <div className="space-y-1.5 pl-6 text-xs text-amber-800 dark:text-amber-300">
                  <div>• Colors verified in CMYK mode (no unseparated RGB colors)</div>
                  <div>• Resolution is 300 DPI or lossless vector curves</div>
                  <div>• 3mm bleed included with trim/crop marks if offset</div>
                  <div>• All text converted to curves (Ctrl+Shift+O)</div>
                </div>

                <label className="flex items-center gap-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preflightConfirmed}
                    onChange={(e) => setPreflightConfirmed(e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded-sm border-slate-300 focus:ring-purple-500"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {tBilingual('I have verified all preflight items for this file', 'আমি সকল প্রি-ফ্লাইট চেক সঠিকভাবে যাচাই করেছি')}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReleaseModalJob(null)}
                  className="text-xs"
                >
                  {tBilingual('Cancel', 'বাতিল')}
                </Button>

                <Button
                  size="sm"
                  disabled={!preflightConfirmed || isReleasing}
                  onClick={handleConfirmRelease}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isReleasing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{tBilingual('Releasing...', 'পাঠানো হচ্ছে...')}</span>
                    </>
                  ) : (
                    <>
                      <Printer className="h-3.5 w-3.5" />
                      <span>{tBilingual('Confirm & Release to Press', 'নিশ্চিত করুন ও প্রেসে ছাড়ুন')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

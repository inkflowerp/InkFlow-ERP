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
      <div className="rounded-xl bg-card border border-border shadow-xs p-5 sm:p-6">
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"/>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-success/20 text-success border-success-border/30 text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-0.5">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse"/>
                {tBilingual('Design Home', 'প্রি-প্রেস কমান্ড সেন্টার')}
              </Badge>
              <Badge className="bg-card/10 text-white border-border text-xs tabular-nums font-medium">
                {userDisplayName}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Palette className="h-7 w-7 text-muted-foreground"/>
              <span>{tBilingual('Graphic Design & Pre-Press Cockpit', 'গ্রাফিক ডিজাইন ও প্রি-প্রেস ককপিট')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed">
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
 className="bg-card text-primary hover:bg-primary/10 font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 h-10 px-4">
              <Sparkles className="h-4 w-4 text-primary"/>
              <span>{tBilingual('Open Design Studio', 'ডিজাইন স্টুডিও খুলুন')}</span>
            </Button>

            <Button
 onClick={() => router.push(getTenantNavHref('/orders', pathname, tenantSlug))}
 variant="outline"className="bg-primary/60 hover:bg-primary/80 text-white border-border/30 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 h-10 px-4">
              <Layers className="h-4 w-4 text-muted-foreground"/>
              <span>{tBilingual('Work Orders', 'কাজের অর্ডার')}</span>
            </Button>

            <Button
 onClick={handleRefresh}
 variant="ghost"disabled={isRefreshing}
 className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground hover:bg-card/10 rounded-xl"title="Refresh Queue">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <KpiGrid columns={4}>
        <KpiCard
 titleEn="Active Design Queue"titleBn="মোট সক্রিয় ডিজাইন কাজ"value={metrics.totalJobs}
 icon={Palette}
 colorVariant="purple"/>
        <KpiCard
 titleEn="Awaiting Client Proof"titleBn="কাস্টমার প্রুফিং বাকি"value={metrics.awaitingApproval}
 icon={Clock}
 colorVariant="warning"/>
        <KpiCard
 titleEn="Revisions Requested"titleBn="সংশোধন চাওয়া হয়েছে"value={metrics.revisions}
 icon={AlertCircle}
 colorVariant="danger"/>
        <KpiCard
 titleEn="Ready for Production"titleBn="প্রেসে যাওয়ার জন্য প্রস্তুত"value={metrics.approvedReady}
 icon={FileCheck}
 colorVariant="success"/>
      </KpiGrid>

      {/* Pre-Press Machinery Reference & Checklist Bar */}
      <Card className="border border-border bg-card shadow-xs">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5"/>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{tBilingual('Pre-Press Technical Reference & Specs', 'প্রি-প্রেস টেকনিক্যাল রেফারেন্স ও মাপ')}</span>
                <Badge variant="outline"className="text-xs uppercase font-bold text-primary text-primary border-primary/20">
 Pre-Flight Standard
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tBilingual(
                  'Offset sheet sizes (Demy, D/Demy, Crown, Royal), 3mm bleeds, CMYK color profiles, and Roland UV contour cut specs.',
                  'অফসেট শিটের স্ট্যান্ডার্ড সাইজ (ডিমাই, ডবল ডিমাই, ক্রাউন, রয়্যাল), ৩মিমি ব্লিড এবং ইউভি কাটিং পাথ গাইড।'
                )}
              </p>
            </div>
          </div>

          <Button
 size="sm"variant="outline"onClick={() => setShowSpecsGuide(!showSpecsGuide)}
 className="text-xs font-bold text-primary border-primary/20 border-border hover:bg-primary/10/50 shrink-0 flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5"/>
            <span>{showSpecsGuide ? tBilingual('Hide Reference Specs', 'মাপ লুকান') : tBilingual('View Machine Specs Guide', 'মেশিনের মাপ দেখুন')}</span>
            {showSpecsGuide ? <ChevronUp className="h-3.5 w-3.5 ml-1"/> : <ChevronDown className="h-3.5 w-3.5 ml-1"/>}
          </Button>
        </div>

        {/* Collapsible Specs Panel */}
        {showSpecsGuide && (
          <div className="border-t border-border border-border/40 p-4 sm:p-5 bg-card/70 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in-50 duration-200">
            {/* Offset Press Column */}
            <div className="p-3.5 rounded-xl border border-border bg-muted space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Printer className="h-4 w-4 text-primary"/>
                <span>Commercial Offset Press</span>
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Demy Sheet:</strong> 18"× 23"in (Print area: 17.5"× 22.5")</li>
                <li>• <strong>Double Demy:</strong> 23"× 36"in (Plate: 28"× 40")</li>
                <li>• <strong>Crown Sheet:</strong> 15"× 20"in</li>
                <li>• <strong>Royal Sheet:</strong> 20"× 25"in</li>
                <li>• <strong>Bleed:</strong> 3mm (0.125"), Safe Margin: 4mm from trim</li>
                <li>• <strong>Profile:</strong> CMYK Coated FOGRA39 / 300 DPI</li>
              </ul>
            </div>

            {/* Large Format & UV Column */}
            <div className="p-3.5 rounded-xl border border-border bg-muted space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Layers className="h-4 w-4 text-primary"/>
                <span>Roland & UV Flatbed</span>
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Eco-Solvent Width:</strong> 54 in / 64 in / 10 ft roll</li>
                <li>• <strong>UV Bed:</strong> 8 ft × 4 ft Rigid Acrylic / Foam Board</li>
                <li>• <strong>Contour Cut:</strong> Spot color stroke named <code>CutContour</code> (100% Magenta, 0.25 pt)</li>
                <li>• <strong>Resolution:</strong> 150–300 DPI at 1:1 Scale</li>
                <li>• <strong>File Format:</strong> High-res TIFF or Vector PDF (X-1a)</li>
              </ul>
            </div>

            {/* Digital Laser Column */}
            <div className="p-3.5 rounded-xl border border-border bg-muted space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Sparkles className="h-4 w-4 text-warning"/>
                <span>Digital Press (Konica/Xerox)</span>
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Standard Sheets:</strong> A4, A3, 12"× 18"</li>
                <li>• <strong>Super A3 Banner:</strong> 13"× 19"(330mm × 487mm)</li>
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
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('All Active', 'সকল সক্রিয়')} ({metrics.totalJobs})
            </button>

            <button
 onClick={() => setActiveFilterTab('needs_design')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'needs_design'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('Needs Design', 'ডিজাইন বাকি')} ({metrics.needsDesign})
            </button>

            <button
 onClick={() => setActiveFilterTab('awaiting_approval')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'awaiting_approval'
                  ? 'bg-warning text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('Awaiting Proof', 'প্রুফিং বাকি')} ({metrics.awaitingApproval})
            </button>

            <button
 onClick={() => setActiveFilterTab('revisions')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'revisions'
                  ? 'bg-destructive text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('Revisions', 'সংশোধন')} ({metrics.revisions})
            </button>

            <button
 onClick={() => setActiveFilterTab('approved')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilterTab === 'approved'
                  ? 'bg-success text-white shadow-sm'
                  : 'bg-muted hover:bg-muted text-foreground '
              }`}
            >
              {tBilingual('Ready for Press', 'প্রিন্টে প্রস্তুত')} ({metrics.approvedReady})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
            <Input
 type="text"placeholder={tBilingual('Search jobs, orders, clients...', 'খুঁজুন...')}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-8 h-9 text-xs bg-card border-border"/>
          </div>
        </div>

        {/* Job Cards Queue */}
        {isLoadingJobs ? (
          <Card className="border border-border p-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-6 w-6 text-primary animate-spin"/>
              <p className="text-xs font-semibold text-muted-foreground">
                {tBilingual('Loading pre-press design queue...', 'ডিজাইন তালিকা লোড হচ্ছে...')}
              </p>
            </div>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card className="border border-dashed border-input p-12 text-center bg-muted">
            <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary bg-primary/40 flex items-center justify-center">
                <Palette className="h-6 w-6"/>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {tBilingual('No design tasks found in this view', 'এই বিভাগে কোনো ডিজাইন কাজ নেই')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tBilingual(
                  'All assigned artwork and pre-press tasks are up to date. You can create a new design task or open the full studio.',
                  'বর্তমানে কোনো কাজ পেন্ডিং নেই। নতুন ডিজাইন শুরু করতে স্টুডিওতে যান।'
                )}
              </p>
              <Button
 onClick={() => router.push(getTenantNavHref('/design', pathname, tenantSlug))}
 className="bg-primary hover:bg-primary text-white font-bold text-xs mt-2">
                <Sparkles className="h-3.5 w-3.5 mr-1.5"/>
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
 className="border border-border hover:border-primary/20 dark:hover:border-border transition-all shadow-xs bg-card overflow-hidden">
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Job Info */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline"className="text-xs tabular-nums font-bold bg-muted text-foreground">
                          #{job.design_number || job.id}
                        </Badge>

                        {job.order_number && (
                          <Badge variant="outline"className="text-xs tabular-nums font-medium text-primary text-primary border-primary/20 border-border">
 Order: #{job.order_number}
                          </Badge>
                        )}

                        {/* Status Badge */}
                        {isApproved ? (
                          <Badge className="bg-success-surface text-success bg-success-surface text-success border-success-border text-xs font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1"/>
                            {tBilingual('Pre-Press Approved', 'প্রেসে অনুমোদিত')}
                          </Badge>
                        ) : isAwaitingProof ? (
                          <Badge className="bg-warning-surface text-warning bg-warning-surface text-warning border-warning-border text-xs font-bold">
                            <Clock className="h-3 w-3 mr-1"/>
                            {tBilingual('Awaiting Proof Approval', 'প্রুফিংয়ের অপেক্ষায়')}
                          </Badge>
                        ) : isRevision ? (
                          <Badge className="bg-danger-surface text-destructive bg-danger-surface text-destructive border-danger-border text-xs font-bold">
                            <AlertCircle className="h-3 w-3 mr-1"/>
                            {tBilingual('Revision Requested', 'সংশোধন প্রয়োজন')}
                          </Badge>
                        ) : isDesigning ? (
                          <Badge className="bg-primary/10 text-primary bg-primary/10 border-primary/20 text-xs font-bold">
                            <Palette className="h-3 w-3 mr-1"/>
                            {tBilingual('Designing / Working', 'ডিজাইন চলছে')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary"className="text-xs font-bold">
                            {job.status}
                          </Badge>
                        )}

                        {/* Version tag */}
                        <Badge variant="outline"className="text-xs tabular-nums font-medium text-muted-foreground">
 v{latestVer?.version_number || job.current_version || 1}
                        </Badge>
                      </div>

                      {/* Title & Specs */}
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                          {job.title || job.product_name || 'Design Work Order'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                            <span className="text-warning text-warning font-medium">
                              <strong>Due:</strong> {job.deadline}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Preflight Checklist Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-xs uppercase font-bold text-muted-foreground mr-1">Preflight:</span>
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-success-surface text-success bg-success-surface/60 text-success border border-success-border border-success-border">
                          ✓ CMYK
                        </span>
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-success-surface text-success bg-success-surface/60 text-success border border-success-border border-success-border">
                          ✓ 300 DPI
                        </span>
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-success-surface text-success bg-success-surface/60 text-success border border-success-border border-success-border">
                          ✓ 3mm Bleed
                        </span>
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary bg-primary/10 text-primary border border-primary/20 border-border">
                          ✓ Curves / Vector
                        </span>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                      {/* WhatsApp Proof Button */}
                      <Button
 size="sm"variant="outline"onClick={() => handleOpenWhatsAppModal(job)}
 className="text-xs font-bold text-success text-success border-success-border hover:bg-success-surface dark:hover:bg-success-surface h-9">
                        <Share2 className="h-3.5 w-3.5 mr-1.5"/>
                        {tBilingual('WhatsApp Proof', 'প্রুফ পাঠান')}
                      </Button>

                      {/* Release to Operator Button */}
                      <Button
 size="sm"onClick={() => handleOpenReleaseModal(job)}
 className={`text-xs font-bold text-white shadow-xs h-9 ${
 isApproved
                            ? 'bg-card-elevated hover:bg-card-elevated'
                            : 'bg-primary hover:bg-primary'
                        }`}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1.5"/>
                        {isApproved ? tBilingual('Re-Dispatch', 'পুনরায় পাঠান') : tBilingual('Release to Press', 'প্রেসে পাঠান')}
                      </Button>

                      {/* Open in Studio Link */}
                      <Button
 size="sm"variant="ghost"onClick={() => router.push(getTenantNavHref(`/design`, pathname, tenantSlug))}
 className="text-xs font-bold text-muted-foreground hover:text-foreground dark:hover:text-foreground h-9 px-2.5"title="Open in Design Studio">
                        <ExternalLink className="h-4 w-4"/>
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
        <div className="space-y-3 pt-4 border-t border-border">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary"/>
            <span>{tBilingual('Production Floor Design Operations', 'ফ্লোর ডিজাইন ও কাটিং টাস্ক')}</span>
            <Badge variant="secondary"className="text-xs tabular-nums">{productionDesignTasks.length}</Badge>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {productionDesignTasks.map((t) => (
              <Card key={t.id} className="border border-border p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline"className="text-xs tabular-nums font-bold">
                    #{t.job_number || t.task_number}
                  </Badge>
                  <Badge className="text-xs uppercase font-bold"variant={t.status === 'completed' ? 'default' : 'secondary'}>
                    {t.status}
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-foreground mt-2 truncate">
                  {t.task_name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
          <DialogContent className="max-w-xl p-5 sm:p-6"onClose={() => setWhatsAppModalJob(null)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                  <Share2 className="h-5 w-5"/>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {tBilingual('Send Artwork Proof via WhatsApp', 'ওয়াটসঅ্যাপে ডিজাইন প্রুফ পাঠান')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
 Job #{whatsAppModalJob.design_number || whatsAppModalJob.id} • {whatsAppModalJob.customer_name}
                  </p>
                </div>
              </div>

              {/* Template Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {tBilingual('Select Proof Message Template', 'মেসেজ টেমপ্লেট নির্বাচন করুন')}:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WHATSAPP_TEMPLATES.map((tmpl) => (
                    <button
 key={tmpl.key}
 onClick={() => setWhatsAppTemplate(tmpl.key)}
 type="button"className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
 whatsAppTemplate === tmpl.key
                          ? 'border-success-border bg-success-surface/80 text-success bg-success-surface text-success'
                          : 'border-border hover:border-input text-foreground '
                      }`}
                    >
                      <div>{tmpl.title}</div>
                      <span className="text-xs text-muted-foreground font-normal">{tmpl.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-success"/>
                    <span>{tBilingual('Customer Mobile', 'মোবাইল নম্বর')}</span>
                  </label>
                  <Input
 type="text"value={customPhone}
 onChange={(e) => setCustomPhone(e.target.value)}
 placeholder="017xxxxxxxx"className="text-xs h-9"/>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    {tBilingual('Artwork Proof Link', 'প্রুফ প্রিভিউ লিংক')}
                  </label>
                  <Input
 type="text"value={customProofUrl}
 onChange={(e) => setCustomProofUrl(e.target.value)}
 placeholder="https://..."className="text-xs h-9"/>
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {tBilingual('Message Preview', 'মেসেজের বিবরণ')}
                </label>
                <div className="p-3.5 bg-muted border border-border rounded-xl text-xs tabular-nums text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {currentWhatsAppMessage}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
 variant="outline"size="sm"onClick={() => setWhatsAppModalJob(null)}
 className="text-xs">
                  {tBilingual('Cancel', 'বাতিল')}
                </Button>

                <Button
 variant="outline"size="sm"onClick={handleCopyWhatsApp}
 className="text-xs font-bold">
                  {copiedText ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-success mr-1"/>
                      {tBilingual('Copied!', 'কপি হয়েছে!')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1"/>
                      {tBilingual('Copy Text', 'মেসেজ কপি')}
                    </>
                  )}
                </Button>

                <Button
 size="sm"onClick={handleLaunchWhatsApp}
 className="bg-success hover:bg-success text-white font-bold text-xs flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5"/>
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
          <DialogContent className="max-w-lg p-5 sm:p-6"onClose={() => setReleaseModalJob(null)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Printer className="h-5 w-5"/>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {tBilingual('Release Artwork to Print Operator', 'প্রেসে ফাইল পাঠানোর চূড়ান্ত নিশ্চিতকরণ')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
 Job #{releaseModalJob.design_number || releaseModalJob.id} • {releaseModalJob.title}
                  </p>
                </div>
              </div>

              {/* Machine Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {tBilingual('Target Printing Machine', 'প্রিন্টিং মেশিন নির্বাচন করুন')}:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {PRINT_MACHINERY_LIST.map((m) => (
                    <div
 key={m.id}
 onClick={() => setSelectedMachineId(m.id)}
 className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
 selectedMachineId === m.id
                          ? 'border-border bg-primary/10/70 bg-primary/10 border-primary/20'
                          : 'border-border hover:border-input '
                      }`}
                    >
                      <div className="font-bold text-foreground">{m.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.specs}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preflight Confirmation Gate */}
              <div className="p-3 bg-warning-surface bg-warning-surface border border-warning-border border-warning-border/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-warning text-warning">
                  <AlertTriangle className="h-4 w-4 text-warning"/>
                  <span>{tBilingual('Mandatory Pre-Press Quality Check', 'প্রি-প্রেস কোয়ালিটি চেকলিস্ট')}</span>
                </div>
                <div className="space-y-1.5 pl-6 text-xs text-warning text-warning">
                  <div>• Colors verified in CMYK mode (no unseparated RGB colors)</div>
                  <div>• Resolution is 300 DPI or lossless vector curves</div>
                  <div>• 3mm bleed included with trim/crop marks if offset</div>
                  <div>• All text converted to curves (Ctrl+Shift+O)</div>
                </div>

                <label className="flex items-center gap-2.5 pt-2 border-t border-warning-border/60 border-warning-border/60 cursor-pointer">
                  <input
 type="checkbox"checked={preflightConfirmed}
 onChange={(e) => setPreflightConfirmed(e.target.checked)}
 className="h-4 w-4 text-primary rounded-sm border-input focus:ring-ring"/>
                  <span className="text-xs font-bold text-foreground">
                    {tBilingual('I have verified all preflight items for this file', 'আমি সকল প্রি-ফ্লাইট চেক সঠিকভাবে যাচাই করেছি')}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
 variant="outline"size="sm"onClick={() => setReleaseModalJob(null)}
 className="text-xs">
                  {tBilingual('Cancel', 'বাতিল')}
                </Button>

                <Button
 size="sm"disabled={!preflightConfirmed || isReleasing}
 onClick={handleConfirmRelease}
 className="bg-primary hover:bg-primary text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50">
                  {isReleasing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin"/>
                      <span>{tBilingual('Releasing...', 'পাঠানো হচ্ছে...')}</span>
                    </>
                  ) : (
                    <>
                      <Printer className="h-3.5 w-3.5"/>
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

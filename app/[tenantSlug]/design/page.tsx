'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Palette,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  Flame,
  AlertTriangle,
  User,
  Filter,
  Kanban,
  List,
  FileCode,
  FileCheck2,
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
import { getFormatBadgeColor } from '@/services/design.service'
import { DesignJobRecord, DesignStatus, DesignPriority, DesignFormat } from '@/types/design.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { CustomerRecord } from '@/types/crm.types'
import { WorkOrderModal } from '@/components/shared/work-order-modal'

const KANBAN_COLUMNS: { id: DesignStatus; title: string; titleBn: string }[] = [
  { id: 'received', title: 'Received', titleBn: 'নতুন রিকুয়েস্ট' },
  { id: 'designing', title: 'Designing', titleBn: 'ডিজাইন চলছে' },
  { id: 'customer_approval', title: 'Customer Approval', titleBn: 'অনুমোদনের অপেক্ষায়' },
  { id: 'revision', title: 'Revision Needed', titleBn: 'সংশোধন' },
  { id: 'approved', title: 'Approved & Locked', titleBn: 'অনুমোদিত ও লক' },
]

export default function DesignDashboardPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [jobs, setJobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [search, setSearch] = useState('')
  const [onlyMyJobs, setOnlyMyJobs] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  // New Design Job Modal
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDims, setJobDims] = useState('')
  const [jobPriority, setJobPriority] = useState<DesignPriority>('urgent')
  const [jobFormat, setJobFormat] = useState<DesignFormat>('ai')
  const [jobInstructions, setJobInstructions] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Filtered jobs
  const filtered = jobs.filter((j: DesignJobRecord) => {
    const matchSearch =
      j.design_number.toLowerCase().includes(search.toLowerCase()) ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      j.designer_name.toLowerCase().includes(search.toLowerCase())

    const matchMy = !onlyMyJobs || j.designer_name.includes('Tanvir')
    return matchSearch && matchMy
  })

  // Quick Stats
  const countDesigning = jobs.filter((j: DesignJobRecord) => j.status === 'designing').length
  const countApproval = jobs.filter((j: DesignJobRecord) => j.status === 'customer_approval').length
  const countRevision = jobs.filter((j: DesignJobRecord) => j.status === 'revision').length
  const countApproved = jobs.filter((j: DesignJobRecord) => j.status === 'approved').length

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault()
    const customer = customers.find((c: CustomerRecord) => c.id === selectedCustomerId) || customers[0]
    const dsnNumber = `DSN-${Date.now().toString().slice(-4)}`

    const newJob: DesignJobRecord = {
      id: `dsn-${Date.now()}`,
      company_id: company?.id || 'c-01',
      design_number: dsnNumber,
      customer_id: customer?.id || 'cust-01',
      customer_name: customer?.name || 'Walk-in Customer',
      title: jobTitle,
      designer_name: 'Tanvir Ahmed (Me)',
      priority: jobPriority,
      status: 'received',
      deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] + ' 18:00',
      instructions: jobInstructions,
      dimensions_spec: jobDims,
      current_version: 1,
      revision_count: 0,
      is_locked: false,
      versions: [
        {
          id: `dv-${Date.now()}`,
          design_job_id: `dsn-${Date.now()}`,
          version_number: 1,
          version_label: 'Version 1 (Brief Assets)',
          proof_file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
          proof_file_name: 'initial_brief.png',
          file_format: jobFormat,
          change_notes: 'Client brief and logo assets uploaded.',
          uploaded_by_name: 'Tanvir Ahmed',
          is_approved: false,
          created_at: 'Just now',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, newJob)
    setIsNewOpen(false)
    showNotification(`Design Job ${dsnNumber} assigned to your workbench!`)
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Pre-Press Design & Artwork Studio"
        titleBn="প্রি-প্রেস ডিজাইন ও আর্টওয়ার্ক স্টুডিও"
        descriptionEn="Manage multi-format vector proofs, artwork version revisions, customer approval locks, and production prepress."
        descriptionBn="ভেক্টর প্রুফ, আর্টওয়ার্ক রিভিশন, গ্রাহকের অনুমোদন এবং প্রিন্ট প্রস্তুত ফাইল পরিচালনা করুন।"
        icon={Palette}
        iconColor="text-pink-600"
        actions={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                onClick={() => setViewMode('kanban')}
                className="h-7 text-xs px-2.5 bangla-text"
              >
                <Kanban className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Board', 'বোর্ড')}
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="h-7 text-xs px-2.5 bangla-text"
              >
                <List className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Table', 'তালিকা')}
              </Button>
            </div>

            <Button
              size="sm"
              onClick={() => setIsWorkOrderOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs text-white bangla-text shadow-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Add Work Order', 'ওয়ার্ক অর্ডার')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewOpen(true)}
              className="bg-pink-600 hover:bg-pink-700 text-xs text-white bangla-text"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Design Job', 'নতুন ডিজাইন জব')}
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

      {/* Designer Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-500">In Progress (Designing)</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{countDesigning}</div>
          <span className="text-[11px] text-slate-400">Active artboard jobs</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Awaiting Customer Approval</span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {countApproval}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Digital proofs sent</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <span className="text-xs font-semibold text-slate-500">Revisions Requested</span>
          <div className="text-2xl font-black text-purple-600 mt-1">{countRevision}</div>
          <span className="text-[11px] text-purple-600 font-medium">Client requested adjustments</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500">Approved & Locked</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{countApproved}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Ready for print & fabrication</span>
        </Card>
      </div>

      {/* Search & My Jobs Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by design number, title, customer, or designer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={onlyMyJobs ? 'default' : 'outline'}
              onClick={() => setOnlyMyJobs(!onlyMyJobs)}
              className="text-xs h-9"
            >
              <User className="h-3.5 w-3.5 mr-1" />
              {onlyMyJobs ? 'Showing: My Jobs Only' : 'Filter: My Jobs'}
            </Button>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          KANBAN WORKFLOW BOARD VIEW
         ========================================================================= */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colJobs = filtered.filter((j: DesignJobRecord) => {
              if (col.id === 'approved') return j.status === 'approved'
              if (col.id === 'revision') return j.status === 'revision'
              if (col.id === 'customer_approval') return j.status === 'customer_approval'
              if (col.id === 'designing') return j.status === 'designing'
              return j.status === 'received'
            })

            return (
              <div
                key={col.id}
                className="bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col min-w-[240px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {col.title}
                    </span>
                    <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-bold flex items-center justify-center text-slate-600 dark:text-slate-400">
                      {colJobs.length}
                    </span>
                  </div>
                  {col.id === 'approved' && <Lock className="h-3.5 w-3.5 text-emerald-600" />}
                </div>

                {/* Job Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {colJobs.map((job: DesignJobRecord) => {
                    const latestVersion = job.versions[job.versions.length - 1]
                    const format = latestVersion?.file_format || 'ai'

                    return (
                      <Card
                        key={job.id}
                        className="p-3 hover:shadow-md transition-all border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 group"
                      >
                        {/* Thumbnail / Format Preview */}
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-2">
                          <img
                            src={latestVersion?.proof_file_url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'}
                            alt={job.title}
                            className="w-full h-full object-cover"
                          />
                          {/* File Format Badge */}
                          <div className="absolute top-2 left-2">
                            <span
                              className={`uppercase text-[10px] font-black px-1.5 py-0.5 rounded border shadow-sm ${getFormatBadgeColor(
                                format
                              )}`}
                            >
                              .{format}
                            </span>
                          </div>

                          {/* Version Counter Badge */}
                          <div className="absolute top-2 right-2">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
                              v{job.current_version}
                            </span>
                          </div>

                          {/* Lock Badge if Approved */}
                          {job.is_locked && (
                            <div className="absolute bottom-2 right-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow">
                                <Lock className="h-2.5 w-2.5" /> Locked
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title & Customer */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-pink-600 dark:text-pink-400">
                              {job.design_number}
                            </span>
                            {job.priority === 'very_urgent' && (
                              <span className="text-[10px] font-black text-red-600 flex items-center gap-0.5">
                                <Flame className="h-3 w-3" /> Urgent
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2">
                            {job.title}
                          </h4>
                          <div className="text-[11px] text-slate-500 truncate">
                            {job.customer_name}
                          </div>
                        </div>

                        {/* Footer Info */}
                        <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{job.deadline.split(' ')[0]}</span>
                          </div>

                          <Link
                            href={`/${slug}/design/${job.id}`}
                            className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400 font-bold hover:underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Design #</th>
                  <th className="py-3 px-4">Title & Format</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Designer</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((job: DesignJobRecord) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-pink-600">
                      {job.design_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{job.title}</div>
                      <div className="text-[11px] text-slate-400">{job.dimensions_spec}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {job.customer_name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {job.designer_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold">
                      v{job.current_version}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      {job.deadline}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/${slug}/design/${job.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Workbench
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* MODAL: CREATE DESIGN JOB */}
      <ModalDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        title="Create New Prepress Design Job"
        description="Assign customer brief, specifications, and primary format to designer workbench."
      >
        <form onSubmit={handleCreateJob} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <Label htmlFor="djCust" required>Customer Profile</Label>
            <select
              id="djCust"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="">Select customer...</option>
              {customers.map((c: CustomerRecord) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="djTitle" required>Artwork / Design Title</Label>
            <Input
              id="djTitle"
              placeholder="e.g. 3D Acrylic Facade Signboard Vector Layout"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="djDims" required>Dimensions (W × H)</Label>
              <Input
                id="djDims"
                placeholder="e.g. 20ft × 4ft (150 DPI)"
                value={jobDims}
                onChange={(e) => setJobDims(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="djFmt" required>Production Format</Label>
              <select
                id="djFmt"
                value={jobFormat}
                onChange={(e) => setJobFormat(e.target.value as DesignFormat)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase"
              >
                <option value="ai">.AI (Adobe Illustrator)</option>
                <option value="psd">.PSD (Photoshop)</option>
                <option value="cdr">.CDR (CorelDRAW)</option>
                <option value="pdf">.PDF (Print Press Ready)</option>
                <option value="svg">.SVG (Vector)</option>
                <option value="zip">.ZIP (Package)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="djPri" required>Priority</Label>
              <select
                id="djPri"
                value={jobPriority}
                onChange={(e) => setJobPriority(e.target.value as DesignPriority)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="very_urgent">Very Urgent (জরুরি)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="djInst">Design Brief & Client Instructions</Label>
            <textarea
              id="djInst"
              rows={3}
              placeholder="e.g. PMS 300C corporate cyan, 2-inch border margins for welding, include LED holes..."
              value={jobInstructions}
              onChange={(e) => setJobInstructions(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">
              Launch Design Job
            </Button>
          </div>
        </form>
      </ModalDialog>

      <WorkOrderModal
        isOpen={isWorkOrderOpen}
        onClose={() => setIsWorkOrderOpen(false)}
        onSuccess={(order, sentToManager) => {
          showNotification(
            sentToManager
              ? tBilingual(
                  `Work Order #${order.order_number} saved & Invoice Request sent to Manager!`,
                  `ওয়ার্ক অর্ডার #${order.order_number} সংরক্ষিত এবং ম্যানেজারের কাছে ইনভয়েস রিকোয়েস্ট পাঠানো হয়েছে!`
                )
              : tBilingual(
                  `Work Order #${order.order_number} created successfully.`,
                  `ওয়ার্ক অর্ডার #${order.order_number} সফলভাবে তৈরি হয়েছে।`
                )
          )
        }}
      />
    </div>
  )
}

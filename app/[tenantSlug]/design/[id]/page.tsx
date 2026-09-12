'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Palette,
  ArrowLeft,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Upload,
  Layers,
  FileCode,
  FileCheck2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  History,
  CornerDownRight,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import {
  isRenderableFormat,
  getFormatBadgeColor,
} from '@/lib/formatters'
import {
  DesignJobRecord,
  DesignVersionRecord,
  DesignStatus,
  DesignFormat,
  DesignFeedbackRecord,
} from '@/types/design.types'

import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function DesignDetailPage() {
  const params = useParams()
  const jobId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [jobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const job = jobs.find((j: DesignJobRecord) => j.id === jobId || j.design_number === jobId)
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(job?.current_version || 1)

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // New Version Form State
  const [newVersionNotes, setNewVersionNotes] = useState('')
  const [newVersionFormat, setNewVersionFormat] = useState<DesignFormat>('ai')
  const [newVersionFileName, setNewVersionFileName] = useState('')

  // Approval Form State
  const [approverName, setApproverName] = useState('')
  const [approvalNote, setApprovalNote] = useState('')

  // Feedback Form State
  const [feedbackText, setFeedbackText] = useState('')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  if (!job) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Link
          href={`/${slug}/design`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Design Jobs
        </Link>
        <Card className="p-12 text-center border-dashed">
          <Palette className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Design Job Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The design job record you are looking for does not exist in your organization.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`/${slug}/design`}>View All Design Jobs</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Active version object
  const activeVersion =
    job.versions?.find((v: DesignVersionRecord) => v.version_number === activeVersionNumber) ||
    job.versions?.[job.versions.length - 1] || {
      id: 'dv-def',
      design_job_id: job.id,
      version_number: 1,
      version_label: 'Initial Brief',
      proof_file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      proof_file_name: 'brief.png',
      file_format: 'ai' as DesignFormat,
      change_notes: 'Initial artwork',
      uploaded_by_name: 'Designer',
      is_approved: false,
      created_at: 'Just now',
    }

  // Status Change
  const handleStatusChange = (newStatus: DesignStatus) => {
    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    showNotification(`Job status moved to ${newStatus.replace('_', ' ').toUpperCase()}`)
  }

  // Upload New Version (Prevented if locked)
  const handleUploadVersion = (e: React.FormEvent) => {
    e.preventDefault()
    if (job.is_locked) {
      showNotification('Artwork is currently locked! Unlock first to upload a revision.')
      return
    }

    const nextVerNum = (job.versions?.length || 0) + 1
    const newVer: DesignVersionRecord = {
      id: `dv-${Date.now()}`,
      design_job_id: job.id,
      version_number: nextVerNum,
      version_label: `Version ${nextVerNum}`,
      proof_file_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
      proof_file_name: `proof_${newVersionFileName.replace(/\.[^/.]+$/, '')}.png`,
      source_file_url: `/storage/artworks/${newVersionFileName}`,
      source_file_name: newVersionFileName,
      file_format: newVersionFormat,
      file_size_bytes: 45000000,
      change_notes: newVersionNotes,
      uploaded_by_name: 'Current Designer',
      is_approved: false,
      created_at: 'Just now',
    }

    const updatedJob = {
      current_version: nextVerNum,
      versions: [...(job.versions || []), newVer],
      status: 'customer_approval' as const,
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updatedJob)
    setActiveVersionNumber(nextVerNum)
    setIsUploadOpen(false)
    showNotification(`Version ${nextVerNum} created and dispatched for customer proof approval!`)
  }

  // Customer Approval & Lock
  const handleApproveAndLock = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedVersions = (job.versions || []).map((v: DesignVersionRecord) => ({
      ...v,
      is_approved: v.version_number === activeVersionNumber,
    }))

    const updatedJob = {
      status: 'approved' as const,
      approved_version: activeVersionNumber,
      approved_by: approverName,
      approval_timestamp: new Date().toISOString(),
      approval_note: approvalNote,
      is_locked: true, // LOCK ARTWORK FROM ACCIDENTAL REPLACEMENT
      versions: updatedVersions,
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updatedJob)
    setIsApproveOpen(false)
    showNotification(`Version ${activeVersionNumber} officially approved & locked for production!`)
  }

  // Unlock by Supervisor
  const handleToggleLock = () => {
    const nextLocked = !job.is_locked
    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
      is_locked: nextLocked,
      updated_at: new Date().toISOString(),
    })
    showNotification(
      nextLocked
        ? 'Artwork is now locked against accidental replacement.'
        : 'Artwork unlocked for emergency revision.'
    )
  }

  // Add Customer Feedback (Triggers Revision status)
  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault()
    const newFeedback: DesignFeedbackRecord = {
      id: `fb-${Date.now()}`,
      design_job_id: job.id,
      version_number: activeVersionNumber,
      sender_type: 'customer',
      sender_name: 'Customer Representative',
      message: feedbackText,
      created_at: 'Just now',
    }

    const nextRevCount = (job.revision_count || 0) + 1
    const updatedJob = {
      status: 'revision' as const,
      revision_count: nextRevCount,
      customer_feedback: feedbackText,
      feedback_logs: [...(job.feedback_logs || []), newFeedback],
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updatedJob)
    setIsFeedbackOpen(false)
    setFeedbackText('')
    showNotification(`Customer feedback registered. Job marked for REVISION (Rev #${nextRevCount}).`)
  }

  const isRenderable = isRenderableFormat(activeVersion.file_format)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Back Link */}
      <div>
        <Link
          href={`/${slug}/design`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Design Studio
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {job.design_number}
              </h1>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-300">
                {job.status.replace('_', ' ')}
              </span>
              {job.is_locked && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-xs">
                  <Lock className="h-3 w-3" /> Locked for Production
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {job.title}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
              <span>Customer: <strong>{job.customer_name}</strong></span>
              <span>•</span>
              <span>Designer: <strong>{job.designer_name}</strong></span>
              <span>•</span>
              <span>Target Specs: <strong>{job.dimensions_spec}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Select */}
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value as DesignStatus)}
              className="h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="received">Received</option>
              <option value="designing">Designing</option>
              <option value="customer_approval">Customer Approval</option>
              <option value="revision">Revision</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Customer Feedback Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFeedbackOpen(true)}
              className="h-8 text-xs"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1 text-purple-600" />
              Add Feedback
            </Button>

            {/* Upload New Version Button */}
            <Button
              size="sm"
              variant="outline"
              disabled={job.is_locked}
              onClick={() => setIsUploadOpen(true)}
              className="h-8 text-xs disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Upload Revision
            </Button>

            {/* Approve & Lock Button */}
            {!job.is_locked ? (
              <Button
                size="sm"
                onClick={() => setIsApproveOpen(true)}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve & Lock Version
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleLock}
                className="h-8 text-xs text-amber-700 border-amber-300 dark:text-amber-400 hover:bg-amber-50"
              >
                <Unlock className="h-3.5 w-3.5 mr-1" />
                Supervisor Unlock
              </Button>
            )}
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

      {/* =========================================================================
          CUSTOMER APPROVAL & IMMUTABILITY LOCK BANNER
          Prevents accidental replacement or deletion once approved.
         ========================================================================= */}
      {job.is_locked && (
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-black text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                Artwork Version {job.approved_version} Approved & Locked
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Approved by <strong>{job.approved_by}</strong> on {job.approval_timestamp}.
                {job.approval_note && <span> Notes: &ldquo;{job.approval_note}&rdquo;</span>}
              </p>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                Protection enabled: File replacement and revision uploads are locked to prevent shop floor discrepancies.
              </div>
            </div>
          </div>

          <Badge className="bg-emerald-700 text-white border-none text-xs px-3 py-1 font-bold shrink-0 self-start sm:self-center">
            Production Ready
          </Badge>
        </div>
      )}

      {/* Main Grid: Artwork Preview (7 cols) + Versions & Feedback (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: ARTWORK VIEWER & SAFE FORMAT MANAGER */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span>{activeVersion.version_label}</span>
                    {activeVersion.is_approved && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> (Approved)
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Uploaded by {activeVersion.uploaded_by_name} • {activeVersion.created_at}
                  </CardDescription>
                </div>

                <span
                  className={`uppercase text-xs font-black px-2 py-0.5 rounded border ${getFormatBadgeColor(
                    activeVersion.file_format
                  )}`}
                >
                  .{activeVersion.file_format}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* SAFE FORMAT RENDERING ENGINE
                  Rule: Do NOT attempt to render unsupported design formats (.ai, .psd, .cdr, .zip) */}
              {isRenderable ? (
                /* High-Res Renderable Proof (JPG, PNG, PDF, SVG) */
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center min-h-[360px] relative group">
                  <img
                    src={activeVersion.proof_file_url}
                    alt={activeVersion.proof_file_name}
                    className="max-h-[480px] w-full object-contain"
                  />
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={activeVersion.proof_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-bold hover:bg-black"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Fullscreen Proof
                    </a>
                  </div>
                </div>
              ) : (
                /* Unsupported Raw Format Card (AI, PSD, CDR, ZIP) */
                <div className="p-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center space-y-3">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 flex items-center justify-center font-black text-2xl">
                    .{activeVersion.file_format.toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Raw Vector/Raster Production File
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Format <code>.{activeVersion.file_format.toUpperCase()}</code> contains native layers, spot colors, and contour paths. Browser rendering is bypassed to protect vector accuracy.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download {activeVersion.source_file_name || activeVersion.proof_file_name}
                      {activeVersion.file_size_bytes && (
                        <span className="opacity-75 ml-1">
                          ({(activeVersion.file_size_bytes / 1000000).toFixed(1)} MB)
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Version Change Notes */}
              {activeVersion.change_notes && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Version Notes & Adjustments:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    {activeVersion.change_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: VERSION SELECTOR & FEEDBACK TIMELINE */}
        <div className="lg:col-span-5 space-y-4">
          {/* Version Selector Tabs */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-600" />
                  Artwork Versions ({job.versions.length})
                </CardTitle>
                <span className="text-xs text-slate-400">Select version to inspect</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {job.versions.map((ver: DesignVersionRecord) => (
                <div
                  key={ver.id}
                  onClick={() => setActiveVersionNumber(ver.version_number)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    activeVersionNumber === ver.version_number
                      ? 'border-pink-600 bg-pink-50/50 dark:bg-pink-950/30 ring-2 ring-pink-600/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                      {ver.version_label}
                      {ver.is_approved && (
                        <span className="text-[10px] text-emerald-600 font-black">✓ APPROVED</span>
                      )}
                    </span>
                    <span
                      className={`uppercase text-[10px] font-black px-1.5 py-0.5 rounded border ${getFormatBadgeColor(
                        ver.file_format
                      )}`}
                    >
                      .{ver.file_format}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                    {ver.change_notes || 'No change notes recorded.'}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>By {ver.uploaded_by_name}</span>
                    <span>{ver.created_at}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Customer Feedback Thread */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                  Customer Feedback & Revision Thread
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFeedbackOpen(true)}
                  className="h-7 text-[11px] px-2"
                >
                  + Add Remarks
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs max-h-[360px] overflow-y-auto">
              {job.feedback_logs && job.feedback_logs.length > 0 ? (
                job.feedback_logs.map((log: DesignFeedbackRecord) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${
                      log.sender_type === 'customer'
                        ? 'bg-purple-50/60 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800'
                        : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="capitalize text-slate-900 dark:text-white">
                        {log.sender_name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{log.created_at}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mt-1 text-[11px] leading-relaxed">
                      {log.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No feedback logged yet. Client is reviewing active proof.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL: UPLOAD NEW VERSION */}
      <ModalDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title="Upload Artwork Revision"
        description="Creates a new version increment (e.g. Version 2, Version 3) and records changelog."
      >
        <form onSubmit={handleUploadVersion} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vFmt" required>File Format</Label>
              <select
                id="vFmt"
                value={newVersionFormat}
                onChange={(e) => setNewVersionFormat(e.target.value as DesignFormat)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase"
              >
                <option value="ai">.AI (Illustrator)</option>
                <option value="psd">.PSD (Photoshop)</option>
                <option value="cdr">.CDR (CorelDRAW)</option>
                <option value="pdf">.PDF (Print Proof)</option>
                <option value="png">.PNG (Raster)</option>
                <option value="svg">.SVG (Vector)</option>
                <option value="zip">.ZIP (Package)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vFile" required>File Name</Label>
              <Input
                id="vFile"
                value={newVersionFileName}
                onChange={(e) => setNewVersionFileName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vNotes" required>Change Notes & Revision Details</Label>
            <textarea
              id="vNotes"
              rows={3}
              placeholder="e.g. Corrected hotline typography; matched background to PMS 300C; added 2-inch welding borders."
              value={newVersionNotes}
              onChange={(e) => setNewVersionNotes(e.target.value)}
              required
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Upload Version & Notify Client
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: CUSTOMER APPROVAL & LOCK */}
      <ModalDialog
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title="Customer Approval & Immutability Lock"
        description={`Officially confirm Version ${activeVersionNumber} and lock against accidental changes.`}
      >
        <form onSubmit={handleApproveAndLock} className="space-y-4 pt-1">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
            <strong className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Production Fidelity Lock
            </strong>
            <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
              Once approved, Version {activeVersionNumber} will be locked. Designers cannot overwrite or delete this artwork without supervisor override.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appBy" required>Approved By (Customer Representative)</Label>
            <Input
              id="appBy"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appNotes" required>Approval Sign-off Note</Label>
            <textarea
              id="appNotes"
              rows={3}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              required
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirm Sign-off & Lock Artwork
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: ADD CUSTOMER FEEDBACK */}
      <ModalDialog
        open={isFeedbackOpen}
        onOpenChange={setIsFeedbackOpen}
        title="Log Customer Feedback & Request Revision"
        description="Records client correction notes and automatically advances job status to 'Revision'."
      >
        <form onSubmit={handleAddFeedback} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="fbTxt" required>Customer Feedback / Revision Instructions</Label>
            <textarea
              id="fbTxt"
              rows={4}
              placeholder="e.g. Please increase size of corporate logo by 15% and change background gradient to solid blue."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              required
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              Log Feedback & Mark Revision
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}

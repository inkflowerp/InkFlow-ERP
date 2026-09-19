'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
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
  Receipt,
  Send,
  HelpCircle,
  Image as ImageIcon,
  Check,
  Clipboard,
  X,
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
import type {
  DesignJobRecord,
  DesignVersionRecord,
  DesignStatus,
  DesignFormat,
  DesignFeedbackRecord,
} from '@/types/design.types'
import type { InvoiceRecord } from '@/types/billing.types'
import type { InvoiceRequestRecord } from '@/types/workflow.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { cn } from '@/lib/utils'

import { useDataStore } from '@/hooks/use-data-store'
import { createInvoiceRequestAction } from '@/actions/invoice-request.actions'
import { markDesignReadyAction, sendToPrintOperatorAction } from '@/actions/design.actions'
import { Printer } from 'lucide-react'

export default function DesignDetailPage() {
  const params = useParams()
  const jobId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [isPending, startTransition] = useTransition()
  const [jobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [invoiceRequests] = useDataStore<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS, [])

  const isMatchingCompany = (id?: string | null) => {
    if (!id) return false
    return (
      (company?.id && id === company.id) ||
      (company?.slug && id === company.slug) ||
      (slug && id === slug)
    )
  }

  const job = jobs.find(
    (j: DesignJobRecord) => (j.id === jobId || j.design_number === jobId) && isMatchingCompany(j.company_id)
  )
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(job?.current_version || 1)

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isInvoiceRequestOpen, setIsInvoiceRequestOpen] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null)

  // New Version Form State (.JPG / .PNG only with paste support)
  const [newVersionNotes, setNewVersionNotes] = useState('')
  const [newVersionFormat, setNewVersionFormat] = useState<DesignFormat>('png')
  const [newVersionFileName, setNewVersionFileName] = useState('')
  const [newVersionProofUrl, setNewVersionProofUrl] = useState<string>('')
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Approval Form State
  const [approverName, setApproverName] = useState('')
  const [approvalNote, setApprovalNote] = useState('')

  // Feedback Form State
  const [feedbackText, setFeedbackText] = useState('')

  // Invoice Request Form State
  const [requestNotes, setRequestNotes] = useState('')
  const [estimatedAmount, setEstimatedAmount] = useState<number>(5000)

  const showNotification = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Process image file for upload (supporting only .jpg, .jpeg, .png)
  const processImageFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const isJpeg = ext === 'jpg' || ext === 'jpeg'
    const isPng = ext === 'png'

    if (!isJpeg && !isPng) {
      showNotification('Unsupported format! Only .JPG and .PNG images are supported.', 'warning')
      return
    }

    const fmt: DesignFormat = isJpeg ? 'jpg' : 'png'
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setNewVersionProofUrl(dataUrl)
        setNewVersionFileName(file.name || `proof_${Date.now()}.${fmt}`)
        setNewVersionFormat(fmt)
        if (!newVersionNotes) {
          setNewVersionNotes(`Uploaded ${file.name} (${fmt.toUpperCase()})`)
        }
        setIsUploadOpen(true)
        showNotification(`Image loaded: ${file.name} (${fmt.toUpperCase()})!`, 'success')
      }
    }
    reader.readAsDataURL(file)
  }

  // Global Clipboard Paste (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            const nextVerNum = (job?.versions?.length || 0) + 1
            const fmt: DesignFormat = item.type === 'image/jpeg' ? 'jpg' : 'png'
            const customName = `proof_${job?.design_number?.toLowerCase() || 'artwork'}_v${nextVerNum}.${fmt}`

            const reader = new FileReader()
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string
              if (dataUrl) {
                setNewVersionProofUrl(dataUrl)
                setNewVersionFileName(customName)
                setNewVersionFormat(fmt)
                if (!newVersionNotes) {
                  setNewVersionNotes(`Pasted screenshot artwork (Ctrl+V) for v${nextVerNum}`)
                }
                setIsUploadOpen(true)
                showNotification(`Image pasted from clipboard (${fmt.toUpperCase()})! Ready to save.`, 'success')
              }
            }
            reader.readAsDataURL(file)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [job, isUploadOpen, newVersionNotes])

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

  // Determine Invoice State & Requests
  const linkedInvoice =
    invoices.find((i) => (job.invoice_id && i.id === job.invoice_id) || (job.sales_order_id && i.sales_order_id === job.sales_order_id)) || null
  const hasInvoice = Boolean(job.invoice_id || linkedInvoice)
  const invoiceNumber = linkedInvoice?.invoice_number || job.invoice_number || 'INV-XXXX'

  const pendingRequest =
    invoiceRequests.find(
      (r) =>
        r.company_id === job.company_id &&
        r.status === 'pending' &&
        (r.design_job_id === job.id || (job.sales_order_id && r.sales_order_id === job.sales_order_id))
    ) || null
  const hasPendingRequest = Boolean(pendingRequest || job.commercial_status === 'invoice_requested')

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

  // Action: Mark Design Ready
  const handleMarkDesignReady = async () => {
    startTransition(async () => {
      try {
        await markDesignReadyAction(job.id, 'Designer marked design ready for production proofing', job.company_id)
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
          status: 'customer_approval',
          commercial_status: hasInvoice ? 'invoice_created' : 'invoice_required',
          updated_at: new Date().toISOString(),
        })

        if (hasInvoice) {
          showNotification('Design marked READY! Invoice is linked. Proceeding to Customer Approval.')
        } else {
          showNotification('Design marked READY! Invoice is missing — please click "Send Invoice Request" below.', 'warning')
          setIsInvoiceRequestOpen(true)
        }
      } catch (err: any) {
        showNotification(err.message || 'Failed to update status', 'warning')
      }
    })
  }

  // Action: Send Invoice Request to Sales/Manager
  const handleSendInvoiceRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const res = await createInvoiceRequestAction({
          companyId: job.company_id,
          customerId: job.customer_id || null,
          customerName: job.customer_name,
          customerPhone: (job as any).customer_phone || null,
          customerEmail: (job as any).customer_email || null,
          customerAddress: (job as any).customer_address || null,
          companyName: (job as any).company_name || null,
          salesOrderId: job.sales_order_id || null,
          orderNumber: (job as any).order_number || null,
          designJobId: job.id,
          designNumber: job.design_number,
          itemsSummary: `${job.title} (${job.dimensions_spec || 'Standard'})`,
          estimatedAmount: estimatedAmount,
          notes: requestNotes || `Artwork ${job.design_number} ready for billing`,
        })

        if (!res.success) {
          showNotification(res.error || 'Failed to dispatch request', 'warning')
          return
        }

        // Update local store
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
          commercial_status: 'invoice_requested',
          invoice_request_id: res.data?.id,
          updated_at: new Date().toISOString(),
        })

        setIsInvoiceRequestOpen(false)
        setRequestNotes('')
        showNotification(`Invoice Request dispatched to Sales/Billing! (Req #${res.data?.request_number})`)
      } catch (err: any) {
        showNotification(err.message || 'Failed to dispatch request', 'warning')
      }
    })
  }

  // Upload New Version (Prevented if locked)
  const handleUploadVersion = (e: React.FormEvent) => {
    e.preventDefault()
    if (job.is_locked) {
      showNotification('Artwork is currently locked! Unlock first to upload a revision.', 'warning')
      return
    }

    const nextVerNum = (job.versions?.length || 0) + 1
    const proofUrl = newVersionProofUrl || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80'
    const fileName = newVersionFileName || `proof_${job.design_number.toLowerCase()}_v${nextVerNum}.${newVersionFormat}`

    const newVer: DesignVersionRecord = {
      id: `dv-${Date.now()}`,
      design_job_id: job.id,
      version_number: nextVerNum,
      version_label: `Version ${nextVerNum}`,
      proof_file_url: proofUrl,
      proof_file_name: fileName,
      source_file_url: proofUrl,
      source_file_name: fileName,
      file_format: newVersionFormat,
      file_size_bytes: 4500000,
      change_notes: newVersionNotes || `Version ${nextVerNum} artwork revision`,
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
    setNewVersionProofUrl('')
    setNewVersionFileName('')
    setNewVersionNotes('')
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
      is_locked: true,
      versions: updatedVersions,
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updatedJob)
    setIsApproveOpen(false)
    showNotification(`Version ${activeVersionNumber} officially approved & locked for production!`)
  }

  // Action: Send to Print Operator Queue
  const handleSendToPrint = async () => {
    startTransition(async () => {
      try {
        const res = await sendToPrintOperatorAction(job.id, job.company_id)
        if (!res.success) {
          showNotification(res.error || 'Failed to send to print operator', 'warning')
          return
        }

        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
          status: 'approved',
          workflow_routing: 'ready_production',
          is_locked: true,
          updated_at: new Date().toISOString(),
        })

        showNotification(`Job #${job.design_number} queued for Print Floor Operators!`)
      } catch (err: any) {
        showNotification(err.message || 'Failed to send to print operator', 'warning')
      }
    })
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

  const currentFormat = activeVersion?.file_format || ((activeVersion?.file_name || activeVersion?.proof_file_name || '').split('.').pop() as any) || 'pdf'
  const isRenderable = isRenderableFormat(currentFormat)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Back Link */}
      <div>
        <Link
          href={`/${slug}/design`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tBilingual('Back to Design Panel', 'ডিজাইন প্যানেলে ফিরে যান')}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {job.design_number}
              </h1>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-300">
                {job.status.replace('_', ' ')}
              </span>

              {/* COMMERCIAL INVOICE GATE BADGE */}
              {hasInvoice ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                  <Receipt className="h-3 w-3" /> Invoice Linked: {invoiceNumber}
                </span>
              ) : hasPendingRequest ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                  <Clock className="h-3 w-3 animate-spin" /> Invoice Requested (Pending Sales)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                  <AlertCircle className="h-3 w-3" /> Invoice Required
                </span>
              )}

              {/* INTAKE SOURCE BADGE */}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-semibold px-2.5 py-0.5',
                  job.intake_source === 'manager_billing'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                )}
              >
                Source: {job.intake_source === 'manager_billing' ? 'Manager/Billing' : 'Direct Customer'}
              </Badge>

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
              <span>Target Specs: <strong>{job.dimensions_spec || 'Standard'}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ACTION: MARK DESIGN READY */}
            {job.status !== 'approved' && (
              <Button
                size="sm"
                variant="default"
                onClick={handleMarkDesignReady}
                disabled={isPending}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Mark Design Ready
              </Button>
            )}

            {/* ACTION: SEND INVOICE REQUEST IF INVOICE MISSING */}
            {!hasInvoice && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInvoiceRequestOpen(true)}
                disabled={isPending || hasPendingRequest}
                className={`h-8 text-xs font-bold ${
                  hasPendingRequest
                    ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-rose-700 border-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100'
                }`}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {hasPendingRequest ? 'Invoice Requested' : 'Send Invoice Request'}
              </Button>
            )}

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

            {/* Send to Print Operator when gates are cleared */}
            {hasInvoice && (job.status === 'approved' || job.is_locked || job.customer_approval_required === false) && (
              <Button
                size="sm"
                onClick={handleSendToPrint}
                disabled={isPending}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Send to Print Floor
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border animate-in fade-in-0 ${
            notification.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          }`}
        >
          {notification.type === 'warning' ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* COMMERCIAL GATE HOLD BANNER (When Invoice is Missing) */}
      {!hasInvoice && (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-400 dark:bg-rose-950/40 dark:border-rose-700 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-black text-sm text-rose-900 dark:text-rose-200 flex items-center gap-2">
                Production Hold: Invoice Not Created
              </h3>
              <p className="text-xs text-rose-800 dark:text-rose-300">
                Print Floor machines cannot start printing this job until an official invoice is generated by Manager / Sales.
                {hasPendingRequest && (
                  <span className="font-bold block mt-0.5 text-amber-800 dark:text-amber-300">
                    ➔ Invoice Request is currently pending review with Sales.
                  </span>
                )}
              </p>
            </div>
          </div>

          {!hasPendingRequest && (
            <Button
              size="sm"
              onClick={() => setIsInvoiceRequestOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 self-start sm:self-center"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Send Invoice Request
            </Button>
          )}
        </div>
      )}

      {/* CUSTOMER APPROVAL & IMMUTABILITY LOCK BANNER */}
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

                <div className="flex items-center gap-2">
                  <span
                    className={`uppercase text-xs font-black px-2.5 py-0.5 rounded border font-mono ${getFormatBadgeColor(
                      currentFormat
                    )}`}
                  >
                    .{currentFormat}
                  </span>
                  {!job.is_locked && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsUploadOpen(true)
                      }}
                      className="h-7 text-xs font-bold gap-1 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload / Paste (Ctrl+V)
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* IMAGE RENDERING ENGINE (.JPG / .PNG / PREVIEW) */}
              {activeVersion.proof_file_url ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDraggingOver(true)
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDraggingOver(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processImageFile(e.dataTransfer.files[0])
                    }
                  }}
                  className={cn(
                    "rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center min-h-[380px] relative group transition-all",
                    isDraggingOver && "ring-4 ring-indigo-500 ring-offset-2"
                  )}
                >
                  <img
                    src={activeVersion.proof_file_url}
                    alt={activeVersion.proof_file_name || 'Design Proof'}
                    className="max-h-[500px] w-full object-contain"
                  />

                  {/* Top-Right Format & Paste Helper Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-black/70 text-white backdrop-blur-xs border border-white/10">
                      <Clipboard className="h-3 w-3 text-indigo-400" /> Paste anytime (<kbd className="font-mono text-[10px]">Ctrl+V</kbd>)
                    </span>
                  </div>

                  {/* Bottom-Right Fullscreen Action */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <a
                      href={activeVersion.proof_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-bold hover:bg-black transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Fullscreen Proof
                    </a>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsUploadOpen(true)}
                  className="p-10 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-3 cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-all"
                >
                  <div className="h-14 w-14 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center font-black">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Drop .JPG / .PNG Artwork or Press Ctrl+V
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click to browse or paste screenshot from clipboard directly to render customer proof.
                    </p>
                  </div>
                </div>
              )}

              {/* Version details footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-700 dark:text-slate-300">File Reference:</div>
                  <code className="text-[11px] text-slate-500 font-mono">{activeVersion.source_file_name || activeVersion.proof_file_name || 'proof.png'}</code>
                </div>
                {activeVersion.change_notes && (
                  <div className="text-slate-600 dark:text-slate-400 text-right max-w-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Notes: </span>
                    {activeVersion.change_notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: VERSION HISTORY & CUSTOMER REVISIONS */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <History className="h-4 w-4 text-slate-500" />
                  Version & Approval Timeline
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  {job.versions?.length || 1} versions
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
              {(job.versions || []).map((ver: DesignVersionRecord) => (
                <button
                  key={ver.id}
                  onClick={() => setActiveVersionNumber(ver.version_number)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    ver.version_number === activeVersionNumber
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-700 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {ver.version_label}
                      </span>
                      {ver.is_approved && (
                        <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4">
                          Approved
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      .{ver.file_format}
                    </span>
                  </div>
                  {ver.change_notes && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {ver.change_notes}
                    </p>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    Uploaded by {ver.uploaded_by_name} • {ver.created_at}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-purple-600" />
                Customer Revision Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[240px] overflow-y-auto">
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

      {/* MODAL: SEND INVOICE REQUEST */}
      <ModalDialog
        open={isInvoiceRequestOpen}
        onOpenChange={setIsInvoiceRequestOpen}
        title="Send Invoice Request to Sales / Billing"
        description="Notify the responsible Manager / Sales Representative to create the official invoice so production can proceed."
      >
        <form onSubmit={handleSendInvoiceRequest} className="space-y-4 pt-1">
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
            <strong className="text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Send className="h-4 w-4" /> Commercial Pipeline Dispatch
            </strong>
            <p className="text-indigo-800 dark:text-indigo-300 text-[11px]">
              Customer: <strong>{job.customer_name}</strong> | Design: <strong>{job.design_number}</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reqAmt" required>Estimated Job Amount (৳ BDT)</Label>
            <Input
              id="reqAmt"
              type="number"
              value={estimatedAmount}
              onChange={(e) => setEstimatedAmount(Number(e.target.value))}
              required
              min={1}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reqNotes">Notes / Specifications for Billing</Label>
            <textarea
              id="reqNotes"
              rows={3}
              placeholder="e.g. 500 SFT Flex Banner with eyelet finishing and bamboo frames."
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsInvoiceRequestOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Dispatch Request & Notify Sales
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: UPLOAD NEW VERSION */}
      <ModalDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title="Upload Artwork Revision"
        description="Upload or paste (.JPG / .PNG) artwork proofs. Supports clipboard paste (Ctrl+V)."
      >
        <form onSubmit={handleUploadVersion} className="space-y-4 pt-1">
          {/* DRAG & DROP / PASTE / FILE PICKER DROPZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDraggingOver(true)
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDraggingOver(false)
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processImageFile(e.dataTransfer.files[0])
              }
            }}
            onClick={() => document.getElementById('vFileInputModal')?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer",
              isDraggingOver
                ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40"
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            )}
          >
            <input
              id="vFileInputModal"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processImageFile(e.target.files[0])
                }
              }}
            />
            {newVersionProofUrl ? (
              <div className="space-y-2">
                <div className="relative max-h-48 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-1">
                  <img
                    src={newVersionProofUrl}
                    alt="Proof Preview"
                    className="max-h-44 object-contain mx-auto"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Image Loaded ({newVersionFormat.toUpperCase()}) — Click to replace or paste another</span>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-2">
                <div className="h-10 w-10 mx-auto rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or Drag & Drop .JPG / .PNG
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                    💡 Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste screenshot
                  </p>
                </div>
                <p className="text-[10px] text-slate-400">
                  Supported formats: <strong>.JPG, .JPEG, .PNG</strong> only
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vFmt" required>File Format</Label>
              <select
                id="vFmt"
                value={newVersionFormat}
                onChange={(e) => setNewVersionFormat(e.target.value as DesignFormat)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase"
              >
                <option value="png">.PNG (Raster Proof / Transparency)</option>
                <option value="jpg">.JPG / .JPEG (High-Res Image / Proof)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vFile" required>File Name</Label>
              <Input
                id="vFile"
                value={newVersionFileName}
                onChange={(e) => setNewVersionFileName(e.target.value)}
                placeholder="e.g. proof_v2.png"
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
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
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

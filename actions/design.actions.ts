'use server'

import { withTenantAction } from '../lib/actions/action-wrapper.ts'
import { revalidatePath } from 'next/cache.js'
import { DesignService } from '../services/design.service.ts'
import { DesignRepository } from '../lib/repositories/design.repository.ts'
import { AuditService } from '../services/audit.service.ts'
import { getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import type { DesignJobRecord, DesignVersionRecord } from '../types/design.types.ts'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Mark design as ready, evaluate invoice presence
 */
export const markDesignReadyAction = withTenantAction(
  {
    permission: "design.edit",
    entityType: "design"
  },
  async (ctx, designJobId: string,
  notes?: string,
  requestedCompanyId?: string,
  jobPayload?: Partial<DesignJobRecord>) : Promise<ServerActionResult<DesignJobRecord>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail

    if (jobPayload) {
      const existing = await DesignRepository.getDesignJobById(designJobId, companyId)
      if (!existing) {
        await DesignRepository.createDesignJob({
          ...(jobPayload as any),
          id: designJobId,
          company_id: companyId,
          title: jobPayload.title || 'Design Job',
          customer_name: jobPayload.customer_name || 'Customer',
        })
      }
    }

    const updated = await DesignService.markReady(designJobId, companyId, notes)
    if (!updated) {
      return { success: false, error: 'Design job not found.' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'design.mark_ready',
        'design_job',
        updated.id,
        null,
        {
          design_number: updated.design_number,
          commercial_status: updated.commercial_status,
          status: updated.status,
        },
        `Marked design ${updated.design_number} as Ready (Commercial Status: ${updated.commercial_status})`
      )
    } catch {}

    revalidatePath('/', 'layout')
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to mark design ready' }
  }

})

/**
 * Server Action: Update design version customer approval
 */
export const updateDesignVersionApprovalAction = withTenantAction(
  {
    permission: "design.create",
    entityType: "design"
  },
  async (ctx, params: {
    designJobId: string
    versionId: string
    approvalStatus: 'approved' | 'rejected' | 'changes_requested'
    customerFeedback?: string | null
  },
  requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail

    await DesignService.updateVersionApproval({
      company_id: companyId,
      version_id: params.versionId,
      approval_status: params.approvalStatus,
      customer_feedback: params.customerFeedback,
      design_job_id: params.designJobId,
    })

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'design.approval_update',
        'design_version',
        params.versionId,
        null,
        {
          approval_status: params.approvalStatus,
          design_job_id: params.designJobId,
        },
        `Updated design approval status to ${params.approvalStatus}`
      )
    } catch {}

    // Trigger Preference-Aware Design Feedback Notification
    if (params.approvalStatus === 'changes_requested' || params.customerFeedback) {
      try {
        const { NotificationService } = await import('@/services/notification.service')
        await NotificationService.notify({
          companyId,
          role: 'designer',
          type: 'design_feedback',
          entity: { type: 'design_job', id: params.designJobId },
          payload: {
            comment: params.customerFeedback || 'Changes requested by customer',
            action_url: `/design`,
          },
          channels: ['in_app', 'whatsapp'],
        })
      } catch (notifErr) {
        console.warn('[updateDesignVersionApprovalAction] Notification dispatch warning:', notifErr)
      }
    }

    revalidatePath('/', 'layout')
    return { success: true, data: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update approval status' }
  }

})

/**
 * Server Action: Add a new design version
 */
export const addDesignVersionAction = withTenantAction(
  {
    permission: "design.create",
    entityType: "design"
  },
  async (ctx, version: {
    designJobId: string
    versionNumber: number
    fileName: string
    fileUrl: string
    fileType?: string | null
    fileSizeBytes?: number | null
    previewUrl?: string | null
    notes?: string | null
  },
  requestedCompanyId?: string) : Promise<ServerActionResult<DesignVersionRecord>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const creatorName = tenant.fullName || 'Designer'

    const created = await DesignService.addVersion({
      company_id: companyId,
      design_job_id: version.designJobId,
      version_number: version.versionNumber,
      file_name: version.fileName,
      file_url: version.fileUrl,
      file_type: version.fileType,
      file_size_bytes: version.fileSizeBytes,
      preview_url: version.previewUrl,
      notes: version.notes,
      created_by_name: creatorName,
    })

    revalidatePath('/', 'layout')
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add design version' }
  }

})

/**
 * Server Action: Fetch design jobs
 */
export const getDesignJobsAction = withTenantAction(
  {
    permission: "design.view",
    entityType: "design"
  },
  async (ctx, requestedCompanyId?: string) : Promise<ServerActionResult<DesignJobRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const data = await DesignService.getJobs(tenant.companyId)
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch design jobs' }
  }

})

/**
 * Server Action: Fetch design job by ID
 */
export const getDesignJobByIdAction = withTenantAction(
  {
    permission: "design.view",
    entityType: "design"
  },
  async (ctx, id: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<DesignJobRecord | null>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const data = await DesignService.getJobById(id, tenant.companyId)
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch design job' }
  }

})

export const sendToPrintOperatorAction = withTenantAction(
  {
    permission: "design.send",
    entityType: "design"
  },
  async (ctx, designJobId: string,
  requestedCompanyId?: string,
  jobPayload?: Partial<DesignJobRecord>,
  options?: { assignedMachineId?: string; assignedMachineName?: string; actorName?: string }) : Promise<ServerActionResult<DesignJobRecord>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail
    const actorName = options?.actorName || tenant.fullName || 'Designer'

    if (jobPayload) {
      const existing = await DesignRepository.getDesignJobById(designJobId, companyId)
      if (!existing) {
        await DesignRepository.createDesignJob({
          ...(jobPayload as any),
          id: designJobId,
          company_id: companyId,
          title: jobPayload.title || 'Design Job',
          customer_name: jobPayload.customer_name || 'Customer',
        })
      }
    }

    const result = await DesignService.sendToPrintOperator(designJobId, companyId, {
      actorName,
      assignedMachineId: options?.assignedMachineId,
      assignedMachineName: options?.assignedMachineName,
    })
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to send to print operator' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'design.send_to_print',
        'design_job',
        designJobId,
        null,
        {
          design_number: result.designJob?.design_number,
          status: result.designJob?.status,
        },
        `Sent design ${result.designJob?.design_number} to Print Operator queue`
      )
    } catch {}

    revalidatePath('/', 'layout')
    return { success: true, data: result.designJob }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send to print operator' }
  }

})

/**
 * Server Action: Delete a single design job
 */
export const deleteDesignJobAction = withTenantAction(
  {
    permission: "design.delete",
    destructive: true,
    auditAction: "design.deletedesignjob",
    entityType: "design"
  },
  async (ctx, designJobId: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const ok = await DesignService.deleteJob(designJobId, companyId)
    if (!ok) {
      return { success: false, error: 'Failed to delete design job.' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'design.delete',
        'design_job',
        designJobId,
        null,
        {},
        `Deleted design job ${designJobId}`
      )
    } catch {}

    revalidatePath('/', 'layout')
    return { success: true, data: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete design job' }
  }

})

/**
 * Server Action: Purge all design jobs for tenant
 */
export const purgeAllDesignJobsAction = withTenantAction(
  {
    permission: "design.view",
    destructive: true,
    requirePasswordConfirm: true,
    auditAction: "design.purgealldesignjobs",
    entityType: "design"
  },
  async (ctx, requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const ok = await DesignService.purgeAllJobs(companyId)
    if (!ok) {
      return { success: false, error: 'Failed to purge design jobs.' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'design.purge_all',
        'design_job',
        null,
        null,
        {},
        `Purged all design jobs for company ${companyId}`
      )
    } catch {}

    revalidatePath('/', 'layout')
    return { success: true, data: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to purge design jobs' }
  }

})

import {
  sanitizeVirusSafeFileName,
  MAX_DESIGN_FILE_SIZE_BYTES,
  ALLOWED_DESIGN_EXTENSIONS,
} from '../lib/security/file-validation.ts'

export {
  sanitizeVirusSafeFileName,
  MAX_DESIGN_FILE_SIZE_BYTES,
  ALLOWED_DESIGN_EXTENSIONS,
}

/**
 * Server Action: Upload, validate and persist new design version with company-scoped storage path
 */
export const validateAndUploadDesignVersionAction = withTenantAction(
  {
    permission: "design.create",
    entityType: "design"
  },
  async (ctx, params: {
    designJobId: string
    fileName: string
    fileType?: string | null
    fileSizeBytes: number
    notes?: string | null
    fileUrl?: string | null
  },
  requestedCompanyId?: string) : Promise<ServerActionResult<{
    version: DesignVersionRecord
    signedUrl: string
    storagePath: string
  }>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const creatorName = tenant.fullName || 'Designer'

    // 1. File size validation (Max 50MB)
    if (params.fileSizeBytes > MAX_DESIGN_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `File size (${(params.fileSizeBytes / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowable limit of 50MB.`
      }
    }

    // 2. Virus-safe sanitization and extension check
    let safeName: string
    try {
      safeName = sanitizeVirusSafeFileName(params.fileName)
    } catch (valErr: any) {
      return { success: false, error: valErr.message }
    }

    // 3. Resolve existing job to determine version number
    const existingJob = await DesignService.getJobById(params.designJobId, companyId)
    if (!existingJob) {
      return { success: false, error: 'Design job not found within your company workspace.' }
    }

    const currentCount = existingJob.version_count || (existingJob.versions?.length) || 0
    const nextVersionNumber = currentCount + 1

    // 4. Company-scoped storage path
    const timestamp = Date.now()
    const storagePath = `companies/${companyId}/design/${params.designJobId}/v${nextVersionNumber}_${timestamp}_${safeName}`

    // 5. Generate secure signed URL with short expiry (3600 seconds / 1 hour)
    let signedUrl = params.fileUrl || ''
    try {
      const url = await DesignRepository.createSignedUrl(storagePath, 3600)
      if (url) {
        signedUrl = url
      }
    } catch {}

    if (!signedUrl) {
      // Deterministic signed URL token for local/mock/offline mode
      const token = Buffer.from(`${companyId}:${params.designJobId}:${timestamp}`).toString('base64url')
      signedUrl = `/api/storage/design/${storagePath}?token=${token}&expires=${timestamp + 3600000}`
    }

    // 6. Persist version record
    const createdVersion = await DesignService.addVersion({
      company_id: companyId,
      design_job_id: params.designJobId,
      version_number: nextVersionNumber,
      file_name: safeName,
      file_url: signedUrl,
      file_type: params.fileType || safeName.split('.').pop(),
      file_size_bytes: params.fileSizeBytes,
      preview_url: signedUrl,
      notes: params.notes || null,
      created_by_name: creatorName,
    })

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'design.version_upload',
        'design_version',
        createdVersion.id,
        null,
        {
          file_name: safeName,
          version_number: nextVersionNumber,
          file_size_bytes: params.fileSizeBytes,
          storage_path: storagePath,
        },
        `Uploaded design version V${nextVersionNumber} (${safeName}) for job ${existingJob.design_number}`
      )
    } catch {}

    revalidatePath('/', 'layout')
    return {
      success: true,
      data: {
        version: createdVersion,
        signedUrl,
        storagePath,
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to upload design version.' }
  }
})

/**
 * Server Action: Add customer feedback or revision request to design thread
 */
export const addDesignFeedbackAction = withTenantAction(
  {
    permission: "design.edit",
    entityType: "design"
  },
  async (ctx, params: {
    designJobId: string
    message: string
    authorName?: string
    isClient?: boolean
    versionId?: string
    statusChange?: 'approved' | 'rejected' | 'changes_requested'
  },
  requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const job = await DesignService.getJobById(params.designJobId, companyId)
    if (!job) {
      return { success: false, error: 'Design job not found.' }
    }

    if (params.versionId && params.statusChange) {
      await DesignService.updateVersionApproval({
        company_id: companyId,
        version_id: params.versionId,
        approval_status: params.statusChange,
        customer_feedback: params.message,
        design_job_id: params.designJobId,
      })
    }

    const updates: Partial<DesignJobRecord> = {
      instructions: job.instructions
        ? `${job.instructions}\n[${new Date().toLocaleDateString('en-GB')}] ${params.authorName || 'Client'}: ${params.message}`
        : `[${new Date().toLocaleDateString('en-GB')}] ${params.authorName || 'Client'}: ${params.message}`,
      status: params.statusChange === 'approved' ? 'approved' : params.statusChange === 'changes_requested' ? 'revision' : job.status,
    }

    await DesignService.updateJob(params.designJobId, companyId, updates)

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'design.feedback_added',
        'design_job',
        params.designJobId,
        null,
        { message: params.message, status: updates.status },
        `Added feedback to design job ${job.design_number}`
      )
    } catch {}

    revalidatePath('/', 'layout')
    return { success: true, data: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add feedback.' }
  }
})


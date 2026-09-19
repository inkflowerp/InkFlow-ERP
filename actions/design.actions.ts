'use server'

import { revalidatePath } from 'next/cache'
import { DesignService } from '../services/design.service.ts'
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
export async function markDesignReadyAction(
  designJobId: string,
  notes?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<DesignJobRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const updated = await DesignService.markReady(designJobId, companyId, notes)
    if (!updated) {
      return { success: false, error: 'Design job not found.' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
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
}

/**
 * Server Action: Update design version customer approval
 */
export async function updateDesignVersionApprovalAction(
  params: {
    designJobId: string
    versionId: string
    approvalStatus: 'approved' | 'rejected' | 'changes_requested'
    customerFeedback?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

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
        tenant.userId,
        tenant.userEmail,
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

    revalidatePath('/', 'layout')
    return { success: true, data: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update approval status' }
  }
}

/**
 * Server Action: Add a new design version
 */
export async function addDesignVersionAction(
  version: {
    designJobId: string
    versionNumber: number
    fileName: string
    fileUrl: string
    fileType?: string | null
    fileSizeBytes?: number | null
    previewUrl?: string | null
    notes?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<DesignVersionRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

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
      created_by_name: tenant.fullName || 'Designer',
    })

    revalidatePath('/', 'layout')
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add design version' }
  }
}

/**
 * Server Action: Fetch design jobs
 */
export async function getDesignJobsAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<DesignJobRecord[]>> {
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
}

/**
 * Server Action: Fetch design job by ID
 */
export async function getDesignJobByIdAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<DesignJobRecord | null>> {
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
}

/**
 * Server Action: Send approved and invoiced design to print operator queue
 */
export async function sendToPrintOperatorAction(
  designJobId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<DesignJobRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const result = await DesignService.sendToPrintOperator(designJobId, companyId, tenant.fullName || 'Designer')
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to send to print operator' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
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
}


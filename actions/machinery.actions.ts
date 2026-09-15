'use server'

import { revalidatePath } from 'next/cache'
import { MachineryService } from '@/services/machinery.service'
import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { createClient } from '@/lib/supabase/server'
import {
  MachineryRecord,
  MachineryAssignmentRecord,
  MachineryMaintenanceRecord,
  MachineryBreakdownRecord,
  MachineryFilterOptions,
  CreateMachineryInput,
  UpdateMachineryInput,
  MachineryStatus,
  AssignmentStatus,
  ConflictCheckResult,
  MachinerySummaryMetrics,
  MachineEligibilityParams,
  EligibleMachineSummary,
  CreateMachineryAssignmentInput,
  ReassignBreakdownInput,
} from '@/types/machinery.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Fetches filtered list of machineries
 */
export async function getMachineriesAction(
  filters?: MachineryFilterOptions,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const machineries = await MachineryService.getMachineries(companyId, filters)
    return { success: true, data: machineries }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch machineries.' }
  }
}

/**
 * Server Action: Fetches a single machinery by ID
 */
export async function getMachineryByIdAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryRecord | null>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const machine = await MachineryService.getMachineryById(id, companyId)
    if (!machine) {
      return { success: false, error: 'Machine not found.' }
    }

    return { success: true, data: machine }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch machinery details.' }
  }
}

import { EntitlementService } from '@/services/entitlement.service'

/**
 * Server Action: Creates a new machinery record
 */
export async function createMachineryAction(
  input: CreateMachineryInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId || input.company_id)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    // Enforce Plan Machinery Feature Entitlement
    await EntitlementService.enforceFeature(companyId, 'machinery')

    // Permission authorization check
    const isOwner = tenant.primaryRole === 'business_owner' || tenant.companyRole === 'business_owner'
    const hasPerm = isOwner || tenant.permissions.includes('machineries.create') || tenant.permissions.includes('production.create')

    if (!hasPerm) {
      return { success: false, error: 'Permission denied: You do not have permission to create machinery.' }
    }

    const machine = await MachineryService.createMachinery({
      ...input,
      company_id: companyId,
    })

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant.userId || null,
      tenant.userEmail || null,
      'machinery.create',
      'machinery',
      machine.id,
      null,
      machine,
      `Created machinery: ${machine.name} (${machine.code})`
    )

    revalidatePath('/[tenantSlug]/production/machineries', 'layout')
    return { success: true, data: machine }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create machinery.' }
  }
}

/**
 * Server Action: Updates an existing machinery record
 */
export async function updateMachineryAction(
  id: string,
  updates: UpdateMachineryInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const isOwner = tenant?.primaryRole === 'business_owner' || tenant?.companyRole === 'business_owner'
    const hasPerm = isOwner || tenant?.permissions.includes('machineries.edit') || tenant?.permissions.includes('production.edit')

    if (!hasPerm) {
      return { success: false, error: 'Permission denied: You do not have permission to edit machinery.' }
    }

    const previous = await MachineryService.getMachineryById(id, companyId)
    const machine = await MachineryService.updateMachinery(id, companyId, updates)

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.edit',
      'machinery',
      machine.id,
      previous,
      machine,
      `Updated machinery "${machine.name}" (${machine.code})`
    )

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${id}`)
    }

    return { success: true, data: machine }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update machinery.' }
  }
}

/**
 * Server Action: Changes status of a machine
 */
export async function changeMachineryStatusAction(
  id: string,
  newStatus: MachineryStatus,
  notes?: string | null,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const previous = await MachineryService.getMachineryById(id, companyId)
    const machine = await MachineryService.changeStatus(id, companyId, newStatus, notes)

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.status_change',
      'machinery',
      machine.id,
      { status: previous?.status },
      { status: machine.status, notes },
      `Changed status of "${machine.name}" from ${previous?.status} to ${newStatus}`
    )

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${id}`)
    }

    return { success: true, data: machine }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to change machinery status.' }
  }
}

/**
 * Server Action: Archives / Retires a machine
 */
export async function archiveMachineryAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const isOwner = tenant?.primaryRole === 'business_owner' || tenant?.companyRole === 'business_owner'
    const hasPerm = isOwner || tenant?.permissions.includes('machineries.delete') || tenant?.permissions.includes('production.delete')

    if (!hasPerm) {
      return { success: false, error: 'Permission denied: You do not have permission to archive machinery.' }
    }

    const machine = await MachineryService.archiveMachinery(id, companyId)

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.archive',
      'machinery',
      machine.id,
      null,
      { is_archived: true, status: 'retired' },
      `Archived/Retired machinery "${machine.name}" (${machine.code})`
    )

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${id}`)
    }

    return { success: true, data: machine }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to archive machinery.' }
  }
}

/**
 * Server Action: Checks for assignment conflicts
 */
export async function checkMachineryConflictAction(
  machineId: string,
  scheduledStart: string,
  scheduledEnd: string,
  excludeAssignmentId?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ConflictCheckResult>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const result = await MachineryService.checkConflict(
      machineId,
      companyId,
      scheduledStart,
      scheduledEnd,
      excludeAssignmentId
    )

    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to check assignment conflicts.' }
  }
}

/**
 * Server Action: Assigns a machine to a job order / task
 */
export async function assignMachineryAction(
  input: CreateMachineryAssignmentInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryAssignmentRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId || input.company_id)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const isOwner = tenant?.primaryRole === 'business_owner' || tenant?.companyRole === 'business_owner'
    const hasPerm = isOwner || tenant?.permissions.includes('machineries.assign') || tenant?.permissions.includes('production.assign') || tenant?.permissions.includes('production.edit')

    if (!hasPerm) {
      return { success: false, error: 'Permission denied: You do not have permission to assign machinery.' }
    }

    const assignment = await MachineryService.assignMachine({
      ...input,
      company_id: companyId,
      created_by: tenant?.userId || null,
    })

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.assign',
      'machinery',
      input.machine_id,
      null,
      assignment,
      `Assigned machine to job order ${input.job_order_id || input.production_job_id || ''} (Task: ${input.task_type || 'General'})`
    )

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${input.machine_id}`)
      revalidatePath(`/${tenant.companySlug}/production`)
    }

    return { success: true, data: assignment }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign machinery.' }
  }
}

/**
 * Server Action: Updates assignment status
 */
export async function updateAssignmentStatusAction(
  assignmentId: string,
  status: AssignmentStatus,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryAssignmentRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const assignment = await MachineryService.updateAssignmentStatus(assignmentId, companyId, status)

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${assignment.machine_id}`)
      revalidatePath(`/${tenant.companySlug}/production`)
    }

    return { success: true, data: assignment }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update assignment status.' }
  }
}

/**
 * Server Action: Schedules maintenance for a machine
 */
export async function scheduleMaintenanceAction(
  input: {
    machine_id: string
    maintenance_type: any
    scheduled_date: string
    start_time?: string | null
    end_time?: string | null
    technician_name?: string | null
    vendor_name?: string | null
    problem_description?: string | null
    notes?: string | null
    cost?: number
    attachment_url?: string | null
    next_maintenance_date?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryMaintenanceRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const maintenance = await MachineryService.scheduleMaintenance({
      ...input,
      company_id: companyId,
      created_by: tenant?.userId || null,
    })

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.maintenance_scheduled',
      'machinery',
      input.machine_id,
      null,
      maintenance,
      `Scheduled ${input.maintenance_type} maintenance on ${input.scheduled_date}`
    )

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${input.machine_id}`)
    }

    return { success: true, data: maintenance }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to schedule maintenance.' }
  }
}

/**
 * Server Action: Completes maintenance for a machine
 */
export async function completeMaintenanceAction(
  maintenanceId: string,
  machineId: string,
  completionData: {
    work_performed: string
    parts_used?: string | null
    cost?: number
    next_maintenance_date?: string | null
    technician_name?: string | null
    notes?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryMaintenanceRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const maintenance = await MachineryService.completeMaintenance(
      maintenanceId,
      machineId,
      companyId,
      completionData
    )

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.maintenance_completed',
      'machinery',
      machineId,
      null,
      maintenance,
      `Completed maintenance for machine`
    )

    // Notification
    try {
      const supabase = await createClient()
      await (supabase.from('in_app_notifications' as any) as any).insert({
        company_id: companyId,
        type: 'production_completed',
        title: 'Maintenance Completed',
        title_bn: 'মেশিন রক্ষণাবেক্ষণ সম্পন্ন',
        message: `Maintenance completed for machine. Machine is now available for production.`,
        message_bn: `মেশিনের রক্ষণাবেক্ষণ সম্পন্ন হয়েছে এবং তা প্রোডাকশনের জন্য প্রস্তুত।`,
        action_url: `/${tenant?.companySlug || 'app'}/production/machineries/${machineId}`,
        created_at: new Date().toISOString(),
      })
    } catch {
      // Non-blocking notification
    }

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${machineId}`)
    }

    return { success: true, data: maintenance }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to complete maintenance.' }
  }
}

/**
 * Server Action: Reports machine breakdown
 */
export async function reportBreakdownAction(
  input: {
    machine_id: string
    problem_title: string
    problem_description: string
    severity?: any
    production_impact?: any
    affected_job_order_id?: string | null
    affected_production_job_id?: string | null
    attachment_url?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryBreakdownRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const reporterName = tenant?.fullName || 'Operator'

    const breakdown = await MachineryService.reportBreakdown({
      ...input,
      company_id: companyId,
      reported_by_id: tenant?.userId || null,
      reported_by_name: reporterName,
    })

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.breakdown_reported',
      'machinery',
      input.machine_id,
      null,
      breakdown,
      `Reported breakdown: "${input.problem_title}" (Severity: ${input.severity || 'medium'})`
    )

    // Dispatch High Priority In-App Notification
    try {
      const supabase = await createClient()
      await (supabase.from('in_app_notifications' as any) as any).insert({
        company_id: companyId,
        type: 'low_stock', // Uses urgent notification style
        title: `🚨 Machine Breakdown Alert: ${input.problem_title}`,
        title_bn: `🚨 মেশিন ব্রেকডাউন অ্যালার্ট: ${input.problem_title}`,
        message: `Machine has been reported as broken down by ${reporterName}. Impact: ${input.production_impact || 'delay'}.`,
        message_bn: `${reporterName} মেশিন ব্রেকডাউন রিপোর্ট করেছেন। প্রভাব: ${input.production_impact || 'delay'}।`,
        action_url: `/${tenant?.companySlug || 'app'}/production/machineries/${input.machine_id}`,
        created_at: new Date().toISOString(),
      })
    } catch {
      // Non-blocking
    }

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${input.machine_id}`)
      revalidatePath(`/${tenant.companySlug}/production`)
    }

    return { success: true, data: breakdown }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to report breakdown.' }
  }
}

/**
 * Server Action: Resolves machine breakdown
 */
export async function resolveBreakdownAction(
  breakdownId: string,
  machineId: string,
  resolution: {
    diagnosis: string
    repair_action: string
    technician_name?: string | null
    parts_replaced?: string | null
    repair_cost?: number
    downtime_minutes?: number
    resolution_notes?: string | null
    targetStatus?: MachineryStatus
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryBreakdownRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const resolverName = tenant?.fullName || 'Technician'

    const resolved = await MachineryService.resolveBreakdown(
      breakdownId,
      machineId,
      companyId,
      {
        ...resolution,
        resolved_by_name: resolverName,
      }
    )

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.breakdown_resolved',
      'machinery',
      machineId,
      null,
      resolved,
      `Resolved breakdown: ${resolution.repair_action} (Downtime: ${resolved.downtime_minutes} mins)`
    )

    // Notification
    try {
      const supabase = await createClient()
      await (supabase.from('in_app_notifications' as any) as any).insert({
        company_id: companyId,
        type: 'production_completed',
        title: 'Machine Repaired & Available',
        title_bn: 'মেশিন মেরামত সম্পন্ন',
        message: `Machine repair completed by ${resolverName}. Machine is restored to available status.`,
        message_bn: `মেশিন সফলভাবে মেরামত করা হয়েছে এবং কাজের জন্য উন্মুক্ত রয়েছে।`,
        action_url: `/${tenant?.companySlug || 'app'}/production/machineries/${machineId}`,
        created_at: new Date().toISOString(),
      })
    } catch {
      // Non-blocking
    }

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${machineId}`)
      revalidatePath(`/${tenant.companySlug}/production`)
    }

    return { success: true, data: resolved }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resolve breakdown.' }
  }
}

/**
 * Server Action: Fetches dashboard summary metrics
 */
export async function getMachineryDashboardMetricsAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<MachinerySummaryMetrics>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const metrics = await MachineryService.getSummaryMetrics(companyId)
    return { success: true, data: metrics }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to calculate summary metrics.' }
  }
}

/**
 * Server Action: Intelligently resolves eligible machines for a job order task / production context
 */
export async function getEligibleMachineriesAction(
  params: MachineEligibilityParams,
  requestedCompanyId?: string
): Promise<ServerActionResult<EligibleMachineSummary>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const summary = await MachineryService.resolveEligibleMachines(companyId, params)
    return { success: true, data: summary }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resolve eligible machineries.' }
  }
}

/**
 * Server Action: Fetches all machine assignments for a given Job Order
 */
export async function getJobOrderAssignmentsAction(
  jobOrderId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryAssignmentRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const assignments = await MachineryService.getAssignmentsByJobOrder(jobOrderId, companyId)
    return { success: true, data: assignments }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch job order assignments.' }
  }
}

/**
 * Server Action: Reassigns an affected job order task from a broken machine to an alternate eligible machine
 */
export async function reassignBreakdownJobAction(
  input: ReassignBreakdownInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineryAssignmentRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const isOwner = tenant?.primaryRole === 'business_owner' || tenant?.companyRole === 'business_owner'
    const hasPerm = isOwner || tenant?.permissions.includes('machineries.assign') || tenant?.permissions.includes('production.assign') || tenant?.permissions.includes('production.edit')

    if (!hasPerm) {
      return { success: false, error: 'Permission denied: You do not have permission to reassign machinery.' }
    }

    const assignment = await MachineryService.reassignBreakdownJob(companyId, input)

    // Audit log
    await AuditService.logEvent(
      companyId,
      tenant?.userId || null,
      tenant?.userEmail || null,
      'machinery.reassign',
      'machinery',
      input.target_machine_id,
      null,
      assignment,
      `Reassigned job from broken machine to ${assignment.machine?.name || input.target_machine_id}`
    )

    if (tenant?.companySlug) {
      revalidatePath(`/${tenant.companySlug}/production/machineries`)
      revalidatePath(`/${tenant.companySlug}/production/machineries/${input.target_machine_id}`)
      revalidatePath(`/${tenant.companySlug}/production`)
    }

    return { success: true, data: assignment }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reassign breakdown job.' }
  }
}


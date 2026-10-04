'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


import { revalidatePath } from 'next/cache'
import { ProductionPlanningService } from '@/services/production-planning.service'
import { AuditService } from '@/services/audit.service'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { ProductionRepository } from '@/lib/repositories/production.repository'
import {
  ProductionTaskRecord,
  CreateProductionTaskInput,
  UpdateProductionTaskInput,
  ScheduleTaskInput,
  HoldTaskInput,
  ReworkTaskInput,
  MachineQueueGroup,
} from '@/types/production.types'
import { TaskFilterOptions } from '@/lib/repositories/production-task.repository'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  conflict?: boolean
}

async function resolveTenantContext(requestedCompanyId?: string) {
  const tenant = await getCurrentTenant(requestedCompanyId)
  if (!tenant || !tenant.companyId) {
    throw new Error('Unauthorized: Valid authenticated tenant session required.')
  }

  return {
    companyId: tenant.companyId,
    userId: tenant.userId || 'system',
    userEmail: tenant.userEmail || '',
    userName: tenant.fullName || 'Operator',
    tenantSlug: tenant.companySlug,
  }
}

/**
 * Server Action: Fetch production tasks
 */
export const getProductionTasksAction = withTenantAction(
  {
    permission: "production.view",
    entityType: "production-planning"
  },
  async (ctx, filters?: TaskFilterOptions,
  requestedCompanyId?: string) : Promise<ServerActionResult<ProductionTaskRecord[]>> => {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const tasks = await ProductionPlanningService.getTasks(companyId, filters)
    return { success: true, data: tasks }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch production tasks.' }
  }

})

/**
 * Server Action: Get single task by ID
 */
export const getProductionTaskByIdAction = withTenantAction(
  {
    permission: "production.view",
    entityType: "production-planning"
  },
  async (ctx, id: string,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>) : Promise<ServerActionResult<ProductionTaskRecord>> => {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.getTaskById(id, companyId, taskPayload)
    if (!task) {
      return { success: false, error: 'Production task not found.' }
    }

    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch production task.' }
  }

})

/**
 * Server Action: Create a production task
 */
export const createProductionTaskAction = withTenantAction(
  {
    permission: "production.create",
    entityType: "production-planning"
  },
  async (ctx, data: CreateProductionTaskInput,
  requestedCompanyId?: string) : Promise<ServerActionResult<ProductionTaskRecord>> => {
  try {
    const { companyId, userId, userEmail } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.createTask(data, companyId)

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'create',
        'production_jobs',
        task.id,
        null,
        task,
        `Created production task ${task.task_number} (${task.task_name})`
      )
    } catch (_) {}

    revalidatePath('/[tenantSlug]/production', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create production task.' }
  }

})

/**
 * Server Action: Schedule a production task
 */
export const scheduleProductionTaskAction = withTenantAction(
  {
    permission: "production.edit",
    entityType: "production-planning"
  },
  async (ctx, input: ScheduleTaskInput,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>) : Promise<ServerActionResult<ProductionTaskRecord>> => {
  try {
    const { companyId, userId, userEmail } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.scheduleTask(input, companyId, taskPayload)

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'update',
        'production_jobs',
        task.id,
        null,
        task,
        `Scheduled production task ${task.task_number} on ${task.assigned_machine_name || 'Manual'}`
      )
    } catch (_) {}

    revalidatePath('/[tenantSlug]/production', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    if (err?.conflict || err?.code === 'STALE_WRITE' || err?.message?.includes('Updated by someone else')) {
      return { success: false, conflict: true, error: 'Updated by someone else, reload?' }
    }
    return { success: false, error: err.message || 'Failed to schedule production task.' }
  }

})

/**
 * Server Action: Start a production task
 */
export const startProductionTaskAction = withTenantAction(
  {
    permission: "production.edit",
    entityType: "production-planning"
  },
  async (ctx, taskId: string,
  forceOverride: boolean = false,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>) : Promise<ServerActionResult<ProductionTaskRecord>> => {
  try {
    const { companyId, userId, userEmail, userName } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.startTask(
      taskId,
      companyId,
      userId,
      userName,
      forceOverride,
      taskPayload
    )

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'update',
        'production_jobs',
        task.id,
        null,
        task,
        `Started production task ${task.task_number}`
      )
    } catch (_) {}

    revalidatePath('/[tenantSlug]/production', 'layout')
    revalidatePath('/[tenantSlug]/operator', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start production task.' }
  }

})

/**
 * Server Action: Pause a production task
 */
export const pauseProductionTaskAction = withTenantAction(
  {
    permission: "production.edit",
    entityType: "production-planning"
  },
  async (ctx, taskId: string,
  reason: string,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>) : Promise<ServerActionResult<ProductionTaskRecord>> => {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.pauseTask(taskId, reason, companyId, taskPayload)

    revalidatePath('/[tenantSlug]/production', 'layout')
    revalidatePath('/[tenantSlug]/operator', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to pause production task.' }
  }

})

/**
 * Server Action: Complete a production task
 */
export const completeProductionTaskAction = withTenantAction(
  {
    permission: "production.edit",
    entityType: "production-planning"
  },
  async (ctx, taskId: string,
  completionData?: {
    good_quantity?: number
    rejected_quantity?: number
    defect_reason?: string | null
    scrap_notes?: string | null
    notes?: string
  },
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>) : Promise<
  ServerActionResult<{
    completedTask: ProductionTaskRecord
    nextReadyTask: ProductionTaskRecord | null
  }>
> => {
  try {
    const { companyId, userId, userEmail } = await resolveTenantContext(requestedCompanyId)
    const result = await ProductionPlanningService.completeTask(taskId, companyId, completionData, taskPayload)

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'update',
        'production_jobs',
        result.completedTask.id,
        null,
        result.completedTask,
        `Completed production task ${result.completedTask.task_number}`
      )
    } catch (_) {}

    revalidatePath('/[tenantSlug]/production', 'layout')
    revalidatePath('/[tenantSlug]/operator', 'layout')
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to complete production task.' }
  }

})

/**
 * Server Action: Generate automated Production Tasks from Product / Order specifications
 */
export const generateProductionTasksFromOrderAction = withTenantAction(
  {
    permission: "production.create",
    entityType: "production-planning"
  },
  async (ctx, input: {
    job_order_id: string
    production_job_id?: string | null
    product_id?: string | null
    product_name?: string
    customer_name?: string
    quantity: number
    unit?: string
    width?: number | null
    height?: number | null
    dimension_unit?: string | null
    material_spec?: string | null
    printing_method?: string | null
    finishing_tasks?: string[] | null
    fabrication_tasks?: string[] | null
    notes?: string | null
    branch_id?: string | null
  },
  requestedCompanyId?: string) : Promise<ServerActionResult<ProductionTaskRecord[]>> => {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const tasks = await ProductionPlanningService.generateTasksFromOrderOrProduct(input, companyId)
    revalidatePath('/[tenantSlug]/production', 'layout')
    return { success: true, data: tasks }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate production tasks.' }
  }

})

/**
 * Server Action: Get compatible machineries for a given task
 */
export const getCompatibleMachineriesForTaskAction = withTenantAction(
  {
    permission: "production.view",
    entityType: "production-planning"
  },
  async (ctx, taskId: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<Array<{ machine: any; isCompatible: boolean; incompatibilityReasons: string[]; currentLoadMinutes: number }>>> => {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const data = await ProductionPlanningService.getCompatibleMachinesForTask(taskId, companyId)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to check machine compatibility.' }
  }

})

/**
 * Server Action: Reassign all tasks from a broken machine to a target machine
 */
export const reassignHeldTasksAction = withTenantAction(
  {
    permission: "production.edit",
    entityType: "production-planning"
  },
  async (ctx, sourceMachineId: string,
  targetMachineId: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<{ reassignedCount: number; tasks: ProductionTaskRecord[] }>> => {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const result = await ProductionPlanningService.reassignHeldTasks(companyId, sourceMachineId, targetMachineId)
    revalidatePath('/[tenantSlug]/production', 'layout')
    revalidatePath('/[tenantSlug]/operator', 'layout')
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reassign tasks.' }
  }

})

/**
 * Server Action: Place task on hold
 */
export const holdProductionTaskAction = withTenantAction(
  {
    permission: "production.edit",
    entityType: "production-planning"
  },
  async (ctx, input: HoldTaskInput,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>) : Promise<ServerActionResult<ProductionTaskRecord>> => {
  try {
    const { companyId, userId, userEmail } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.holdTask(input, companyId, taskPayload)

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'update',
        'production_jobs',
        task.id,
        null,
        task,
        `Placed task ${task.task_number} on hold: ${task.hold_reason}`
      )
    } catch (_) {}

    revalidatePath('/[tenantSlug]/production', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to place task on hold.' }
  }

})

/**
 * Server Action: Resume task from hold
 */
export const resumeProductionTaskAction = withTenantAction(
  {
    permission: "production.edit",
    entityType: "production-planning"
  },
  async (ctx, taskId: string,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>) : Promise<ServerActionResult<ProductionTaskRecord>> => {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.resumeTask(taskId, companyId, taskPayload)

    revalidatePath('/[tenantSlug]/production', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resume production task.' }
  }

})

/**
 * Server Action: Create rework task
 */
export const reworkProductionTaskAction = withTenantAction(
  {
    permission: "production.edit",
    entityType: "production-planning"
  },
  async (ctx, input: ReworkTaskInput,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>) : Promise<ServerActionResult<ProductionTaskRecord>> => {
  try {
    const { companyId, userId, userEmail, userName } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.createReworkTask(input, companyId, userName || 'QC Inspector', taskPayload)

    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'create',
        'production_reworks',
        task.id,
        null,
        task,
        `Logged rework ticket ${task.task_number}: ${input.reason}`
      )
    } catch (_) {}

    revalidatePath('/[tenantSlug]/production', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create rework task.' }
  }

})

/**
 * Server Action: Get Machine Queues (NOW, NEXT, LATER)
 */
export const getMachineQueuesAction = withTenantAction(
  {
    permission: "production.view",
    entityType: "production-planning"
  },
  async (ctx, branchId?: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<MachineQueueGroup[]>> => {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const queues = await ProductionPlanningService.getMachineQueues(companyId, branchId)
    return { success: true, data: queues }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch machine queues.' }
  }

})

/**
 * Server Action: Get current operator's assigned tasks
 */
export const getMyAssignedTasksAction = withTenantAction(
  {
    permission: "production.view",
    entityType: "production-planning"
  },
  async (ctx, requestedCompanyId?: string) : Promise<ServerActionResult<ProductionTaskRecord[]>> => {
  try {
    const { companyId, userId } = await resolveTenantContext(requestedCompanyId)
    const tasks = await ProductionPlanningService.getTasks(companyId, {
      assigned_operator_id: userId,
    })
    return { success: true, data: tasks }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch operator tasks.' }
  }

})

/**
 * Server Action: First-Class Problem Reporting (⚠ সমস্যা হয়েছে)
 * Utilizes atomic report_production_problem_atomic RPC with photo attachment.
 */
export const reportProductionProblemAction = withTenantAction(
  {
    permission: "production.view",
    entityType: "production-planning"
  },
  async (ctx, params: {
    task_id: string
    reason: string
    notes?: string
    photo_url?: string
    reported_by_name?: string
    taskPayload?: Partial<ProductionTaskRecord>
  },
  requestedCompanyId?: string) : Promise<ServerActionResult<any>> => {
  try {
    const { companyId, userId, userEmail, userName, tenantSlug } = await resolveTenantContext(requestedCompanyId)

    let problemNumber = 'PRB-' + Date.now().toString().slice(-6)
    let problemId = null

    // 1. Attempt atomic stored procedure execution in PostgreSQL
    const rpcRes = await ProductionRepository.reportProductionProblemAtomic({
      companyId,
      taskId: params.task_id,
      reason: params.reason,
      notes: params.notes || null,
      photoUrl: params.photo_url || null,
      reportedByName: params.reported_by_name || userName || 'Operator',
    })

    if (rpcRes && rpcRes.success) {
      problemNumber = rpcRes.problem_number || problemNumber
      problemId = rpcRes.problem_id
    }

    // 2. Stateful fallback & cache sync
    const updatedTask = await ProductionPlanningService.holdTask(
      {
        task_id: params.task_id,
        hold_reason: (params.reason as any) || 'quality_issue',
        hold_notes: `[${problemNumber}] ${params.notes || params.reason}`,
      },
      companyId,
      params.taskPayload
    )

    // 3. Log Audit Event
    await AuditRepository.logEvent({
      companyId,
      entity: 'production_task',
      action: 'problem_reported',
      entityId: params.task_id,
      newValue: {
        problem_id: problemId,
        problem_number: problemNumber,
        problem_reason: params.reason,
        notes: params.notes,
        photo_attached: Boolean(params.photo_url),
      },
      userEmail: userEmail || 'Operator',
      userId: userId,
    })

    // Trigger Preference-Aware Production Problem Notification
    try {
      const { NotificationService } = await import('@/services/notification.service')
      await NotificationService.notify({
        companyId,
        role: 'production_manager',
        type: 'production_problem',
        entity: { type: 'production_task', id: params.task_id, number: updatedTask.task_number },
        payload: {
          task_number: updatedTask.task_number,
          problem_type: params.reason,
          description: params.notes || params.reason,
          machine_name: (updatedTask as any).machine_name || 'Floor Machine',
          action_url: `/production`,
        },
        channels: ['in_app', 'whatsapp'],
      })
    } catch (notifErr) {
      console.warn('[reportProductionProblemAction] Notification dispatch warning:', notifErr)
    }

    if (tenantSlug) {
      revalidatePath(`/${tenantSlug}/production`)
      revalidatePath(`/${tenantSlug}/operator`)
    }
    revalidatePath('/production')
    revalidatePath('/operator')

    return {
      success: true,
      data: {
        task: updatedTask,
        problem_id: problemId,
        problem_number: problemNumber,
        problem_reason: params.reason,
        notes: params.notes,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to report production problem.' }
  }

})


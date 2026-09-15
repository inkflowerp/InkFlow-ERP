'use server'

import { revalidatePath } from 'next/cache'
import { ProductionPlanningService } from '@/services/production-planning.service'
import { AuditService } from '@/services/audit.service'
import { AuditRepository } from '@/lib/repositories/audit.repository'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
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
}

/**
 * Server Action: Fetch production tasks
 */
export async function getProductionTasksAction(
  filters?: TaskFilterOptions,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const tasks = await ProductionPlanningService.getTasks(companyId, filters)
    return { success: true, data: tasks }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch production tasks.' }
  }
}

/**
 * Server Action: Get single task by ID
 */
export async function getProductionTaskByIdAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const task = await ProductionPlanningService.getTaskById(id, companyId)
    if (!task) {
      return { success: false, error: 'Production task not found.' }
    }

    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch production task.' }
  }
}

/**
 * Server Action: Create a production task
 */
export async function createProductionTaskAction(
  data: CreateProductionTaskInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail || null

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
}

/**
 * Server Action: Schedule a production task
 */
export async function scheduleProductionTaskAction(
  input: ScheduleTaskInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail || null

    const task = await ProductionPlanningService.scheduleTask(input, companyId)

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
    return { success: false, error: err.message || 'Failed to schedule production task.' }
  }
}

/**
 * Server Action: Start a production task
 */
export async function startProductionTaskAction(
  taskId: string,
  forceOverride: boolean = false,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail || null
    const userName = tenant.fullName || 'Operator'

    const task = await ProductionPlanningService.startTask(
      taskId,
      companyId,
      userId,
      userName,
      forceOverride
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
}

/**
 * Server Action: Pause a production task
 */
export async function pauseProductionTaskAction(
  taskId: string,
  reason: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const task = await ProductionPlanningService.pauseTask(taskId, reason, companyId)

    revalidatePath('/[tenantSlug]/production', 'layout')
    revalidatePath('/[tenantSlug]/operator', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to pause production task.' }
  }
}

/**
 * Server Action: Complete a production task
 */
export async function completeProductionTaskAction(
  taskId: string,
  completionData?: {
    good_quantity?: number
    rejected_quantity?: number
    notes?: string
  },
  requestedCompanyId?: string
): Promise<
  ServerActionResult<{
    completedTask: ProductionTaskRecord
    nextReadyTask: ProductionTaskRecord | null
  }>
> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail || null

    const result = await ProductionPlanningService.completeTask(taskId, companyId, completionData)

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
}

/**
 * Server Action: Place task on hold
 */
export async function holdProductionTaskAction(
  input: HoldTaskInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail || null

    const task = await ProductionPlanningService.holdTask(input, companyId)

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
}

/**
 * Server Action: Resume task from hold
 */
export async function resumeProductionTaskAction(
  taskId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const task = await ProductionPlanningService.resumeTask(taskId, companyId)

    revalidatePath('/[tenantSlug]/production', 'layout')
    return { success: true, data: task }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resume production task.' }
  }
}

/**
 * Server Action: Create rework task
 */
export async function reworkProductionTaskAction(
  input: ReworkTaskInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail || null
    const userName = tenant.fullName || 'QC Inspector'

    const task = await ProductionPlanningService.createReworkTask(input, companyId, userName)

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
}

/**
 * Server Action: Get Machine Queues (NOW, NEXT, LATER)
 */
export async function getMachineQueuesAction(
  branchId?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineQueueGroup[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const queues = await ProductionPlanningService.getMachineQueues(companyId, branchId)
    return { success: true, data: queues }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch machine queues.' }
  }
}

/**
 * Server Action: Get current operator's assigned tasks
 */
export async function getMyAssignedTasksAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId

    const tasks = await ProductionPlanningService.getTasks(companyId, {
      assigned_operator_id: userId,
    })
    return { success: true, data: tasks }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch operator tasks.' }
  }
}

/**
 * Server Action: First-Class Problem Reporting (⚠ সমস্যা হয়েছে)
 */
export async function reportProductionProblemAction(
  params: {
    task_id: string
    reason: string
    notes?: string
    photo_url?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<any>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    // 1. Hold / Pause the task
    const updatedTask = await ProductionPlanningService.holdTask(
      {
        task_id: params.task_id,
        hold_reason: (params.reason as any) || 'customer_approval',
        hold_notes: params.notes,
      },
      companyId
    )

    // 2. Log Audit Event
    await AuditRepository.logEvent({
      companyId,
      entity: 'production_task',
      action: 'hold',
      entityId: params.task_id,
      newValue: {
        problem_reason: params.reason,
        notes: params.notes,
        photo_attached: Boolean(params.photo_url),
      },
      userEmail: tenant?.userEmail || 'Operator',
      userId: tenant?.userId,
    })

    revalidatePath('/production')
    revalidatePath('/operator')

    return {
      success: true,
      data: {
        task: updatedTask,
        problem_reason: params.reason,
        notes: params.notes,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to report production problem.' }
  }
}


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

async function resolveTenantContext(requestedCompanyId?: string) {
  let companyId = requestedCompanyId || ''
  let userId = 'system'
  let userEmail = 'system@printerp.local'
  let userName = 'Operator'

  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (tenant?.companyId) {
      companyId = tenant.companyId
      userId = tenant.userId || userId
      userEmail = tenant.userEmail || userEmail
      userName = tenant.fullName || userName
    }
  } catch {}

  if (!companyId) {
    companyId = requestedCompanyId || 'default'
  }

  return { companyId, userId, userEmail, userName }
}

/**
 * Server Action: Fetch production tasks
 */
export async function getProductionTasksAction(
  filters?: TaskFilterOptions,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord[]>> {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
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
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>
): Promise<ServerActionResult<ProductionTaskRecord>> {
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
}

/**
 * Server Action: Create a production task
 */
export async function createProductionTaskAction(
  data: CreateProductionTaskInput,
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord>> {
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
}

/**
 * Server Action: Schedule a production task
 */
export async function scheduleProductionTaskAction(
  input: ScheduleTaskInput,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>
): Promise<ServerActionResult<ProductionTaskRecord>> {
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
    return { success: false, error: err.message || 'Failed to schedule production task.' }
  }
}

/**
 * Server Action: Start a production task
 */
export async function startProductionTaskAction(
  taskId: string,
  forceOverride: boolean = false,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>
): Promise<ServerActionResult<ProductionTaskRecord>> {
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
}

/**
 * Server Action: Pause a production task
 */
export async function pauseProductionTaskAction(
  taskId: string,
  reason: string,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.pauseTask(taskId, reason, companyId, taskPayload)

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
    defect_reason?: string | null
    scrap_notes?: string | null
    notes?: string
  },
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>
): Promise<
  ServerActionResult<{
    completedTask: ProductionTaskRecord
    nextReadyTask: ProductionTaskRecord | null
  }>
> {
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
}

/**
 * Server Action: Generate automated Production Tasks from Product / Order specifications
 */
export async function generateProductionTasksFromOrderAction(
  input: {
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
  requestedCompanyId?: string
): Promise<ServerActionResult<ProductionTaskRecord[]>> {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const tasks = await ProductionPlanningService.generateTasksFromOrderOrProduct(input, companyId)
    revalidatePath('/[tenantSlug]/production', 'layout')
    return { success: true, data: tasks }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate production tasks.' }
  }
}

/**
 * Server Action: Get compatible machineries for a given task
 */
export async function getCompatibleMachineriesForTaskAction(
  taskId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<Array<{ machine: any; isCompatible: boolean; incompatibilityReasons: string[]; currentLoadMinutes: number }>>> {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const data = await ProductionPlanningService.getCompatibleMachinesForTask(taskId, companyId)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to check machine compatibility.' }
  }
}

/**
 * Server Action: Reassign all tasks from a broken machine to a target machine
 */
export async function reassignHeldTasksAction(
  sourceMachineId: string,
  targetMachineId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<{ reassignedCount: number; tasks: ProductionTaskRecord[] }>> {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const result = await ProductionPlanningService.reassignHeldTasks(companyId, sourceMachineId, targetMachineId)
    revalidatePath('/[tenantSlug]/production', 'layout')
    revalidatePath('/[tenantSlug]/operator', 'layout')
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reassign tasks.' }
  }
}

/**
 * Server Action: Place task on hold
 */
export async function holdProductionTaskAction(
  input: HoldTaskInput,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>
): Promise<ServerActionResult<ProductionTaskRecord>> {
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
}

/**
 * Server Action: Resume task from hold
 */
export async function resumeProductionTaskAction(
  taskId: string,
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>
): Promise<ServerActionResult<ProductionTaskRecord>> {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
    const task = await ProductionPlanningService.resumeTask(taskId, companyId, taskPayload)

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
  requestedCompanyId?: string,
  taskPayload?: Partial<ProductionTaskRecord>
): Promise<ServerActionResult<ProductionTaskRecord>> {
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
}

/**
 * Server Action: Get Machine Queues (NOW, NEXT, LATER)
 */
export async function getMachineQueuesAction(
  branchId?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<MachineQueueGroup[]>> {
  try {
    const { companyId } = await resolveTenantContext(requestedCompanyId)
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
    const { companyId, userId } = await resolveTenantContext(requestedCompanyId)
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
    taskPayload?: Partial<ProductionTaskRecord>
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<any>> {
  try {
    const { companyId, userId, userEmail } = await resolveTenantContext(requestedCompanyId)

    // 1. Hold / Pause the task
    const updatedTask = await ProductionPlanningService.holdTask(
      {
        task_id: params.task_id,
        hold_reason: (params.reason as any) || 'customer_approval',
        hold_notes: params.notes,
      },
      companyId,
      params.taskPayload
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
      userEmail: userEmail || 'Operator',
      userId: userId,
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


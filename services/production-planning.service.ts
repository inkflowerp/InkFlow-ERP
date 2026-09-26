import type {
  ProductionTaskRecord,
  CreateProductionTaskInput,
  UpdateProductionTaskInput,
  ScheduleTaskInput,
  HoldTaskInput,
  ReworkTaskInput,
  ProductionTaskStatus,
  MachineQueueGroup,
  MachineQueueItem,
} from '../types/production.types.ts'
import { ProductionTaskRepository, type TaskFilterOptions } from '../lib/repositories/production-task.repository.ts'
import { MachineryRepository } from '../lib/repositories/machinery.repository.ts'
import { InventoryRepository } from '../lib/repositories/inventory.repository.ts'
import { MachineryService } from './machinery.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'

// Concurrency mutex lock per (companyId + machineId) to serialize concurrent booking promises
const scheduleLocks = new Map<string, Promise<void>>()

async function withScheduleLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  while (scheduleLocks.has(lockKey)) {
    try {
      await scheduleLocks.get(lockKey)
    } catch (_) {}
  }
  let resolveLock: () => void = () => {}
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve
  })
  scheduleLocks.set(lockKey, lockPromise)
  try {
    return await fn()
  } finally {
    scheduleLocks.delete(lockKey)
    resolveLock()
  }
}

export class ProductionPlanningService {
  /**
   * Validate if a status transition is permitted by the production state machine.
   */
  static isValidStatusTransition(
    currentStatus: ProductionTaskStatus,
    newStatus: ProductionTaskStatus
  ): boolean {
    if (currentStatus === newStatus) return true

    const allowedTransitions: Record<ProductionTaskStatus, ProductionTaskStatus[]> = {
      queued: ['scheduled', 'ready', 'in_progress', 'completed', 'on_hold', 'cancelled'],
      scheduled: ['ready', 'in_progress', 'completed', 'on_hold', 'cancelled'],
      ready: ['in_progress', 'completed', 'on_hold', 'cancelled'],
      in_progress: ['paused', 'completed', 'on_hold', 'rework', 'cancelled'],
      paused: ['in_progress', 'completed', 'on_hold', 'cancelled'],
      on_hold: ['ready', 'queued', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      rework: ['in_progress', 'completed', 'cancelled', 'on_hold'],
      completed: ['rework'], // completed cannot transition except spawning rework
      cancelled: [], // terminal
    }

    return (allowedTransitions[currentStatus] || []).includes(newStatus)
  }

  /**
   * Get production tasks with hydrated dependency block status.
   */
  static async getTasks(
    companyId: string,
    filters?: TaskFilterOptions
  ): Promise<ProductionTaskRecord[]> {
    if (!companyId) return []
    const tasks = await ProductionTaskRepository.getTasks(companyId, filters)

    // Group tasks by job_order_id to compute sequential dependency blockers
    const jobTasksMap = new Map<string, ProductionTaskRecord[]>()
    for (const task of tasks) {
      const list = jobTasksMap.get(task.job_order_id) || []
      list.push(task)
      jobTasksMap.set(task.job_order_id, list)
    }

    // Load store context for commercial & design gates
    const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
    const salesOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []

    // Evaluate sequential dependencies and commercial/design gates
    for (const task of tasks) {
      if (task.status === 'completed' || task.status === 'cancelled') {
        task.is_blocked_by_dependency = false
        task.blocking_dependency_task_name = null
        task.is_blocked_by_commercial_gate = false
        task.is_blocked_by_design_gate = false
        continue
      }

      const siblingTasks = jobTasksMap.get(task.job_order_id) || []
      const upstreamIncomplete = siblingTasks
        .filter((s) => s.sequence_order < task.sequence_order && s.status !== 'completed' && s.status !== 'cancelled')
        .sort((a, b) => a.sequence_order - b.sequence_order)

      if (upstreamIncomplete.length > 0) {
        task.is_blocked_by_dependency = true
        task.blocking_dependency_task_name = upstreamIncomplete[0].task_name
      } else {
        task.is_blocked_by_dependency = false
        task.blocking_dependency_task_name = null
      }

      // Check commercial gate
      const jo = jobOrders.find((j) => (j.id === task.job_order_id || j.id === (task as any).order_id) && ProductionTaskRepository.isMatchingCompany(j.company_id, companyId))
      const so = jo?.order_id ? salesOrders.find((s) => s.id === jo.order_id && ProductionTaskRepository.isMatchingCompany(s.company_id, companyId)) : null
      const hasJobContext = Boolean(jo || so)

      const hasInvoiceInStore = Boolean(
        jo?.invoice_id ||
        jo?.invoice_number ||
        so?.invoice_id ||
        so?.invoice_number ||
        task.job_number?.startsWith('INV-') ||
        (so && invoices.some((inv) => inv.sales_order_id === so.id)) ||
        (jo && invoices.some((inv) => inv.job_order_id === jo.id || inv.invoice_number === jo.invoice_number || inv.id === jo.invoice_id)) ||
        invoices.some((inv) => (task.job_number && inv.invoice_number === task.job_number) || (task.customer_name && inv.customer_name === task.customer_name))
      )

      const hasInvoice = hasJobContext
        ? hasInvoiceInStore
        : Boolean(task.is_blocked_by_commercial_gate === false || (task as any).commercial_gate_status === 'ready_for_production' || hasInvoiceInStore)

      if (!hasInvoice && task.department !== 'design') {
        task.is_blocked_by_commercial_gate = true
        task.commercial_gate_reason = 'Official invoice not created yet'
      } else {
        task.is_blocked_by_commercial_gate = false
        task.commercial_gate_reason = null
      }

      // Check design gate
      const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
      const isDesignJobApproved = designJobs.some(
        (dj) =>
          ProductionTaskRepository.isMatchingCompany(dj.company_id, companyId) &&
          ((so && (dj.order_id === so.id || dj.sales_order_id === so.id)) ||
           (jo && (dj.id === jo.design_job_id || dj.order_id === jo.order_id || dj.job_order_id === jo.id || dj.invoice_id === jo.invoice_id || dj.invoice_number === jo.invoice_number)) ||
           (dj.invoice_number && dj.invoice_number === task.job_number) ||
           (dj.design_number && dj.design_number === task.job_number) ||
           (dj.title && task.task_name?.includes(dj.title))) &&
          (dj.status === 'approved' || dj.is_locked || dj.workflow_routing === 'ready_production' || dj.workflow_routing === 'design_ok' || dj.customer_approval_required === false || (dj.versions && dj.versions.some((v: any) => v.is_approved)))
      )

      const routing = jo?.workflow_routing || so?.workflow_routing || (hasJobContext ? 'design_required' : (task.is_blocked_by_design_gate === false ? 'design_ok' : 'design_required'))
      const isDesignApproved = hasJobContext
        ? (jo?.artwork_status === 'approved' || routing === 'design_ok' || routing === 'ready_production' || isDesignJobApproved)
        : Boolean(task.is_blocked_by_design_gate === false || (task as any).commercial_gate_status === 'ready_for_production' || isDesignJobApproved)

      if (routing === 'design_required' && !isDesignApproved && task.department !== 'design') {
        task.is_blocked_by_design_gate = true
        task.design_gate_reason = 'Customer design approval required'
      } else {
        task.is_blocked_by_design_gate = false
        task.design_gate_reason = null
      }
    }

    return tasks
  }

  static async getTaskById(
    id: string,
    companyId: string,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord | null> {
    if (!id || !companyId) return null
    const task = await ProductionTaskRepository.getTaskById(id, companyId, taskPayload)
    if (!task) return null

    // Check upstream dependency
    const siblings = await ProductionTaskRepository.getTasksByJobOrder(task.job_order_id, companyId)
    const upstreamIncomplete = siblings
      .filter((s) => s.sequence_order < task.sequence_order && s.status !== 'completed' && s.status !== 'cancelled')
      .sort((a, b) => a.sequence_order - b.sequence_order)

    if (upstreamIncomplete.length > 0 && task.status !== 'completed' && task.status !== 'cancelled') {
      task.is_blocked_by_dependency = true
      task.blocking_dependency_task_name = upstreamIncomplete[0].task_name
    } else {
      task.is_blocked_by_dependency = false
      task.blocking_dependency_task_name = null
    }

    // Check commercial & design gates
    const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
    const salesOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []

    const jo = jobOrders.find((j) => (j.id === task.job_order_id || j.id === (task as any).order_id) && ProductionTaskRepository.isMatchingCompany(j.company_id, companyId))
    const so = jo?.order_id ? salesOrders.find((s) => s.id === jo.order_id && ProductionTaskRepository.isMatchingCompany(s.company_id, companyId)) : null
    const hasJobContext = Boolean(jo || so)

    const hasInvoiceInStore = Boolean(
      jo?.invoice_id ||
      jo?.invoice_number ||
      so?.invoice_id ||
      so?.invoice_number ||
      task.job_number?.startsWith('INV-') ||
      (so && invoices.some((inv) => inv.sales_order_id === so.id)) ||
      (jo && invoices.some((inv) => inv.job_order_id === jo.id || inv.invoice_number === jo.invoice_number || inv.id === jo.invoice_id)) ||
      invoices.some((inv) => (task.job_number && inv.invoice_number === task.job_number) || (task.customer_name && inv.customer_name === task.customer_name))
    )

    const hasInvoice = hasJobContext
      ? hasInvoiceInStore
      : Boolean(task.is_blocked_by_commercial_gate === false || (task as any).commercial_gate_status === 'ready_for_production' || hasInvoiceInStore)

    if (!hasInvoice && task.department !== 'design') {
      task.is_blocked_by_commercial_gate = true
      task.commercial_gate_reason = 'Official invoice not created yet'
    } else {
      task.is_blocked_by_commercial_gate = false
      task.commercial_gate_reason = null
    }

    const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const isDesignJobApproved = designJobs.some(
      (dj) =>
        ProductionTaskRepository.isMatchingCompany(dj.company_id, companyId) &&
        ((so && (dj.order_id === so.id || dj.sales_order_id === so.id)) ||
         (jo && (dj.id === jo.design_job_id || dj.order_id === jo.order_id || dj.job_order_id === jo.id || dj.invoice_id === jo.invoice_id || dj.invoice_number === jo.invoice_number)) ||
         (dj.invoice_number && dj.invoice_number === task.job_number) ||
         (dj.design_number && dj.design_number === task.job_number) ||
         (dj.title && task.task_name?.includes(dj.title))) &&
        (dj.status === 'approved' || dj.is_locked || dj.workflow_routing === 'ready_production' || dj.workflow_routing === 'design_ok' || dj.customer_approval_required === false || (dj.versions && dj.versions.some((v: any) => v.is_approved)))
    )

    const routing = jo?.workflow_routing || so?.workflow_routing || (hasJobContext ? 'design_required' : (task.is_blocked_by_design_gate === false ? 'design_ok' : 'design_required'))
    const isDesignApproved = hasJobContext
      ? (jo?.artwork_status === 'approved' || routing === 'design_ok' || routing === 'ready_production' || isDesignJobApproved)
      : Boolean(task.is_blocked_by_design_gate === false || (task as any).commercial_gate_status === 'ready_for_production' || isDesignJobApproved)

    if (routing === 'design_required' && !isDesignApproved && task.department !== 'design') {
      task.is_blocked_by_design_gate = true
      task.design_gate_reason = 'Customer design approval required'
    } else {
      task.is_blocked_by_design_gate = false
      task.design_gate_reason = null
    }

    return task
  }


  /**
   * Create a new production task.
   */
  static async createTask(
    data: CreateProductionTaskInput,
    companyId: string
  ): Promise<ProductionTaskRecord> {
    if (!companyId) throw new Error('Company ID is required')
    if (!data.job_order_id) throw new Error('Job Order ID is required')
    if (!data.task_name) throw new Error('Task name is required')

    // Determine sequence order if not specified
    let sequenceOrder = data.sequence_order
    if (sequenceOrder === undefined || sequenceOrder === null) {
      const existing = await ProductionTaskRepository.getTasksByJobOrder(data.job_order_id, companyId)
      sequenceOrder = existing.length + 1
    }

    const taskNumber = `TSK-${Date.now().toString().slice(-6)}-${sequenceOrder}`

    return await ProductionTaskRepository.createTask({
      ...data,
      sequence_order: sequenceOrder,
      company_id: companyId,
      task_number: taskNumber,
    })
  }

  /**
   * Schedule a task onto a machine and operator with hardened conflict detection & capability validation.
   */
  static async scheduleTask(
    input: ScheduleTaskInput,
    companyId: string,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    if (!companyId) throw new Error('Company ID is required')
    if (!input.task_id) throw new Error('Task ID is required')
    if (!input.scheduled_start) throw new Error('Scheduled start time is required')

    const lockKey = `${companyId}:${input.assigned_machine_id || 'manual'}`

    return await withScheduleLock(lockKey, async () => {
      const task = await ProductionTaskRepository.getTaskById(input.task_id, companyId, taskPayload)
      if (!task) throw new Error(`Production task not found: ${input.task_id}`)

      if (task.status === 'cancelled') {
        throw new Error('Cannot schedule a cancelled production task.')
      }

      const startDate = new Date(input.scheduled_start)
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid scheduled start timestamp')
      }

      const durationMinutes = input.estimated_duration_minutes || task.estimated_duration_minutes || 60
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

      let machineName: string | null = null

      // Machine validation and capability checking
      if (input.assigned_machine_id) {
        const machine = await MachineryRepository.getMachineryById(input.assigned_machine_id, companyId)
        if (!machine) {
          throw new Error('Assigned machine not found in this company')
        }

        // Branch isolation check
        if (machine.branch_id && task.branch_id && machine.branch_id !== task.branch_id) {
          throw new Error(`Cannot assign machine: Machine belongs to branch ${machine.branch_id}, but task is in branch ${task.branch_id}.`)
        }

        // Operational status checks
        if (machine.status === 'breakdown') {
          throw new Error(`Cannot schedule task on ${machine.name}: Machine is currently broken down.`)
        }
        if (machine.status === 'maintenance') {
          throw new Error(`Cannot schedule task on ${machine.name}: Machine is currently under maintenance.`)
        }
        if (machine.status === 'retired' || machine.status === 'offline') {
          throw new Error(`Cannot schedule task on ${machine.name}: Machine is ${machine.status}.`)
        }

        // Capability: Dimension limits check
        if (task.width && machine.max_width && task.width > machine.max_width) {
          throw new Error(
            `Machine capability exceeded: Task width (${task.width}) exceeds ${machine.name} max width (${machine.max_width} ${machine.dimension_unit || 'inch'}).`
          )
        }
        if (task.height && machine.max_height && task.height > machine.max_height) {
          throw new Error(
            `Machine capability exceeded: Task height (${task.height}) exceeds ${machine.name} max height (${machine.max_height} ${machine.dimension_unit || 'inch'}).`
          )
        }

        // Capability: Production type support check
        if (
          machine.supported_production_types &&
          machine.supported_production_types.length > 0 &&
          task.task_type &&
          !machine.supported_production_types.includes(task.task_type) &&
          !machine.supported_production_types.includes('all')
        ) {
          throw new Error(
            `Machine mismatch: ${machine.name} does not support production type "${task.task_type}". Supported types: ${machine.supported_production_types.join(', ')}`
          )
        }

        // Check maintenance schedule conflict
        const maintenances = await MachineryRepository.getMaintenances(machine.id, companyId)
        for (const m of maintenances) {
          if (m.status !== 'completed' && m.status !== 'cancelled' && m.scheduled_date) {
            const mDate = new Date(m.scheduled_date)
            // 4-hour maintenance block window
            const mEnd = new Date(mDate.getTime() + 4 * 60 * 60 * 1000)
            if (startDate < mEnd && endDate > mDate) {
              throw new Error(`Schedule conflict: Machine ${machine.name} has scheduled maintenance during this window.`)
            }
          }
        }

        // Check existing task overlap conflicts on this machine
        const existingTasks = await ProductionTaskRepository.getTasks(companyId, {
          assigned_machine_id: machine.id,
        })

        for (const t of existingTasks) {
          if (
            t.id !== task.id &&
            t.status !== 'cancelled' &&
            t.status !== 'completed' &&
            t.scheduled_start &&
            t.scheduled_end
          ) {
            const exStart = new Date(t.scheduled_start)
            const exEnd = new Date(t.scheduled_end)
            if (startDate < exEnd && endDate > exStart) {
              throw new Error(
                `Schedule conflict: Machine ${machine.name} is already booked from ${exStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${exEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Job #${t.job_number || t.task_number}).`
              )
            }
          }
        }

        machineName = machine.name

        // Create assignment record in machinery assignments table
        try {
          await MachineryRepository.createAssignment({
            company_id: companyId,
            machine_id: machine.id,
            job_order_id: task.job_order_id || null,
            production_job_id: task.production_job_id || null,
            operator_id: input.assigned_operator_id || null,
            task_type: task.task_type,
            task_name: task.task_name,
            branch_id: task.branch_id || null,
            scheduled_start: startDate.toISOString(),
            scheduled_end: endDate.toISOString(),
            status: 'scheduled',
            notes: input.notes || null,
          })
        } catch (err: any) {
          // If exclusion violation occurs at DB level, rethrow clear conflict message
          if (err.message?.includes('exclude') || err.code === '23P01') {
            throw new Error(`Schedule conflict: Machine ${machine.name} is already booked during this time window.`)
          }
          console.warn('Machinery assignment sync notice:', err.message)
        }
      }

      const updated = await ProductionTaskRepository.updateTask(task.id, companyId, {
        assigned_machine_id: input.assigned_machine_id || null,
        assigned_machine_name: machineName,
        assigned_operator_id: input.assigned_operator_id || task.assigned_operator_id || null,
        scheduled_start: startDate.toISOString(),
        scheduled_end: endDate.toISOString(),
        estimated_duration_minutes: durationMinutes,
        status: task.status === 'queued' ? 'scheduled' : task.status,
        notes: input.notes !== undefined ? input.notes : task.notes,
      })

      return updated
    })
  }

  /**
   * Start a production task.
   */
  static async startTask(
    taskId: string,
    companyId: string,
    operatorId?: string,
    operatorName?: string,
    forceOverrideDependency: boolean = false,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    const task = await this.getTaskById(taskId, companyId, taskPayload)
    if (!task) throw new Error('Task not found')

    if (!forceOverrideDependency && task.is_blocked_by_dependency) {
      throw new Error(
        `Cannot start task: Upstream task "${task.blocking_dependency_task_name}" must be completed first.`
      )
    }

    if (task.is_blocked_by_commercial_gate) {
      throw new Error(
        `Cannot start production: Commercial gate blocked - ${task.commercial_gate_reason || 'Official invoice not created yet.'}`
      )
    }

    if (task.is_blocked_by_design_gate) {
      throw new Error(
        `Cannot start production: Design gate blocked - ${task.design_gate_reason || 'Customer design approval required.'}`
      )
    }

    if (!this.isValidStatusTransition(task.status, 'in_progress')) {
      throw new Error(`Invalid status transition from ${task.status} to in_progress`)
    }


    const extraUpdates: Partial<ProductionTaskRecord> = {
      actual_start: new Date().toISOString(),
      hold_reason: null,
      hold_notes: null,
    }

    if (operatorId) {
      extraUpdates.assigned_operator_id = operatorId
    }
    if (operatorName) {
      extraUpdates.assigned_operator_name = operatorName
    }

    // If machine is assigned, set machine status to in_use
    if (task.assigned_machine_id) {
      try {
        await MachineryRepository.updateStatus(task.assigned_machine_id, companyId, 'in_use')
      } catch (err: any) {
        console.warn(`[ProductionPlanningService] Failed to set machine ${task.assigned_machine_id} to in_use:`, err?.message || err)
      }
    }

    return await ProductionTaskRepository.updateTaskStatus(taskId, companyId, 'in_progress', extraUpdates)
  }

  /**
   * Pause a production task.
   */
  static async pauseTask(
    taskId: string,
    reason: string,
    companyId: string,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    const task = await this.getTaskById(taskId, companyId, taskPayload)
    if (!task) throw new Error('Task not found')

    if (!this.isValidStatusTransition(task.status, 'paused')) {
      throw new Error(`Invalid status transition from ${task.status} to paused`)
    }

    return await ProductionTaskRepository.updateTaskStatus(taskId, companyId, 'paused', {
      notes: reason ? `Paused: ${reason}` : task.notes,
    })
  }

  /**
   * Complete a production task and automatically release downstream dependencies.
   */
  static async completeTask(
    taskId: string,
    companyId: string,
    completionData?: {
      good_quantity?: number
      rejected_quantity?: number
      defect_reason?: string | null
      scrap_notes?: string | null
      notes?: string
    },
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<{ completedTask: ProductionTaskRecord; nextReadyTask: ProductionTaskRecord | null }> {
    const task = await this.getTaskById(taskId, companyId, taskPayload)
    if (!task) throw new Error('Task not found')

    if (task.status === 'completed') {
      return {
        completedTask: task,
        nextReadyTask: null,
      }
    }

    if (!this.isValidStatusTransition(task.status, 'completed')) {
      throw new Error(`Invalid status transition from ${task.status} to completed`)
    }

    const now = new Date()
    let actualDuration: number | null = null
    const actualStart = task.actual_start || task.created_at || now.toISOString()
    if (actualStart) {
      const startMs = new Date(actualStart).getTime()
      if (!isNaN(startMs)) {
        actualDuration = Math.max(1, Math.round((now.getTime() - startMs) / 60000))
      }
    }

    const completed = await ProductionTaskRepository.updateTaskStatus(taskId, companyId, 'completed', {
      actual_start: task.actual_start || actualStart,
      actual_end: now.toISOString(),
      actual_duration_minutes: actualDuration,
      good_quantity: completionData?.good_quantity ?? (completionData as any)?.completed_quantity ?? task.quantity,
      completed_quantity: completionData?.good_quantity ?? (completionData as any)?.completed_quantity ?? task.quantity,
      rejected_quantity: completionData?.rejected_quantity ?? (completionData as any)?.scrap_quantity ?? 0,
      scrap_area_sft: (completionData as any)?.scrap_area_sft ?? null,
      defect_reason: completionData?.defect_reason || null,
      scrap_notes: completionData?.scrap_notes || null,
      consumed_material_qty: (completionData as any)?.consumed_material_qty || null,
      consumed_material_unit: (completionData as any)?.consumed_material_unit || null,
      mounted_roll_id: (completionData as any)?.mounted_roll_id || task.mounted_roll_id || null,
      mounted_roll_tag: (completionData as any)?.mounted_roll_tag || task.mounted_roll_tag || null,
      notes: completionData?.notes || task.notes,
    })

    // 1. Automatic Roll / Substrate Inventory Deduction
    const targetRollId = (completionData as any)?.mounted_roll_id || task.mounted_roll_id
    const explicitLinearFt = (completionData as any)?.linear_feed_ft ?? (completionData as any)?.linear_length_consumed_ft
    const bleedAllowanceFt = (completionData as any)?.bleed_allowance_ft ?? 0
    const wastageLengthFt = (completionData as any)?.wastage_length_ft ?? 0
    const wastageReason = (completionData as any)?.wastage_reason ?? completionData?.defect_reason ?? null
    const consumedQty = (completionData as any)?.consumed_material_qty || task.consumed_material_qty || (task.width && task.height && (task.unit === 'sft' || task.unit === 'sqft') ? task.width * task.height * (task.quantity || 1) : task.quantity)

    if (targetRollId && (explicitLinearFt !== undefined || consumedQty > 0)) {
      try {
        const roll = await InventoryRepository.getInventoryRollById(targetRollId, companyId)
        if (roll) {
          const widthFt = Number(roll.width_ft) || 1
          const linearFt = explicitLinearFt !== undefined ? Number(explicitLinearFt) : Math.round((consumedQty / widthFt) * 100) / 100
          await InventoryRepository.consumeFromPhysicalRoll({
            company_id: companyId,
            roll_id: targetRollId,
            linear_length_consumed_ft: linearFt,
            bleed_allowance_ft: Number(bleedAllowanceFt) || 0,
            wastage_length_ft: Number(wastageLengthFt) || 0,
            wastage_reason: wastageReason,
            production_task_id: task.id,
            job_order_id: task.job_order_id,
            operator_name: task.assigned_operator_name || 'Operator',
            notes: `Auto-deducted from ${task.task_name} (${task.task_number})`,
            offcut_remnant: (completionData as any)?.offcut_remnant,
          })
        }
      } catch (_) {}
    } else if (!targetRollId && consumedQty > 0) {
      // 1b. Direct Master Material Stock Deduction (Sheet/Plate/Acrylic/Ink/Standard Substrate)
      try {
        let matId = task.required_material || (task as any).material_id
        if (!matId) {
          const reqs = await InventoryRepository.getTaskRequirements(task.id, companyId)
          if (reqs && reqs.length > 0) {
            matId = reqs[0].material_id
          }
        }
        if (!matId && task.product_name) {
          const prodName = task.product_name.toLowerCase()
          const allMats = await InventoryRepository.getMaterials(companyId)
          const matched = allMats.find((m) =>
            m.name.toLowerCase().includes(prodName) ||
            prodName.includes(m.name.toLowerCase())
          )
          if (matched) matId = matched.id
        }

        if (matId) {
          await InventoryRepository.recordStockAdjustment({
            company_id: companyId,
            branch_id: task.branch_id || null,
            material_id: matId,
            quantity_change: -Math.abs(consumedQty),
            transaction_type: 'CONSUMPTION',
            reference_type: 'PRODUCTION_TASK',
            reference_id: task.id,
            production_task_id: task.id,
            notes: `Floor consumption for task ${task.task_number} (${task.task_name})`,
            performed_by_id: task.assigned_operator_id || null,
            performed_by_name: task.assigned_operator_name || 'Operator',
          })
        }
      } catch (_) {}
    }

    // 2. Scrap & Wastage Recording
    const rejectedQty = completionData?.rejected_quantity ?? (completionData as any)?.scrap_quantity ?? 0
    const scrapAreaSft = (completionData as any)?.scrap_area_sft || 0
    if ((rejectedQty > 0 || scrapAreaSft > 0) && completionData?.defect_reason) {
      try {
        let matId = task.required_material
        if (!matId && targetRollId) {
          const r = await InventoryRepository.getInventoryRollById(targetRollId, companyId)
          if (r?.material_id) matId = r.material_id
        }
        if (!matId) {
          const allMats = await InventoryRepository.getMaterials(companyId)
          if (allMats.length > 0) matId = allMats[0].id
        }

        if (matId) {
          await InventoryRepository.recordWastage({
            company_id: companyId,
            material_id: matId,
            material_name: task.product_name || 'Production Substrate',
            job_order_id: task.job_order_id,
            production_task_id: task.id,
            wastage_quantity: scrapAreaSft > 0 ? scrapAreaSft : rejectedQty,
            unit: scrapAreaSft > 0 ? 'sft' : task.unit || 'pcs',
            wastage_reason: `${completionData.defect_reason}: ${completionData.scrap_notes || 'Floor scrap logged on completion'}`,
            operator_name: (completionData as any)?.operator_name || task.assigned_operator_name || 'Operator',
          })
        }
      } catch (_) {}
    }

    // 3. Machine Production Meter Increment
    if (task.assigned_machine_id) {
      try {
        const machine = await MachineryRepository.getMachineryById(task.assigned_machine_id, companyId)
        if (machine) {
          const sftIncrement = (consumedQty && consumedQty > 0) ? consumedQty : (task.width && task.height && (task.unit === 'sft' || task.unit === 'sqft')) ? (task.width * task.height * (completionData?.good_quantity ?? task.quantity)) : 0
          const impressionIncrement = task.department === 'printing' ? (completionData?.good_quantity ?? (completionData as any)?.completed_quantity ?? task.quantity) : 0
          const hoursIncrement = actualDuration ? Math.round((actualDuration / 60) * 100) / 100 : 0

          await MachineryRepository.updateMachinery(task.assigned_machine_id, companyId, {
            total_sft_produced: (Number(machine.total_sft_produced) || 0) + sftIncrement,
            total_impressions: (Number(machine.total_impressions) || 0) + impressionIncrement,
            total_operating_hours: (Number(machine.total_operating_hours) || 0) + hoursIncrement,
          })
        }
      } catch (_) {}

      try {
        const activeOnMachine = await ProductionTaskRepository.getTasks(companyId, {
          assigned_machine_id: task.assigned_machine_id,
          status: 'in_progress',
        })
        if (activeOnMachine.length === 0) {
          await MachineryRepository.updateStatus(task.assigned_machine_id, companyId, 'available')
        }
      } catch (err: any) {
        console.warn(`[ProductionPlanningService] Failed to set machine ${task.assigned_machine_id} to available:`, err?.message || err)
      }
    }

    // Automatically advance next task in sequence for this Job Order
    const nextReadyTask = await ProductionTaskRepository.advanceSequentialTask(
      task.job_order_id,
      task.sequence_order,
      companyId,
      task
    )

    if (nextReadyTask) {
      // If the next ready task is finishing or fabrication, route Production Job and Order to finishing stage
      if (nextReadyTask.department === 'finishing' || nextReadyTask.task_type === 'finishing') {
        try {
          const { ProductionRepository } = await import('../lib/repositories/production.repository.ts')
          const allProdJobs = await ProductionRepository.getProductionJobs(companyId)
          const matchedProd = allProdJobs.find(
            (pj) =>
              pj.id === task.production_job_id ||
              pj.production_job_number === task.job_number ||
              (task.job_number && pj.production_job_number && task.job_number.includes(pj.production_job_number))
          )
          if (matchedProd) {
            await ProductionRepository.updateProductionJob(matchedProd.id, {
              stage: 'finishing',
              status: 'in_progress',
            }, companyId)
          }

          const allOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
          const matchedOrder = allOrders.find(
            (o) =>
              o.id === task.job_order_id ||
              o.order_number === task.job_number ||
              (task.job_number && o.order_number && task.job_number.includes(o.order_number))
          )
          if (matchedOrder && matchedOrder.status !== 'delivered' && matchedOrder.status !== 'cancelled') {
            PrintERPDataStore.updateItem<any>(STORAGE_KEYS.ORDERS, matchedOrder.id, {
              status: 'in_progress',
              stage: 'finishing',
            })
          }
        } catch (_) {}
      }
    }

    // 4. If all tasks for this Job Order / Production Job are completed, advance downstream stage
    if (!nextReadyTask) {
      try {
        const { ProductionRepository } = await import('../lib/repositories/production.repository.ts')
        const allProdJobs = await ProductionRepository.getProductionJobs(companyId)
        const matchedProd = allProdJobs.find(
          (pj) =>
            pj.id === task.production_job_id ||
            pj.production_job_number === task.job_number ||
            (task.job_number && pj.production_job_number && task.job_number.includes(pj.production_job_number))
        )
        if (matchedProd) {
          await ProductionRepository.updateProductionJob(matchedProd.id, {
            stage: 'ready_delivery',
            status: 'completed',
          }, companyId)
        }

        // Update Sales Order to ready_delivery
        const allOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
        const matchedOrder = allOrders.find(
          (o) =>
            o.id === task.job_order_id ||
            o.order_number === task.job_number ||
            (task.job_number && o.order_number && task.job_number.includes(o.order_number))
        )
        if (matchedOrder && matchedOrder.status !== 'delivered' && matchedOrder.status !== 'cancelled') {
          PrintERPDataStore.updateItem<any>(STORAGE_KEYS.ORDERS, matchedOrder.id, {
            status: 'completed',
            stage: 'ready_delivery',
          })
        }

        // Automatically dispatch to Delivery and Dispatch Terminal
        try {
          const { LogisticsRepository } = await import('../lib/repositories/logistics.repository.ts')
          const allChallans = await LogisticsRepository.getChallans(companyId)
          const targetRef = task.job_number || task.task_number.replace(/-[0-9]+$/, '')
          const existingChallan = allChallans.find(
            (c) =>
              c.invoice_number === targetRef ||
              c.order_number === targetRef ||
              (c.items && c.items.some((it: any) => it.product_description?.includes(task.product_name || '')))
          )
          if (!existingChallan) {
            const cleanRef = targetRef.replace(/[^A-Za-z0-9]/g, '')
            await LogisticsRepository.createChallan({
              company_id: companyId,
              customer_id: (task as any).customer_id || '',
              challan_number: `CH-${cleanRef}`,
              invoice_number: task.job_number?.startsWith('INV-') ? task.job_number : undefined,
              order_number: task.job_number?.startsWith('ORD-') ? task.job_number : undefined,
              customer_name: task.customer_name || 'Direct Customer',
              customer_phone: task.customer_phone || '',
              delivery_address: 'Main Counter / Dispatch Bay',
              delivery_method: 'hand_delivery',
              status: 'pending_dispatch',
              dispatch_date: new Date().toISOString().split('T')[0],
              items: [
                {
                  product_description: task.product_name || task.task_name,
                  quantity: task.quantity,
                  unit: task.unit || 'pcs',
                  status: 'ready_for_delivery',
                  is_delivered: false,
                },
              ],
            })
          }
        } catch (_) {}
      } catch (_) {}
    }

    return { completedTask: completed, nextReadyTask }
  }

  /**
   * Generates tailored sequential Production Tasks from a Product Master or Sales Order line item.
   * Connects Product BOM, Machine Routing & Finishing options into floor execution tasks.
   */
  static async generateTasksFromOrderOrProduct(
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
    companyId: string
  ): Promise<ProductionTaskRecord[]> {
    if (!companyId) throw new Error('Company ID is required')
    if (!input.job_order_id) throw new Error('Job Order ID is required')

    const createdTasks: ProductionTaskRecord[] = []
    let sequenceOrder = 1

    // 1. Fetch machineries fleet to auto-match primary and finishing machines
    const fleetMachines = await MachineryRepository.getMachineries(companyId)

    // Calculate dimensions in SqFt for duration estimations
    let widthIn = input.width || 0
    let heightIn = input.height || 0
    if (input.dimension_unit === 'ft') {
      widthIn *= 12
      heightIn *= 12
    } else if (input.dimension_unit === 'mm') {
      widthIn /= 25.4
      heightIn /= 25.4
    }
    const areaSqFt = (widthIn * heightIn) / 144 || 1
    const totalAreaSqFt = areaSqFt * (input.quantity || 1)

    // Task 1: Prepress & File Preparation (Design / Prepress)
    const prepressTask = await this.createTask(
      {
        job_order_id: input.job_order_id,
        production_job_id: input.production_job_id,
        task_name: `Pre-press & Artwork RIP Setup`,
        task_type: 'prepress',
        department: 'design',
        sequence_order: sequenceOrder++,
        quantity: input.quantity || 1,
        unit: input.unit || 'job',
        width: input.width,
        height: input.height,
        estimated_duration_minutes: 15,
        priority: 'normal',
        branch_id: input.branch_id,
        description: `RIP color separation, bleed verification and nesting for ${input.product_name || 'Item'}`,
      },
      companyId
    )
    createdTasks.push(prepressTask)

    // Task 2: Primary Printing / Fabrication Task
    const matchedPrintMachine = fleetMachines.find((m) => {
      if (m.status === 'retired' || m.status === 'breakdown') return false
      if (input.printing_method && m.machine_type?.toLowerCase().includes(input.printing_method.toLowerCase())) return true
      if (m.department === 'printing' || m.category === 'printing') return true
      return false
    })

    const printSpeedSqFtPerHour = matchedPrintMachine?.estimated_speed || 80 // default 80 sqft/hr
    const printDurationMinutes = Math.max(15, Math.ceil((totalAreaSqFt / printSpeedSqFtPerHour) * 60) + (matchedPrintMachine?.setup_time_mins || 5))

    const printingTask = await this.createTask(
      {
        job_order_id: input.job_order_id,
        production_job_id: input.production_job_id,
        task_name: `Print: ${input.product_name || 'Wide Format Print'}`,
        task_type: 'printing',
        department: 'printing',
        sequence_order: sequenceOrder++,
        quantity: input.quantity || 1,
        unit: input.unit || 'pcs',
        width: input.width,
        height: input.height,
        required_material: input.material_spec || 'Standard Substrate',
        required_machine_type: matchedPrintMachine?.machine_type || 'digital_printing',
        assigned_machine_id: matchedPrintMachine?.id || null,
        assigned_machine_name: matchedPrintMachine?.name || null,
        estimated_duration_minutes: printDurationMinutes,
        priority: 'normal',
        branch_id: input.branch_id,
        description: `High-resolution production on ${matchedPrintMachine?.name || 'Wide Format Press'}. Material: ${input.material_spec || 'Vinyl/Banner'}`,
      },
      companyId
    )
    createdTasks.push(printingTask)

    // Task 3: Finishing Operations (Lamination, Cutting, Eyelets, Binding)
    const finishingList = input.finishing_tasks || []
    if (finishingList.length > 0 || (input.notes && input.notes.toLowerCase().includes('lamination'))) {
      const matchedFinishingMachine = fleetMachines.find(
        (m) => m.department === 'finishing' || m.category === 'finishing' || m.machine_type === 'laminating' || m.machine_type === 'cutting_plotter'
      )

      const finishingTask = await this.createTask(
        {
          job_order_id: input.job_order_id,
          production_job_id: input.production_job_id,
          task_name: `Finishing: ${finishingList.join(', ') || 'Lamination & Trimming'}`,
          task_type: 'finishing',
          department: 'finishing',
          sequence_order: sequenceOrder++,
          quantity: input.quantity || 1,
          unit: input.unit || 'pcs',
          width: input.width,
          height: input.height,
          assigned_machine_id: matchedFinishingMachine?.id || null,
          assigned_machine_name: matchedFinishingMachine?.name || null,
          estimated_duration_minutes: Math.max(15, Math.ceil(totalAreaSqFt / 150 * 60)),
          priority: 'normal',
          branch_id: input.branch_id,
          description: `Post-press finishing operations: ${finishingList.join(', ') || 'Thermal/Cold Lamination and Precision Edge Trimming'}.`,
        },
        companyId
      )
      createdTasks.push(finishingTask)
    }

    // Task 4: Fabrication Operations (Welding, Acrylic Frame, LED Wiring) if applicable
    const fabList = input.fabrication_tasks || []
    if (fabList.length > 0) {
      const matchedFabMachine = fleetMachines.find(
        (m) => m.department === 'fabrication' || m.category === 'fabrication' || m.machine_type === 'laser_cutting' || m.machine_type === 'cnc_router'
      )

      const fabTask = await this.createTask(
        {
          job_order_id: input.job_order_id,
          production_job_id: input.production_job_id,
          task_name: `Fabrication: ${fabList.join(', ')}`,
          task_type: 'fabrication',
          department: 'fabrication',
          sequence_order: sequenceOrder++,
          quantity: input.quantity || 1,
          unit: input.unit || 'pcs',
          assigned_machine_id: matchedFabMachine?.id || null,
          assigned_machine_name: matchedFabMachine?.name || null,
          estimated_duration_minutes: 60,
          priority: 'normal',
          branch_id: input.branch_id,
          description: `Structural metal/acrylic fabrication: ${fabList.join(', ')}.`,
        },
        companyId
      )
      createdTasks.push(fabTask)
    }

    // Task 5: Final Quality Inspection & Packing
    const qcTask = await this.createTask(
      {
        job_order_id: input.job_order_id,
        production_job_id: input.production_job_id,
        task_name: `Quality Inspection & Packaging`,
        task_type: 'other',
        department: 'finishing',
        sequence_order: sequenceOrder++,
        quantity: input.quantity || 1,
        unit: input.unit || 'pcs',
        estimated_duration_minutes: 10,
        priority: 'normal',
        branch_id: input.branch_id,
        description: `100% defect inspection against approved proof, counting, protective bubble wrapping and labeling.`,
      },
      companyId
    )
    createdTasks.push(qcTask)

    return createdTasks
  }

  /**
   * Evaluates compatibility of all Fleet Machineries for a given Production Task.
   */
  static async getCompatibleMachinesForTask(
    taskId: string,
    companyId: string
  ): Promise<Array<{ machine: any; isCompatible: boolean; incompatibilityReasons: string[]; currentLoadMinutes: number }>> {
    const task = await this.getTaskById(taskId, companyId)
    if (!task) throw new Error('Task not found')

    const fleet = await MachineryRepository.getMachineries(companyId)
    const existingTasks = await ProductionTaskRepository.getTasks(companyId)

    return fleet.map((machine) => {
      const reasons: string[] = []

      // Status check
      if (machine.status === 'breakdown') reasons.push('Machine is currently broken down')
      if (machine.status === 'maintenance') reasons.push('Machine is under scheduled maintenance')
      if (machine.status === 'retired') reasons.push('Machine is retired from active fleet')

      // Dimension check
      if (task.width && machine.max_width && task.width > machine.max_width) {
        reasons.push(`Task width (${task.width}) exceeds max width (${machine.max_width} ${machine.dimension_unit || 'in'})`)
      }
      if (task.height && machine.max_height && task.height > machine.max_height) {
        reasons.push(`Task height (${task.height}) exceeds max height (${machine.max_height} ${machine.dimension_unit || 'in'})`)
      }

      // Department/Type match
      if (
        machine.supported_production_types &&
        machine.supported_production_types.length > 0 &&
        task.task_type &&
        !machine.supported_production_types.includes(task.task_type) &&
        !machine.supported_production_types.includes('all') &&
        machine.department !== task.department
      ) {
        reasons.push(`Machine type does not support ${task.task_type}`)
      }

      // Current scheduled load
      const machineScheduledMinutes = existingTasks
        .filter((t) => t.assigned_machine_id === machine.id && t.status !== 'completed' && t.status !== 'cancelled')
        .reduce((sum, t) => sum + (t.estimated_duration_minutes || 60), 0)

      return {
        machine,
        isCompatible: reasons.length === 0,
        incompatibilityReasons: reasons,
        currentLoadMinutes: machineScheduledMinutes,
      }
    })
  }

  /**
   * Reassigns all held or scheduled tasks from a failed machine to an eligible replacement machine.
   */
  static async reassignHeldTasks(
    param1: string,
    param2: string,
    param3: string
  ): Promise<{ reassignedCount: number; tasks: ProductionTaskRecord[] }> {
    let companyId = param1
    let sourceMachineId = param2
    let targetMachineId = param3

    // Allow (sourceMachineId, targetMachineId, companyId) or (companyId, sourceMachineId, targetMachineId)
    if (param1.startsWith('mach-') || (!param3.startsWith('mach-') && param1.startsWith('mach-'))) {
      sourceMachineId = param1
      targetMachineId = param2
      companyId = param3
    }

    const targetMachine = await MachineryRepository.getMachineryById(targetMachineId, companyId)
    if (!targetMachine) throw new Error('Target machine not found')
    if (targetMachine.status === 'breakdown' || targetMachine.status === 'retired') {
      throw new Error(`Target machine ${targetMachine.name} is not available (Status: ${targetMachine.status})`)
    }

    const tasks = await ProductionTaskRepository.getTasks(companyId, {
      assigned_machine_id: sourceMachineId,
    })

    const reassignedTasks: ProductionTaskRecord[] = []
    for (const t of tasks) {
      if (t.status === 'on_hold' || t.status === 'scheduled' || t.status === 'ready' || t.status === 'queued') {
        const updated = await ProductionTaskRepository.updateTask(t.id, companyId, {
          assigned_machine_id: targetMachine.id,
          assigned_machine_name: targetMachine.name,
          hold_reason: null,
          hold_notes: null,
          status: 'scheduled',
          notes: `${t.notes || ''} [Reassigned from broken machine to ${targetMachine.name}]`.trim(),
        })
        reassignedTasks.push(updated)
      }
    }

    return { reassignedCount: reassignedTasks.length, tasks: reassignedTasks }
  }

  /**
   * Place task on hold with prominent reason.
   */
  static async holdTask(
    input: HoldTaskInput,
    companyId: string,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    const task = await this.getTaskById(input.task_id, companyId, taskPayload)
    if (!task) throw new Error('Task not found')

    if (!this.isValidStatusTransition(task.status, 'on_hold')) {
      throw new Error(`Invalid status transition from ${task.status} to on_hold`)
    }

    return await ProductionTaskRepository.updateTaskStatus(input.task_id, companyId, 'on_hold', {
      hold_reason: input.hold_reason,
      hold_notes: input.hold_notes || null,
    })
  }

  /**
   * Resume a task from hold state.
   */
  static async resumeTask(
    taskId: string,
    companyId: string,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    const task = await this.getTaskById(taskId, companyId, taskPayload)
    if (!task) throw new Error('Task not found')

    if (task.status !== 'on_hold') {
      throw new Error(`Cannot resume task: Task is currently "${task.status}", not on hold.`)
    }

    // Determine target state based on scheduling and dependencies
    let targetStatus: ProductionTaskStatus = 'ready'
    if (task.is_blocked_by_dependency) {
      targetStatus = task.scheduled_start ? 'scheduled' : 'queued'
    } else if (task.scheduled_start) {
      targetStatus = 'scheduled'
    }

    return await ProductionTaskRepository.updateTaskStatus(taskId, companyId, targetStatus, {
      hold_reason: null,
      hold_notes: null,
    })
  }

  /**
   * Log rework: preserves original completed record and creates a new linked rework task.
   */
  static async createReworkTask(
    input: ReworkTaskInput,
    companyId: string,
    reporterName?: string,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    const parentTask = await this.getTaskById(input.parent_task_id, companyId, taskPayload)
    if (!parentTask) throw new Error('Parent task not found')

    const reworkTaskNumber = `${parentTask.task_number}-RW`

    const reworkTask = await ProductionTaskRepository.createTask({
      company_id: companyId,
      branch_id: parentTask.branch_id,
      job_order_id: parentTask.job_order_id,
      production_job_id: parentTask.production_job_id,
      task_number: reworkTaskNumber,
      task_name: `[Rework] ${parentTask.task_name}`,
      task_type: parentTask.task_type,
      department: parentTask.department,
      sequence_order: parentTask.sequence_order + 1,
      description: `Rework defect: ${input.reason}. Scrap: ${input.scrap_wastage || 'None'}. Reported by ${reporterName || 'Floor QC'}`,
      quantity: input.rework_quantity || parentTask.quantity,
      unit: parentTask.unit,
      priority: 'urgent', // Rework is always high priority
      required_machine_type: parentTask.required_machine_type,
      required_material: parentTask.required_material,
      width: parentTask.width,
      height: parentTask.height,
      estimated_duration_minutes: input.extra_estimated_minutes || parentTask.estimated_duration_minutes,
      assigned_machine_id: input.assigned_machine_id || parentTask.assigned_machine_id,
      assigned_operator_id: input.assigned_operator_id || parentTask.assigned_operator_id,
      notes: input.notes || `Rework of ${parentTask.task_number}: ${input.reason}`,
    })

    // Link rework to parent
    await ProductionTaskRepository.updateTask(reworkTask.id, companyId, {
      is_rework: true,
      rework_parent_task_id: parentTask.id,
      status: 'queued',
    })

    return reworkTask
  }

  /**
   * Machine Breakdown Impact Handler:
   * Flags all active/scheduled tasks on the broken machine as on_hold (reason: machine_breakdown).
   */
  static async handleMachineBreakdownImpact(
    machineId: string,
    breakdownCode: string,
    companyId: string
  ): Promise<number> {
    const affectedTasks = await ProductionTaskRepository.getTasks(companyId, {
      assigned_machine_id: machineId,
    })

    let count = 0
    for (const t of affectedTasks) {
      if (t.status === 'in_progress' || t.status === 'scheduled' || t.status === 'ready') {
        await ProductionTaskRepository.updateTaskStatus(t.id, companyId, 'on_hold', {
          hold_reason: 'machine_breakdown',
          hold_notes: `Blocked by breakdown ${breakdownCode}. Needs machine reassignment.`,
        })
        count++
      }
    }
    return count
  }

  /**
   * Compute Machine Queues (NOW, NEXT, LATER) and utilization metrics.
   */
  static async getMachineQueues(
    companyId: string,
    branchId?: string
  ): Promise<MachineQueueGroup[]> {
    const machines = await MachineryRepository.getMachineries(companyId, {
      branch_id: branchId || undefined,
    })

    const allTasks = await ProductionTaskRepository.getTasks(companyId, {
      branch_id: branchId || undefined,
    })

    const nowTime = new Date().getTime()
    const groups: MachineQueueGroup[] = []

    for (const machine of machines) {
      const machineTasks = allTasks
        .filter((t) => t.assigned_machine_id === machine.id && t.status !== 'cancelled' && t.status !== 'completed')
        .sort((a, b) => {
          const aTime = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0
          const bTime = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0
          return aTime - bTime
        })

      let nowItem: MachineQueueItem | null = null
      let nextItem: MachineQueueItem | null = null
      const laterItems: MachineQueueItem[] = []
      let totalMinutes = 0

      for (let i = 0; i < machineTasks.length; i++) {
        const t = machineTasks[i]
        const dur = t.estimated_duration_minutes || 60
        totalMinutes += dur

        const sStart = t.scheduled_start ? new Date(t.scheduled_start).getTime() : nowTime
        const sEnd = t.scheduled_end ? new Date(t.scheduled_end).getTime() : sStart + dur * 60 * 1000

        const isCurrent = t.status === 'in_progress' || (sStart <= nowTime && nowTime <= sEnd)

        const qItem: MachineQueueItem = {
          task_id: t.id,
          task_number: t.task_number,
          task_name: t.task_name,
          job_number: t.job_number || 'N/A',
          customer_name: t.customer_name || 'N/A',
          scheduled_start: t.scheduled_start || new Date().toISOString(),
          scheduled_end: t.scheduled_end || new Date(nowTime + dur * 60 * 1000).toISOString(),
          estimated_duration_minutes: dur,
          operator_name: t.assigned_operator_name || 'Unassigned',
          priority: t.priority,
          status: t.status,
          is_current: isCurrent,
        }

        if (isCurrent && !nowItem) {
          nowItem = qItem
        } else if (!nextItem) {
          nextItem = qItem
        } else {
          laterItems.push(qItem)
        }
      }

      // Calculate daily utilization against an 8-hour operating shift (480 minutes)
      const dailyUtilization = Math.min(100, Math.round((totalMinutes / 480) * 100))

      groups.push({
        machine_id: machine.id,
        machine_name: machine.name,
        machine_code: machine.code,
        machine_type: machine.machine_type,
        department: machine.department,
        operating_status: machine.status,
        total_scheduled_minutes_today: totalMinutes,
        daily_utilization_percent: dailyUtilization,
        now: nowItem,
        next: nextItem,
        later: laterItems,
      })
    }

    return groups
  }
}

import {
  ProductionTaskRecord,
  CreateProductionTaskInput,
  UpdateProductionTaskInput,
  ScheduleTaskInput,
  HoldTaskInput,
  ReworkTaskInput,
  ProductionTaskStatus,
  MachineQueueGroup,
  MachineQueueItem,
} from '@/types/production.types'
import { ProductionTaskRepository, TaskFilterOptions } from '@/lib/repositories/production-task.repository'
import { MachineryRepository } from '@/lib/repositories/machinery.repository'
import { MachineryService } from '@/services/machinery.service'

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
      queued: ['scheduled', 'ready', 'in_progress', 'on_hold', 'cancelled'],
      scheduled: ['ready', 'in_progress', 'on_hold', 'cancelled'],
      ready: ['in_progress', 'on_hold', 'cancelled'],
      in_progress: ['paused', 'completed', 'on_hold', 'rework', 'cancelled'],
      paused: ['in_progress', 'on_hold', 'cancelled'],
      on_hold: ['ready', 'queued', 'scheduled', 'in_progress', 'cancelled'],
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

    // Evaluate sequential dependencies
    for (const task of tasks) {
      if (task.status === 'completed' || task.status === 'cancelled') {
        task.is_blocked_by_dependency = false
        task.blocking_dependency_task_name = null
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
    }

    return tasks
  }

  static async getTaskById(id: string, companyId: string): Promise<ProductionTaskRecord | null> {
    if (!id || !companyId) return null
    const task = await ProductionTaskRepository.getTaskById(id, companyId)
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
   * Schedule a task onto a machine and operator with conflict detection.
   */
  static async scheduleTask(
    input: ScheduleTaskInput,
    companyId: string
  ): Promise<ProductionTaskRecord> {
    if (!companyId) throw new Error('Company ID is required')
    if (!input.task_id) throw new Error('Task ID is required')
    if (!input.scheduled_start) throw new Error('Scheduled start time is required')

    const task = await ProductionTaskRepository.getTaskById(input.task_id, companyId)
    if (!task) throw new Error(`Production task not found: ${input.task_id}`)

    const startDate = new Date(input.scheduled_start)
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid scheduled start timestamp')
    }

    const durationMinutes = input.estimated_duration_minutes || task.estimated_duration_minutes || 60
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

    let machineName: string | null = null

    // Machine conflict check if a machine is assigned
    if (input.assigned_machine_id) {
      const machine = await MachineryRepository.getMachineryById(input.assigned_machine_id, companyId)
      if (!machine) {
        throw new Error('Assigned machine not found')
      }
      if (machine.status === 'breakdown') {
        throw new Error(`Cannot schedule task on ${machine.name}: Machine is currently broken down.`)
      }
      if (machine.status === 'maintenance') {
        throw new Error(`Cannot schedule task on ${machine.name}: Machine is currently under maintenance.`)
      }
      if (machine.status === 'retired' || machine.status === 'offline') {
        throw new Error(`Cannot schedule task on ${machine.name}: Machine is ${machine.status}.`)
      }

      machineName = machine.name

      // Check maintenance schedule conflict
      const maintenances = await MachineryRepository.getMaintenances(machine.id, companyId)
      for (const m of maintenances) {
        if (m.status !== 'completed' && m.status !== 'cancelled' && m.scheduled_date) {
          const mDate = new Date(m.scheduled_date)
          // 4-hour maintenance block window
          const mEnd = new Date(mDate.getTime() + 4 * 60 * 60 * 1000)
          if (startDate < mEnd && endDate > mDate) {
            throw new Error(`Schedule conflict: Machine ${machine.name} has scheduled maintenance at ${mDate.toLocaleTimeString()}.`)
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

      // Sync with Machinery Assignment record
      try {
        await MachineryRepository.createAssignment({
          company_id: companyId,
          machine_id: machine.id,
          job_order_id: task.job_order_id,
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
        // Non-fatal if assignment duplicate exists
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
  }

  /**
   * Start a production task.
   */
  static async startTask(
    taskId: string,
    companyId: string,
    operatorId?: string,
    operatorName?: string,
    forceOverrideDependency: boolean = false
  ): Promise<ProductionTaskRecord> {
    const task = await this.getTaskById(taskId, companyId)
    if (!task) throw new Error('Task not found')

    if (!forceOverrideDependency && task.is_blocked_by_dependency) {
      throw new Error(
        `Cannot start task: Upstream task "${task.blocking_dependency_task_name}" must be completed first.`
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
      await MachineryRepository.updateStatus(task.assigned_machine_id, companyId, 'in_use')
    }

    return await ProductionTaskRepository.updateTaskStatus(taskId, companyId, 'in_progress', extraUpdates)
  }

  /**
   * Pause a production task.
   */
  static async pauseTask(
    taskId: string,
    reason: string,
    companyId: string
  ): Promise<ProductionTaskRecord> {
    const task = await this.getTaskById(taskId, companyId)
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
      notes?: string
    }
  ): Promise<{ completedTask: ProductionTaskRecord; nextReadyTask: ProductionTaskRecord | null }> {
    const task = await this.getTaskById(taskId, companyId)
    if (!task) throw new Error('Task not found')

    if (!this.isValidStatusTransition(task.status, 'completed')) {
      throw new Error(`Invalid status transition from ${task.status} to completed`)
    }

    const completed = await ProductionTaskRepository.updateTaskStatus(taskId, companyId, 'completed', {
      actual_end: new Date().toISOString(),
      good_quantity: completionData?.good_quantity ?? task.quantity,
      rejected_quantity: completionData?.rejected_quantity ?? 0,
      notes: completionData?.notes || task.notes,
    })

    // If machine was used, check if there are other in_progress tasks, else set back to available
    if (task.assigned_machine_id) {
      const activeOnMachine = await ProductionTaskRepository.getTasks(companyId, {
        assigned_machine_id: task.assigned_machine_id,
        status: 'in_progress',
      })
      if (activeOnMachine.length === 0) {
        await MachineryRepository.updateStatus(task.assigned_machine_id, companyId, 'available')
      }
    }

    // Automatically advance next task in sequence for this Job Order
    const nextReadyTask = await ProductionTaskRepository.advanceSequentialTask(
      task.job_order_id,
      task.sequence_order,
      companyId
    )

    return { completedTask: completed, nextReadyTask }
  }

  /**
   * Place task on hold with prominent reason.
   */
  static async holdTask(
    input: HoldTaskInput,
    companyId: string
  ): Promise<ProductionTaskRecord> {
    const task = await this.getTaskById(input.task_id, companyId)
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
  static async resumeTask(taskId: string, companyId: string): Promise<ProductionTaskRecord> {
    const task = await this.getTaskById(taskId, companyId)
    if (!task) throw new Error('Task not found')

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
    reporterName?: string
  ): Promise<ProductionTaskRecord> {
    const parentTask = await this.getTaskById(input.parent_task_id, companyId)
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

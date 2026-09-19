import { createClient } from '../supabase/server.ts'
import type {
  ProductionTaskRecord,
  CreateProductionTaskInput,
  ProductionTaskStatus,
} from '../../types/production.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export interface TaskFilterOptions {
  branch_id?: string | null
  job_order_id?: string | null
  department?: string | null
  assigned_operator_id?: string | null
  assigned_machine_id?: string | null
  status?: string | null
  search?: string | null
}

export class ProductionTaskRepository {
  static async getTasks(
    companyId: string,
    filters?: TaskFilterOptions
  ): Promise<ProductionTaskRecord[]> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (uuidRegex.test(companyId)) {
      try {
        const supabase = await createClient()
        let query = (supabase as any)
          .from('production_tasks')
          .select(`
            *,
            job_order:job_orders(
              id,
              job_number,
              customer_name,
              product_name,
              deadline
            )
          `)
          .eq('company_id', companyId)
          .order('sequence_order', { ascending: true })
          .order('created_at', { ascending: false })

        if (filters?.branch_id && uuidRegex.test(filters.branch_id)) {
          query = query.eq('branch_id', filters.branch_id)
        }
        if (filters?.job_order_id && uuidRegex.test(filters.job_order_id)) {
          query = query.eq('job_order_id', filters.job_order_id)
        }
        if (filters?.department && filters.department !== 'all') {
          query = query.eq('department', filters.department)
        }
        if (filters?.assigned_operator_id && uuidRegex.test(filters.assigned_operator_id)) {
          query = query.eq('assigned_operator_id', filters.assigned_operator_id)
        }
        if (filters?.assigned_machine_id && uuidRegex.test(filters.assigned_machine_id)) {
          query = query.eq('assigned_machine_id', filters.assigned_machine_id)
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status)
        }

      let { data, error } = await query

      if (error) {
        // Resilient fallback query without relational join
        let fallbackQuery = (supabase as any)
          .from('production_tasks')
          .select('*')
          .eq('company_id', companyId)
          .order('sequence_order', { ascending: true })
          .order('created_at', { ascending: false })

        if (filters?.branch_id) fallbackQuery = fallbackQuery.eq('branch_id', filters.branch_id)
        if (filters?.job_order_id) fallbackQuery = fallbackQuery.eq('job_order_id', filters.job_order_id)
        if (filters?.department && filters.department !== 'all') fallbackQuery = fallbackQuery.eq('department', filters.department)
        if (filters?.assigned_operator_id) fallbackQuery = fallbackQuery.eq('assigned_operator_id', filters.assigned_operator_id)
        if (filters?.assigned_machine_id) fallbackQuery = fallbackQuery.eq('assigned_machine_id', filters.assigned_machine_id)
        if (filters?.status && filters.status !== 'all') fallbackQuery = fallbackQuery.eq('status', filters.status)

        const fbRes = await fallbackQuery
        if (!fbRes.error) {
          data = fbRes.data
          error = null
        }
      }

      // Check if there are approved & invoiced design jobs in Supabase that need auto-provisioned tasks
      try {
        const { data: approvedDesignJobs } = await (supabase as any)
          .from('design_jobs')
          .select('*')
          .eq('company_id', companyId)
          .eq('status', 'approved')

        if (approvedDesignJobs && approvedDesignJobs.length > 0) {
          const currentTasks = (data || []) as any[]
          for (const dj of approvedDesignJobs) {
            const hasInvoice = Boolean(dj.invoice_id) || dj.commercial_status === 'invoice_created'
            if (!hasInvoice) continue

            const taskNum1 = `TSK-${(dj.design_number || '').replace('DSN-', '')}-1`
            const hasTask = currentTasks.some(
              (t) => (dj.job_order_id && t.job_order_id === dj.job_order_id) || t.task_number === taskNum1 || t.task_name?.includes(dj.title)
            )

            if (!hasTask) {
              const now = new Date().toISOString()
              const task1Id = crypto.randomUUID()
              const task2Id = crypto.randomUUID()

              const task1Payload: any = {
                id: task1Id,
                company_id: companyId,
                task_number: taskNum1,
                task_name: `Print: ${dj.title}`,
                task_type: 'printing',
                department: 'printing',
                sequence_order: 1,
                quantity: dj.quantity || 1,
                unit: dj.unit || 'pcs',
                priority: dj.priority || 'normal',
                status: 'queued',
                created_at: now,
                updated_at: now,
              }
              const task2Payload: any = {
                id: task2Id,
                company_id: companyId,
                task_number: `TSK-${(dj.design_number || '').replace('DSN-', '')}-2`,
                task_name: `Finishing & QC: ${dj.title}`,
                task_type: 'finishing',
                department: 'finishing',
                sequence_order: 2,
                quantity: dj.quantity || 1,
                unit: dj.unit || 'pcs',
                priority: dj.priority || 'normal',
                status: 'queued',
                created_at: now,
                updated_at: now,
              }

              await (supabase as any).from('production_tasks').insert([task1Payload, task2Payload])

              const augmentedTask1 = {
                ...task1Payload,
                customer_name: dj.customer_name,
                product_name: dj.title,
                job_number: dj.design_number,
                job_deadline: dj.deadline,
                is_blocked_by_commercial_gate: false,
                is_blocked_by_design_gate: false,
              }
              const augmentedTask2 = {
                ...task2Payload,
                customer_name: dj.customer_name,
                product_name: dj.title,
                job_number: dj.design_number,
                job_deadline: dj.deadline,
                is_blocked_by_commercial_gate: false,
                is_blocked_by_design_gate: false,
              }
              currentTasks.unshift(augmentedTask1, augmentedTask2)
            }
          }
          data = currentTasks
        }
      } catch {}

      if (!error && data && data.length > 0) {
        const rawTasks = (data || []) as any[]
        return rawTasks.map((t) => {
          const rawName = t.task_name || ''
          const inferredProduct = rawName.includes(': ') ? rawName.split(': ')[1] : rawName
          return {
            ...t,
            job_number: t.job_number || t.job_order?.job_number || (t.task_number ? `JO-${t.task_number.replace('TSK-', '').split('-')[0]}` : 'N/A'),
            customer_name: t.customer_name || t.job_order?.customer_name || 'Direct Customer',
            product_name: t.product_name || t.job_order?.product_name || inferredProduct || 'Print Job',
            job_deadline: t.job_deadline || t.job_order?.deadline || null,
            is_blocked_by_commercial_gate: t.is_blocked_by_commercial_gate,
            is_blocked_by_design_gate: t.is_blocked_by_design_gate,
          }
        }) as ProductionTaskRecord[]
      }
    } catch {}
    }

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    return all
      .filter((t: ProductionTaskRecord) => {
        if (t.company_id && t.company_id !== companyId) return false
        if (filters?.branch_id && t.branch_id !== filters.branch_id) return false
        if (filters?.job_order_id && t.job_order_id !== filters.job_order_id) return false
        if (filters?.department && filters.department !== 'all' && t.department !== filters.department) return false
        if (filters?.assigned_operator_id && t.assigned_operator_id !== filters.assigned_operator_id) return false
        if (filters?.status && filters.status !== 'all' && t.status !== filters.status) return false
        return true
      })
      .map((t) => {
        const rawName = t.task_name || ''
        const inferredProduct = rawName.includes(': ') ? rawName.split(': ')[1] : rawName
        return {
          ...t,
          job_number: t.job_number || (t.task_number ? `JO-${t.task_number.replace('TSK-', '').split('-')[0]}` : 'N/A'),
          customer_name: t.customer_name || 'Direct Customer',
          product_name: t.product_name || inferredProduct || 'Print Job',
          job_deadline: t.job_deadline || null,
          is_blocked_by_commercial_gate: t.is_blocked_by_commercial_gate ?? false,
          is_blocked_by_design_gate: t.is_blocked_by_design_gate ?? false,
        }
      })
  }

  static async getTaskById(id: string, companyId: string): Promise<ProductionTaskRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('production_tasks')
        .select(`
          *,
          job_order:job_orders(
            id,
            job_number,
            customer_name,
            product_name,
            deadline
          )
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        const rawName = data.task_name || ''
        const inferredProduct = rawName.includes(': ') ? rawName.split(': ')[1] : rawName
        return {
          ...data,
          job_number: data.job_number || data.job_order?.job_number || (data.task_number ? `JO-${data.task_number.replace('TSK-', '').split('-')[0]}` : 'N/A'),
          customer_name: data.customer_name || data.job_order?.customer_name || 'Direct Customer',
          product_name: data.product_name || data.job_order?.product_name || inferredProduct || 'Print Job',
          job_deadline: data.job_deadline || data.job_order?.deadline || null,
          is_blocked_by_commercial_gate: data.is_blocked_by_commercial_gate ?? false,
          is_blocked_by_design_gate: data.is_blocked_by_design_gate ?? false,
        } as ProductionTaskRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    return all.find((t: ProductionTaskRecord) => t.id === id && (!t.company_id || t.company_id === companyId)) || null
  }

  static async getTasksByJobOrder(
    jobOrderId: string,
    companyId: string
  ): Promise<ProductionTaskRecord[]> {
    return this.getTasks(companyId, { job_order_id: jobOrderId })
  }

  static async createTask(
    task: Partial<CreateProductionTaskInput> & {
      company_id: string
      task_name?: string
      task_number?: string
      [key: string]: any
    }
  ): Promise<ProductionTaskRecord> {
    const taskName = (task.task_name || (task as any).name || 'Production Task').trim()
    const taskNumber = (task.task_number || (task as any).job_number || `TSK-${Date.now().toString().slice(-6)}`).trim()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const resolvedId = task.id && uuidRegex.test(task.id) ? task.id : crypto.randomUUID()
    const validBranchId = task.branch_id && uuidRegex.test(task.branch_id) ? task.branch_id : null
    const validJobOrderId = task.job_order_id && uuidRegex.test(task.job_order_id) ? task.job_order_id : null
    const validProdJobId = task.production_job_id && uuidRegex.test(task.production_job_id) ? task.production_job_id : null
    const validMachineId = task.assigned_machine_id && uuidRegex.test(task.assigned_machine_id) ? task.assigned_machine_id : null
    const validOperatorId = task.assigned_operator_id && uuidRegex.test(task.assigned_operator_id) ? task.assigned_operator_id : null

    const payload: any = {
      id: task.id || resolvedId,
      company_id: task.company_id,
      branch_id: task.branch_id || null,
      job_order_id: task.job_order_id || null,
      production_job_id: task.production_job_id || null,
      task_number: taskNumber,
      task_name: taskName,
      task_type: task.task_type || 'printing',
      department: task.department || 'printing',
      sequence_order: task.sequence_order ?? 1,
      description: task.description || null,
      quantity: task.quantity || 1,
      unit: task.unit || 'pcs',
      priority: task.priority || 'normal',
      required_machine_type: task.required_machine_type || null,
      required_material: task.required_material || null,
      width: task.width || null,
      height: task.height || null,
      estimated_duration_minutes: task.estimated_duration_minutes || 60,
      assigned_machine_id: task.assigned_machine_id || null,
      assigned_operator_id: task.assigned_operator_id || null,
      scheduled_start: task.scheduled_start || null,
      scheduled_end: task.scheduled_end || null,
      status: task.status || (task.scheduled_start ? 'scheduled' : 'queued'),
      notes: task.notes || null,
      is_blocked_by_commercial_gate: task.is_blocked_by_commercial_gate ?? false,
      is_blocked_by_design_gate: task.is_blocked_by_design_gate ?? false,
      commercial_gate_status: (task as any).commercial_gate_status || 'ready_for_production',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const dbPayload = {
        ...payload,
        id: resolvedId,
        branch_id: validBranchId,
        job_order_id: validJobOrderId,
        production_job_id: validProdJobId,
        assigned_machine_id: validMachineId,
        assigned_operator_id: validOperatorId,
      }
      const { data, error } = await (supabase as any)
        .from('production_tasks')
        .insert(dbPayload)
        .select()
        .single()

      if (!error && data) {
        return data as ProductionTaskRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    all.push(payload)
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, all)
    return payload as ProductionTaskRecord
  }

  static async updateTask(
    param1: string,
    param2: Partial<ProductionTaskRecord> | string,
    param3?: Partial<ProductionTaskRecord> | string
  ): Promise<ProductionTaskRecord> {
    let id = param1
    let companyId = ''
    let updates: Partial<ProductionTaskRecord> = {}

    if (typeof param2 === 'string') {
      id = param1
      companyId = param2
      updates = (typeof param3 === 'object' ? param3 : {}) as Partial<ProductionTaskRecord>
    } else {
      id = param1
      updates = (typeof param2 === 'object' ? param2 : {}) as Partial<ProductionTaskRecord>
      companyId = typeof param3 === 'string' ? param3 : ''
    }

    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      let query = (supabase as any).from('production_tasks').update(payload).eq('id', id)
      if (companyId) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query.select().single()

      if (!error && data) {
        return data as ProductionTaskRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const idx = all.findIndex((t: ProductionTaskRecord) => (t.id === id || t.id === param1 || t.id === param2) && (!companyId || t.company_id === companyId))
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...payload }
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, all)
      return all[idx]
    }
    throw new Error(`Task ${id} not found to update.`)
  }

  static async updateTaskStatus(
    id: string,
    companyId: string,
    status: ProductionTaskStatus,
    extraUpdates?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    const payload: any = {
      status,
      ...extraUpdates,
      updated_at: new Date().toISOString(),
    }

    if (status === 'in_progress' && !payload.actual_start) {
      payload.actual_start = new Date().toISOString()
    }
    if (status === 'completed' && !payload.actual_end) {
      payload.actual_end = new Date().toISOString()
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('production_tasks')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        return data as ProductionTaskRecord
      }
    } catch {}

    return this.updateTask(id, companyId, payload)
  }

  static async advanceSequentialTask(
    jobOrderId: string,
    completedSequence: number,
    companyId: string
  ): Promise<ProductionTaskRecord | null> {
    try {
      const supabase = await createClient()

      // Find the next task in order for this job order
      const { data: nextTasks, error } = await (supabase as any)
        .from('production_tasks')
        .select('*')
        .eq('company_id', companyId)
        .eq('job_order_id', jobOrderId)
        .gt('sequence_order', completedSequence)
        .order('sequence_order', { ascending: true })
        .limit(1)

      if (!error && nextTasks && nextTasks.length > 0) {
        const nextTask = nextTasks[0]
        if (nextTask.status === 'queued' || nextTask.status === 'scheduled') {
          const { data: updated, error: updateErr } = await (supabase as any)
            .from('production_tasks')
            .update({
              status: 'ready',
              updated_at: new Date().toISOString(),
            })
            .eq('id', nextTask.id)
            .eq('company_id', companyId)
            .select()
            .single()

          if (!updateErr && updated) {
            return updated as ProductionTaskRecord
          }
        }
        return nextTask as ProductionTaskRecord
      }
    } catch {}

    // Local datastore fallback
    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const matchingTasks = all
      .filter((t: ProductionTaskRecord) => t.job_order_id === jobOrderId && (!companyId || t.company_id === companyId) && (t.sequence_order ?? 0) > completedSequence)
      .sort((a: ProductionTaskRecord, b: ProductionTaskRecord) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))

    if (matchingTasks.length === 0) {
      return null
    }

    const nextTask = matchingTasks[0]
    if (nextTask.status === 'queued' || nextTask.status === 'scheduled') {
      nextTask.status = 'ready'
      nextTask.updated_at = new Date().toISOString()
      const idx = all.findIndex((t: ProductionTaskRecord) => t.id === nextTask.id)
      if (idx >= 0) {
        all[idx] = nextTask
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, all)
      }
    }
    return nextTask
  }

  static async deleteTask(id: string, companyId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('production_tasks')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

      if (!error) {
        PrintERPDataStore.removeItem(STORAGE_KEYS.PRODUCTION_TASKS, id)
        return true
      }
    } catch {}

    return PrintERPDataStore.removeItem(STORAGE_KEYS.PRODUCTION_TASKS, id)
  }

  // Compatibility aliases
  static async getProductionTasks(companyId: string, filters?: TaskFilterOptions): Promise<ProductionTaskRecord[]> {
    try {
      const tasks = await this.getTasks(companyId, filters)
      if (tasks && tasks.length > 0) return tasks
    } catch {}

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    return all.filter((t) => {
      if (t.company_id && t.company_id !== companyId) return false
      if (filters?.status && filters.status !== 'all' && t.status !== filters.status) return false
      if (filters?.assigned_operator_id && t.assigned_operator_id !== filters.assigned_operator_id) return false
      return true
    })
  }

  static async getProductionTaskById(id: string, companyId: string): Promise<ProductionTaskRecord | null> {
    try {
      const task = await this.getTaskById(id, companyId)
      if (task) return task
    } catch {}

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    return all.find((t) => t.id === id && (!t.company_id || t.company_id === companyId)) || null
  }

  static async createProductionTask(task: any): Promise<ProductionTaskRecord> {
    try {
      const created = await this.createTask(task)
      if (created) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, created)
        return created
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, task)
    return task as ProductionTaskRecord
  }

  static async updateProductionTask(id: string, companyId: string, updates: Partial<ProductionTaskRecord>): Promise<ProductionTaskRecord> {
    try {
      const updated = await this.updateTask(id, companyId, updates)
      if (updated) {
        PrintERPDataStore.updateItem<ProductionTaskRecord>(STORAGE_KEYS.PRODUCTION_TASKS, id, updated)
        return updated
      }
    } catch {}

    const updated = PrintERPDataStore.updateItem<ProductionTaskRecord>(STORAGE_KEYS.PRODUCTION_TASKS, id, updates)
    if (updated) return updated
    return { id, company_id: companyId, ...updates } as ProductionTaskRecord
  }
}


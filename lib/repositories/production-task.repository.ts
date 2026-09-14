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

      if (filters?.branch_id) {
        query = query.eq('branch_id', filters.branch_id)
      }
      if (filters?.job_order_id) {
        query = query.eq('job_order_id', filters.job_order_id)
      }
      if (filters?.department && filters.department !== 'all') {
        query = query.eq('department', filters.department)
      }
      if (filters?.assigned_operator_id) {
        query = query.eq('assigned_operator_id', filters.assigned_operator_id)
      }
      if (filters?.assigned_machine_id) {
        query = query.eq('assigned_machine_id', filters.assigned_machine_id)
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (!error && data) {
        const rawTasks = (data || []) as any[]
        return rawTasks.map((t) => ({
          ...t,
          job_number: t.job_order?.job_number || 'N/A',
          customer_name: t.job_order?.customer_name || 'N/A',
          product_name: t.job_order?.product_name || 'N/A',
          job_deadline: t.job_order?.deadline || null,
        })) as ProductionTaskRecord[]
      }
    } catch {}

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    return all.filter((t: ProductionTaskRecord) => {
      if (t.company_id && t.company_id !== companyId) return false
      if (filters?.branch_id && t.branch_id !== filters.branch_id) return false
      if (filters?.job_order_id && t.job_order_id !== filters.job_order_id) return false
      if (filters?.department && filters.department !== 'all' && t.department !== filters.department) return false
      if (filters?.assigned_operator_id && t.assigned_operator_id !== filters.assigned_operator_id) return false
      if (filters?.status && filters.status !== 'all' && t.status !== filters.status) return false
      return true
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
        return {
          ...data,
          job_number: data.job_order?.job_number || 'N/A',
          customer_name: data.job_order?.customer_name || 'N/A',
          product_name: data.job_order?.product_name || 'N/A',
          job_deadline: data.job_order?.deadline || null,
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
    const payload: any = {
      id: task.id || `ptask-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('production_tasks')
        .insert(payload)
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
      companyId = param1
      id = param2
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

    if (error || !nextTasks || nextTasks.length === 0) {
      return null
    }

    const nextTask = nextTasks[0]
    // If the next task is in 'queued' or 'scheduled' state, update it to 'ready'
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


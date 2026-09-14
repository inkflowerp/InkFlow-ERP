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

    if (error) {
      throw new Error(`Failed to fetch production tasks: ${error.message}`)
    }

    const rawTasks = (data || []) as any[]

    // Hydrate joined job_order fields
    return rawTasks.map((t) => ({
      ...t,
      job_number: t.job_order?.job_number || 'N/A',
      customer_name: t.job_order?.customer_name || 'N/A',
      product_name: t.job_order?.product_name || 'N/A',
      job_deadline: t.job_order?.deadline || null,
    })) as ProductionTaskRecord[]
  }

  static async getTaskById(id: string, companyId: string): Promise<ProductionTaskRecord | null> {
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

    if (error) {
      throw new Error(`Failed to fetch production task ${id}: ${error.message}`)
    }

    if (!data) return null

    return {
      ...data,
      job_number: data.job_order?.job_number || 'N/A',
      customer_name: data.job_order?.customer_name || 'N/A',
      product_name: data.job_order?.product_name || 'N/A',
      job_deadline: data.job_order?.deadline || null,
    } as ProductionTaskRecord
  }

  static async getTasksByJobOrder(
    jobOrderId: string,
    companyId: string
  ): Promise<ProductionTaskRecord[]> {
    return this.getTasks(companyId, { job_order_id: jobOrderId })
  }

  static async createTask(
    task: CreateProductionTaskInput & {
      company_id: string
      task_number: string
    }
  ): Promise<ProductionTaskRecord> {
    const supabase = await createClient()
    const payload = {
      company_id: task.company_id,
      branch_id: task.branch_id || null,
      job_order_id: task.job_order_id,
      production_job_id: task.production_job_id || null,
      task_number: task.task_number.trim(),
      task_name: task.task_name.trim(),
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
      status: task.scheduled_start ? 'scheduled' : 'queued',
      notes: task.notes || null,
    }

    const { data, error } = await (supabase as any)
      .from('production_tasks')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create production task: ${error.message}`)
    }

    return data as ProductionTaskRecord
  }

  static async updateTask(
    id: string,
    companyId: string,
    updates: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    const supabase = await createClient()
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (supabase as any)
      .from('production_tasks')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update production task ${id}: ${error.message}`)
    }

    return data as ProductionTaskRecord
  }

  static async updateTaskStatus(
    id: string,
    companyId: string,
    status: ProductionTaskStatus,
    extraUpdates?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord> {
    const supabase = await createClient()
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

    const { data, error } = await (supabase as any)
      .from('production_tasks')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update task status: ${error.message}`)
    }

    return data as ProductionTaskRecord
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


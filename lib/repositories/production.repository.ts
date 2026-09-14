import { createClient } from '../supabase/server.ts'
import type { ProductionJobRecord, ProductionReworkRecord } from '../../types/production.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class ProductionRepository {
  static async getProductionJobs(companyId: string): Promise<ProductionJobRecord[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('production_jobs')
        .select('*, reworks:production_reworks(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch production jobs: ${error.message}`)
      }
      return (data || []) as unknown as ProductionJobRecord[]
    } catch (err: any) {
      const all = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
      return all.filter((p: ProductionJobRecord) => p.company_id === companyId)
    }
  }

  static async getProductionJobById(id: string, companyId: string): Promise<ProductionJobRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('production_jobs')
        .select('*, reworks:production_reworks(*)')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch production job ${id}: ${error.message}`)
      }
      return (data as unknown as ProductionJobRecord) || null
    } catch (err: any) {
      const all = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
      return all.find((p: ProductionJobRecord) => p.id === id && p.company_id === companyId) || null
    }
  }

  static async createProductionJob(job: {
    company_id: string
    title?: string
    customer_name: string
    quantity: number
    [key: string]: any
  }): Promise<ProductionJobRecord> {
    const title = (job.title || job.product_name || job.production_job_number || 'Production Job').trim()
    const payload: any = {
      id: job.id || `pjob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: job.company_id,
      job_order_id: job.job_order_id || null,
      order_id: job.order_id || null,
      title,
      customer_name: job.customer_name,
      department: job.department || 'digital_large_format',
      stage: job.stage || 'printing',
      status: job.status || 'queued',
      priority: job.priority || 'medium',
      deadline: job.deadline || null,
      dimensions_spec: job.dimensions_spec || null,
      material_spec: job.material_spec || null,
      assigned_operator_id: job.assigned_operator_id || null,
      assigned_operator_name: job.assigned_operator_name || null,
      assigned_machine_id: job.assigned_machine_id || null,
      assigned_machine_name: job.assigned_machine_name || null,
      quantity: job.quantity,
      completed_quantity: job.completed_quantity || 0,
      waste_quantity: job.waste_quantity || 0,
      target_delivery: job.target_delivery || null,
      notes: job.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('production_jobs')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        return data as unknown as ProductionJobRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
    all.push(payload)
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, all)
    return payload as unknown as ProductionJobRecord
  }

  static async updateProductionJob(
    id: string,
    updates: Partial<ProductionJobRecord>,
    companyId?: string
  ): Promise<ProductionJobRecord | null> {
    const payload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      let query = (supabase as any).from('production_jobs').update(payload).eq('id', id)
      if (companyId) query = query.eq('company_id', companyId)
      const { data, error } = await query.select().single()

      if (!error && data) {
        return data as unknown as ProductionJobRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
    const idx = all.findIndex((p: ProductionJobRecord) => p.id === id && (!companyId || p.company_id === companyId))
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...payload }
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, all)
      return all[idx]
    }
    return null
  }

  static async updateJobStatus(id: string, status: 'queued' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled', companyId: string, extraUpdates?: Partial<ProductionJobRecord>): Promise<ProductionJobRecord> {
    const payload: any = {
      status,
      ...extraUpdates,
      updated_at: new Date().toISOString(),
    }
    if (status === 'in_progress' && !payload.started_at) {
      payload.started_at = new Date().toISOString()
    }
    if (status === 'completed' && !payload.completed_at) {
      payload.completed_at = new Date().toISOString()
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('production_jobs')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        return data as unknown as ProductionJobRecord
      }
    } catch {}

    const res = await this.updateProductionJob(id, payload, companyId)
    if (res) return res
    throw new Error(`Production job ${id} not found to update status.`)
  }

  static async recordRework(rework: {
    company_id: string
    production_job_id: string
    reason: string
    rework_quantity: number
    estimated_cost?: number
    reported_by_name: string
  }): Promise<ProductionReworkRecord> {
    const payload: any = {
      id: `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: rework.company_id,
      production_job_id: rework.production_job_id,
      reason: rework.reason,
      rework_quantity: rework.rework_quantity,
      estimated_cost: rework.estimated_cost || 0,
      reported_by_name: rework.reported_by_name,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('production_reworks')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        return data as unknown as ProductionReworkRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<ProductionReworkRecord[]>(STORAGE_KEYS.REWORKS) || []
    all.push(payload)
    PrintERPDataStore.set(STORAGE_KEYS.REWORKS, all)
    return payload as unknown as ProductionReworkRecord
  }
}

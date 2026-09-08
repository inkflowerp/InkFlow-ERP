import { createClient } from '@/lib/supabase/server'
import { ProductionJobRecord, ProductionReworkRecord } from '@/types/production.types'

export class ProductionRepository {
  static async getProductionJobs(companyId: string): Promise<ProductionJobRecord[]> {
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
  }

  static async getProductionJobById(id: string, companyId: string): Promise<ProductionJobRecord | null> {
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
  }

  static async createProductionJob(job: {
    company_id: string
    title: string
    customer_name: string
    quantity: number
    [key: string]: any
  }): Promise<ProductionJobRecord> {
    const supabase = await createClient()
    const payload: any = {
      company_id: job.company_id,
      job_order_id: job.job_order_id || null,
      order_id: job.order_id || null,
      title: job.title.trim(),
      customer_name: job.customer_name,
      department: job.department || 'digital_large_format',
      stage: job.stage || 'rip_prepress',
      status: job.status || 'queued',
      assigned_operator_id: job.assigned_operator_id || null,
      assigned_operator_name: job.assigned_operator_name || null,
      assigned_machine_id: job.assigned_machine_id || null,
      assigned_machine_name: job.assigned_machine_name || null,
      quantity: job.quantity,
      completed_quantity: job.completed_quantity || 0,
      waste_quantity: job.waste_quantity || 0,
      priority: job.priority || 'medium',
      target_delivery: job.target_delivery || null,
      notes: job.notes || null,
    }

    if (job.id) {
      payload.id = job.id
    }

    const { data, error } = await (supabase as any)
      .from('production_jobs')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create production job: ${error.message}`)
    }
    return data as unknown as ProductionJobRecord
  }

  static async updateJobStatus(id: string, status: 'queued' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled', companyId: string, extraUpdates?: Partial<ProductionJobRecord>): Promise<ProductionJobRecord> {
    const supabase = await createClient()
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

    const { data, error } = await (supabase as any)
      .from('production_jobs')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update production job status: ${error.message}`)
    }
    return data as unknown as ProductionJobRecord
  }

  static async recordRework(rework: {
    company_id: string
    production_job_id: string
    reason: string
    rework_quantity: number
    estimated_cost?: number
    reported_by_name: string
  }): Promise<ProductionReworkRecord> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('production_reworks')
      .insert({
        company_id: rework.company_id,
        production_job_id: rework.production_job_id,
        reason: rework.reason,
        rework_quantity: rework.rework_quantity,
        estimated_cost: rework.estimated_cost || 0,
        reported_by_name: rework.reported_by_name,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to record rework: ${error.message}`)
    }
    return data as unknown as ProductionReworkRecord
  }
}

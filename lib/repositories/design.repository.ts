import { createClient } from '@/lib/supabase/server'
import { DesignJobRecord, DesignVersionRecord } from '@/types/design.types'

export class DesignRepository {
  static async getDesignJobs(companyId: string): Promise<DesignJobRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('design_jobs')
      .select('*, versions:design_versions(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch design jobs: ${error.message}`)
    }
    return (data || []) as unknown as DesignJobRecord[]
  }

  static async getDesignJobById(id: string, companyId: string): Promise<DesignJobRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('design_jobs')
      .select('*, versions:design_versions(*)')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch design job ${id}: ${error.message}`)
    }
    return (data as unknown as DesignJobRecord) || null
  }

  static async createDesignJob(job: Partial<DesignJobRecord> & {
    company_id: string
    title: string
    customer_id?: string | null
    customer_name: string
  }): Promise<DesignJobRecord> {
    const supabase = await createClient()
    const payload: any = {
      company_id: job.company_id,
      title: job.title.trim(),
      customer_id: job.customer_id || null,
      customer_name: job.customer_name,
      sales_order_id: job.sales_order_id || null,
      job_order_id: job.job_order_id || null,
      status: job.status || 'received',
      priority: job.priority || 'normal',
      designer_id: job.designer_id || null,
      designer_name: job.designer_name || 'Design Department',
      instructions: job.instructions || null,
      deadline: job.deadline || new Date().toISOString().split('T')[0],
      current_version: job.current_version || 1,
      revision_count: job.revision_count || 0,
      is_locked: Boolean(job.is_locked),
    }

    if (job.id) {
      payload.id = job.id
    }

    const { data, error } = await (supabase as any)
      .from('design_jobs')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create design job: ${error.message}`)
    }
    return data as unknown as DesignJobRecord
  }

  static async addDesignVersion(version: {
    company_id: string
    design_job_id: string
    version_number: number
    file_name: string
    file_url: string
    file_type?: string | null
    file_size_bytes?: number | null
    preview_url?: string | null
    notes?: string | null
    created_by_name: string
  }): Promise<DesignVersionRecord> {
    const supabase = await createClient()
    const { data: ver, error: verErr } = await (supabase as any)
      .from('design_versions')
      .insert({
        company_id: version.company_id,
        design_job_id: version.design_job_id,
        version_number: version.version_number,
        file_name: version.file_name,
        file_url: version.file_url,
        file_type: version.file_type || null,
        file_size_bytes: version.file_size_bytes || null,
        preview_url: version.preview_url || null,
        notes: version.notes || null,
        approval_status: 'pending_review',
        created_by_name: version.created_by_name,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (verErr) {
      throw new Error(`Failed to create design version: ${verErr.message}`)
    }

    // Update parent design job current version & count
    await (supabase as any)
      .from('design_jobs')
      .update({
        current_version: `V${version.version_number}`,
        version_count: version.version_number,
        status: 'designing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', version.design_job_id)
      .eq('company_id', version.company_id)

    return ver as unknown as DesignVersionRecord
  }

  static async updateVersionApproval(params: {
    company_id: string
    version_id: string
    approval_status: 'approved' | 'rejected' | 'changes_requested'
    customer_feedback?: string | null
    design_job_id: string
  }): Promise<void> {
    const supabase = await createClient()
    await (supabase as any)
      .from('design_versions')
      .update({
        approval_status: params.approval_status,
        customer_feedback: params.customer_feedback || null,
        approved_at: params.approval_status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', params.version_id)
      .eq('company_id', params.company_id)

    const nextJobStatus =
      params.approval_status === 'approved'
        ? 'approved'
        : params.approval_status === 'changes_requested'
        ? 'revision'
        : 'rejected'

    await (supabase as any)
      .from('design_jobs')
      .update({
        status: nextJobStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.design_job_id)
      .eq('company_id', params.company_id)
  }
}

import { createClient } from '../supabase/server.ts'
import type { DesignJobRecord, DesignVersionRecord } from '../../types/design.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class DesignRepository {
  static async getDesignJobs(companyId: string): Promise<DesignJobRecord[]> {
    try {
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
    } catch (err: any) {
      const all = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
      return all.filter((d: DesignJobRecord) => d.company_id === companyId)
    }
  }

  static async getDesignJobById(id: string, companyId: string): Promise<DesignJobRecord | null> {
    try {
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
    } catch (err: any) {
      const all = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
      return all.find((d: DesignJobRecord) => d.id === id && d.company_id === companyId) || null
    }
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
    const now = new Date().toISOString()
    try {
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
          created_at: now,
        })
        .select()
        .single()

      if (!verErr && ver) {
        // Update parent design job current version & count
        await (supabase as any)
          .from('design_jobs')
          .update({
            current_version: `V${version.version_number}`,
            version_count: version.version_number,
            status: 'designing',
            updated_at: now,
          })
          .eq('id', version.design_job_id)
          .eq('company_id', version.company_id)

        return ver as unknown as DesignVersionRecord
      }
    } catch {
      // Local fallback
    }

    const newVer: DesignVersionRecord = {
      id: `ver-${Date.now()}-${version.version_number}`,
      company_id: version.company_id,
      design_job_id: version.design_job_id,
      version_number: version.version_number,
      file_name: version.file_name,
      file_url: version.file_url,
      file_type: version.file_type || 'pdf',
      file_size_bytes: version.file_size_bytes || 1024000,
      preview_url: version.preview_url || null,
      notes: version.notes || null,
      approval_status: 'pending_review',
      created_by_name: version.created_by_name,
      created_at: now,
    }

    const all = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const job = all.find((d) => d.id === version.design_job_id && d.company_id === version.company_id)
    if (job) {
      if (!job.versions) job.versions = []
      job.versions.push(newVer)
      job.current_version = `V${version.version_number}` as any
      job.version_count = version.version_number
      job.updated_at = now
      PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, all)
    }

    return newVer
  }

  static async updateVersionApproval(params: {
    company_id: string
    version_id: string
    approval_status: 'approved' | 'rejected' | 'changes_requested' | 'revision_requested'
    customer_feedback?: string | null
    design_job_id: string
  }): Promise<void> {
    const nextJobStatus =
      params.approval_status === 'approved'
        ? 'approved'
        : params.approval_status === 'changes_requested' || params.approval_status === 'revision_requested'
        ? 'in_progress'
        : 'rejected'

    try {
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

      await (supabase as any)
        .from('design_jobs')
        .update({
          status: nextJobStatus,
          is_locked: params.approval_status === 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.design_job_id)
        .eq('company_id', params.company_id)
    } catch {
      // Local fallback
    }

    const all = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const job = all.find((d) => d.id === params.design_job_id && d.company_id === params.company_id)
    if (job) {
      job.status = nextJobStatus as any
      job.is_locked = params.approval_status === 'approved'
      job.updated_at = new Date().toISOString()
      if (job.versions) {
        const v = job.versions.find((ver) => ver.id === params.version_id)
        if (v) {
          v.approval_status = params.approval_status
          v.is_approved = params.approval_status === 'approved'
          v.customer_feedback = params.customer_feedback || v.customer_feedback
          v.change_notes = params.customer_feedback || v.change_notes
        }
      }
      PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, all)

      if (params.approval_status === 'approved') {
        const salesOrderId = job.sales_order_id || job.order_id
        const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
        let updatedAny = false
        for (const jo of jobOrders) {
          if (
            jo.company_id === params.company_id &&
            ((salesOrderId && jo.order_id === salesOrderId) || jo.id === job.job_order_id || jo.design_job_id === job.id)
          ) {
            jo.artwork_status = 'approved'
            updatedAny = true
          }
        }
        if (updatedAny) {
          PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, jobOrders)
        }
      }
    }
  }

  static async markDesignReady(
    id: string,
    companyId: string,
    notes?: string
  ): Promise<DesignJobRecord | null> {
    const job = await this.getDesignJobById(id, companyId)
    if (!job) return null

    // Determine invoice status
    const hasInvoice = Boolean(job.invoice_id)
    const nextCommercialStatus = hasInvoice ? 'invoice_created' : (job.commercial_status || 'invoice_required')
    const nextStatus = 'customer_approval'

    const now = new Date().toISOString()

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('design_jobs')
        .update({
          status: nextStatus,
          commercial_status: nextCommercialStatus,
          instructions: notes ? `${job.instructions || ''}\n[Design Ready Note]: ${notes}`.trim() : job.instructions,
          updated_at: now,
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select('*, versions:design_versions(*)')
        .single()

      if (!error && data) {
        return data as unknown as DesignJobRecord
      }
    } catch {
      // Fallback
    }

    const all = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const idx = all.findIndex((d) => d.id === id && d.company_id === companyId)
    if (idx >= 0) {
      all[idx].status = nextStatus as any
      all[idx].commercial_status = nextCommercialStatus as any
      all[idx].updated_at = now
      PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, all)
      return all[idx]
    }
    return null
  }

  static async updateDesignJob(
    id: string,
    companyId: string,
    updates: Partial<DesignJobRecord>
  ): Promise<DesignJobRecord | null> {
    const now = new Date().toISOString()
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('design_jobs')
        .update({
          ...updates,
          updated_at: now,
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select('*, versions:design_versions(*)')
        .single()

      if (!error && data) {
        return data as unknown as DesignJobRecord
      }
    } catch {
      // Fallback
    }

    const all = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const idx = all.findIndex((d) => d.id === id && d.company_id === companyId)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates, updated_at: now }
      PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, all)
      return all[idx]
    }
    return null
  }
}


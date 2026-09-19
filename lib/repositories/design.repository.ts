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
    const now = new Date().toISOString()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const dsnId = job.id && uuidRegex.test(job.id) ? job.id : crypto.randomUUID()
    const dsnNum = job.design_number || `DSN-${Date.now().toString().slice(-6)}`
    const dbCustomerId = job.customer_id && uuidRegex.test(job.customer_id) ? job.customer_id : null
    const dbSalesOrderId = job.sales_order_id && uuidRegex.test(job.sales_order_id) ? job.sales_order_id : null
    const dbJobOrderId = job.job_order_id && uuidRegex.test(job.job_order_id) ? job.job_order_id : null

    const payload: any = {
      id: job.id || dsnId,
      company_id: job.company_id,
      title: job.title.trim(),
      customer_id: job.customer_id || null,
      customer_name: job.customer_name,
      sales_order_id: job.sales_order_id || null,
      job_order_id: job.job_order_id || null,
      invoice_id: job.invoice_id || null,
      invoice_number: job.invoice_number || null,
      invoice_item_id: job.invoice_item_id || null,
      work_order_id: job.work_order_id || null,
      design_number: dsnNum,
      design_type: (job as any).design_type || 'standard',
      status: job.status || 'received',
      priority: job.priority || 'normal',
      intake_source: job.intake_source || 'direct_customer',
      customer_approval_required: job.customer_approval_required !== false,
      commercial_status: job.commercial_status || (job.invoice_id ? 'invoice_created' : 'invoice_required'),
      workflow_routing: job.workflow_routing || 'design_required',
      product_name: job.product_name || null,
      dimensions_spec: job.dimensions_spec || null,
      material: job.material || null,
      finishing: job.finishing || null,
      quantity: job.quantity || 1,
      unit: job.unit || 'pcs',
      items_summary: job.items_summary || null,
      designer_id: job.designer_id || null,
      designer_name: job.designer_name || 'Design Department',
      instructions: job.instructions || null,
      deadline: job.deadline || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      current_version: job.current_version || 1,
      revision_count: job.revision_count || 0,
      is_locked: Boolean(job.is_locked),
      created_at: now,
      updated_at: now,
    }

    try {
      const supabase = await createClient()
      const dbPayload = {
        ...payload,
        id: dsnId,
        customer_id: dbCustomerId,
        sales_order_id: dbSalesOrderId,
        job_order_id: dbJobOrderId,
      }
      const { data, error } = await (supabase as any)
        .from('design_jobs')
        .insert(dbPayload)
        .select()
        .single()

      if (!error && data) {
        return data as unknown as DesignJobRecord
      }
    } catch {
      // Local fallback for test or offline environments
    }

    const localJob: DesignJobRecord = {
      ...payload,
      versions: [
        {
          id: `dv-${Date.now()}-1`,
          design_job_id: dsnId,
          version_number: 1,
          version_label: 'Version 1 (Initial Draft)',
          proof_file_name: 'initial_draft.pdf',
          proof_file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
          file_format: 'ai',
          change_notes: 'Initial work order creation and brief.',
          uploaded_by_name: job.designer_name || 'Designer',
          is_approved: false,
          created_at: now,
        },
      ],
    }

    const all = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    all.unshift(localJob)
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, all)

    return localJob
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

  static async sendToPrintOperator(
    id: string,
    companyId: string,
    actorName: string = 'Designer'
  ): Promise<{ success: boolean; error?: string; designJob?: DesignJobRecord }> {
    const job = await this.getDesignJobById(id, companyId)
    if (!job) {
      return { success: false, error: 'Design job not found.' }
    }

    // 1. Check Commercial Gate: Invoice MUST exist
    const hasInvoice = Boolean(job.invoice_id) || job.commercial_status === 'invoice_created'
    if (!hasInvoice) {
      return {
        success: false,
        error: 'Commercial Gate Blocked: Cannot send to Print Operator until official invoice is created.',
      }
    }

    // 2. Check Design Approval Gate
    const isApprovalRequired = job.customer_approval_required !== false
    const isApproved =
      job.status === 'approved' ||
      job.is_locked ||
      (job.versions && job.versions.some((v) => v.is_approved)) ||
      !isApprovalRequired
    if (!isApproved) {
      return {
        success: false,
        error: 'Design Gate Blocked: Customer approval is required before sending to print operator.',
      }
    }

    // 3. Update Design Job status to approved / ready_production
    const now = new Date().toISOString()
    const updatedJob = await this.updateDesignJob(id, companyId, {
      status: 'approved',
      workflow_routing: 'ready_production',
      is_locked: true,
      updated_at: now,
    })

    // 4. Update / Create Job Order in Production Queue
    const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
    let matchedOrder = jobOrders.find(
      (jo) =>
        jo.company_id === companyId &&
        (jo.design_job_id === id || (job.sales_order_id && jo.order_id === job.sales_order_id) || jo.id === job.job_order_id)
    )

    if (matchedOrder) {
      matchedOrder.status = 'queued'
      matchedOrder.artwork_status = 'approved'
      matchedOrder.commercial_status = 'invoice_created'
      matchedOrder.production_gate_status = 'ready_for_production'
      matchedOrder.updated_at = now
    } else {
      matchedOrder = {
        id: `jo-${Date.now()}`,
        company_id: companyId,
        order_id: job.sales_order_id || null,
        design_job_id: job.id,
        job_number: `JO-${job.design_number.replace('DSN-', '')}`,
        customer_id: job.customer_id,
        customer_name: job.customer_name,
        title: job.title,
        status: 'queued',
        artwork_status: 'approved',
        commercial_status: 'invoice_created',
        production_gate_status: 'ready_for_production',
        priority: job.priority || 'normal',
        due_date: job.deadline,
        created_at: now,
        updated_at: now,
      }
      jobOrders.unshift(matchedOrder)
    }
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, jobOrders)

    // 5. Update Production Jobs
    const prodJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
    let matchedProdJob = prodJobs.find(
      (pj) =>
        pj.company_id === companyId &&
        (pj.job_order_id === matchedOrder.id || (job.sales_order_id && pj.sales_order_id === job.sales_order_id))
    )
    if (matchedProdJob) {
      matchedProdJob.commercial_gate_status = 'ready_for_production'
      matchedProdJob.is_blocked_by_commercial_gate = false
      matchedProdJob.is_blocked_by_design_gate = false
      matchedProdJob.status = 'queued'
      matchedProdJob.updated_at = now
    } else {
      matchedProdJob = {
        id: `pj-${Date.now()}`,
        company_id: companyId,
        job_order_id: matchedOrder.id,
        sales_order_id: job.sales_order_id || null,
        customer_name: job.customer_name,
        product_name: job.title,
        dimensions_spec: job.dimensions_spec,
        quantity: job.quantity || 1,
        status: 'queued',
        commercial_gate_status: 'ready_for_production',
        is_blocked_by_commercial_gate: false,
        is_blocked_by_design_gate: false,
        created_at: now,
        updated_at: now,
      }
      prodJobs.unshift(matchedProdJob)
    }
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, prodJobs)

    // 6. Create Production Tasks for the Production Board
    const prodTasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const hasExistingTasks = prodTasks.some((t) => t.job_order_id === matchedOrder.id)
    if (!hasExistingTasks) {
      const task1 = {
        id: crypto.randomUUID(),
        company_id: companyId,
        job_order_id: matchedOrder.id,
        production_job_id: matchedProdJob.id,
        task_number: `TSK-${matchedOrder.job_number.replace('JO-', '')}-1`,
        task_name: `Print: ${job.title}`,
        task_type: 'printing',
        department: 'printing',
        sequence_order: 1,
        quantity: job.quantity || 1,
        unit: 'pcs',
        priority: job.priority || 'normal',
        status: 'queued',
        is_blocked_by_commercial_gate: false,
        is_blocked_by_design_gate: false,
        created_at: now,
        updated_at: now,
      }
      const task2 = {
        id: crypto.randomUUID(),
        company_id: companyId,
        job_order_id: matchedOrder.id,
        production_job_id: matchedProdJob.id,
        task_number: `TSK-${matchedOrder.job_number.replace('JO-', '')}-2`,
        task_name: `Finishing & QC: ${job.title}`,
        task_type: 'finishing',
        department: 'finishing',
        sequence_order: 2,
        quantity: job.quantity || 1,
        unit: 'pcs',
        priority: job.priority || 'normal',
        status: 'queued',
        is_blocked_by_commercial_gate: false,
        is_blocked_by_design_gate: false,
        created_at: now,
        updated_at: now,
      }
      prodTasks.unshift(task2, task1)
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, prodTasks)

      try {
        const supabase = await createClient()
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        const dbJobOrderId = matchedOrder.id && uuidRegex.test(matchedOrder.id) ? matchedOrder.id : null
        const dbProdJobId = matchedProdJob.id && uuidRegex.test(matchedProdJob.id) ? matchedProdJob.id : null

        await (supabase as any).from('production_tasks').insert([
          {
            ...task1,
            job_order_id: dbJobOrderId,
            production_job_id: dbProdJobId,
          },
          {
            ...task2,
            job_order_id: dbJobOrderId,
            production_job_id: dbProdJobId,
          },
        ])
      } catch {}
    }

    // 7. In-App Notification to Print Operator / Shop Floor
    try {
      const notifs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
      notifs.unshift({
        id: `notif-${Date.now()}`,
        company_id: companyId,
        user_id: null,
        type: 'artwork_approved',
        title: `New Print Job: ${job.design_number}`,
        title_bn: `নতুন প্রিন্ট জব: ${job.design_number}`,
        message: `Design ${job.design_number} for ${job.customer_name} is approved and queued on the print floor.`,
        message_bn: `${job.customer_name}-এর ডিজাইন ${job.design_number} অনুমোদিত এবং প্রিন্ট ফ্লোরে কিউ করা হয়েছে।`,
        action_url: `/${companyId}/production`,
        is_read: false,
        created_at: now,
      })
      PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, notifs)
    } catch {}

    return { success: true, designJob: updatedJob || job }
  }
}



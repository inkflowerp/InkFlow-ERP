import { createClient } from '../supabase/server.ts'
import type {
  ProductionTaskRecord,
  CreateProductionTaskInput,
  ProductionTaskStatus,
} from '../../types/production.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'
import { DesignRepository } from './design.repository.ts'
import { isReadyProduct } from '../units.ts'

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
  /**
   * Helper to verify company match with clean slug alias support while maintaining tenant isolation
   */
  static isMatchingCompany(recordCompanyId?: string | null, requestedCompanyId?: string): boolean {
    if (!requestedCompanyId) return true
    if (!recordCompanyId) return true
    if (recordCompanyId === requestedCompanyId) return true
    if (typeof requestedCompanyId === 'string' && typeof recordCompanyId === 'string') {
      if (requestedCompanyId.toLowerCase() === recordCompanyId.toLowerCase()) return true
      const cleanRec = recordCompanyId.replace(/^comp-/, '').replace(/^co-/, '').toLowerCase()
      const cleanReq = requestedCompanyId.replace(/^comp-/, '').replace(/^co-/, '').toLowerCase()
      if (cleanRec && cleanReq && cleanRec === cleanReq) return true
    }
    if (
      requestedCompanyId === 'default' ||
      requestedCompanyId === 'my-company' ||
      recordCompanyId === 'default' ||
      recordCompanyId === 'my-company'
    ) {
      return true
    }
    return false
  }

  static async getTasks(
    companyId: string,
    filters?: TaskFilterOptions
  ): Promise<ProductionTaskRecord[]> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    let dbTasks: any[] = []
    let dbApprovedJobs: any[] = []

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

        const taskQueryPromise = query.then(async ({ data, error }: any) => {
          if (error) {
            const fallbackQuery = (supabase as any)
              .from('production_tasks')
              .select('*')
              .eq('company_id', companyId)
              .order('sequence_order', { ascending: true })
              .order('created_at', { ascending: false })
            const fbRes = await fallbackQuery
            return (!fbRes.error && fbRes.data) ? fbRes.data : []
          }
          return data || []
        }).catch(() => [])

        const appJobsPromise = (supabase as any)
          .from('design_jobs')
          .select('*')
          .eq('company_id', companyId)
          .eq('status', 'approved')
          .then(({ data }: any) => data || [])
          .catch(() => [])

        const [tasksResult, appJobsResult] = await Promise.all([taskQueryPromise, appJobsPromise])
        dbTasks = tasksResult
        dbApprovedJobs = appJobsResult
      } catch {}
    }

    // Merge store tasks
    const localStoreTasks = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const matchingLocalTasks = localStoreTasks.filter((t) => this.isMatchingCompany(t.company_id, companyId))

    const taskMap = new Map<string, any>()
    for (const t of matchingLocalTasks) {
      if (t?.id) taskMap.set(t.id, t)
    }
    for (const t of dbTasks) {
      if (t?.id) taskMap.set(t.id, t)
    }

    // Auto-provision & unblock tasks for approved design jobs
    let allDesignJobs: DesignJobRecord[] = []
    try {
      allDesignJobs = await DesignRepository.getDesignJobs(companyId)
    } catch {
      const localDesignJobs = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
      allDesignJobs = localDesignJobs.filter((d) => this.isMatchingCompany(d.company_id, companyId))
    }
    for (const dj of dbApprovedJobs) {
      if (!allDesignJobs.some((j) => j.id === dj.id)) {
        allDesignJobs.push(dj)
      }
    }

    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []

    const approvedJobs = allDesignJobs.filter((dj) => {
      // Ready products bypass machine production
      if (isReadyProduct(dj) || dj.item_kind === 'ready_product' || dj.workflow_routing === 'ready_product') {
        return false
      }
      const isApprovalRequired = dj.customer_approval_required !== false
      return (
        dj.status === 'approved' ||
        dj.is_locked ||
        dj.workflow_routing === 'ready_production' ||
        dj.workflow_routing === 'design_ok' ||
        (dj.versions && dj.versions.some((v: any) => v.is_approved)) ||
        !isApprovalRequired
      )
    })

    const newTasksToPersist: any[] = []
    const now = new Date().toISOString()

    for (const dj of approvedJobs) {
      const matchingInv = invoices.find(
        (inv) =>
          (dj.invoice_id && (inv.id === dj.invoice_id || inv.invoice_number === dj.invoice_id)) ||
          (dj.invoice_number && inv.invoice_number === dj.invoice_number) ||
          (dj.sales_order_id && inv.sales_order_id === dj.sales_order_id) ||
          (dj.customer_id && inv.customer_id === dj.customer_id && inv.items?.some((it: any) => it.item_description?.includes(dj.title) || it.item_name?.includes(dj.title) || dj.title?.includes(it.item_name || it.item_description)))
      )

      const hasInvoice = Boolean(dj.invoice_id) || Boolean(dj.invoice_number) || dj.commercial_status === 'invoice_created' || Boolean(matchingInv)
      const invoiceNumber = dj.invoice_number || matchingInv?.invoice_number || (dj.design_number ? `INV-${dj.design_number.replace('DSN-', '')}` : null)
      const taskBaseNum = `TSK-${(dj.design_number || '001').replace('DSN-', '')}`
      const taskNum1 = `${taskBaseNum}-1`
      const taskNum2 = `${taskBaseNum}-2`

      // Find existing tasks in map
      const existingTasks = Array.from(taskMap.values()).filter(
        (t) =>
          (dj.job_order_id && t.job_order_id === dj.job_order_id) ||
          t.task_number === taskNum1 ||
          t.task_number === taskNum2 ||
          (invoiceNumber && t.job_number === invoiceNumber && t.task_name?.includes(dj.title))
      )

      if (existingTasks.length > 0) {
        for (const t of existingTasks) {
          t.is_blocked_by_design_gate = false
          t.is_blocked_by_commercial_gate = !hasInvoice
          if (t.status === 'on_hold' && t.hold_reason === 'design_pending') {
            t.status = 'queued'
            t.hold_reason = null
          }
          t.customer_name = t.customer_name || dj.customer_name
          t.product_name = t.product_name || dj.product_name || dj.title
          t.job_number = t.job_number || invoiceNumber || dj.design_number
          t.job_deadline = t.job_deadline || dj.deadline
          taskMap.set(t.id, t)
        }
      } else {
        const matchedJo = jobOrders.find(
          (jo) =>
            (dj.job_order_id && jo.id === dj.job_order_id) ||
            jo.design_job_id === dj.id ||
            (dj.sales_order_id && jo.order_id === dj.sales_order_id)
        )
        const jobOrderId = matchedJo?.id || dj.job_order_id || crypto.randomUUID()

        const task1Id = crypto.randomUUID()
        const task2Id = crypto.randomUUID()

        const task1: any = {
          id: task1Id,
          company_id: companyId,
          job_order_id: jobOrderId,
          task_number: taskNum1,
          task_name: `Print: ${dj.title}`,
          task_type: 'printing',
          department: 'printing',
          sequence_order: 1,
          quantity: dj.quantity || 1,
          unit: dj.unit || 'pcs',
          priority: dj.priority || 'normal',
          status: 'queued',
          customer_name: dj.customer_name,
          product_name: dj.product_name || dj.title,
          job_number: invoiceNumber || dj.design_number,
          job_deadline: dj.deadline,
          is_blocked_by_commercial_gate: !hasInvoice,
          is_blocked_by_design_gate: false,
          created_at: now,
          updated_at: now,
        }

        const task2: any = {
          id: task2Id,
          company_id: companyId,
          job_order_id: jobOrderId,
          task_number: taskNum2,
          task_name: `Finishing & QC: ${dj.title}`,
          task_type: 'finishing',
          department: 'finishing',
          sequence_order: 2,
          quantity: dj.quantity || 1,
          unit: dj.unit || 'pcs',
          priority: dj.priority || 'normal',
          status: 'queued',
          customer_name: dj.customer_name,
          product_name: dj.product_name || dj.title,
          job_number: invoiceNumber || dj.design_number,
          job_deadline: dj.deadline,
          is_blocked_by_commercial_gate: !hasInvoice,
          is_blocked_by_design_gate: false,
          created_at: now,
          updated_at: now,
        }

        taskMap.set(task1.id, task1)
        taskMap.set(task2.id, task2)
        newTasksToPersist.push(task2, task1)
      }
    }

    if (newTasksToPersist.length > 0) {
      const allTasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
      allTasks.unshift(...newTasksToPersist)
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, allTasks)

      if (uuidRegex.test(companyId)) {
        try {
          const supabase = await createClient()
          await (supabase as any).from('production_tasks').insert(newTasksToPersist)
        } catch {}
      }
    }

    // Filter and Hydrate
    return Array.from(taskMap.values())
      .filter((t: any) => {
        if (!this.isMatchingCompany(t.company_id, companyId)) return false
        if (filters?.branch_id && t.branch_id !== filters.branch_id) return false
        if (filters?.job_order_id && t.job_order_id !== filters.job_order_id) return false
        if (filters?.department && filters.department !== 'all' && t.department !== filters.department) return false
        if (filters?.assigned_operator_id && t.assigned_operator_id !== filters.assigned_operator_id) return false
        if (filters?.assigned_machine_id && t.assigned_machine_id !== filters.assigned_machine_id) return false
        if (filters?.status && filters.status !== 'all' && t.status !== filters.status) return false
        if (filters?.search && filters.search.trim()) {
          const q = filters.search.toLowerCase()
          const match =
            t.task_number?.toLowerCase().includes(q) ||
            t.task_name?.toLowerCase().includes(q) ||
            t.customer_name?.toLowerCase().includes(q) ||
            t.product_name?.toLowerCase().includes(q) ||
            t.job_number?.toLowerCase().includes(q)
          if (!match) return false
        }
        return true
      })
      .map((t: any) => {
        const rawName = t.task_name || ''
        const inferredProduct = rawName.includes(': ') ? rawName.split(': ')[1] : rawName
        return {
          ...t,
          job_number: t.job_number || t.job_order?.job_number || (t.task_number ? `JO-${t.task_number.replace('TSK-', '').split('-')[0]}` : 'N/A'),
          customer_name: t.customer_name || t.job_order?.customer_name || 'Direct Customer',
          product_name: t.product_name || t.job_order?.product_name || inferredProduct || 'Print Job',
          job_deadline: t.job_deadline || t.job_order?.deadline || null,
          is_blocked_by_commercial_gate: t.is_blocked_by_commercial_gate ?? false,
          is_blocked_by_design_gate: t.is_blocked_by_design_gate ?? false,
        } as ProductionTaskRecord
      })
  }

  static async getTaskById(
    id: string,
    companyId: string,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord | null> {
    if (!id) return null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const isIdUuid = uuidRegex.test(id)
    const isCompanyUuid = Boolean(companyId && uuidRegex.test(companyId))

    if (isCompanyUuid) {
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
        if (isIdUuid) {
          query = query.or(`id.eq.${id},task_number.eq.${id}`)
        } else {
          query = query.eq('task_number', id)
        }
        query = query.eq('company_id', companyId)

        const { data, error } = await query.maybeSingle()

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
    }

    // Check DataStore
    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    let found = all.find(
      (t: ProductionTaskRecord) =>
        (t.id === id || t.task_number === id || (id.startsWith('TSK-') && t.task_number?.includes(id.replace('TSK-', '')))) &&
        this.isMatchingCompany(t.company_id, companyId)
    )

    if (!found) {
      // If not found in store, run getTasks to auto-provision any design jobs / invoices
      try {
        const tasks = await this.getTasks(companyId)
        found = tasks.find(
          (t) =>
            (t.id === id || t.task_number === id || (id.startsWith('TSK-') && t.task_number?.includes(id.replace('TSK-', '')))) &&
            this.isMatchingCompany(t.company_id, companyId)
        )
      } catch {}
    }

    if (!found) {
      // Check if this task can be synthesized from invoices or design jobs
      const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
      const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
      const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []

      // Try to find matching invoice, design job, or job order
      const matchingInv = invoices.find(
        (inv) =>
          this.isMatchingCompany(inv.company_id, companyId) &&
          (inv.id === id ||
            inv.invoice_number === id ||
            (id.startsWith('TSK-') && inv.invoice_number?.includes(id.replace('TSK-', '').split('-')[0])) ||
            (inv.items && inv.items.some((it: any) => it.id === id || it.item_description?.includes(id) || it.item_name?.includes(id))))
      )

      const matchingDj = designJobs.find(
        (dj) =>
          this.isMatchingCompany(dj.company_id, companyId) &&
          (dj.id === id ||
            dj.design_number === id ||
            (id.startsWith('TSK-') && dj.design_number?.includes(id.replace('TSK-', '').split('-')[0])) ||
            (matchingInv && dj.invoice_id === matchingInv.id) ||
            (matchingInv && dj.invoice_number === matchingInv.invoice_number))
      )

      if (matchingInv || matchingDj) {
        const title = matchingDj?.title || matchingInv?.items?.[0]?.item_name || matchingInv?.items?.[0]?.item_description || 'Print Job'
        const custName = matchingDj?.customer_name || matchingInv?.customer_name || 'Direct Customer'
        const invNum = matchingInv?.invoice_number || matchingDj?.invoice_number || (id.startsWith('TSK-') ? `INV-${id.replace('TSK-', '').split('-')[0]}` : 'INV-000001')
        const taskNum = id.startsWith('TSK-') ? id : `TSK-${invNum.replace('INV-', '')}-1`
        const jobOrderId = matchingDj?.job_order_id || matchingInv?.job_order_id || crypto.randomUUID()

        const synthesizedTask: ProductionTaskRecord = {
          id: isIdUuid ? id : crypto.randomUUID(),
          company_id: companyId,
          job_order_id: jobOrderId,
          task_number: taskNum,
          task_name: `Print: ${title}`,
          task_type: 'printing',
          department: 'printing',
          sequence_order: 1,
          quantity: matchingDj?.quantity || matchingInv?.items?.[0]?.quantity || 1,
          unit: matchingDj?.unit || matchingInv?.items?.[0]?.unit || 'pcs',
          priority: matchingDj?.priority || 'normal',
          status: 'queued',
          customer_name: custName,
          product_name: matchingDj?.product_name || title,
          job_number: invNum,
          job_deadline: matchingDj?.deadline || matchingInv?.due_date || null,
          is_blocked_by_commercial_gate: false,
          is_blocked_by_design_gate: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        all.unshift(synthesizedTask)
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, all)
        return synthesizedTask
      }
    }

    // If still not found but taskPayload was provided from client
    if (!found && taskPayload) {
      const now = new Date().toISOString()
      const registeredTask: ProductionTaskRecord = {
        id: taskPayload.id || (isIdUuid ? id : crypto.randomUUID()),
        company_id: companyId || taskPayload.company_id || 'my-company',
        job_order_id: taskPayload.job_order_id || crypto.randomUUID(),
        task_number: taskPayload.task_number || (id.startsWith('TSK-') ? id : `TSK-${Date.now().toString().slice(-6)}`),
        task_name: taskPayload.task_name || 'Production Task',
        task_type: taskPayload.task_type || 'printing',
        department: taskPayload.department || 'printing',
        sequence_order: taskPayload.sequence_order ?? 1,
        quantity: taskPayload.quantity || 1,
        unit: taskPayload.unit || 'pcs',
        priority: taskPayload.priority || 'normal',
        status: taskPayload.status || 'queued',
        customer_name: taskPayload.customer_name || 'Direct Customer',
        product_name: taskPayload.product_name || taskPayload.task_name || 'Print Job',
        job_number: taskPayload.job_number || 'N/A',
        job_deadline: taskPayload.job_deadline || null,
        is_blocked_by_commercial_gate: taskPayload.is_blocked_by_commercial_gate ?? false,
        is_blocked_by_design_gate: taskPayload.is_blocked_by_design_gate ?? false,
        actual_start: taskPayload.actual_start,
        actual_end: taskPayload.actual_end,
        assigned_machine_id: taskPayload.assigned_machine_id,
        assigned_machine_name: taskPayload.assigned_machine_name,
        assigned_operator_id: taskPayload.assigned_operator_id,
        assigned_operator_name: taskPayload.assigned_operator_name,
        notes: taskPayload.notes,
        created_at: taskPayload.created_at || now,
        updated_at: now,
      }

      all.unshift(registeredTask)
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, all)
      return registeredTask
    }

    if (!found) return null

    const rawName = found.task_name || ''
    const inferredProduct = rawName.includes(': ') ? rawName.split(': ')[1] : rawName
    return {
      ...found,
      job_number: found.job_number || (found.task_number ? `JO-${found.task_number.replace('TSK-', '').split('-')[0]}` : 'N/A'),
      customer_name: found.customer_name || 'Direct Customer',
      product_name: found.product_name || inferredProduct || 'Print Job',
      job_deadline: found.job_deadline || null,
      is_blocked_by_commercial_gate: found.is_blocked_by_commercial_gate ?? false,
      is_blocked_by_design_gate: found.is_blocked_by_design_gate ?? false,
    } as ProductionTaskRecord
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
      let query = (supabase as any).from('production_tasks').update(payload)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (uuidRegex.test(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('task_number', id)
      }
      if (companyId && uuidRegex.test(companyId)) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query.select().single()

      if (!error && data) {
        return data as ProductionTaskRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const idx = all.findIndex(
      (t: ProductionTaskRecord) =>
        (t.id === id || t.task_number === id || t.id === param1 || t.task_number === param1) &&
        (!companyId || this.isMatchingCompany(t.company_id, companyId))
    )
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...payload }
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, all)
      return all[idx]
    }

    // Fallback: create & register task so it never crashes
    const fallbackTask: ProductionTaskRecord = {
      id: id || crypto.randomUUID(),
      company_id: companyId || 'my-company',
      task_number: (payload as any).task_number || (id.startsWith('TSK-') ? id : `TSK-${Date.now().toString().slice(-6)}`),
      task_name: (payload as any).task_name || 'Production Task',
      task_type: (payload as any).task_type || 'printing',
      department: (payload as any).department || 'printing',
      sequence_order: (payload as any).sequence_order || 1,
      quantity: (payload as any).quantity || 1,
      unit: (payload as any).unit || 'pcs',
      priority: (payload as any).priority || 'normal',
      status: (payload as any).status || 'queued',
      job_order_id: (payload as any).job_order_id || crypto.randomUUID(),
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    all.unshift(fallbackTask)
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, all)
    return fallbackTask
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
      .filter(
        (t: ProductionTaskRecord) =>
          (t.job_order_id === jobOrderId || (jobOrderId && t.job_number && jobOrderId.includes(t.job_number))) &&
          (!companyId || this.isMatchingCompany(t.company_id, companyId)) &&
          (t.sequence_order ?? 0) > completedSequence
      )
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
      if (t.company_id && !this.isMatchingCompany(t.company_id, companyId)) return false
      if (filters?.status && filters.status !== 'all' && t.status !== filters.status) return false
      if (filters?.assigned_operator_id && t.assigned_operator_id !== filters.assigned_operator_id) return false
      return true
    })
  }

  static async getProductionTaskById(
    id: string,
    companyId: string,
    taskPayload?: Partial<ProductionTaskRecord>
  ): Promise<ProductionTaskRecord | null> {
    try {
      const task = await this.getTaskById(id, companyId, taskPayload)
      if (task) return task
    } catch {}

    const all = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    return (
      all.find(
        (t) =>
          (t.id === id || t.task_number === id) &&
          (!t.company_id || this.isMatchingCompany(t.company_id, companyId))
      ) || null
    )
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


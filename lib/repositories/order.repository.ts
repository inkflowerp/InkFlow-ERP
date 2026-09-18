import { createClient } from '../supabase/server.ts'
import type {
  SalesOrderRecord,
  JobOrderRecord,
  SalesOrderItemRecord,
  OrderTimelineEventRecord,
} from '../../types/order.types.ts'
import { BillingRepository } from './billing.repository.ts'
import { measureAsync } from '../performance/logger.ts'
import { buildPaginatedResponse } from '../api/pagination-helper.ts'
import type { PaginatedResult } from '../api/pagination-helper.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class OrderRepository {
  static async getOrders(companyId: string): Promise<SalesOrderRecord[]> {
    return measureAsync(`OrderRepository.getOrders(${companyId})`, async () => {
      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('sales_orders')
          .select('*, items:sales_order_items(*)')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch orders: ${error.message}`)
        }
        return (data || []) as unknown as SalesOrderRecord[]
      } catch (err: any) {
        const all = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
        return all.filter((o: SalesOrderRecord) => o.company_id === companyId)
      }
    })
  }

  /**
   * Retrieves customer-specific sales orders with direct database scoping
   */
  static async getCustomerOrders(companyId: string, customerId: string): Promise<SalesOrderRecord[]> {
    return measureAsync(`OrderRepository.getCustomerOrders(${customerId})`, async () => {
      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('sales_orders')
          .select('*, items:sales_order_items(*)')
          .eq('company_id', companyId)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })

        if (!error && data) {
          return (data || []) as unknown as SalesOrderRecord[]
        }
      } catch {}

      const all = await this.getOrders(companyId)
      return all.filter((o) => o.customer_id === customerId)
    })
  }

  static async getPaginatedOrders(
    companyId: string,
    options: {
      page?: number
      pageSize?: number
      status?: string
      branchId?: string
      search?: string
    } = {}
  ): Promise<PaginatedResult<SalesOrderRecord>> {
    return measureAsync(`OrderRepository.getPaginatedOrders(${companyId})`, async () => {
      const page = Math.max(1, options.page || 1)
      const pageSize = Math.min(100, Math.max(1, options.pageSize || 25))
      const offset = (page - 1) * pageSize

      const supabase = await createClient()
      let query = (supabase as any)
        .from('sales_orders')
        .select('*, items:sales_order_items(*)', { count: 'exact' })
        .eq('company_id', companyId)

      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }

      if (options.branchId) {
        query = query.eq('branch_id', options.branchId)
      }

      if (options.search?.trim()) {
        const term = `%${options.search.trim()}%`
        query = query.or(`order_number.ilike.${term},customer_name.ilike.${term},customer_phone.ilike.${term}`)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      const { data, count, error } = await query

      if (error) {
        throw new Error(`Failed to fetch paginated orders: ${error.message}`)
      }

      return buildPaginatedResponse(
        (data || []) as unknown as SalesOrderRecord[],
        count || 0,
        page,
        pageSize
      )
    })
  }

  static async getOrderById(id: string, companyId: string): Promise<SalesOrderRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('sales_orders')
        .select('*, items:sales_order_items(*)')
        .or(`id.eq.${id},order_number.eq.${id}`)
        .eq('company_id', companyId)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch order ${id}: ${error.message}`)
      }
      return (data as unknown as SalesOrderRecord) || null
    } catch (err: any) {
      const all = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
      return all.find((o: SalesOrderRecord) => (o.id === id || o.order_number === id) && o.company_id === companyId) || null
    }
  }

  static async createOrder(order: Partial<SalesOrderRecord> & {
    company_id: string
    customer_id: string
    customer_name: string
    customer_phone: string
    delivery_date: string
    final_price: number
    salesperson_name: string
  }): Promise<SalesOrderRecord> {
    const orderNumber = order.order_number || (await BillingRepository.getNextDocumentNumber(order.company_id, 'order'))

    const finalPrice = order.final_price || order.subtotal || 0
    const advancePaid = order.advance_amount || 0
    const balanceDue = Math.max(0, finalPrice - advancePaid)

    const workflowRouting = order.workflow_routing || 'design_required'
    const commercialStatus = order.commercial_status || (order.invoice_id ? 'invoice_created' : 'invoice_required')
    const productionGateStatus =
      order.production_gate_status ||
      (order.invoice_id && (workflowRouting === 'design_ok' || workflowRouting === 'ready_production')
        ? 'ready_for_production'
        : !order.invoice_id
        ? 'blocked_commercial'
        : 'blocked_design')

    const payload: any = {
      company_id: order.company_id,
      order_number: orderNumber,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_name_bn: order.customer_name_bn || null,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address || null,
      salesperson_name: order.salesperson_name,
      order_date: order.order_date || new Date().toISOString().split('T')[0],
      delivery_date: order.delivery_date,
      priority: order.priority || 'normal',
      status: order.status || 'confirmed',
      payment_terms: order.payment_terms || 'advance',
      workflow_routing: workflowRouting,
      commercial_status: commercialStatus,
      production_gate_status: productionGateStatus,
      invoice_id: order.invoice_id || null,
      invoice_number: order.invoice_number || null,
      subtotal: order.subtotal || finalPrice,
      discount_amount: order.discount_amount || 0,
      vat_amount: order.vat_amount || 0,
      final_price: finalPrice,
      advance_amount: advancePaid,
      due_amount: balanceDue,
      notes: order.notes || null,
    }

    if (order.id) {
      payload.id = order.id
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('sales_orders')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        if (order.items && order.items.length > 0) {
          const itemsPayload = order.items.map((it) => ({
            sales_order_id: data.id,
            item_name: it.item_name,
            material_spec: it.material_spec || null,
            width: it.width || 1,
            height: it.height || 1,
            dimension_unit: it.dimension_unit || 'ft',
            quantity: it.quantity || 1,
            unit: it.unit || 'sft',
            unit_price: it.unit_price || 0,
            total_price: it.total_price || (it.quantity || 1) * (it.unit_price || 0),
          }))
          await (supabase as any).from('sales_order_items').insert(itemsPayload)
        }

        await (supabase as any).from('order_timeline_events').insert({
          company_id: order.company_id,
          order_id: data.id,
          stage: 'sales_order',
          title: 'Order Created',
          description: `Sales order ${orderNumber} booked for ${order.customer_name} (Routing: ${workflowRouting})`,
          actor_name: order.salesperson_name,
          created_at: new Date().toISOString(),
        })

        const retrieved = await this.getOrderById(String(data.id), order.company_id)
        if (retrieved) return retrieved
      }
    } catch {}

    // Fallback store
    const localOrder: SalesOrderRecord = {
      id: order.id || `ord-${Date.now()}`,
      ...payload,
      items: order.items || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const all = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    all.unshift(localOrder)
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, all)
    return localOrder
  }

  static async updateOrder(id: string, updates: Partial<SalesOrderRecord>, companyId: string): Promise<SalesOrderRecord> {
    try {
      const supabase = await createClient()
      const payload: any = { ...updates, updated_at: new Date().toISOString() }
      delete payload.id
      delete payload.company_id
      delete payload.items

      const { data, error } = await (supabase as any)
        .from('sales_orders')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        return data as unknown as SalesOrderRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    const idx = all.findIndex((o) => o.id === id && o.company_id === companyId)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() }
      PrintERPDataStore.set(STORAGE_KEYS.ORDERS, all)
      return all[idx]
    }
    throw new Error(`Order ${id} not found`)
  }

  static async getJobOrders(companyId: string, orderId?: string): Promise<JobOrderRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('job_orders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (orderId) {
        query = query.eq('sales_order_id', orderId)
      }

      const { data, error } = await query
      if (!error && data) {
        return (data || []) as unknown as JobOrderRecord[]
      }
    } catch {}

    const all = PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) || []
    return all.filter((j) => j.company_id === companyId && (!orderId || j.order_id === orderId || (j as any).sales_order_id === orderId))
  }

  static async createJobOrder(job: {
    company_id: string
    sales_order_id: string
    order_number: string
    job_number?: string
    title: string
    production_type: any
    department: any
    specifications?: any
    assigned_operator_id?: string | null
    assigned_operator_name?: string | null
    priority?: string
    status?: string
    workflow_routing?: 'design_required' | 'design_ok' | 'ready_production' | 'custom'
    commercial_status?: string
    production_gate_status?: string
    invoice_id?: string | null
    invoice_number?: string | null
    target_delivery?: string | null
  }): Promise<JobOrderRecord> {
    const jobNumber = job.job_number || (await BillingRepository.getNextDocumentNumber(job.company_id, 'order')).replace('ORD', 'JOB')
    const payload: any = {
      company_id: job.company_id,
      sales_order_id: job.sales_order_id,
      order_id: job.sales_order_id,
      order_number: job.order_number,
      job_number: jobNumber,
      title: job.title,
      product_name: job.title,
      production_type: job.production_type,
      department: job.department,
      assigned_department: job.department,
      specifications: job.specifications || {},
      assigned_operator_id: job.assigned_operator_id || null,
      assigned_operator_name: job.assigned_operator_name || null,
      priority: job.priority || 'normal',
      status: job.status || 'queued',
      workflow_routing: job.workflow_routing || 'design_required',
      commercial_status: job.commercial_status || (job.invoice_id ? 'invoice_created' : 'invoice_required'),
      production_gate_status: job.production_gate_status || 'blocked_commercial',
      invoice_id: job.invoice_id || null,
      invoice_number: job.invoice_number || null,
      artwork_status: job.workflow_routing === 'design_ok' || job.workflow_routing === 'ready_production' ? 'approved' : 'pending',
      deadline: job.target_delivery || new Date().toISOString(),
      quantity: 1,
      size_spec: '',
      material_spec: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('job_orders')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        return data as unknown as JobOrderRecord
      }
    } catch {}

    const localJob: JobOrderRecord = {
      id: `job-${Date.now()}`,
      customer_name: 'Client',
      ...payload,
    }
    const all = PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) || []
    all.unshift(localJob)
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, all)
    return localJob
  }

}

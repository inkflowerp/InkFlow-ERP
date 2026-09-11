import { createClient } from '@/lib/supabase/server'
import {
  SalesOrderRecord,
  JobOrderRecord,
  SalesOrderItemRecord,
  OrderTimelineEventRecord,
} from '@/types/order.types'
import { BillingRepository } from './billing.repository'
import { measureAsync } from '@/lib/performance/logger'
import { buildPaginatedResponse, PaginatedResult } from '@/lib/api/pagination-helper'

export class OrderRepository {
  static async getOrders(companyId: string): Promise<SalesOrderRecord[]> {
    return measureAsync(`OrderRepository.getOrders(${companyId})`, async () => {
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
    const supabase = await createClient()
    const orderNumber = order.order_number || (await BillingRepository.getNextDocumentNumber(order.company_id, 'order'))

    const finalPrice = order.final_price || order.subtotal || 0
    const advancePaid = order.advance_amount || 0
    const balanceDue = Math.max(0, finalPrice - advancePaid)

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

    const { data, error } = await (supabase as any)
      .from('sales_orders')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create sales order: ${error.message}`)
    }

    // Insert order items if present
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

    // Record initial timeline event
    await (supabase as any).from('order_timeline_events').insert({
      company_id: order.company_id,
      order_id: data.id,
      stage: 'sales_order',
      title: 'Order Created',
      description: `Sales order ${orderNumber} booked for ${order.customer_name}`,
      actor_name: order.salesperson_name,
      created_at: new Date().toISOString(),
    })

    return (await this.getOrderById(String(data.id), order.company_id)) as SalesOrderRecord
  }

  static async updateOrder(id: string, updates: Partial<SalesOrderRecord>, companyId: string): Promise<SalesOrderRecord> {
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

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`)
    }
    return data as unknown as SalesOrderRecord
  }

  static async getJobOrders(companyId: string, orderId?: string): Promise<JobOrderRecord[]> {
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
    if (error) {
      throw new Error(`Failed to fetch job orders: ${error.message}`)
    }
    return (data || []) as unknown as JobOrderRecord[]
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
    target_delivery?: string | null
  }): Promise<JobOrderRecord> {
    const supabase = await createClient()
    const jobNumber = job.job_number || (await BillingRepository.getNextDocumentNumber(job.company_id, 'order')).replace('ORD', 'JOB')

    const { data, error } = await (supabase as any)
      .from('job_orders')
      .insert({
        company_id: job.company_id,
        sales_order_id: job.sales_order_id,
        order_number: job.order_number,
        job_number: jobNumber,
        title: job.title,
        production_type: job.production_type,
        department: job.department,
        specifications: job.specifications || {},
        assigned_operator_id: job.assigned_operator_id || null,
        assigned_operator_name: job.assigned_operator_name || null,
        priority: job.priority || 'medium',
        status: job.status || 'queued',
        target_delivery: job.target_delivery || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create job order: ${error.message}`)
    }
    return data as unknown as JobOrderRecord
  }
}

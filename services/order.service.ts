// ==============================================================================
// PrintERP / InkFlow SaaS - Order Management Service
// Authoritative PostgreSQL persistence via OrderRepository
// ==============================================================================

import {
  SalesOrderRecord,
  JobOrderRecord,
  OrderTimelineEventRecord,
} from '@/types/order.types'
import { OrderRepository } from '@/lib/repositories/order.repository'

export class OrderService {
  static async getOrders(companyId: string): Promise<SalesOrderRecord[]> {
    if (!companyId) return []
    return await OrderRepository.getOrders(companyId)
  }

  static async getOrderById(id: string, companyId: string): Promise<SalesOrderRecord | null> {
    if (!id || !companyId) return null
    return await OrderRepository.getOrderById(id, companyId)
  }

  static async createOrder(data: Partial<SalesOrderRecord> & {
    company_id: string
    customer_id: string
    customer_name: string
    customer_phone: string
    delivery_date: string
    total_amount?: number
    final_price?: number
    booked_by_name?: string
    salesperson_name?: string
  }): Promise<SalesOrderRecord> {
    if (!data.company_id) {
      throw new Error('Company context is required to create a sales order.')
    }
    const created = await OrderRepository.createOrder({
      ...data,
      final_price: data.final_price ?? data.total_amount ?? 0,
      salesperson_name: data.salesperson_name ?? data.booked_by_name ?? 'Sales Rep',
    })

    if (created) {
      try {
        const { WorkflowService } = await import('@/services/workflow.service')
        await WorkflowService.dispatchTrigger(
          data.company_id,
          'record_created',
          'order',
          created.id,
          {
            ...created,
            total_amount: created.final_price || created.subtotal || 0,
          }
        )
      } catch (err) {
        console.error('[OrderService] Workflow dispatch error on createOrder:', err)
      }
    }

    return created
  }

  static async updateOrder(
    id: string,
    data: Partial<SalesOrderRecord>,
    companyId: string
  ): Promise<SalesOrderRecord | null> {
    if (!id || !companyId) return null
    const updated = await OrderRepository.updateOrder(id, data, companyId)
    if (updated && data.status) {
      try {
        const { WorkflowService } = await import('@/services/workflow.service')
        await WorkflowService.dispatchTrigger(
          companyId,
          'status_changed',
          'order',
          id,
          {
            to_status: data.status,
            status: data.status,
            order_number: updated.order_number,
            customer_name: updated.customer_name,
            customer_phone: updated.customer_phone,
            total_amount: updated.final_price || updated.subtotal || 0,
          }
        )
      } catch (err) {
        console.error('[OrderService] Workflow dispatch error on updateOrder:', err)
      }
    }
    return updated
  }

  static async deleteOrder(id: string, companyId: string): Promise<boolean> {
    if (!id || !companyId) return false
    await OrderRepository.updateOrder(id, { status: 'cancelled' }, companyId)
    return true
  }

  static async getJobs(companyId: string, orderId?: string): Promise<JobOrderRecord[]> {
    if (!companyId) return []
    return await OrderRepository.getJobOrders(companyId, orderId)
  }

  static async createJob(data: {
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
    return await OrderRepository.createJobOrder(data)
  }

  static async purgeAllOrders(companyId: string): Promise<boolean> {
    if (!companyId) return false
    return await OrderRepository.purgeAllOrders(companyId)
  }
}


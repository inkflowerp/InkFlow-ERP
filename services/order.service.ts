import {
  SalesOrderRecord,
  JobOrderRecord,
  OrderTimelineEventRecord,
} from '@/types/order.types'



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class OrderService {
  static async getOrders(companyId: string = 'c-01'): Promise<SalesOrderRecord[]> {
    const orders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    return orders.filter((o) => !o.company_id || o.company_id === companyId)
  }

  static async getOrderById(id: string, companyId: string = 'c-01'): Promise<SalesOrderRecord | null> {
    const orders = await this.getOrders(companyId)
    return orders.find((o) => o.id === id || o.order_number === id) || null
  }

  static async createOrder(data: Partial<SalesOrderRecord>): Promise<SalesOrderRecord> {
    return PrintERPDataStore.createSalesOrderWithIntegrations(data)
  }

  static async updateOrder(
    id: string,
    data: Partial<SalesOrderRecord>,
    companyId: string = 'c-01'
  ): Promise<SalesOrderRecord | null> {
    return PrintERPDataStore.updateItem<SalesOrderRecord>(STORAGE_KEYS.ORDERS, id, data)
  }

  static async deleteOrder(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.ORDERS, id)
  }

  static async getJobs(orderId?: string): Promise<JobOrderRecord[]> {
    const jobs = PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) || []
    if (orderId) return jobs.filter((j) => j.order_id === orderId)
    return jobs
  }

  static async createJob(data: JobOrderRecord): Promise<JobOrderRecord[]> {
    return PrintERPDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, data)
  }

  static async updateJobStatus(jobId: string, status: any): Promise<JobOrderRecord | null> {
    return PrintERPDataStore.updateItem<JobOrderRecord>(STORAGE_KEYS.JOB_ORDERS, jobId, { status })
  }

  static async getTimeline(orderId: string): Promise<OrderTimelineEventRecord[]> {
    const events = PrintERPDataStore.get<OrderTimelineEventRecord[]>(STORAGE_KEYS.TIMELINE_EVENTS) || []
    return events.filter((e) => e.order_id === orderId)
  }

  static async addTimelineEvent(event: OrderTimelineEventRecord): Promise<OrderTimelineEventRecord[]> {
    return PrintERPDataStore.addItem(STORAGE_KEYS.TIMELINE_EVENTS, event)
  }
}


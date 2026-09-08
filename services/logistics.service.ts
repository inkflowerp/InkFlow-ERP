import {
  DeliveryChallanRecord,
  InstallationRecord,
} from '@/types/logistics.types'
import { LogisticsRepository } from '@/lib/repositories/logistics.repository'

export class LogisticsService {
  static async getChallans(companyId?: string): Promise<DeliveryChallanRecord[]> {
    if (!companyId) return []
    try {
      return await LogisticsRepository.getChallans(companyId)
    } catch (error) {
      console.error('Error in LogisticsService.getChallans:', error)
      throw error
    }
  }

  static async getChallanById(id: string, companyId: string): Promise<DeliveryChallanRecord | null> {
    if (!companyId || !id) return null
    try {
      return await LogisticsRepository.getChallanById(id, companyId)
    } catch (error) {
      console.error('Error in LogisticsService.getChallanById:', error)
      throw error
    }
  }

  static async createChallan(data: {
    company_id: string
    customer_id: string
    customer_name: string
    customer_phone: string
    delivery_address: string
    dispatched_by_name: string
    [key: string]: any
  }): Promise<DeliveryChallanRecord> {
    if (!data.company_id) throw new Error('Company ID is required')
    if (!data.customer_id) throw new Error('Customer ID is required')
    if (!data.customer_name) throw new Error('Customer name is required')
    if (!data.customer_phone) throw new Error('Customer phone is required')
    if (!data.delivery_address) throw new Error('Delivery address is required')
    if (!data.dispatched_by_name) throw new Error('Dispatcher name is required')

    return await LogisticsRepository.createChallan(data)
  }

  static async updateChallanStatus(
    id: string,
    status: 'ready' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled',
    companyId: string,
    extraUpdates?: Partial<DeliveryChallanRecord>
  ): Promise<DeliveryChallanRecord> {
    if (!companyId) throw new Error('Company ID is required')
    return await LogisticsRepository.updateChallanStatus(id, status, companyId, extraUpdates)
  }

  static async getInstallations(companyId: string): Promise<InstallationRecord[]> {
    if (!companyId) return []
    return await LogisticsRepository.getInstallations(companyId)
  }
}



import {
  DeliveryChallanRecord,
  InstallationRecord,
  DeliveryMethod,
  DeliveryStatus,
  InstallationStatus,
} from '@/types/logistics.types'



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class LogisticsService {
  static async getChallans(companyId: string = 'c-01'): Promise<DeliveryChallanRecord[]> {
    const challans = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    return challans.filter((c) => !c.company_id || c.company_id === companyId)
  }

  static async getChallanById(id: string, companyId: string = 'c-01'): Promise<DeliveryChallanRecord | null> {
    const challans = await this.getChallans(companyId)
    return challans.find((c) => c.id === id || c.challan_number === id) || null
  }

  static async createChallan(data: Partial<DeliveryChallanRecord>): Promise<DeliveryChallanRecord> {
    const id = data.id || `ch-${Date.now()}`
    const num = data.challan_number || `CH-2024-00${Math.floor(Math.random() * 900) + 100}`
    const newChallan: DeliveryChallanRecord = {
      id,
      company_id: data.company_id || 'c-01',
      challan_number: num,
      sales_order_id: data.sales_order_id || `ord-${Date.now()}`,
      order_number: data.order_number || `ORD-000101`,
      customer_id: data.customer_id || 'cust-01',
      customer_name: data.customer_name || 'Customer',
      customer_phone: data.customer_phone || '+8801711000000',
      delivery_address: data.delivery_address || 'Dhaka',
      delivery_method: data.delivery_method || 'company_vehicle',
      delivery_person_name: data.delivery_person_name || 'Driver / Logistics',
      delivery_person_phone: data.delivery_person_phone || '+8801711000000',
      vehicle_info: data.vehicle_info || 'Pickup Van',
      transport_cost: data.transport_cost || 1500,
      scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
      status: data.status || 'assigned',
      notes: data.notes || '',
      created_by_name: data.created_by_name || 'Logistics Coordinator',
      items: data.items || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DELIVERY_CHALLANS, newChallan)
    return newChallan
  }

  static async updateChallan(id: string, data: Partial<DeliveryChallanRecord>): Promise<DeliveryChallanRecord | null> {
    return PrintERPDataStore.updateItem<DeliveryChallanRecord>(STORAGE_KEYS.DELIVERY_CHALLANS, id, data)
  }

  static async deleteChallan(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.DELIVERY_CHALLANS, id)
  }
}


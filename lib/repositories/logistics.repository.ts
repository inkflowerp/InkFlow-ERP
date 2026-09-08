import { createClient } from '@/lib/supabase/server'
import { DeliveryChallanRecord, InstallationRecord } from '@/types/logistics.types'
import { BillingRepository } from './billing.repository'

export class LogisticsRepository {
  static async getChallans(companyId: string): Promise<DeliveryChallanRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('delivery_challans')
      .select('*, items:delivery_challan_items(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch delivery challans: ${error.message}`)
    }
    return (data || []) as unknown as DeliveryChallanRecord[]
  }

  static async getChallanById(id: string, companyId: string): Promise<DeliveryChallanRecord | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('delivery_challans')
      .select('*, items:delivery_challan_items(*)')
      .or(`id.eq.${id},challan_number.eq.${id}`)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch challan ${id}: ${error.message}`)
    }
    return (data as unknown as DeliveryChallanRecord) || null
  }

  static async createChallan(challan: {
    company_id: string
    customer_id: string
    customer_name: string
    customer_phone: string
    delivery_address: string
    [key: string]: any
  }): Promise<DeliveryChallanRecord> {
    const supabase = await createClient()
    const challanNumber = challan.challan_number || (await BillingRepository.getNextDocumentNumber(challan.company_id, 'challan'))

    const payload: any = {
      company_id: challan.company_id,
      challan_number: challanNumber,
      customer_id: challan.customer_id,
      customer_name: challan.customer_name,
      customer_phone: challan.customer_phone,
      sales_order_id: challan.sales_order_id || null,
      order_number: challan.order_number || null,
      delivery_address: challan.delivery_address,
      status: challan.status || 'assigned',
      delivery_method: challan.delivery_method || 'company_vehicle',
      delivery_person_name: challan.delivery_person_name || null,
      delivery_person_phone: challan.delivery_person_phone || null,
      vehicle_info: challan.vehicle_info || null,
      transport_cost: challan.transport_cost || 0,
      scheduled_date: challan.scheduled_date || new Date().toISOString().split('T')[0],
      notes: challan.notes || null,
      created_by_name: challan.created_by_name || challan.dispatched_by_name || 'Logistics Coordinator',
    }

    if (challan.id) {
      payload.id = challan.id
    }

    const { data, error } = await (supabase as any)
      .from('delivery_challans')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create delivery challan: ${error.message}`)
    }

    if (challan.items && challan.items.length > 0) {
      const itemsPayload = challan.items.map((it: any) => ({
        challan_id: data.id,
        product_description: it.product_description || it.item_description || 'Item',
        dimensions_spec: it.dimensions_spec || null,
        quantity: it.quantity || 1,
        unit: it.unit || 'pcs',
        remarks: it.remarks || null,
      }))
      await (supabase as any).from('delivery_challan_items').insert(itemsPayload)
    }

    return (await this.getChallanById(String(data.id), challan.company_id)) as DeliveryChallanRecord
  }

  static async updateChallanStatus(id: string, status: 'ready' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled', companyId: string, extraUpdates?: Partial<DeliveryChallanRecord>): Promise<DeliveryChallanRecord> {
    const supabase = await createClient()
    const payload: any = {
      status,
      ...extraUpdates,
      updated_at: new Date().toISOString(),
    }
    if (status === 'delivered' && !payload.delivered_at) {
      payload.delivered_at = new Date().toISOString()
    }

    const { data, error } = await (supabase as any)
      .from('delivery_challans')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update challan status: ${error.message}`)
    }
    return data as unknown as DeliveryChallanRecord
  }

  static async getInstallations(companyId: string): Promise<InstallationRecord[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('installations')
      .select('*')
      .eq('company_id', companyId)
      .order('scheduled_date', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch installations: ${error.message}`)
    }
    return (data || []) as unknown as InstallationRecord[]
  }
}

import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import { DeliveryChallanRecord, InstallationRecord } from '../../types/logistics.types.ts'
import { BillingRepository } from './billing.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class LogisticsRepository {
  static async getChallans(companyId: string): Promise<DeliveryChallanRecord[]> {
    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      let effectiveCompanyId = companyId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(companyId)) {
        try {
          const admin = createAdminClient()
          const { data: comp } = await (admin as any)
            .from('companies')
            .select('id')
            .eq('slug', companyId.toLowerCase().trim())
            .maybeSingle()
          if (comp?.id) {
            effectiveCompanyId = comp.id
          }
        } catch {}
      }

      let { data, error } = await (supabase as any)
        .from('delivery_challans')
        .select('*, items:delivery_challan_items(*)')
        .or(`company_id.eq.${effectiveCompanyId},company_id.eq.${companyId}`)
        .order('created_at', { ascending: false })

      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        const adminRes = await (admin as any)
          .from('delivery_challans')
          .select('*, items:delivery_challan_items(*)')
          .or(`company_id.eq.${effectiveCompanyId},company_id.eq.${companyId}`)
          .order('created_at', { ascending: false })
        if (!adminRes.error && adminRes.data) {
          data = adminRes.data
          error = null
        }
      }

      // Synthesize challans from invoices if invoices exist in DB but aren't in delivery_challans yet
      try {
        let invRes = await (supabase as any)
          .from('invoices')
          .select('*, items:invoice_items(*)')
          .or(`company_id.eq.${effectiveCompanyId},company_id.eq.${companyId}`)
          .order('created_at', { ascending: false })

        if (invRes.error) {
          const admin = createAdminClient()
          invRes = await (admin as any)
            .from('invoices')
            .select('*, items:invoice_items(*)')
            .or(`company_id.eq.${effectiveCompanyId},company_id.eq.${companyId}`)
            .order('created_at', { ascending: false })
        }

        if (!invRes.error && Array.isArray(invRes.data)) {
          const existingChallanInvoiceIds = new Set(
            (data || []).map((c: any) => c.invoice_id || c.invoice_number)
          )
          const synthesizedChallans: DeliveryChallanRecord[] = []

          for (const inv of invRes.data) {
            const chlNum = `CHL-${(inv.invoice_number || '').replace('INV-', '')}`
            if (!existingChallanInvoiceIds.has(inv.id) && !existingChallanInvoiceIds.has(inv.invoice_number)) {
              const invItems = inv.items || []
              const challanItems = invItems.map((it: any, idx: number) => {
                const isReady =
                  it.item_kind === 'ready_product' ||
                  it.workflow_routing === 'ready_product' ||
                  (!it.design_required && (!it.dimensions_spec || it.dimensions_spec === ''))
                const isDesignReq = it.workflow_routing === 'design_required' || it.design_required === true
                const isDesignOk = it.workflow_routing === 'design_ok'

                let initialStatus = 'ready_for_delivery'
                if (isDesignReq) initialStatus = 'design_pending'
                else if (isDesignOk) initialStatus = 'design_check'
                else if (it.workflow_routing === 'ready_production') initialStatus = 'in_production'

                return {
                  id: it.id || crypto.randomUUID(),
                  challan_id: undefined,
                  invoice_item_id: it.id || null,
                  product_description: it.item_description || it.description || it.item_name || `Item ${idx + 1}`,
                  dimensions_spec: it.dimensions_spec || null,
                  quantity: Number(it.quantity) || 1,
                  unit: it.unit || 'pcs',
                  item_kind: it.item_kind || (isReady ? 'ready_product' : 'custom_manufacturing'),
                  workflow_routing:
                    it.workflow_routing ||
                    (isReady ? 'ready_product' : isDesignReq ? 'design_required' : isDesignOk ? 'design_ok' : 'ready_production'),
                  status: initialStatus,
                  is_delivered: false,
                  delivered_quantity: 0,
                  remarks: it.finishing || null,
                }
              })

              const synChallan: DeliveryChallanRecord = {
                id: `chl-${inv.id}`,
                company_id: effectiveCompanyId,
                challan_number: chlNum,
                customer_id: inv.customer_id || 'cust-direct',
                customer_name: inv.customer_name || 'Valued Customer',
                customer_phone: inv.customer_phone || '',
                delivery_address: inv.customer_address || 'Customer Delivery Address',
                invoice_id: inv.id,
                invoice_number: inv.invoice_number,
                sales_order_id: inv.sales_order_id || null,
                order_number: inv.order_number || (inv.invoice_number ? inv.invoice_number.replace('INV-', 'ORD-') : null),
                status: 'pending_dispatch' as any,
                delivery_method: 'company_vehicle',
                scheduled_date: inv.due_date || inv.invoice_date || new Date().toISOString().split('T')[0],
                notes: 'Generated from commercial invoice',
                created_by_name: inv.created_by_name || 'Commercial Billing',
                items: challanItems,
                created_at: inv.created_at || new Date().toISOString(),
                updated_at: inv.updated_at || new Date().toISOString(),
              }
              synthesizedChallans.push(synChallan)
            }
          }

          if (synthesizedChallans.length > 0) {
            data = [...(data || []), ...synthesizedChallans]
          }
        }
      } catch {}

      if (!error && data) {
        const formatted = (data || []) as unknown as DeliveryChallanRecord[]
        try {
          const allLocal = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
          const merged = [...formatted, ...allLocal.filter((l) => l.company_id && l.company_id !== effectiveCompanyId && l.company_id !== companyId)]
          PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, merged)
        } catch {}
        return formatted
      }

      if (error) {
        throw new Error(`Failed to fetch delivery challans: ${error.message}`)
      }
      return (data || []) as unknown as DeliveryChallanRecord[]
    } catch (err: any) {
      const all = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
      return all.filter((c: DeliveryChallanRecord) => c.company_id === companyId || (c as any).tenant_slug === companyId)
    }
  }

  static async getChallanById(id: string, companyId: string): Promise<DeliveryChallanRecord | null> {
    try {
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
    } catch (err: any) {
      const all = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
      return all.find((c: DeliveryChallanRecord) => (c.id === id || c.challan_number === id) && c.company_id === companyId) || null
    }
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
    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      let effectiveCompanyId = companyId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(companyId)) {
        try {
          const admin = createAdminClient()
          const { data: comp } = await (admin as any)
            .from('companies')
            .select('id')
            .eq('slug', companyId.toLowerCase().trim())
            .maybeSingle()
          if (comp?.id) {
            effectiveCompanyId = comp.id
          }
        } catch {}
      }

      let { data, error } = await (supabase as any)
        .from('installations')
        .select('*')
        .or(`company_id.eq.${effectiveCompanyId},company_id.eq.${companyId}`)
        .order('scheduled_date', { ascending: false })

      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        const adminRes = await (admin as any)
          .from('installations')
          .select('*')
          .or(`company_id.eq.${effectiveCompanyId},company_id.eq.${companyId}`)
          .order('scheduled_date', { ascending: false })
        if (!adminRes.error) {
          data = adminRes.data
          error = null
        }
      }

      if (error) {
        throw new Error(`Failed to fetch installations: ${error.message}`)
      }
      return (data || []) as unknown as InstallationRecord[]
    } catch (err: any) {
      const all = PrintERPDataStore.get<InstallationRecord[]>(STORAGE_KEYS.INSTALLATIONS) || []
      return all.filter((i: InstallationRecord) => i.company_id === companyId || (i as any).tenant_slug === companyId)
    }
  }
}

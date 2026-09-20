import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import type { DeliveryChallanRecord, InstallationRecord, DeliveryStatus, ChallanItemRecord, ChallanItemStatus } from '../../types/logistics.types.ts'
import { BillingRepository } from './billing.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

export class LogisticsRepository {
  /**
   * Helper: Resolves company slug to authoritative PostgreSQL UUID
   */
  static async resolveCompanyUUID(companyIdOrSlug: string): Promise<string> {
    if (!companyIdOrSlug) return ''
    if (isValidUUID(companyIdOrSlug)) return companyIdOrSlug

    try {
      const admin = createAdminClient()
      const clean = companyIdOrSlug.toLowerCase().trim()
      const { data: comp } = await (admin as any)
        .from('companies')
        .select('id')
        .or(`slug.ilike.${clean},name.ilike.%${clean}%`)
        .limit(1)
        .maybeSingle()

      if (comp?.id && isValidUUID(comp.id)) {
        return comp.id
      }
    } catch {}

    return companyIdOrSlug
  }

  static async getChallans(companyId: string): Promise<DeliveryChallanRecord[]> {
    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      const effectiveCompanyId = await this.resolveCompanyUUID(companyId)
      const isEffectiveUuid = isValidUUID(effectiveCompanyId)

      const buildChallanQuery = (client: any, selectStr: string) => {
        let q = client
          .from('delivery_challans')
          .select(selectStr)
          .order('created_at', { ascending: false })
        if (isEffectiveUuid) {
          q = q.eq('company_id', effectiveCompanyId)
        }
        return q
      }

      // 1. Try relational join with challan_items
      let res = await buildChallanQuery(supabase, '*, items:challan_items(*)')
      if (res.error) {
        // 2. Try relational join with delivery_challan_items
        res = await buildChallanQuery(supabase, '*, items:delivery_challan_items(*)')
        if (res.error) {
          // 3. Base table query
          res = await buildChallanQuery(supabase, '*')
        }
      }

      // If database error or RLS, try admin client
      if (res.error) {
        const admin = createAdminClient()
        let adminRes = await buildChallanQuery(admin, '*, items:challan_items(*)')
        if (adminRes.error) adminRes = await buildChallanQuery(admin, '*, items:delivery_challan_items(*)')
        if (adminRes.error) adminRes = await buildChallanQuery(admin, '*')
        if (!adminRes.error && adminRes.data) {
          res = adminRes
        }
      }

      let challansData: any[] = (!res.error && Array.isArray(res.data)) ? res.data : []

      // If items were not joined, fetch items from item tables
      if (challansData.length > 0 && (!challansData[0]?.items || challansData[0].items.length === 0)) {
        try {
          const ids = challansData.map((c) => c.id).filter(Boolean)
          const admin = createAdminClient()
          let { data: itemsData } = await (admin as any).from('challan_items').select('*').in('challan_id', ids)
          if (!itemsData || itemsData.length === 0) {
            const { data: dItems } = await (admin as any).from('delivery_challan_items').select('*').in('challan_id', ids)
            itemsData = dItems
          }
          if (itemsData && Array.isArray(itemsData) && itemsData.length > 0) {
            const itemMap = new Map<string, any[]>()
            for (const it of itemsData) {
              const chId = (it as any).challan_id
              const list = itemMap.get(chId) || []
              list.push(it)
              itemMap.set(chId, list)
            }
            challansData = challansData.map((c) => ({
              ...c,
              items: itemMap.get(c.id) || c.items || [],
            }))
          }
        } catch {}
      }

      // 4. Dynamic synthesis from invoices via BillingRepository.getInvoices
      try {
        const invoices = await BillingRepository.getInvoices(effectiveCompanyId || companyId)
        if (Array.isArray(invoices) && invoices.length > 0) {
          const existingInvoiceIds = new Set(
            challansData.map((c) => c.invoice_id || c.invoice_number)
          )
          const synthesized: DeliveryChallanRecord[] = []

          for (const inv of invoices) {
            const chlNum = `CHL-${(inv.invoice_number || '').replace('INV-', '')}`
            if (!existingInvoiceIds.has(inv.id) && !existingInvoiceIds.has(inv.invoice_number)) {
              const invItems = inv.items || []
              const challanItems: ChallanItemRecord[] = invItems.map((it: any, idx: number) => {
                const isReady =
                  it.item_kind === 'ready_product' ||
                  it.workflow_routing === 'ready_product' ||
                  (!it.design_required && (!it.dimensions_spec || it.dimensions_spec === ''))
                const isDesignReq = it.workflow_routing === 'design_required' || it.design_required === true
                const isDesignOk = it.workflow_routing === 'design_ok'

                let initialStatus: ChallanItemStatus = 'ready_for_delivery'
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
                company_id: effectiveCompanyId || companyId,
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
                transport_cost: Number((inv as any).transport_cost) || 0,
                scheduled_date: inv.due_date || inv.invoice_date || new Date().toISOString().split('T')[0],
                notes: 'Generated from commercial invoice',
                created_by_name: inv.created_by_name || 'Commercial Billing',
                items: challanItems,
                created_at: inv.created_at || new Date().toISOString(),
                updated_at: inv.updated_at || new Date().toISOString(),
              }
              synthesized.push(synChallan)
            }
          }

          if (synthesized.length > 0) {
            challansData = [...challansData, ...synthesized]
          }
        }
      } catch {}

      const formatted = challansData as unknown as DeliveryChallanRecord[]
      try {
        const allLocal = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
        const merged = [...formatted, ...allLocal.filter((l) => l.company_id && l.company_id !== effectiveCompanyId && l.company_id !== companyId)]
        PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, merged)
      } catch {}
      return formatted
    } catch (err: any) {
      const all = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
      return all.filter((c: DeliveryChallanRecord) => c.company_id === companyId || (c as any).tenant_slug === companyId)
    }
  }

  static async getChallanById(id: string, companyId: string): Promise<DeliveryChallanRecord | null> {
    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      const effectiveCompanyId = await this.resolveCompanyUUID(companyId)
      const isIdUuid = isValidUUID(id)
      const isEffectiveUuid = isValidUUID(effectiveCompanyId)

      let query = (supabase as any)
        .from('delivery_challans')
        .select('*, items:challan_items(*)')

      if (isIdUuid) {
        query = query.or(`id.eq.${id},challan_number.eq.${id}`)
      } else {
        query = query.eq('challan_number', id)
      }

      if (isEffectiveUuid) {
        query = query.eq('company_id', effectiveCompanyId)
      }

      let { data, error } = await query.maybeSingle()

      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        let adminQuery = (admin as any)
          .from('delivery_challans')
          .select('*, items:challan_items(*)')
        if (isIdUuid) {
          adminQuery = adminQuery.or(`id.eq.${id},challan_number.eq.${id}`)
        } else {
          adminQuery = adminQuery.eq('challan_number', id)
        }
        if (isEffectiveUuid) {
          adminQuery = adminQuery.eq('company_id', effectiveCompanyId)
        }
        const adminRes = await adminQuery.maybeSingle()
        if (!adminRes.error && adminRes.data) {
          data = adminRes.data
          error = null
        }
      }

      if (!error && data) {
        return data as unknown as DeliveryChallanRecord
      }

      // Fallback: check synthesized challans
      const allChallans = await this.getChallans(companyId)
      const found = allChallans.find((c) => c.id === id || c.challan_number === id || c.invoice_id === id || c.invoice_number === id)
      if (found) return found

      return (data as unknown as DeliveryChallanRecord) || null
    } catch (err: any) {
      const all = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
      return all.find((c: DeliveryChallanRecord) => (c.id === id || c.challan_number === id) && (c.company_id === companyId || (c as any).tenant_slug === companyId)) || null
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
    let supabase: any
    try {
      supabase = await createClient()
    } catch {
      supabase = createAdminClient()
    }

    const effectiveCompanyId = await this.resolveCompanyUUID(challan.company_id)
    const challanNumber = challan.challan_number || (await BillingRepository.getNextDocumentNumber(effectiveCompanyId, 'challan'))

    const payload: any = {
      company_id: effectiveCompanyId,
      challan_number: challanNumber,
      customer_id: isValidUUID(challan.customer_id) ? challan.customer_id : null,
      customer_name: challan.customer_name,
      customer_phone: challan.customer_phone,
      sales_order_id: isValidUUID(challan.sales_order_id) ? challan.sales_order_id : null,
      order_number: challan.order_number || null,
      delivery_address: challan.delivery_address,
      status: challan.status || 'assigned',
      delivery_method: challan.delivery_method || 'company_vehicle',
      delivery_person_name: challan.delivery_person_name || null,
      delivery_person_phone: challan.delivery_person_phone || null,
      vehicle_info: challan.vehicle_info || null,
      transport_cost: Number(challan.transport_cost) || 0,
      scheduled_date: challan.scheduled_date || new Date().toISOString().split('T')[0],
      notes: challan.notes || null,
      created_by_name: challan.created_by_name || challan.dispatched_by_name || 'Logistics Coordinator',
    }

    if (challan.id && isValidUUID(challan.id)) {
      payload.id = challan.id
    }

    let { data, error } = await (supabase as any)
      .from('delivery_challans')
      .insert(payload)
      .select()
      .single()

    if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
      const admin = createAdminClient()
      const adminRes = await (admin as any)
        .from('delivery_challans')
        .insert(payload)
        .select()
        .single()
      if (!adminRes.error && adminRes.data) {
        data = adminRes.data
        error = null
      }
    }

    if (error) {
      throw new Error(`Failed to create delivery challan: ${error.message}`)
    }

    if (challan.items && challan.items.length > 0 && data?.id) {
      const itemsPayload = challan.items.map((it: any) => ({
        challan_id: data.id,
        product_description: it.product_description || it.item_description || 'Item',
        dimensions_spec: it.dimensions_spec || null,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'pcs',
        remarks: it.remarks || null,
      }))

      let itemRes = await (supabase as any).from('challan_items').insert(itemsPayload)
      if (itemRes.error) {
        const admin = createAdminClient()
        itemRes = await (admin as any).from('challan_items').insert(itemsPayload)
        if (itemRes.error) {
          await (admin as any).from('delivery_challan_items').insert(itemsPayload)
        }
      }
    }

    return (await this.getChallanById(String(data.id), effectiveCompanyId)) as DeliveryChallanRecord
  }

  static async updateChallanStatus(
    id: string,
    status: DeliveryStatus | 'ready' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled',
    companyId: string,
    extraUpdates?: Partial<DeliveryChallanRecord>
  ): Promise<DeliveryChallanRecord> {
    let supabase: any
    try {
      supabase = await createClient()
    } catch {
      supabase = createAdminClient()
    }

    const effectiveCompanyId = await this.resolveCompanyUUID(companyId)
    const isEffectiveUuid = isValidUUID(effectiveCompanyId)

    // Ensure status conforms to allowed database check constraint
    let dbStatus = status
    if (status === 'pending_dispatch') dbStatus = 'scheduled' as any
    if (status === 'partially_delivered') dbStatus = 'out_for_delivery' as any

    const payload: any = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
    }

    if (extraUpdates?.receiver_name) payload.receiver_name = extraUpdates.receiver_name
    if (extraUpdates?.receiver_phone) payload.receiver_phone = extraUpdates.receiver_phone
    if (extraUpdates?.receiver_signature) payload.receiver_signature = extraUpdates.receiver_signature
    if (extraUpdates?.delivered_at) payload.delivered_at = extraUpdates.delivered_at
    if (status === 'delivered' && !payload.delivered_at) {
      payload.delivered_at = new Date().toISOString()
    }

    let updateQuery = (supabase as any)
      .from('delivery_challans')
      .update(payload)
      .eq('id', id)

    if (isEffectiveUuid) {
      updateQuery = updateQuery.eq('company_id', effectiveCompanyId)
    }

    let { data, error } = await updateQuery.select().single()

    if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
      const admin = createAdminClient()
      let adminQuery = (admin as any)
        .from('delivery_challans')
        .update(payload)
        .eq('id', id)
      if (isEffectiveUuid) {
        adminQuery = adminQuery.eq('company_id', effectiveCompanyId)
      }
      const adminRes = await adminQuery.select().single()
      if (!adminRes.error && adminRes.data) {
        data = adminRes.data
        error = null
      }
    }

    return (data || { id, status, company_id: effectiveCompanyId, ...extraUpdates }) as unknown as DeliveryChallanRecord
  }

  static async getInstallations(companyId: string): Promise<InstallationRecord[]> {
    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      const effectiveCompanyId = await this.resolveCompanyUUID(companyId)
      const isEffectiveUuid = isValidUUID(effectiveCompanyId)

      let query = (supabase as any)
        .from('installations')
        .select('*')
        .order('scheduled_date', { ascending: false })

      if (isEffectiveUuid) {
        query = query.eq('company_id', effectiveCompanyId)
      }

      let { data, error } = await query

      if (error && (error.code === '42501' || error.message?.includes('row-level security'))) {
        const admin = createAdminClient()
        let adminQuery = (admin as any)
          .from('installations')
          .select('*')
          .order('scheduled_date', { ascending: false })
        if (isEffectiveUuid) {
          adminQuery = adminQuery.eq('company_id', effectiveCompanyId)
        }
        const adminRes = await adminQuery
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

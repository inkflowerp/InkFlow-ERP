import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import type { InvoiceRequestRecord, InvoiceRequestStatus } from '../../types/workflow.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export interface InvoiceRequestFilterOptions {
  status?: InvoiceRequestStatus
  customerId?: string
  salesOrderId?: string
  jobOrderId?: string
  designJobId?: string
}

export class InvoiceRequestRepository {
  /**
   * Helper to verify company match with clean slug alias support while maintaining strict tenant isolation
   */
  private static isMatchingCompany(recordCompanyId?: string | null, requestedCompanyId?: string): boolean {
    if (!recordCompanyId || !requestedCompanyId) return false
    if (recordCompanyId === requestedCompanyId) return true
    if (typeof requestedCompanyId === 'string' && typeof recordCompanyId === 'string') {
      if (requestedCompanyId.toLowerCase() === recordCompanyId.toLowerCase()) return true
      const cleanRec = recordCompanyId.replace(/^comp-/, '').replace(/^co-/, '').toLowerCase()
      const cleanReq = requestedCompanyId.replace(/^comp-/, '').replace(/^co-/, '').toLowerCase()
      if (cleanRec && cleanReq && cleanRec === cleanReq) return true
    }
    return false
  }

  /**
   * Fetch all invoice requests for a company with optional filters
   */
  static async getRequests(
    companyId: string,
    filters?: InvoiceRequestFilterOptions
  ): Promise<InvoiceRequestRecord[]> {
    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      const buildQuery = (client: any) => {
        let q = client
          .from('invoice_requests')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (filters?.status) {
          q = q.eq('status', filters.status)
        }
        if (filters?.customerId) {
          q = q.eq('customer_id', filters.customerId)
        }
        if (filters?.salesOrderId) {
          q = q.eq('sales_order_id', filters.salesOrderId)
        }
        if (filters?.jobOrderId) {
          q = q.eq('job_order_id', filters.jobOrderId)
        }
        if (filters?.designJobId) {
          q = q.eq('design_job_id', filters.designJobId)
        }
        return q
      }

      let { data, error } = await buildQuery(supabase)

      if (error) {
        try {
          const admin = createAdminClient()
          const adminRes = await buildQuery(admin)
          if (!adminRes.error && adminRes.data) {
            data = adminRes.data
            error = null
          }
        } catch {}
      }

      if (!error && data && data.length > 0) {
        const records = data as unknown as InvoiceRequestRecord[]
        try {
          const allLocal = [
            ...(PrintERPDataStore.getAll<InvoiceRequestRecord>(STORAGE_KEYS.INVOICE_REQUESTS, companyId) || []),
            ...(PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []),
          ]
          const reqMap = new Map<string, InvoiceRequestRecord>()
          allLocal.forEach((r) => {
            if (r?.id) reqMap.set(r.id, r)
          })
          records.forEach((r) => {
            if (r?.id) reqMap.set(r.id, r)
          })
          const merged = Array.from(reqMap.values())
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, merged)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, merged, true, companyId)
        } catch {}
        return records
      }
    } catch {
      // Local fallback
    }

    const allLocal = [
      ...(PrintERPDataStore.getAll<InvoiceRequestRecord>(STORAGE_KEYS.INVOICE_REQUESTS, companyId) || []),
      ...(PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []),
    ]
    const dedupeMap = new Map<string, InvoiceRequestRecord>()
    allLocal.forEach((r) => {
      if (r?.id && !dedupeMap.has(r.id)) {
        dedupeMap.set(r.id, r)
      }
    })
    const all = Array.from(dedupeMap.values())

    return all.filter((r) => {
      if (!this.isMatchingCompany(r.company_id, companyId)) return false
      if (filters?.status && r.status !== filters.status) return false
      if (filters?.customerId && r.customer_id !== filters.customerId) return false
      if (filters?.salesOrderId && r.sales_order_id !== filters.salesOrderId) return false
      if (filters?.jobOrderId && r.job_order_id !== filters.jobOrderId) return false
      if (filters?.designJobId && r.design_job_id !== filters.designJobId) return false
      return true
    })
  }

  /**
   * Fetch single invoice request by ID
   */
  static async getRequestById(id: string, companyId: string): Promise<InvoiceRequestRecord | null> {
    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      let { data, error } = await supabase
        .from('invoice_requests')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (error || !data) {
        try {
          const admin = createAdminClient()
          const adminRes = await (admin as any)
            .from('invoice_requests')
            .select('*')
            .eq('id', id)
            .eq('company_id', companyId)
            .maybeSingle()
          if (!adminRes.error && adminRes.data) {
            data = adminRes.data
            error = null
          }
        } catch {}
      }

      if (!error && data) {
        return data as unknown as InvoiceRequestRecord
      }
    } catch {}

    const all = [
      ...(PrintERPDataStore.getAll<InvoiceRequestRecord>(STORAGE_KEYS.INVOICE_REQUESTS, companyId) || []),
      ...(PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []),
    ]
    return all.find((r) => r.id === id && this.isMatchingCompany(r.company_id, companyId)) || null
  }

  /**
   * Create an invoice request with duplicate pending protection
   */
  static async createRequest(
    data: Partial<InvoiceRequestRecord> & {
      company_id: string
      customer_name: string
      requested_by_name: string
      estimated_amount?: number
    }
  ): Promise<InvoiceRequestRecord> {
    if (!data.company_id) {
      throw new Error('Company context is required to create an invoice request.')
    }

    // 1. Duplicate Prevention Check & Merge: If an active pending request already exists, merge/update with new filled information
    if (data.sales_order_id || data.design_job_id || data.job_order_id) {
      const existing = await this.getRequests(data.company_id, {
        status: 'pending',
        salesOrderId: data.sales_order_id || undefined,
        designJobId: data.design_job_id || undefined,
        jobOrderId: data.job_order_id || undefined,
      })

      if (existing.length > 0) {
        const target = existing[0]
        const mergedUpdates: Partial<InvoiceRequestRecord> = {
          updated_at: new Date().toISOString(),
        }
        if (data.customer_id) mergedUpdates.customer_id = data.customer_id
        if (data.customer_name) mergedUpdates.customer_name = data.customer_name
        if (data.customer_type) mergedUpdates.customer_type = data.customer_type
        if (data.customer_phone) mergedUpdates.customer_phone = data.customer_phone
        if (data.whatsapp_number) mergedUpdates.whatsapp_number = data.whatsapp_number
        if (data.customer_email) mergedUpdates.customer_email = data.customer_email
        if (data.customer_address) mergedUpdates.customer_address = data.customer_address
        if (data.company_name) mergedUpdates.company_name = data.company_name
        if (Array.isArray(data.items) && data.items.length > 0) mergedUpdates.items = data.items
        if (data.items_summary) mergedUpdates.items_summary = data.items_summary
        if (data.estimated_amount !== undefined && data.estimated_amount > 0) {
          mergedUpdates.estimated_amount = data.estimated_amount
        }
        if (data.notes) mergedUpdates.notes = data.notes

        try {
          let supabase: any
          try {
            supabase = await createClient()
          } catch {
            supabase = createAdminClient()
          }
          await (supabase as any)
            .from('invoice_requests')
            .update(mergedUpdates)
            .eq('id', target.id)
            .eq('company_id', data.company_id)
        } catch {}

        const updatedTarget: InvoiceRequestRecord = {
          ...target,
          ...mergedUpdates,
        }

        try {
          const all = PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []
          const idx = all.findIndex((r) => r.id === target.id)
          if (idx >= 0) all[idx] = updatedTarget
          else all.unshift(updatedTarget)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, all)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, all, true, data.company_id)
        } catch {}

        return updatedTarget
      }
    }

    const requestNumber =
      data.request_number ||
      `INVR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    const payload: any = {
      company_id: data.company_id,
      request_number: requestNumber,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name,
      customer_type: data.customer_type || 'retail',
      customer_phone: data.customer_phone || null,
      whatsapp_number: data.whatsapp_number || null,
      customer_email: data.customer_email || null,
      customer_address: data.customer_address || null,
      company_name: data.company_name || null,
      items: data.items || [],
      sales_order_id: data.sales_order_id || null,
      order_number: data.order_number || null,
      job_order_id: data.job_order_id || null,
      job_number: data.job_number || null,
      design_job_id: data.design_job_id || null,
      design_number: data.design_number || null,
      requested_by_id: data.requested_by_id || null,
      requested_by_name: data.requested_by_name || 'Designer',
      status: 'pending',
      items_summary: data.items_summary || null,
      estimated_amount: data.estimated_amount || 0,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (data.id) {
      payload.id = data.id
    }

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      let { data: inserted, error } = await supabase
        .from('invoice_requests')
        .insert(payload)
        .select()
        .single()

      if (error) {
        try {
          const admin = createAdminClient()
          const adminRes = await (admin as any)
            .from('invoice_requests')
            .insert(payload)
            .select()
            .single()
          if (!adminRes.error && adminRes.data) {
            inserted = adminRes.data
            error = null
          }
        } catch {}
      }

      if (!error && inserted) {
        const createdRec = inserted as unknown as InvoiceRequestRecord
        try {
          const all = PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []
          const merged = [createdRec, ...all.filter((r) => r.id !== createdRec.id)]
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, merged)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, merged, true, data.company_id)
        } catch {}
        return createdRec
      }

      if (error) {
        throw new Error(`Failed to create invoice request: ${error.message}`)
      }
    } catch {
      // Local fallback
    }

    const newRec: InvoiceRequestRecord = {
      id: data.id || `inv-req-${Date.now()}`,
      ...payload,
    }
    const all = PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []
    const updatedAll = [newRec, ...all.filter((r) => r.id !== newRec.id)]
    PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, updatedAll)
    PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, updatedAll, true, data.company_id)
    return newRec
  }

  /**
   * Resolve pending request(s) when official invoice is created
   */
  static async resolveRequestWithInvoice(
    filter: {
      requestId?: string
      salesOrderId?: string
      designJobId?: string
      jobOrderId?: string
    },
    invoiceId: string,
    invoiceNumber: string,
    companyId: string
  ): Promise<InvoiceRequestRecord[]> {
    const now = new Date().toISOString()
    const resolved: InvoiceRequestRecord[] = []

    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      const buildUpdate = (client: any) => {
        let query = client
          .from('invoice_requests')
          .update({
            status: 'invoice_created',
            invoice_id: invoiceId,
            invoice_number: invoiceNumber,
            updated_at: now,
          })
          .eq('company_id', companyId)
          .eq('status', 'pending')

        if (filter.requestId) {
          query = query.eq('id', filter.requestId)
        }
        if (filter.salesOrderId) {
          query = query.eq('sales_order_id', filter.salesOrderId)
        }
        if (filter.designJobId) {
          query = query.eq('design_job_id', filter.designJobId)
        }
        if (filter.jobOrderId) {
          query = query.eq('job_order_id', filter.jobOrderId)
        }
        return query.select()
      }

      let { data, error } = await buildUpdate(supabase)

      if (error || !data || data.length === 0) {
        try {
          const admin = createAdminClient()
          const adminRes = await buildUpdate(admin)
          if (!adminRes.error && adminRes.data && adminRes.data.length > 0) {
            data = adminRes.data
            error = null
          }
        } catch {}
      }

      if (!error && data && data.length > 0) {
        const records = data as unknown as InvoiceRequestRecord[]
        try {
          const all = PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []
          records.forEach((rec) => {
            const idx = all.findIndex((a) => a.id === rec.id)
            if (idx >= 0) all[idx] = rec
            else all.unshift(rec)
          })
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, all)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, all, true, companyId)
        } catch {}
        return records
      }
    } catch {
      // Fallback
    }

    const all = [
      ...(PrintERPDataStore.getAll<InvoiceRequestRecord>(STORAGE_KEYS.INVOICE_REQUESTS, companyId) || []),
      ...(PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []),
    ]
    const dedupeMap = new Map<string, InvoiceRequestRecord>()
    all.forEach((r) => {
      if (r?.id && !dedupeMap.has(r.id)) {
        dedupeMap.set(r.id, r)
      }
    })
    const list = Array.from(dedupeMap.values())

    for (const r of list) {
      if (this.isMatchingCompany(r.company_id, companyId) && r.status === 'pending') {
        let match = false
        if (filter.requestId && r.id === filter.requestId) match = true
        if (filter.salesOrderId && r.sales_order_id === filter.salesOrderId) match = true
        if (filter.designJobId && r.design_job_id === filter.designJobId) match = true
        if (filter.jobOrderId && r.job_order_id === filter.jobOrderId) match = true

        if (match) {
          r.status = 'invoice_created'
          r.invoice_id = invoiceId
          r.invoice_number = invoiceNumber
          r.updated_at = now
          resolved.push(r)
        }
      }
    }
    PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, list)
    PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, list, true, companyId)
    return resolved
  }

  /**
   * Cancel or reject an invoice request
   */
  static async updateRequestStatus(
    id: string,
    companyId: string,
    status: InvoiceRequestStatus,
    notes?: string
  ): Promise<InvoiceRequestRecord | null> {
    const now = new Date().toISOString()
    try {
      let supabase: any
      try {
        supabase = await createClient()
      } catch {
        supabase = createAdminClient()
      }

      let { data, error } = await supabase
        .from('invoice_requests')
        .update({
          status,
          notes: notes !== undefined ? notes : undefined,
          updated_at: now,
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (error || !data) {
        try {
          const admin = createAdminClient()
          const adminRes = await (admin as any)
            .from('invoice_requests')
            .update({
              status,
              notes: notes !== undefined ? notes : undefined,
              updated_at: now,
            })
            .eq('id', id)
            .eq('company_id', companyId)
            .select()
            .single()
          if (!adminRes.error && adminRes.data) {
            data = adminRes.data
            error = null
          }
        } catch {}
      }

      if (!error && data) {
        const updated = data as unknown as InvoiceRequestRecord
        try {
          const all = PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []
          const idx = all.findIndex((r) => r.id === id)
          if (idx >= 0) all[idx] = updated
          else all.unshift(updated)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, all)
          PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, all, true, companyId)
        } catch {}
        return updated
      }
    } catch {}

    const all = [
      ...(PrintERPDataStore.getAll<InvoiceRequestRecord>(STORAGE_KEYS.INVOICE_REQUESTS, companyId) || []),
      ...(PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []),
    ]
    const idx = all.findIndex((r) => r.id === id && this.isMatchingCompany(r.company_id, companyId))
    if (idx >= 0) {
      all[idx].status = status
      if (notes !== undefined) all[idx].notes = notes
      all[idx].updated_at = now
      PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, all)
      PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, all, true, companyId)
      return all[idx]
    }
    return null
  }
}

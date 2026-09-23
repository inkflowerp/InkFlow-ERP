// ==============================================================================
// PrintERP / InkFlow SaaS - Purchase Repository (V5)
// Multi-Tenant PostgreSQL Purchase Requests, Orders, Goods Receipts & Returns
// ==============================================================================

import { createClient } from '../supabase/server.ts'
import type {
  PurchaseRequestRecord,
  PurchaseRequestItemRecord,
  PurchaseOrderRecord,
  PurchaseOrderItemRecord,
  GoodsReceivedNoteRecord,
  GoodsReceivedNoteItemRecord,
  SupplierReturnRecord,
  SupplierReturnItemRecord,
} from '../../types/purchase.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class PurchaseRepository {
  // ==========================================
  // PURCHASE REQUESTS
  // ==========================================

  static async getPurchaseRequests(
    companyId: string,
    options?: { branchId?: string | null; status?: string; search?: string }
  ): Promise<PurchaseRequestRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('purchase_requests')
        .select('*, items:purchase_request_items(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.branchId) {
        query = query.or(`branch_id.eq.${options.branchId},branch_id.is.null`)
      }
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }
      if (options?.search) {
        const q = `%${options.search}%`
        query = query.or(`pr_number.ilike.${q},requested_by_name.ilike.${q},reason.ilike.${q}`)
      }

      const { data, error } = await query
      if (!error && data) return data as unknown as PurchaseRequestRecord[]
    } catch {}

    const all = PrintERPDataStore.get<PurchaseRequestRecord[]>(STORAGE_KEYS.PURCHASE_REQUESTS) || []
    return all.filter((r) => {
      if (r.company_id && r.company_id !== companyId) return false
      if (options?.status && options.status !== 'all' && r.status !== options.status) return false
      if (options?.search) {
        const q = options.search.toLowerCase()
        const match =
          r.pr_number.toLowerCase().includes(q) ||
          r.requested_by_name.toLowerCase().includes(q) ||
          (r.reason && r.reason.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }

  static async getPurchaseRequestById(id: string, companyId: string): Promise<PurchaseRequestRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('purchase_requests')
        .select('*, items:purchase_request_items(*)')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) return data as unknown as PurchaseRequestRecord
    } catch {}

    const all = PrintERPDataStore.get<PurchaseRequestRecord[]>(STORAGE_KEYS.PURCHASE_REQUESTS) || []
    return all.find((r) => (r.id === id || r.pr_number === id) && (!r.company_id || r.company_id === companyId)) || null
  }

  static async createPurchaseRequest(data: Partial<PurchaseRequestRecord> & {
    company_id: string
    requested_by_name: string
    items: PurchaseRequestItemRecord[]
  }): Promise<PurchaseRequestRecord> {
    const prId = data.id || crypto.randomUUID()
    const prNumber = data.pr_number || `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    const items = (data.items || []).map((item) => ({
      id: item.id || crypto.randomUUID(),
      purchase_request_id: prId,
      material_id: item.material_id || null,
      material_name: item.material_name,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'pcs',
      required_date: item.required_date || null,
      estimated_unit_price: Number(item.estimated_unit_price) || 0,
      estimated_amount: (Number(item.quantity) || 1) * (Number(item.estimated_unit_price) || 0),
      preferred_supplier_id: item.preferred_supplier_id || null,
      notes: item.notes || null,
      created_at: new Date().toISOString(),
    }))

    const payload: PurchaseRequestRecord = {
      id: prId,
      company_id: data.company_id,
      branch_id: data.branch_id || null,
      pr_number: prNumber,
      department: data.department || 'Production',
      requested_by_id: data.requested_by_id || null,
      requested_by_name: data.requested_by_name,
      request_date: data.request_date || new Date().toISOString().split('T')[0],
      required_date: data.required_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      priority: data.priority || 'normal',
      supplier_id: data.supplier_id || null,
      supplier_name: data.supplier_name || null,
      reason: data.reason || null,
      notes: data.notes || null,
      status: data.status || 'submitted',
      approved_by_id: data.approved_by_id || null,
      approved_by_name: data.approved_by_name || null,
      approved_at: data.approved_at || null,
      rejection_reason: data.rejection_reason || null,
      items,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: prData, error: prErr } = await (supabase as any)
        .from('purchase_requests')
        .insert({
          id: payload.id,
          company_id: payload.company_id,
          branch_id: payload.branch_id,
          pr_number: payload.pr_number,
          department: payload.department,
          requested_by_id: payload.requested_by_id,
          requested_by_name: payload.requested_by_name,
          request_date: payload.request_date,
          required_date: payload.required_date,
          priority: payload.priority,
          supplier_id: payload.supplier_id,
          reason: payload.reason,
          notes: payload.notes,
          status: payload.status,
          created_at: payload.created_at,
          updated_at: payload.updated_at,
        })
        .select()
        .single()

      if (!prErr && prData) {
        if (items.length > 0) {
          await (supabase as any).from('purchase_request_items').insert(items)
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.PURCHASE_REQUESTS, payload)
        return payload
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.PURCHASE_REQUESTS, payload)
    return payload
  }

  static async updatePurchaseRequest(
    id: string,
    updates: Partial<PurchaseRequestRecord>,
    companyId: string
  ): Promise<PurchaseRequestRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('purchase_requests')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select('*, items:purchase_request_items(*)')
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<PurchaseRequestRecord>(STORAGE_KEYS.PURCHASE_REQUESTS, id, data)
        return data as unknown as PurchaseRequestRecord
      }
    } catch {}

    return PrintERPDataStore.updateItem<PurchaseRequestRecord>(STORAGE_KEYS.PURCHASE_REQUESTS, id, payload)
  }

  // ==========================================
  // PURCHASE ORDERS
  // ==========================================

  static async getPurchaseOrders(
    companyId: string,
    options?: { branchId?: string | null; status?: string; supplierId?: string; search?: string }
  ): Promise<PurchaseOrderRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('purchase_orders')
        .select('*, items:purchase_order_items(*), grns:goods_received_notes(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.branchId) {
        query = query.or(`branch_id.eq.${options.branchId},branch_id.is.null`)
      }
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }
      if (options?.supplierId) {
        query = query.eq('supplier_id', options.supplierId)
      }
      if (options?.search) {
        const q = `%${options.search}%`
        query = query.or(`po_number.ilike.${q},supplier_name.ilike.${q},supplier_phone.ilike.${q}`)
      }

      const { data, error } = await query
      if (!error && data) return data as unknown as PurchaseOrderRecord[]
    } catch {}

    const all = PrintERPDataStore.get<PurchaseOrderRecord[]>(STORAGE_KEYS.PURCHASE_ORDERS) || []
    return all.filter((po) => {
      if (po.company_id && po.company_id !== companyId) return false
      if (options?.status && options.status !== 'all' && po.status !== options.status) return false
      if (options?.supplierId && po.supplier_id !== options.supplierId) return false
      if (options?.search) {
        const q = options.search.toLowerCase()
        const match =
          po.po_number.toLowerCase().includes(q) ||
          po.supplier_name.toLowerCase().includes(q) ||
          po.supplier_phone.includes(q)
        if (!match) return false
      }
      return true
    })
  }

  static async getPurchaseOrderById(id: string, companyId: string): Promise<PurchaseOrderRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('purchase_orders')
        .select('*, items:purchase_order_items(*), grns:goods_received_notes(*)')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) return data as unknown as PurchaseOrderRecord
    } catch {}

    const all = PrintERPDataStore.get<PurchaseOrderRecord[]>(STORAGE_KEYS.PURCHASE_ORDERS) || []
    return all.find((po) => (po.id === id || po.po_number === id) && (!po.company_id || po.company_id === companyId)) || null
  }

  static async createPurchaseOrder(data: Partial<PurchaseOrderRecord> & {
    company_id: string
    supplier_id: string
    supplier_name: string
    supplier_phone: string
    items: PurchaseOrderItemRecord[]
  }): Promise<PurchaseOrderRecord> {
    const poId = data.id || crypto.randomUUID()
    const poNumber = data.po_number || `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    let subtotal = 0
    const items = (data.items || []).map((item) => {
      const qtyOrdered = Number(item.quantity_ordered) || 1
      const unitCost = Number(item.unit_cost) || 0
      const discountPct = Number(item.discount_percent) || 0
      const lineCost = qtyOrdered * unitCost * (1 - discountPct / 100)
      subtotal += lineCost

      return {
        id: item.id || crypto.randomUUID(),
        purchase_order_id: poId,
        material_id: item.material_id,
        material_name: item.material_name,
        supplier_sku: item.supplier_sku || null,
        roll_width_ft: item.roll_width_ft ?? null,
        roll_length_ft: item.roll_length_ft ?? null,
        roll_id: item.roll_id ?? null,
        batch_lot_number: item.batch_lot_number ?? null,
        quantity_ordered: qtyOrdered,
        quantity_received: Number(item.quantity_received) || 0,
        quantity_remaining: qtyOrdered - (Number(item.quantity_received) || 0),
        unit: item.unit || 'pcs',
        unit_cost: unitCost,
        discount_percent: discountPct,
        tax_percent: Number(item.tax_percent) || 0,
        total_cost: lineCost,
        expected_date: item.expected_date || null,
        notes: item.notes || null,
      }
    })

    const vatAmount = Number(data.vat_amount) || 0
    const discountAmount = Number(data.discount_amount) || 0
    const shippingCost = Number(data.shipping_cost) || 0
    const otherCharges = Number(data.other_charges) || 0
    const grandTotal = Math.max(0, subtotal + vatAmount + shippingCost + otherCharges - discountAmount)

    const payload: PurchaseOrderRecord = {
      id: poId,
      company_id: data.company_id,
      branch_id: data.branch_id || null,
      po_number: poNumber,
      purchase_request_id: data.purchase_request_id || null,
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      supplier_phone: data.supplier_phone,
      supplier_email: data.supplier_email || null,
      supplier_address: data.supplier_address || null,
      supplier_reference: data.supplier_reference || null,
      po_date: data.po_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: data.expected_delivery_date || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      currency: data.currency || 'BDT',
      payment_terms: data.payment_terms || 'credit_15',
      status: data.status || 'draft',
      subtotal,
      vat_amount: vatAmount,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      other_charges: otherCharges,
      grand_total: grandTotal,
      paid_amount: Number(data.paid_amount) || 0,
      due_amount: grandTotal - (Number(data.paid_amount) || 0),
      notes: data.notes || null,
      terms_and_conditions: data.terms_and_conditions || null,
      created_by_name: data.created_by_name || 'Procurement Officer',
      approved_by_id: data.approved_by_id || null,
      approved_by_name: data.approved_by_name || null,
      approved_at: data.approved_at || null,
      items,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: poData, error: poErr } = await (supabase as any)
        .from('purchase_orders')
        .insert({
          id: payload.id,
          company_id: payload.company_id,
          branch_id: payload.branch_id,
          po_number: payload.po_number,
          purchase_request_id: payload.purchase_request_id,
          supplier_id: payload.supplier_id,
          supplier_name: payload.supplier_name,
          supplier_phone: payload.supplier_phone,
          supplier_email: payload.supplier_email,
          supplier_address: payload.supplier_address,
          supplier_reference: payload.supplier_reference,
          po_date: payload.po_date,
          expected_delivery_date: payload.expected_delivery_date,
          currency: payload.currency,
          payment_terms: payload.payment_terms,
          status: payload.status,
          subtotal: payload.subtotal,
          vat_amount: payload.vat_amount,
          discount_amount: payload.discount_amount,
          shipping_cost: payload.shipping_cost,
          other_charges: payload.other_charges,
          grand_total: payload.grand_total,
          paid_amount: payload.paid_amount,
          due_amount: payload.due_amount,
          notes: payload.notes,
          terms_and_conditions: payload.terms_and_conditions,
          created_by_name: payload.created_by_name,
          created_at: payload.created_at,
          updated_at: payload.updated_at,
        })
        .select()
        .single()

      if (!poErr && poData) {
        if (items.length > 0) {
          await (supabase as any).from('purchase_order_items').insert(items)
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.PURCHASE_ORDERS, payload)
        return payload
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.PURCHASE_ORDERS, payload)
    return payload
  }

  static async updatePurchaseOrder(
    id: string,
    updates: Partial<PurchaseOrderRecord>,
    companyId: string
  ): Promise<PurchaseOrderRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('purchase_orders')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select('*, items:purchase_order_items(*)')
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<PurchaseOrderRecord>(STORAGE_KEYS.PURCHASE_ORDERS, id, data)
        return data as unknown as PurchaseOrderRecord
      }
    } catch {}

    return PrintERPDataStore.updateItem<PurchaseOrderRecord>(STORAGE_KEYS.PURCHASE_ORDERS, id, payload)
  }

  // ==========================================
  // GOODS RECEIVED NOTES (GRN)
  // ==========================================

  static async getGoodsReceivedNotes(
    companyId: string,
    options?: { poId?: string; supplierId?: string }
  ): Promise<GoodsReceivedNoteRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('goods_received_notes')
        .select('*, items_received:goods_received_note_items(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.poId) query = query.eq('purchase_order_id', options.poId)
      if (options?.supplierId) query = query.eq('supplier_id', options.supplierId)

      const { data, error } = await query
      if (!error && data) return data as unknown as GoodsReceivedNoteRecord[]
    } catch {}

    const all = PrintERPDataStore.get<GoodsReceivedNoteRecord[]>(STORAGE_KEYS.GOODS_RECEIVED_NOTES) || []
    return all.filter((grn) => {
      if (grn.company_id && grn.company_id !== companyId) return false
      if (options?.poId && grn.purchase_order_id !== options.poId) return false
      if (options?.supplierId && grn.supplier_id !== options.supplierId) return false
      return true
    })
  }

  static async createGoodsReceivedNote(data: Partial<GoodsReceivedNoteRecord> & {
    company_id: string
    purchase_order_id: string
    supplier_name: string
    received_by_name: string
    items_received: GoodsReceivedNoteItemRecord[]
  }): Promise<GoodsReceivedNoteRecord> {
    const grnId = data.id || crypto.randomUUID()
    const grnNumber = data.grn_number || `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    let acceptedTotal = 0
    let rejectedTotal = 0
    let damagedTotal = 0

    const items = (data.items_received || []).map((item) => {
      const accepted = Number(item.accepted_quantity) || 0
      const rejected = Number(item.rejected_quantity) || 0
      const damaged = Number(item.damaged_quantity) || 0
      const unitCost = Number(item.unit_cost) || 0

      acceptedTotal += accepted * unitCost
      rejectedTotal += rejected * unitCost
      damagedTotal += damaged * unitCost

      return {
        id: item.id || crypto.randomUUID(),
        grn_id: grnId,
        po_item_id: item.po_item_id || null,
        material_id: item.material_id,
        material_name: item.material_name,
        quantity_ordered: Number(item.quantity_ordered) || 0,
        previously_received: Number(item.previously_received) || 0,
        current_received: Number(item.current_received) || (accepted + rejected + damaged),
        accepted_quantity: accepted,
        rejected_quantity: rejected,
        damaged_quantity: damaged,
        unit: item.unit || 'pcs',
        unit_cost: unitCost,
        total_cost: accepted * unitCost,
        batch_lot_number: item.batch_lot_number || null,
        roll_id: item.roll_id || null,
        expiry_date: item.expiry_date || null,
        rejection_reason: item.rejection_reason || null,
        notes: item.notes || null,
        created_at: new Date().toISOString(),
      }
    })

    const payload: GoodsReceivedNoteRecord = {
      id: grnId,
      company_id: data.company_id,
      branch_id: data.branch_id || null,
      grn_number: grnNumber,
      purchase_order_id: data.purchase_order_id,
      supplier_id: data.supplier_id || null,
      supplier_name: data.supplier_name,
      receiving_location_id: data.receiving_location_id || null,
      received_date: data.received_date || new Date().toISOString().split('T')[0],
      challan_number: data.challan_number || null,
      supplier_delivery_note: data.supplier_delivery_note || null,
      supplier_invoice_number: data.supplier_invoice_number || null,
      received_by_name: data.received_by_name,
      status: data.status || 'posted',
      accepted_total: acceptedTotal,
      rejected_total: rejectedTotal,
      damaged_total: damagedTotal,
      posted_at: new Date().toISOString(),
      posted_by_id: data.posted_by_id || null,
      posted_by_name: data.posted_by_name || data.received_by_name,
      notes: data.notes || null,
      items_received: items,
      created_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: grnData, error: grnErr } = await (supabase as any)
        .from('goods_received_notes')
        .insert({
          id: payload.id,
          company_id: payload.company_id,
          branch_id: payload.branch_id,
          grn_number: payload.grn_number,
          purchase_order_id: payload.purchase_order_id,
          supplier_id: payload.supplier_id,
          supplier_name: payload.supplier_name,
          receiving_location_id: payload.receiving_location_id,
          received_date: payload.received_date,
          challan_number: payload.challan_number,
          supplier_delivery_note: payload.supplier_delivery_note,
          supplier_invoice_number: payload.supplier_invoice_number,
          received_by_name: payload.received_by_name,
          status: payload.status,
          accepted_total: payload.accepted_total,
          rejected_total: payload.rejected_total,
          damaged_total: payload.damaged_total,
          posted_at: payload.posted_at,
          posted_by_id: payload.posted_by_id,
          posted_by_name: payload.posted_by_name,
          notes: payload.notes,
          created_at: payload.created_at,
        })
        .select()
        .single()

      if (!grnErr && grnData) {
        if (items.length > 0) {
          await (supabase as any).from('goods_received_note_items').insert(items)
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.GOODS_RECEIVED_NOTES, payload)
        return payload
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.GOODS_RECEIVED_NOTES, payload)
    return payload
  }

  // ==========================================
  // SUPPLIER RETURNS
  // ==========================================

  static async getSupplierReturns(
    companyId: string,
    options?: { supplierId?: string; poId?: string; status?: string }
  ): Promise<SupplierReturnRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('supplier_returns')
        .select('*, items:supplier_return_items(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.supplierId) query = query.eq('supplier_id', options.supplierId)
      if (options?.poId) query = query.eq('purchase_order_id', options.poId)
      if (options?.status && options.status !== 'all') query = query.eq('status', options.status)

      const { data, error } = await query
      if (!error && data) return data as unknown as SupplierReturnRecord[]
    } catch {}

    const all = PrintERPDataStore.get<SupplierReturnRecord[]>(STORAGE_KEYS.SUPPLIER_RETURNS) || []
    return all.filter((r) => {
      if (r.company_id && r.company_id !== companyId) return false
      if (options?.supplierId && r.supplier_id !== options.supplierId) return false
      if (options?.poId && r.purchase_order_id !== options.poId) return false
      if (options?.status && options.status !== 'all' && r.status !== options.status) return false
      return true
    })
  }

  static async createSupplierReturn(data: {
    id?: string
    company_id: string
    branch_id?: string | null
    return_number?: string
    supplier_id: string
    supplier_name: string
    grn_id?: string | null
    purchase_order_id?: string | null
    return_date?: string
    status?: any
    reason: string
    notes?: string | null
    created_by_name: string
    approved_by_id?: string | null
    approved_by_name?: string | null
    approved_at?: string | null
    items: Array<{
      id?: string
      grn_item_id?: string | null
      material_id: string
      material_name: string
      return_quantity: number
      unit: string
      unit_cost: number
      total_amount?: number
      reason?: string | null
      location_id?: string | null
    }>
  }): Promise<SupplierReturnRecord> {
    const retId = data.id || crypto.randomUUID()
    const retNumber = data.return_number || `PRTN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    let totalAmount = 0
    const items = (data.items || []).map((item) => {
      const returnQty = Number(item.return_quantity) || 0
      const unitCost = Number(item.unit_cost) || 0
      const lineTotal = returnQty * unitCost
      totalAmount += lineTotal

      return {
        id: item.id || crypto.randomUUID(),
        return_id: retId,
        grn_item_id: item.grn_item_id || null,
        material_id: item.material_id,
        material_name: item.material_name,
        return_quantity: returnQty,
        unit: item.unit || 'pcs',
        unit_cost: unitCost,
        total_amount: lineTotal,
        reason: item.reason || data.reason,
        location_id: item.location_id || null,
        created_at: new Date().toISOString(),
      }
    })

    const payload: SupplierReturnRecord = {
      id: retId,
      company_id: data.company_id,
      branch_id: data.branch_id || null,
      return_number: retNumber,
      grn_id: data.grn_id || null,
      purchase_order_id: data.purchase_order_id || null,
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      return_date: data.return_date || new Date().toISOString().split('T')[0],
      status: data.status || 'draft',
      reason: data.reason,
      total_return_amount: totalAmount,
      approved_by_id: data.approved_by_id || null,
      approved_by_name: data.approved_by_name || null,
      approved_at: data.approved_at || null,
      notes: data.notes || null,
      created_by_name: data.created_by_name,
      items,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data: retData, error: retErr } = await (supabase as any)
        .from('supplier_returns')
        .insert({
          id: payload.id,
          company_id: payload.company_id,
          branch_id: payload.branch_id,
          return_number: payload.return_number,
          grn_id: payload.grn_id,
          purchase_order_id: payload.purchase_order_id,
          supplier_id: payload.supplier_id,
          supplier_name: payload.supplier_name,
          return_date: payload.return_date,
          status: payload.status,
          reason: payload.reason,
          total_return_amount: payload.total_return_amount,
          approved_by_id: payload.approved_by_id,
          approved_by_name: payload.approved_by_name,
          approved_at: payload.approved_at,
          notes: payload.notes,
          created_by_name: payload.created_by_name,
          created_at: payload.created_at,
          updated_at: payload.updated_at,
        })
        .select()
        .single()

      if (!retErr && retData) {
        if (items.length > 0) {
          await (supabase as any).from('supplier_return_items').insert(items)
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_RETURNS, payload)
        return payload
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.SUPPLIER_RETURNS, payload)
    return payload
  }
}

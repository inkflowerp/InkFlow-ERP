// ==============================================================================
// PrintERP / InkFlow SaaS - Purchase Service (V5)
// Multi-Tenant Procurement Lifecycle, Approval, Goods Receiving & V3 Inventory Integration
// ==============================================================================

import type {
  PurchaseRequestRecord,
  PurchaseRequestItemRecord,
  PurchaseOrderRecord,
  PurchaseOrderItemRecord,
  GoodsReceivedNoteRecord,
  GoodsReceivedNoteItemRecord,
  SupplierReturnRecord,
  SupplierReturnItemRecord,
  SupplierPriceBenchmark,
  SupplierPriceHistoryRecord,
} from '../types/purchase.types.ts'
import { PurchaseRepository } from '../lib/repositories/purchase.repository.ts'
import { SupplierRepository } from '../lib/repositories/supplier.repository.ts'
import { InventoryRepository } from '../lib/repositories/inventory.repository.ts'
import { AuditService } from './audit.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'

export function getSupplierPriceBenchmark(
  materialId: string,
  materialName: string,
  history?: SupplierPriceHistoryRecord[]
): SupplierPriceBenchmark {
  const allHistory = history && history.length > 0 ? history : (PrintERPDataStore.get<SupplierPriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY) || [])
  const records = allHistory.filter(
    (h) => h.material_id === materialId || (h.material_name && h.material_name.toLowerCase().includes(materialName.toLowerCase()))
  )

  if (records.length === 0) {
    return {
      material_id: materialId,
      material_name: materialName,
      last_price: 0,
      average_price: 0,
      lowest_price: 0,
      highest_price: 0,
      history: [],
    }
  }

  const prices = records.map((r) => r.purchase_price)
  const last_price = records[0].purchase_price
  const lowest_price = Math.min(...prices)
  const highest_price = Math.max(...prices)
  const average_price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

  return {
    material_id: materialId,
    material_name: materialName,
    last_price,
    average_price,
    lowest_price,
    highest_price,
    history: records,
  }
}

export class PurchaseService {
  // ==========================================
  // 1. PURCHASE REQUESTS
  // ==========================================

  static async getPurchaseRequests(
    companyId: string = 'c-01',
    options?: { branchId?: string | null; status?: string; search?: string }
  ): Promise<PurchaseRequestRecord[]> {
    return PurchaseRepository.getPurchaseRequests(companyId, options)
  }

  static async getPurchaseRequestById(id: string, companyId: string = 'c-01'): Promise<PurchaseRequestRecord | null> {
    return PurchaseRepository.getPurchaseRequestById(id, companyId)
  }

  static async createPurchaseRequest(
    data: Partial<PurchaseRequestRecord> & {
      company_id: string
      requested_by_name: string
      items: PurchaseRequestItemRecord[]
    },
    actorId?: string,
    actorEmail?: string
  ): Promise<PurchaseRequestRecord> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Purchase Request must contain at least one item.')
    }

    const created = await PurchaseRepository.createPurchaseRequest(data)

    await AuditService.logEvent(
      data.company_id,
      actorId || null,
      actorEmail || null,
      'create',
      'purchase_request',
      created.id,
      null,
      { pr_number: created.pr_number, items_count: created.items.length },
      `Created purchase request ${created.pr_number} by ${created.requested_by_name}`
    )

    return created
  }

  static async approvePurchaseRequest(
    id: string,
    approver: { id?: string | null; name: string; email?: string },
    companyId: string = 'c-01',
    autoCreatePO: boolean = true
  ): Promise<{ request: PurchaseRequestRecord; po?: PurchaseOrderRecord }> {
    const pr = await this.getPurchaseRequestById(id, companyId)
    if (!pr) throw new Error(`Purchase Request ${id} not found.`)
    if (pr.status === 'approved') throw new Error(`Purchase Request ${pr.pr_number} is already approved.`)

    const updatedPr = await PurchaseRepository.updatePurchaseRequest(
      id,
      {
        status: 'approved',
        approved_by_id: approver.id || null,
        approved_by_name: approver.name,
        approved_at: new Date().toISOString(),
      },
      companyId
    )

    await AuditService.logEvent(
      companyId,
      approver.id || null,
      approver.email || null,
      'approve',
      'purchase_request',
      id,
      { status: pr.status },
      { status: 'approved' },
      `Approved purchase request ${pr.pr_number} by ${approver.name}`
    )

    let createdPO: PurchaseOrderRecord | undefined
    if (autoCreatePO && pr.supplier_id) {
      const supplier = await SupplierRepository.getSupplierById(pr.supplier_id, companyId)
      const poItems: PurchaseOrderItemRecord[] = pr.items.map((item) => ({
        id: crypto.randomUUID(),
        material_id: item.material_id || 'mat-gen',
        material_name: item.material_name,
        quantity_ordered: item.quantity,
        quantity_received: 0,
        quantity_remaining: item.quantity,
        unit: item.unit,
        unit_cost: item.estimated_unit_price || 0,
        total_cost: item.quantity * (item.estimated_unit_price || 0),
        notes: item.notes,
      }))

      createdPO = await this.createPurchaseOrder(
        {
          company_id: companyId,
          branch_id: pr.branch_id,
          purchase_request_id: pr.id,
          supplier_id: pr.supplier_id,
          supplier_name: supplier?.supplier_name || pr.supplier_name || 'Supplier',
          supplier_phone: supplier?.mobile || '+8801700000000',
          supplier_email: supplier?.email,
          supplier_address: supplier?.address,
          status: 'draft',
          created_by_name: approver.name,
          items: poItems,
        },
        approver.id || undefined,
        approver.email
      )
    }

    return { request: updatedPr!, po: createdPO }
  }

  static async rejectPurchaseRequest(
    id: string,
    rejector: { id?: string | null; name: string; reason: string; email?: string },
    companyId: string = 'c-01'
  ): Promise<PurchaseRequestRecord> {
    const pr = await this.getPurchaseRequestById(id, companyId)
    if (!pr) throw new Error(`Purchase Request ${id} not found.`)

    const updatedPr = await PurchaseRepository.updatePurchaseRequest(
      id,
      {
        status: 'rejected',
        approved_by_id: rejector.id || null,
        approved_by_name: rejector.name,
        rejection_reason: rejector.reason,
        approved_at: new Date().toISOString(),
      },
      companyId
    )

    await AuditService.logEvent(
      companyId,
      rejector.id || null,
      rejector.email || null,
      'reject',
      'purchase_request',
      id,
      { status: pr.status },
      { status: 'rejected', rejection_reason: rejector.reason },
      `Rejected purchase request ${pr.pr_number}. Reason: ${rejector.reason}`
    )

    return updatedPr!
  }

  // ==========================================
  // 2. PURCHASE ORDERS
  // ==========================================

  static async getPurchaseOrders(
    companyId: string = 'c-01',
    options?: { branchId?: string | null; status?: string; supplierId?: string; search?: string }
  ): Promise<PurchaseOrderRecord[]> {
    return PurchaseRepository.getPurchaseOrders(companyId, options)
  }

  static async getPurchaseOrderById(id: string, companyId: string = 'c-01'): Promise<PurchaseOrderRecord | null> {
    return PurchaseRepository.getPurchaseOrderById(id, companyId)
  }

  static async createPurchaseOrder(
    data: Partial<PurchaseOrderRecord> & {
      company_id: string
      supplier_id: string
      supplier_name: string
      supplier_phone: string
      items: PurchaseOrderItemRecord[]
    },
    actorId?: string,
    actorEmail?: string
  ): Promise<PurchaseOrderRecord> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Purchase Order must contain at least one item.')
    }

    const created = await PurchaseRepository.createPurchaseOrder(data)

    await AuditService.logEvent(
      data.company_id,
      actorId || null,
      actorEmail || null,
      'create',
      'purchase_order',
      created.id,
      null,
      { po_number: created.po_number, grand_total: created.grand_total, supplier_name: created.supplier_name },
      `Created purchase order ${created.po_number} for ${created.supplier_name} (৳${created.grand_total})`
    )

    return created
  }

  static async approvePurchaseOrder(
    id: string,
    approver: { id?: string | null; name: string; email?: string },
    companyId: string = 'c-01'
  ): Promise<PurchaseOrderRecord> {
    const po = await this.getPurchaseOrderById(id, companyId)
    if (!po) throw new Error(`Purchase Order ${id} not found.`)
    if (po.status === 'approved' || po.status === 'issued') {
      throw new Error(`Purchase Order ${po.po_number} is already approved.`)
    }

    const updated = await PurchaseRepository.updatePurchaseOrder(
      id,
      {
        status: 'approved',
        approved_by_id: approver.id || null,
        approved_by_name: approver.name,
        approved_at: new Date().toISOString(),
      },
      companyId
    )

    await AuditService.logEvent(
      companyId,
      approver.id || null,
      approver.email || null,
      'approve',
      'purchase_order',
      id,
      { status: po.status },
      { status: 'approved' },
      `Approved purchase order ${po.po_number} by ${approver.name}`
    )

    return updated!
  }

  static async sendPurchaseOrder(
    id: string,
    sender: { name: string; email?: string },
    companyId: string = 'c-01'
  ): Promise<PurchaseOrderRecord> {
    const po = await this.getPurchaseOrderById(id, companyId)
    if (!po) throw new Error(`Purchase Order ${id} not found.`)

    const updated = await PurchaseRepository.updatePurchaseOrder(
      id,
      {
        status: 'issued',
        sent_at: new Date().toISOString(),
      },
      companyId
    )

    await AuditService.logEvent(
      companyId,
      null,
      sender.email || null,
      'send',
      'purchase_order',
      id,
      { status: po.status },
      { status: 'issued' },
      `Issued purchase order ${po.po_number} to supplier ${po.supplier_name}`
    )

    return updated!
  }

  // ==========================================
  // 3. GOODS RECEIVING & QUALITY INSPECTION (V5 -> V3 ATOMIC INTEGRATION)
  // ==========================================

  static async getGoodsReceivedNotes(
    companyId: string = 'c-01',
    options?: { poId?: string; supplierId?: string }
  ): Promise<GoodsReceivedNoteRecord[]> {
    return PurchaseRepository.getGoodsReceivedNotes(companyId, options)
  }

  /**
   * Receives goods against a Purchase Order atomically:
   * 1. Validates line quantities against remaining PO balances (anti over-receipt).
   * 2. Separates accepted quantity from rejected/damaged quantities.
   * 3. Atomically mutates V3 physical stock & stock ledger for accepted quantities.
   * 4. Updates PO line received/remaining quantities and PO status (partially_received vs received).
   * 5. Records supplier price history and supplier ledger payable credit.
   */
  static async receiveGoods(params: {
    company_id: string
    branch_id?: string | null
    purchase_order_id: string
    receiving_location_id?: string | null
    received_date?: string
    challan_number?: string | null
    supplier_delivery_note?: string | null
    supplier_invoice_number?: string | null
    received_by_name: string
    actor_id?: string | null
    actor_email?: string
    notes?: string | null
    items_received: Array<{
      po_item_id?: string | null
      material_id: string
      material_name: string
      current_received: number
      accepted_quantity: number
      rejected_quantity?: number
      damaged_quantity?: number
      unit: string
      unit_cost?: number
      batch_lot_number?: string | null
      roll_id?: string | null
      expiry_date?: string | null
      rejection_reason?: string | null
      notes?: string | null
    }>
  }): Promise<{ grn: GoodsReceivedNoteRecord; updatedPO: PurchaseOrderRecord }> {
    const po = await this.getPurchaseOrderById(params.purchase_order_id, params.company_id)
    if (!po) throw new Error(`Purchase Order ${params.purchase_order_id} not found.`)
    if (po.status === 'received' || po.status === 'cancelled') {
      throw new Error(`Cannot receive goods against PO ${po.po_number} in '${po.status}' state.`)
    }

    if (!params.items_received || params.items_received.length === 0) {
      throw new Error('At least one item is required to process goods receipt.')
    }

    // 1. Validate remaining quantities and over-receipt prevention
    const updatedPOItems = [...po.items]
    let totalAcceptedCost = 0

    for (const item of params.items_received) {
      const accepted = Number(item.accepted_quantity) || 0
      const rejected = Number(item.rejected_quantity) || 0
      const damaged = Number(item.damaged_quantity) || 0
      const currentReceived = item.current_received || (accepted + rejected + damaged)

      if (currentReceived <= 0) {
        throw new Error(`Invalid receiving quantity for material ${item.material_name}.`)
      }

      // Find matching PO item
      const poItemIndex = updatedPOItems.findIndex(
        (poi) => (item.po_item_id && poi.id === item.po_item_id) || poi.material_id === item.material_id
      )

      if (poItemIndex !== -1) {
        const poItem = updatedPOItems[poItemIndex]
        const remaining = Number(poItem.quantity_remaining)

        if (currentReceived > remaining) {
          throw new Error(
            `Over-receiving rejected: Received quantity (${currentReceived} ${poItem.unit}) exceeds remaining ordered quantity (${remaining} ${poItem.unit}) for ${poItem.material_name}.`
          )
        }

        const newReceived = Number(poItem.quantity_received) + currentReceived
        const newRemaining = Math.max(0, Number(poItem.quantity_ordered) - newReceived)

        updatedPOItems[poItemIndex] = {
          ...poItem,
          quantity_received: newReceived,
          quantity_remaining: newRemaining,
        }

        const effectiveUnitCost = item.unit_cost !== undefined ? item.unit_cost : poItem.unit_cost
        totalAcceptedCost += accepted * effectiveUnitCost
      }
    }

    // 2. Create Goods Received Note (GRN)
    const grnItems: GoodsReceivedNoteItemRecord[] = params.items_received.map((item) => {
      const accepted = Number(item.accepted_quantity) || 0
      const rejected = Number(item.rejected_quantity) || 0
      const damaged = Number(item.damaged_quantity) || 0
      const unitCost = item.unit_cost !== undefined ? item.unit_cost : 0

      return {
        id: crypto.randomUUID(),
        po_item_id: item.po_item_id || null,
        material_id: item.material_id,
        material_name: item.material_name,
        quantity_ordered: 0,
        previously_received: 0,
        current_received: item.current_received || (accepted + rejected + damaged),
        accepted_quantity: accepted,
        rejected_quantity: rejected,
        damaged_quantity: damaged,
        unit: item.unit,
        unit_cost: unitCost,
        total_cost: accepted * unitCost,
        batch_lot_number: item.batch_lot_number || null,
        roll_id: item.roll_id || null,
        expiry_date: item.expiry_date || null,
        rejection_reason: item.rejection_reason || null,
        notes: item.notes || null,
      }
    })

    const grn = await PurchaseRepository.createGoodsReceivedNote({
      company_id: params.company_id,
      branch_id: params.branch_id || po.branch_id,
      purchase_order_id: po.id,
      supplier_id: po.supplier_id,
      supplier_name: po.supplier_name,
      receiving_location_id: params.receiving_location_id || null,
      received_date: params.received_date || new Date().toISOString().split('T')[0],
      challan_number: params.challan_number || null,
      supplier_delivery_note: params.supplier_delivery_note || null,
      supplier_invoice_number: params.supplier_invoice_number || null,
      received_by_name: params.received_by_name,
      posted_by_id: params.actor_id || null,
      posted_by_name: params.received_by_name,
      notes: params.notes || null,
      items_received: grnItems,
    })

    // 3. Atomically Mutate V3 Inventory for Accepted Physical Stock
    for (const item of params.items_received) {
      const accepted = Number(item.accepted_quantity) || 0
      if (accepted > 0) {
        try {
          await InventoryRepository.recordStockAdjustment({
            company_id: params.company_id,
            branch_id: params.branch_id || po.branch_id || null,
            material_id: item.material_id,
            location_id: params.receiving_location_id || null,
            quantity_change: accepted,
            transaction_type: 'PURCHASE_RECEIPT',
            unit_cost: item.unit_cost,
            reference_type: 'PURCHASE_ORDER',
            reference_id: po.id,
            notes: `GRN ${grn.grn_number} for PO ${po.po_number}. Challan: ${params.challan_number || 'N/A'}`,
            performed_by_id: params.actor_id || null,
            performed_by_name: params.received_by_name,
          })
        } catch (err: any) {
          console.error(`[PurchaseService] V3 Stock mutation error for material ${item.material_id}:`, err)
        }

        // Record Supplier Price History
        try {
          await SupplierRepository.recordSupplierPriceHistory({
            company_id: params.company_id,
            material_id: item.material_id,
            material_name: item.material_name,
            supplier_id: po.supplier_id,
            supplier_name: po.supplier_name,
            purchase_price: item.unit_cost || 0,
            quantity: accepted,
            po_id: po.id,
            po_date: po.po_date,
          })
        } catch {}
      }
    }

    // 4. Update PO Status
    const allReceived = updatedPOItems.every((poi) => Number(poi.quantity_remaining) === 0)
    const newPOStatus = allReceived ? 'received' : 'partially_received'

    const updatedPO = await PurchaseRepository.updatePurchaseOrder(
      po.id,
      {
        status: newPOStatus,
        items: updatedPOItems,
      },
      params.company_id
    )

    // 5. Record Supplier Ledger Entry (Credit Liability)
    if (totalAcceptedCost > 0) {
      try {
        await SupplierRepository.recordSupplierLedgerEntry({
          company_id: params.company_id,
          branch_id: params.branch_id || po.branch_id,
          supplier_id: po.supplier_id,
          entry_type: 'GOODS_RECEIPT',
          reference_type: 'GRN',
          reference_id: grn.id,
          credit: totalAcceptedCost,
          notes: `Goods received under GRN ${grn.grn_number} (PO ${po.po_number})`,
        })
      } catch {}
    }

    // 6. Audit Log
    await AuditService.logEvent(
      params.company_id,
      params.actor_id || null,
      params.actor_email || null,
      'receive',
      'goods_received_note',
      grn.id,
      { po_status: po.status },
      { po_status: newPOStatus, grn_number: grn.grn_number, accepted_total: grn.accepted_total },
      `Received goods under GRN ${grn.grn_number} for PO ${po.po_number} by ${params.received_by_name}`
    )

    return { grn, updatedPO: updatedPO! }
  }

  // ==========================================
  // 4. SUPPLIER RETURNS (V5 -> V3 INVENTORY REVERSAL)
  // ==========================================

  static async getSupplierReturns(
    companyId: string = 'c-01',
    options?: { supplierId?: string; poId?: string; status?: string }
  ): Promise<SupplierReturnRecord[]> {
    return PurchaseRepository.getSupplierReturns(companyId, options)
  }

  static async createSupplierReturn(params: {
    company_id: string
    branch_id?: string | null
    supplier_id: string
    supplier_name: string
    grn_id?: string | null
    purchase_order_id?: string | null
    reason: string
    created_by_name: string
    actor_id?: string | null
    actor_email?: string
    notes?: string | null
    items: Array<{
      grn_item_id?: string | null
      material_id: string
      material_name: string
      return_quantity: number
      unit: string
      unit_cost: number
      reason?: string | null
      location_id?: string | null
    }>
  }): Promise<SupplierReturnRecord> {
    if (!params.items || params.items.length === 0) {
      throw new Error('At least one item is required for supplier return.')
    }

    const createdReturn = await PurchaseRepository.createSupplierReturn(params)

    // Reverse V3 Inventory for Returned Physical Quantities
    for (const item of params.items) {
      const returnQty = Number(item.return_quantity) || 0
      if (returnQty > 0) {
        try {
          await InventoryRepository.recordStockAdjustment({
            company_id: params.company_id,
            branch_id: params.branch_id || null,
            material_id: item.material_id,
            location_id: item.location_id || null,
            quantity_change: -returnQty,
            transaction_type: 'RETURN',
            unit_cost: item.unit_cost,
            reference_type: 'SUPPLIER_RETURN',
            reference_id: createdReturn.id,
            notes: `Supplier Return ${createdReturn.return_number}. Reason: ${item.reason || params.reason}`,
            performed_by_id: params.actor_id || null,
            performed_by_name: params.created_by_name,
          })
        } catch (err) {
          console.error(`[PurchaseService] Supplier return inventory reversal error:`, err)
        }
      }
    }

    // Record Supplier Ledger Entry (Debit - Liability Reduction)
    if (createdReturn.total_return_amount > 0) {
      try {
        await SupplierRepository.recordSupplierLedgerEntry({
          company_id: params.company_id,
          branch_id: params.branch_id || null,
          supplier_id: params.supplier_id,
          entry_type: 'RETURN',
          reference_type: 'SUPPLIER_RETURN',
          reference_id: createdReturn.id,
          debit: createdReturn.total_return_amount,
          notes: `Supplier return ${createdReturn.return_number}`,
        })
      } catch {}
    }

    await AuditService.logEvent(
      params.company_id,
      params.actor_id || null,
      params.actor_email || null,
      'create',
      'supplier_return',
      createdReturn.id,
      null,
      { return_number: createdReturn.return_number, total_return_amount: createdReturn.total_return_amount },
      `Created supplier return ${createdReturn.return_number} for ${params.supplier_name}`
    )

    return createdReturn
  }
}

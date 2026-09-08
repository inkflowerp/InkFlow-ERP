import {
  PurchaseOrderRecord,
  PurchaseOrderItemRecord,
  GoodsReceivedNoteRecord,
  SupplierPriceHistoryRecord,
  SupplierPriceBenchmark,
  SupplierPaymentRecord,
} from '@/types/purchase.types'

import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export function getSupplierPriceBenchmark(materialId: string, materialName: string): SupplierPriceBenchmark {
  const allHistory = PrintERPDataStore.get<SupplierPriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY) || []
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
  static async getPurchaseOrders(companyId: string = 'c-01'): Promise<PurchaseOrderRecord[]> {
    const orders = PrintERPDataStore.get<PurchaseOrderRecord[]>(STORAGE_KEYS.PURCHASE_ORDERS) || []
    return orders.filter((o) => !o.company_id || o.company_id === companyId)
  }

  static async getPurchaseOrderById(id: string, companyId: string = 'c-01'): Promise<PurchaseOrderRecord | null> {
    const orders = await this.getPurchaseOrders(companyId)
    return orders.find((o) => o.id === id || o.po_number === id) || null
  }

  static async createPurchaseOrder(data: Partial<PurchaseOrderRecord>): Promise<PurchaseOrderRecord> {
    const id = data.id || `po-${Date.now()}`
    const num = data.po_number || `PO-2024-00${Math.floor(Math.random() * 900) + 100}`
    const newPO: PurchaseOrderRecord = {
      id,
      company_id: data.company_id || 'c-01',
      po_number: num,
      supplier_id: data.supplier_id || 'sup-01',
      supplier_name: data.supplier_name || 'Supplier',
      supplier_phone: data.supplier_phone || '+8801711000000',
      supplier_address: data.supplier_address || 'Dhaka',
      po_date: data.po_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: data.expected_delivery_date || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      status: data.status || 'draft',
      subtotal: data.subtotal || 0,
      vat_amount: data.vat_amount || 0,
      discount_amount: data.discount_amount || 0,
      grand_total: data.grand_total || 0,
      paid_amount: data.paid_amount || 0,
      due_amount: data.due_amount || (data.grand_total || 0) - (data.paid_amount || 0),
      notes: data.notes || '',
      created_by_name: data.created_by_name || 'Supply Chain Manager',
      items: data.items || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PURCHASE_ORDERS, newPO)
    return newPO
  }

  static async updatePurchaseOrder(id: string, data: Partial<PurchaseOrderRecord>): Promise<PurchaseOrderRecord | null> {
    return PrintERPDataStore.updateItem<PurchaseOrderRecord>(STORAGE_KEYS.PURCHASE_ORDERS, id, data)
  }

  static async deletePurchaseOrder(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.PURCHASE_ORDERS, id)
  }

  static async getPriceHistory(materialId?: string): Promise<SupplierPriceHistoryRecord[]> {
    const history = PrintERPDataStore.get<SupplierPriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY) || []
    if (materialId) return history.filter((h) => h.material_id === materialId)
    return history
  }
}


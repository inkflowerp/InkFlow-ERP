import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type { TrashCategory, TrashRecord, TrashSummary } from '../../types/trash.types.ts'

export class TrashRepository {
  /**
   * Retrieves all trashed records for a company, optionally filtered by category
   */
  static async getTrashItems(companyId: string, category?: TrashCategory): Promise<TrashRecord[]> {
    const all = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    return all.filter((item) => {
      const matchCompany = !companyId || item.company_id === companyId || item.company_id === 'default'
      const matchCategory = !category || category === 'all' as any || item.category === category
      return matchCompany && matchCategory
    })
  }

  /**
   * Retrieves summary counts of trashed items
   */
  static async getTrashSummary(companyId: string): Promise<TrashSummary> {
    const items = await this.getTrashItems(companyId)
    return {
      total: items.length,
      quotations: items.filter((i) => i.category === 'quotations').length,
      invoices: items.filter((i) => i.category === 'invoices').length,
      customers: items.filter((i) => i.category === 'customers').length,
      products: items.filter((i) => i.category === 'products').length,
      materials: items.filter((i) => i.category === 'materials').length,
      suppliers: items.filter((i) => i.category === 'suppliers').length,
    }
  }

  /**
   * Moves an active record to Trash
   */
  static async moveToTrash(params: {
    category: TrashCategory
    item: any
    companyId: string
    deletedByName?: string
  }): Promise<TrashRecord> {
    const { category, item, companyId, deletedByName = 'System User' } = params
    const originalId = item.id || item.original_id || `temp-${Date.now()}`

    // Extract title, subtitle, reference number based on category
    let title = 'Deleted Item'
    let subtitle = ''
    let refNum = ''

    if (category === 'quotations') {
      title = item.customer_name ? `Quote: ${item.customer_name}` : `Quotation #${item.quotation_number || originalId}`
      refNum = item.quotation_number || ''
      subtitle = item.items?.[0]?.description || (item.grand_total ? `৳ ${item.grand_total}` : '')
      // Remove from active quotations
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.QUOTATIONS,
        list.filter((q) => q.id !== originalId && q.quotation_number !== item.quotation_number)
      )
    } else if (category === 'invoices') {
      title = item.customer_name ? `Invoice: ${item.customer_name}` : `Invoice #${item.invoice_number || originalId}`
      refNum = item.invoice_number || ''
      subtitle = item.grand_total ? `৳ ${item.grand_total} (${item.status})` : ''
      // Remove from active invoices
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.INVOICES,
        list.filter((i) => i.id !== originalId && i.invoice_number !== item.invoice_number)
      )
    } else if (category === 'customers') {
      title = item.name || 'Customer'
      refNum = item.mobile || item.phone || ''
      subtitle = item.area || item.company_name || 'Customer Profile'
      // Remove from active customers
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.CUSTOMERS,
        list.filter((c) => c.id !== originalId)
      )
    } else if (category === 'products') {
      title = item.name || item.title || 'Product'
      refNum = item.sku || item.code || ''
      subtitle = item.category || (item.base_price ? `৳ ${item.base_price}` : 'Product Catalog Item')
      // Remove from active products
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.PRODUCTS,
        list.filter((p) => p.id !== originalId)
      )
    } else if (category === 'materials') {
      title = item.name || item.material_name || 'Material Item'
      refNum = item.sku || item.item_code || ''
      subtitle = item.category || (item.unit ? `Unit: ${item.unit}` : 'Inventory Stock Item')
      // Remove from active materials
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.MATERIALS,
        list.filter((m) => m.id !== originalId)
      )
    } else if (category === 'suppliers') {
      title = item.name || item.supplier_name || 'Supplier'
      refNum = item.mobile || item.phone || ''
      subtitle = item.contact_person || item.address || 'Vendor / Supplier Profile'
      // Remove from active suppliers
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.SUPPLIERS) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.SUPPLIERS,
        list.filter((s) => s.id !== originalId)
      )
    }

    const trashRecord: TrashRecord = {
      id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company_id: companyId || item.company_id || 'default',
      category,
      original_id: originalId,
      title,
      subtitle,
      reference_number: refNum,
      deleted_at: new Date().toISOString(),
      deleted_by_name: deletedByName,
      payload: item,
    }

    const trashList = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, [trashRecord, ...trashList])

    // Broadcast client sync events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return trashRecord
  }

  /**
   * Restores a record from Trash back to its active collection
   */
  static async restoreFromTrash(trashId: string, companyId: string): Promise<any> {
    const trashList = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    const trashItem = trashList.find((t) => t.id === trashId)

    if (!trashItem) {
      throw new Error(`Trash item with ID ${trashId} not found.`)
    }

    const restoredPayload = trashItem.payload

    if (trashItem.category === 'quotations') {
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
      PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [restoredPayload, ...list])
    } else if (trashItem.category === 'invoices') {
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
      PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [restoredPayload, ...list])
    } else if (trashItem.category === 'customers') {
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [restoredPayload, ...list])
    } else if (trashItem.category === 'products') {
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [restoredPayload, ...list])
    } else if (trashItem.category === 'materials') {
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []
      PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [restoredPayload, ...list])
    } else if (trashItem.category === 'suppliers') {
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.SUPPLIERS) || []
      PrintERPDataStore.set(STORAGE_KEYS.SUPPLIERS, [restoredPayload, ...list])
    }

    // Remove from trash
    PrintERPDataStore.set(
      STORAGE_KEYS.TRASH_ITEMS,
      trashList.filter((t) => t.id !== trashId)
    )

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return restoredPayload
  }

  /**
   * Permanently deletes a record from Trash
   */
  static async permanentDelete(trashId: string, companyId: string): Promise<boolean> {
    const trashList = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    PrintERPDataStore.set(
      STORAGE_KEYS.TRASH_ITEMS,
      trashList.filter((t) => t.id !== trashId)
    )

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return true
  }

  /**
   * Clears all trash items or all items within a category
   */
  static async emptyTrash(companyId: string, category?: TrashCategory): Promise<number> {
    const trashList = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    const toDelete = trashList.filter((t) => {
      const matchCompany = !companyId || t.company_id === companyId || t.company_id === 'default'
      const matchCategory = !category || category === 'all' as any || t.category === category
      return matchCompany && matchCategory
    })

    const remaining = trashList.filter((t) => !toDelete.includes(t))
    PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, remaining)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return toDelete.length
  }
}

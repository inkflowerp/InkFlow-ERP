import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import {
  TRASH_RETENTION_DAYS,
  computeTrashExpiration,
  isTrashExpired,
  type TrashCategory,
  type TrashRecord,
  type TrashSummary,
} from '../../types/trash.types.ts'

function matchesCompany(itemCompanyId?: string, targetCompanyId?: string): boolean {
  if (!targetCompanyId || targetCompanyId === 'default' || targetCompanyId === 'all') return true
  if (!itemCompanyId || itemCompanyId === 'default') return true
  if (itemCompanyId === targetCompanyId) return true
  if (itemCompanyId === 'c-01' || targetCompanyId === 'c-01') return true
  return false
}

export class TrashRepository {
  /**
   * Purges items older than the retention period (default: 30 days) permanently from the database.
   */
  static async purgeExpiredTrash(
    companyId?: string,
    retentionDays: number = TRASH_RETENTION_DAYS
  ): Promise<{ purgedCount: number; purgedIds: string[] }> {
    const all = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    const purgedIds: string[] = []
    const unexpired: TrashRecord[] = []

    for (const item of all) {
      const matchCompany = matchesCompany(item.company_id, companyId)
      if (matchCompany && isTrashExpired(item.expires_at, item.deleted_at, retentionDays)) {
        purgedIds.push(item.id)
      } else {
        unexpired.push(item)
      }
    }

    if (purgedIds.length > 0) {
      PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, unexpired)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
      }
      try {
        const { createAdminClient } = await import('../supabase/admin.ts')
        const admin = createAdminClient()
        for (const pid of purgedIds) {
          await (admin as any).from('audit_logs').delete().eq('action', 'TRASH_ITEM').eq('entity_id', pid)
        }
      } catch {}
    }

    return { purgedCount: purgedIds.length, purgedIds }
  }

  /**
   * Retrieves all trashed records for a company, optionally filtered by category.
   * Automatically executes purgeExpiredTrash so expired records are permanently removed.
   */
  static async getTrashItems(
    companyId: string,
    category?: TrashCategory,
    autoPurge = true
  ): Promise<TrashRecord[]> {
    if (autoPurge) {
      await this.purgeExpiredTrash(companyId)
    }

    let all = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []

    try {
      const { createAdminClient } = await import('../supabase/admin.ts')
      const admin = createAdminClient()
      let query = (admin as any)
        .from('audit_logs')
        .select('new_values')
        .eq('action', 'TRASH_ITEM')
        .order('created_at', { ascending: false })

      if (companyId && companyId !== 'default' && companyId !== 'c-01' && companyId !== 'all') {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`)
      }
      const { data: dbLogs } = await query
      if (Array.isArray(dbLogs) && dbLogs.length > 0) {
        const dbItems: TrashRecord[] = dbLogs
          .map((l: any) => l.new_values)
          .filter(Boolean)
        const map = new Map<string, TrashRecord>()
        dbItems.forEach((item) => map.set(item.id, item))
        all.forEach((item) => {
          if (!map.has(item.id)) map.set(item.id, item)
        })
        all = Array.from(map.values())
        PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, all)
      }
    } catch {
      // In-memory / client fallback
    }

    return all.filter((item) => {
      const matchCompany = matchesCompany(item.company_id, companyId)
      const matchCategory = !category || (category as any) === 'all' || item.category === category
      return matchCompany && matchCategory
    })
  }

  /**
   * Retrieves summary counts of trashed items after auto-purging expired items.
   */
  static async getTrashSummary(companyId: string): Promise<TrashSummary> {
    const items = await this.getTrashItems(companyId, undefined, true)
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
      if (companyId) {
        const compList = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyId) || []
        PrintERPDataStore.set(
          STORAGE_KEYS.QUOTATIONS,
          compList.filter((q) => q.id !== originalId && q.quotation_number !== item.quotation_number),
          true,
          companyId
        )
      }
      try {
        const { createAdminClient } = await import('../supabase/admin.ts')
        const admin = createAdminClient()
        if (originalId && !String(originalId).startsWith('temp-')) {
          await (admin as any).from('quotation_items').delete().eq('quotation_id', originalId)
          await (admin as any).from('quotation_activities').delete().eq('quotation_id', originalId)
          await (admin as any).from('quotations').delete().eq('id', originalId)
        }
        if (refNum) {
          await (admin as any).from('quotations').delete().eq('quotation_number', refNum)
        }
      } catch (dbErr) {
        console.warn('[TrashRepository] Failed to delete quotation from Supabase:', dbErr)
      }
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
      // Remove from active customers in local data store
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      PrintERPDataStore.set(
        STORAGE_KEYS.CUSTOMERS,
        list.filter((c) => c.id !== originalId)
      )
      if (companyId) {
        const compList = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS, companyId) || []
        PrintERPDataStore.set(
          STORAGE_KEYS.CUSTOMERS,
          compList.filter((c) => c.id !== originalId),
          true,
          companyId
        )
      }
      try {
        const { createAdminClient } = await import('../supabase/admin.ts')
        const admin = createAdminClient()
        if (originalId && !String(originalId).startsWith('temp-')) {
          await (admin as any).from('customers').delete().eq('id', originalId)
        }
      } catch (dbErr) {
        console.warn('[TrashRepository] Failed to delete customer from Supabase:', dbErr)
      }
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

    const nowISO = new Date().toISOString()
    const expiresISO = computeTrashExpiration(nowISO, TRASH_RETENTION_DAYS)

    const trashRecord: TrashRecord = {
      id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company_id: companyId || item.company_id || 'default',
      category,
      original_id: originalId,
      title,
      subtitle,
      reference_number: refNum,
      deleted_at: nowISO,
      expires_at: expiresISO,
      deleted_by_name: deletedByName,
      payload: item,
    }

    const trashList = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, [trashRecord, ...trashList.filter(t => t.id !== trashRecord.id)])

    // Persist to Supabase audit_logs as TRASH_ITEM for cross-device & serverless durability
    try {
      const { createAdminClient } = await import('../supabase/admin.ts')
      const admin = createAdminClient()
      const effectiveComp = (!companyId || companyId === 'default' || companyId === 'c-01') ? null : companyId
      await (admin as any).from('audit_logs').insert({
        company_id: effectiveComp,
        action: 'TRASH_ITEM',
        entity_type: category,
        entity_id: originalId,
        new_values: trashRecord,
        created_at: nowISO,
      })
    } catch (e) {
      console.warn('[TrashRepository] Failed to write trash to audit_logs:', e)
    }

    // Purge any preexisting expired records in the background
    this.purgeExpiredTrash(companyId).catch(() => {})

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
      if (companyId) {
        const compList = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyId) || []
        PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [restoredPayload, ...compList], true, companyId)
      }
      try {
        const { createAdminClient } = await import('../supabase/admin.ts')
        const admin = createAdminClient()
        if (restoredPayload && restoredPayload.id) {
          const { items, ...quoteRow } = restoredPayload
          await (admin as any).from('quotations').upsert(quoteRow)
          if (Array.isArray(items) && items.length > 0) {
            await (admin as any).from('quotation_items').upsert(items)
          }
        }
      } catch (dbErr) {
        console.warn('[TrashRepository] Re-insert quotation error:', dbErr)
      }
    } else if (trashItem.category === 'invoices') {
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
      PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [restoredPayload, ...list])
    } else if (trashItem.category === 'customers') {
      const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [restoredPayload, ...list])
      if (companyId) {
        const compList = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS, companyId) || []
        PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [restoredPayload, ...compList], true, companyId)
      }
      try {
        const { createAdminClient } = await import('../supabase/admin.ts')
        const admin = createAdminClient()
        if (restoredPayload && restoredPayload.id) {
          await (admin as any).from('customers').upsert(restoredPayload)
        }
      } catch (dbErr) {
        console.warn('[TrashRepository] Re-insert customer error:', dbErr)
      }
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

    // Remove from audit_logs
    try {
      const { createAdminClient } = await import('../supabase/admin.ts')
      const admin = createAdminClient()
      await (admin as any)
        .from('audit_logs')
        .delete()
        .eq('action', 'TRASH_ITEM')
        .eq('entity_id', trashItem.original_id)
    } catch (e) {
      console.warn('[TrashRepository] Failed to delete restored item from audit_logs:', e)
    }

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
    const trashItem = trashList.find((t) => t.id === trashId)
    const origId = trashItem?.original_id || trashId

    PrintERPDataStore.set(
      STORAGE_KEYS.TRASH_ITEMS,
      trashList.filter((t) => t.id !== trashId)
    )

    try {
      const { createAdminClient } = await import('../supabase/admin.ts')
      const admin = createAdminClient()
      await (admin as any)
        .from('audit_logs')
        .delete()
        .eq('action', 'TRASH_ITEM')
        .eq('entity_id', origId)
    } catch (e) {
      console.warn('[TrashRepository] Failed to delete trash record from audit_logs:', e)
    }

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
      const matchCompany = matchesCompany(t.company_id, companyId)
      const matchCategory = !category || (category as any) === 'all' || t.category === category
      return matchCompany && matchCategory
    })

    const remaining = trashList.filter((t) => !toDelete.includes(t))
    PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, remaining)

    try {
      const { createAdminClient } = await import('../supabase/admin.ts')
      const admin = createAdminClient()
      let query = (admin as any).from('audit_logs').delete().eq('action', 'TRASH_ITEM')
      if (category && (category as any) !== 'all') {
        query = query.eq('entity_type', category)
      }
      if (companyId && companyId !== 'default' && companyId !== 'c-01' && companyId !== 'all') {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`)
      }
      await query
    } catch (e) {
      console.warn('[TrashRepository] Failed to empty audit_logs for trash:', e)
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return toDelete.length
  }
}

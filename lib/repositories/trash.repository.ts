import { PrintFlowDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import {
  TRASH_RETENTION_DAYS,
  computeTrashExpiration,
  isTrashExpired,
  type TrashCategory,
  type TrashRecord,
  type TrashSummary,
} from '../../types/trash.types.ts'
import { PURGED_QUOTATION_IDENTIFIERS } from '../../types/quotation.types.ts'

function matchesCompany(itemCompanyId?: string, targetCompanyId?: string): boolean {
  if (targetCompanyId === 'all') return false // Disallow dangerous wildcard wipes
  if (!targetCompanyId) return true // Platform cron / system cleanup (e.g. purgeExpiredTrash)
  if (targetCompanyId === 'default' && (!itemCompanyId || itemCompanyId === 'default')) return true
  return itemCompanyId === targetCompanyId
}

export class TrashRepository {
  /**
   * Purges items older than the retention period (default: 30 days) permanently from the database.
   */
  static async purgeExpiredTrash(
    companyId?: string,
    retentionDays: number = TRASH_RETENTION_DAYS
  ): Promise<{ purgedCount: number; purgedIds: string[] }> {
    const all = PrintFlowDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
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
      PrintFlowDataStore.set(STORAGE_KEYS.TRASH_ITEMS, unexpired)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printflow_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
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

    let all = PrintFlowDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []

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
        PrintFlowDataStore.set(STORAGE_KEYS.TRASH_ITEMS, all)
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

      // 0. Register in purged identifiers
      if (originalId) PURGED_QUOTATION_IDENTIFIERS.add(String(originalId).toUpperCase())
      if (refNum) PURGED_QUOTATION_IDENTIFIERS.add(String(refNum).toUpperCase())

      // Remove from active quotations
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
      PrintFlowDataStore.set(
        STORAGE_KEYS.QUOTATIONS,
        list.filter((q) => q.id !== originalId && (!refNum || q.quotation_number !== refNum))
      )
      if (companyId) {
        const compList = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyId) || []
        PrintFlowDataStore.set(
          STORAGE_KEYS.QUOTATIONS,
          compList.filter((q) => q.id !== originalId && (!refNum || q.quotation_number !== refNum)),
          true,
          companyId
        )
      }
      try {
        const { createAdminClient } = await import('../supabase/admin.ts')
        const admin = createAdminClient()
        if (admin) {
          const isUUID = (val: string | null | undefined): boolean =>
            Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()))

          let effectiveCompanyId = companyId
          if (companyId && !isUUID(companyId)) {
            try {
              const { data: comp } = await (admin as any)
                .from('companies')
                .select('id')
                .eq('slug', companyId)
                .maybeSingle()
              if (comp?.id) {
                effectiveCompanyId = comp.id
                // Also purge under resolved company UUID partition
                const uList = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, effectiveCompanyId) || []
                PrintFlowDataStore.set(
                  STORAGE_KEYS.QUOTATIONS,
                  uList.filter((q) => q.id !== originalId && (!refNum || q.quotation_number !== refNum)),
                  true,
                  effectiveCompanyId
                )
              }
            } catch {}
          }

          let targetUuid = isUUID(originalId) ? originalId : null
          if (!targetUuid && refNum) {
            try {
              let qLookup = (admin as any).from('quotations').select('id').eq('quotation_number', refNum)
              if (isUUID(effectiveCompanyId)) qLookup = qLookup.eq('company_id', effectiveCompanyId)
              const { data: found } = await qLookup.maybeSingle()
              if (found?.id && isUUID(found.id)) {
                targetUuid = found.id
              }
            } catch {}
          }

          if (targetUuid) {
            try {
              await (admin as any).from('quotation_items').delete().eq('quotation_id', targetUuid)
              await (admin as any).from('quotation_activities').delete().eq('quotation_id', targetUuid)
              let query = (admin as any).from('quotations').delete().eq('id', targetUuid)
              if (isUUID(effectiveCompanyId)) query = query.eq('company_id', effectiveCompanyId)
              await query
            } catch (delErr) {
              console.warn('[TrashRepository] Quotation UUID deletion notice:', delErr)
            }
          }
          if (refNum) {
            try {
              let qNumQuery = (admin as any).from('quotations').delete().eq('quotation_number', refNum)
              if (isUUID(effectiveCompanyId)) qNumQuery = qNumQuery.eq('company_id', effectiveCompanyId)
              await qNumQuery
            } catch (delErr) {
              console.warn('[TrashRepository] Quotation number deletion notice:', delErr)
            }
          }
        }
      } catch (dbErr) {
        console.warn('[TrashRepository] Failed to delete quotation from Supabase:', dbErr)
      }
    } else if (category === 'invoices') {
      title = item.customer_name ? `Invoice: ${item.customer_name}` : `Invoice #${item.invoice_number || originalId}`
      refNum = item.invoice_number || ''
      subtitle = item.grand_total ? `৳ ${item.grand_total} (${item.status})` : ''
      // Remove from active invoices
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
      PrintFlowDataStore.set(
        STORAGE_KEYS.INVOICES,
        list.filter((i) => i.id !== originalId && i.invoice_number !== item.invoice_number)
      )
    } else if (category === 'customers') {
      title = item.name || 'Customer'
      refNum = item.mobile || item.phone || ''
      subtitle = item.area || item.company_name || 'Customer Profile'
      // Remove from active customers in local data store
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      PrintFlowDataStore.set(
        STORAGE_KEYS.CUSTOMERS,
        list.filter((c) => c.id !== originalId)
      )
      const compList = companyId ? (PrintFlowDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS, companyId) || []) : []
      if (companyId) {
        PrintFlowDataStore.set(
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
          let q = (admin as any).from('customers').delete().eq('id', originalId)
          if (companyId) q = q.eq('company_id', companyId)
          const { error: dbErr } = await q
          if (dbErr && dbErr.code === '23503') {
            console.warn('[TrashRepository] Foreign key prevents customer deletion:', dbErr)
            PrintFlowDataStore.set(STORAGE_KEYS.CUSTOMERS, [item, ...compList.filter((c) => c.id !== originalId)], true, companyId)
            throw new Error(`Cannot trash customer: ${dbErr.message || 'Record has dependent transactions'}`)
          }
        }
      } catch (dbErr: any) {
        if (dbErr?.message?.includes('Cannot trash customer')) {
          throw dbErr
        }
        console.warn('[TrashRepository] Failed to delete customer from Supabase:', dbErr)
      }
    } else if (category === 'products') {
      title = item.name || item.title || 'Product'
      refNum = item.sku || item.code || ''
      subtitle = item.category || (item.base_price ? `৳ ${item.base_price}` : 'Product Catalog Item')
      // Remove from active products
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
      PrintFlowDataStore.set(
        STORAGE_KEYS.PRODUCTS,
        list.filter((p) => p.id !== originalId)
      )
    } else if (category === 'materials') {
      title = item.name || item.material_name || 'Material Item'
      refNum = item.sku || item.item_code || ''
      subtitle = item.category || (item.unit ? `Unit: ${item.unit}` : 'Inventory Stock Item')
      // Remove from active materials
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []
      PrintFlowDataStore.set(
        STORAGE_KEYS.MATERIALS,
        list.filter((m) => m.id !== originalId)
      )
    } else if (category === 'suppliers') {
      title = item.name || item.supplier_name || 'Supplier'
      refNum = item.mobile || item.phone || ''
      subtitle = item.contact_person || item.address || 'Vendor / Supplier Profile'
      // Remove from active suppliers
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.SUPPLIERS) || []
      PrintFlowDataStore.set(
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

    const trashList = PrintFlowDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    PrintFlowDataStore.set(STORAGE_KEYS.TRASH_ITEMS, [trashRecord, ...trashList.filter(t => t.id !== trashRecord.id)])

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
      window.dispatchEvent(new CustomEvent('printflow_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return trashRecord
  }

  /**
   * Restores a record from Trash back to its active collection
   */
  static async restoreFromTrash(trashId: string, companyId: string): Promise<any> {
    const trashList = PrintFlowDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    const trashItem = trashList.find((t) => t.id === trashId)

    if (!trashItem) {
      throw new Error(`Trash item with ID ${trashId} not found.`)
    }

    const restoredPayload = trashItem.payload

    if (trashItem.category === 'quotations') {
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
      PrintFlowDataStore.set(STORAGE_KEYS.QUOTATIONS, [restoredPayload, ...list])
      if (companyId) {
        const compList = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyId) || []
        PrintFlowDataStore.set(STORAGE_KEYS.QUOTATIONS, [restoredPayload, ...compList], true, companyId)
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
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
      PrintFlowDataStore.set(STORAGE_KEYS.INVOICES, [restoredPayload, ...list])
    } else if (trashItem.category === 'customers') {
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      PrintFlowDataStore.set(STORAGE_KEYS.CUSTOMERS, [restoredPayload, ...list])
      if (companyId) {
        const compList = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS, companyId) || []
        PrintFlowDataStore.set(STORAGE_KEYS.CUSTOMERS, [restoredPayload, ...compList], true, companyId)
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
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
      PrintFlowDataStore.set(STORAGE_KEYS.PRODUCTS, [restoredPayload, ...list])
    } else if (trashItem.category === 'materials') {
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []
      PrintFlowDataStore.set(STORAGE_KEYS.MATERIALS, [restoredPayload, ...list])
    } else if (trashItem.category === 'suppliers') {
      const list = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.SUPPLIERS) || []
      PrintFlowDataStore.set(STORAGE_KEYS.SUPPLIERS, [restoredPayload, ...list])
    }

    // Remove from trash
    PrintFlowDataStore.set(
      STORAGE_KEYS.TRASH_ITEMS,
      trashList.filter((t) => t.id !== trashId)
    )

    // Record RESTORE_ITEM in audit_logs (preserving immutable forensic compliance history)
    try {
      const { createAdminClient } = await import('../supabase/admin.ts')
      const admin = createAdminClient()
      const effectiveComp = (!companyId || companyId === 'default' || companyId === 'c-01') ? null : companyId
      const nowISO = new Date().toISOString()
      await (admin as any).from('audit_logs').insert({
        company_id: effectiveComp,
        action: 'RESTORE_ITEM',
        entity_type: trashItem.category,
        entity_id: trashItem.original_id,
        new_values: { restored_at: nowISO, restored_from_trash_id: trashId },
        created_at: nowISO,
      })
    } catch (e) {
      console.warn('[TrashRepository] Failed to record restore in audit_logs:', e)
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printflow_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return restoredPayload
  }

  /**
   * Permanently deletes a record from Trash
   */
  static async permanentDelete(trashId: string, companyId: string): Promise<boolean> {
    const trashList = PrintFlowDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    const trashItem = trashList.find((t) => t.id === trashId)
    const origId = trashItem?.original_id || trashId

    PrintFlowDataStore.set(
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
      window.dispatchEvent(new CustomEvent('printflow_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return true
  }

  /**
   * Clears all trash items or all items within a category
   */
  static async emptyTrash(companyId: string, category?: TrashCategory): Promise<number> {
    const trashList = PrintFlowDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    const toDelete = trashList.filter((t) => {
      const matchCompany = matchesCompany(t.company_id, companyId)
      const matchCategory = !category || (category as any) === 'all' || t.category === category
      return matchCompany && matchCategory
    })

    const remaining = trashList.filter((t) => !toDelete.includes(t))
    PrintFlowDataStore.set(STORAGE_KEYS.TRASH_ITEMS, remaining)

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
      window.dispatchEvent(new CustomEvent('printflow_datastore_sync', { detail: { key: STORAGE_KEYS.TRASH_ITEMS } }))
    }

    return toDelete.length
  }
}

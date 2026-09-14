'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Sync Server Actions (V8)
// Protected, Multi-Tenant Outbox Batch Sync & Status Actions
// ==============================================================================

import { SyncService } from '../services/sync.service.ts'
import { SyncRepository } from '../lib/repositories/sync.repository.ts'
import { getTenantCompanyId } from '../lib/auth/tenant-auth.ts'
import type { SyncBatchItemPayload } from '../types/sync.types.ts'

export async function processSyncBatchAction(items: SyncBatchItemPayload[]) {
  try {
    const companyId = await getTenantCompanyId()
    const result = await SyncService.processOutboxBatch(companyId, items)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to process sync batch.' }
  }
}

export async function getOutboxStatusAction(options?: { deviceId?: string; limit?: number }) {
  try {
    const companyId = await getTenantCompanyId()
    const items = await SyncRepository.getOutboxItems(companyId, options)
    return { success: true, data: items }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch outbox status.' }
  }
}

'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Unified Communication Server Actions (V8)
// Protected, Multi-Tenant WhatsApp, SMS, Email & In-App Actions
// ==============================================================================

import {
  UnifiedCommunicationService,
  type DispatchMessageOptions,
} from '../services/unified-communication.service.ts'
import { CommunicationRepository } from '../lib/repositories/communication.repository.ts'
import { getTenantCompanyId } from '../lib/auth/tenant-auth.ts'

export async function sendUnifiedMessageAction(
  options: Omit<DispatchMessageOptions, 'companyId'>
) {
  try {
    const companyId = await getTenantCompanyId()
    const result = await UnifiedCommunicationService.sendTransactionalMessage({
      ...options,
      companyId,
    })
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to dispatch communication.' }
  }
}

export async function getCommunicationLogsAction(options?: {
  channel?: string
  status?: string
  limit?: number
  offset?: number
}) {
  try {
    const companyId = await getTenantCompanyId()
    const logs = await CommunicationRepository.getMessages(companyId, options)
    return { success: true, data: logs }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch communication logs.' }
  }
}

export async function getCommunicationTemplatesAction(channel?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const templates = await CommunicationRepository.getTemplates(companyId, channel)
    return { success: true, data: templates }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch communication templates.' }
  }
}

export async function seedCommunicationTemplatesAction() {
  try {
    const companyId = await getTenantCompanyId()
    const templates = await CommunicationRepository.seedDefaultTemplates(companyId)
    return { success: true, data: templates }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to seed communication templates.' }
  }
}

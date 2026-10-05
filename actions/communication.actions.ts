'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


// ==============================================================================
// PrintFlow - Authoritative Unified Communication Server Actions (V8)
// Protected, Multi-Tenant WhatsApp, SMS, Email & In-App Actions
// ==============================================================================

import {
  UnifiedCommunicationService,
  type DispatchMessageOptions,
} from '../services/unified-communication.service.ts'
import { CommunicationRepository } from '../lib/repositories/communication.repository.ts'
import { getTenantCompanyId } from '../lib/auth/tenant-auth.ts'

export const sendUnifiedMessageAction = withTenantAction(
  {
    permission: "whatsapp.send",
    entityType: "communication"
  },
  async (ctx, options: Omit<DispatchMessageOptions, 'companyId'>) => {
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

})

export const getCommunicationLogsAction = withTenantAction(
  {
    permission: "whatsapp.view",
    entityType: "communication"
  },
  async (ctx, options?: {
  channel?: string
  status?: string
  limit?: number
  offset?: number
}) => {
  try {
    const companyId = await getTenantCompanyId()
    const logs = await CommunicationRepository.getMessages(companyId, options)
    return { success: true, data: logs }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch communication logs.' }
  }

})

export const getCommunicationTemplatesAction = withTenantAction(
  {
    permission: "whatsapp.view",
    entityType: "communication"
  },
  async (ctx, channel?: string) => {
  try {
    const companyId = await getTenantCompanyId()
    const templates = await CommunicationRepository.getTemplates(companyId, channel)
    return { success: true, data: templates }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch communication templates.' }
  }

})

export const seedCommunicationTemplatesAction = withTenantAction(
  {
    permission: "whatsapp.send",
    entityType: "communication"
  },
  async (ctx) => {
  try {
    const companyId = await getTenantCompanyId()
    const templates = await CommunicationRepository.seedDefaultTemplates(companyId)
    return { success: true, data: templates }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to seed communication templates.' }
  }

})

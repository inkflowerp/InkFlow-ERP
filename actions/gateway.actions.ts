'use server'

// ==============================================================================
// PrintERP SaaS - Platform Owner & Tenant Gateway Server Actions
// ==============================================================================

import { getCurrentPlatformUser } from '@/lib/auth/platform-auth'
import { GatewayService } from '@/services/gateway.service'
import {
  GatewayCategory,
  SanitizedGatewayRecord,
  GatewayFormData,
  GatewayTestResult,
  SendTestPayload,
  SendTestResult,
  CommunicationLogRecord,
  GatewayTransactionRecord,
  GatewayWebhookRecord,
  GatewayAuditRecord,
  GatewayTelemetrySummary,
} from '@/types/gateway.types'
import { ApiResponse } from '@/types/platform.types'

/**
 * Server Action: Get all Platform Gateways (Sanitized)
 */
export async function getPlatformGatewaysAction(
  category?: GatewayCategory
): Promise<ApiResponse<SanitizedGatewayRecord[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const gateways = await GatewayService.listGateways({ tenantId: null, category })
    return { success: true, data: gateways }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch platform gateways' }
  }
}

/**
 * Server Action: Save / Upsert Platform Gateway Integration
 */
export async function savePlatformGatewayAction(
  formData: GatewayFormData
): Promise<ApiResponse<SanitizedGatewayRecord>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    // Force platform-level (tenant_id is null)
    formData.tenant_id = null

    const res = await GatewayService.saveGateway(formData, user.id)
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Failed to save gateway' }
    }

    return { success: true, data: res.data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save gateway integration' }
  }
}

/**
 * Server Action: Test Gateway Connection (Live Server Handshake)
 */
export async function testPlatformGatewayConnectionAction(
  gatewayId: string,
  formDataOverride?: GatewayFormData
): Promise<ApiResponse<GatewayTestResult>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const res = await GatewayService.testConnection(gatewayId, formDataOverride)
    return { success: res.success, data: res, error: res.error }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unexpected exception during gateway connection test',
    }
  }
}

/**
 * Server Action: Dispatch Real Test Message (Email, SMS, WhatsApp, Telegram)
 */
export async function sendPlatformGatewayTestAction(
  payload: SendTestPayload
): Promise<ApiResponse<SendTestResult>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const res = await GatewayService.sendTestMessage(payload, user.id)
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to deliver test message', data: res }
    }

    return { success: true, data: res }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error dispatching test message' }
  }
}

/**
 * Server Action: Toggle Gateway Status (Enable/Disable)
 */
export async function togglePlatformGatewayAction(
  gatewayId: string,
  isEnabled: boolean
): Promise<ApiResponse<SanitizedGatewayRecord>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const res = await GatewayService.toggleStatus(gatewayId, isEnabled, user.id)
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Failed to update gateway status' }
    }

    return { success: true, data: res.data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to toggle gateway status' }
  }
}

/**
 * Server Action: Delete Platform Gateway Integration
 */
export async function deletePlatformGatewayAction(
  gatewayId: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const res = await GatewayService.deleteGateway(gatewayId, user.id)
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to delete gateway' }
    }

    return { success: true, data: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete gateway' }
  }
}

/**
 * Server Action: Get Communication Logs
 */
export async function getPlatformCommunicationLogsAction(filters?: {
  channel?: string
  status?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ logs: CommunicationLogRecord[]; total: number }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const data = await GatewayService.getCommunicationLogs({ ...filters, tenantId: null })
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch communication logs' }
  }
}

/**
 * Server Action: Get Financial Payment Transactions
 */
export async function getPlatformPaymentTransactionsAction(filters?: {
  provider?: string
  status?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ transactions: GatewayTransactionRecord[]; total: number }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const data = await GatewayService.getPaymentTransactions(filters)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch payment transactions' }
  }
}

/**
 * Server Action: Get Webhook Events Ledger
 */
export async function getPlatformGatewayWebhooksAction(filters?: {
  provider?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ webhooks: GatewayWebhookRecord[]; total: number }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const data = await GatewayService.getWebhooks(filters)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch webhook records' }
  }
}

/**
 * Server Action: Get Gateway Security Audit Logs
 */
export async function getPlatformGatewayAuditLogsAction(filters?: {
  gatewayId?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ logs: GatewayAuditRecord[]; total: number }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const data = await GatewayService.getAuditLogs({ ...filters, tenantId: null })
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch audit records' }
  }
}

/**
 * Server Action: Get Telemetry Summary for Gateways Dashboard
 */
export async function getPlatformGatewayTelemetryAction(): Promise<
  ApiResponse<GatewayTelemetrySummary>
> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }

    const telemetry = await GatewayService.getTelemetrySummary()
    return { success: true, data: telemetry }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch telemetry summary' }
  }
}

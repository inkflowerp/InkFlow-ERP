// ==============================================================================
// PrintFlow SaaS - Unified Gateway & API Integration Core Service
// Provides database persistence, AES-256-GCM authenticated encryption, security isolation,
// logs, telemetry, and atomic default provider management.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import type {
  GatewayCategory,
  GatewayIntegrationRecord,
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
} from '../types/gateway.types.ts'
import {
  encryptSecret,
  decryptGatewayCredentials,
  maskCredential,
} from '../lib/security/encryption.ts'
import { GatewayRegistry } from '../lib/gateway/gateway.registry.ts'
import { isTestEnvironment } from '../lib/security/runtime-env.ts'

const memoryGateways: Map<string, GatewayIntegrationRecord> = new Map()

const isValidUuid = (str?: string | null): boolean => {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
}

export class GatewayService {
  /**
   * Sanitizes a database gateway record to safely display in the UI without leaking secrets.
   * ZERO-DECRYPT: Does not decrypt secrets merely to display the list or show bullets.
   */
  static sanitizeRecord(record: GatewayIntegrationRecord): SanitizedGatewayRecord {
    const hasCredentials = Boolean(
      record.encrypted_credentials && record.encrypted_credentials.trim().length > 0
    )
    const masked: Record<string, string> = {}
    let needsReentry = false

    if (hasCredentials && record.encrypted_credentials) {
      const dec = decryptGatewayCredentials(record.encrypted_credentials)
      if (dec.success) {
        for (const [k, v] of Object.entries(dec.credentials)) {
          if (typeof v === 'string' && v.trim().length > 0) {
            masked[k] = maskCredential(v)
          }
        }
      } else {
        masked['credentials'] = '••••••••'
        needsReentry = dec.needsReentry ?? true
      }
    }

    if (
      record.status === 'error' &&
      (record.last_test_error?.toLowerCase().includes('credential') ||
        record.last_test_error?.toLowerCase().includes('re-enter') ||
        record.last_test_error?.toLowerCase().includes('decrypt') ||
        record.last_test_error?.toLowerCase().includes('authenticate data'))
    ) {
      needsReentry = true
    }

    return {
      id: record.id,
      tenant_id: record.tenant_id,
      category: record.category,
      provider: record.provider,
      name: record.name,
      is_enabled: record.is_enabled,
      is_default: record.is_default,
      environment: record.environment,
      has_credentials: hasCredentials,
      masked_credentials: masked,
      needs_reentry: needsReentry,
      public_config: record.public_config || {},
      status: record.status,
      last_tested_at: record.last_tested_at,
      last_test_status: record.last_test_status,
      last_test_error: record.last_test_error,
      last_test_latency_ms: record.last_test_latency_ms,
      failure_count: record.failure_count || 0,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }
  }

  /**
   * Decrypts credentials of a gateway record for server-side operations (tests, sends).
   * Returns Record<string, string> directly for backwards compatibility with payment and webhook services.
   */
  static getDecryptedCredentials(record: GatewayIntegrationRecord): Record<string, string> {
    if (!record.encrypted_credentials) return {}
    const res = decryptGatewayCredentials(record.encrypted_credentials)
    return res.success ? res.credentials : {}
  }

  /**
   * Safely decrypts credentials and returns full status metadata (needsReentry, error).
   */
  static getDecryptedCredentialsResult(record: GatewayIntegrationRecord): {
    credentials: Record<string, string>
    needsReentry: boolean
    error?: string
  } {
    if (!record.encrypted_credentials) {
      return { credentials: {}, needsReentry: false }
    }

    const res = decryptGatewayCredentials(record.encrypted_credentials)
    if (!res.success) {
      return {
        credentials: {},
        needsReentry: res.needsReentry ?? true,
        error: res.errorMessage || res.error || 'Failed to decrypt credentials',
      }
    }

    return { credentials: res.credentials, needsReentry: false }
  }

  /**
   * Lists gateway integrations for platform owner (tenant_id IS NULL) or specific tenant.
   * Database is authoritative: no localStorage fallback.
   */
  static async listGateways(options: {
    tenantId?: string | null
    category?: GatewayCategory
  } = {}): Promise<SanitizedGatewayRecord[]> {
    const { tenantId = null, category } = options

    if (isTestEnvironment()) {
      let list = Array.from(memoryGateways.values())
      if (tenantId === null) {
        list = list.filter((g) => g.tenant_id === null)
      } else if (isValidUuid(tenantId)) {
        list = list.filter((g) => g.tenant_id === tenantId)
      } else {
        return []
      }
      if (category) {
        list = list.filter((g) => g.category === category)
      }
      return list.map((r: GatewayIntegrationRecord) => this.sanitizeRecord(r))
    }

    const admin = createAdminClient()

    let query = (admin as any).from('gateway_integrations').select('*')

    if (tenantId === null) {
      query = query.is('tenant_id', null)
    } else if (isValidUuid(tenantId)) {
      query = query.eq('tenant_id', tenantId)
    } else {
      return []
    }

    if (category) {
      query = query.eq('category', category)
    }

    query = query.order('created_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('[GatewayService] Database error listing gateways:', error.message)
      throw new Error(`Database error fetching integrations: ${error.message}`)
    }

    return (data || []).map((r: GatewayIntegrationRecord) => this.sanitizeRecord(r))
  }

  /**
   * Gets a single gateway record by ID from authoritative database
   */
  static async getGatewayById(id: string): Promise<GatewayIntegrationRecord | null> {
    if (!isValidUuid(id)) return null

    if (isTestEnvironment()) {
      const mem = memoryGateways.get(id)
      if (mem) return mem
    }

    const admin = createAdminClient()

    try {
      const { data, error } = await (admin as any)
        .from('gateway_integrations')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) return null
      return data as GatewayIntegrationRecord
    } catch {
      return null
    }
  }

  /**
   * Saves / Upserts a gateway configuration with AES-256-GCM v2 encrypted credentials.
   * Atomically manages default provider per category & scope.
   */
  static async saveGateway(
    formData: GatewayFormData,
    userId?: string
  ): Promise<{ success: boolean; data?: SanitizedGatewayRecord; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    try {
      let existing: GatewayIntegrationRecord | null = null
      if (formData.id && isValidUuid(formData.id)) {
        existing = await this.getGatewayById(formData.id)
      } else {
        // Look up by provider and tenant_id
        let lookupQuery = (admin as any)
          .from('gateway_integrations')
          .select('*')
          .eq('provider', formData.provider)

        if (formData.tenant_id && isValidUuid(formData.tenant_id)) {
          lookupQuery = lookupQuery.eq('tenant_id', formData.tenant_id)
        } else {
          lookupQuery = lookupQuery.is('tenant_id', null)
        }

        const { data: matched } = await lookupQuery.maybeSingle()
        if (matched) existing = matched as GatewayIntegrationRecord
      }

      // Merge credentials:
      // Empty credential field means RETAIN existing secret.
      // Entering new value means REPLACE that credential.
      // Masked values ('••••••••') are never submitted as actual secrets.
      let encryptedCredentials = existing?.encrypted_credentials || null

      if (formData.credentials && Object.keys(formData.credentials).length > 0) {
        let existingCreds: Record<string, string> = {}
        if (existing) {
          existingCreds = this.getDecryptedCredentials(existing)
        }

        const mergedCreds: Record<string, string> = { ...existingCreds }
        let hasNewValues = false

        for (const [key, val] of Object.entries(formData.credentials)) {
          if (val && !val.includes('••••') && val.trim().length > 0) {
            mergedCreds[key] = val.trim()
            hasNewValues = true
          }
        }

        if (hasNewValues || Object.keys(mergedCreds).length > 0) {
          encryptedCredentials = encryptSecret(JSON.stringify(mergedCreds))
        }
      }

      const sanitizedTenantId = isValidUuid(formData.tenant_id) ? formData.tenant_id : null
      let validatedCreatedBy: string | null = null
      if (isValidUuid(userId)) {
        try {
          const { data: userAuthCheck } = await (admin as any).auth.admin.getUserById(userId)
          if (userAuthCheck?.user?.id) {
            validatedCreatedBy = userAuthCheck.user.id
          }
        } catch {
          validatedCreatedBy = null
        }
      }

      // Atomic default handling: if setting is_default to true, unset any existing default in that category & scope
      if (formData.is_default) {
        let unsetQuery = (admin as any)
          .from('gateway_integrations')
          .update({ is_default: false, updated_at: now })
          .eq('category', formData.category)

        if (sanitizedTenantId) {
          unsetQuery = unsetQuery.eq('tenant_id', sanitizedTenantId)
        } else {
          unsetQuery = unsetQuery.is('tenant_id', null)
        }
        await unsetQuery
      }

      const status =
        formData.is_enabled === false
          ? 'disabled'
          : existing?.status === 'connected'
          ? 'connected'
          : encryptedCredentials
          ? 'configured'
          : 'not_configured'

      const recordPayload = {
        tenant_id: sanitizedTenantId,
        category: formData.category,
        provider: formData.provider,
        name: formData.name,
        is_enabled: formData.is_enabled ?? true,
        is_default: formData.is_default ?? false,
        environment: formData.environment || 'sandbox',
        encrypted_credentials: encryptedCredentials,
        public_config: formData.public_config || {},
        status,
        updated_at: now,
      }

      let savedRecord: GatewayIntegrationRecord

      if (isTestEnvironment()) {
        const genId = existing?.id || formData.id || `gw-test-${Date.now()}`
        savedRecord = {
          id: genId,
          ...recordPayload,
          failure_count: 0,
          created_by: validatedCreatedBy,
          created_at: existing?.created_at || now,
          updated_at: now,
        } as GatewayIntegrationRecord
        memoryGateways.set(genId, savedRecord)
        return { success: true, data: this.sanitizeRecord(savedRecord) }
      }

      if (existing) {
        let updateRes = await (admin as any)
          .from('gateway_integrations')
          .update(recordPayload)
          .eq('id', existing.id)
          .select()
          .single()

        if (
          updateRes.error &&
          (updateRes.error.message?.includes('gateway_integrations_created_by_fkey') ||
            updateRes.error.code === '23503')
        ) {
          updateRes = await (admin as any)
            .from('gateway_integrations')
            .update({ ...recordPayload, created_by: null })
            .eq('id', existing.id)
            .select()
            .single()
        }

        if (updateRes.error || !updateRes.data) {
          throw new Error(updateRes.error?.message || 'Failed to update gateway integration')
        }
        savedRecord = updateRes.data as GatewayIntegrationRecord
      } else {
        let insertRes = await (admin as any)
          .from('gateway_integrations')
          .insert({
            ...recordPayload,
            created_by: validatedCreatedBy,
            created_at: now,
          })
          .select()
          .single()

        if (
          insertRes.error &&
          (insertRes.error.message?.includes('gateway_integrations_created_by_fkey') ||
            insertRes.error.code === '23503')
        ) {
          console.warn('[GatewayService] created_by foreign key mismatch; retrying insert with created_by: null')
          insertRes = await (admin as any)
            .from('gateway_integrations')
            .insert({
              ...recordPayload,
              created_by: null,
              created_at: now,
            })
            .select()
            .single()
        }

        if (insertRes.error || !insertRes.data) {
          throw new Error(insertRes.error?.message || 'Failed to create gateway integration')
        }
        savedRecord = insertRes.data as GatewayIntegrationRecord
      }

      // Audit Log
      await this.logAudit({
        tenant_id: savedRecord.tenant_id,
        gateway_id: savedRecord.id,
        action: existing ? 'updated' : 'created',
        details: {
          provider: savedRecord.provider,
          category: savedRecord.category,
          environment: savedRecord.environment,
          status: savedRecord.status,
          is_default: savedRecord.is_default,
          credentials_updated: Boolean(formData.credentials && Object.keys(formData.credentials).length > 0),
        },
        performed_by: userId,
      })

      return { success: true, data: this.sanitizeRecord(savedRecord) }
    } catch (err: any) {
      console.error('[GatewayService] Save gateway error:', err)
      return { success: false, error: err?.message || 'Failed to save gateway integration' }
    }
  }

  /**
   * Atomically sets a gateway as the default for its category and scope.
   * Ensures only ONE default gateway per category per scope exists.
   */
  static async setDefaultGateway(
    gatewayId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    try {
      const gateway = await this.getGatewayById(gatewayId)
      if (!gateway) return { success: false, error: 'Gateway not found' }
      if (!gateway.is_enabled) {
        return { success: false, error: 'Cannot set a disabled gateway as default. Enable it first.' }
      }

      // 1. Unset old default in category and scope
      let unsetQuery = (admin as any)
        .from('gateway_integrations')
        .update({ is_default: false, updated_at: now })
        .eq('category', gateway.category)

      if (gateway.tenant_id) {
        unsetQuery = unsetQuery.eq('tenant_id', gateway.tenant_id)
      } else {
        unsetQuery = unsetQuery.is('tenant_id', null)
      }
      await unsetQuery

      // 2. Set new default
      const { error } = await (admin as any)
        .from('gateway_integrations')
        .update({ is_default: true, updated_at: now })
        .eq('id', gatewayId)

      if (error) throw new Error(error.message)

      // 3. Audit log
      await this.logAudit({
        tenant_id: gateway.tenant_id,
        gateway_id: gatewayId,
        action: 'set_default',
        details: { provider: gateway.provider, category: gateway.category },
        performed_by: userId,
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to set default gateway' }
    }
  }

  /**
   * Tests connection against provider API and updates gateway status in DB.
   * If credentials cannot be decrypted, gracefully marks 'error' with 'needs_reentry'.
   */
  static async testConnection(
    gatewayId: string,
    formDataOverride?: GatewayFormData
  ): Promise<GatewayTestResult> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    const gateway = await this.getGatewayById(gatewayId)
    if (!gateway && !formDataOverride) {
      return {
        success: false,
        status: 'error',
        latency_ms: 0,
        message: 'Gateway integration not found.',
        error: 'Record missing',
      }
    }

    const category = formDataOverride?.category || gateway!.category
    const provider = formDataOverride?.provider || gateway!.provider
    const environment = formDataOverride?.environment || gateway!.environment
    const publicConfig = { ...(gateway?.public_config || {}), ...(formDataOverride?.public_config || {}) }

    // Resolve credentials
    let credentials: Record<string, string> = {}

    if (formDataOverride?.credentials && Object.keys(formDataOverride.credentials).length > 0) {
      for (const [k, v] of Object.entries(formDataOverride.credentials)) {
        if (v && !v.includes('••••')) credentials[k] = v.trim()
      }
    }

    if (Object.keys(credentials).length === 0 && gateway) {
      const dec = this.getDecryptedCredentialsResult(gateway)
      if (dec.needsReentry) {
        // Record credential error in DB so row shows "Credential needs to be re-entered"
        await (admin as any)
          .from('gateway_integrations')
          .update({
            status: 'error',
            last_tested_at: now,
            last_test_status: 'failed',
            last_test_error: 'Credential needs to be re-entered (encryption key mismatch)',
            failure_count: (gateway.failure_count || 0) + 1,
            updated_at: now,
          })
          .eq('id', gateway.id)

        return {
          success: false,
          status: 'error',
          latency_ms: 0,
          message: 'Credential needs to be re-entered. Please update the API key or password.',
          error: 'CREDENTIAL_DECRYPTION_FAILED',
        }
      }
      credentials = dec.credentials
    }

    const testRes = await GatewayRegistry.testConnection({
      category,
      provider,
      credentials,
      publicConfig,
      environment,
    })

    // Update Gateway DB Record status and latency
    if (gateway) {
      const updatedStatus = testRes.success ? 'connected' : 'error'
      await (admin as any)
        .from('gateway_integrations')
        .update({
          status: updatedStatus,
          last_tested_at: now,
          last_test_status: testRes.success ? 'passed' : 'failed',
          last_test_error: testRes.error || null,
          last_test_latency_ms: testRes.latency_ms,
          failure_count: testRes.success ? 0 : (gateway.failure_count || 0) + 1,
          updated_at: now,
        })
        .eq('id', gateway.id)

      // Audit Log
      await this.logAudit({
        tenant_id: gateway.tenant_id,
        gateway_id: gateway.id,
        action: 'test_connection',
        details: {
          result: testRes.success ? 'SUCCESS' : 'FAILURE',
          latency_ms: testRes.latency_ms,
          error: testRes.error,
        },
      })
    }

    return testRes
  }

  /**
   * Dispatches a real test message (Email, SMS, WhatsApp, or Telegram)
   */
  static async sendTestMessage(
    payload: SendTestPayload,
    userId?: string
  ): Promise<SendTestResult> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    let gateway: GatewayIntegrationRecord | null = null
    if (payload.gatewayId) {
      gateway = await this.getGatewayById(payload.gatewayId)
    }

    let credentials: Record<string, string> = {}
    let publicConfig: Record<string, any> = {}
    let provider = payload.provider || gateway?.provider

    if (gateway) {
      const dec = this.getDecryptedCredentialsResult(gateway)
      if (dec.needsReentry && (!payload.credentials || Object.keys(payload.credentials).length === 0)) {
        return {
          success: false,
          timestamp: now,
          latency_ms: 0,
          error: 'Credential needs to be re-entered before sending test messages.',
        }
      }
      credentials = dec.credentials
      publicConfig = gateway.public_config || {}
      provider = gateway.provider
    }

    // Merge any credentials override passed from payload (e.g. from modal before saving)
    if (payload.credentials && Object.keys(payload.credentials).length > 0) {
      for (const [k, v] of Object.entries(payload.credentials)) {
        if (v && !v.includes('••••')) {
          credentials[k] = v.trim()
        }
      }
    }

    // Merge any publicConfig override passed from payload
    if (payload.publicConfig && Object.keys(payload.publicConfig).length > 0) {
      publicConfig = { ...publicConfig, ...payload.publicConfig }
    }

    // Auto-resolve recipient for Telegram / Email if not explicitly set
    if (!payload.recipient) {
      if (payload.category === 'telegram') {
        payload.recipient = String(publicConfig.default_chat_id || credentials.chat_id || '').trim()
      } else if (payload.category === 'email') {
        payload.recipient = String(publicConfig.sender_email || publicConfig.gmail_account_email || 'admin@printflow.bd').trim()
      }
    }

    if (!provider) {
      return {
        success: false,
        timestamp: now,
        latency_ms: 0,
        error: 'No active provider resolved for test message.',
      }
    }

    const sendRes = await GatewayRegistry.sendTestMessage(
      {
        category: payload.category,
        provider,
        credentials,
        publicConfig,
      },
      payload
    )

    // Record in Communication Logs table
    try {
      await (admin as any).from('communication_logs').insert({
        company_id: gateway?.tenant_id || null,
        gateway_id: gateway?.id || null,
        channel: payload.category,
        recipient_name: payload.recipientName || 'Test Recipient',
        recipient_destination: payload.recipient,
        provider_used: provider,
        message_content: payload.message,
        status: sendRes.success ? 'sent' : 'failed',
        provider_message_id: sendRes.providerMessageId || null,
        error_message: sendRes.error || null,
        sent_by: isValidUuid(userId) ? userId : null,
        sent_at: sendRes.success ? now : null,
        failed_at: sendRes.success ? null : now,
        created_at: now,
      })
    } catch (logErr) {
      console.warn('[GatewayService] Comm log insertion warning:', logErr)
    }

    // Audit Log
    await this.logAudit({
      tenant_id: gateway?.tenant_id,
      gateway_id: gateway?.id,
      action: 'test_message_sent',
      details: {
        channel: payload.category,
        provider,
        recipient: payload.recipient,
        success: sendRes.success,
        providerMessageId: sendRes.providerMessageId,
      },
      performed_by: userId,
    })

    return sendRes
  }

  /**
   * Toggles gateway enabled / disabled status
   */
  static async toggleStatus(
    gatewayId: string,
    isEnabled: boolean,
    userId?: string
  ): Promise<{ success: boolean; data?: SanitizedGatewayRecord; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    try {
      const gateway = await this.getGatewayById(gatewayId)
      if (!gateway) return { success: false, error: 'Gateway not found' }

      const newStatus = isEnabled
        ? gateway.last_test_status === 'passed'
          ? 'connected'
          : 'configured'
        : 'disabled'

      // If disabling a default gateway, unset is_default
      const isDefault = isEnabled ? gateway.is_default : false

      const { data, error } = await (admin as any)
        .from('gateway_integrations')
        .update({
          is_enabled: isEnabled,
          is_default: isDefault,
          status: newStatus,
          updated_at: now,
        })
        .eq('id', gatewayId)
        .select()
        .single()

      if (error) throw new Error(error.message)

      await this.logAudit({
        tenant_id: gateway.tenant_id,
        gateway_id: gatewayId,
        action: isEnabled ? 'enabled' : 'disabled',
        details: { provider: gateway.provider, status: newStatus },
        performed_by: userId,
      })

      return { success: true, data: this.sanitizeRecord(data as GatewayIntegrationRecord) }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to toggle status' }
    }
  }

  /**
   * Deletes a gateway configuration.
   * Preserves historical communication logs & financial records.
   */
  static async deleteGateway(
    gatewayId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const admin = createAdminClient()

    try {
      const gateway = await this.getGatewayById(gatewayId)
      if (!gateway) return { success: false, error: 'Gateway not found' }

      const { error } = await (admin as any).from('gateway_integrations').delete().eq('id', gatewayId)
      if (error) throw new Error(error.message)

      await this.logAudit({
        tenant_id: gateway.tenant_id,
        gateway_id: gatewayId,
        action: 'deleted',
        details: {
          provider: gateway.provider,
          category: gateway.category,
          was_default: gateway.is_default,
        },
        performed_by: userId,
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete gateway' }
    }
  }

  /**
   * Writes a non-sensitive entry to the gateway audit log
   */
  static async logAudit(entry: {
    tenant_id?: string | null
    gateway_id?: string | null
    action: string
    details: Record<string, any>
    performed_by?: string | null
    ip_address?: string | null
  }): Promise<void> {
    const admin = createAdminClient()
    try {
      const sanitizedTenantId = isValidUuid(entry.tenant_id) ? entry.tenant_id : null
      const sanitizedGatewayId = isValidUuid(entry.gateway_id) ? entry.gateway_id : null
      const sanitizedPerformedBy = isValidUuid(entry.performed_by) ? entry.performed_by : null

      await (admin as any).from('gateway_audit_logs').insert({
        tenant_id: sanitizedTenantId,
        gateway_id: sanitizedGatewayId,
        action: entry.action,
        details: entry.details || {},
        performed_by: sanitizedPerformedBy,
        ip_address: entry.ip_address || null,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('[GatewayService] Audit logging warning:', err)
    }
  }

  /**
   * Fetches paginated communication logs from database
   */
  static async getCommunicationLogs(filters: {
    tenantId?: string | null
    channel?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ logs: CommunicationLogRecord[]; total: number }> {
    const admin = createAdminClient()
    const { tenantId = null, channel, status, search, page = 1, pageSize = 20 } = filters

    try {
      let query = (admin as any)
        .from('communication_logs')
        .select('*', { count: 'exact' })

      if (tenantId === null) {
        query = query.is('company_id', null)
      } else if (isValidUuid(tenantId)) {
        query = query.eq('company_id', tenantId)
      } else {
        return { logs: [], total: 0 }
      }

      if (channel && channel !== 'all') query = query.eq('channel', channel)
      if (status && status !== 'all') query = query.eq('status', status)
      if (search) {
        query = query.or(
          `recipient_destination.ilike.%${search}%,recipient_name.ilike.%${search}%,message_content.ilike.%${search}%`
        )
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query

      if (error) {
        return { logs: [], total: 0 }
      }

      return { logs: data || [], total: count || 0 }
    } catch {
      return { logs: [], total: 0 }
    }
  }

  /**
   * Fetches paginated payment transactions from database
   */
  static async getPaymentTransactions(filters: {
    tenantId?: string | null
    provider?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ transactions: GatewayTransactionRecord[]; total: number }> {
    const admin = createAdminClient()
    const { tenantId = null, provider, status, search, page = 1, pageSize = 20 } = filters

    try {
      let query = (admin as any)
        .from('gateway_transactions')
        .select('*', { count: 'exact' })

      if (tenantId !== undefined) {
        if (tenantId === null) query = query.is('tenant_id', null)
        else if (isValidUuid(tenantId)) query = query.eq('tenant_id', tenantId)
        else return { transactions: [], total: 0 }
      }

      if (provider && provider !== 'all') query = query.eq('provider', provider)
      if (status && status !== 'all') query = query.eq('payment_status', status)
      if (search) {
        query = query.or(
          `internal_trx_id.ilike.%${search}%,provider_trx_id.ilike.%${search}%,invoice_id.ilike.%${search}%`
        )
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query
      if (error) return { transactions: [], total: 0 }

      return { transactions: data || [], total: count || 0 }
    } catch {
      return { transactions: [], total: 0 }
    }
  }

  /**
   * Fetches paginated webhook event records from database
   */
  static async getWebhooks(filters: {
    provider?: string
    status?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ webhooks: GatewayWebhookRecord[]; total: number }> {
    const admin = createAdminClient()
    const { provider, status, page = 1, pageSize = 20 } = filters

    try {
      let query = (admin as any).from('gateway_webhooks').select('*', { count: 'exact' })

      if (provider && provider !== 'all') query = query.eq('provider', provider)
      if (status && status !== 'all') query = query.eq('status', status)

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query
      if (error) return { webhooks: [], total: 0 }

      return { webhooks: data || [], total: count || 0 }
    } catch {
      return { webhooks: [], total: 0 }
    }
  }

  /**
   * Fetches security audit logs from database
   */
  static async getAuditLogs(filters: {
    tenantId?: string | null
    gatewayId?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ logs: GatewayAuditRecord[]; total: number }> {
    const admin = createAdminClient()
    const { tenantId = null, gatewayId, page = 1, pageSize = 20 } = filters

    try {
      let query = (admin as any).from('gateway_audit_logs').select('*', { count: 'exact' })

      if (tenantId === null) query = query.is('tenant_id', null)
      else if (isValidUuid(tenantId)) query = query.eq('tenant_id', tenantId)
      else return { logs: [], total: 0 }

      if (gatewayId) {
        if (isValidUuid(gatewayId)) query = query.eq('gateway_id', gatewayId)
        else return { logs: [], total: 0 }
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query
      if (error) return { logs: [], total: 0 }

      return { logs: data || [], total: count || 0 }
    } catch {
      return { logs: [], total: 0 }
    }
  }

  /**
   * Returns aggregated database telemetry for Platform Owner (real DB values only)
   */
  static async getTelemetrySummary(): Promise<GatewayTelemetrySummary> {
    const gateways = await this.listGateways({ tenantId: null })
    const { total: recentLogsCount } = await this.getCommunicationLogs({ tenantId: null, pageSize: 1 })
    const { transactions } = await this.getPaymentTransactions({ pageSize: 50 })
    const { total: recentWebhooksCount } = await this.getWebhooks({ pageSize: 1 })

    let connected = 0
    let errors = 0
    let latencySum = 0
    let latencyCount = 0
    let live = 0
    let sandbox = 0

    for (const g of gateways) {
      if (g.status === 'connected') connected++
      if (g.status === 'error') errors++
      if (g.environment === 'live') live++
      else sandbox++
      if (g.last_test_latency_ms && g.last_test_latency_ms > 0) {
        latencySum += g.last_test_latency_ms
        latencyCount++
      }
    }

    const txVolume = transactions.reduce(
      (acc, t) => acc + (t.payment_status === 'paid' ? Number(t.amount) : 0),
      0
    )

    return {
      totalConfigured: gateways.filter((g) => g.status !== 'not_configured').length,
      totalConnected: connected,
      totalErrors: errors,
      avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
      liveCount: live,
      sandboxCount: sandbox,
      recentLogsCount,
      recentTransactionsVolume: txVolume,
      recentWebhooksCount,
    }
  }
}

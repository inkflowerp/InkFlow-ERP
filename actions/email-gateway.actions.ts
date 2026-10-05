'use server'

import { withTenantAction, withPlatformAction } from '../lib/actions/action-wrapper.ts'


// ==============================================================================
// PrintFlow SaaS - Multi-Tenant Email Gateway Server Actions
// Enforces strict platform vs tenant authorization boundaries.
// Encrypts secrets at rest and prevents credential exposure to frontend.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import { getAuthenticatedPlatformContext } from '../lib/auth/platform-auth.ts'
import { requireTenantPermission, requireTenantUser, getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import type {
  EmailGatewayRecord,
  EmailGatewayFormData,
  EmailProviderType,
  EmailTemplateRecord,
  EmailLogRecord,
  ConnectionTestResult,
  SendEmailResult,
} from '../types/communication.types.ts'
import {
  encryptSecret,
  decryptSecret,
  sanitizeGatewayRecord,
} from '../lib/security/encryption.ts'
import { EmailGatewayService, DEFAULT_PLATFORM_GATEWAY, EmailDataStore } from '../services/email-gateway.service.ts'
import { DEFAULT_EMAIL_TEMPLATES } from '../services/email-template.service.ts'
import { revokeGoogleToken, getGoogleOAuthDiagnostics } from '../lib/email/oauth/google-oauth.ts'
import { AuditService } from '../services/audit.service.ts'

// -----------------------------------------------------------------------------
// PLATFORM OWNER ACTIONS (Platform Admin -> Settings -> Communication)
// -----------------------------------------------------------------------------

/**
 * Retrieves the global Platform Default Email Gateway configuration
 */
export const getPlatformEmailGatewayAction = withPlatformAction(
  { permission: 'system.view' },
  async (_ctx): Promise<EmailGatewayRecord | null> => {
    const adminClient = createAdminClient()
    const { data, error } = await (adminClient as any)
      .from('email_gateways')
      .select('*')
      .is('tenant_id', null)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      return sanitizeGatewayRecord(data)
    }

    // Check environment SMTP fallback
    const smtpHost = process.env.PLATFORM_SMTP_HOST || process.env.SMTP_HOST
    if (smtpHost) {
      const envSmtp: EmailGatewayRecord = {
        id: 'gw-platform-env-smtp',
        tenant_id: null,
        scope_type: 'PLATFORM',
        provider: 'smtp',
        type: 'transactional',
        smtp_host: smtpHost,
        smtp_port: Number(process.env.PLATFORM_SMTP_PORT || process.env.SMTP_PORT) || 587,
        smtp_username: process.env.PLATFORM_SMTP_USER || process.env.SMTP_USER || process.env.SMTP_USERNAME || null,
        encrypted_credentials: null,
        encryption_type: ((process.env.PLATFORM_SMTP_SECURE || process.env.SMTP_SECURE) === 'true' ? 'ssl' : 'tls') as any,
        sender_name: process.env.PLATFORM_SENDER_NAME || process.env.SMTP_FROM_NAME || 'PrintFlow Platform',
        sender_email: process.env.PLATFORM_SENDER_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.PLATFORM_SMTP_USER || process.env.SMTP_USER || 'printflow.bd@gmail.com',
        reply_to_email: process.env.PLATFORM_SENDER_EMAIL || process.env.SMTP_REPLY_TO || 'printflow.bd@gmail.com',
        status: 'active',
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return sanitizeGatewayRecord(envSmtp)
    }

    // Check local data store (development/tests only)
    if (process.env.NODE_ENV !== 'production') {
      const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printflow_email_gateways') || []
      const platLocal = localGateways.find((g) => !g.tenant_id && g.is_default && g.status === 'active')
      if (platLocal) {
        return sanitizeGatewayRecord(platLocal)
      }
    }

    return null
  }
)

/**
 * Creates or updates the Platform Default Email Gateway with encrypted credentials
 */
export const savePlatformEmailGatewayAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'email.save_platform_gateway',
    entityType: 'email_gateway',
  },
  async (ctx, formData: EmailGatewayFormData): Promise<EmailGatewayRecord> => {
    const adminClient = createAdminClient()

    // Encrypt password or API key if provided
    let encryptedCreds: string | null = null
    const secretToEncrypt = formData.password || formData.api_key
    if (secretToEncrypt && !secretToEncrypt.startsWith('v1:')) {
      encryptedCreds = encryptSecret(secretToEncrypt)
    }

    const gatewayPayload = {
      tenant_id: null,
      scope_type: 'PLATFORM' as const,
      provider: formData.provider,
      type: formData.type || 'transactional',
      smtp_host: formData.smtp_host || null,
      smtp_port: formData.smtp_port ? Number(formData.smtp_port) : null,
      smtp_username: formData.smtp_username || null,
      ...(encryptedCreds ? { encrypted_credentials: encryptedCreds } : {}),
      encryption_type: formData.encryption_type || 'tls',
      gmail_account_email: formData.gmail_account_email || null,
      gmail_display_name: formData.gmail_display_name || null,
      sender_name: formData.sender_name,
      sender_email: formData.sender_email,
      reply_to_email: formData.reply_to_email || null,
      status: formData.status || 'active',
      is_default: true,
      extra_settings: {
        aws_region: formData.aws_region || undefined,
        ses_config_set: formData.ses_config_set || undefined,
      },
      updated_at: new Date().toISOString(),
    }

    // Check existing
    const { data: existing } = await (adminClient as any)
      .from('email_gateways')
      .select('id')
      .is('tenant_id', null)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let savedRecord: EmailGatewayRecord

    if (existing?.id) {
      const { data, error } = await (adminClient as any)
        .from('email_gateways')
        .update(gatewayPayload)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      savedRecord = data
    } else {
      let insertRes = await (adminClient as any)
        .from('email_gateways')
        .insert({
          ...gatewayPayload,
          created_by: ctx.platformUser.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (
        insertRes.error &&
        (insertRes.error.message?.includes('created_by_fkey') || insertRes.error.code === '23503')
      ) {
        insertRes = await (adminClient as any)
          .from('email_gateways')
          .insert({
            ...gatewayPayload,
            created_by: null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()
      }

      if (insertRes.error) throw insertRes.error
      savedRecord = insertRes.data
    }

    // Sync to local data store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printflow_email_gateways') || []
    const updatedLocal = localGateways.filter((g) => g.tenant_id !== null)
    updatedLocal.push(savedRecord)
    EmailDataStore.set('printflow_email_gateways', updatedLocal)

    try {
      await AuditService.logEvent(
        'platform',
        ctx.platformUser.id,
        ctx.platformUser.email || 'Platform Admin',
        'email.platform_gateway_updated',
        'email_gateway',
        savedRecord.id,
        null,
        { provider: savedRecord.provider, sender: savedRecord.sender_email },
        `Platform default email gateway updated to ${savedRecord.provider}`
      )
    } catch {}

    return sanitizeGatewayRecord(savedRecord)
  }
)

/**
 * Disconnects Platform Gmail Gateway, revoking tokens with Google and removing record
 */
export const disconnectPlatformGmailAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'email.disconnect_platform_gmail',
    entityType: 'email_gateway',
  },
  async (ctx) => {
    const adminClient = createAdminClient()

    // 1. Fetch existing platform gmail gateway to get tokens for revocation
    const { data: existing } = await (adminClient as any)
      .from('email_gateways')
      .select('*')
      .is('tenant_id', null)
      .eq('provider', 'gmail')
      .maybeSingle()

    if (existing?.encrypted_credentials) {
      try {
        const decrypted = decryptSecret(existing.encrypted_credentials)
        const parsed = JSON.parse(decrypted)
        if (parsed.refresh_token || parsed.access_token) {
          await revokeGoogleToken(parsed.refresh_token || parsed.access_token)
        }
      } catch {}
    }

    // 2. Delete or deactivate platform gmail record
    await (adminClient as any)
      .from('email_gateways')
      .delete()
      .is('tenant_id', null)
      .eq('provider', 'gmail')

    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printflow_email_gateways') || []
    EmailDataStore.set(
      'printflow_email_gateways',
      localGateways.filter((g) => g.tenant_id !== null || g.provider !== 'gmail')
    )

    try {
      await AuditService.logEvent(
        'platform',
        ctx.platformUser.id,
        ctx.platformUser.email || 'Platform Admin',
        'email.platform_gmail_disconnected',
        'email_gateway',
        existing?.id || 'platform-gmail',
        null,
        { provider: 'gmail' },
        'Platform Gmail account disconnected and tokens revoked'
      )
    } catch {}

    return { success: true }
  }
)

/**
 * Tests live connection for a platform gateway configuration
 */
export const testPlatformEmailGatewayAction = withPlatformAction(
  { permission: 'system.manage' },
  async (_ctx, formData: Partial<EmailGatewayFormData> & { provider: EmailProviderType }): Promise<ConnectionTestResult> => {
    const tempGatewayRecord: EmailGatewayRecord = {
      id: formData.id || 'temp-test-gw',
      tenant_id: null,
      scope_type: 'PLATFORM',
      provider: formData.provider,
      type: formData.type || 'transactional',
      smtp_host: formData.smtp_host || null,
      smtp_port: formData.smtp_port ? Number(formData.smtp_port) : null,
      smtp_username: formData.smtp_username || null,
      encrypted_credentials: formData.password || formData.api_key || null,
      encryption_type: formData.encryption_type || 'tls',
      gmail_account_email: formData.gmail_account_email || null,
      gmail_display_name: formData.gmail_display_name || null,
      sender_name: formData.sender_name || 'PrintFlow Platform',
      sender_email: formData.sender_email || 'test@printflow.bd',
      reply_to_email: formData.reply_to_email || null,
      status: 'active',
      is_default: true,
      extra_settings: {
        aws_region: formData.aws_region,
        ses_config_set: formData.ses_config_set,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!tempGatewayRecord.encrypted_credentials) {
      const adminClient = createAdminClient()
      const { data: existing } = await (adminClient as any)
        .from('email_gateways')
        .select('*')
        .is('tenant_id', null)
        .eq('provider', formData.provider)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        tempGatewayRecord.id = existing.id
        tempGatewayRecord.encrypted_credentials = existing.encrypted_credentials
        tempGatewayRecord.gmail_account_email = tempGatewayRecord.gmail_account_email || existing.gmail_account_email
        tempGatewayRecord.gmail_display_name = tempGatewayRecord.gmail_display_name || existing.gmail_display_name
        tempGatewayRecord.token_expires_at = existing.token_expires_at
        tempGatewayRecord.sender_email = tempGatewayRecord.sender_email || existing.sender_email
        tempGatewayRecord.sender_name = tempGatewayRecord.sender_name || existing.sender_name
        tempGatewayRecord.extra_settings = existing.extra_settings || tempGatewayRecord.extra_settings
      }
    }

    return await EmailGatewayService.testConnection(tempGatewayRecord)
  }
)

/**
 * Sends a real test email using the Platform Default Gateway
 */
export const sendTestPlatformEmailAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'email.send_platform_test',
    entityType: 'email',
  },
  async (ctx, recipientEmail: string): Promise<SendEmailResult> => {
    return await EmailGatewayService.sendEmail({
      scopeType: 'PLATFORM',
      tenantId: null,
      eventType: 'test_email',
      recipient: recipientEmail,
      variables: {
        company_name: 'PrintFlow Platform Admin',
        sender_name: 'PrintFlow System Notifications',
        sender_email: recipientEmail,
        provider_name: 'Platform Email Gateway',
        timestamp: new Date().toLocaleString(),
      },
      sentBy: ctx.platformUser.id,
    })
  }
)

export const sendPlatformTestEmailAction = sendTestPlatformEmailAction

/**
 * Fetches all Platform Default Email Templates
 */
export const getPlatformEmailTemplatesAction = withPlatformAction(
  { permission: 'system.view' },
  async (_ctx): Promise<EmailTemplateRecord[]> => {
    try {
      const adminClient = createAdminClient()
      const { data } = await (adminClient as any)
        .from('email_templates')
        .select('*')
        .is('tenant_id', null)
        .order('name', { ascending: true })

      if (data && data.length > 0) {
        return data
      }

      return DEFAULT_EMAIL_TEMPLATES
    } catch {
      return DEFAULT_EMAIL_TEMPLATES
    }
  }
)

/**
 * Saves a Platform Email Template
 */
export const savePlatformEmailTemplateAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'email.save_template',
    entityType: 'email_template',
  },
  async (_ctx, template: Partial<EmailTemplateRecord>): Promise<EmailTemplateRecord> => {
    const adminClient = createAdminClient()
    const payload = {
      tenant_id: null,
      event_type: template.event_type!,
      name: template.name!,
      name_bn: template.name_bn || null,
      subject_template: template.subject_template!,
      subject_template_bn: template.subject_template_bn || null,
      body_template: template.body_template!,
      body_template_bn: template.body_template_bn || null,
      variables: template.variables || [],
      status: template.status || 'active',
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await (adminClient as any)
      .from('email_templates')
      .select('id')
      .is('tenant_id', null)
      .eq('event_type', template.event_type)
      .maybeSingle()

    let saved: EmailTemplateRecord
    if (existing?.id) {
      const { data, error } = await (adminClient as any)
        .from('email_templates')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      saved = data
    } else {
      const { data, error } = await (adminClient as any)
        .from('email_templates')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      saved = data
    }

    return saved
  }
)

/**
 * Retrieves platform-wide email transmission logs
 */
export const getPlatformEmailLogsAction = withPlatformAction(
  { permission: 'system.view' },
  async (_ctx, filters?: {
    status?: string
    search?: string
    limit?: number
  }): Promise<EmailLogRecord[]> => {
    try {
      const adminClient = createAdminClient()
      let query = (adminClient as any)
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 50)

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters?.search) {
        query = query.or(`recipient.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`)
      }

      const { data } = await query
      if (data && data.length > 0) {
        return data
      }

      // Local DataStore fallback
      return EmailDataStore.get<EmailLogRecord[]>('printflow_email_logs') || []
    } catch {
      return EmailDataStore.get<EmailLogRecord[]>('printflow_email_logs') || []
    }
  }
)

/**
 * Triggers background queue runner (authenticated platform admin only)
 */
export const processEmailQueueAction = withPlatformAction(
  {
    permission: 'system.manage',
    actionName: 'system.process_email_queue',
    entityType: 'system_job',
  },
  async (_ctx): Promise<{
    success: boolean
    processed: number
    succeeded: number
    failed: number
  }> => {
    try {
      const res = await EmailGatewayService.processQueue(20)
      return { success: true, ...res }
    } catch {
      return { success: false, processed: 0, succeeded: 0, failed: 0 }
    }
  }
)

// -----------------------------------------------------------------------------
// TENANT ACTIONS (Tenant Settings -> Communication -> Email)
// -----------------------------------------------------------------------------

/**
 * Retrieves the tenant's email gateway configuration (credentials sanitized)
 */
export const getTenantEmailGatewayAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string) : Promise<{
  success: boolean
  customGateway?: EmailGatewayRecord | null
  hasConfiguredGateway: boolean
  error?: string
}> => {
  try {
    await requireTenantUser(companyId)

    const adminClient = createAdminClient()

    // 1. Check custom gateway for tenant (highest priority default or active)
    const { data: tenantGw } = await (adminClient as any)
      .from('email_gateways')
      .select('*')
      .eq('tenant_id', companyId)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printflow_email_gateways') || []
    const localTenant = localGateways.find((g) => g.tenant_id === companyId)

    const activeCustom = tenantGw || localTenant

    return {
      success: true,
      customGateway: activeCustom ? sanitizeGatewayRecord(activeCustom) : null,
      hasConfiguredGateway: !!activeCustom && activeCustom.status === 'active',
    }
  } catch (err: any) {
    return {
      success: false,
      hasConfiguredGateway: false,
      error: err?.message || 'Failed to retrieve tenant email configuration',
    }
  }

})

/**
 * Saves or updates tenant custom email gateway (SMTP or Custom)
 */
export const saveTenantEmailGatewayAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string,
  formData: EmailGatewayFormData) : Promise<{ success: boolean; data?: EmailGatewayRecord; error?: string }> => {
  try {
    const tenantUser = await requireTenantPermission(companyId, 'settings.edit')

    const adminClient = createAdminClient()

    let encryptedCreds: string | null = null
    const secretToEncrypt = formData.password || formData.api_key
    if (secretToEncrypt && !secretToEncrypt.startsWith('v1:')) {
      encryptedCreds = encryptSecret(secretToEncrypt)
    }

    const payload = {
      tenant_id: companyId,
      scope_type: 'TENANT' as const,
      provider: formData.provider,
      type: 'transactional' as const,
      smtp_host: formData.smtp_host || null,
      smtp_port: formData.smtp_port ? Number(formData.smtp_port) : null,
      smtp_username: formData.smtp_username || null,
      ...(encryptedCreds ? { encrypted_credentials: encryptedCreds } : {}),
      encryption_type: formData.encryption_type || 'tls',
      gmail_account_email: formData.gmail_account_email || null,
      gmail_display_name: formData.gmail_display_name || null,
      sender_name: formData.sender_name,
      sender_email: formData.sender_email,
      reply_to_email: formData.reply_to_email || null,
      status: formData.status || 'active',
      is_default: true,
      extra_settings: {
        aws_region: formData.aws_region || undefined,
        ses_config_set: formData.ses_config_set || undefined,
      },
      updated_at: new Date().toISOString(),
    }

    // Deactivate other gateways before saving new active default
    try {
      await (adminClient as any)
        .from('email_gateways')
        .update({ is_default: false, status: 'inactive' })
        .eq('tenant_id', companyId)
        .neq('provider', formData.provider)
    } catch {}

    const { data: existing } = await (adminClient as any)
      .from('email_gateways')
      .select('id')
      .eq('tenant_id', companyId)
      .eq('provider', formData.provider)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let savedRecord: EmailGatewayRecord

    if (existing?.id) {
      const { data, error } = await (adminClient as any)
        .from('email_gateways')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      savedRecord = data
    } else {
      let insertRes = await (adminClient as any)
        .from('email_gateways')
        .insert({
          ...payload,
          created_by: tenantUser.userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (
        insertRes.error &&
        (insertRes.error.message?.includes('created_by_fkey') || insertRes.error.code === '23503')
      ) {
        insertRes = await (adminClient as any)
          .from('email_gateways')
          .insert({
            ...payload,
            created_by: null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()
      }

      if (insertRes.error) throw insertRes.error
      savedRecord = insertRes.data
    }

    // Sync to local data store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printflow_email_gateways') || []
    const updatedLocal = localGateways.filter((g) => g.tenant_id !== companyId)
    updatedLocal.push(savedRecord)
    EmailDataStore.set('printflow_email_gateways', updatedLocal)

    try {
      await AuditService.logEvent(
        companyId,
        tenantUser.userId,
        tenantUser.fullName || 'Admin',
        'email.tenant_gateway_updated',
        'email_gateway',
        savedRecord.id,
        null,
        { provider: savedRecord.provider, sender: savedRecord.sender_email },
        `Tenant email gateway updated to ${savedRecord.provider}`
      )
    } catch {}

    return { success: true, data: sanitizeGatewayRecord(savedRecord) }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save tenant email gateway' }
  }

})

/**
 * Disconnects Tenant Gmail provider and revokes OAuth tokens
 */
export const disconnectTenantGmailAction = withTenantAction(
  {
    permission: "settings.manage",
    destructive: true,
    auditAction: "email-gateway.disconnecttenantgmail",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string) : Promise<{ success: boolean; error?: string }> => {
  try {
    const tenantUser = await requireTenantPermission(companyId, 'settings.edit')

    const adminClient = createAdminClient()
    const { data: existing } = await (adminClient as any)
      .from('email_gateways')
      .select('*')
      .eq('tenant_id', companyId)
      .eq('provider', 'gmail')
      .maybeSingle()

    if (existing?.encrypted_credentials) {
      try {
        const decrypted = decryptSecret(existing.encrypted_credentials)
        const parsed = JSON.parse(decrypted)
        if (parsed.refresh_token || parsed.access_token) {
          await revokeGoogleToken(parsed.refresh_token || parsed.access_token)
        }
      } catch {}
    }

    await (adminClient as any)
      .from('email_gateways')
      .delete()
      .eq('tenant_id', companyId)
      .eq('provider', 'gmail')

    // Remove from local store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printflow_email_gateways') || []
    EmailDataStore.set(
      'printflow_email_gateways',
      localGateways.filter((g) => g.tenant_id !== companyId || g.provider !== 'gmail')
    )

    try {
      await AuditService.logEvent(
        companyId,
        tenantUser.userId,
        tenantUser.fullName || 'Admin',
        'email.tenant_gmail_disconnected',
        'email_gateway',
        existing?.id || 'tenant-gmail',
        null,
        { provider: 'gmail' },
        'Tenant Gmail account disconnected and tokens revoked'
      )
    } catch {}

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to disconnect Gmail' }
  }

})

/**
 * Removes custom tenant gateway and disables email sending
 */
export const deleteTenantEmailGatewayAction = withTenantAction(
  {
    permission: "settings.manage",
    destructive: true,
    auditAction: "email-gateway.deletetenantemailgateway",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string) : Promise<{ success: boolean; error?: string }> => {
  try {
    const tenantUser = await requireTenantPermission(companyId, 'settings.edit')

    const adminClient = createAdminClient()
    await (adminClient as any).from('email_gateways').delete().eq('tenant_id', companyId)

    // Remove from local store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printflow_email_gateways') || []
    EmailDataStore.set(
      'printflow_email_gateways',
      localGateways.filter((g) => g.tenant_id !== companyId)
    )

    try {
      await AuditService.logEvent(
        companyId,
        tenantUser.userId,
        tenantUser.fullName || 'Admin',
        'email.tenant_gateway_removed',
        'email_gateway',
        'deleted',
        null,
        {},
        'Tenant email gateway configuration disabled/removed'
      )
    } catch {}

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reset gateway' }
  }

})

/**
 * Tests live connection for a tenant gateway configuration
 */
export const testTenantEmailGatewayAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string,
  formData: Partial<EmailGatewayFormData> & { provider: EmailProviderType }) : Promise<ConnectionTestResult> => {
  try {
    await requireTenantPermission(companyId, 'settings.edit')

    const tempGatewayRecord: EmailGatewayRecord = {
      id: formData.id || 'temp-tenant-test-gw',
      tenant_id: companyId,
      scope_type: 'TENANT',
      provider: formData.provider,
      type: 'transactional',
      smtp_host: formData.smtp_host || null,
      smtp_port: formData.smtp_port ? Number(formData.smtp_port) : null,
      smtp_username: formData.smtp_username || null,
      encrypted_credentials: formData.password || formData.api_key || null,
      encryption_type: formData.encryption_type || 'tls',
      gmail_account_email: formData.gmail_account_email || null,
      gmail_display_name: formData.gmail_display_name || null,
      sender_name: formData.sender_name || 'Business Mailer',
      sender_email: formData.sender_email || 'noreply@printflow.bd',
      reply_to_email: formData.reply_to_email || null,
      status: 'active',
      is_default: true,
      extra_settings: {
        aws_region: formData.aws_region,
        ses_config_set: formData.ses_config_set,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!tempGatewayRecord.encrypted_credentials) {
      const adminClient = createAdminClient()
      const { data: existing } = await (adminClient as any)
        .from('email_gateways')
        .select('*')
        .eq('tenant_id', companyId)
        .eq('provider', formData.provider)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        tempGatewayRecord.id = existing.id
        tempGatewayRecord.encrypted_credentials = existing.encrypted_credentials
        tempGatewayRecord.gmail_account_email = tempGatewayRecord.gmail_account_email || existing.gmail_account_email
        tempGatewayRecord.gmail_display_name = tempGatewayRecord.gmail_display_name || existing.gmail_display_name
        tempGatewayRecord.token_expires_at = existing.token_expires_at
        tempGatewayRecord.sender_email = tempGatewayRecord.sender_email || existing.sender_email
        tempGatewayRecord.sender_name = tempGatewayRecord.sender_name || existing.sender_name
        tempGatewayRecord.extra_settings = existing.extra_settings || tempGatewayRecord.extra_settings
      }
    }

    return await EmailGatewayService.testConnection(tempGatewayRecord)
  } catch (err: any) {
    return {
      success: false,
      provider: formData.provider,
      latencyMs: 0,
      message: err?.message || 'Connection test failed',
    }
  }

})

/**
 * Sends a real test email using the tenant's active gateway (Gmail or SMTP)
 */
export const sendTestTenantEmailAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string,
  recipientEmail: string) : Promise<SendEmailResult> => {
  try {
    const tenant = await requireTenantPermission(companyId, 'settings.edit')

    const result = await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: companyId,
      eventType: 'test_email',
      recipient: recipientEmail,
      variables: {
        company_name: tenant.companyName,
        sender_name: tenant.companyName,
        sender_email: recipientEmail,
        provider_name: 'Tenant Active Email Gateway',
        timestamp: new Date().toLocaleString(),
      },
      sentBy: tenant.userId,
    })

    return result
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      error: err?.message || 'Failed to dispatch test email',
    }
  }

})

/**
 * Retrieves tenant customized templates merged with platform defaults
 */
export const getTenantEmailTemplatesAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string) : Promise<{ success: boolean; data: EmailTemplateRecord[] }> => {
  try {
    await requireTenantUser(companyId)

    const adminClient = createAdminClient()

    // 1. Fetch tenant templates
    const { data: tenantTpls } = await (adminClient as any)
      .from('email_templates')
      .select('*')
      .eq('tenant_id', companyId)

    // 2. Fetch platform templates
    const { data: platformTpls } = await (adminClient as any)
      .from('email_templates')
      .select('*')
      .is('tenant_id', null)

    const baseList: EmailTemplateRecord[] =
      platformTpls && platformTpls.length > 0 ? platformTpls : DEFAULT_EMAIL_TEMPLATES

    // Merge: tenant customized overrides platform default
    const mergedMap = new Map<string, EmailTemplateRecord>()
    baseList.forEach((t) => mergedMap.set(t.event_type, t))
    if (tenantTpls) {
      tenantTpls.forEach((t: EmailTemplateRecord) => mergedMap.set(t.event_type, t))
    }

    return { success: true, data: Array.from(mergedMap.values()) }
  } catch {
    return { success: true, data: DEFAULT_EMAIL_TEMPLATES }
  }

})

/**
 * Saves a customized email template for a specific tenant
 */
export const saveTenantEmailTemplateAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string,
  template: Partial<EmailTemplateRecord>) : Promise<{ success: boolean; data?: EmailTemplateRecord; error?: string }> => {
  try {
    await requireTenantPermission(companyId, 'settings.edit')

    const adminClient = createAdminClient()
    const payload = {
      tenant_id: companyId,
      event_type: template.event_type!,
      name: template.name!,
      name_bn: template.name_bn || null,
      subject_template: template.subject_template!,
      subject_template_bn: template.subject_template_bn || null,
      body_template: template.body_template!,
      body_template_bn: template.body_template_bn || null,
      variables: template.variables || [],
      status: template.status || 'active',
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await (adminClient as any)
      .from('email_templates')
      .select('id')
      .eq('tenant_id', companyId)
      .eq('event_type', template.event_type)
      .maybeSingle()

    let saved: EmailTemplateRecord
    if (existing?.id) {
      const { data, error } = await (adminClient as any)
        .from('email_templates')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      saved = data
    } else {
      const { data, error } = await (adminClient as any)
        .from('email_templates')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      saved = data
    }

    return { success: true, data: saved }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save template' }
  }

})

/**
 * Retrieves tenant-isolated email transmission logs
 */
export const getTenantEmailLogsAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string,
  filters?: { status?: string; search?: string }) : Promise<{ success: boolean; data: EmailLogRecord[] }> => {
  try {
    await requireTenantUser(companyId)

    const adminClient = createAdminClient()
    let query = (adminClient as any)
      .from('email_logs')
      .select('*')
      .eq('tenant_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.search) {
      query = query.or(`recipient.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`)
    }

    const { data } = await query
    if (data && data.length > 0) {
      return { success: true, data }
    }

    const localLogs = (EmailDataStore.get<EmailLogRecord[]>('printflow_email_logs') || []).filter(
      (l) => l.tenant_id === companyId
    )
    return { success: true, data: localLogs }
  } catch {
    const localLogs = (EmailDataStore.get<EmailLogRecord[]>('printflow_email_logs') || []).filter(
      (l) => l.tenant_id === companyId
    )
    return { success: true, data: localLogs }
  }

})

/**
 * Dispatches an automated workflow email
 */
export const dispatchWorkflowEmailAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "email-gateway"
  },
  async (ctx, companyId: string,
  eventType: string,
  recipientEmail: string,
  payload: {
    variables?: Record<string, any>
    customSubject?: string
    customHtmlBody?: string
    idempotencyKey?: string
    attachments?: Array<{ filename: string; content?: string; path?: string }>
  }) : Promise<SendEmailResult> => {
  try {
    const tenantUser = await requireTenantUser(companyId)

    return await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: companyId,
      eventType,
      recipient: recipientEmail,
      variables: {
        company_name: tenantUser.companyName,
        ...payload.variables,
      },
      customSubject: payload.customSubject,
      customHtmlBody: payload.customHtmlBody,
      idempotencyKey: payload.idempotencyKey,
      attachments: payload.attachments,
      sentBy: tenantUser.userId,
    })
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      error: err?.message || 'Failed to dispatch workflow email',
    }
  }

})

/**
 * Safe server-side diagnostic: checks whether Google OAuth credentials exist without exposing secrets.
 * Accessible to authenticated platform administrators and tenant users.
 */
export async function getGoogleOAuthStatusAction(): Promise<{
  success: boolean
  isConfigured: boolean
  hasClientId: boolean
  hasClientSecret: boolean
  hasRedirectUri: boolean
  redirectUri: string
  issues: string[]
  error?: string
}> {
  try {
    const [platformUser, tenantUser] = await Promise.all([
      getAuthenticatedPlatformContext().catch(() => null),
      getCurrentTenant().catch(() => null),
    ])

    if (!platformUser?.isActive && !tenantUser?.userId) {
      return {
        success: false,
        isConfigured: false,
        hasClientId: false,
        hasClientSecret: false,
        hasRedirectUri: false,
        redirectUri: '',
        issues: ['Unauthorized'],
        error: 'Unauthorized',
      }
    }

    const diag = getGoogleOAuthDiagnostics()
    return {
      success: true,
      isConfigured: diag.isConfigured,
      hasClientId: diag.hasClientId,
      hasClientSecret: diag.hasClientSecret,
      hasRedirectUri: diag.hasRedirectUri,
      redirectUri: diag.redirectUri,
      issues: diag.issues,
    }
  } catch (err: any) {
    return {
      success: false,
      isConfigured: false,
      hasClientId: false,
      hasClientSecret: false,
      hasRedirectUri: false,
      redirectUri: '',
      issues: [err?.message || 'Failed to check Google OAuth configuration status'],
      error: err?.message,
    }
  }
}

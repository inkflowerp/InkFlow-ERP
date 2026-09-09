'use server'

// ==============================================================================
// PrintERP SaaS - Multi-Tenant Email Gateway Server Actions
// Enforces strict platform vs tenant authorization boundaries.
// Encrypts secrets at rest and prevents credential exposure to frontend.
// ==============================================================================

import { createClient } from '../lib/supabase/server.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { requirePlatformPermission, getAuthenticatedPlatformContext } from '../lib/auth/platform-auth.ts'
import { requireTenantPermission, requireTenantUser } from '../lib/auth/tenant-auth.ts'
import type {
  EmailGatewayRecord,
  EmailGatewayFormData,
  EmailTemplateRecord,
  EmailLogRecord,
  ConnectionTestResult,
  SendEmailResult,
} from '../types/communication.types.ts'
import {
  encryptSecret,
  sanitizeGatewayRecord,
} from '../lib/security/encryption.ts'
import { EmailGatewayService, DEFAULT_PLATFORM_GATEWAY, EmailDataStore } from '../services/email-gateway.service.ts'
import { DEFAULT_EMAIL_TEMPLATES } from '../services/email-template.service.ts'

// -----------------------------------------------------------------------------
// PLATFORM OWNER ACTIONS (Settings -> Communication -> Email Gateway)
// -----------------------------------------------------------------------------

/**
 * Retrieves the global Platform Default Email Gateway configuration
 */
export async function getPlatformEmailGatewayAction(): Promise<{
  success: boolean
  data?: EmailGatewayRecord | null
  error?: string
}> {
  try {
    const platformUser = await getAuthenticatedPlatformContext()
    if (!platformUser || !platformUser.isActive) {
      return { success: false, error: 'Unauthorized: Platform admin credentials required' }
    }

    const adminClient = createAdminClient()
    const { data, error } = await (adminClient as any)
      .from('email_gateways')
      .select('*')
      .is('tenant_id', null)
      .eq('is_default', true)
      .maybeSingle()

    if (!error && data) {
      return { success: true, data: sanitizeGatewayRecord(data) }
    }

    // Check local data store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []
    const platLocal = localGateways.find((g) => !g.tenant_id && g.is_default)
    if (platLocal) {
      return { success: true, data: sanitizeGatewayRecord(platLocal) }
    }

    return { success: true, data: sanitizeGatewayRecord(DEFAULT_PLATFORM_GATEWAY) }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retrieve platform gateway' }
  }
}

/**
 * Creates or updates the Platform Default Email Gateway with encrypted credentials
 */
export async function savePlatformEmailGatewayAction(
  formData: EmailGatewayFormData
): Promise<{ success: boolean; data?: EmailGatewayRecord; error?: string }> {
  try {
    const platformUser = await getAuthenticatedPlatformContext()
    if (!platformUser || !platformUser.isActive) {
      return { success: false, error: 'Unauthorized: Platform admin access required' }
    }

    const adminClient = createAdminClient()

    // Encrypt password or API key if provided
    let encryptedCreds: string | null = null
    const secretToEncrypt = formData.password || formData.api_key
    if (secretToEncrypt && !secretToEncrypt.startsWith('v1:')) {
      encryptedCreds = encryptSecret(secretToEncrypt)
    }

    const gatewayPayload = {
      tenant_id: null,
      provider: formData.provider,
      type: formData.type || 'transactional',
      smtp_host: formData.smtp_host || null,
      smtp_port: formData.smtp_port ? Number(formData.smtp_port) : null,
      smtp_username: formData.smtp_username || null,
      ...(encryptedCreds ? { encrypted_credentials: encryptedCreds } : {}),
      encryption_type: formData.encryption_type || 'tls',
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
      .eq('is_default', true)
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
      const { data, error } = await (adminClient as any)
        .from('email_gateways')
        .insert({
          ...gatewayPayload,
          created_by: platformUser.userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      savedRecord = data
    }

    // Sync to local data store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []
    const updatedLocal = localGateways.filter((g) => g.tenant_id !== null)
    updatedLocal.push(savedRecord)
    EmailDataStore.set('printerp_email_gateways', updatedLocal)

    return { success: true, data: sanitizeGatewayRecord(savedRecord) }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save platform email gateway' }
  }
}

/**
 * Tests live connection for a platform gateway configuration
 */
export async function testPlatformEmailGatewayAction(
  formData: EmailGatewayFormData
): Promise<ConnectionTestResult> {
  try {
    const platformUser = await getAuthenticatedPlatformContext()
    if (!platformUser || !platformUser.isActive) {
      return {
        success: false,
        provider: formData.provider,
        latencyMs: 0,
        message: 'Unauthorized: Platform admin credentials required',
      }
    }

    const tempGatewayRecord: EmailGatewayRecord = {
      id: formData.id || 'temp-test-gw',
      tenant_id: null,
      provider: formData.provider,
      type: formData.type || 'transactional',
      smtp_host: formData.smtp_host || null,
      smtp_port: formData.smtp_port ? Number(formData.smtp_port) : null,
      smtp_username: formData.smtp_username || null,
      encrypted_credentials: formData.password || formData.api_key || null,
      encryption_type: formData.encryption_type || 'tls',
      sender_name: formData.sender_name || 'PrintERP Platform',
      sender_email: formData.sender_email || 'test@printerp.com',
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

    return await EmailGatewayService.testConnection(tempGatewayRecord)
  } catch (err: any) {
    return {
      success: false,
      provider: formData.provider,
      latencyMs: 0,
      message: err?.message || 'Connection test failed',
    }
  }
}

/**
 * Fetches all Platform Default Email Templates
 */
export async function getPlatformEmailTemplatesAction(): Promise<{
  success: boolean
  data: EmailTemplateRecord[]
}> {
  try {
    const adminClient = createAdminClient()
    const { data } = await (adminClient as any)
      .from('email_templates')
      .select('*')
      .is('tenant_id', null)
      .order('name', { ascending: true })

    if (data && data.length > 0) {
      return { success: true, data }
    }

    return { success: true, data: DEFAULT_EMAIL_TEMPLATES }
  } catch {
    return { success: true, data: DEFAULT_EMAIL_TEMPLATES }
  }
}

/**
 * Saves a Platform Email Template
 */
export async function savePlatformEmailTemplateAction(
  template: Partial<EmailTemplateRecord>
): Promise<{ success: boolean; data?: EmailTemplateRecord; error?: string }> {
  try {
    const platformUser = await getAuthenticatedPlatformContext()
    if (!platformUser || !platformUser.isActive) {
      return { success: false, error: 'Unauthorized: Platform admin credentials required' }
    }

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

    return { success: true, data: saved }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save template' }
  }
}

/**
 * Retrieves platform-wide email transmission logs
 */
export async function getPlatformEmailLogsAction(filters?: {
  status?: string
  search?: string
  limit?: number
}): Promise<{ success: boolean; data: EmailLogRecord[] }> {
  try {
    const platformUser = await getAuthenticatedPlatformContext()
    if (!platformUser || !platformUser.isActive) {
      return { success: false, data: [] }
    }

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
      return { success: true, data }
    }

    // Local DataStore fallback
    const localLogs = EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []
    return { success: true, data: localLogs }
  } catch {
    const localLogs = EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []
    return { success: true, data: localLogs }
  }
}

/**
 * Triggers background queue runner
 */
export async function processEmailQueueAction(): Promise<{
  success: boolean
  processed: number
  succeeded: number
  failed: number
}> {
  try {
    const res = await EmailGatewayService.processQueue(20)
    return { success: true, ...res }
  } catch (err: any) {
    return { success: false, processed: 0, succeeded: 0, failed: 0 }
  }
}

// -----------------------------------------------------------------------------
// TENANT ACTIONS (Tenant Settings -> Communication -> Email)
// -----------------------------------------------------------------------------

/**
 * Retrieves the tenant's email gateway configuration & platform fallback state
 */
export async function getTenantEmailGatewayAction(companyId: string): Promise<{
  success: boolean
  customGateway?: EmailGatewayRecord | null
  usingPlatformDefault: boolean
  platformGatewayStatus?: string
  error?: string
}> {
  try {
    await requireTenantUser(companyId)

    const adminClient = createAdminClient()

    // 1. Check custom gateway
    const { data: tenantGw } = await (adminClient as any)
      .from('email_gateways')
      .select('*')
      .eq('tenant_id', companyId)
      .maybeSingle()

    // 2. Check platform gateway status
    const platformGw = await EmailGatewayService.resolveGateway(null)

    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []
    const localTenant = localGateways.find((g) => g.tenant_id === companyId)

    const activeCustom = tenantGw || localTenant

    return {
      success: true,
      customGateway: activeCustom ? sanitizeGatewayRecord(activeCustom) : null,
      usingPlatformDefault: !activeCustom || activeCustom.status === 'inactive',
      platformGatewayStatus: platformGw?.status || 'active',
    }
  } catch (err: any) {
    return {
      success: false,
      usingPlatformDefault: true,
      error: err?.message || 'Failed to retrieve tenant email configuration',
    }
  }
}

/**
 * Saves or updates tenant custom email gateway
 */
export async function saveTenantEmailGatewayAction(
  companyId: string,
  formData: EmailGatewayFormData
): Promise<{ success: boolean; data?: EmailGatewayRecord; error?: string }> {
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
      provider: formData.provider,
      type: 'transactional',
      smtp_host: formData.smtp_host || null,
      smtp_port: formData.smtp_port ? Number(formData.smtp_port) : null,
      smtp_username: formData.smtp_username || null,
      ...(encryptedCreds ? { encrypted_credentials: encryptedCreds } : {}),
      encryption_type: formData.encryption_type || 'tls',
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

    const { data: existing } = await (adminClient as any)
      .from('email_gateways')
      .select('id')
      .eq('tenant_id', companyId)
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
      const { data, error } = await (adminClient as any)
        .from('email_gateways')
        .insert({
          ...payload,
          created_by: tenantUser.userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      savedRecord = data
    }

    // Sync to local data store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []
    const updatedLocal = localGateways.filter((g) => g.tenant_id !== companyId)
    updatedLocal.push(savedRecord)
    EmailDataStore.set('printerp_email_gateways', updatedLocal)

    return { success: true, data: sanitizeGatewayRecord(savedRecord) }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save tenant email gateway' }
  }
}

/**
 * Removes custom tenant gateway and reverts to Platform Default
 */
export async function deleteTenantEmailGatewayAction(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireTenantPermission(companyId, 'settings.edit')

    const adminClient = createAdminClient()
    await (adminClient as any).from('email_gateways').delete().eq('tenant_id', companyId)

    // Remove from local store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []
    EmailDataStore.set(
      'printerp_email_gateways',
      localGateways.filter((g) => g.tenant_id !== companyId)
    )

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reset gateway' }
  }
}

/**
 * Tests live connection for a tenant gateway configuration
 */
export async function testTenantEmailGatewayAction(
  companyId: string,
  formData: EmailGatewayFormData
): Promise<ConnectionTestResult> {
  try {
    await requireTenantPermission(companyId, 'settings.edit')

    const tempGatewayRecord: EmailGatewayRecord = {
      id: formData.id || 'temp-tenant-test-gw',
      tenant_id: companyId,
      provider: formData.provider,
      type: 'transactional',
      smtp_host: formData.smtp_host || null,
      smtp_port: formData.smtp_port ? Number(formData.smtp_port) : null,
      smtp_username: formData.smtp_username || null,
      encrypted_credentials: formData.password || formData.api_key || null,
      encryption_type: formData.encryption_type || 'tls',
      sender_name: formData.sender_name,
      sender_email: formData.sender_email,
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

    return await EmailGatewayService.testConnection(tempGatewayRecord)
  } catch (err: any) {
    return {
      success: false,
      provider: formData.provider,
      latencyMs: 0,
      message: err?.message || 'Connection test failed',
    }
  }
}

/**
 * Sends a real test email using the tenant's active gateway
 */
export async function sendTestTenantEmailAction(
  companyId: string,
  recipientEmail: string
): Promise<SendEmailResult> {
  try {
    const tenant = await requireTenantPermission(companyId, 'settings.edit')

    const result = await EmailGatewayService.sendEmail({
      tenantId: companyId,
      eventType: 'test_email',
      recipient: recipientEmail,
      variables: {
        company_name: tenant.companyName,
        sender_name: tenant.companyName,
        sender_email: recipientEmail,
        provider_name: 'Configured Email Gateway',
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
}

/**
 * Retrieves tenant customized templates merged with platform defaults
 */
export async function getTenantEmailTemplatesAction(
  companyId: string
): Promise<{ success: boolean; data: EmailTemplateRecord[] }> {
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
}

/**
 * Saves a customized email template for a specific tenant
 */
export async function saveTenantEmailTemplateAction(
  companyId: string,
  template: Partial<EmailTemplateRecord>
): Promise<{ success: boolean; data?: EmailTemplateRecord; error?: string }> {
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
}

/**
 * Retrieves tenant-isolated email transmission logs
 */
export async function getTenantEmailLogsAction(
  companyId: string,
  filters?: { status?: string; search?: string }
): Promise<{ success: boolean; data: EmailLogRecord[] }> {
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

    const localLogs = (EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []).filter(
      (l) => l.tenant_id === companyId
    )
    return { success: true, data: localLogs }
  } catch {
    const localLogs = (EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []).filter(
      (l) => l.tenant_id === companyId
    )
    return { success: true, data: localLogs }
  }
}

/**
 * Dispatches an automated workflow email
 */
export async function dispatchWorkflowEmailAction(
  companyId: string,
  eventType: string,
  recipientEmail: string,
  payload: {
    variables?: Record<string, any>
    customSubject?: string
    customHtmlBody?: string
    attachments?: Array<{ filename: string; content?: string; path?: string }>
  }
): Promise<SendEmailResult> {
  try {
    const tenantUser = await requireTenantUser(companyId)

    return await EmailGatewayService.sendEmail({
      tenantId: companyId,
      eventType,
      recipient: recipientEmail,
      variables: {
        company_name: tenantUser.companyName,
        ...payload.variables,
      },
      customSubject: payload.customSubject,
      customHtmlBody: payload.customHtmlBody,
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
}

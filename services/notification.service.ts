// ==============================================================================
// PrintFlow SaaS - Authoritative Preference-Aware Notification Service
// Unified multi-channel dispatcher (In-App, WhatsApp, Email, SMS) with
// Asia/Dhaka Quiet Hours, Template Localization, Business Rules, and Idempotency.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import { CommunicationJobQueue } from '../lib/communication/job-queue.ts'
import { renderTemplate } from '../lib/communication/templates.ts'
import type {
  NotifyInput,
  NotifyResult,
  NotificationEventType,
  NotificationPreferenceRecord,
  NotificationBusinessRuleRecord,
  MessageTemplateRecord,
} from '../types/communication.types.ts'

/**
 * Calculates whether the current time in the 'Asia/Dhaka' timezone falls
 * within configured quiet hours (e.g. 22:00 to 08:00).
 */
export function isWithinDhakaQuietHours(
  startStr = '22:00',
  endStr = '08:00'
): { inQuietHours: boolean; nextResumeTime: Date } {
  const now = new Date()
  const dhakaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })

  const parts = dhakaFormatter.formatToParts(now)
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0'
  const year = parseInt(getPart('year'), 10)
  const month = parseInt(getPart('month'), 10) - 1
  const day = parseInt(getPart('day'), 10)
  const hour = parseInt(getPart('hour'), 10)
  const minute = parseInt(getPart('minute'), 10)

  const currentMinutes = hour * 60 + minute

  const [startH, startM] = startStr.split(':').map((v) => parseInt(v, 10) || 0)
  const [endH, endM] = endStr.split(':').map((v) => parseInt(v, 10) || 0)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  let inQuietHours = false
  if (startMinutes > endMinutes) {
    // Crosses midnight: e.g. 22:00 (1320) to 08:00 (480)
    inQuietHours = currentMinutes >= startMinutes || currentMinutes < endMinutes
  } else {
    inQuietHours = currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  // Calculate resume time at endStr in Asia/Dhaka (UTC+6)
  if (inQuietHours) {
    // If before midnight and startMinutes > endMinutes, resume is tomorrow at endH:endM
    // If after midnight, resume is today at endH:endM
    const daysToAdd = currentMinutes >= startMinutes && startMinutes > endMinutes ? 1 : 0
    const targetUtcMillis = Date.UTC(year, month, day + daysToAdd, endH, endM, 0) - 6 * 3600 * 1000
    return { inQuietHours: true, nextResumeTime: new Date(targetUtcMillis) }
  }

  return { inQuietHours: false, nextResumeTime: now }
}

export class NotificationService {
  /**
   * Main unified notification entrypoint.
   * Delivers in-app notifications in sub-second time and asynchronously
   * enqueues external channels (WhatsApp, Email) adhering to preferences and quiet hours.
   */
  static async notify(input: NotifyInput): Promise<NotifyResult> {
    const adminClient = createAdminClient()
    const { companyId, userId, role, type, entity, payload } = input
    const requestedChannels = input.channels || ['in_app', 'whatsapp', 'email']

    let inAppDeliveredCount = 0
    let jobsEnqueuedCount = 0
    const skippedChannels: string[] = []
    let delayedForQuietHours = false

    try {
      // 1. Resolve Target Recipients
      interface RecipientTarget {
        userId?: string | null
        name?: string
        email?: string | null
        phone?: string | null
        language?: 'bn' | 'en'
      }

      const recipients: RecipientTarget[] = []

      if (userId) {
        // Specific user recipient
        const { data: userProfile } = await (adminClient as any)
          .from('user_profiles')
          .select('id, full_name, email, phone')
          .eq('id', userId)
          .maybeSingle()

        recipients.push({
          userId,
          name: userProfile?.full_name || payload.recipientName || 'User',
          email: userProfile?.email || payload.recipientEmail || null,
          phone: userProfile?.phone || payload.recipientPhone || null,
          language: 'bn',
        })
      } else if (role) {
        // Role-based target (e.g. 'owner', 'accountant', 'designer', 'operator')
        const { data: companyUsers } = await (adminClient as any)
          .from('company_users')
          .select('user_id, responsibilities, raw_overrides')
          .eq('company_id', companyId)
          .eq('status', 'active')

        const matchedUserIds: string[] = []
        for (const cu of companyUsers || []) {
          const respList = (cu.responsibilities || []).map((r: any) =>
            typeof r === 'string' ? r.toLowerCase() : (r.code || r.name || '').toLowerCase()
          )

          const targetRole = role.toLowerCase()
          if (
            respList.includes(targetRole) ||
            (targetRole === 'owner' && (respList.includes('business_owner') || respList.includes('admin') || respList.includes('owner'))) ||
            (targetRole === 'accountant' && (respList.includes('accountant') || respList.includes('finance'))) ||
            (targetRole === 'designer' && (respList.includes('designer') || respList.includes('pre-press'))) ||
            (targetRole === 'operator' && (respList.includes('operator') || respList.includes('production')))
          ) {
            if (cu.user_id) matchedUserIds.push(cu.user_id)
          }
        }

        if (matchedUserIds.length > 0) {
          const { data: profiles } = await (adminClient as any)
            .from('user_profiles')
            .select('id, full_name, email, phone')
            .in('id', matchedUserIds)

          for (const p of profiles || []) {
            recipients.push({
              userId: p.id,
              name: p.full_name || 'Staff',
              email: p.email || null,
              phone: p.phone || null,
              language: 'bn',
            })
          }
        }
      }

      // If no internal users matched, fallback to tenant owner or broadcast
      if (recipients.length === 0 && !payload.recipientPhone && !payload.recipientEmail) {
        const { data: companyUsers } = await (adminClient as any)
          .from('company_users')
          .select('user_id, responsibilities')
          .eq('company_id', companyId)
          .eq('status', 'active')

        const ownerUser = (companyUsers || []).find((cu: any) => {
          const resps = (cu.responsibilities || []).map((r: any) => String(r).toLowerCase())
          return resps.includes('business_owner') || resps.includes('owner') || resps.includes('admin')
        }) || (companyUsers && companyUsers[0])

        if (ownerUser?.user_id) {
          const { data: prof } = await (adminClient as any)
            .from('user_profiles')
            .select('id, full_name, email, phone')
            .eq('id', ownerUser.user_id)
            .maybeSingle()

          recipients.push({
            userId: ownerUser.user_id,
            name: prof?.full_name || 'Owner',
            email: prof?.email || null,
            phone: prof?.phone || null,
            language: 'bn',
          })
        }
      }

      // External recipient (Customer / Supplier / Guest) - only add if not already in recipients
      if (payload.recipientPhone || payload.recipientEmail) {
        const alreadyAdded = recipients.some(
          (r) =>
            (r.userId && (r.userId === userId || r.userId === payload.recipientUserId)) ||
            (payload.recipientEmail && r.email === payload.recipientEmail) ||
            (payload.recipientPhone && r.phone === payload.recipientPhone)
        )

        if (!alreadyAdded) {
          recipients.push({
            userId: payload.recipientUserId || null,
            name: payload.recipientName || 'Valued Customer',
            email: payload.recipientEmail || null,
            phone: payload.recipientPhone || null,
            language: 'bn',
          })
        }
      }

      // 2. Fetch Message Template from PostgreSQL
      const { data: dbTemplate } = await (adminClient as any)
        .from('message_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('template_key', type)
        .maybeSingle()

      // 3. Process Each Recipient
      for (const rec of recipients) {
        // A. Resolve Preferences
        let pref: NotificationPreferenceRecord | null = null
        if (rec.userId) {
          const { data: userPref } = await (adminClient as any)
            .from('notification_preferences')
            .select('*')
            .eq('tenant_id', companyId)
            .eq('event_type', type)
            .eq('user_id', rec.userId)
            .maybeSingle()

          pref = userPref
        }

        // Fallback to tenant-wide default preference
        if (!pref) {
          const { data: tenantPref } = await (adminClient as any)
            .from('notification_preferences')
            .select('*')
            .eq('tenant_id', companyId)
            .eq('event_type', type)
            .is('user_id', null)
            .maybeSingle()

          pref = tenantPref
        }

        // Check channel toggles
        const allowInApp = pref ? pref.in_app_enabled : true
        const allowWhatsApp = pref ? pref.whatsapp_enabled : true
        const allowEmail = pref ? pref.email_enabled : true
        const allowSms = pref ? pref.sms_enabled : false

        // B. Check Quiet Hours in Asia/Dhaka
        let isQuiet = false
        let resumeTime: Date | null = null
        if (pref?.quiet_hours_enabled) {
          const qh = isWithinDhakaQuietHours(pref.quiet_hours_start, pref.quiet_hours_end)
          isQuiet = qh.inQuietHours
          resumeTime = qh.nextResumeTime
        }

        // C. Render Localized Content (Never mix languages)
        const variables: Record<string, string> = {
          customer_name: rec.name || payload.recipientName || 'Customer',
          recipient_name: rec.name || 'User',
          invoice_number: entity?.number || payload.invoice_number || payload.number || 'INV',
          quotation_number: entity?.number || payload.quotation_number || 'QTN',
          order_number: entity?.number || payload.order_number || 'ORD',
          job_number: entity?.number || payload.job_number || 'JOB',
          task_number: entity?.number || payload.task_number || 'TSK',
          design_number: entity?.number || payload.design_number || 'DSG',
          ticket_number: entity?.number || payload.ticket_number || 'TCK',
          amount: payload.amount !== undefined ? String(payload.amount) : '0',
          due_amount: payload.due_amount !== undefined ? String(payload.due_amount) : '0',
          current_stock: payload.current_stock !== undefined ? String(payload.current_stock) : '0',
          reorder_level: payload.reorder_level !== undefined ? String(payload.reorder_level) : '0',
          item_name: payload.item_name || 'Item',
          unit: payload.unit || 'pcs',
          reason: payload.reason || '',
          new_eta: payload.new_eta || '',
          machine_name: payload.machine_name || 'Machine',
          problem_type: payload.problem_type || 'Maintenance Issue',
          description: payload.description || '',
          comment: payload.comment || '',
          status: payload.status || 'Updated',
          date: payload.date || new Date().toISOString().split('T')[0],
          preview: payload.preview || payload.message || '',
          plan_name: payload.plan_name || 'Standard',
          ...(payload.variables || {}),
        }

        const titleEn = payload.title || dbTemplate?.name || 'Notification'
        const titleBn = payload.title_bn || dbTemplate?.name || payload.title || 'বিজ্ঞপ্তি'

        const bodyEn = dbTemplate?.body_en
          ? renderTemplate(dbTemplate.body_en, variables)
          : payload.message || 'Notification event occurred'

        const bodyBn = dbTemplate?.body_bn
          ? renderTemplate(dbTemplate.body_bn, variables)
          : payload.message_bn || payload.message || 'বিজ্ঞপ্তি প্রাপ্ত হয়েছে'

        // D. Deliver In-App (Realtime: immediate, only for registered users, even during quiet hours)
        if (requestedChannels.includes('in_app') && rec.userId) {
          if (allowInApp) {
            await (adminClient as any).from('in_app_notifications').insert({
              company_id: companyId,
              user_id: rec.userId,
              type,
              title: titleEn,
              title_bn: titleBn,
              message: bodyEn,
              message_bn: bodyBn,
              action_url: payload.action_url || null,
              is_read: false,
            })
            inAppDeliveredCount++
          } else {
            skippedChannels.push('in_app')
          }
        }

        // E. Enqueue WhatsApp
        if (requestedChannels.includes('whatsapp') && rec.phone) {
          if (allowWhatsApp) {
            const nextAttempt = isQuiet && resumeTime ? resumeTime.toISOString() : undefined
            if (isQuiet) delayedForQuietHours = true

            const waIdempotency = `notif:wa:${companyId}:${type}:${entity?.id || 'gen'}:${rec.phone}:${payload.idempotencyKey || Date.now()}`

            await CommunicationJobQueue.enqueue({
              tenantId: companyId,
              eventType: type,
              channel: 'whatsapp',
              recipientPhone: rec.phone,
              recipientUserId: rec.userId || undefined,
              recipientCustomerId: payload.recipientCustomerId || undefined,
              templateKey: type,
              payload: {
                message: rec.language === 'bn' ? bodyBn : bodyEn,
                documentUrl: payload.documentUrl,
                documentFilename: payload.documentFilename,
              },
              idempotencyKey: waIdempotency,
              scheduledFor: nextAttempt,
            })
            jobsEnqueuedCount++
          } else {
            skippedChannels.push('whatsapp')
          }
        }

        // F. Enqueue Email
        if (requestedChannels.includes('email') && rec.email) {
          if (allowEmail) {
            const nextAttempt = isQuiet && resumeTime ? resumeTime.toISOString() : undefined
            if (isQuiet) delayedForQuietHours = true

            const emailIdempotency = `notif:email:${companyId}:${type}:${entity?.id || 'gen'}:${rec.email}:${payload.idempotencyKey || Date.now()}`

            await CommunicationJobQueue.enqueue({
              tenantId: companyId,
              eventType: type,
              channel: 'email',
              recipientEmail: rec.email,
              recipientUserId: rec.userId || undefined,
              recipientCustomerId: payload.recipientCustomerId || undefined,
              templateKey: type,
              payload: {
                subject: rec.language === 'bn' ? titleBn : titleEn,
                body: rec.language === 'bn' ? bodyBn : bodyEn,
                attachmentUrl: payload.documentUrl,
                attachmentFilename: payload.documentFilename,
              },
              idempotencyKey: emailIdempotency,
              scheduledFor: nextAttempt,
            })
            jobsEnqueuedCount++
          } else {
            skippedChannels.push('email')
          }
        }

        // G. Enqueue SMS (if enabled)
        if (requestedChannels.includes('sms') && rec.phone) {
          if (allowSms) {
            const nextAttempt = isQuiet && resumeTime ? resumeTime.toISOString() : undefined
            if (isQuiet) delayedForQuietHours = true

            const smsIdempotency = `notif:sms:${companyId}:${type}:${entity?.id || 'gen'}:${rec.phone}:${payload.idempotencyKey || Date.now()}`

            await CommunicationJobQueue.enqueue({
              tenantId: companyId,
              eventType: type,
              channel: 'sms',
              recipientPhone: rec.phone,
              recipientUserId: rec.userId || undefined,
              templateKey: type,
              payload: {
                message: rec.language === 'bn' ? bodyBn : bodyEn,
              },
              idempotencyKey: smsIdempotency,
              scheduledFor: nextAttempt,
            })
            jobsEnqueuedCount++
          } else {
            skippedChannels.push('sms')
          }
        }
      }

      return {
        success: true,
        inAppDeliveredCount,
        jobsEnqueuedCount,
        skippedChannels,
        delayedForQuietHours,
      }
    } catch (err: any) {
      console.error('[NotificationService.notify] Error dispatching notification:', err)
      return {
        success: false,
        inAppDeliveredCount,
        jobsEnqueuedCount,
        skippedChannels,
        error: err?.message || 'Failed to dispatch notification',
      }
    }
  }

  /**
   * Evaluates dynamic business rules for a tenant or across all tenants:
   * 1. Overdue invoice reminders (before, on, and after due dates)
   * 2. Low-stock inventory alerts
   * 3. Production deadline warnings
   */
  static async evaluateBusinessRules(targetCompanyId?: string): Promise<{
    evaluatedCompanies: number
    overdueInvoicesProcessed: number
    lowStockAlertsTriggered: number
    productionWarningsTriggered: number
  }> {
    const adminClient = createAdminClient()
    let companyQuery = (adminClient as any).from('companies').select('id, name')
    if (targetCompanyId) {
      companyQuery = companyQuery.eq('id', targetCompanyId)
    }

    const { data: companies } = await companyQuery
    if (!companies || companies.length === 0) {
      return {
        evaluatedCompanies: 0,
        overdueInvoicesProcessed: 0,
        lowStockAlertsTriggered: 0,
        productionWarningsTriggered: 0,
      }
    }

    let overdueInvoicesProcessed = 0
    let lowStockAlertsTriggered = 0
    let productionWarningsTriggered = 0

    const todayStr = new Date().toISOString().split('T')[0]
    const todayMidnight = new Date(todayStr).getTime()

    for (const comp of companies) {
      const companyId = comp.id

      // 1. Fetch rules for this company
      const { data: rules } = await (adminClient as any)
        .from('notification_business_rules')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_enabled', true)

      const ruleMap = new Map<string, NotificationBusinessRuleRecord>()
      for (const r of rules || []) {
        ruleMap.set(r.rule_type, r)
      }

      // ======================================================================
      // A. Overdue Invoices Rule
      // ======================================================================
      const invoiceRule = ruleMap.get('overdue_invoice')
      if (invoiceRule && invoiceRule.is_enabled) {
        const config = invoiceRule.config || {}
        const beforeDays = config.before_due_days || 3
        const onDue = config.on_due_date !== false
        const afterDaysList: number[] = Array.isArray(config.after_due_days) ? config.after_due_days : [3, 7]

        const { data: openInvoices } = await (adminClient as any)
          .from('invoices')
          .select('id, invoice_number, customer_name, customer_phone, customer_email, due_date, due_amount, grand_total, status')
          .eq('company_id', companyId)
          .gt('due_amount', 0)
          .not('status', 'in', '("paid","cancelled")')
          .not('due_date', 'is', null)

        for (const inv of openInvoices || []) {
          const invDueDate = new Date(inv.due_date).getTime()
          const diffDays = Math.round((todayMidnight - invDueDate) / (1000 * 60 * 60 * 24))

          let shouldSend = false
          let reminderStage = ''

          if (diffDays === -beforeDays) {
            shouldSend = true
            reminderStage = `before_${beforeDays}d`
          } else if (diffDays === 0 && onDue) {
            shouldSend = true
            reminderStage = 'on_due_date'
          } else if (afterDaysList.includes(diffDays)) {
            shouldSend = true
            reminderStage = `after_${diffDays}d`
          }

          if (shouldSend) {
            const idempotencyKey = `overdue:${inv.id}:${reminderStage}:${todayStr}`
            await this.notify({
              companyId,
              type: 'invoice_overdue',
              entity: { type: 'invoice', id: inv.id, number: inv.invoice_number },
              payload: {
                invoice_number: inv.invoice_number,
                customer_name: inv.customer_name,
                due_amount: inv.due_amount,
                amount: inv.grand_total,
                recipientPhone: inv.customer_phone || undefined,
                recipientEmail: inv.customer_email || undefined,
                action_url: `/invoices/${inv.id}`,
                idempotencyKey,
              },
              channels: invoiceRule.channels || ['in_app', 'whatsapp'],
            })
            overdueInvoicesProcessed++
          }
        }
      }

      // ======================================================================
      // B. Low Stock Rule
      // ======================================================================
      const stockRule = ruleMap.get('low_stock')
      if (stockRule && stockRule.is_enabled) {
        const { data: lowProducts } = await (adminClient as any)
          .from('products')
          .select('id, name, name_bn, stock_quantity, reorder_level, unit')
          .eq('company_id', companyId)
          .gt('reorder_level', 0)

        for (const prod of lowProducts || []) {
          const current = prod.stock_quantity || 0
          const reorder = prod.reorder_level || 0
          if (current <= reorder) {
            const idempotencyKey = `low_stock:${prod.id}:${todayStr}`
            await this.notify({
              companyId,
              role: 'owner',
              type: 'low_stock',
              entity: { type: 'product', id: prod.id, number: prod.name },
              payload: {
                item_name: prod.name_bn || prod.name,
                current_stock: current,
                reorder_level: reorder,
                unit: prod.unit || 'pcs',
                action_url: `/inventory`,
                idempotencyKey,
              },
              channels: stockRule.channels || ['in_app', 'email'],
            })
            lowStockAlertsTriggered++
          }
        }
      }

      // ======================================================================
      // C. Production Deadline Warnings
      // ======================================================================
      const prodRule = ruleMap.get('production_deadline')
      if (prodRule && prodRule.is_enabled) {
        const warningHours = (prodRule.config?.warning_hours_before as number) || 24
        const horizon = new Date(Date.now() + warningHours * 60 * 60 * 1000).toISOString()

        const { data: urgentTasks } = await (adminClient as any)
          .from('production_tasks')
          .select('id, task_number, task_name, scheduled_end, status')
          .eq('company_id', companyId)
          .not('status', 'in', '("completed","cancelled")')
          .lte('scheduled_end', horizon)
          .gte('scheduled_end', new Date().toISOString())

        for (const task of urgentTasks || []) {
          const idempotencyKey = `prod_deadline:${task.id}:${todayStr}`
          await this.notify({
            companyId,
            role: 'production_manager',
            type: 'production_delay',
            entity: { type: 'production_task', id: task.id, number: task.task_number },
            payload: {
              task_number: task.task_number,
              job_number: task.task_number,
              reason: 'Approaching scheduled completion deadline within 24 hours',
              new_eta: task.scheduled_end,
              action_url: `/production`,
              idempotencyKey,
            },
            channels: prodRule.channels || ['in_app', 'whatsapp'],
          })
          productionWarningsTriggered++
        }
      }

      // Update last evaluated timestamp on rules
      await (adminClient as any)
        .from('notification_business_rules')
        .update({ last_evaluated_at: new Date().toISOString() })
        .eq('company_id', companyId)
    }

    return {
      evaluatedCompanies: companies.length,
      overdueInvoicesProcessed,
      lowStockAlertsTriggered,
      productionWarningsTriggered,
    }
  }

  /**
   * Retrieves notification preferences for a specific user and tenant
   */
  static async getUserPreferences(
    companyId: string,
    userId: string
  ): Promise<NotificationPreferenceRecord[]> {
    const adminClient = createAdminClient()
    const { data: userPrefs } = await (adminClient as any)
      .from('notification_preferences')
      .select('*')
      .eq('tenant_id', companyId)
      .eq('user_id', userId)

    // Fall back to tenant defaults for any missing event types
    const { data: tenantDefaults } = await (adminClient as any)
      .from('notification_preferences')
      .select('*')
      .eq('tenant_id', companyId)
      .is('user_id', null)

    const map = new Map<string, NotificationPreferenceRecord>()
    for (const d of tenantDefaults || []) {
      map.set(d.event_type, d)
    }
    for (const u of userPrefs || []) {
      map.set(u.event_type, u)
    }

    return Array.from(map.values())
  }

  /**
   * Saves or updates notification preferences for a specific user
   */
  static async saveUserPreferences(
    companyId: string,
    userId: string,
    preferences: Partial<NotificationPreferenceRecord>[]
  ): Promise<boolean> {
    const adminClient = createAdminClient()
    const records = preferences.map((p) => ({
      tenant_id: companyId,
      user_id: userId,
      event_type: p.event_type,
      in_app_enabled: p.in_app_enabled !== false,
      whatsapp_enabled: p.whatsapp_enabled !== false,
      email_enabled: p.email_enabled !== false,
      sms_enabled: p.sms_enabled === true,
      quiet_hours_enabled: Boolean(p.quiet_hours_enabled),
      quiet_hours_start: p.quiet_hours_start || '22:00',
      quiet_hours_end: p.quiet_hours_end || '08:00',
      updated_at: new Date().toISOString(),
    }))

    const { error } = await (adminClient as any)
      .from('notification_preferences')
      .upsert(records, { onConflict: 'tenant_id,event_type,user_id' })

    if (error) {
      console.error('[NotificationService.saveUserPreferences] Error:', error)
      return false
    }
    return true
  }

  /**
   * Fetches delivery logs with status, channel, recipient filters
   */
  static async getDeliveryLogs(
    companyId: string,
    filters?: {
      status?: string
      channel?: string
      recipient?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ logs: any[]; total: number }> {
    const adminClient = createAdminClient()
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    let query = (adminClient as any)
      .from('communication_logs')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.channel && filters.channel !== 'all') {
      query = query.eq('channel', filters.channel)
    }
    if (filters?.recipient && filters.recipient.trim()) {
      query = query.ilike('recipient_destination', `%${filters.recipient.trim()}%`)
    }

    const { data, count, error } = await query
    if (error) {
      console.warn('[NotificationService.getDeliveryLogs] Error fetching logs:', error)
      return { logs: [], total: 0 }
    }

    return { logs: data || [], total: count || 0 }
  }

  /**
   * Resends a delivery job from communication_jobs or communication_logs
   */
  static async resendJob(jobId: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    const adminClient = createAdminClient()

    // 1. Try finding job in communication_jobs
    const { data: job } = await (adminClient as any)
      .from('communication_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('tenant_id', companyId)
      .maybeSingle()

    if (job) {
      // Re-enqueue job
      const res = await CommunicationJobQueue.enqueue({
        tenantId: companyId,
        eventType: job.event_type || 'resend',
        channel: job.channel,
        recipientPhone: job.recipient_phone,
        recipientEmail: job.recipient_email,
        recipientUserId: job.recipient_user_id,
        recipientCustomerId: job.recipient_customer_id,
        templateKey: job.template_key,
        payload: job.payload || {},
        idempotencyKey: `resend:${job.id}:${Date.now()}`,
      })

      // Also trigger immediate background processing
      CommunicationJobQueue.processJob(res.jobId).catch(() => {})
      return { success: true }
    }

    // 2. Try finding in communication_logs
    const { data: log } = await (adminClient as any)
      .from('communication_logs')
      .select('*')
      .eq('id', jobId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!log) {
      return { success: false, error: 'Job or log record not found for resend' }
    }

    const res = await CommunicationJobQueue.enqueue({
      tenantId: companyId,
      eventType: 'resend',
      channel: log.channel === 'whatsapp' ? 'whatsapp' : log.channel === 'email' ? 'email' : 'sms',
      recipientPhone: log.channel === 'whatsapp' || log.channel === 'sms' ? log.recipient_destination : undefined,
      recipientEmail: log.channel === 'email' ? log.recipient_destination : undefined,
      payload: { message: log.message_content },
      idempotencyKey: `resend_log:${log.id}:${Date.now()}`,
    })

    CommunicationJobQueue.processJob(res.jobId).catch(() => {})
    return { success: true }
  }
}

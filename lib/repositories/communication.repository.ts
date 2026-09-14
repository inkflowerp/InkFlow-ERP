// ==============================================================================
// InkFlow ERP - Authoritative Unified Communication Repository (V8)
// Multi-Tenant WhatsApp, SMS, Email, In-App Dispatch Logs & Templates
// ==============================================================================

import { createClient } from '../supabase/server.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export interface UnifiedCommunicationMessage {
  id: string
  company_id: string
  branch_id?: string | null
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app' | string
  recipient_name: string
  recipient_destination: string
  subject?: string | null
  template_key?: string | null
  variables?: Record<string, any>
  message_content: string
  attachment_url?: string | null
  attachment_name?: string | null
  provider: string
  provider_message_id?: string | null
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  error_code?: string | null
  error_message?: string | null
  attempts: number
  idempotency_key?: string | null
  sent_by?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UnifiedCommunicationTemplate {
  id: string
  company_id: string
  template_key: string
  name: string
  name_bn?: string | null
  channel: 'all' | 'whatsapp' | 'sms' | 'email' | 'in_app' | string
  subject_en?: string | null
  subject_bn?: string | null
  body_en: string
  body_bn: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export class CommunicationRepository {
  // ============================================================================
  // 1. COMMUNICATION MESSAGES LOGS
  // ============================================================================

  static async saveMessage(msg: UnifiedCommunicationMessage): Promise<UnifiedCommunicationMessage> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('communication_messages')
        .upsert(msg, { onConflict: 'idempotency_key' })
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.COMMUNICATION_MESSAGES, data)
        return data as unknown as UnifiedCommunicationMessage
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.COMMUNICATION_MESSAGES, msg)
    return msg
  }

  static async getMessageById(
    id: string,
    companyId: string
  ): Promise<UnifiedCommunicationMessage | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('communication_messages')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as UnifiedCommunicationMessage
      }
    } catch {}

    const all = PrintERPDataStore.get<UnifiedCommunicationMessage[]>(STORAGE_KEYS.COMMUNICATION_MESSAGES) || []
    return all.find((m) => m.id === id && (!m.company_id || m.company_id === companyId)) || null
  }

  static async getMessageByIdempotencyKey(
    idempotencyKey: string,
    companyId: string
  ): Promise<UnifiedCommunicationMessage | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('communication_messages')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as UnifiedCommunicationMessage
      }
    } catch {}

    const all = PrintERPDataStore.get<UnifiedCommunicationMessage[]>(STORAGE_KEYS.COMMUNICATION_MESSAGES) || []
    return (
      all.find(
        (m) =>
          m.idempotency_key === idempotencyKey &&
          (!m.company_id || m.company_id === companyId)
      ) || null
    )
  }

  static async getMessages(
    companyId: string,
    options?: {
      channel?: string
      status?: string
      recipientDestination?: string
      limit?: number
      offset?: number
    }
  ): Promise<UnifiedCommunicationMessage[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('communication_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.channel && options.channel !== 'all') {
        query = query.eq('channel', options.channel)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.recipientDestination) {
        query = query.ilike('recipient_destination', `%${options.recipientDestination}%`)
      }
      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query
      if (!error && data) {
        return data as unknown as UnifiedCommunicationMessage[]
      }
    } catch {}

    const all = PrintERPDataStore.get<UnifiedCommunicationMessage[]>(STORAGE_KEYS.COMMUNICATION_MESSAGES) || []
    return all
      .filter((m) => {
        if (m.company_id && m.company_id !== companyId) return false
        if (options?.channel && options.channel !== 'all' && m.channel !== options.channel) return false
        if (options?.status && m.status !== options.status) return false
        if (
          options?.recipientDestination &&
          !m.recipient_destination.toLowerCase().includes(options.recipientDestination.toLowerCase())
        ) {
          return false
        }
        return true
      })
      .slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 100))
  }

  static async updateMessageStatus(
    id: string,
    companyId: string,
    status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed',
    details?: {
      provider_message_id?: string | null
      error_code?: string | null
      error_message?: string | null
      delivered_at?: string | null
      read_at?: string | null
      sent_at?: string | null
    }
  ): Promise<UnifiedCommunicationMessage | null> {
    const existing = await this.getMessageById(id, companyId)
    if (!existing) return null

    const updates: Partial<UnifiedCommunicationMessage> = {
      status,
      provider_message_id: details?.provider_message_id ?? existing.provider_message_id,
      error_code: details?.error_code ?? existing.error_code,
      error_message: details?.error_message ?? existing.error_message,
      delivered_at: details?.delivered_at ?? existing.delivered_at,
      read_at: details?.read_at ?? existing.read_at,
      sent_at: details?.sent_at ?? existing.sent_at,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('communication_messages')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<UnifiedCommunicationMessage>(
          STORAGE_KEYS.COMMUNICATION_MESSAGES,
          id,
          data
        )
        return data as unknown as UnifiedCommunicationMessage
      }
    } catch {}

    const updated = PrintERPDataStore.updateItem<UnifiedCommunicationMessage>(
      STORAGE_KEYS.COMMUNICATION_MESSAGES,
      id,
      updates
    )
    return updated || ({ ...existing, ...updates } as UnifiedCommunicationMessage)
  }

  // ============================================================================
  // 2. COMMUNICATION TEMPLATES
  // ============================================================================

  static async getTemplates(
    companyId: string,
    channel?: string
  ): Promise<UnifiedCommunicationTemplate[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('communication_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (channel && channel !== 'all') {
        query = query.or(`channel.eq.${channel},channel.eq.all`)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as unknown as UnifiedCommunicationTemplate[]
      }
    } catch {}

    const all = PrintERPDataStore.get<UnifiedCommunicationTemplate[]>(STORAGE_KEYS.COMMUNICATION_TEMPLATES) || []
    return all.filter((t) => {
      if (t.company_id && t.company_id !== companyId) return false
      if (!t.is_active) return false
      if (channel && channel !== 'all' && t.channel !== 'all' && t.channel !== channel) return false
      return true
    })
  }

  static async getTemplateByKey(
    templateKey: string,
    companyId: string,
    channel?: string
  ): Promise<UnifiedCommunicationTemplate | null> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('communication_templates')
        .select('*')
        .eq('template_key', templateKey)
        .eq('company_id', companyId)
        .eq('is_active', true)

      if (channel && channel !== 'all') {
        query = query.or(`channel.eq.${channel},channel.eq.all`)
      }

      const { data, error } = await query.maybeSingle()
      if (!error && data) {
        return data as unknown as UnifiedCommunicationTemplate
      }
    } catch {}

    const all = PrintERPDataStore.get<UnifiedCommunicationTemplate[]>(STORAGE_KEYS.COMMUNICATION_TEMPLATES) || []
    return (
      all.find(
        (t) =>
          t.template_key === templateKey &&
          (!t.company_id || t.company_id === companyId) &&
          t.is_active &&
          (!channel || channel === 'all' || t.channel === 'all' || t.channel === channel)
      ) || null
    )
  }

  static async saveTemplate(
    template: UnifiedCommunicationTemplate
  ): Promise<UnifiedCommunicationTemplate> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('communication_templates')
        .upsert(template, { onConflict: 'company_id,template_key,channel' })
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.COMMUNICATION_TEMPLATES, data)
        return data as unknown as UnifiedCommunicationTemplate
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.COMMUNICATION_TEMPLATES, template)
    return template
  }

  /**
   * Seeds standard bilingual transactional templates for printing businesses
   */
  static async seedDefaultTemplates(companyId: string): Promise<UnifiedCommunicationTemplate[]> {
    const existing = await this.getTemplates(companyId)
    if (existing && existing.length > 0) return existing

    const now = new Date().toISOString()
    const defaults: UnifiedCommunicationTemplate[] = [
      {
        id: `tpl-quo-${companyId}`,
        company_id: companyId,
        template_key: 'quotation_ready',
        name: 'Quotation Ready',
        name_bn: 'বাণিজ্যিক কোটেশন প্রস্তুত',
        channel: 'all',
        subject_en: 'Quotation {{quotation_number}} from {{company_name}}',
        subject_bn: '{{company_name}} থেকে আপনার কোটেশন {{quotation_number}}',
        body_en: 'Dear {{customer_name}},\n\nYour quotation {{quotation_number}} for {{total_amount}} BDT is ready. Please review the details.\n\nThank you,\n{{company_name}}',
        body_bn: 'প্রিয় {{customer_name}},\n\nআপনার কোটেশন {{quotation_number}} প্রস্তুত করা হয়েছে। মোট পরিমাণ: {{total_amount}} টাকা। অনুগ্রহ করে বিস্তারিত দেখে নিন।\n\nধন্যবাদান্তে,\n{{company_name}}',
        variables: ['customer_name', 'company_name', 'quotation_number', 'total_amount', 'document_url'],
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `tpl-inv-${companyId}`,
        company_id: companyId,
        template_key: 'invoice_generated',
        name: 'Invoice Generated',
        name_bn: 'বিক্রয় চালান বিল প্রস্তুত',
        channel: 'all',
        subject_en: 'Invoice {{invoice_number}} from {{company_name}}',
        subject_bn: '{{company_name}} থেকে বিক্রয় বিল {{invoice_number}}',
        body_en: 'Dear {{customer_name}},\n\nInvoice {{invoice_number}} for {{invoice_total}} BDT has been generated. Due amount: {{due_amount}} BDT.\n\nThank you,\n{{company_name}}',
        body_bn: 'প্রিয় {{customer_name}},\n\nআপনার বিক্রয় বিল {{invoice_number}} তৈরি হয়েছে। মোট বিল: {{invoice_total}} টাকা, বকেয়া: {{due_amount}} টাকা।\n\nধন্যবাদান্তে,\n{{company_name}}',
        variables: ['customer_name', 'company_name', 'invoice_number', 'invoice_total', 'paid_amount', 'due_amount', 'document_url'],
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `tpl-due-${companyId}`,
        company_id: companyId,
        template_key: 'due_payment_reminder',
        name: 'Payment Due Reminder',
        name_bn: 'বকেয়া বিল পরিশোধের তাগাদা',
        channel: 'all',
        subject_en: 'Payment Reminder: Outstanding balance with {{company_name}}',
        subject_bn: 'বকেয়া বিল পরিশোধের স্মরণপত্র: {{company_name}}',
        body_en: 'Dear {{customer_name}},\n\nThis is a friendly reminder that you have an outstanding due balance of {{due_amount}} BDT with {{company_name}}. Please clear the due at your earliest convenience.\n\nThank you.',
        body_bn: 'প্রিয় {{customer_name}},\n\n{{company_name}}-এ আপনার সর্বমোট {{due_amount}} টাকা বকেয়া রয়েছে। অনুগ্রহপূর্বক দ্রুত বিল পরিশোধ করার অনুরোধ করা যাচ্ছে।\n\nধন্যবাদ।',
        variables: ['customer_name', 'company_name', 'due_amount', 'invoice_number', 'payment_link'],
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `tpl-job-${companyId}`,
        company_id: companyId,
        template_key: 'job_completed',
        name: 'Job Ready for Delivery',
        name_bn: 'প্রিন্ট কাজ সম্পন্ন ও ডেলিভারির জন্য প্রস্তুত',
        channel: 'all',
        subject_en: 'Job {{job_number}} is Ready for Delivery',
        subject_bn: 'আপনার কাজ {{job_number}} ডেলিভারির জন্য প্রস্তুত',
        body_en: 'Dear {{customer_name}},\n\nYour print order {{job_number}} ({{item_name}}) is completed and ready for pickup/delivery.\n\nThank you,\n{{company_name}}',
        body_bn: 'প্রিয় {{customer_name}},\n\nআপনার প্রিন্টিং কাজ {{job_number}} ({{item_name}}) সম্পন্ন হয়েছে এবং ডেলিভারির জন্য প্রস্তুত রয়েছে।\n\nধন্যবাদান্তে,\n{{company_name}}',
        variables: ['customer_name', 'company_name', 'job_number', 'item_name', 'delivery_date'],
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]

    for (const t of defaults) {
      await this.saveTemplate(t)
    }

    return defaults
  }
}

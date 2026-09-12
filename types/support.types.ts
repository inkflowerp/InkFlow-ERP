// ==============================================================================
// InkFlow SaaS - Enterprise Support Chat & Ticket System Types
// Authoritative TypeScript interfaces for tenant & platform support workflows
// ==============================================================================

export type SupportStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'resolved'
  | 'closed'

export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent'

export type SupportCategory =
  | 'account'
  | 'billing'
  | 'subscription'
  | 'login'
  | 'email'
  | 'whatsapp'
  | 'sms'
  | 'payment'
  | 'invoice'
  | 'production'
  | 'inventory'
  | 'attendance'
  | 'technical'
  | 'bug_report'
  | 'feature_request'
  | 'general'
  | 'other'

export type SupportSenderType = 'tenant_user' | 'platform_support' | 'system'

export type SupportMessageType =
  | 'message'
  | 'support_reply'
  | 'internal_note'
  | 'system_event'

export interface SupportAttachmentMeta {
  id: string
  name: string
  size: number
  type: string
  path: string
  signedUrl?: string
}

export interface SupportConversationRecord {
  id: string
  ticket_number: string
  company_id: string
  company_name?: string
  company_slug?: string
  branch_id?: string | null
  created_by: string
  created_by_name: string
  created_by_email: string
  assigned_to?: string | null
  assigned_to_name?: string | null
  subject: string
  status: SupportStatus
  priority: SupportPriority
  category: SupportCategory
  source: 'app' | 'mobile' | 'widget' | 'system'
  context_metadata?: Record<string, any>
  unread_tenant_count: number
  unread_platform_count: number
  last_message_at: string
  last_message_preview?: string | null
  last_message_by?: string | null
  last_message_sender_type?: SupportSenderType | null
  first_response_at?: string | null
  resolved_at?: string | null
  resolved_by?: string | null
  closed_at?: string | null
  closed_by?: string | null
  reopened_at?: string | null
  created_at: string
  updated_at: string
}

export interface SupportMessageRecord {
  id: string
  conversation_id: string
  company_id: string
  sender_user_id: string
  sender_name: string
  sender_email?: string | null
  sender_type: SupportSenderType
  message_type: SupportMessageType
  body: string
  attachments: SupportAttachmentMeta[]
  client_mutation_id?: string | null
  read_at?: string | null
  edited_at?: string | null
  deleted_at?: string | null
  created_at: string
}

export interface SupportAttachmentRecord {
  id: string
  conversation_id: string
  message_id?: string | null
  company_id: string
  uploaded_by: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  created_at: string
}

export interface SupportOverviewStats {
  totalCount: number
  openCount: number
  inProgressCount: number
  waitingCustomerCount: number
  resolvedCount: number
  closedCount: number
  unassignedCount: number
  assignedToMeCount: number
  urgentCount: number
  averageFirstResponseMinutes: number
  averageResolutionMinutes: number
}

// Category Configuration with bilingual metadata
export interface CategoryConfig {
  key: SupportCategory
  labelEn: string
  labelBn: string
  description: string
  iconName?: string
}

export const SUPPORT_CATEGORIES: CategoryConfig[] = [
  { key: 'general', labelEn: 'General Inquiry', labelBn: 'সাধারণ অনুসন্ধান', description: 'General support and questions' },
  { key: 'account', labelEn: 'Account & Access', labelBn: 'অ্যাকাউন্ট ও লগইন', description: 'User login, profiles, password reset' },
  { key: 'billing', labelEn: 'Billing & Invoicing', labelBn: 'বিলিং ও ইনভয়েস', description: 'Invoices, payments, credit limits' },
  { key: 'subscription', labelEn: 'Subscription & Plan', labelBn: 'সাবস্ক্রিপশন ও প্ল্যান', description: 'Upgrades, renewals, trial status' },
  { key: 'production', labelEn: 'Production & Shop Floor', labelBn: 'প্রোডাকশন ও প্রিন্টিং', description: 'Job tickets, machine queues, finishing' },
  { key: 'inventory', labelEn: 'Inventory & Materials', labelBn: 'স্টক ও মালামাল', description: 'Roll inventory, stock ledger, requisitions' },
  { key: 'attendance', labelEn: 'Smart Attendance', labelBn: 'ডিজিটাল হাজিরা', description: 'QR check-in, geofencing, leave' },
  { key: 'whatsapp', labelEn: 'WhatsApp Integration', labelBn: 'হোয়াটসঅ্যাপ ইন্টিগ্রেশন', description: 'WhatsApp notifications, gateway' },
  { key: 'sms', labelEn: 'SMS & Messaging', labelBn: 'এসএমএস গেটওয়ে', description: 'SMS balance, provider connection' },
  { key: 'email', labelEn: 'Email Gateway', labelBn: 'ইমেইল গেটওয়ে', description: 'SMTP settings, delivery logs' },
  { key: 'payment', labelEn: 'Payment Gateway', labelBn: 'পেমেন্ট গেটওয়ে', description: 'bKash, Nagad, bank transfers' },
  { key: 'technical', labelEn: 'Technical Issue', labelBn: 'কারিগরি সমস্যা', description: 'App performance, connectivity' },
  { key: 'bug_report', labelEn: 'Bug Report', labelBn: 'বাগ বা ত্রুটি রিপোর্ট', description: 'Unexpected behavior or errors' },
  { key: 'feature_request', labelEn: 'Feature Request', labelBn: 'নতুন ফিচার প্রস্তাব', description: 'Requests for new capabilities' },
  { key: 'other', labelEn: 'Other', labelBn: 'অন্যান্য', description: 'Miscellaneous topics' },
]

export const SUPPORT_STATUS_CONFIG: Record<
  SupportStatus,
  { labelEn: string; labelBn: string; color: string; badgeClass: string }
> = {
  open: {
    labelEn: 'Open',
    labelBn: 'উন্মুক্ত',
    color: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  in_progress: {
    labelEn: 'In Progress',
    labelBn: 'চলমান',
    color: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  },
  waiting_customer: {
    labelEn: 'Waiting for Customer',
    labelBn: 'গ্রাহকের উত্তরের অপেক্ষায়',
    color: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  resolved: {
    labelEn: 'Resolved',
    labelBn: 'মীমাংসিত',
    color: 'purple',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
  },
  closed: {
    labelEn: 'Closed',
    labelBn: 'বন্ধ',
    color: 'slate',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
}

export const SUPPORT_PRIORITY_CONFIG: Record<
  SupportPriority,
  { labelEn: string; labelBn: string; badgeClass: string; dotColor: string }
> = {
  low: {
    labelEn: 'Low',
    labelBn: 'নিম্ন',
    badgeClass: 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
  normal: {
    labelEn: 'Normal',
    labelBn: 'সাধারণ',
    badgeClass: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/50 dark:border-blue-800',
    dotColor: 'bg-blue-500',
  },
  high: {
    labelEn: 'High',
    labelBn: 'উচ্চ',
    badgeClass: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  urgent: {
    labelEn: 'Urgent',
    labelBn: 'জরুরী',
    badgeClass: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-800 animate-pulse',
    dotColor: 'bg-red-500',
  },
}

// Request & DTO Types
export interface CreateConversationInput {
  subject: string
  category: SupportCategory
  priority?: SupportPriority
  initialMessage: string
  attachments?: SupportAttachmentMeta[]
  contextMetadata?: Record<string, any>
  branchId?: string | null
}

export interface SendMessageInput {
  conversationId: string
  body: string
  attachments?: SupportAttachmentMeta[]
  isInternalNote?: boolean
  clientMutationId?: string
}

export interface TenantConversationFilters {
  status?: SupportStatus | 'all'
  category?: SupportCategory | 'all'
  search?: string
  page?: number
  limit?: number
}

export interface PlatformConversationFilters {
  status?: SupportStatus | 'all'
  priority?: SupportPriority | 'all'
  category?: SupportCategory | 'all'
  assignedTo?: string | 'all'
  tenantId?: string | 'all'
  unassignedOnly?: boolean
  search?: string
  page?: number
  limit?: number
}

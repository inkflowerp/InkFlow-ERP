// ==============================================================================
// PrintERP SaaS - Platform Administration & Root Governance Types
// ==============================================================================

export type PlatformCompanyStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'archived'

export type SupportAccessLevel = 'read_only' | 'config_only' | 'full_support'

export interface PlatformSupportSessionRecord {
  id: string
  platform_admin_id: string
  company_id: string
  company_name?: string
  company_slug?: string
  admin_email?: string
  admin_name?: string
  reason: string
  access_level: SupportAccessLevel
  session_token_hash: string
  status: 'active' | 'expired' | 'revoked'
  started_at: string
  expires_at: string
  revoked_at?: string | null
  revoked_by?: string | null
  created_at: string
}

export type PlatformPlanCode = 'starter' | 'business' | 'enterprise' | 'growth' | 'custom'

export type TenantHealthStatus = 'healthy' | 'at_risk' | 'critical' | 'suspended'

export type DataClassification = 'LIVE' | 'CALCULATED' | 'ESTIMATED' | 'UNAVAILABLE'

export interface TenantHealthFactor {
  code: string
  label: string
  status: 'ok' | 'warning' | 'critical'
  description: string
  value?: string | number
}

export interface TenantHealthDetail {
  status: TenantHealthStatus
  score: number // 0-100 calculated transparently
  factors: TenantHealthFactor[]
  lastCalculatedAt: string
}

export interface PlatformDashboardMetrics {
  total_companies: number
  active_companies: number
  paying_companies: number
  trial_companies: number
  past_due_companies: number
  suspended_companies: number
  total_users: number
  active_platform_users: number
  orders_count: number
  revenue_mrr: number
  revenue_arr: number
  storage_used_gb: number
  storage_total_gb: number
  platform_health_status: 'operational' | 'degraded' | 'incident'
  data_classification: DataClassification
  subscription_metrics: {
    plan_code: PlatformPlanCode
    plan_name: string
    active_subscribers: number
    mrr_bdt: number
    share_percentage: number
  }[]
  system_health_summary: {
    failed_jobs: number
    failed_notifications: number
    api_failures: number
    integration_errors: number
    storage_used_pct: number
  }
  recent_audit_logs?: PlatformAuditLogItem[]
}

export interface PlatformTenantCompany {
  id: string
  name: string
  name_bn: string
  slug: string
  owner_name: string
  owner_email: string
  owner_phone: string
  plan: PlatformPlanCode
  status: PlatformCompanyStatus
  health: TenantHealthStatus
  health_detail?: TenantHealthDetail
  users_count: number
  users_limit: number
  branches_count: number
  branches_limit: number
  storage_used_gb: number
  storage_limit_gb: number
  orders_this_month: number
  orders_limit: number
  monthly_fee: number
  billing_interval: 'monthly' | 'yearly'
  hub: string
  division: string
  district: string
  created_at: string
  last_activity: string
  last_meaningful_activity: {
    action: string
    entity: string
    timestamp: string
    reference?: string
  }
}

export interface CompanyOnboardingStep {
  id: string
  title: string
  title_bn: string
  description: string
  is_completed: boolean
  completed_at?: string
  data_count?: number
}

export interface Company360Data {
  company: PlatformTenantCompany
  onboarding: {
    overall_progress_pct: number
    steps: CompanyOnboardingStep[]
  }
  health: TenantHealthDetail
  users: {
    id: string
    full_name: string
    email: string
    phone?: string
    role: string
    status: string
    mfa_enabled: boolean
    last_login_at?: string
    created_at: string
  }[]
  branches: {
    id: string
    name: string
    name_bn?: string
    address: string
    phone: string
    is_main: boolean
    status: string
  }[]
  usage: CompanyUsageMetrics
  subscription: {
    id: string
    plan_code: PlatformPlanCode
    plan_name: string
    status: PlatformCompanyStatus
    billing_interval: 'monthly' | 'yearly'
    rate_bdt: number
    current_period_start: string
    current_period_end: string
    trial_ends_at?: string
    days_to_expiry: number
    payment_method?: string
    last_payment_reference?: string
    custom_limits_override?: Record<string, any>
  }
  features: {
    flag_id: string
    key: string
    name: string
    is_enabled: boolean
    is_tenant_override: boolean
    notes?: string
  }[]
  activity: {
    id: string
    action: string
    entity: string
    description: string
    actor_email: string
    created_at: string
  }[]
  security: {
    active_sessions_count: number
    mfa_coverage_pct: number
    failed_logins_last_7d: number
    last_security_event?: string
  }
  integrations: {
    service: string
    name: string
    status: 'operational' | 'degraded' | 'failed' | 'not_configured'
    last_event_at?: string
  }[]
  support_history: {
    id: string
    platform_user_email: string
    reason: string
    started_at: string
    duration_minutes: number
  }[]
}

export interface CustomerSuccessData {
  new_tenants: PlatformTenantCompany[]
  trials_ending_soon: {
    company: PlatformTenantCompany
    trial_day: number
    total_days: number
    expires_in_days: number
    features_used: string[]
    last_meaningful_activity: string
  }[]
  inactive_tenants: {
    company: PlatformTenantCompany
    days_inactive: number
    last_meaningful_activity: string
  }[]
  at_risk_tenants: {
    company: PlatformTenantCompany
    risk_score: number
    reasons: string[]
  }[]
  high_growth_tenants: {
    company: PlatformTenantCompany
    growth_rate_pct: number
    order_volume: number
  }[]
  recent_plan_changes: {
    company_name: string
    company_id: string
    previous_plan: PlatformPlanCode
    new_plan: PlatformPlanCode
    changed_at: string
    reason?: string
  }[]
}

export interface CompanyUsageMetrics {
  company_id: string
  company_name: string
  company_slug: string
  plan_code: PlatformPlanCode
  users_count: number
  users_limit: number
  branches_count: number
  branches_limit: number
  storage_used_gb: number
  storage_limit_gb: number
  orders_this_month: number
  orders_limit: number
  customers_count: number
  customers_limit: number
  products_count: number
  products_limit: number
  mushak_invoices_count: number
}

export interface HistoricalUsagePoint {
  date: string
  users_count: number
  storage_used_gb: number
  orders_count: number
  customers_count: number
  branches_count: number
}

export interface UsageTrendsData {
  company_id?: string
  company_name?: string
  period: '7d' | '30d' | '90d' | '12m'
  has_enough_data: boolean
  points: HistoricalUsagePoint[]
}

export interface BillingReconciliationItem {
  id: string
  company_id: string
  company_name: string
  plan_code: PlatformPlanCode
  billing_interval: 'monthly' | 'yearly'
  expected_amount_bdt: number
  collected_amount_bdt: number
  outstanding_amount_bdt: number
  payment_status: 'paid' | 'pending' | 'failed' | 'partially_paid' | 'refunded'
  payment_gateway?: 'bkash' | 'nagad' | 'sslcommerz' | 'bank_transfer' | 'manual'
  transaction_ref?: string
  invoice_period: string
  due_date: string
  paid_at?: string
}

export interface BillingOverviewMetrics {
  expected_mrr: number
  collected_mrr: number
  outstanding_mrr: number
  failed_payments_count: number
  past_due_tenants_count: number
  collection_efficiency_pct: number
  items: BillingReconciliationItem[]
}

export type PermissionActionKey = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'full_control'

export interface PlatformRBACTemplate {
  id: string
  slug: string
  name: string
  name_bn: string
  description: string
  is_system: boolean
  sort_order: number
  permissions: Record<string, Record<PermissionActionKey, boolean>>
}

export interface TenantFeatureFlagOverride {
  company_id: string
  company_name: string
  company_slug: string
  is_enabled: boolean
  notes?: string
  updated_at: string
}

export interface PlatformFeatureFlagItem {
  id: string
  key: string
  name: string
  description: string
  is_enabled: boolean
  overrides_count: number
  is_critical?: boolean
  overrides: TenantFeatureFlagOverride[]
}

export type SystemHealthCategory = 'job' | 'notification' | 'storage' | 'api' | 'integration'
export type SystemHealthSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface SystemHealthEvent {
  id: string
  category: SystemHealthCategory
  service_name: string
  severity: SystemHealthSeverity
  message: string
  error_details?: Record<string, any>
  company_id?: string | null
  company_name?: string | null
  resolved: boolean
  resolved_at?: string | null
  created_at: string
}

export interface SystemHealthSummary {
  failed_jobs_count: number
  failed_notifications_count: number
  storage_used_gb: number
  storage_total_gb: number
  api_failures_count: number
  integration_errors_count: number
  overall_system_status: 'healthy' | 'degraded' | 'critical'
}

export interface PlatformAuditLogItem {
  id: string
  platform_admin_id?: string | null
  actor_email: string
  action: string
  entity_type: string
  entity_id?: string | null
  target_company_id?: string | null
  target_company_name?: string | null
  previous_state?: Record<string, any> | null
  new_state?: Record<string, any> | null
  reason?: string | null
  details: Record<string, any>
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

export type PlatformUserRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'platform_support'
  | 'platform_operations'
  | 'platform_finance'
  | 'platform_readonly'

export interface PlatformAdminUser {
  id: string
  user_id: string
  email: string
  full_name: string
  role: PlatformUserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  mfa_enabled: boolean
  active_sessions_count: number
  password_last_changed_at?: string
  last_login_at?: string
  created_at: string
}

export interface PlatformActiveSession {
  id: string
  platform_admin_id: string
  user_email: string
  user_name: string
  ip_address: string
  user_agent: string
  device_name: string
  location: string
  is_current: boolean
  is_revoked: boolean
  last_seen_at: string
  created_at: string
}

export interface PlatformLoginHistoryItem {
  id: string
  timestamp: string
  device_browser: string
  location: string
  ip_address: string
  status: 'successful' | 'failed'
}

export interface PlatformSecurityOverview {
  failed_logins_24h: number
  suspicious_login_patterns: number
  mfa_adoption_pct: number
  active_sessions_count: number
  tenant_isolation_status: 'healthy' | 'alert'
  recent_privileged_actions: PlatformAuditLogItem[]
  active_sessions: PlatformActiveSession[]
  login_history?: PlatformLoginHistoryItem[]
}

export interface PlatformIncidentItem {
  id: string
  title: string
  description: string
  service_name: string
  severity: 'minor' | 'major' | 'critical'
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  affected_tenants_count: number
  root_cause?: string
  resolution_notes?: string
  started_at: string
  resolved_at?: string
  created_at: string
}

export interface PlatformBackgroundJobItem {
  id: string
  job_type: string
  company_id?: string | null
  company_name?: string | null
  status: 'queued' | 'running' | 'retrying' | 'failed' | 'completed' | 'cancelled' | 'dead_letter'
  attempts: number
  max_attempts: number
  duration_ms?: number
  error_log?: string
  scheduled_for: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface IntegrationProviderStatus {
  key: string
  name: string
  category: 'notification' | 'payment' | 'storage' | 'tax'
  status: 'operational' | 'degraded' | 'failed' | 'rate_limited' | 'credential_issue'
  latency_ms: number
  failure_rate_pct: number
  last_success_at: string
  last_incident_at?: string
  notes?: string
}

export interface EmergencyControlItem {
  id: string
  control_key: string
  name: string
  description: string
  is_active: boolean
  reason?: string
  activated_by_email?: string
  activated_at?: string
}

export interface NeedsAttentionItem {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  tenant_id?: string
  tenant_name?: string
  system_name?: string
  reason: string
  recommended_action: string
  action_href: string
  timestamp: string
  dedup_count?: number
}

export interface GlobalSearchResult {
  query: string
  companies: {
    id: string
    name: string
    name_bn?: string
    slug: string
    owner_name: string
    owner_phone: string
    owner_email: string
    plan: PlatformPlanCode
    status: PlatformCompanyStatus
  }[]
  users: {
    id: string
    full_name: string
    email: string
    company_name: string
    role: string
  }[]
  subscriptions: {
    id: string
    company_name: string
    plan_code: PlatformPlanCode
    status: string
    amount: number
  }[]
  audit_events: {
    id: string
    action: string
    actor_email: string
    target_company_name?: string
    created_at: string
  }[]
  features: {
    id: string
    name: string
    key: string
    is_enabled: boolean
  }[]
}

export interface PlatformBackupStatus {
  last_backup_time: string
  backup_age_hours: number
  retention_days: number
  storage_location: string
  last_restore_test_date: string
  last_restore_status: 'passed' | 'failed' | 'overdue'
  status: 'healthy' | 'degraded' | 'failed'
  notes?: string
}

export interface PlatformSystemSettings {
  session_timeout_minutes: number
  mfa_required_for_admins: boolean
  rate_limit_requests_per_minute: number
  max_export_records: number
  default_trial_days: number
  default_currency: string
  default_vat_rate_pct: number
  maintenance_message: string
  incident_alert_webhook?: string
}

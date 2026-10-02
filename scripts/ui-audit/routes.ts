export interface AuditRouteDef {
  id: string
  path: string
  name: string
  isPlatform: boolean
  requiresAuth?: boolean
  description: string
  waitSelector?: string
}

export const PLATFORM_ROUTES: AuditRouteDef[] = [
  // 1. Overview
  {
    id: 'platform-overview',
    path: '/platform',
    name: 'Platform Overview Dashboard',
    isPlatform: true,
    description: 'System KPI summary, alerts, and baseline health',
  },
  // 2. Tenants & Companies
  {
    id: 'platform-tenants',
    path: '/platform/tenants',
    name: 'Tenant Directory',
    isPlatform: true,
    description: 'Multi-tenant client listing with search and actions',
  },
  {
    id: 'platform-company-detail',
    path: '/platform/companies/test-company-id',
    name: 'Tenant Deep Dive & Quotas',
    isPlatform: true,
    description: 'Company details, tabs, usage meters, and danger zone',
  },
  // 3. Plans & Subscriptions
  {
    id: 'platform-plans',
    path: '/platform/plans',
    name: 'Pricing & Plan Management',
    isPlatform: true,
    description: 'Tier cards, limits, feature checklists, plan editor',
  },
  {
    id: 'platform-subscriptions',
    path: '/platform/subscriptions',
    name: 'Subscription Ledger',
    isPlatform: true,
    description: 'Active subscriptions, renewal tracking, and status chips',
  },
  {
    id: 'platform-billing',
    path: '/platform/billing',
    name: 'Invoices & Platform Billing',
    isPlatform: true,
    description: 'Gateway revenue, payment history, and dispute records',
  },
  // 4. Commercial & Features
  {
    id: 'platform-features',
    path: '/platform/features',
    name: 'Feature Flags & Entitlements',
    isPlatform: true,
    description: 'Plan gating toggles, rollout percentages',
  },
  {
    id: 'platform-usage',
    path: '/platform/usage',
    name: 'Resource Consumption & Quotas',
    isPlatform: true,
    description: 'Usage meters, storage/user utilization progress bars',
  },
  {
    id: 'platform-customer-success',
    path: '/platform/customer-success',
    name: 'Customer Success & Retention',
    isPlatform: true,
    description: 'Onboarding progress, health scores, churn prevention',
  },
  // 5. Operations & Reliability
  {
    id: 'platform-support',
    path: '/platform/support',
    name: 'Support & Help Desk',
    isPlatform: true,
    description: 'Ticket queues, escalation statuses, message views',
  },
  {
    id: 'platform-incidents',
    path: '/platform/incidents',
    name: 'Incident Response & Status',
    isPlatform: true,
    description: 'Outage broadcasts, incident timelines, severity pills',
  },
  {
    id: 'platform-health',
    path: '/platform/health',
    name: 'System Cluster Health',
    isPlatform: true,
    description: 'Database status, storage ping, memory monitors',
  },
  {
    id: 'platform-jobs',
    path: '/platform/jobs',
    name: 'Background Jobs & Cron',
    isPlatform: true,
    description: 'Queue workers, failed job retry triggers',
  },
  {
    id: 'platform-notifications',
    path: '/platform/notifications',
    name: 'Broadcast Announcements',
    isPlatform: true,
    description: 'Platform broadcast composer and history',
  },
  // 6. Security & Staff
  {
    id: 'platform-security',
    path: '/platform/security',
    name: 'Security & Access Policies',
    isPlatform: true,
    description: 'MFA rules, IP restrictions, session duration settings',
  },
  {
    id: 'platform-admins',
    path: '/platform/admins',
    name: 'Platform Staff & Roles',
    isPlatform: true,
    description: 'Superadmin user management, staff invitations',
  },
  {
    id: 'platform-permissions',
    path: '/platform/permissions',
    name: 'RBAC Permission Matrix',
    isPlatform: true,
    description: 'Capability scopes, role matrix, permission badges',
  },
  {
    id: 'platform-sessions',
    path: '/platform/sessions',
    name: 'Active Superadmin Sessions',
    isPlatform: true,
    description: 'Device sessions, IP geo records, remote logout',
  },
  {
    id: 'platform-audit',
    path: '/platform/audit',
    name: 'Audit Trail & Compliance',
    isPlatform: true,
    description: 'Immutable system audit log and event viewer',
  },
  {
    id: 'platform-emergency',
    path: '/platform/emergency',
    name: 'Emergency Operations',
    isPlatform: true,
    description: 'Maintenance mode toggle, emergency system lock',
  },
  // 7. Settings & Integrations
  {
    id: 'platform-settings',
    path: '/platform/settings',
    name: 'General Platform Settings',
    isPlatform: true,
    description: 'Platform name, branding, custom domains',
  },
  {
    id: 'platform-settings-comm',
    path: '/platform/settings/communication',
    name: 'Communication Channels',
    isPlatform: true,
    description: 'SMTP mail credentials, SMS gateway API keys',
  },
  {
    id: 'platform-comm-whatsapp',
    path: '/platform/communications/whatsapp',
    name: 'WhatsApp Cloud Gateway',
    isPlatform: true,
    description: 'Meta Business webhook, automated template setup',
  },
  {
    id: 'platform-integrations',
    path: '/platform/integrations',
    name: 'Third-party Integrations',
    isPlatform: true,
    description: 'Webhooks, external API credentials, logs',
  },
  // 8. Auth & Profile
  {
    id: 'platform-login',
    path: '/platform/login',
    name: 'Platform Admin Login',
    isPlatform: true,
    description: 'Sign-in form, MFA input, language switcher',
  },
  {
    id: 'platform-forgot-password',
    path: '/platform/forgot-password',
    name: 'Forgot Password Request',
    isPlatform: true,
    description: 'Email password recovery submission',
  },
  {
    id: 'platform-reset-password',
    path: '/platform/reset-password',
    name: 'Password Reset Form',
    isPlatform: true,
    description: 'New password entry and verification',
  },
  {
    id: 'platform-profile',
    path: '/platform/profile',
    name: 'Admin Profile Settings',
    isPlatform: true,
    description: 'Profile name, credentials, password rotation',
  },
  // 9. Additional Directory & Auxiliary Routes (Completing 100% of all 38 routes)
  {
    id: 'platform-users',
    path: '/platform/users',
    name: 'Platform Global Users Directory',
    isPlatform: true,
    description: 'Cross-tenant platform user directory, search, role filters',
  },
  {
    id: 'platform-companies-alias',
    path: '/platform/companies',
    name: 'Platform Companies List (Alias)',
    isPlatform: true,
    description: 'Tenant company directory listing',
  },
  {
    id: 'platform-tenants-detail',
    path: '/platform/tenants/test-company-id',
    name: 'Tenant Details Route',
    isPlatform: true,
    description: 'Direct tenant details route',
  },
  {
    id: 'platform-activity',
    path: '/platform/activity',
    name: 'Platform Activity Audit View',
    isPlatform: true,
    description: 'Audit log activity feed',
  },
  {
    id: 'platform-rbac',
    path: '/platform/rbac',
    name: 'Platform RBAC Matrix',
    isPlatform: true,
    description: 'Role-based access control matrix view',
  },
  {
    id: 'platform-feature-flags',
    path: '/platform/feature-flags',
    name: 'Platform Feature Flags (Direct)',
    isPlatform: true,
    description: 'Feature toggles and rollout controls',
  },
  {
    id: 'platform-settings-email',
    path: '/platform/settings/email',
    name: 'Email Settings Channel',
    isPlatform: true,
    description: 'SMTP and email routing channel settings',
  },
  {
    id: 'platform-email',
    path: '/platform/email',
    name: 'Email Gateway View',
    isPlatform: true,
    description: 'Platform email transmission configuration',
  },
  {
    id: 'platform-tenant-alias',
    path: '/platform/tenant',
    name: 'Tenant Navigation Alias',
    isPlatform: true,
    description: 'Redirect alias for tenants directory',
  },
  {
    id: 'platform-dashboard-alias',
    path: '/platform/dashboard',
    name: 'Platform Dashboard Alias',
    isPlatform: true,
    description: 'Redirect alias for platform root dashboard',
  },
]

export const TENANT_BENCHMARK_ROUTES: AuditRouteDef[] = [
  {
    id: 'tenant-dashboard',
    path: '/demo/dashboard',
    name: 'Tenant Dashboard (Benchmark)',
    isPlatform: false,
    description: 'Tenant main dashboard for cross-app consistency comparison',
  },
  {
    id: 'tenant-orders',
    path: '/demo/orders',
    name: 'Tenant Orders (Benchmark)',
    isPlatform: false,
    description: 'Tenant order table and status badges benchmark',
  },
  {
    id: 'tenant-inventory',
    path: '/demo/inventory',
    name: 'Tenant Inventory (Benchmark)',
    isPlatform: false,
    description: 'Tenant inventory tables and filter controls benchmark',
  },
]

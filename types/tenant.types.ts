import { Database } from './database.types'

export type CompanyRow = Database['public']['Tables']['companies']['Row']
export type CompanySettingsRow = Database['public']['Tables']['company_settings']['Row']
export type BranchRow = Database['public']['Tables']['branches']['Row']
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']
export type RoleRow = Database['public']['Tables']['roles']['Row']
export type PermissionRow = Database['public']['Tables']['permissions']['Row']
export type CompanyUserRow = Database['public']['Tables']['company_users']['Row']
export type UserRoleRow = Database['public']['Tables']['user_roles']['Row']
export type TenantMembershipRow = Database['public']['Tables']['tenant_memberships']['Row']

export type TenantRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'operator'
  | 'accountant'
  | 'designer'
  | 'installer'
  | 'business_owner'
  | 'branch_manager'
  | 'sales_manager'
  | 'graphic_designer'
  | 'production_manager'
  | 'machine_operator'
  | 'general_staff'
  | 'delivery_coordinator'

export interface CompanySettings {
  invoice_prefix: string
  quotation_prefix: string
  challan_prefix: string
  vat_enabled: boolean
  vat_rate: number
  default_currency: string
  default_language: string
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  logo_url?: string | null
  legal_name?: string | null
  office_hours?: string | null
  holidays?: string | null
}

import { DataScope } from './rbac.types'

export interface LinkedEmployeeSummary {
  id: string
  employee_id_number: string
  name: string
  name_bn?: string | null
  role?: string | null
  department?: string | null
  mobile?: string | null
  email?: string | null
  status: string
  profile_picture_url?: string | null
  avatar_url?: string | null
}

export interface CompanyUserWithProfile
  extends Omit<CompanyUserRow, 'data_scopes' | 'responsibilities' | 'department' | 'is_active' | 'raw_overrides' | 'invitation_expires_at'> {
  data_scopes?: Record<string, DataScope>
  responsibilities?: string[]
  department?: string | null
  is_active?: boolean
  raw_overrides?: Record<string, unknown> | null
  profile?: UserProfileRow | null
  roles?: RoleRow[]
  role?: RoleRow | null
  branch?: BranchRow | null
  overrides?: Record<string, boolean>
  data_scope?: DataScope | string
  authorized_branch_ids?: string[]
  user_branch_access?: unknown[]
  linked_employee?: LinkedEmployeeSummary | null
  last_login_at?: string | null
  invitation_expires_at?: string | null
  is_expired?: boolean
}

export interface TenantContextType {
  company: CompanyRow | null
  currentRole: TenantRole | null
  currentUser: CompanyUserWithProfile | null
  currentBranch: BranchRow | null
  responsibilities: string[]
  permissions: string[]
  availableCompanies: CompanyRow[]
  branches: BranchRow[]
  settings: CompanySettingsRow | null
  isLoading: boolean
  switchCompany: (slug: string) => Promise<void>
  refreshTenant: () => Promise<void>
}


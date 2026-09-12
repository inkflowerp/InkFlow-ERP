'use server'

import { revalidatePath } from 'next/cache'
import { CrmService, DuplicateCheckResponse } from '@/services/crm.service'
import { AuditService } from '@/services/audit.service'
import { EntitlementService } from '@/services/entitlement.service'
import { CustomerRecord } from '@/types/crm.types'
import { checkPermission } from '@/lib/auth/rbac.client'
import { PrimaryRole } from '@/types/rbac.types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

export interface CreateCustomerInput {
  customer_kind?: 'business' | 'individual'
  customer_category?: 'retail' | 'corporate' | 'agency' | 'dealer' | 'government' | 'regular'
  rate_level?: 'default' | 'retail' | 'corporate' | 'dealer' | 'custom'
  name: string
  name_bn?: string | null
  company_name?: string | null
  contact_person?: string | null
  mobile: string
  whatsapp?: string | null
  email?: string | null
  alternative_phone?: string | null
  division_id?: number | null
  division?: string | null
  district_id?: number | null
  district?: string | null
  upazila_id?: number | null
  upazila_thana?: string | null
  area?: string | null
  address?: string | null
  address_bn?: string | null
  full_address?: string | null
  bin_no?: string | null
  tin_no?: string | null
  credit_limit?: number
  payment_terms?: any
  notes?: string | null
  tags?: string[]
  is_active?: boolean
  company_id?: string
  role?: PrimaryRole
}

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Securely creates a customer profile
 * Enforces authenticated tenant context and server-side RBAC.
 */
export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<ServerActionResult<CustomerRecord>> {
  try {
    // 1. Enforce authenticated tenant isolation (server-side context)
    const tenant = await getCurrentTenant(input.company_id)
    const companyId = tenant?.companyId || input.company_id
    if (!companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active company context found.',
      }
    }

    // Enforce Plan Customer Quota Limit
    await EntitlementService.enforceLimit(companyId, 'max_customers')
    const userId = tenant?.userId || 'unknown'
    const userEmail = tenant?.userEmail || ''
    const role: PrimaryRole = (tenant?.primaryRole as PrimaryRole) || (input.role as PrimaryRole) || 'business_owner'

    // 2. RBAC check: Customer -> Create
    const canCreate =
      role === 'business_owner' ||
      tenant?.permissions.includes('customer.create') ||
      tenant?.permissions.includes('customers.create') ||
      checkPermission(role, 'customer.create')

    if (!canCreate) {
      return {
        success: false,
        error: 'Unauthorized: You do not have permission to create customer profiles.',
      }
    }

    // 3. Validation
    if (!input.name || !input.name.trim()) {
      return {
        success: false,
        error: 'Customer name is required.',
      }
    }

    if (!input.mobile || !input.mobile.trim()) {
      return {
        success: false,
        error: 'Mobile phone number is required.',
      }
    }

    const cleanedMobile = CrmService.cleanPhoneDigits(input.mobile)
    if (cleanedMobile.length < 10) {
      return {
        success: false,
        error: 'Please enter a valid mobile number (e.g. 01XXXXXXXXX).',
      }
    }

    if (input.email && input.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(input.email.trim())) {
        return {
          success: false,
          error: 'Please enter a valid email address.',
        }
      }
    }

    // 4. Create customer via CrmService
    const created = await CrmService.createCustomer(input, companyId, userId)

    // 5. Audit trail with verified identity
    try {
      await AuditService.logEvent(
        companyId,
        userId,
        userEmail,
        'customer.create',
        'customer',
        created.id,
        null,
        {
          id: created.id,
          name: created.name,
          mobile: created.mobile,
          category: created.customer_category,
          rate_level: created.rate_level,
        },
        `Created customer profile: ${created.name} (${created.mobile})`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return {
      success: true,
      data: created,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unable to save customer. Please try again.',
    }
  }
}

/**
 * Server Action: Search customer records
 */
export async function searchCustomersAction(
  query: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId) return { success: true, data: [] }
    const results = await CrmService.searchCustomers(query, companyId)
    return {
      success: true,
      data: results,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Search failed',
    }
  }
}

/**
 * Server Action: Check potential duplicates
 */
export async function checkCustomerDuplicateAction(
  candidate: {
    mobile?: string
    whatsapp?: string
    name?: string
    company_name?: string
    excludeId?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<DuplicateCheckResponse>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId) {
      return {
        success: true,
        data: { hasDuplicate: false, matches: [] },
      }
    }
    const result = await CrmService.findDuplicates(candidate, companyId)
    return {
      success: true,
      data: result,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Duplicate check failed',
    }
  }
}

/**
 * Server Action: Update customer profile
 */
export async function updateCustomerAction(
  id: string,
  input: Partial<CreateCustomerInput>,
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active company context found.',
      }
    }
    const userId = tenant?.userId || 'unknown'
    const userEmail = tenant?.userEmail || ''
    const role: PrimaryRole = (tenant?.primaryRole as PrimaryRole) || (input.role as PrimaryRole) || 'business_owner'

    // 1. RBAC check: Customer -> Edit
    const canEdit =
      role === 'business_owner' ||
      tenant?.permissions.includes('customer.edit') ||
      tenant?.permissions.includes('customers.edit') ||
      checkPermission(role, 'customer.edit')

    if (!canEdit) {
      return {
        success: false,
        error: 'Unauthorized: You do not have permission to update customer profiles.',
      }
    }

    const updated = await CrmService.updateCustomer(id, input as any, companyId)
    if (!updated) {
      return {
        success: false,
        error: 'Customer record not found or update failed.',
      }
    }

    // 2. Audit Trail
    await AuditService.trackCustomerEdit(
      companyId,
      userId,
      userEmail,
      id,
      {},
      input
    )

    revalidatePath('/', 'layout')
    return {
      success: true,
      data: updated,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to update customer.',
    }
  }
}

/**
 * Server Action: Soft Delete / Deactivate Customer
 */
export async function deleteCustomerAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active company context found.',
      }
    }
    const role: PrimaryRole = (tenant?.primaryRole as PrimaryRole) || 'business_owner'

    const canDelete =
      role === 'business_owner' ||
      tenant?.permissions.includes('customer.delete') ||
      tenant?.permissions.includes('customers.delete') ||
      checkPermission(role, 'customer.delete')

    if (!canDelete) {
      return {
        success: false,
        error: 'Unauthorized: You do not have permission to delete customers.',
      }
    }

    const ok = await CrmService.deleteCustomer(id, companyId)
    revalidatePath('/', 'layout')
    return {
      success: ok,
      data: ok,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to delete customer.',
    }
  }
}

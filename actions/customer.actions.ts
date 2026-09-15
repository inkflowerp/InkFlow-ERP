'use server'

import { revalidatePath } from 'next/cache'
import { CrmService, DuplicateCheckResponse } from '@/services/crm.service'
import { AuditService } from '@/services/audit.service'
import { EntitlementService } from '@/services/entitlement.service'
import {
  CustomerRecord,
  ResolvedProductRate,
  CustomerFinancialSummary,
  CustomerProductPurchaseStat,
  CustomerTimelineEvent,
  CustomerSummaryStatistics,
  CustomerRateRecord,
} from '@/types/crm.types'
import { checkPermission } from '@/lib/auth/rbac.client'
import { PrimaryRole } from '@/types/rbac.types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { PaginatedResult } from '@/lib/api/pagination-helper'

export interface CreateCustomerInput {
  customer_kind?: 'business' | 'individual'
  customer_category?: 'retail' | 'corporate' | 'agency' | 'dealer' | 'government' | 'regular' | 'reseller'
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
 */
export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<ServerActionResult<CustomerRecord>> {
  try {
    const tenant = await getCurrentTenant(input.company_id)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    // Enforce Plan Customer Quota Limit
    try {
      await EntitlementService.enforceLimit(companyId, 'max_customers')
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Customer limit reached for your plan.',
      }
    }

    const userId = tenant.userId
    const userEmail = tenant.userEmail
    const role: PrimaryRole = (tenant.primaryRole as PrimaryRole) || (tenant.companyRole as PrimaryRole) || 'business_owner'

    // RBAC check: Customer -> Create
    const canCreate =
      role === 'business_owner' ||
      tenant.permissions.includes('customer.create') ||
      tenant.permissions.includes('customers.create') ||
      checkPermission(role, 'customer.create')

    if (!canCreate) {
      return {
        success: false,
        error: 'Unauthorized: You do not have permission to create customer profiles.',
      }
    }

    // Validation
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

    const created = await CrmService.createCustomer(input, companyId, userId)

    // Audit trail
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
    if (!tenant || !tenant.companyId) return { success: true, data: [] }
    const companyId = tenant.companyId
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
    if (!tenant || !tenant.companyId) {
      return {
        success: true,
        data: { hasDuplicate: false, matches: [] },
      }
    }
    const companyId = tenant.companyId
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
 * Server Action: Paginated and Filtered Customers
 */
export async function getPaginatedCustomersAction(
  options: {
    page?: number
    pageSize?: number
    search?: string
    customerType?: string
    dueFilter?: 'all' | 'has_due' | 'no_due'
    activeFilter?: 'all' | 'active' | 'inactive'
  } = {},
  requestedCompanyId?: string
): Promise<ServerActionResult<PaginatedResult<CustomerRecord>>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const result = await CrmService.getPaginatedCustomers(companyId, options)
    return {
      success: true,
      data: result,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to fetch customer list',
    }
  }
}

/**
 * Server Action: Customer Summary KPI stats
 */
export async function getCustomersSummaryAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerSummaryStatistics>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: true,
        data: { totalCustomers: 0, activeCustomers: 0, customersWithDue: 0, totalOutstandingDue: 0 },
      }
    }
    const companyId = tenant.companyId

    const stats = await CrmService.getCustomersSummary(companyId)
    return {
      success: true,
      data: stats,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to calculate customer statistics',
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
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId
    const userId = tenant.userId
    const userEmail = tenant.userEmail
    const role: PrimaryRole = (tenant.primaryRole as PrimaryRole) || (tenant.companyRole as PrimaryRole) || 'business_owner'

    // RBAC check: Customer -> Edit
    const canEdit =
      role === 'business_owner' ||
      tenant.permissions.includes('customer.edit') ||
      tenant.permissions.includes('customers.edit') ||
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

    // Audit Trail
    try {
      await AuditService.trackCustomerEdit(companyId, userId, userEmail, id, {}, input)
    } catch {
      // Non-blocking
    }

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
 * Server Action: Delete / Deactivate Customer
 */
export async function deleteCustomerAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId
    const role: PrimaryRole = (tenant.primaryRole as PrimaryRole) || (tenant.companyRole as PrimaryRole) || 'business_owner'

    const canDelete =
      role === 'business_owner' ||
      tenant.permissions.includes('customer.delete') ||
      tenant.permissions.includes('customers.delete') ||
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

/**
 * Server Action: Resolve Customer Rates (3-Tier Priority)
 */
export async function resolveCustomerRatesAction(
  customerId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<ResolvedProductRate[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const rates = await CrmService.resolveCustomerRates(companyId, customerId)
    return {
      success: true,
      data: rates,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to resolve customer rates.',
    }
  }
}

/**
 * Server Action: Save / Override Customer Rate
 */
export async function saveCustomerRateAction(
  customerId: string,
  productId: string,
  rate: number,
  notes?: string | null,
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerRateRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const role: PrimaryRole = (tenant.primaryRole as PrimaryRole) || (tenant.companyRole as PrimaryRole) || 'business_owner'
    const canEdit =
      role === 'business_owner' ||
      tenant.permissions.includes('customer.edit') ||
      tenant.permissions.includes('customers.edit') ||
      checkPermission(role, 'customer.edit')

    if (!canEdit) {
      return {
        success: false,
        error: 'Unauthorized: You do not have permission to manage custom pricing.',
      }
    }

    if (rate < 0) {
      return {
        success: false,
        error: 'Rate cannot be negative.',
      }
    }

    const saved = await CrmService.upsertCustomerRate(companyId, customerId, productId, rate, notes)

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId || 'unknown',
        tenant.userEmail || '',
        'customer.rate_change',
        'customer_rate',
        saved.id,
        null,
        { customerId, productId, rate, notes },
        `Updated customer custom rate for product ${productId} to ৳${rate}`
      )
    } catch {
      // Non-blocking
    }

    revalidatePath('/', 'layout')
    return {
      success: true,
      data: saved,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to save customer rate.',
    }
  }
}

/**
 * Server Action: Delete Customer Custom Rate
 */
export async function deleteCustomerRateAction(
  customerId: string,
  productId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const role: PrimaryRole = (tenant.primaryRole as PrimaryRole) || (tenant.companyRole as PrimaryRole) || 'business_owner'
    const canEdit =
      role === 'business_owner' ||
      tenant.permissions.includes('customer.edit') ||
      tenant.permissions.includes('customers.edit') ||
      checkPermission(role, 'customer.edit')

    if (!canEdit) {
      return {
        success: false,
        error: 'Unauthorized: You do not have permission to manage custom pricing.',
      }
    }

    const ok = await CrmService.deleteCustomerRate(companyId, customerId, productId)
    revalidatePath('/', 'layout')
    return {
      success: ok,
      data: ok,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to delete customer rate override.',
    }
  }
}

/**
 * Server Action: Customer Financial Summary
 */
export async function getCustomerFinancialSummaryAction(
  customerId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerFinancialSummary>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const summary = await CrmService.getCustomerFinancialSummary(companyId, customerId)
    return {
      success: true,
      data: summary,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to calculate customer financial summary.',
    }
  }
}

/**
 * Server Action: Product Purchase Analytics
 */
export async function getCustomerProductAnalyticsAction(
  customerId: string,
  options?: {
    timeframe?: 'week' | 'month' | 'year' | 'all' | 'custom'
    startDate?: string
    endDate?: string
    sortBy?: 'quantity' | 'amount' | 'recent' | 'name'
    sortOrder?: 'asc' | 'desc'
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerProductPurchaseStat[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const stats = await CrmService.getCustomerProductPurchases(companyId, customerId, options)
    return {
      success: true,
      data: stats,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to fetch customer product analytics.',
    }
  }
}

/**
 * Server Action: Customer Activity Timeline
 */
export async function getCustomerTimelineAction(
  customerId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerTimelineEvent[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const timeline = await CrmService.getCustomerTimeline(companyId, customerId)
    return {
      success: true,
      data: timeline,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to load customer timeline.',
    }
  }
}

/**
 * Server Action: Get all active customers for a company
 */
export async function getCustomersAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: true,
        data: [],
      }
    }
    const companyId = tenant.companyId

    const { CustomerRepository } = await import('@/lib/repositories/customer.repository')
    const list = await CustomerRepository.getCustomers(companyId)
    return {
      success: true,
      data: list,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to fetch customer list.',
    }
  }
}

export interface CustomerFullDetails {
  customer: CustomerRecord
  financialSummary: CustomerFinancialSummary | null
  rates: ResolvedProductRate[]
  timelineEvents: CustomerTimelineEvent[]
  invoices: any[]
  payments: any[]
  quotations: any[]
  orders: any[]
}

/**
 * Server Action: Full 360-degree Customer Details & Associated Records
 */
export async function getCustomerFullDetailsAction(
  customerId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<CustomerFullDetails>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const { CustomerRepository } = await import('@/lib/repositories/customer.repository')
    const { BillingRepository } = await import('@/lib/repositories/billing.repository')
    const { QuotationRepository } = await import('@/lib/repositories/quotation.repository')
    const { OrderRepository } = await import('@/lib/repositories/order.repository')

    const [cust, finRes, ratesRes, timelineRes, allInvs, allPays, allQuotes, allOrds] = await Promise.all([
      CustomerRepository.getCustomerById(customerId, companyId),
      CrmService.getCustomerFinancialSummary(companyId, customerId).catch(() => null),
      CrmService.resolveCustomerRates(companyId, customerId).catch(() => []),
      CrmService.getCustomerTimeline(companyId, customerId).catch(() => []),
      BillingRepository.getInvoices(companyId).catch(() => []),
      BillingRepository.getPayments(companyId, customerId).catch(() => []),
      QuotationRepository.getQuotations(companyId).catch(() => []),
      OrderRepository.getOrders(companyId).catch(() => []),
    ])

    if (!cust) {
      return { success: false, error: 'Customer not found.' }
    }

    const cleanCustMobile = (cust.mobile || (cust as any).phone || '').replace(/\D/g, '')
    const cleanCustName = (cust.name || '').toLowerCase().trim()

    const matchedQuotes = (allQuotes || []).filter((q: any) => {
      if (q.customer_id && q.customer_id === customerId) return true
      const qPhone = (q.customer_phone || q.phone || '').replace(/\D/g, '')
      if (cleanCustMobile && qPhone && (qPhone === cleanCustMobile || qPhone.endsWith(cleanCustMobile) || cleanCustMobile.endsWith(qPhone))) {
        return true
      }
      const qName = (q.customer_name || '').toLowerCase().trim()
      if (cleanCustName && qName && qName === cleanCustName) {
        return true
      }
      return false
    })

    return {
      success: true,
      data: {
        customer: cust,
        financialSummary: finRes,
        rates: ratesRes || [],
        timelineEvents: timelineRes || [],
        invoices: (allInvs || []).filter((i: any) => i.customer_id === customerId),
        payments: allPays || [],
        quotations: matchedQuotes,
        orders: (allOrds || []).filter((o: any) => o.customer_id === customerId),
      },
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch customer full details.' }
  }
}

/**
 * Server Action: Log Customer Communication
 */
export async function logCustomerCommunicationAction(
  payload: {
    customerId: string
    type: string
    summary: string
    details?: string | null
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<any>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    let mappedType: 'phone_call' | 'whatsapp_message' | 'email' | 'meeting' | 'site_visit' = 'phone_call'
    if (payload.type === 'call' || payload.type === 'phone_call') mappedType = 'phone_call'
    else if (payload.type === 'whatsapp' || payload.type === 'whatsapp_message') mappedType = 'whatsapp_message'
    else if (payload.type === 'email') mappedType = 'email'
    else if (payload.type === 'meeting') mappedType = 'meeting'
    else if (payload.type === 'site_visit') mappedType = 'site_visit'

    const comm = await CrmService.addCommunication({
      company_id: companyId,
      customer_id: payload.customerId,
      type: mappedType,
      summary: payload.summary,
      details: payload.details || null,
      logged_by: tenant.fullName || 'Authorized Staff',
    })

    revalidatePath(`/customers/${payload.customerId}`)
    return { success: true, data: comm }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to log communication.' }
  }
}


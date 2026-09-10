'use server'

import { revalidatePath } from 'next/cache'
import { OrderService } from '@/services/order.service'
import { AuditService } from '@/services/audit.service'
import { EntitlementService } from '@/services/entitlement.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { SalesOrderRecord } from '@/types/order.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Securely creates a sales order with linked items and timeline in PostgreSQL
 */
export async function createSalesOrderAction(
  orderData: {
    customer_id: string
    customer_name: string
    customer_phone?: string
    customer_address?: string
    order_date?: string
    delivery_date?: string
    priority?: 'urgent' | 'high' | 'normal' | 'low'
    status?: 'draft' | 'confirmed' | 'in_production' | 'completed' | 'delivered' | 'cancelled'
    payment_terms?: 'advance' | 'on_delivery' | 'credit_7_days' | 'credit_15_days' | 'credit_30_days'
    subtotal: number
    discount_amount?: number
    vat_amount?: number
    final_price: number
    advance_amount?: number
    notes?: string
    items: Array<{
      item_name: string
      quantity: number
      unit_price: number
      total_price: number
      width?: number
      height?: number
      dimension_unit?: 'ft' | 'inch' | 'mm' | 'cm'
      unit?: string
      media_type?: string
      notes?: string
    }>
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<SalesOrderRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId || !tenant) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    // Enforce Monthly Orders Plan Quota Limit
    await EntitlementService.enforceLimit(companyId, 'monthly_orders')

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('*') ||
      tenant.permissions.includes('order.create')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: You do not have permission to create sales orders.' }
    }

    if (!orderData.customer_id || !orderData.customer_name) {
      return { success: false, error: 'Customer is required for sales order.' }
    }

    if (!orderData.items || orderData.items.length === 0) {
      return { success: false, error: 'At least one line item is required.' }
    }

    const mappedPriority =
      orderData.priority === 'urgent'
        ? 'urgent'
        : orderData.priority === 'high'
        ? 'urgent'
        : 'normal'

    const mappedPaymentTerms: any =
      orderData.payment_terms === 'on_delivery'
        ? 'cash'
        : orderData.payment_terms?.startsWith('credit')
        ? 'credit'
        : orderData.payment_terms || 'advance'

    const created = await OrderService.createOrder({
      ...orderData,
      priority: mappedPriority,
      payment_terms: mappedPaymentTerms,
      customer_phone: orderData.customer_phone || '',
      delivery_date: orderData.delivery_date || new Date().toISOString().split('T')[0],
      items: orderData.items as any,
      company_id: companyId,
      salesperson_name: tenant.fullName || 'Sales Representative',
    })

    await AuditService.logEvent(
      companyId,
      tenant.userId,
      tenant.userEmail,
      'order.create',
      'order',
      created.id,
      null,
      {
        order_number: created.order_number,
        customer_name: created.customer_name,
        final_price: created.final_price,
      },
      `Created sales order ${created.order_number} for ৳${created.final_price.toLocaleString()}`
    )

    revalidatePath('/', 'layout')
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create sales order' }
  }
}

/**
 * Server Action: Update order status
 */
export async function updateOrderStatusAction(
  orderId: string,
  status: 'draft' | 'confirmed' | 'in_production' | 'completed' | 'delivered' | 'cancelled',
  requestedCompanyId?: string
): Promise<ServerActionResult<SalesOrderRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId
    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context found.' }
    }

    const updated = await OrderService.updateOrder(orderId, { status }, companyId)
    if (!updated) {
      return { success: false, error: 'Failed to update order status: order not found.' }
    }
    revalidatePath('/', 'layout')
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update order status' }
  }
}

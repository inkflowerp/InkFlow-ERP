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
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    // Enforce Monthly Orders Plan Quota Limit
    await EntitlementService.enforceLimit(companyId, 'monthly_orders')

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.permissions.includes('order.create') ||
      tenant.permissions.includes('orders.create')

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
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

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

export interface NewWorkIntakeInput {
  customerId: string
  customerName: string
  customerPhone?: string
  customerAddress?: string
  jobTitle: string
  width: number
  height: number
  unit: 'ft' | 'inch' | 'pcs'
  quantity: number
  unitRate: number
  totalAmount: number
  advancePaid: number
  dueAmount: number
  paymentMethod?: 'cash' | 'bkash' | 'nagad' | 'bank'
  materialName: string
  selectedFinishings?: string[]
  deliveryDate: string
  deliveryType?: 'pickup' | 'courier' | 'installation'
  workflowRouting?: 'design_required' | 'design_ok' | 'ready_production' | 'custom'
  notes?: string
  assignedMachine?: string
  priority?: 'normal' | 'urgent' | 'very_urgent'
  companyId?: string
}

export interface NewWorkIntakeResult {
  invoiceNumber: string
  orderNumber: string
  jobNumber: string
  invoiceId: string
  productionJobId: string
}

/**
 * Server Action: Frictionless New Work order intake, invoice generation & production task creation
 */
export async function createNewWorkIntakeAction(
  input: NewWorkIntakeInput
): Promise<ServerActionResult<NewWorkIntakeResult>> {
  try {
    const tenant = await getCurrentTenant(input.companyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const { BillingRepository } = await import('@/lib/repositories/billing.repository')
    const { ProductionRepository } = await import('@/lib/repositories/production.repository')
    const { ProductionTaskRepository } = await import('@/lib/repositories/production-task.repository')
    const { DesignRepository } = await import('@/lib/repositories/design.repository')

    const custPhone = input.customerPhone || ''
    const routing = input.workflowRouting || 'design_required'

    // 1. Generate Document Numbers transactionally
    const invoiceNumber = await BillingRepository.getNextDocumentNumber(companyId, 'invoice')
    const orderNumber = await BillingRepository.getNextDocumentNumber(companyId, 'order')
    const jobNumber = `JOB-${orderNumber.replace('ORD-', '')}`

    // 2. Create Invoice
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: input.customerId,
      customer_name: input.customerName,
      customer_phone: custPhone,
      customer_address: input.customerAddress || '',
      invoice_number: invoiceNumber,
      order_number: orderNumber,
      job_number: jobNumber,
      subtotal: input.totalAmount,
      discount_amount: 0,
      vat_amount: 0,
      grand_total: input.totalAmount,
      paid_amount: input.advancePaid,
      due_amount: input.dueAmount,
      status: input.dueAmount === 0 ? 'paid' : input.advancePaid > 0 ? 'partially_paid' : 'unpaid',
      due_date: input.deliveryDate,
      created_by_name: tenant?.fullName || 'Workshop Operator',
      items: [
        {
          id: crypto.randomUUID(),
          invoice_id: '',
          item_description: `${input.jobTitle} (${input.width}x${input.height} ${input.unit}) - ${input.materialName}`,
          quantity: input.quantity,
          unit: input.unit,
          unit_price: input.unitRate,
          vat_percentage: 0,
          total_price: input.totalAmount,
        },
      ],
    })

    // 3. Record Advance Payment if made
    if (input.advancePaid > 0) {
      await BillingRepository.recordPayment({
        company_id: companyId,
        customer_id: input.customerId,
        customer_name: input.customerName,
        amount: input.advancePaid,
        payment_method: input.paymentMethod || 'cash',
        invoice_id: invoice.id,
        notes: `Advance for ${input.jobTitle}`,
        received_by_name: tenant?.fullName || 'Workshop Operator',
      })
    }

    // 4. If Design is required, create a Designer job ticket
    let designJobId: string | null = null
    if (routing === 'design_required') {
      const designJob = await DesignRepository.createDesignJob({
        company_id: companyId,
        title: input.jobTitle,
        customer_id: input.customerId,
        customer_name: input.customerName,
        deadline: input.deliveryDate,
        priority: input.priority || 'normal',
        status: 'received',
        workflow_routing: 'design_required',
        commercial_status: 'invoice_created',
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        instructions: input.notes || `Artwork design needed for ${input.jobTitle} (${input.width}x${input.height} ${input.unit})`,
      })
      designJobId = designJob.id
    }

    // 5. Create Production Job
    const finishings = input.selectedFinishings || []
    const prodJob = await ProductionRepository.createProductionJob({
      company_id: companyId,
      production_job_number: jobNumber,
      customer_name: input.customerName,
      product_name: input.jobTitle,
      department: routing === 'design_required' ? 'design' : 'printing',
      stage: routing === 'design_required' ? 'design' : 'printing',
      status: 'queued',
      priority: input.priority || 'normal',
      deadline: input.deliveryDate,
      dimensions_spec: `${input.width} × ${input.height} ${input.unit}`,
      quantity: input.quantity,
      material_spec: `${input.materialName}${finishings.length ? ' (' + finishings.join(', ') + ')' : ''}`,
      assigned_workers: [],
      production_instructions: input.notes || undefined,
      has_rework: false,
      rework_count: 0,
    })

    // 6. Create Production Task
    const totalSqft =
      input.unit === 'ft'
        ? input.width * input.height * input.quantity
        : input.unit === 'inch'
        ? (input.width * input.height * input.quantity) / 144
        : input.quantity

    await ProductionTaskRepository.createTask({
      company_id: companyId,
      production_job_id: prodJob.id,
      task_name: `Print: ${input.jobTitle} (${input.width}x${input.height} ${input.unit})`,
      stage_name: 'printing',
      department: 'printing',
      task_type: 'printing',
      sequence_order: 1,
      quantity: input.quantity,
      unit: input.unit,
      status: 'queued',
      customer_name: input.customerName,
      product_name: input.jobTitle,
      job_number: jobNumber,
      assigned_machine_name: input.assignedMachine || 'Large Format Eco-Solvent #1',
      estimated_duration_minutes: Math.max(15, Math.round(totalSqft * 0.5)),
    })

    if (finishings.length > 0) {
      await ProductionTaskRepository.createTask({
        company_id: companyId,
        production_job_id: prodJob.id,
        task_name: `Finishing: ${finishings.join(', ')} - ${input.jobTitle}`,
        stage_name: 'finishing',
        department: 'finishing',
        task_type: 'finishing',
        sequence_order: 2,
        quantity: input.quantity,
        unit: input.unit,
        status: 'queued',
        customer_name: input.customerName,
        product_name: input.jobTitle,
        job_number: jobNumber,
        assigned_machine_name: 'Manual Finishing Bench',
        estimated_duration_minutes: Math.max(10, Math.round(input.quantity * 2)),
      })
    }

    // Audit Logging
    try {
      await AuditService.logEvent(
        companyId,
        tenant?.userId || 'unknown',
        tenant?.userEmail || '',
        'order.intake',
        'order',
        invoice.id,
        null,
        {
          order_number: orderNumber,
          invoice_number: invoiceNumber,
          job_number: jobNumber,
          workflow_routing: routing,
          customer_name: input.customerName,
          total_amount: input.totalAmount,
          advance_paid: input.advancePaid,
        },
        `Created new work order ${orderNumber} (${jobNumber}) for customer ${input.customerName} (Routing: ${routing})`
      )
    } catch {}

    revalidatePath('/', 'layout')

    return {
      success: true,
      data: {
        invoiceNumber,
        orderNumber,
        jobNumber,
        invoiceId: invoice.id,
        productionJobId: prodJob.id,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create work intake' }
  }
}

/**
 * Server Action: Fetch sales orders for tenant
 */
export async function getOrdersAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<SalesOrderRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const data = await OrderService.getOrders(tenant.companyId)
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch orders' }
  }
}

/**
 * Server Action: Purge all sales orders and job orders for tenant
 */
export async function purgeAllOrdersAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const ok = await OrderService.purgeAllOrders(companyId)
    if (!ok) {
      return { success: false, error: 'Failed to purge orders.' }
    }

    try {
      await AuditService.logEvent(
        companyId,
        tenant.userId,
        tenant.userEmail,
        'order.purge_all',
        'order',
        null,
        null,
        {},
        `Purged all sales orders and job orders for company ${companyId}`
      )
    } catch {}

    revalidatePath('/', 'layout')
    return { success: true, data: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to purge orders' }
  }
}




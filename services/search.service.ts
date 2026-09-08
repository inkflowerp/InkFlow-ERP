// ==============================================================================
// PrintERP SaaS - Phase 24: Global Multi-Entity Search Service
// Searches across core domains with strict tenant quarantine and RBAC gating.
// ==============================================================================

import {
  SearchEntity,
  SearchResultItem,
  GroupedSearchResults,
  QuickCommand,
} from '@/types/search.types'
import { PrimaryRole } from '@/types/rbac.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { CustomerRecord } from '@/types/crm.types'
import { SalesOrderRecord } from '@/types/order.types'
import { QuotationRecord } from '@/types/quotation.types'
import { InvoiceRecord } from '@/types/billing.types'
import { MaterialRecord } from '@/types/inventory.types'
import { ProductionJobRecord } from '@/types/production.types'
import { DesignJobRecord } from '@/types/design.types'
import { DeliveryChallanRecord } from '@/types/logistics.types'
import { EmployeeRecord } from '@/types/hr.types'

export const QUICK_COMMANDS: QuickCommand[] = [
  {
    id: 'cmd-create-customer',
    title: 'Create Customer',
    subtitle: 'Add new client profile, credit limit, and VAT BIN',
    icon: 'UserPlus',
    href: '/customers?action=new',
    shortcut: 'C',
    requiredPermission: 'customer.create',
  },
  {
    id: 'cmd-create-quotation',
    title: 'Create Quotation',
    subtitle: 'Calculate dimensional square-foot estimate & discount',
    icon: 'FileSpreadsheet',
    href: '/quotations?action=new',
    shortcut: 'Q',
    requiredPermission: 'quotation.create',
  },
  {
    id: 'cmd-create-order',
    title: 'Create Order',
    subtitle: 'Book job ticket with media specs and artwork proof',
    icon: 'ShoppingBag',
    href: '/orders?action=new',
    shortcut: 'O',
    requiredPermission: 'order.create',
  },
  {
    id: 'cmd-record-payment',
    title: 'Record Payment',
    subtitle: 'Collect cash, bKash, Nagad, or bank money receipt',
    icon: 'CreditCard',
    href: '/billing?action=record-payment',
    shortcut: 'P',
    requiredPermission: 'payment.create',
  },
  {
    id: 'cmd-create-purchase',
    title: 'Create Purchase',
    subtitle: 'Order raw materials (flex rolls, vinyl, inks) from vendor',
    icon: 'Truck',
    href: '/purchases?action=new',
    shortcut: 'B',
    requiredPermission: 'purchase.create',
  },
  {
    id: 'cmd-add-expense',
    title: 'Add Expense',
    subtitle: 'Record workshop utility, machine parts, or transport voucher',
    icon: 'Receipt',
    href: '/accounting?action=add-expense',
    shortcut: 'E',
    requiredPermission: 'accounting.create',
  },
]

export class SearchService {
  /**
   * Search across entities with tenant isolation and RBAC permission checks
   */
  static search(
    companyId: string,
    query: string,
    userRole: PrimaryRole = 'business_owner',
    userPermissions: string[] = []
  ): GroupedSearchResults {
    const q = query.trim().toLowerCase()
    if (!q) return {}

    const hasPermission = (requiredPermission?: string) => {
      if (!requiredPermission) return true
      if (userRole === 'platform_owner' || userRole === 'business_owner') return true

      if (userRole === 'sales_manager') {
        if (requiredPermission.startsWith('hr.')) return false
        return true
      }
      if (userRole === 'operator') {
        if (
          requiredPermission.startsWith('invoice.') ||
          requiredPermission.startsWith('payment.') ||
          requiredPermission.startsWith('hr.') ||
          requiredPermission.startsWith('supplier.')
        ) {
          return false
        }
        return true
      }

      return userPermissions.includes(requiredPermission)
    }

    const results: SearchResultItem[] = []

    // 1. Customers
    if (hasPermission('customer.view')) {
      const customers = (PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []).filter(
        (c) => !c.company_id || c.company_id === companyId
      )
      for (const c of customers) {
        if (
          c.name.toLowerCase().includes(q) ||
          (c.name_bn && c.name_bn.includes(q)) ||
          (c.company_name && c.company_name.toLowerCase().includes(q)) ||
          c.mobile.includes(q)
        ) {
          results.push({
            id: c.id,
            entity: 'customer',
            title: c.name,
            subtitle: `${c.customer_type || 'Customer'} • ${c.area || 'Dhaka'} • ${c.mobile}`,
            badge: c.customer_type || 'Customer',
            status: c.is_active ? 'active' : 'inactive',
            href: `/customers`,
            requiredPermission: 'customer.view',
            metadata: { phone: c.mobile, balance: c.total_due_balance },
          })
        }
      }
    }

    // 2. Orders
    if (hasPermission('order.view')) {
      const orders = (PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []).filter(
        (o) => !o.company_id || o.company_id === companyId
      )
      for (const o of orders) {
        if (
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          (o.notes && o.notes.toLowerCase().includes(q))
        ) {
          results.push({
            id: o.id,
            entity: 'order',
            title: o.order_number,
            subtitle: `${o.customer_name} • ৳${o.final_price?.toLocaleString() || o.subtotal?.toLocaleString()}`,
            badge: o.status,
            status: o.status,
            href: `/orders`,
            requiredPermission: 'order.view',
            metadata: { orderNumber: o.order_number, grandTotal: o.final_price },
          })
        }
      }
    }

    // 3. Quotations
    if (hasPermission('quotation.view')) {
      const quotations = (PrintERPDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []).filter(
        (qt) => !qt.company_id || qt.company_id === companyId
      )
      for (const qt of quotations) {
        if (
          qt.quotation_number.toLowerCase().includes(q) ||
          qt.customer_name.toLowerCase().includes(q)
        ) {
          results.push({
            id: qt.id,
            entity: 'quotation',
            title: qt.quotation_number,
            subtitle: `${qt.customer_name} • ৳${qt.grand_total?.toLocaleString()}`,
            badge: qt.status,
            status: qt.status,
            href: `/quotations`,
            requiredPermission: 'quotation.view',
            metadata: { quoteNumber: qt.quotation_number, total: qt.grand_total },
          })
        }
      }
    }

    // 4. Invoices
    if (hasPermission('invoice.view')) {
      const invoices = (PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []).filter(
        (i) => !i.company_id || i.company_id === companyId
      )
      for (const i of invoices) {
        if (
          i.invoice_number.toLowerCase().includes(q) ||
          i.customer_name.toLowerCase().includes(q)
        ) {
          results.push({
            id: i.id,
            entity: 'invoice',
            title: i.invoice_number,
            subtitle: `${i.customer_name} • ৳${i.grand_total?.toLocaleString()} • Due: ৳${i.due_amount?.toLocaleString()}`,
            badge: i.status,
            status: i.status,
            href: `/billing`,
            requiredPermission: 'invoice.view',
            metadata: { invoiceNumber: i.invoice_number, grandTotal: i.grand_total },
          })
        }
      }
    }

    // 5. Inventory
    if (hasPermission('inventory.view')) {
      const materials = (PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []).filter(
        (m) => !m.company_id || m.company_id === companyId
      )
      for (const m of materials) {
        if (
          m.name.toLowerCase().includes(q) ||
          (m.sku && m.sku.toLowerCase().includes(q))
        ) {
          results.push({
            id: m.id,
            entity: 'inventory',
            title: m.name,
            subtitle: `SKU: ${m.sku} • Stock: ${m.current_stock} ${m.unit}`,
            badge: m.category,
            status: m.current_stock > m.min_stock_level ? 'in_stock' : 'low_stock',
            href: `/inventory`,
            requiredPermission: 'inventory.view',
            metadata: { sku: m.sku, stock: m.current_stock },
          })
        }
      }
    }

    // 6. Production Jobs
    if (hasPermission('production.view')) {
      const prodJobs = (PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []).filter(
        (p) => !p.company_id || p.company_id === companyId
      )
      for (const p of prodJobs) {
        if (
          p.production_job_number.toLowerCase().includes(q) ||
          p.product_name.toLowerCase().includes(q) ||
          p.customer_name.toLowerCase().includes(q)
        ) {
          results.push({
            id: p.id,
            entity: 'production_job',
            title: p.production_job_number,
            subtitle: `${p.customer_name} • ${p.product_name} • ${p.department}`,
            badge: p.status,
            status: p.status,
            href: `/production`,
            requiredPermission: 'production.view',
            metadata: { jobNumber: p.production_job_number },
          })
        }
      }
    }

    // 7. Design Jobs
    if (hasPermission('design.view')) {
      const designJobs = (PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []).filter(
        (d) => !d.company_id || d.company_id === companyId
      )
      for (const d of designJobs) {
        if (
          d.design_number.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.customer_name.toLowerCase().includes(q)
        ) {
          results.push({
            id: d.id,
            entity: 'design_job',
            title: d.design_number,
            subtitle: `${d.customer_name} • ${d.title}`,
            badge: d.status,
            status: d.status,
            href: `/design`,
            requiredPermission: 'design.view',
            metadata: { designNumber: d.design_number },
          })
        }
      }
    }

    // 8. Delivery Challans
    if (hasPermission('delivery.view')) {
      const challans = (PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []).filter(
        (ch) => !ch.company_id || ch.company_id === companyId
      )
      for (const ch of challans) {
        if (
          ch.challan_number.toLowerCase().includes(q) ||
          ch.customer_name.toLowerCase().includes(q)
        ) {
          results.push({
            id: ch.id,
            entity: 'challan',
            title: ch.challan_number,
            subtitle: `${ch.customer_name} • ${ch.delivery_address}`,
            badge: ch.status,
            status: ch.status,
            href: `/delivery`,
            requiredPermission: 'delivery.view',
            metadata: { challanNumber: ch.challan_number },
          })
        }
      }
    }

    // 9. Employees
    if (hasPermission('hr.view')) {
      const employees = (PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES) || []).filter(
        (e) => !e.company_id || e.company_id === companyId
      )
      for (const e of employees) {
        if (
          e.name.toLowerCase().includes(q) ||
          (e.name_bn && e.name_bn.includes(q)) ||
          e.mobile.includes(q) ||
          e.role.toLowerCase().includes(q)
        ) {
          results.push({
            id: e.id,
            entity: 'employee',
            title: e.name,
            subtitle: `${e.role} • ${e.department} • ${e.mobile}`,
            badge: e.department,
            status: e.status,
            href: `/hr`,
            requiredPermission: 'hr.view',
            metadata: { phone: e.mobile },
          })
        }
      }
    }

    // Group by entity
    const grouped: GroupedSearchResults = {}
    for (const item of results) {
      if (!grouped[item.entity]) {
        grouped[item.entity] = []
      }
      grouped[item.entity]!.push(item)
    }

    return grouped
  }

  /**
   * Return permitted Quick Commands for the current user
   */
  static getQuickCommands(userRole: PrimaryRole = 'business_owner'): QuickCommand[] {
    if (userRole === 'operator') {
      return QUICK_COMMANDS.filter(
        (c) => c.id !== 'cmd-record-payment' && c.id !== 'cmd-add-expense'
      )
    }
    return QUICK_COMMANDS
  }
}

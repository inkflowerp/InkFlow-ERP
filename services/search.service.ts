// ==============================================================================
// PrintERP SaaS - Phase 24: Global Multi-Entity Search Service
// Searches across core domains with strict tenant quarantine and RBAC gating.
// ==============================================================================

import type {
  SearchEntity,
  SearchResultItem,
  GroupedSearchResults,
  QuickCommand,
} from '../types/search.types.ts'
import type { PrimaryRole } from '../types/rbac.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type { CustomerRecord } from '../types/crm.types.ts'
import type { SalesOrderRecord } from '../types/order.types.ts'
import type { QuotationRecord } from '../types/quotation.types.ts'
import type { InvoiceRecord } from '../types/billing.types.ts'
import type { MaterialRecord } from '../types/inventory.types.ts'
import type { ProductionJobRecord } from '../types/production.types.ts'
import type { DesignJobRecord } from '../types/design.types.ts'
import type { DeliveryChallanRecord } from '../types/logistics.types.ts'
import type { EmployeeRecord } from '../types/hr.types.ts'
import type { MachineryRecord } from '../types/machinery.types.ts'

export const QUICK_COMMANDS: QuickCommand[] = [
  {
    id: 'cmd-create-customer',
    title: 'Create Customer',
    titleBn: 'নতুন কাস্টমার তৈরি',
    subtitle: 'Add new client profile, credit limit, and address',
    subtitleBn: 'কাস্টমার প্রোফাইল, ক্রেডিট লিমিট ও ঠিকানা যুক্ত করুন',
    icon: 'UserPlus',
    href: '/customers?action=new',
    shortcut: 'C',
    requiredPermission: 'customer.create',
  },
  {
    id: 'cmd-create-quotation',
    title: 'Create Quotation',
    titleBn: 'কোটেশন তৈরি করুন',
    subtitle: 'Calculate dimensional square-foot estimate & discount',
    subtitleBn: 'স্কয়ার-ফিট সাইজ ও আইটেম রেট অনুযায়ী কোটেশন তৈরি',
    icon: 'FileSpreadsheet',
    href: '/quotations?action=new',
    shortcut: 'Q',
    requiredPermission: 'quotation.create',
  },
  {
    id: 'cmd-create-order',
    title: 'Create Order',
    titleBn: 'নতুন জব অর্ডার',
    subtitle: 'Book job ticket with media specs and artwork proof',
    subtitleBn: 'মিডিয়া স্পেসিফিকেশন ও আর্টওয়ার্ক সহ কাজের অর্ডার',
    icon: 'ShoppingBag',
    href: '/orders?action=new',
    shortcut: 'O',
    requiredPermission: 'order.create',
  },
  {
    id: 'cmd-record-payment',
    title: 'Record Payment',
    titleBn: 'পেমেন্ট রিসিট (MR)',
    subtitle: 'Collect cash, bKash, Nagad, or bank money receipt',
    subtitleBn: 'ক্যাশ, বিকাশ, নগদ বা ব্যাংক মানি রিসিট এন্ট্রি',
    icon: 'CreditCard',
    href: '/billing?action=record-payment',
    shortcut: 'P',
    requiredPermission: 'payment.create',
  },
  {
    id: 'cmd-create-purchase',
    title: 'Create Purchase',
    titleBn: 'কাঁচামাল ক্রয় অর্ডার',
    subtitle: 'Order raw materials (flex rolls, vinyl, inks) from vendor',
    subtitleBn: 'ফ্লেক্স রোল, ভিনাইল ও কালির সাপ্লায়ার পারচেজ অর্ডার',
    icon: 'Truck',
    href: '/purchases?action=new',
    shortcut: 'B',
    requiredPermission: 'purchase.create',
  },
  {
    id: 'cmd-add-expense',
    title: 'Add Expense',
    titleBn: 'খরচ ভাউচার যোগ',
    subtitle: 'Record workshop utility, machine parts, or transport voucher',
    subtitleBn: 'কারখানা বিল, যন্ত্রাংশ বা অফিস যাতায়াত খরচ রেকর্ড',
    icon: 'Receipt',
    href: '/accounting?action=add-expense',
    shortcut: 'E',
    requiredPermission: 'accounting.create',
  },
  {
    id: 'cmd-add-machinery',
    title: 'Add Machinery',
    titleBn: 'নতুন মেশিন যোগ করুন',
    subtitle: 'Register printer, laser, CNC, or fabrication equipment',
    subtitleBn: 'নতুন প্রিন্টার, লেজার, সিএনসি বা ফ্যাব্রিকেশন মেশিন যুক্ত করুন',
    icon: 'Cpu',
    href: '/production/machineries?action=new',
    shortcut: 'M',
    requiredPermission: 'machineries.create',
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

    // 4.5 Products & Services Catalog
    if (hasPermission('products.view') || hasPermission('inventory.view') || hasPermission('quotation.create')) {
      const products = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []).filter(
        (p) => !p.company_id || p.company_id === companyId
      )
      for (const p of products) {
        if (
          p.name.toLowerCase().includes(q) ||
          (p.name_bn && p.name_bn.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.material_spec && p.material_spec.toLowerCase().includes(q))
        ) {
          results.push({
            id: p.id,
            entity: 'product',
            title: p.name,
            subtitle: `${p.sku} • ৳${p.selling_price}/${p.unit || 'sft'} • ${p.product_type?.replace('_', ' ')}`,
            badge: p.category,
            status: p.is_active ? 'active' : 'archived',
            href: `/products/${p.id}`,
            requiredPermission: 'products.view',
            metadata: { sku: p.sku, sellingPrice: p.selling_price, unit: p.unit },
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

    // 10. Machineries & Equipment Fleet
    if (hasPermission('machineries.view') || hasPermission('production.view')) {
      const machineries = (PrintERPDataStore.get<MachineryRecord[]>('machineries' as any) || []).filter(
        (m) => (!m.company_id || m.company_id === companyId) && !m.is_archived
      )
      for (const m of machineries) {
        if (
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          (m.brand && m.brand.toLowerCase().includes(q)) ||
          (m.model && m.model.toLowerCase().includes(q)) ||
          (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
          (m.machine_type && m.machine_type.toLowerCase().includes(q))
        ) {
          results.push({
            id: m.id,
            entity: 'machinery',
            title: `${m.name} (${m.code})`,
            subtitle: `${m.brand || ''} ${m.model || ''} • Status: ${m.status.toUpperCase()} • Dept: ${m.department}`,
            badge: m.status,
            status: m.status,
            href: `/production/machineries/${m.id}`,
            requiredPermission: 'machineries.view',
            metadata: { code: m.code, type: m.machine_type, status: m.status },
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

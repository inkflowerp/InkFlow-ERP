// ==============================================================================
// LEGACY — NOT FOR PRODUCTION BUSINESS DATA
// Authoritative data persistence has migrated to Supabase PostgreSQL Repositories:
//  - CustomerRepository (PostgreSQL: customers, communications)
//  - BillingRepository (PostgreSQL: invoices, payments, payment_adjustments)
//  - InventoryRepository (PostgreSQL: materials, stock_ledger)
//  - OrderRepository (PostgreSQL: sales_orders, job_orders, timeline)
//  - DesignRepository (PostgreSQL: design_jobs, design_versions)
//  - ProductionRepository (PostgreSQL: production_jobs, production_reworks)
//  - LogisticsRepository (PostgreSQL: delivery_challans, installations)
//  - AuditRepository (PostgreSQL: audit_logs)
//  - TenantRepository (PostgreSQL: companies, company_users, roles, permissions)
//
// This module is retained exclusively for transient local client UI state.
// ==============================================================================

import type {
  CustomerRecord,
  CustomerCommunication,
  SupplierRecord,
  SupplierMaterialPrice,
} from '../../types/crm.types.ts'
import type {
  SalesOrderRecord,
  JobOrderRecord,
  OrderTimelineEventRecord,
} from '../../types/order.types.ts'
import type {
  QuotationRecord,
  QuotationActivityRecord,
} from '../../types/quotation.types.ts'
import type {
  ProductRecord,
  PriceHistoryRecord,
} from '../../types/product.types.ts'
import type {
  MaterialRecord,
  InventoryRollRecord,
  StockLedgerRecord,
  MaterialWastageRecord,
} from '../../types/inventory.types.ts'
import type {
  ProductionJobRecord,
  ProductionReworkRecord,
} from '../../types/production.types.ts'
import type {
  InvoiceRecord,
  PaymentRecord,
} from '../../types/billing.types.ts'
import type {
  ExpenseRecord,
  BankAccountRecord,
  CashBookEntryRecord,
} from '../../types/accounting.types.ts'
import type {
  PurchaseOrderRecord,
  SupplierPriceHistoryRecord,
} from '../../types/purchase.types.ts'
import type {
  DeliveryChallanRecord,
  InstallationRecord,
} from '../../types/logistics.types.ts'
import type {
  JobCostingRecord,
} from '../../types/costing.types.ts'
import type {
  DesignJobRecord,
} from '../../types/design.types.ts'
import type {
  EmployeeRecord,
  AttendanceRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
} from '../../types/hr.types.ts'
import type {
  CommunicationLogRecord,
  MessageTemplateRecord,
  ChannelConfigRecord,
} from '../../types/communication.types.ts'
import type {
  CompanyTaxSettingsRecord,
  DocumentTemplateConfigRecord,
  DocumentType,
} from '../../types/tax-and-docs.types.ts'
import type {
  CompanyUserWithProfile,
  RoleRow,
  BranchRow,
} from '../../types/tenant.types.ts'
import type {
  PlatformTenantCompany,
  PlatformFeatureFlagItem,
  PlatformRBACTemplate,
  PlatformAdminUser,
  PlatformIncidentItem,
} from '../../types/platform.types.ts'
import type { SubscriptionPlanRecord } from '../../types/subscription.types.ts'
import { DEFAULT_PLANS } from '../subscription/subscription-constants.ts'
import { DEFAULT_ROLE_MATRICES } from '../auth/rbac.client.ts'

// Storage keys
export const STORAGE_KEYS = {
  CUSTOMERS: 'printerp_tenant_customers',
  COMMUNICATIONS: 'printerp_tenant_communications',
  SUPPLIERS: 'printerp_tenant_suppliers',
  SUPPLIER_PRICES: 'printerp_tenant_supplier_prices',
  ORDERS: 'printerp_tenant_orders',
  JOB_ORDERS: 'printerp_tenant_job_orders',
  TIMELINE_EVENTS: 'printerp_tenant_timeline_events',
  QUOTATIONS: 'printerp_tenant_quotations',
  QUOTATION_ACTIVITIES: 'printerp_tenant_quotation_activities',
  PRODUCTS: 'printerp_tenant_products',
  PRICE_HISTORY: 'printerp_tenant_price_history',
  MATERIALS: 'printerp_tenant_materials',
  MOUNTED_ROLLS: 'printerp_tenant_mounted_rolls',
  STOCK_LEDGER: 'printerp_tenant_stock_ledger',
  PRODUCTION_JOBS: 'printerp_tenant_production_jobs',
  REWORKS: 'printerp_tenant_reworks',
  INVOICES: 'printerp_tenant_invoices',
  PAYMENTS: 'printerp_tenant_payments',
  EXPENSES: 'printerp_tenant_expenses',
  BANK_ACCOUNTS: 'printerp_tenant_bank_accounts',
  CASH_BOOK: 'printerp_tenant_cash_book',
  PURCHASE_ORDERS: 'printerp_tenant_purchase_orders',
  DELIVERY_CHALLANS: 'printerp_tenant_delivery_challans',
  INSTALLATIONS: 'printerp_tenant_installations',
  JOB_COSTINGS: 'printerp_tenant_job_costings',
  DESIGN_JOBS: 'printerp_tenant_design_jobs',
  EMPLOYEES: 'printerp_tenant_employees',
  ATTENDANCE: 'printerp_tenant_attendance',
  SALARY_ADVANCES: 'printerp_tenant_salary_advances',
  DAILY_LABOR_LOGS: 'printerp_tenant_daily_labor_logs',
  PAYROLL: 'printerp_tenant_payroll',
  PAYROLL_PERIODS: 'printerp_tenant_payroll_periods',
  IN_APP_NOTIFICATIONS: 'printerp_tenant_in_app_notifications',
  COMMUNICATION_LOGS: 'printerp_tenant_comm_logs',
  MESSAGE_TEMPLATES: 'printerp_tenant_msg_templates',
  CHANNEL_CONFIGS: 'printerp_tenant_channel_configs',
  TAX_SETTINGS: 'printerp_tenant_tax_settings',
  COMPANY_USERS: 'printerp_tenant_company_users',
  ROLES: 'printerp_tenant_roles',
  ROLE_MATRICES: 'printerp_tenant_role_matrices',
  BRANCHES: 'printerp_tenant_branches',
  COMPANY_PROFILE: 'printerp_tenant_company_profile',
  BRANDING_SETTINGS: 'printerp_tenant_branding_settings',
  DOCUMENT_NUMBERING: 'printerp_tenant_doc_numbering',
  DOCUMENT_TEMPLATES: 'printerp_tenant_doc_templates',
  NOTIFICATION_SETTINGS: 'printerp_tenant_notification_settings',
  AUTOMATION_RULES: 'printerp_tenant_automation_rules',
  PLATFORM_COMPANIES: 'printerp_platform_companies',
  PLATFORM_PLANS: 'printerp_platform_plans',
  PLATFORM_FEATURE_FLAGS: 'printerp_platform_feature_flags',
  PLATFORM_USERS: 'printerp_platform_users',
  PLATFORM_INCIDENTS: 'printerp_platform_incidents',
  PLATFORM_SYSTEM_SETTINGS: 'printerp_platform_system_settings',
  OPERATOR_JOBS: 'printerp_tenant_operator_jobs',
  AUDIT_LOGS: 'printerp_tenant_audit_logs',
  USER_OVERRIDES: 'printerp_tenant_user_overrides',
  COMPANY_SUBSCRIPTIONS: 'printerp_company_subscriptions',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export function isPlatformKey(key: string): boolean {
  return (
    key === STORAGE_KEYS.PLATFORM_COMPANIES ||
    key === STORAGE_KEYS.PLATFORM_PLANS ||
    key === STORAGE_KEYS.PLATFORM_FEATURE_FLAGS ||
    key === STORAGE_KEYS.PLATFORM_USERS ||
    key === STORAGE_KEYS.PLATFORM_INCIDENTS ||
    key === STORAGE_KEYS.PLATFORM_SYSTEM_SETTINGS ||
    key === STORAGE_KEYS.COMPANY_USERS
  )
}

export function isTransactionalKey(key: string): boolean {
  return (
    key === STORAGE_KEYS.CUSTOMERS ||
    key === STORAGE_KEYS.COMMUNICATIONS ||
    key === STORAGE_KEYS.SUPPLIERS ||
    key === STORAGE_KEYS.SUPPLIER_PRICES ||
    key === STORAGE_KEYS.ORDERS ||
    key === STORAGE_KEYS.JOB_ORDERS ||
    key === STORAGE_KEYS.TIMELINE_EVENTS ||
    key === STORAGE_KEYS.QUOTATIONS ||
    key === STORAGE_KEYS.QUOTATION_ACTIVITIES ||
    key === STORAGE_KEYS.PRODUCTS ||
    key === STORAGE_KEYS.PRICE_HISTORY ||
    key === STORAGE_KEYS.MATERIALS ||
    key === STORAGE_KEYS.MOUNTED_ROLLS ||
    key === STORAGE_KEYS.STOCK_LEDGER ||
    key === STORAGE_KEYS.PRODUCTION_JOBS ||
    key === STORAGE_KEYS.REWORKS ||
    key === STORAGE_KEYS.INVOICES ||
    key === STORAGE_KEYS.PAYMENTS ||
    key === STORAGE_KEYS.EXPENSES ||
    key === STORAGE_KEYS.BANK_ACCOUNTS ||
    key === STORAGE_KEYS.CASH_BOOK ||
    key === STORAGE_KEYS.PURCHASE_ORDERS ||
    key === STORAGE_KEYS.DELIVERY_CHALLANS ||
    key === STORAGE_KEYS.INSTALLATIONS ||
    key === STORAGE_KEYS.JOB_COSTINGS ||
    key === STORAGE_KEYS.DESIGN_JOBS ||
    key === STORAGE_KEYS.EMPLOYEES ||
    key === STORAGE_KEYS.ATTENDANCE ||
    key === STORAGE_KEYS.SALARY_ADVANCES ||
    key === STORAGE_KEYS.DAILY_LABOR_LOGS ||
    key === STORAGE_KEYS.PAYROLL ||
    key === STORAGE_KEYS.PAYROLL_PERIODS ||
    key === STORAGE_KEYS.IN_APP_NOTIFICATIONS ||
    key === STORAGE_KEYS.COMMUNICATION_LOGS ||
    key === STORAGE_KEYS.OPERATOR_JOBS ||
    key === STORAGE_KEYS.AUDIT_LOGS ||
    key === STORAGE_KEYS.BRANCHES ||
    key === STORAGE_KEYS.PLATFORM_COMPANIES ||
    key === STORAGE_KEYS.PLATFORM_USERS ||
    key === STORAGE_KEYS.PLATFORM_INCIDENTS ||
    key === STORAGE_KEYS.USER_OVERRIDES
  )
}

const DEFAULT_DOC_TEMPLATES: Record<DocumentType, DocumentTemplateConfigRecord> = {
  quotation: {
    id: 'dt-quo',
    company_id: '',
    document_type: 'quotation',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Official Commercial Price Proposal / বাণিজ্যিক দরপত্র',
    footer_terms_en: '1. Quotation valid for 15 days from issue date.\n2. Advance required with order confirmation.\n3. Colors may vary slightly based on print media texture.',
    footer_terms_bn: '১. কোটেশনের মেয়াদ প্রদানের তারিখ হতে ১৫ দিন।\n২. অর্ডারের সাথে প্রয়োজনীয় অগ্রিম প্রদেয়।\n৩. মিডিয়া উপাদানের কারণে রঙের সামান্য তারতম্য হতে পারে।',
    authorized_signatory_title: 'Authorized Officer',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  invoice: {
    id: 'dt-inv',
    company_id: '',
    document_type: 'invoice',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Commercial Sales Invoice / বিক্রয় চালান বিল',
    footer_terms_en: '1. Payment is due as per agreed credit terms.\n2. Please make cheques or transfers in favor of the company account.',
    footer_terms_bn: '১. নির্ধারিত মেয়াদের মধ্যে বিল পরিশোধযোগ্য।\n২. কোম্পানির ব্যাংক অ্যাকাউন্টে চেক বা ব্যাংক ট্রান্সফার করুন।',
    authorized_signatory_title: 'Accounts Department',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  vat_mushak: {
    id: 'dt-vat',
    company_id: '',
    document_type: 'vat_mushak',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার, জাতীয় রাজস্ব বোর্ড — কর চালানপত্র [মূসক-৬.৩]',
    footer_terms_en: 'Goods supplied are subject to National Board of Revenue VAT regulations.',
    footer_terms_bn: 'সরবরাহকৃত পণ্য জাতীয় রাজস্ব বোর্ডের মূসক বিধিমালা অনুযায়ী করযুক্ত।',
    authorized_signatory_title: 'Authorized VAT Officer / মূসক কর্মকর্তা',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  receipt: {
    id: 'dt-rec',
    company_id: '',
    document_type: 'receipt',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Official Money Receipt / মানি রিসিট',
    footer_terms_en: 'Received with thanks. Subject to realization for cheques.',
    footer_terms_bn: 'ধন্যবাদসহ গৃহীত হলো। চেকের মাধ্যমে প্রদেয় অর্থ ব্যাংকে ক্লিয়ারিং সাপেক্ষে কার্যকর।',
    authorized_signatory_title: 'Cashier / হিসাবরক্ষণ কর্মকর্তা',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  challan: {
    id: 'dt-cha',
    company_id: '',
    document_type: 'challan',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Delivery Challan & Gate Pass / ডেলিভারি চালানপত্র',
    footer_terms_en: 'Goods received in sound physical condition and exact count.',
    footer_terms_bn: 'সঠিক গণনা ও অক্ষত অবস্থায় মালামাল বুঝে পাওয়া গেল।',
    authorized_signatory_title: 'Store & Dispatch Manager',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  purchase_order: {
    id: 'dt-po',
    company_id: '',
    document_type: 'purchase_order',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Official Purchase Order / ক্রয় আদেশ',
    footer_terms_en: 'Supply strictly in accordance with approved technical specifications.',
    footer_terms_bn: 'অনুমোদিত নমুনা ও স্পেসিফিকেশন মোতাবেক মালামাল সরবরাহ করতে হবে।',
    authorized_signatory_title: 'Procurement Manager',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
}

export function getInitialSeedData(key: StorageKey, tenantSlug?: string): any {
  if (isTransactionalKey(key)) {
    return []
  }

  switch (key) {
    case STORAGE_KEYS.ROLE_MATRICES:
      return DEFAULT_ROLE_MATRICES
    case STORAGE_KEYS.PLATFORM_PLANS:
      return DEFAULT_PLANS
    case STORAGE_KEYS.DOCUMENT_TEMPLATES:
      return DEFAULT_DOC_TEMPLATES
    case STORAGE_KEYS.TAX_SETTINGS:
      return {
        vat_enabled: true,
        default_vat_rate: 15.0,
        pricing_mode: 'exclusive',
        bin_number: '',
        tin_number: '',
        trade_license_number: '',
        vat_commissionerate: '',
        vat_circle: '',
      }
    case STORAGE_KEYS.COMPANY_PROFILE:
      return {
        name: '',
        name_bn: null,
        legal_name: null,
        phone: '',
        whatsapp: '',
        email: '',
        area: '',
        address: '',
        address_bn: null,
      }
    case STORAGE_KEYS.BRANDING_SETTINGS:
      return {
        company_name: '',
        primary_color: '#2563eb',
        secondary_color: '#0f172a',
        accent_color: '#10b981',
        logo_url: null,
        invoice_logo_url: null,
        quotation_logo_url: null,
        slogan: '',
        slogan_bn: '',
        invoice_footer: 'Thank you for choosing our print services.',
        invoice_footer_bn: 'আমাদের প্রিন্টিং সেবায় আস্থা রাখার জন্য ধন্যবাদ।',
        footer_text: 'Thank you for choosing our print services.',
        footer_text_bn: 'আমাদের সেবায় আস্থা রাখার জন্য ধন্যবাদ।',
        watermark_enabled: false,
      }
    case STORAGE_KEYS.DOCUMENT_NUMBERING:
      return {
        order_prefix: 'ORD-',
        quotation_prefix: 'QUO-',
        invoice_prefix: 'INV-',
        challan_prefix: 'CH-',
        job_prefix: 'JOB-',
        money_receipt_prefix: 'MR-',
        purchase_prefix: 'PO-',
      }
    case STORAGE_KEYS.NOTIFICATION_SETTINGS:
      return {
        whatsapp_enabled: false,
        whatsapp_number: '',
        sms_enabled: false,
        sms_gateway: '',
        sms_sender_id: '',
        sms_api_key: '',
        email_enabled: true,
        low_stock_alerts: true,
        low_stock_threshold: 50,
        email_on_order_created: true,
        sms_on_job_completed: false,
        whatsapp_on_challan_dispatched: false,
        sms_on_payment_received: false,
        daily_due_digest: true,
      }
    case STORAGE_KEYS.AUTOMATION_RULES:
      return []
    case STORAGE_KEYS.PLATFORM_SYSTEM_SETTINGS:
      return {
        platform_name: 'PrintERP Bangladesh Cloud',
        platform_tagline: 'Enterprise Operating System for Large Format, Digital & Offset Printers',
        contact_email: 'support@printerp.com.bd',
        contact_phone: '+8801711000000',
        system_version: 'v2.6.4-prod',
        environment: 'production',
        default_company_storage_gb: 10,
        default_company_users: 5,
        default_company_branches: 1,
        maintenance_mode: false,
        emergency_lockdown: false,
        allow_tenant_registration: true,
        session_timeout_minutes: 120,
        rate_limit_requests_per_minute: 120,
        audit_log_retention_days: 365,
        enable_automatic_backups: true,
        backup_frequency_hours: 6,
        notification_email_digest: true,
      }
    default:
      return []
  }
}

// In-memory cache for server-side & fallback execution
const inMemoryStore: Record<string, any> = {}

export class PrintERPDataStore {
  /**
   * Resolves the current active tenant slug from location pathname or session cookie
   */
  static getActiveTenantSlug(): string {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const match = path.match(/^\/([a-zA-Z0-9_-]+)/)
      if (match && match[1]) {
        const seg = match[1].toLowerCase()
        if (
          !['login', 'register', 'onboarding', 'platform', 'forgot-password', 'reset-password', 'api', '403'].includes(
            seg
          )
        ) {
          return seg
        }
      }

      try {
        const cookieRow = document.cookie
          .split('; ')
          .find((row) => row.startsWith('printerp_tenant_session='))
        if (cookieRow) {
          const raw = cookieRow.split('=')[1]
          const parsed = JSON.parse(decodeURIComponent(raw))
          if (parsed?.companySlug) {
            return parsed.companySlug.toLowerCase()
          }
        }
      } catch {}
    }
    return 'default'
  }

  /**
   * Resolves the effective storage key partitioned by tenant boundary
   */
  static getEffectiveKey(key: StorageKey, customTenantSlug?: string): string {
    if (isPlatformKey(key)) return key
    const slug = customTenantSlug || this.getActiveTenantSlug()
    if (!slug || slug === 'default') return key
    return `${key}__${slug}`
  }

  /**
   * Retrieves data for a given collection key with SSR-safe LocalStorage fallback
   */
  static get<T = any>(key: StorageKey, tenantSlug?: string): T {
    const effectiveKey = this.getEffectiveKey(key, tenantSlug)
    const effectiveSlug = tenantSlug || this.getActiveTenantSlug()

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(effectiveKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          inMemoryStore[effectiveKey] = parsed
          return parsed as T
        }
        // Seed default if not in localStorage
        const defaultData = inMemoryStore[effectiveKey] ?? getInitialSeedData(key, effectiveSlug)
        if (defaultData !== null && defaultData !== undefined) {
          inMemoryStore[effectiveKey] = defaultData
          try {
            localStorage.setItem(effectiveKey, JSON.stringify(defaultData))
          } catch {}
        }
        return (defaultData ?? inMemoryStore[effectiveKey]) as T
      } catch {
        return (inMemoryStore[effectiveKey] ?? getInitialSeedData(key, effectiveSlug)) as T
      }
    }
    return (inMemoryStore[effectiveKey] ?? getInitialSeedData(key, effectiveSlug)) as T
  }

  /**
   * Sets data for a collection key and emits reactive events across window & storage
   */
  static set<T = any>(key: StorageKey, data: T, emitEvent = true, tenantSlug?: string): T {
    const effectiveKey = this.getEffectiveKey(key, tenantSlug)
    inMemoryStore[effectiveKey] = data
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(effectiveKey, JSON.stringify(data))
        if (emitEvent) {
          window.dispatchEvent(
            new CustomEvent('printerp_data_sync', {
              detail: { key, effectiveKey, data, timestamp: Date.now() },
            })
          )
          window.dispatchEvent(new Event(`${key}_updated`))
          window.dispatchEvent(new Event(`${effectiveKey}_updated`))
        }
      } catch (err) {
        console.error(`[PrintERPDataStore] Error saving key ${effectiveKey}:`, err)
      }
    }
    return data
  }

  /**
   * Appends an item to an array collection or creates it if not present
   */
  static addItem<T extends { id?: string }>(key: StorageKey, item: T, tenantSlug?: string): T[] {
    const list = this.get<T[]>(key, tenantSlug)
    const array = Array.isArray(list) ? list : []
    const existsIndex = item.id ? array.findIndex((x) => x.id === item.id) : -1
    let updated: T[]
    if (existsIndex >= 0) {
      updated = [...array]
      updated[existsIndex] = { ...updated[existsIndex], ...item }
    } else {
      updated = [item, ...array]
    }
    this.set(key, updated, true, tenantSlug)
    return updated
  }

  /**
   * Updates an item in an array collection matching a predicate or ID
   */
  static updateItem<T extends { id?: string }>(
    key: StorageKey,
    idOrPredicate: string | ((item: T) => boolean),
    updates: Partial<T>,
    tenantSlug?: string
  ): T | null {
    const list = this.get<T[]>(key, tenantSlug)
    const array = Array.isArray(list) ? list : []
    const index =
      typeof idOrPredicate === 'string'
        ? array.findIndex((x) => x.id === idOrPredicate)
        : array.findIndex(idOrPredicate)

    if (index === -1) return null
    const updatedItem = { ...array[index], ...updates, updated_at: new Date().toISOString() }
    const updatedArray = [...array]
    updatedArray[index] = updatedItem
    this.set(key, updatedArray, true, tenantSlug)
    return updatedItem
  }

  /**
   * Removes an item from an array collection
   */
  static removeItem<T extends { id?: string }>(
    key: StorageKey,
    idOrPredicate: string | ((item: T) => boolean),
    tenantSlug?: string
  ): boolean {
    const list = this.get<T[]>(key, tenantSlug)
    const array = Array.isArray(list) ? list : []
    const filtered =
      typeof idOrPredicate === 'string'
        ? array.filter((x) => x.id !== idOrPredicate)
        : array.filter((x) => !idOrPredicate(x))

    if (filtered.length !== array.length) {
      this.set(key, filtered, true, tenantSlug)
      return true
    }
    return false
  }

  /**
   * Finds an item in an array collection
   */
  static findItem<T extends { id?: string }>(
    key: StorageKey,
    idOrPredicate: string | ((item: T) => boolean),
    tenantSlug?: string
  ): T | null {
    const list = this.get<T[]>(key, tenantSlug)
    const array = Array.isArray(list) ? list : []
    if (typeof idOrPredicate === 'string') {
      return array.find((x) => x.id === idOrPredicate) || null
    }
    return array.find(idOrPredicate) || null
  }

  // ============================================================================
  // SPECIALIZED CROSS-MODULE WORKFLOW HELPERS
  // ============================================================================

  /**
   * Creates a Sales Order and automatically provisions linked Production Jobs,
   * updates Customer due balance, and creates an Invoice in Billing.
   */
  static createSalesOrderWithIntegrations(orderData: Partial<SalesOrderRecord>): SalesOrderRecord {
    const orderId = orderData.id || `ord-${Date.now()}`
    const orderNum = orderData.order_number || `ORD-${Date.now().toString().slice(-6)}`
    const finalPrice = orderData.final_price || orderData.subtotal || 0
    const advancePaid = orderData.advance_amount || 0
    const dueAmount = Math.max(0, finalPrice - advancePaid)

    const newOrder: SalesOrderRecord = {
      id: orderId,
      company_id: orderData.company_id || 'default',
      order_number: orderNum,
      customer_id: orderData.customer_id || '',
      customer_name: orderData.customer_name || '',
      customer_name_bn: orderData.customer_name_bn || null,
      customer_phone: orderData.customer_phone || '',
      customer_address: orderData.customer_address || '',
      salesperson_name: orderData.salesperson_name || 'Sales Representative',
      order_date: orderData.order_date || new Date().toISOString().split('T')[0],
      delivery_date: orderData.delivery_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      priority: orderData.priority || 'normal',
      status: orderData.status || 'confirmed',
      payment_terms: orderData.payment_terms || 'advance',
      subtotal: orderData.subtotal || finalPrice,
      discount_amount: orderData.discount_amount || 0,
      vat_amount: orderData.vat_amount || 0,
      final_price: finalPrice,
      advance_amount: advancePaid,
      due_amount: dueAmount,
      notes: orderData.notes || '',
      items: orderData.items && orderData.items.length > 0 ? orderData.items : [],
      jobs_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 1. Save Sales Order
    this.addItem(STORAGE_KEYS.ORDERS, newOrder)

    // 2. Create linked Production Job Ticket if items exist
    const jobNum = `JOB-${orderNum.replace('ORD-', '')}-A`
    const newJob: JobOrderRecord = {
      id: `job-${Date.now()}`,
      company_id: newOrder.company_id,
      job_number: jobNum,
      order_id: newOrder.id,
      product_name: newOrder.items[0]?.item_name || 'Print Order Job',
      customer_name: newOrder.customer_name,
      quantity: newOrder.items[0]?.quantity || 1,
      size_spec: newOrder.items[0] ? `${newOrder.items[0].width}x${newOrder.items[0].height} ${newOrder.items[0].unit || 'sft'}` : 'Standard',
      material_spec: newOrder.items[0]?.material_spec || 'Standard Media',
      artwork_status: 'approved',
      deadline: `${newOrder.delivery_date} 18:00`,
      assigned_department: 'wide_format_print',
      assigned_employee_name: '',
      production_instructions: newOrder.notes || '',
      status: 'queued',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.addItem(STORAGE_KEYS.JOB_ORDERS, newJob)

    // 3. Create linked Production Queue Job
    const prodJob: ProductionJobRecord = {
      id: `prd-${Date.now()}`,
      company_id: newOrder.company_id,
      production_job_number: `PRD-${Date.now().toString().slice(-4)}`,
      job_order_id: newJob.id,
      sales_order_id: newOrder.id,
      customer_name: newOrder.customer_name,
      product_name: newJob.product_name,
      department: 'printing',
      stage: 'printing',
      status: 'queued',
      priority: newOrder.priority,
      deadline: newJob.deadline,
      dimensions_spec: newJob.size_spec,
      quantity: newJob.quantity,
      material_spec: newJob.material_spec,
      production_instructions: newJob.production_instructions,
      assigned_workers: [],
      has_rework: false,
      rework_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.addItem(STORAGE_KEYS.PRODUCTION_JOBS, prodJob)

    // 4. Create Linked Invoice in Billing
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`
    const newInvoice: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      company_id: newOrder.company_id,
      invoice_number: invoiceNum,
      invoice_type: 'sales_invoice',
      sales_order_id: newOrder.id,
      order_number: newOrder.order_number,
      customer_id: newOrder.customer_id || '',
      customer_name: newOrder.customer_name,
      customer_phone: newOrder.customer_phone,
      customer_address: newOrder.customer_address,
      invoice_date: newOrder.order_date,
      due_date: newOrder.delivery_date,
      status: dueAmount === 0 ? 'paid' : advancePaid > 0 ? 'partially_paid' : 'unpaid',
      subtotal: newOrder.subtotal,
      discount_amount: newOrder.discount_amount,
      vat_percentage: 0,
      vat_amount: newOrder.vat_amount,
      grand_total: newOrder.final_price,
      paid_amount: advancePaid,
      due_amount: dueAmount,
      write_off_amount: 0,
      created_by_name: newOrder.salesperson_name || 'Sales Representative',
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.addItem(STORAGE_KEYS.INVOICES, newInvoice)

    // 5. Update Customer Total Orders and Due Balance if customer exists
    if (newOrder.customer_id) {
      const existingCust = this.findItem<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, newOrder.customer_id)
      if (existingCust) {
        this.updateItem<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, existingCust.id, {
          total_orders_count: (existingCust.total_orders_count || 0) + 1,
          total_orders_amount: (existingCust.total_orders_amount || 0) + finalPrice,
          total_due_balance: (existingCust.total_due_balance || 0) + dueAmount,
        })
      }
    }

    return newOrder
  }

  /**
   * Converts a quotation to a formal Sales Order with connected workflow records.
   */
  static convertQuotationToSalesOrder(quotationId: string, options?: { advanceAmount?: number }): SalesOrderRecord | null {
    const quotations = this.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []
    const quote = quotations.find((q) => q.id === quotationId || q.quotation_number === quotationId)
    if (!quote) return null

    const orderData: Partial<SalesOrderRecord> = {
      company_id: quote.company_id,
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      customer_address: quote.customer_address,
      subtotal: quote.subtotal,
      discount_amount: quote.discount_amount,
      vat_amount: quote.vat_amount,
      final_price: quote.grand_total,
      advance_amount: options?.advanceAmount || 0,
      due_amount: Math.max(0, quote.grand_total - (options?.advanceAmount || 0)),
      notes: `Converted from Quotation ${quote.quotation_number}`,
      items: quote.items?.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        item_name: item.description || 'Custom Item',
        width: item.width || 1,
        height: item.height || 1,
        dimension_unit: (item.dimension_unit as any) || 'ft',
        quantity: item.quantity || 1,
        unit: item.unit || 'sft',
        unit_price: item.unit_rate || 0,
        total_price: item.item_total || 0,
      })) || [],
    }

    const order = this.createSalesOrderWithIntegrations(orderData)
    this.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote.id, { status: 'converted' })
    return order
  }

  /**
   * Records a payment collection against an Order / Customer / Invoice
   */
  static recordPaymentCollection(params: {
    customerId: string
    companyId?: string
    orderId?: string
    invoiceId?: string
    amount: number
    paymentMethod: string
    notes?: string
    receivedByName?: string
  }): PaymentRecord {
    const cust = this.findItem<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, params.customerId)
    const receiptNum = `MR-${Date.now().toString().slice(-6)}`
    const paymentDate = new Date().toISOString().split('T')[0]

    const payment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      company_id: params.companyId || 'default',
      receipt_number: receiptNum,
      customer_id: params.customerId,
      customer_name: cust?.name || 'Customer',
      payment_date: paymentDate,
      payment_type: 'partial_payment',
      payment_method: params.paymentMethod as any,
      amount: params.amount,
      notes: params.notes || `Payment collection of ৳ ${params.amount}`,
      received_by_name: params.receivedByName || 'Cashier',
      created_at: new Date().toISOString(),
    }
    this.addItem(STORAGE_KEYS.PAYMENTS, payment)

    // Update Customer Due
    if (cust) {
      const newDue = Math.max(0, (cust.total_due_balance || 0) - params.amount)
      this.updateItem<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, cust.id, {
        total_due_balance: newDue,
      })
    }

    // Update Order if specified
    if (params.orderId) {
      const ord = this.findItem<SalesOrderRecord>(STORAGE_KEYS.ORDERS, params.orderId)
      if (ord) {
        const newAdv = (ord.advance_amount || 0) + params.amount
        const newDue = Math.max(0, ord.final_price - newAdv)
        this.updateItem<SalesOrderRecord>(STORAGE_KEYS.ORDERS, ord.id, {
          advance_amount: newAdv,
          due_amount: newDue,
        })
      }
    }

    // Update Invoice if specified
    if (params.invoiceId) {
      const inv = this.findItem<InvoiceRecord>(STORAGE_KEYS.INVOICES, params.invoiceId)
      if (inv) {
        const newPaid = (inv.paid_amount || 0) + params.amount
        const newDue = Math.max(0, inv.grand_total - newPaid)
        this.updateItem<InvoiceRecord>(STORAGE_KEYS.INVOICES, inv.id, {
          paid_amount: newPaid,
          due_amount: newDue,
          status: newDue === 0 ? 'paid' : 'partially_paid',
        })
      }
    }

    // Record Cash Book Inflow
    const cashEntry: CashBookEntryRecord = {
      id: `cb-${Date.now()}`,
      company_id: params.companyId || 'default',
      entry_date: paymentDate,
      entry_type: 'cash_in',
      category: 'Due Collection',
      amount: params.amount,
      description: `Payment collected from ${cust?.name || 'Customer'}. Receipt: ${receiptNum}`,
      reference_id: receiptNum,
      performed_by_name: params.receivedByName || 'Cashier',
      created_at: new Date().toISOString(),
    }
    this.addItem(STORAGE_KEYS.CASH_BOOK, cashEntry)

    return payment
  }

  /**
   * Generates next sequential document number with atomic increment and prefix formatting
   */
  static getNextDocumentNumber(
    companyId: string,
    type: 'order' | 'quotation' | 'invoice' | 'challan' | 'job' | 'receipt' | 'purchase'
  ): string {
    const numberingConfig = this.get<any>(STORAGE_KEYS.DOCUMENT_NUMBERING) || {
      order_prefix: 'ORD-',
      quotation_prefix: 'QUO-',
      invoice_prefix: 'INV-',
      challan_prefix: 'CH-',
      job_prefix: 'JOB-',
      money_receipt_prefix: 'MR-',
      purchase_prefix: 'PO-',
    }

    const currentYear = new Date().getFullYear()

    let prefix = 'DOC-'
    const sequenceKey = `seq_${type}`
    switch (type) {
      case 'order':
        prefix = numberingConfig.order_prefix || 'ORD-'
        break
      case 'quotation':
        prefix = numberingConfig.quotation_prefix || 'QUO-'
        break
      case 'invoice':
        prefix = numberingConfig.invoice_prefix || 'INV-'
        break
      case 'challan':
        prefix = numberingConfig.challan_prefix || 'CH-'
        break
      case 'job':
        prefix = numberingConfig.job_prefix || 'JOB-'
        break
      case 'receipt':
        prefix = numberingConfig.money_receipt_prefix || 'MR-'
        break
      case 'purchase':
        prefix = numberingConfig.purchase_prefix || 'PO-'
        break
    }

    let currentSeq = numberingConfig[sequenceKey]
    if (typeof currentSeq !== 'number') {
      let existingCount = 0
      switch (type) {
        case 'order':
          existingCount = (this.get<any[]>(STORAGE_KEYS.ORDERS) || []).length
          break
        case 'quotation':
          existingCount = (this.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).length
          break
        case 'invoice':
          existingCount = (this.get<any[]>(STORAGE_KEYS.INVOICES) || []).length
          break
        case 'challan':
          existingCount = (this.get<any[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []).length
          break
        case 'job':
          existingCount = (this.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []).length
          break
        case 'receipt':
          existingCount = (this.get<any[]>(STORAGE_KEYS.PAYMENTS) || []).length
          break
        case 'purchase':
          existingCount = (this.get<any[]>(STORAGE_KEYS.PURCHASE_ORDERS) || []).length
          break
      }
      currentSeq = existingCount
    }

    currentSeq += 1
    numberingConfig[sequenceKey] = currentSeq
    this.set(STORAGE_KEYS.DOCUMENT_NUMBERING, numberingConfig)

    const paddedNum = String(currentSeq).padStart(6, '0')
    return `${prefix}${currentYear}-${paddedNum}`
  }
}

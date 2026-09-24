import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getNavigationConfig, type NavItem } from '../../config/navigation.config.ts'
import { resolveTenantRole, mapSessionToTenantRole } from '../../lib/auth/types.ts'
import {
  getPermissionDetail,
  normalizeModuleKey,
  checkPermission,
} from '../../lib/auth/rbac.client.ts'
import type { UserPermissionContext, PrimaryRole, PermissionAction } from '../../types/rbac.types.ts'

describe('Employee Role & Permission-Based User Panel Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. ROLE RESOLUTION & SAFETY TESTS
  // ---------------------------------------------------------------------------
  describe('1. Role Resolution & Fallback Safety', () => {
    it('accurately resolves operator and technician variants without owner fallback', () => {
      assert.equal(resolveTenantRole('operator'), 'machine_operator')
      assert.equal(resolveTenantRole('machine_operator'), 'machine_operator')
      assert.equal(resolveTenantRole('technician'), 'machine_operator')
      assert.equal(resolveTenantRole(null, ['operator']), 'machine_operator')
    })

    it('accurately resolves designer variants without owner fallback', () => {
      assert.equal(resolveTenantRole('designer'), 'graphic_designer')
      assert.equal(resolveTenantRole('graphic_designer'), 'graphic_designer')
      assert.equal(resolveTenantRole(null, ['designer']), 'graphic_designer')
    })

    it('accurately resolves sales variants without owner fallback', () => {
      assert.equal(resolveTenantRole('sales'), 'sales_manager')
      assert.equal(resolveTenantRole('sales_manager'), 'sales_manager')
      assert.equal(resolveTenantRole('sales_executive'), 'sales_manager')
      assert.equal(resolveTenantRole('manager'), 'sales_manager')
    })

    it('accurately resolves accountant and finance staff', () => {
      assert.equal(resolveTenantRole('accountant'), 'accountant')
      assert.equal(resolveTenantRole('accounts'), 'accountant')
      assert.equal(resolveTenantRole('billing'), 'accountant')
    })

    it('accurately resolves delivery and installer staff', () => {
      assert.equal(resolveTenantRole('delivery'), 'delivery_coordinator')
      assert.equal(resolveTenantRole('delivery_coordinator'), 'delivery_coordinator')
      assert.equal(resolveTenantRole('installer'), 'delivery_coordinator')
    })

    it('general staff or unmapped string defaults to general_staff, NEVER business_owner', () => {
      assert.equal(resolveTenantRole('general_staff'), 'general_staff')
      assert.equal(resolveTenantRole('staff'), 'general_staff')
      assert.equal(resolveTenantRole('unknown_worker'), 'general_staff')
      assert.equal(resolveTenantRole(null, []), 'general_staff')
      assert.equal(resolveTenantRole(undefined, undefined), 'general_staff')
    })

    it('business owner is assigned ONLY when isOwner flag is true or role is explicitly owner', () => {
      assert.equal(resolveTenantRole('business_owner'), 'business_owner')
      assert.equal(resolveTenantRole('owner'), 'business_owner')
      assert.equal(resolveTenantRole('platform_owner'), 'business_owner')
      assert.equal(resolveTenantRole('operator', ['operator'], true), 'business_owner')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. CLIENT SESSION TO TENANT ROLE MAPPING TESTS
  // ---------------------------------------------------------------------------
  describe('2. Client Session Role Mapping (use-tenant)', () => {
    it('maps machine_operator session to operator TenantRole', () => {
      const session: any = { role: 'machine_operator', primaryRole: 'operator', responsibilities: ['operator'] }
      assert.equal(mapSessionToTenantRole(session), 'operator')
    })

    it('maps graphic_designer session to designer TenantRole', () => {
      const session: any = { role: 'graphic_designer', primaryRole: 'designer', responsibilities: ['designer'] }
      assert.equal(mapSessionToTenantRole(session), 'designer')
    })

    it('maps sales_manager session to manager TenantRole', () => {
      const session: any = { role: 'sales_manager', primaryRole: 'sales_manager', responsibilities: ['sales_manager'] }
      assert.equal(mapSessionToTenantRole(session), 'manager')
    })

    it('maps accountant session to accountant TenantRole', () => {
      const session: any = { role: 'accountant', primaryRole: 'general_staff', responsibilities: ['accountant'] }
      assert.equal(mapSessionToTenantRole(session), 'accountant')
    })

    it('maps delivery_coordinator session to installer TenantRole', () => {
      const session: any = { role: 'delivery_coordinator', primaryRole: 'general_staff', responsibilities: ['delivery_coordinator'] }
      assert.equal(mapSessionToTenantRole(session), 'installer')
    })

    it('maps business_owner session to owner TenantRole', () => {
      const session: any = { role: 'business_owner', primaryRole: 'business_owner', responsibilities: ['business_owner'] }
      assert.equal(mapSessionToTenantRole(session), 'owner')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. EMPLOYEE PERMISSION EVALUATION (OPERATOR, DESIGNER, ACCOUNTANT, OWNER)
  // ---------------------------------------------------------------------------
  describe('3. Role Permission Context Evaluation', () => {
    // Helper to evaluate permission
    const canUser = (ctx: UserPermissionContext, action: PermissionAction, module: string): boolean => {
      const modKey = normalizeModuleKey(module)
      const detail = getPermissionDetail(ctx, modKey, action)
      return detail.isGranted
    }

    it('machine operator has access to production & machinery, but restricted from commercial & management', () => {
      const operatorCtx: UserPermissionContext = {
        userId: 'usr-op-01',
        primaryRole: 'operator',
        role: 'operator',
        responsibilities: ['operator'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }

      // Allowed operational actions
      assert.equal(canUser(operatorCtx, 'view', 'production'), true, 'Operator can view production')
      assert.equal(canUser(operatorCtx, 'edit', 'production'), true, 'Operator can edit production tasks')
      assert.equal(canUser(operatorCtx, 'complete', 'production'), true, 'Operator can complete production tasks')
      assert.equal(canUser(operatorCtx, 'view', 'orders'), true, 'Operator can view job orders')
      assert.equal(canUser(operatorCtx, 'view', 'machineries'), true, 'Operator can view machinery list')
      assert.equal(canUser(operatorCtx, 'view', 'inventory'), true, 'Operator can view inventory')

      // Blocked commercial & sensitive actions
      assert.equal(canUser(operatorCtx, 'create', 'orders'), false, 'Operator CANNOT create new work/orders')
      assert.equal(canUser(operatorCtx, 'view', 'quotations'), false, 'Operator CANNOT view quotations')
      assert.equal(canUser(operatorCtx, 'view', 'invoices'), false, 'Operator CANNOT view billing/invoices')
      assert.equal(canUser(operatorCtx, 'create', 'invoices'), false, 'Operator CANNOT create invoices')
      assert.equal(canUser(operatorCtx, 'view', 'customers'), false, 'Operator CANNOT view customer list')
      assert.equal(canUser(operatorCtx, 'view', 'hr'), false, 'Operator CANNOT view HR/payroll')
      assert.equal(canUser(operatorCtx, 'view', 'settings'), false, 'Operator CANNOT view company settings')
      assert.equal(canUser(operatorCtx, 'view', 'reports'), false, 'Operator CANNOT view profit/loss reports')
    })

    it('graphic designer has access to design & job flow, but restricted from financial ledgers & admin', () => {
      const designerCtx: UserPermissionContext = {
        userId: 'usr-des-01',
        primaryRole: 'designer',
        role: 'designer',
        responsibilities: ['designer'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }

      // Allowed design & prepress actions
      assert.equal(canUser(designerCtx, 'view', 'design'), true, 'Designer can view design queue')
      assert.equal(canUser(designerCtx, 'create', 'design'), true, 'Designer can upload designs')
      assert.equal(canUser(designerCtx, 'edit', 'design'), true, 'Designer can modify designs')
      assert.equal(canUser(designerCtx, 'approve', 'design'), true, 'Designer can approve proofs')
      assert.equal(canUser(designerCtx, 'view', 'orders'), true, 'Designer can view orders')
      assert.equal(canUser(designerCtx, 'create', 'orders'), true, 'Designer can initiate prepress work order')

      // View-only invoice access for specs, but no billing creation or payments
      assert.equal(canUser(designerCtx, 'view', 'invoices'), true, 'Designer can view invoice specs')
      assert.equal(canUser(designerCtx, 'create', 'invoices'), false, 'Designer CANNOT create invoices')
      assert.equal(canUser(designerCtx, 'view', 'payments'), false, 'Designer CANNOT view payment transactions')
      assert.equal(canUser(designerCtx, 'view', 'hr'), false, 'Designer CANNOT view HR/payroll')
      assert.equal(canUser(designerCtx, 'view', 'settings'), false, 'Designer CANNOT view company settings')
    })

    it('sales manager has commercial order creation and customer management, but restricted from HR and system settings', () => {
      const salesCtx: UserPermissionContext = {
        userId: 'usr-sales-01',
        primaryRole: 'sales_manager',
        role: 'sales_manager',
        responsibilities: ['sales_manager'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }

      assert.equal(canUser(salesCtx, 'create', 'orders'), true, 'Sales can create new orders')
      assert.equal(canUser(salesCtx, 'view', 'quotations'), true, 'Sales can view quotations')
      assert.equal(canUser(salesCtx, 'create', 'quotations'), true, 'Sales can create quotations')
      assert.equal(canUser(salesCtx, 'view', 'customers'), true, 'Sales can view customers')
      assert.equal(canUser(salesCtx, 'create', 'customers'), true, 'Sales can register customers')
      assert.equal(canUser(salesCtx, 'view', 'invoices'), true, 'Sales can view invoices')
      assert.equal(canUser(salesCtx, 'view', 'hr'), false, 'Sales CANNOT view HR/staff salaries')
    })

    it('accountant has invoice and payment ledger management, but restricted from machinery and production floor', () => {
      const accountantCtx: UserPermissionContext = {
        userId: 'usr-acc-01',
        primaryRole: 'general_staff',
        role: 'general_staff',
        responsibilities: ['accountant'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }

      assert.equal(canUser(accountantCtx, 'view', 'invoices'), true, 'Accountant can view invoices')
      assert.equal(canUser(accountantCtx, 'create', 'invoices'), true, 'Accountant can issue invoices')
      assert.equal(canUser(accountantCtx, 'view', 'payments'), true, 'Accountant can view payments')
      assert.equal(canUser(accountantCtx, 'create', 'payments'), true, 'Accountant can record payments')
      assert.equal(canUser(accountantCtx, 'view', 'hr'), true, 'Accountant can view payroll and workforce')
      assert.equal(canUser(accountantCtx, 'view', 'reports'), true, 'Accountant can view financial reports')
      assert.equal(canUser(accountantCtx, 'view', 'production'), false, 'Accountant CANNOT view production floor jobs')
      assert.equal(canUser(accountantCtx, 'view', 'settings'), false, 'Accountant CANNOT edit company system settings')
    })

    it('business owner has unrestricted full organizational access across all modules', () => {
      const ownerCtx: UserPermissionContext = {
        userId: 'usr-owner-01',
        primaryRole: 'business_owner',
        role: 'business_owner',
        responsibilities: ['business_owner'],
        overrides: {},
        data_scopes: {},
        isOwner: true,
      }

      assert.equal(canUser(ownerCtx, 'create', 'orders'), true)
      assert.equal(canUser(ownerCtx, 'view', 'invoices'), true)
      assert.equal(canUser(ownerCtx, 'view', 'production'), true)
      assert.equal(canUser(ownerCtx, 'view', 'hr'), true)
      assert.equal(canUser(ownerCtx, 'view', 'settings'), true)
      assert.equal(canUser(ownerCtx, 'view', 'reports'), true)
      assert.equal(canUser(ownerCtx, 'view', 'machineries'), true)
    })
  })

  // ---------------------------------------------------------------------------
  // 4. NAVIGATION CONFIGURATION & ROLE FILTERING TESTS
  // ---------------------------------------------------------------------------
  describe('4. Navigation Filtering per Employee Role', () => {
    const navSections = getNavigationConfig('demo-tenant')

    const filterNavForUser = (userCtx: UserPermissionContext): string[] => {
      const allowedItemKeys: string[] = []

      for (const section of navSections) {
        for (const item of section.items) {
          if (userCtx.isOwner) {
            allowedItemKeys.push(item.key)
            continue
          }
          if (item.ownerOnly) continue
          if (!item.permission) {
            allowedItemKeys.push(item.key)
            continue
          }
          const modKey = normalizeModuleKey(item.permission.resource)
          const detail = getPermissionDetail(userCtx, modKey, item.permission.action)
          if (detail.isGranted) {
            allowedItemKeys.push(item.key)
          }
        }
      }
      return allowedItemKeys
    }

    it('filters sidebar navigation for Operator strictly to production floor & orders', () => {
      const operatorCtx: UserPermissionContext = {
        userId: 'usr-op-01',
        primaryRole: 'operator',
        role: 'operator',
        responsibilities: ['operator'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }

      const allowedKeys = filterNavForUser(operatorCtx)

      // Verified visible items
      assert.ok(allowedKeys.includes('dashboard'), 'Operator sees dashboard')
      assert.ok(allowedKeys.includes('orders'), 'Operator sees orders')
      assert.ok(allowedKeys.includes('production'), 'Operator sees printing floor')
      assert.ok(allowedKeys.includes('operator'), 'Operator sees terminal')
      assert.ok(allowedKeys.includes('machineries'), 'Operator sees machineries')

      // Verified strictly hidden items
      assert.ok(!allowedKeys.includes('new-work'), 'Operator must NOT see New Work POS button')
      assert.ok(!allowedKeys.includes('quotations'), 'Operator must NOT see Quotations')
      assert.ok(!allowedKeys.includes('billing'), 'Operator must NOT see Billing & Collections')
      assert.ok(!allowedKeys.includes('customers'), 'Operator must NOT see Customers')
      assert.ok(!allowedKeys.includes('accounting'), 'Operator must NOT see Finance & Accounts')
      assert.ok(!allowedKeys.includes('hr'), 'Operator must NOT see Workforce & HRM')
      assert.ok(!allowedKeys.includes('reports'), 'Operator must NOT see Business Reports')
      assert.ok(!allowedKeys.includes('company_settings'), 'Operator must NOT see Company Settings')
    })

    it('filters sidebar navigation for Graphic Designer strictly to design & prepress work', () => {
      const designerCtx: UserPermissionContext = {
        userId: 'usr-des-01',
        primaryRole: 'designer',
        role: 'designer',
        responsibilities: ['designer'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }

      const allowedKeys = filterNavForUser(designerCtx)

      assert.ok(allowedKeys.includes('new-work'), 'Designer can create new work orders')
      assert.ok(allowedKeys.includes('dashboard'), 'Designer sees dashboard')
      assert.ok(allowedKeys.includes('orders'), 'Designer sees orders')
      assert.ok(allowedKeys.includes('design'), 'Designer sees Design Panel')

      // Hidden items
      assert.ok(!allowedKeys.includes('accounting'), 'Designer must NOT see Finance & Accounts')
      assert.ok(!allowedKeys.includes('hr'), 'Designer must NOT see Workforce & HRM')
      assert.ok(!allowedKeys.includes('reports'), 'Designer must NOT see Business Reports')
      assert.ok(!allowedKeys.includes('company_settings'), 'Designer must NOT see Company Settings')
    })

    it('filters sidebar navigation for Accountant strictly to billing, finance, and workforce', () => {
      const accountantCtx: UserPermissionContext = {
        userId: 'usr-acc-01',
        primaryRole: 'general_staff',
        role: 'general_staff',
        responsibilities: ['accountant'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }

      const allowedKeys = filterNavForUser(accountantCtx)

      assert.ok(allowedKeys.includes('dashboard'), 'Accountant sees dashboard')
      assert.ok(allowedKeys.includes('billing'), 'Accountant sees billing & collections')
      assert.ok(allowedKeys.includes('accounting'), 'Accountant sees finance & accounts')
      assert.ok(allowedKeys.includes('hr'), 'Accountant sees Workforce & HRM')
      assert.ok(allowedKeys.includes('reports'), 'Accountant sees Business Reports')

      // Hidden items
      assert.ok(!allowedKeys.includes('new-work'), 'Accountant must NOT see New Work POS button')
      assert.ok(!allowedKeys.includes('production'), 'Accountant must NOT see Printing Floor')
      assert.ok(!allowedKeys.includes('operator'), 'Accountant must NOT see Shop Floor Terminal')
      assert.ok(!allowedKeys.includes('design'), 'Accountant must NOT see Design Panel')
      assert.ok(!allowedKeys.includes('company_settings'), 'Accountant must NOT see Company Settings')
    })

    it('Business Owner sees every single navigation item', () => {
      const ownerCtx: UserPermissionContext = {
        userId: 'usr-own-01',
        primaryRole: 'business_owner',
        role: 'business_owner',
        responsibilities: ['business_owner'],
        overrides: {},
        data_scopes: {},
        isOwner: true,
      }

      const allowedKeys = filterNavForUser(ownerCtx)
      const allItemKeys: string[] = []
      for (const section of navSections) {
        for (const item of section.items) {
          allItemKeys.push(item.key)
        }
      }

      assert.equal(allowedKeys.length, allItemKeys.length, 'Owner must have access to all navigation items')
    })
  })

  // ---------------------------------------------------------------------------
  // 5. USER MENU AND ADMINISTRATIVE SETTINGS SECURITY RULES
  // ---------------------------------------------------------------------------
  describe('5. User Menu Security & Settings Isolation', () => {
    const isCompanySettingsAllowed = (userCtx: UserPermissionContext): boolean => {
      if (userCtx.isOwner) return true
      const detail = getPermissionDetail(userCtx, 'settings', 'view')
      return detail.isGranted
    }

    const isSubscriptionAllowed = (userCtx: UserPermissionContext): boolean => {
      return Boolean(userCtx.isOwner)
    }

    it('restricts Subscription & Plan menu strictly to Business Owner', () => {
      const operatorCtx: UserPermissionContext = {
        userId: 'usr-01',
        primaryRole: 'operator',
        role: 'operator',
        responsibilities: ['operator'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }
      const designerCtx: UserPermissionContext = {
        userId: 'usr-02',
        primaryRole: 'designer',
        role: 'designer',
        responsibilities: ['designer'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }
      const ownerCtx: UserPermissionContext = {
        userId: 'usr-03',
        primaryRole: 'business_owner',
        role: 'business_owner',
        responsibilities: ['business_owner'],
        overrides: {},
        data_scopes: {},
        isOwner: true,
      }

      assert.equal(isSubscriptionAllowed(operatorCtx), false, 'Operator cannot see subscription')
      assert.equal(isSubscriptionAllowed(designerCtx), false, 'Designer cannot see subscription')
      assert.equal(isSubscriptionAllowed(ownerCtx), true, 'Owner can see subscription')
    })

    it('restricts Company Settings menu from unauthorized staff', () => {
      const operatorCtx: UserPermissionContext = {
        userId: 'usr-01',
        primaryRole: 'operator',
        role: 'operator',
        responsibilities: ['operator'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }
      const accountantCtx: UserPermissionContext = {
        userId: 'usr-02',
        primaryRole: 'general_staff',
        role: 'general_staff',
        responsibilities: ['accountant'],
        overrides: {},
        data_scopes: {},
        isOwner: false,
      }
      const ownerCtx: UserPermissionContext = {
        userId: 'usr-03',
        primaryRole: 'business_owner',
        role: 'business_owner',
        responsibilities: ['business_owner'],
        overrides: {},
        data_scopes: {},
        isOwner: true,
      }

      assert.equal(isCompanySettingsAllowed(operatorCtx), false, 'Operator cannot see company settings')
      assert.equal(isCompanySettingsAllowed(accountantCtx), false, 'Accountant cannot see company settings')
      assert.equal(isCompanySettingsAllowed(ownerCtx), true, 'Owner can see company settings')
    })
  })
})

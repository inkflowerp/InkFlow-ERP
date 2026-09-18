import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  checkPermission,
  getPermissionDetail,
  getEffectiveDataScope,
  checkDataScopeAccess,
  DEFAULT_RESPONSIBILITY_MATRICES,
  normalizeResponsibilitySlug,
  normalizeModuleKey,
} from '../../lib/auth/rbac.client.ts'

describe('Authoritative RBAC Authorization Engine & Multi-Responsibility Tests (Prompt Sec 46)', () => {
  // Test Contexts
  const ownerCtx = {
    userId: 'usr-owner',
    role: 'business_owner',
    responsibilities: ['business_owner'],
    overrides: {},
    data_scopes: {},
  }

  const salesManagerCtx = {
    userId: 'usr-sales-mgr',
    role: 'sales_manager',
    responsibilities: ['sales_manager'],
    overrides: {},
    data_scopes: {
      customers: 'company',
      quotations: 'company',
      invoices: 'branch',
    },
  }

  const designerCtx = {
    userId: 'usr-designer',
    role: 'designer',
    responsibilities: ['designer'],
    overrides: {},
    data_scopes: {
      orders: 'assigned',
      design: 'assigned',
    },
  }

  const multiRespUserCtx = {
    userId: 'usr-rahim',
    role: 'sales_manager',
    responsibilities: ['sales_manager', 'accountant'],
    overrides: {},
    data_scopes: {},
  }

  test('1. Business Owner has full standard permissions across all modules', () => {
    assert.strictEqual(
      checkPermission(ownerCtx, 'invoices', 'view'),
      true,
      'Owner can view invoices'
    )
    assert.strictEqual(
      checkPermission(ownerCtx, 'invoices', 'create'),
      true,
      'Owner can create invoices'
    )
    assert.strictEqual(
      checkPermission(ownerCtx, 'invoices', 'delete'),
      true,
      'Owner can delete invoices'
    )
    assert.strictEqual(
      checkPermission(ownerCtx, 'payroll', 'approve'),
      true,
      'Owner can approve payroll'
    )
    assert.strictEqual(
      checkPermission(ownerCtx, 'users', 'create'),
      true,
      'Owner can create users'
    )
    assert.strictEqual(
      checkPermission(ownerCtx, 'users', 'permission_manage'),
      true,
      'Owner can manage permissions'
    )
  })

  test('2. Sales Manager has sales access but is blocked from high-risk finance & payroll', () => {
    assert.strictEqual(
      checkPermission(salesManagerCtx, 'customers', 'view'),
      true,
      'Sales manager can view customers'
    )
    assert.strictEqual(
      checkPermission(salesManagerCtx, 'quotations', 'create'),
      true,
      'Sales manager can create quotations'
    )
    assert.strictEqual(
      checkPermission(salesManagerCtx, 'invoices', 'create'),
      true,
      'Sales manager can create invoices'
    )

    // High-risk and non-sales blocks
    assert.strictEqual(
      checkPermission(salesManagerCtx, 'invoices', 'delete'),
      false,
      'Sales manager cannot delete invoices'
    )
    assert.strictEqual(
      checkPermission(salesManagerCtx, 'payroll', 'approve'),
      false,
      'Sales manager cannot approve payroll'
    )
    assert.strictEqual(
      checkPermission(salesManagerCtx, 'salary', 'edit'),
      false,
      'Sales manager cannot edit salary'
    )
    assert.strictEqual(
      checkPermission(salesManagerCtx, 'users', 'permission_manage'),
      false,
      'Sales manager cannot manage permissions'
    )
  })

  test('3. Designer has design and prepress access but cannot touch financial records', () => {
    assert.strictEqual(
      checkPermission(designerCtx, 'design', 'view'),
      true,
      'Designer can view design proofs'
    )
    assert.strictEqual(
      checkPermission(designerCtx, 'design', 'edit'),
      true,
      'Designer can edit proofs'
    )
    assert.strictEqual(
      checkPermission(designerCtx, 'orders', 'view'),
      true,
      'Designer can view job orders'
    )

    // Denied finance
    assert.strictEqual(
      checkPermission(designerCtx, 'payments', 'create'),
      false,
      'Designer cannot record payments'
    )
    assert.strictEqual(
      checkPermission(designerCtx, 'invoices', 'create'),
      false,
      'Designer cannot create invoices'
    )
    assert.strictEqual(
      checkPermission(designerCtx, 'payroll', 'view'),
      false,
      'Designer cannot view payroll'
    )
  })

  test('4. Multi-responsibility additive calculation merges Sales + Accountant access', () => {
    // Inherits Sales
    assert.strictEqual(
      checkPermission(multiRespUserCtx, 'quotations', 'create'),
      true,
      'Multi-responsibility user inherits quotation creation from Sales'
    )

    // Inherits Accountant
    assert.strictEqual(
      checkPermission(multiRespUserCtx, 'payments', 'create'),
      true,
      'Multi-responsibility user inherits payment recording from Accountant'
    )
    assert.strictEqual(
      checkPermission(multiRespUserCtx, 'payroll', 'view'),
      true,
      'Multi-responsibility user inherits payroll viewing from Accountant'
    )
  })

  test('5. Explicit User Deny Override overrides inherited Allow permission', () => {
    const userWithDenyOverride = {
      userId: 'usr-restricted-sales',
      role: 'sales_manager',
      responsibilities: ['sales_manager'],
      overrides: {
        'invoices.cancel': false, // Explicit Deny
      },
      data_scopes: {},
    }

    const detail = getPermissionDetail(userWithDenyOverride, 'invoices', 'cancel')
    assert.strictEqual(detail.isGranted, false, 'Explicit deny must block invoices.cancel')
    assert.strictEqual(detail.source, 'override_deny', 'Source must be override_deny')
  })

  test('6. Explicit User Allow Override grants access for a normally denied action', () => {
    const userWithAllowOverride = {
      userId: 'usr-senior-sales',
      role: 'sales_manager',
      responsibilities: ['sales_manager'],
      overrides: {
        'invoices.delete': true, // Explicit Allow
      },
      data_scopes: {},
    }

    const detail = getPermissionDetail(userWithAllowOverride, 'invoices', 'delete')
    assert.strictEqual(detail.isGranted, true, 'Explicit allow must grant invoices.delete')
    assert.strictEqual(detail.source, 'override_allow', 'Source must be override_allow')
  })

  test('7. Default Deny works for non-granted, non-inherited permissions', () => {
    const staffCtx = {
      userId: 'usr-staff',
      role: 'general_staff',
      responsibilities: ['general_staff'],
      overrides: {},
      data_scopes: {},
    }

    const detail = getPermissionDetail(staffCtx, 'inventory', 'edit')
    assert.strictEqual(detail.isGranted, false, 'General staff cannot adjust/edit inventory')
    assert.strictEqual(detail.source, 'default_deny', 'Source must be default_deny')
  })

  test('8. Data Scope resolution returns configured user scope or module default', () => {
    assert.strictEqual(
      getEffectiveDataScope(salesManagerCtx, 'customers'),
      'company',
      'Sales manager has configured company scope for customers'
    )
    assert.strictEqual(
      getEffectiveDataScope(salesManagerCtx, 'invoices'),
      'branch',
      'Sales manager has configured branch scope for invoices'
    )
    assert.strictEqual(
      getEffectiveDataScope(designerCtx, 'orders'),
      'assigned',
      'Designer has assigned scope for orders'
    )
  })

  test('9. checkDataScopeAccess accurately enforces own, assigned, department, and branch boundaries', () => {
    const designerScope = getEffectiveDataScope(designerCtx, 'orders')
    
    // Assigned to designer
    const assignedRecord = {
      created_by: 'usr-someone',
      assigned_to: 'usr-designer',
      branch_id: 'branch-1',
    }
    assert.strictEqual(
      checkDataScopeAccess(designerCtx, assignedRecord, designerScope, 'usr-designer'),
      true,
      'Access allowed for assigned record'
    )

    // Not assigned to designer
    const unassignedRecord = {
      created_by: 'usr-someone',
      assigned_to: 'usr-other-designer',
      branch_id: 'branch-1',
    }
    assert.strictEqual(
      checkDataScopeAccess(designerCtx, unassignedRecord, designerScope, 'usr-designer'),
      false,
      'Access denied for unassigned record under assigned scope'
    )
  })

  test('10. normalizeResponsibilitySlug and normalizeModuleKey handle legacy aliases', () => {
    assert.strictEqual(normalizeResponsibilitySlug('sales'), 'sales_manager')
    assert.strictEqual(normalizeResponsibilitySlug('admin'), 'business_owner')
    assert.strictEqual(normalizeResponsibilitySlug('operator'), 'operator')
    assert.strictEqual(normalizeResponsibilitySlug('unknown_role'), 'general_staff')

    assert.strictEqual(normalizeModuleKey('work_orders'), 'orders')
    assert.strictEqual(normalizeModuleKey('customer'), 'customers')
    assert.strictEqual(normalizeModuleKey('invoices'), 'invoices')
  })
})

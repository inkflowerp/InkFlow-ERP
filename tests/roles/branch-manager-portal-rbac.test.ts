import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeResponsibilitySlug,
  normalizePortalRole,
  DEFAULT_RESPONSIBILITY_MATRICES,
  getEffectiveDataScope,
  checkDataScopeAccess,
} from '../../lib/auth/rbac.client.ts'
import { mapSessionToTenantRole } from '../../lib/auth/types.ts'

describe('Branch / Outlet Manager Account, Portal, Roles, Permissions and Restrictions', () => {
  describe('1. Role & Designation Normalization Engine', () => {
    test('1.1 normalizePortalRole resolves branch manager variations to canonical "branch_manager"', () => {
      const branchVariations = [
        'branch_manager',
        'BRANCH_MANAGER',
        'Branch Manager',
        'Branch In-Charge',
        'Branch Incharge',
        'Outlet Manager',
        'outlet_manager',
        'Showroom Manager',
        'Showroom In-Charge',
        'Outlet Incharge',
        'Dhanmondi Branch Manager',
        'Chittagong Outlet In-Charge',
      ]

      for (const title of branchVariations) {
        const canonical = normalizePortalRole(title)
        assert.equal(
          canonical,
          'branch_manager',
          `Expected "${title}" to normalize to "branch_manager", but got "${canonical}"`
        )
      }
    })

    test('1.2 normalizeResponsibilitySlug maps branch leadership titles to "branch_manager"', () => {
      assert.equal(normalizeResponsibilitySlug('Branch Manager'), 'branch_manager')
      assert.equal(normalizeResponsibilitySlug('Outlet Manager'), 'branch_manager')
      assert.equal(normalizeResponsibilitySlug('Showroom Incharge'), 'branch_manager')
      assert.equal(normalizeResponsibilitySlug('BRANCH_IN_CHARGE'), 'branch_manager')
    })

    test('1.3 mapSessionToTenantRole normalizes branch manager roles from session user data', () => {
      assert.equal(mapSessionToTenantRole('Branch Manager'), 'branch_manager')
      assert.equal(mapSessionToTenantRole('branch_manager'), 'branch_manager')
      assert.equal(mapSessionToTenantRole('Outlet Manager'), 'branch_manager')
      assert.equal(mapSessionToTenantRole('Showroom In-Charge'), 'branch_manager')
    })
  })

  describe('2. Branch Manager Permissions Matrix & Operational Capabilities', () => {
    const branchMatrix = DEFAULT_RESPONSIBILITY_MATRICES.branch_manager

    test('2.1 Branch Manager has full counter sales & order processing capabilities', () => {
      assert.ok(branchMatrix.orders, 'Orders matrix must be defined for branch manager')
      assert.equal(branchMatrix.orders.view, true)
      assert.equal(branchMatrix.orders.create, true)
      assert.equal(branchMatrix.orders.edit, true)
      assert.equal(branchMatrix.orders.assign, true)
      assert.equal(branchMatrix.orders.complete, true)
      assert.equal(branchMatrix.orders.print, true)
    })

    test('2.2 Branch Manager has quotation and estimate management access', () => {
      assert.ok(branchMatrix.quotations, 'Quotations matrix must be defined for branch manager')
      assert.equal(branchMatrix.quotations.view, true)
      assert.equal(branchMatrix.quotations.create, true)
      assert.equal(branchMatrix.quotations.edit, true)
      assert.equal(branchMatrix.quotations.print, true)
      assert.equal(branchMatrix.quotations.send, true)
    })

    test('2.3 Branch Manager can invoice and collect payments at branch counter', () => {
      assert.ok(branchMatrix.invoices, 'Invoices matrix must be defined')
      assert.equal(branchMatrix.invoices.view, true)
      assert.equal(branchMatrix.invoices.create, true)
      assert.equal(branchMatrix.invoices.edit, true)
      assert.equal(branchMatrix.invoices.print, true)
      assert.equal(branchMatrix.invoices.download, true)
      assert.equal(branchMatrix.invoices.send, true)

      assert.ok(branchMatrix.payments, 'Payments matrix must be defined')
      assert.equal(branchMatrix.payments.view, true)
      assert.equal(branchMatrix.payments.create, true)
      assert.equal(branchMatrix.payments.edit, true)
      assert.equal(branchMatrix.payments.print, true)
    })

    test('2.4 Branch Manager has local delivery and branch fulfillment tracking', () => {
      assert.ok(branchMatrix.delivery, 'Delivery matrix must be defined')
      assert.equal(branchMatrix.delivery.view, true)
      assert.equal(branchMatrix.delivery.create, true)
      assert.equal(branchMatrix.delivery.edit, true)
      assert.equal(branchMatrix.delivery.assign, true)
      assert.equal(branchMatrix.delivery.complete, true)
      assert.equal(branchMatrix.delivery.print, true)
    })

    test('2.5 Branch Manager can manage branch customers and CRM records', () => {
      assert.ok(branchMatrix.customers, 'Customers matrix must be defined')
      assert.equal(branchMatrix.customers.view, true)
      assert.equal(branchMatrix.customers.create, true)
      assert.equal(branchMatrix.customers.edit, true)
      assert.equal(branchMatrix.customers.export, true)
    })

    test('2.6 Branch Manager can record local stock usage and track machinery on site', () => {
      assert.ok(branchMatrix.inventory, 'Inventory matrix must be defined')
      assert.equal(branchMatrix.inventory.view, true)
      assert.equal(branchMatrix.inventory.create, true)
      assert.equal(branchMatrix.inventory.edit, true)

      assert.ok(branchMatrix.machineries, 'Machineries matrix must be defined')
      assert.equal(branchMatrix.machineries.view, true)
    })

    test('2.7 Branch Manager has attendance and shift logging for branch staff', () => {
      assert.ok(branchMatrix.hr, 'HR matrix must be defined')
      assert.equal(branchMatrix.hr.view, true)
      assert.equal(branchMatrix.hr.create, true)
      assert.equal(branchMatrix.hr.edit, true)
    })
  })

  describe('3. Strict Governance Restrictions & Limitations', () => {
    const branchMatrix = DEFAULT_RESPONSIBILITY_MATRICES.branch_manager

    test('3.1 Branch Manager is strictly restricted from global company settings', () => {
      assert.deepEqual(branchMatrix.settings, {}, 'Settings must be empty object for branch manager')
    })

    test('3.2 Branch Manager cannot void, cancel or delete finalized invoices', () => {
      assert.equal(
        (branchMatrix.invoices as any).cancel,
        undefined,
        'Branch manager must not have invoice cancellation permission'
      )
      assert.equal(
        (branchMatrix.invoices as any).delete,
        undefined,
        'Branch manager must not have invoice deletion permission'
      )
    })

    test('3.3 Branch Manager cannot delete payment transactions', () => {
      assert.equal(
        (branchMatrix.payments as any).delete,
        undefined,
        'Branch manager must not have payment deletion permission'
      )
    })

    test('3.4 Branch Manager cannot manage, create, or delete tenant users', () => {
      assert.equal(
        (branchMatrix.users as any).create,
        undefined,
        'Branch manager must not create platform users'
      )
      assert.equal(
        (branchMatrix.users as any).delete,
        undefined,
        'Branch manager must not delete platform users'
      )
      assert.equal(
        (branchMatrix.users as any).manage,
        undefined,
        'Branch manager must not manage platform users'
      )
    })
  })

  describe('4. Data Scoping & Multi-Branch Isolation Enforcement', () => {
    test('4.1 getEffectiveDataScope returns "branch" for branch_manager', () => {
      const scopeByRole = getEffectiveDataScope(
        { primaryRole: 'branch_manager' },
        'orders'
      )
      assert.equal(scopeByRole, 'branch', 'Effective data scope for branch_manager must be "branch"')

      const scopeByResp = getEffectiveDataScope(
        { responsibilities: ['branch_manager'] },
        'invoices'
      )
      assert.equal(scopeByResp, 'branch', 'Effective data scope from responsibilities must be "branch"')
    })

    test('4.2 checkDataScopeAccess allows access to records belonging to user branch', () => {
      const allowed = checkDataScopeAccess(
        'branch',
        {
          userId: 'usr_mgr_1',
          userBranchId: 'branch_dhanmondi',
          recordBranchId: 'branch_dhanmondi',
        }
      )
      assert.equal(allowed, true, 'Branch manager must be allowed to access records in their own branch')
    })

    test('4.3 checkDataScopeAccess strictly DENIES access to records of other branches (Multi-tenant branch isolation)', () => {
      const denied = checkDataScopeAccess(
        'branch',
        {
          userId: 'usr_mgr_1',
          userBranchId: 'branch_dhanmondi',
          recordBranchId: 'branch_chittagong',
        }
      )
      assert.equal(
        denied,
        false,
        'Branch manager must be strictly denied access to another branch records'
      )
    })
  })
})

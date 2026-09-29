import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeResponsibilitySlug,
  normalizePortalRole,
  DEFAULT_RESPONSIBILITY_MATRICES,
} from '../../lib/auth/rbac.client.ts'
import { mapSessionToTenantRole } from '../../lib/auth/types.ts'

describe('Graphic Designer Account, Portal, Roles and Permissions', () => {
  describe('1. Role & Designation Normalization Engine', () => {
    test('1.1 normalizePortalRole correctly resolves all graphic designer variations to canonical "designer"', () => {
      const designVariations = [
        'designer',
        'DESIGNER',
        'Graphic Designer',
        'graphic_designer',
        'Senior Graphic Designer & Prepress',
        'Junior Graphic Designer',
        'Prepress Specialist',
        'Pre-Press Operator',
        'Lead Prepress Artist',
        'Artwork Designer',
        'Graphics & Packaging Designer',
        'Computer Graphics Operator',
      ]

      for (const title of designVariations) {
        const canonical = normalizePortalRole(title)
        assert.equal(
          canonical,
          'designer',
          `Expected "${title}" to normalize to "designer", but got "${canonical}"`
        )
      }
    })

    test('1.2 normalizeResponsibilitySlug maps design titles to "designer"', () => {
      assert.equal(normalizeResponsibilitySlug('Senior Graphic Designer & Prepress'), 'designer')
      assert.equal(normalizeResponsibilitySlug('Prepress Specialist'), 'designer')
      assert.equal(normalizeResponsibilitySlug('Artwork Designer'), 'designer')
      assert.equal(normalizeResponsibilitySlug('GRAPHIC_DESIGNER'), 'designer')
    })

    test('1.3 mapSessionToTenantRole normalizes designer roles from session user data', () => {
      assert.equal(mapSessionToTenantRole('Senior Graphic Designer & Prepress'), 'designer')
      assert.equal(mapSessionToTenantRole('Prepress Artist'), 'designer')
      assert.equal(mapSessionToTenantRole('graphic_designer'), 'designer')
      assert.equal(mapSessionToTenantRole('artwork'), 'designer')
    })

    test('1.4 normalizePortalRole maps roles accurately to portal dropdown options', () => {
      assert.equal(normalizePortalRole('Operator'), 'operator')
      assert.equal(normalizePortalRole('Machine Operator'), 'operator')
      assert.equal(normalizePortalRole('Accountant'), 'accounts')
      assert.equal(normalizePortalRole('Sales Manager'), 'sales')
      assert.equal(normalizePortalRole('Production Manager'), 'manager')
    })
  })

  describe('2. Designer Permissions Matrix & Capabilities', () => {
    const designerMatrix = DEFAULT_RESPONSIBILITY_MATRICES.designer

    test('2.1 Designer has full capability on design & artwork studio', () => {
      assert.ok(designerMatrix.design, 'Design matrix must be defined for designer')
      assert.equal(designerMatrix.design.view, true)
      assert.equal(designerMatrix.design.create, true)
      assert.equal(designerMatrix.design.edit, true)
      assert.equal(designerMatrix.design.download, true)
      assert.equal(designerMatrix.design.approve, true)
      assert.equal(designerMatrix.design.manage, true)
    })

    test('2.2 Designer has read & workflow access on commercial orders', () => {
      assert.ok(designerMatrix.orders, 'Orders matrix must be defined for designer')
      assert.equal(designerMatrix.orders.view, true)
      assert.equal(designerMatrix.orders.create, true)
      assert.equal(designerMatrix.orders.edit, true)
      assert.equal(designerMatrix.orders.print, true)
    })

    test('2.3 Designer can view customer references, products, and equipment for prepress specs', () => {
      assert.equal(designerMatrix.customers?.view, true)
      assert.equal(designerMatrix.products?.view, true)
      assert.equal(designerMatrix.pricing?.view, true)
      assert.equal(designerMatrix.machineries?.view, true)
      assert.equal(designerMatrix.tasks?.view, true)
      assert.equal(designerMatrix.tasks?.create, true)
      assert.equal(designerMatrix.tasks?.edit, true)
    })

    test('2.4 Designer is strictly restricted from billing, payroll, accounting, and system settings', () => {
      assert.deepEqual(designerMatrix.invoices, {}, 'Designer must have zero permissions on invoices')
      assert.equal(designerMatrix.accounting, undefined, 'Designer must have no access to accounting')
      assert.equal(designerMatrix.payroll, undefined, 'Designer must have no access to payroll')
      assert.deepEqual(designerMatrix.settings, {}, 'Designer must have zero permissions on settings')
      assert.equal(designerMatrix.company_users, undefined, 'Designer must not manage users')
    })
  })
})

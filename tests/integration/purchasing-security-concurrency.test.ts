import { test, describe } from 'node:test'
import assert from 'node:assert'
import { SupplierService } from '../../services/supplier.service.ts'
import { PurchaseService } from '../../services/purchase.service.ts'
import { InventoryService } from '../../services/inventory.service.ts'

describe('V5 Security & Concurrency: Tenant Isolation, Over-Receipt Guard & Supplier Returns', () => {
  const tenantAlpha = 'tenant-alpha-procurement'
  const tenantBeta = 'tenant-beta-procurement'

  test('enforces strict multi-tenant isolation across Suppliers, Item Mappings & Purchase Orders', async () => {
    // 1. Tenant Alpha creates supplier and PO
    const suppAlpha = await SupplierService.createSupplier({
      company_id: tenantAlpha,
      supplier_name: 'Alpha Vinyl Importers',
      mobile: '+8801711111111',
      category: 'vinyl',
    })

    const poAlpha = await PurchaseService.createPurchaseOrder({
      company_id: tenantAlpha,
      supplier_id: suppAlpha.id,
      supplier_name: suppAlpha.supplier_name,
      supplier_phone: suppAlpha.mobile,
      items: [
        {
          id: 'item-a1',
          material_id: 'mat-vnl-01',
          material_name: 'Reflective Vinyl 3M',
          quantity_ordered: 100,
          quantity_received: 0,
          quantity_remaining: 100,
          unit: 'rft',
          unit_cost: 120,
          total_cost: 12000,
        },
      ],
    })

    // 2. Tenant Beta creates supplier
    const suppBeta = await SupplierService.createSupplier({
      company_id: tenantBeta,
      supplier_name: 'Beta Acrylic House',
      mobile: '+8801822222222',
      category: 'acrylic',
    })

    // 3. Verify Tenant Beta cannot see Tenant Alpha's suppliers or POs
    const suppliersBeta = await SupplierService.getSuppliers(tenantBeta)
    assert.strictEqual(suppliersBeta.some((s) => s.id === suppAlpha.id), false)
    assert.strictEqual(suppliersBeta.some((s) => s.id === suppBeta.id), true)

    const posBeta = await PurchaseService.getPurchaseOrders(tenantBeta)
    assert.strictEqual(posBeta.some((p) => p.id === poAlpha.id), false)

    const poAlphaLookedByBeta = await PurchaseService.getPurchaseOrderById(poAlpha.id, tenantBeta)
    assert.strictEqual(poAlphaLookedByBeta, null)
  })

  test('strictly rejects over-receiving attempts exceeding remaining ordered PO quantity', async () => {
    const companyId = 'tenant-over-receive-test'

    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      supplier_id: 'sup-or-01',
      supplier_name: 'Reliable Ink Supplies',
      supplier_phone: '+8801933333333',
      status: 'approved',
      items: [
        {
          id: 'po-item-ink-01',
          material_id: 'mat-ink-cmyk',
          material_name: 'Konica Minolta Eco-Solvent Ink 1L',
          quantity_ordered: 10,
          quantity_received: 0,
          quantity_remaining: 10,
          unit: 'liter',
          unit_cost: 3500,
          total_cost: 35000,
        },
      ],
    })

    // Try to receive 15 units when only 10 were ordered
    await assert.rejects(
      async () => {
        await PurchaseService.receiveGoods({
          company_id: companyId,
          purchase_order_id: po.id,
          received_by_name: 'Store Incharge',
          items_received: [
            {
              po_item_id: po.items[0].id,
              material_id: 'mat-ink-cmyk',
              material_name: 'Konica Minolta Eco-Solvent Ink 1L',
              current_received: 15,
              accepted_quantity: 15,
              unit: 'liter',
              unit_cost: 3500,
            },
          ],
        })
      },
      (err: any) => {
        assert.match(err.message, /Over-receiving rejected/i)
        return true
      }
    )

    // Verify PO state remains unaffected
    const unchangedPO = await PurchaseService.getPurchaseOrderById(po.id, companyId)
    assert.strictEqual(unchangedPO?.items[0].quantity_received, 0)
    assert.strictEqual(unchangedPO?.items[0].quantity_remaining, 10)
  })

  test('executes Supplier Return with traceable V3 physical inventory reversal', async () => {
    const companyId = 'tenant-return-test'

    // 1. Setup Material with initial physical stock of 100
    const material = await InventoryService.createMaterial({
      company_id: companyId,
      sku: 'MAT-LED-MODULE-01',
      name: 'Samsung 3-LED Module 1.2W White',
      category: 'led',
      unit: 'piece',
      current_stock: 100,
    })

    // 2. Receive additional 50 units
    const supplier = await SupplierService.createSupplier({
      company_id: companyId,
      supplier_name: 'ElectroSign Components Ltd',
      mobile: '+8801544444444',
      category: 'led',
    })

    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      supplier_id: supplier.id,
      supplier_name: supplier.supplier_name,
      supplier_phone: supplier.mobile,
      status: 'approved',
      items: [
        {
          id: 'po-item-led-01',
          material_id: material.id,
          material_name: material.name,
          quantity_ordered: 50,
          quantity_received: 0,
          quantity_remaining: 50,
          unit: 'pcs',
          unit_cost: 25,
          total_cost: 1250,
        },
      ],
    })

    const receipt = await PurchaseService.receiveGoods({
      company_id: companyId,
      purchase_order_id: po.id,
      received_by_name: 'Storekeeper',
      items_received: [
        {
          po_item_id: po.items[0].id,
          material_id: material.id,
          material_name: material.name,
          current_received: 50,
          accepted_quantity: 50,
          unit: 'pcs',
          unit_cost: 25,
        },
      ],
    })
    assert.ok(receipt.grn.id)

    // Stock should now be 100 + 50 = 150
    const matAfterReceipt = await InventoryService.getMaterialById(material.id, companyId)
    assert.strictEqual(matAfterReceipt?.current_stock, 150)

    // 3. Process Supplier Return of 15 defective units
    const supplierReturn = await PurchaseService.createSupplierReturn({
      company_id: companyId,
      supplier_id: supplier.id,
      supplier_name: supplier.supplier_name,
      grn_id: receipt.grn.id,
      purchase_order_id: po.id,
      reason: 'Flickering LED chips on QA test bench',
      created_by_name: 'QA Inspector',
      items: [
        {
          material_id: material.id,
          material_name: material.name,
          return_quantity: 15,
          unit: 'pcs',
          unit_cost: 25,
          reason: 'Flickering LED chips',
        },
      ],
    })
    assert.ok(supplierReturn.id)
    assert.strictEqual(supplierReturn.total_return_amount, 375) // 15 * 25

    // Stock should be deducted from 150 to 135
    const matAfterReturn = await InventoryService.getMaterialById(material.id, companyId)
    assert.strictEqual(matAfterReturn?.current_stock, 135)
  })
})

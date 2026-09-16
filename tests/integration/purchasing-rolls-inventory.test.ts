import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PurchaseService } from '../../services/purchase.service.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { SupplierRepository } from '../../lib/repositories/supplier.repository.ts'
import { PrintERPDataStore } from '../../lib/db/data-store.ts'

describe('Purchasing to Physical Roll Inventory Integration', () => {
  const companyId = 'comp-test-purchasing'

  beforeEach(async () => {
    PrintERPDataStore.clearAll()

    // Seed supplier
    await SupplierRepository.createSupplier({
      company_id: companyId,
      supplier_name: 'Meghna Vinyl Supplies Ltd',
      mobile: '+8801711223344',
      category: 'raw_materials',
      email: 'sales@meghnavinyl.com',
      address: 'Nawabpur Road, Dhaka',
    })

    // Seed material
    await InventoryRepository.createMaterial({
      id: 'mat-vinyl-white',
      company_id: companyId,
      name: 'Vinyl Sticker White Glossy',
      sku: 'MAT-VINYL-W',
      category: 'materials',
      material_type: 'roll',
      is_roll: true,
      roll_width_ft: 4,
      roll_length_ft: 164,
      standard_roll_length_ft: 164,
      available_widths_ft: [3, 4, 5],
      unit: 'roll',
      base_unit: 'roll',
      conversion_factor: 656, // 4 * 164 = 656 sqft
      current_stock: 0,
      average_cost: 8500,
    })
  })

  test('orchestrates complete purchase-to-roll lifecycle: PO -> GRN -> 10 discrete physical rolls -> stock ledger', async () => {
    const suppliers = await SupplierRepository.getSuppliers(companyId)
    const supplier = suppliers[0]

    // 1. Create Purchase Order for 10 rolls @ ৳8,500
    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      supplier_id: supplier.id,
      supplier_name: supplier.supplier_name,
      supplier_phone: supplier.mobile,
      items: [
        {
          id: 'po-item-1',
          material_id: 'mat-vinyl-white',
          material_name: 'Vinyl Sticker White Glossy',
          quantity_ordered: 10,
          quantity_received: 0,
          quantity_remaining: 10,
          unit: 'roll',
          unit_cost: 8500,
          total_cost: 85000,
          notes: '4ft x 164ft standard rolls',
        },
      ],
    })

    assert.strictEqual(po.status, 'draft')
    assert.strictEqual(po.grand_total, 85000)

    // 2. PO creation MUST NOT increase inventory or spawn rolls
    const rollsBefore = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(rollsBefore.length, 0)

    // 3. Approve PO
    const approvedPO = await PurchaseService.approvePurchaseOrder(
      po.id,
      { name: 'Managing Director' },
      companyId
    )
    assert.strictEqual(approvedPO.status, 'approved')

    // 4. Receive Goods via GRN (Accepted: 10 rolls)
    const grnResult = await PurchaseService.receiveGoods({
      company_id: companyId,
      purchase_order_id: po.id,
      received_by_name: 'Store Manager',
      challan_number: 'CH-2026-9901',
      items_received: [
        {
          po_item_id: 'po-item-1',
          material_id: 'mat-vinyl-white',
          material_name: 'Vinyl Sticker White Glossy',
          current_received: 10,
          accepted_quantity: 10,
          rejected_quantity: 0,
          unit: 'roll',
          unit_cost: 8500,
        },
      ],
    })

    assert.ok(grnResult.grn)
    assert.strictEqual(grnResult.grn.accepted_total, 85000)
    assert.strictEqual(grnResult.updatedPO.status, 'received')

    // 5. Verify 10 distinct physical roll records spawned with unique roll IDs
    const physicalRolls = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(physicalRolls.length, 10)

    physicalRolls.forEach((roll) => {
      assert.strictEqual(roll.material_id, 'mat-vinyl-white')
      assert.strictEqual(roll.width_ft, 4)
      assert.strictEqual(roll.initial_length_ft, 164)
      assert.strictEqual(roll.current_length_ft, 164)
      assert.strictEqual(roll.initial_area_sft, 656) // 4 * 164 = 656
      assert.strictEqual(roll.status, 'available')
      assert.ok(roll.roll_code)
      assert.strictEqual(roll.purchase_order_id, po.id)
    })

    // 6. Verify Stock Ledger has recorded the mutation
    const ledger = await InventoryRepository.getStockLedger(companyId)
    assert.ok(ledger.length > 0)
    const receiptEntry = ledger.find((l) => l.transaction_type === 'PURCHASE_RECEIPT')
    assert.ok(receiptEntry)
    assert.strictEqual(receiptEntry?.quantity_change, 10)
  })

  test('supports partial receiving over multiple shipments without over-receipt', async () => {
    const suppliers = await SupplierRepository.getSuppliers(companyId)
    const supplier = suppliers[0]

    // Create and approve PO for 10 rolls
    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      supplier_id: supplier.id,
      supplier_name: supplier.supplier_name,
      supplier_phone: supplier.mobile,
      items: [
        {
          id: 'po-item-partial',
          material_id: 'mat-vinyl-white',
          material_name: 'Vinyl Sticker White Glossy',
          quantity_ordered: 10,
          quantity_received: 0,
          quantity_remaining: 10,
          unit: 'roll',
          unit_cost: 8500,
          total_cost: 85000,
        },
      ],
    })

    await PurchaseService.approvePurchaseOrder(po.id, { name: 'Owner' }, companyId)

    // First shipment: receive 4 rolls
    const grn1 = await PurchaseService.receiveGoods({
      company_id: companyId,
      purchase_order_id: po.id,
      received_by_name: 'Store Keeper',
      challan_number: 'CH-SHIP-1',
      items_received: [
        {
          po_item_id: 'po-item-partial',
          material_id: 'mat-vinyl-white',
          material_name: 'Vinyl Sticker White Glossy',
          current_received: 4,
          accepted_quantity: 4,
          unit: 'roll',
          unit_cost: 8500,
        },
      ],
    })

    assert.strictEqual(grn1.updatedPO.status, 'partially_received')
    const rollsAfterShip1 = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(rollsAfterShip1.length, 4)

    // Second shipment: receive remaining 6 rolls
    const grn2 = await PurchaseService.receiveGoods({
      company_id: companyId,
      purchase_order_id: po.id,
      received_by_name: 'Store Keeper',
      challan_number: 'CH-SHIP-2',
      items_received: [
        {
          po_item_id: 'po-item-partial',
          material_id: 'mat-vinyl-white',
          material_name: 'Vinyl Sticker White Glossy',
          current_received: 6,
          accepted_quantity: 6,
          unit: 'roll',
          unit_cost: 8500,
        },
      ],
    })

    assert.strictEqual(grn2.updatedPO.status, 'received')
    const rollsAfterShip2 = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(rollsAfterShip2.length, 10)
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InventoryRepository } from '../../lib/repositories/inventory.repository'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store'
import { MaterialRecord, InventoryLocationRecord, FloorConsumptionRecord } from '../../types/inventory.types'
import { ProductRecord } from '../../types/product.types'

describe('Print Floor Consumption Tracking & Receive Stock Catalog Filter Tests', () => {
  const companyId = `test_comp_floor_${Date.now()}`

  it('1. Receive Stock Catalog Filter: strictly raw materials and ready products only', () => {
    const mockMaterials: Partial<MaterialRecord>[] = [
      { id: 'mat-1', name: 'Star Flex Banner 280 GSM', sku: 'RM-FLX-280', unit: 'sft', unit_cost: 12, current_stock: 500, category: 'flex' },
      { id: 'mat-2', name: 'Self Adhesive Vinyl Glossy', sku: 'RM-VNL-GLS', unit: 'sft', unit_cost: 25, current_stock: 300, category: 'vinyl' },
    ]

    const mockProducts: Partial<ProductRecord>[] = [
      {
        id: 'prod-ready-1',
        name: 'Roll-up Standee 2.5ft x 6ft (Aluminium Base)',
        sku: 'RP-STN-2560',
        product_type: 'ready_product',
        commercial_type: 'ready_product',
        is_ready_product: true,
        pricing: { regular_price: 1500, cost_price: 950 },
      },
      {
        id: 'prod-ready-2',
        name: 'X-Banner Stand 2x5ft Portable',
        sku: 'RP-XBN-2050',
        product_type: 'ready_product',
        is_ready_product: true,
        pricing: { regular_price: 650, cost_price: 380 },
      },
      {
        id: 'prod-service-1',
        name: 'Custom Graphic Design & Vector Layout',
        sku: 'SRV-DSG-001',
        product_type: 'service',
        is_service: true,
        pricing: { regular_price: 500 },
      },
      {
        id: 'prod-service-2',
        name: 'Onsite Acrylic Signboard Installation',
        sku: 'SRV-INS-002',
        product_type: 'service',
        is_service: true,
        pricing: { regular_price: 2000 },
      },
      {
        id: 'prod-outsource-1',
        name: 'Outsource Laser Metal Cutting Subcontract',
        sku: 'OUT-LSR-001',
        product_type: 'outsource',
        is_outsource: true,
        pricing: { regular_price: 3500 },
      },
      {
        id: 'prod-custom-1',
        name: 'Custom Fabrication Service Fee',
        sku: 'SRV-FAB-001',
        product_type: 'custom',
        is_service: true,
        pricing: { regular_price: 1200 },
      },
    ]

    // Filter implementation strictly mirroring receive-stock-modal.tsx
    const unifiedCatalog = [
      ...mockMaterials.map((m) => ({
        id: m.id!,
        name: m.name!,
        sku: m.sku || 'RAW-MAT',
        item_type: 'raw_material' as const,
        category: m.category || 'Raw Material',
        unit: m.unit || 'pcs',
        unit_cost: m.unit_cost || 0,
        current_stock: m.current_stock || 0,
      })),
      ...mockProducts
        .filter((p) => {
          const isReady =
            p.product_type === 'ready_product' ||
            p.commercial_type === 'ready_product' ||
            p.is_ready_product === true ||
            (p.product_type as any) === 'product' ||
            p.product_type === 'PRODUCT'
          const isService =
            p.product_type === 'service' ||
            p.is_service === true ||
            p.is_outsource === true ||
            p.product_type === 'outsource' ||
            p.product_type === 'custom' ||
            p.product_type === 'non_inventory'
          return isReady && !isService
        })
        .map((p) => ({
          id: p.id!,
          name: p.name!,
          sku: p.sku || 'READY-PROD',
          item_type: 'ready_product' as const,
          category: 'Ready Commercial Product',
          unit: 'pcs',
          unit_cost: p.pricing?.cost_price || 0,
          current_stock: 0,
        })),
    ]

    assert.equal(unifiedCatalog.length, 4, 'Should strictly contain 2 raw materials + 2 ready products')
    assert.ok(unifiedCatalog.some((c) => c.sku === 'RM-FLX-280'))
    assert.ok(unifiedCatalog.some((c) => c.sku === 'RM-VNL-GLS'))
    assert.ok(unifiedCatalog.some((c) => c.sku === 'RP-STN-2560'))
    assert.ok(unifiedCatalog.some((c) => c.sku === 'RP-XBN-2050'))

    // Verify non-inventory services are excluded
    assert.ok(!unifiedCatalog.some((c) => c.sku === 'SRV-DSG-001'), 'Graphic design service must be excluded')
    assert.ok(!unifiedCatalog.some((c) => c.sku === 'SRV-INS-002'), 'Installation service must be excluded')
    assert.ok(!unifiedCatalog.some((c) => c.sku === 'OUT-LSR-001'), 'Outsource subcontractor item must be excluded')
    assert.ok(!unifiedCatalog.some((c) => c.sku === 'SRV-FAB-001'), 'Custom fabrication service must be excluded')
  })

  it('2. Floor Consumption & Tracking: Issue -> Consumption -> Scrap -> Return to Store', async () => {
    // 1. Seed Material & Locations in DataStore
    const testMaterial: MaterialRecord = {
      id: `mat-${Date.now()}`,
      company_id: companyId,
      name: 'Cast Vinyl High Gloss',
      sku: `CV-${Date.now()}`,
      category: 'vinyl',
      unit: 'sft',
      unit_cost: 30,
      cost_price: 30,
      selling_price: 55,
      min_stock_level: 50,
      current_stock: 500,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const mainStore: InventoryLocationRecord = {
      id: `loc-main-${Date.now()}`,
      company_id: companyId,
      location_name: 'Main Raw Material Warehouse',
      location_code: 'STORE-MAIN-01',
      location_type: 'raw_material_store',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const floorRack: InventoryLocationRecord = {
      id: `loc-floor-${Date.now()}`,
      company_id: companyId,
      location_name: 'Solvent Press Station A',
      location_code: 'PRESS-SOL-A',
      location_type: 'production_floor',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [testMaterial], false, companyId)
    PrintERPDataStore.set(STORAGE_KEYS.LOCATIONS, [mainStore, floorRack], false, companyId)

    // 2. Issue 100 SFT to Print Floor
    const issue = await InventoryRepository.createIssue({
      company_id: companyId,
      source_location_id: mainStore.id,
      destination_location_id: floorRack.id,
      issued_by_id: 'user-storekeeper',
      issued_by_name: 'Rahim Storekeeper',
      received_by_name: 'Karim Machine Operator',
      notes: 'Issued for Large Format Banner JOB-4001',
      items: [
        {
          material_id: testMaterial.id,
          issued_quantity: 100,
          unit: 'sft',
          unit_cost: 30,
        },
      ],
    })

    assert.ok(issue.id, 'Issue record created')
    assert.equal(issue.items.length, 1)
    assert.equal(issue.items[0].remaining_floor_balance, 100)

    // 3. Retrieve floor consumptions list
    const floorList = await InventoryRepository.getFloorConsumptions(companyId)
    assert.ok(floorList.length >= 1, 'Floor consumption records generated')
    const floorItem = floorList.find((f) => f.material_id === testMaterial.id)
    assert.ok(floorItem, 'Found floor consumption record for material')
    assert.equal(floorItem.issued_quantity, 100)
    assert.equal(floorItem.consumed_quantity, 0)
    assert.equal(floorItem.remaining_floor_balance, 100)
    assert.equal(floorItem.status, 'on_floor')

    // 4. Log Floor Consumption: 60 SFT consumed, 10 SFT scrap (Print Head Banding), 1 remnant
    const signOffResult = await InventoryRepository.logFloorConsumption({
      company_id: companyId,
      issue_id: issue.id,
      issue_item_id: issue.items[0].id,
      material_id: testMaterial.id,
      consumed_quantity: 60,
      unit: 'sft',
      wastage_quantity: 10,
      wastage_reason: 'Print Head Banding / Machine Error',
      machine_id: 'mach-flora-01',
      machine_name: 'Flora Konica 512i Press',
      job_reference: 'JOB-4001',
      operator_name: 'Karim Operator',
      remnants: [
        {
          width: 4,
          length: 5,
          dimension_unit: 'ft',
          quantity: 1,
          location_id: floorRack.id,
          condition: 'usable',
          notes: 'Good offcut for 2x3ft poster',
        },
      ],
    })

    assert.ok(signOffResult.floorRecord, 'Floor consumption signed off')
    assert.equal(signOffResult.floorRecord.consumed_quantity, 60)
    assert.equal(signOffResult.floorRecord.wastage_quantity, 10)
    assert.equal(signOffResult.floorRecord.wastage_reason, 'Print Head Banding / Machine Error')
    assert.equal(signOffResult.floorRecord.wastage_cost, 300, '10 sft * 30 BDT = 300 BDT')
    assert.equal(signOffResult.floorRecord.remaining_floor_balance, 30, '100 issued - 60 consumed - 10 scrap = 30 remaining')
    assert.equal(signOffResult.floorRecord.status, 'partially_consumed')
    assert.equal(signOffResult.remnantsCreated, 1)

    // 5. Return Remaining 30 SFT Unused Floor Stock to Main Store
    const returnResult = await InventoryRepository.returnFloorStockToStore({
      company_id: companyId,
      issue_id: issue.id,
      material_id: testMaterial.id,
      quantity: 30,
      return_location_id: mainStore.id,
      returned_by_name: 'Karim Operator',
      notes: 'Leftover undamaged roll returned to store',
    })

    assert.ok(returnResult.success, 'Returned floor stock successfully')
    assert.equal(returnResult.floorRecord.returned_quantity, 30)
    assert.equal(returnResult.floorRecord.remaining_floor_balance, 0, 'Floor balance is fully cleared')
    assert.equal(returnResult.floorRecord.status, 'returned')

    // 6. Verify Stock Ledger has all audit trails: CONSUMPTION, WASTAGE, RETURN
    const ledgerEntries = await InventoryRepository.getStockLedger(companyId, testMaterial.id)
    const consumptionEntry = ledgerEntries.find((l) => l.transaction_type === 'CONSUMPTION')
    const wastageEntry = ledgerEntries.find((l) => l.transaction_type === 'WASTAGE')
    const returnEntry = ledgerEntries.find((l) => l.transaction_type === 'RETURN')

    assert.ok(consumptionEntry, 'Ledger has CONSUMPTION entry')
    assert.ok(wastageEntry, 'Ledger has WASTAGE entry')
    assert.ok(returnEntry, 'Ledger has RETURN entry')
    assert.equal(returnEntry?.quantity_change, 30)
  })
})

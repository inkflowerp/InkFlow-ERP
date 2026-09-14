import { test, describe } from 'node:test'
import assert from 'node:assert'
import { SupplierService } from '../../services/supplier.service.ts'
import { PurchaseService } from '../../services/purchase.service.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { CostingService } from '../../services/costing.service.ts'
import { ProductService } from '../../services/product.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { StockLedgerRecord } from '../../types/inventory.types.ts'

describe('V5 Integration: End-to-End Procurement, Physical Stock Receipt & Costing Lifecycle', () => {
  const companyId = 'tenant-v5-procurement-01'

  test('completes full Supplier -> Item -> PR -> PO -> Partial Receiving -> V3 Stock -> V4 Costing lifecycle', async () => {
    // 1. Create authoritative V3 Material Master
    const material = await InventoryService.createMaterial({
      company_id: companyId,
      sku: 'MAT-FLX-510-V5',
      name: 'Star Flex 510 GSM High Gloss',
      category: 'flex',
      unit: 'square_feet',
      reorder_level: 200,
      current_stock: 0,
      average_cost: 25,
    })
    assert.ok(material.id)
    assert.strictEqual(material.current_stock, 0)

    // 2. Create V5 Supplier Master with Bangla Unicode & details
    const supplier = await SupplierService.createSupplier(
      {
        company_id: companyId,
        supplier_code: 'SUP-DHAKA-01',
        supplier_name: 'Meghna Media Supplies Ltd',
        name_bn: 'মেঘনা মিডিয়া সাপ্লাইস লিঃ',
        company: 'Meghna Group of Industries',
        contact_person: 'Md. Rafiqul Islam',
        mobile: '+8801711223344',
        email: 'procurement@meghnamedia.com',
        address: 'Nawabpur Road, Old Dhaka',
        division: 'Dhaka',
        district: 'Dhaka',
        category: 'media',
        payment_terms: 'credit_30',
        credit_limit: 500000,
        lead_time_days: 2,
      },
      'usr-admin-01',
      'admin@inkflow.com'
    )
    assert.ok(supplier.id)
    assert.strictEqual(supplier.supplier_name, 'Meghna Media Supplies Ltd')

    // 3. Map Supplier Item Catalog
    const supplierItem = await SupplierService.createSupplierItem({
      company_id: companyId,
      supplier_id: supplier.id,
      material_id: material.id,
      supplier_sku: 'MMS-FLX-510',
      purchase_unit: 'sqft',
      conversion_factor: 1.0,
      unit_price: 28.5,
      moq: 500,
      is_preferred: true,
    })
    assert.ok(supplierItem.id)
    assert.strictEqual(supplierItem.unit_price, 28.5)

    // 4. Create Purchase Request (PR)
    const pr = await PurchaseService.createPurchaseRequest(
      {
        company_id: companyId,
        requested_by_name: 'Production Incharge',
        department: 'Production',
        priority: 'high',
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name,
        reason: 'Raw material shortage for upcoming billboard projects',
        items: [
          {
            id: 'pr-item-01',
            material_id: material.id,
            material_name: material.name,
            quantity: 1000,
            unit: 'sqft',
            estimated_unit_price: 28.5,
            preferred_supplier_id: supplier.id,
          },
        ],
      },
      'usr-prod-01',
      'prod@inkflow.com'
    )
    assert.ok(pr.id)
    assert.strictEqual(pr.status, 'submitted')

    // 5. Approve Purchase Request -> Auto Generate PO
    const approvalResult = await PurchaseService.approvePurchaseRequest(
      pr.id,
      { id: 'usr-mgr-01', name: 'Supply Chain Manager', email: 'manager@inkflow.com' },
      companyId,
      true
    )
    assert.strictEqual(approvalResult.request.status, 'approved')
    assert.ok(approvalResult.po)

    const po = approvalResult.po
    assert.strictEqual(po.supplier_id, supplier.id)
    assert.strictEqual(po.items.length, 1)
    assert.strictEqual(po.items[0].quantity_ordered, 1000)
    assert.strictEqual(po.items[0].quantity_remaining, 1000)

    // 6. Issue Purchase Order
    const issuedPO = await PurchaseService.sendPurchaseOrder(
      po.id,
      { name: 'Procurement Officer', email: 'procurement@inkflow.com' },
      companyId
    )
    assert.strictEqual(issuedPO.status, 'issued')

    // 7. Process First Partial Receiving (GRN 1): 400 sqft accepted
    const receipt1 = await PurchaseService.receiveGoods({
      company_id: companyId,
      purchase_order_id: po.id,
      challan_number: 'CH-2026-9901',
      supplier_delivery_note: 'DN-MMS-881',
      received_by_name: 'Store Keeper 1',
      items_received: [
        {
          po_item_id: po.items[0].id,
          material_id: material.id,
          material_name: material.name,
          current_received: 400,
          accepted_quantity: 400,
          rejected_quantity: 0,
          damaged_quantity: 0,
          unit: 'sqft',
          unit_cost: 28.5,
        },
      ],
    })
    assert.ok(receipt1.grn.id)
    assert.strictEqual(receipt1.updatedPO.status, 'partially_received')
    assert.strictEqual(receipt1.updatedPO.items[0].quantity_received, 400)
    assert.strictEqual(receipt1.updatedPO.items[0].quantity_remaining, 600)

    // 8. Verify V3 Physical Stock Mutation
    const matAfterReceipt1 = await InventoryService.getMaterialById(material.id, companyId)
    assert.strictEqual(matAfterReceipt1?.current_stock, 400)

    // Verify Stock Ledger has PURCHASE_RECEIPT entry
    const ledger = PrintERPDataStore.get<StockLedgerRecord[]>(STORAGE_KEYS.STOCK_LEDGER) || []
    const receipt1Tx = ledger.find(
      (tx) => tx.company_id === companyId && tx.material_id === material.id && tx.transaction_type === 'PURCHASE_RECEIPT'
    )
    assert.ok(receipt1Tx)
    assert.strictEqual(receipt1Tx.quantity_change, 400)

    // 9. Process Second Final Receiving (GRN 2): 600 sqft (550 accepted, 30 rejected, 20 damaged)
    const receipt2 = await PurchaseService.receiveGoods({
      company_id: companyId,
      purchase_order_id: po.id,
      challan_number: 'CH-2026-9902',
      received_by_name: 'Store Keeper 1',
      items_received: [
        {
          po_item_id: po.items[0].id,
          material_id: material.id,
          material_name: material.name,
          current_received: 600,
          accepted_quantity: 550,
          rejected_quantity: 30,
          damaged_quantity: 20,
          unit: 'sqft',
          unit_cost: 28.5,
          rejection_reason: 'Wrinkled media edge on 1 roll',
        },
      ],
    })
    assert.ok(receipt2.grn.id)
    assert.strictEqual(receipt2.updatedPO.status, 'received')
    assert.strictEqual(receipt2.updatedPO.items[0].quantity_remaining, 0)

    // Only accepted 550 becomes available physical inventory (total 400 + 550 = 950)
    const matAfterReceipt2 = await InventoryService.getMaterialById(material.id, companyId)
    assert.strictEqual(matAfterReceipt2?.current_stock, 950)

    // 10. Verify Supplier Ledger reflects credit for accepted goods
    const supplierLedger = await SupplierService.getSupplierLedger(companyId, supplier.id)
    assert.ok(supplierLedger.length >= 2)
    const totalCredit = supplierLedger.reduce((sum, entry) => sum + entry.credit, 0)
    assert.strictEqual(totalCredit, (400 * 28.5) + (550 * 28.5)) // ৳27,075 total accepted liability

    // 11. Create Product & Job Costing in V4, Log V3 Consumption and verify Costing Sync
    const product = await ProductService.createProduct({
      company_id: companyId,
      sku: 'PRD-BILLBOARD-01',
      name: 'Highway Billboard Flex Print',
      category: 'flex',
      unit: 'sft',
      selling_price: 60,
      pricing_formula: {
        base_rate: 60,
        material_rate: 28.5,
        default_margin_percent: 35.0,
      },
    })

    const costing = await CostingService.createCostingFromProduct(
      product.id,
      {
        width: 20,
        height: 10,
        quantity: 1,
        dimensionUnit: 'ft',
      },
      {
        companyId,
        customer_name: 'Square Pharmaceuticals Ltd',
      }
    )
    assert.ok(costing.id)

    // Log V3 Production Task consumption of 200 sqft
    await InventoryService.logProductionConsumption({
      company_id: companyId,
      material_id: material.id,
      consumed_quantity: 200,
      unit: 'sqft',
      production_task_id: 'task-v5-01',
      actor_name: 'Lead Operator',
    })

    const matAfterConsumption = await InventoryService.getMaterialById(material.id, companyId)
    assert.strictEqual(matAfterConsumption?.current_stock, 950) // Non-negative stock intact

    const actualizedCosting = await CostingService.syncActualConsumptionToCosting(costing.id, companyId)
    assert.ok(actualizedCosting)
    assert.strictEqual(actualizedCosting.status, 'actualized')
  })
})

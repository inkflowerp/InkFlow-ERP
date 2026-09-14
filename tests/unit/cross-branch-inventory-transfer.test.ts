import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { CrossBranchOperationsService } from '../../services/cross-branch-operations.service.ts'
import { BranchOperationsRepository } from '../../lib/repositories/branch-operations.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Cross-Branch Inventory Transfer & Stock Ledger Lifecycle (V9)', () => {
  const companyId = 'test-company-v9-inv'
  const branchDhaka = 'br-dhaka-01'
  const branchGazipur = 'br-gazipur-02'
  const materialVinyl = 'mat-vinyl-3M'

  beforeEach(() => {
    PrintERPDataStore.clearAll(companyId)

    // Seed initial materials with 100 sqft in stock
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, companyId, [
      {
        id: materialVinyl,
        company_id: companyId,
        branch_id: branchDhaka,
        name: '3M Reflective Vinyl Sheet',
        unit: 'sqft',
        unit_cost: 120,
        current_stock: 100,
        min_stock_level: 20,
        created_at: new Date().toISOString(),
      },
    ])
  })

  test('1. Executes full 8-state transfer lifecycle with atomic stock movement', async () => {
    // Step 1: Request transfer of 30 sqft from Dhaka to Gazipur
    const request = await CrossBranchOperationsService.requestTransfer(companyId, {
      from_branch_id: branchDhaka,
      to_branch_id: branchGazipur,
      material_id: materialVinyl,
      quantity: 30,
      unit: 'sqft',
      requested_by: 'usr-dhaka-manager',
      requested_by_name: 'Dhaka Storekeeper',
      notes: 'Transfer for Gazipur outdoor signage order',
    })

    assert.strictEqual(request.status, 'requested')
    assert.strictEqual(request.quantity, 30)

    // Step 2: Approve transfer
    const approved = await CrossBranchOperationsService.approveTransfer(
      companyId,
      request.id,
      { id: 'usr-ops-head', name: 'Operations Director' }
    )
    assert.strictEqual(approved.status, 'approved')
    assert.strictEqual(approved.approved_by_name, 'Operations Director')

    // Verify stock has NOT yet been deducted prior to dispatch
    let materials = PrintERPDataStore.get<any>(STORAGE_KEYS.MATERIALS, companyId) || []
    assert.strictEqual(materials[0].current_stock, 100)

    // Step 3: Dispatch transfer -> stock deducted from source
    const dispatched = await CrossBranchOperationsService.dispatchTransfer(
      companyId,
      request.id,
      { id: 'usr-dhaka-dispatch', name: 'Dhaka Dispatcher' }
    )
    assert.strictEqual(dispatched.status, 'in_transit')

    materials = PrintERPDataStore.get<any>(STORAGE_KEYS.MATERIALS, companyId) || []
    assert.strictEqual(
      materials[0].current_stock,
      70,
      'Source stock must be deducted upon dispatch'
    )

    // Verify stock ledger has transfer_out record
    const ledger = PrintERPDataStore.get<any>(STORAGE_KEYS.STOCK_LEDGER, companyId) || []
    assert.strictEqual(ledger.length, 1)
    assert.strictEqual(ledger[0].transaction_type, 'transfer_out')
    assert.strictEqual(ledger[0].quantity_change, -30)

    // Step 4: Receive transfer at Gazipur -> stock credited to destination
    const received = await CrossBranchOperationsService.receiveTransfer(
      companyId,
      request.id,
      { id: 'usr-gazipur-receive', name: 'Gazipur Receiver' }
    )
    assert.strictEqual(received.status, 'received')
    assert.strictEqual(received.received_by_name, 'Gazipur Receiver')

    materials = PrintERPDataStore.get<any>(STORAGE_KEYS.MATERIALS, companyId) || []
    assert.strictEqual(
      materials[0].current_stock,
      100,
      'Target stock must increase by transferred quantity'
    )

    const updatedLedger = PrintERPDataStore.get<any>(STORAGE_KEYS.STOCK_LEDGER, companyId) || []
    assert.strictEqual(updatedLedger.length, 2)
    assert.strictEqual(updatedLedger[1].transaction_type, 'transfer_in')
    assert.strictEqual(updatedLedger[1].quantity_change, 30)
  })

  test('2. Prevents dispatch when available source stock is insufficient (Negative Stock Guard)', async () => {
    const request = await CrossBranchOperationsService.requestTransfer(companyId, {
      from_branch_id: branchDhaka,
      to_branch_id: branchGazipur,
      material_id: materialVinyl,
      quantity: 150, // More than 100 in stock
      unit: 'sqft',
    })

    await CrossBranchOperationsService.approveTransfer(companyId, request.id, {
      id: 'usr-admin',
      name: 'Admin',
    })

    await assert.rejects(
      async () => {
        await CrossBranchOperationsService.dispatchTransfer(companyId, request.id, {
          id: 'usr-dispatch',
          name: 'Dispatcher',
        })
      },
      /Insufficient stock at source branch/,
      'Must reject dispatch when stock is less than requested quantity'
    )
  })

  test('3. Idempotency key prevents duplicate transfer creation', async () => {
    const idempotencyKey = 'dev101_unique_uuid_009'

    const t1 = await CrossBranchOperationsService.requestTransfer(companyId, {
      from_branch_id: branchDhaka,
      to_branch_id: branchGazipur,
      material_id: materialVinyl,
      quantity: 25,
      idempotency_key: idempotencyKey,
    })

    const t2 = await CrossBranchOperationsService.requestTransfer(companyId, {
      from_branch_id: branchDhaka,
      to_branch_id: branchGazipur,
      material_id: materialVinyl,
      quantity: 25,
      idempotency_key: idempotencyKey,
    })

    assert.strictEqual(t1.id, t2.id, 'Repeated request must return identical transfer record')
    const list = await BranchOperationsRepository.listBranchTransfers(companyId)
    assert.strictEqual(list.length, 1, 'Only one transfer record should exist')
  })

  test('4. Cancelling an in-transit transfer rolls back deducted stock to source location', async () => {
    const request = await CrossBranchOperationsService.requestTransfer(companyId, {
      from_branch_id: branchDhaka,
      to_branch_id: branchGazipur,
      material_id: materialVinyl,
      quantity: 40,
    })

    await CrossBranchOperationsService.approveTransfer(companyId, request.id, {
      id: 'usr-1',
      name: 'Approver',
    })
    await CrossBranchOperationsService.dispatchTransfer(companyId, request.id, {
      id: 'usr-2',
      name: 'Dispatcher',
    })

    let mats = PrintERPDataStore.get<any>(STORAGE_KEYS.MATERIALS, companyId) || []
    assert.strictEqual(mats[0].current_stock, 60)

    // Cancel in-transit transfer
    const cancelled = await CrossBranchOperationsService.cancelTransfer(
      companyId,
      request.id,
      { id: 'usr-3', name: 'Coordinator' }
    )
    assert.strictEqual(cancelled.status, 'cancelled')

    mats = PrintERPDataStore.get<any>(STORAGE_KEYS.MATERIALS, companyId) || []
    assert.strictEqual(
      mats[0].current_stock,
      100,
      'Stock must be restored back to 100 after cancelling in-transit dispatch'
    )
  })
})

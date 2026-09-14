import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { CrossBranchOperationsService } from '../../services/cross-branch-operations.service.ts'
import { BranchOperationsRepository } from '../../lib/repositories/branch-operations.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Inter-Branch Financial Transfers & Balanced Accounting (V9)', () => {
  const companyId = 'test-company-v9-fin'
  const branchA = 'br-dhaka-main'
  const branchB = 'br-chattogram-hub'

  beforeEach(() => {
    PrintERPDataStore.clearAll(companyId)
  })

  test('1. Executes balanced inter-branch cash transfer with paired cash-out and cash-in', async () => {
    const transfer = await CrossBranchOperationsService.requestFinancialTransfer(
      companyId,
      {
        from_branch_id: branchA,
        to_branch_id: branchB,
        amount: 50000,
        currency: 'BDT',
        requested_by_name: 'Dhaka Cashier',
        reference: 'DH-CTG-TXN-001',
        notes: 'Monthly operating fund transfer to Chattogram',
      }
    )

    assert.strictEqual(transfer.status, 'requested')
    assert.strictEqual(transfer.amount, 50000)

    const completed = await CrossBranchOperationsService.completeFinancialTransfer(
      companyId,
      transfer.id,
      { id: 'usr-fin-controller', name: 'Chief Financial Officer' }
    )

    assert.strictEqual(completed.status, 'completed')

    // Verify paired dual-entry cash book postings
    const cashBook = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CASH_BOOK, companyId) || []
    assert.strictEqual(cashBook.length, 2, 'Must create exactly two balanced entries')

    const outEntry = cashBook.find((c: any) => c.branch_id === branchA)
    const inEntry = cashBook.find((c: any) => c.branch_id === branchB)

    assert.ok(outEntry, 'Must have cash-out entry for source branch')
    assert.strictEqual(outEntry.entry_type, 'cash_out')
    assert.strictEqual(outEntry.amount, 50000)

    assert.ok(inEntry, 'Must have cash-in entry for destination branch')
    assert.strictEqual(inEntry.entry_type, 'cash_in')
    assert.strictEqual(inEntry.amount, 50000)
  })

  test('2. Rejects transfers with invalid parameters', async () => {
    await assert.rejects(
      async () => {
        await CrossBranchOperationsService.requestFinancialTransfer(companyId, {
          from_branch_id: branchA,
          to_branch_id: branchA, // Same branch
          amount: 10000,
        })
      },
      /Source and destination branches cannot be identical/
    )

    await assert.rejects(
      async () => {
        await CrossBranchOperationsService.requestFinancialTransfer(companyId, {
          from_branch_id: branchA,
          to_branch_id: branchB,
          amount: -500, // Negative amount
        })
      },
      /Financial transfer amount must be greater than 0/
    )
  })
})

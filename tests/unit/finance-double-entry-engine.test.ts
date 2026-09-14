import { test, describe } from 'node:test'
import assert from 'node:assert'
import { FinanceRepository } from '../../lib/repositories/finance.repository.ts'
import { FinanceService } from '../../services/finance.service.ts'
import type { FinancialTransactionRecord, JournalEntryLineRecord } from '../../types/finance.types.ts'

describe('Finance Double-Entry Engine Unit Tests (V6)', () => {
  const companyId = 'co-finance-unit-test-v6'

  test('rejects unbalanced journal entries where Total Debit != Total Credit', async () => {
    await FinanceRepository.seedDefaultAccounts(companyId)
    const accounts = await FinanceRepository.getAccounts(companyId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const revAcc = accounts.find((a) => a.code === '4010')!

    const header: FinancialTransactionRecord = {
      id: 'txn-unbalanced-1',
      company_id: companyId,
      transaction_number: 'TXN-2026-UNBAL1',
      transaction_date: '2026-09-14',
      transaction_type: 'CUSTOMER_PAYMENT',
      status: 'POSTED',
      total_amount: 5000,
      narration: 'Unbalanced payment test',
      posted_by_name: 'Test',
      posted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const lines: JournalEntryLineRecord[] = [
      {
        id: 'jel-1',
        transaction_id: header.id,
        company_id: companyId,
        account_id: cashAcc.id,
        debit: 5000,
        credit: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'jel-2',
        transaction_id: header.id,
        company_id: companyId,
        account_id: revAcc.id,
        debit: 0,
        credit: 4500, // Unbalanced: 5000 != 4500
        created_at: new Date().toISOString(),
      },
    ]

    await assert.rejects(
      async () => {
        await FinanceRepository.recordTransaction(header, lines)
      },
      {
        message: /Double-entry unbalance rejected/,
      }
    )
  })

  test('records balanced transactions and mutates account balances correctly', async () => {
    const compId = `${companyId}-bal`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const revAcc = accounts.find((a) => a.code === '4010')!

    const initialCash = cashAcc.current_balance
    const initialRev = revAcc.current_balance

    const header: FinancialTransactionRecord = {
      id: 'txn-balanced-1',
      company_id: compId,
      transaction_number: 'TXN-2026-BAL1',
      transaction_date: '2026-09-14',
      transaction_type: 'CUSTOMER_PAYMENT',
      status: 'POSTED',
      total_amount: 15000,
      narration: 'Balanced sales receipt',
      posted_by_name: 'Cashier',
      posted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const lines: JournalEntryLineRecord[] = [
      {
        id: 'jel-1',
        transaction_id: header.id,
        company_id: compId,
        account_id: cashAcc.id,
        debit: 15000,
        credit: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'jel-2',
        transaction_id: header.id,
        company_id: compId,
        account_id: revAcc.id,
        debit: 0,
        credit: 15000,
        created_at: new Date().toISOString(),
      },
    ]

    const recorded = await FinanceRepository.recordTransaction(header, lines)
    assert.strictEqual(recorded.status, 'POSTED')

    const updatedCash = await FinanceRepository.getAccountById(cashAcc.id, compId)
    const updatedRev = await FinanceRepository.getAccountById(revAcc.id, compId)

    assert.strictEqual(updatedCash?.current_balance, initialCash + 15000)
    assert.strictEqual(updatedRev?.current_balance, initialRev + 15000)
  })

  test('computes Profit and Loss statement correctly with Revenue, COGS and OPEX', async () => {
    const compId = `${companyId}-pnl`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const revAcc = accounts.find((a) => a.code === '4010')!
    const cogsMatAcc = accounts.find((a) => a.code === '5010')!
    const rentAcc = accounts.find((a) => a.code === '6010')!

    // 1. Record Revenue ৳100,000
    await FinanceRepository.recordTransaction(
      {
        id: 'txn-rev-1',
        company_id: compId,
        transaction_number: 'TXN-REV-1',
        transaction_date: '2026-09-14',
        transaction_type: 'CUSTOMER_PAYMENT',
        status: 'POSTED',
        total_amount: 100000,
        narration: 'Revenue',
        posted_by_name: 'Test',
        posted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      [
        { id: 'j-1', transaction_id: 'txn-rev-1', company_id: compId, account_id: cashAcc.id, debit: 100000, credit: 0, created_at: '' },
        { id: 'j-2', transaction_id: 'txn-rev-1', company_id: compId, account_id: revAcc.id, debit: 0, credit: 100000, created_at: '' },
      ]
    )

    // 2. Record COGS Material ৳40,000
    await FinanceRepository.recordTransaction(
      {
        id: 'txn-cogs-1',
        company_id: compId,
        transaction_number: 'TXN-COGS-1',
        transaction_date: '2026-09-14',
        transaction_type: 'EXPENSE',
        status: 'POSTED',
        total_amount: 40000,
        narration: 'Material COGS',
        posted_by_name: 'Test',
        posted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      [
        { id: 'j-3', transaction_id: 'txn-cogs-1', company_id: compId, account_id: cogsMatAcc.id, debit: 40000, credit: 0, created_at: '' },
        { id: 'j-4', transaction_id: 'txn-cogs-1', company_id: compId, account_id: cashAcc.id, debit: 0, credit: 40000, created_at: '' },
      ]
    )

    // 3. Record Rent OPEX ৳20,000
    await FinanceRepository.recordTransaction(
      {
        id: 'txn-opex-1',
        company_id: compId,
        transaction_number: 'TXN-OPEX-1',
        transaction_date: '2026-09-14',
        transaction_type: 'EXPENSE',
        status: 'POSTED',
        total_amount: 20000,
        narration: 'Factory Rent',
        posted_by_name: 'Test',
        posted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      [
        { id: 'j-5', transaction_id: 'txn-opex-1', company_id: compId, account_id: rentAcc.id, debit: 20000, credit: 0, created_at: '' },
        { id: 'j-6', transaction_id: 'txn-opex-1', company_id: compId, account_id: cashAcc.id, debit: 0, credit: 20000, created_at: '' },
      ]
    )

    const pnl = await FinanceService.getProfitAndLoss(compId)

    assert.strictEqual(pnl.revenue.total, 100000)
    assert.strictEqual(pnl.cost_of_goods_sold.total, 40000)
    assert.strictEqual(pnl.gross_profit, 60000)
    assert.strictEqual(pnl.gross_margin_percentage, 60)
    assert.strictEqual(pnl.operating_expenses.total, 20000)
    assert.strictEqual(pnl.operating_profit, 40000)
    assert.strictEqual(pnl.net_profit, 40000)
  })
})

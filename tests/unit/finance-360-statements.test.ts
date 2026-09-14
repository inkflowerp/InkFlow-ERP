import { test, describe } from 'node:test'
import assert from 'node:assert'
import { FinanceRepository } from '../../lib/repositories/finance.repository.ts'
import { FinanceService } from '../../services/finance.service.ts'

describe('Finance 360 - Financial Statements Engine Tests (V9.1)', () => {
  const companyId = 'co-finance-statements-test-v9'

  test('1. Trial Balance validates Total Debit == Total Credit for balanced transactions', async () => {
    const compId = `${companyId}-tb`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const revAcc = accounts.find((a) => a.code === '4010')!

    // Record sales receipt ৳25,000
    await FinanceRepository.recordTransaction(
      {
        id: 'txn-tb-1',
        company_id: compId,
        transaction_number: 'TXN-TB-1',
        transaction_date: '2026-09-14',
        transaction_type: 'CUSTOMER_PAYMENT',
        status: 'POSTED',
        total_amount: 25000,
        narration: 'Trial balance sales receipt',
        posted_by_name: 'Cashier',
        posted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      [
        { id: 'j-tb-1', transaction_id: 'txn-tb-1', company_id: compId, account_id: cashAcc.id, debit: 25000, credit: 0, created_at: '' },
        { id: 'j-tb-2', transaction_id: 'txn-tb-1', company_id: compId, account_id: revAcc.id, debit: 0, credit: 25000, created_at: '' },
      ]
    )

    const tb = await FinanceService.getTrialBalance(compId)
    assert.strictEqual(tb.is_balanced, true)
    assert.strictEqual(tb.total_debit, tb.total_credit)
    assert.strictEqual(tb.total_debit, 25000)
  })

  test('2. Balance Sheet validates Assets = Liabilities + Equity invariant', async () => {
    const compId = `${companyId}-bs`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const revAcc = accounts.find((a) => a.code === '4010')!
    const rentAcc = accounts.find((a) => a.code === '6010')!

    // 1. Initial Revenue: ৳50,000
    await FinanceRepository.recordTransaction(
      {
        id: 'txn-bs-rev',
        company_id: compId,
        transaction_number: 'TXN-BS-REV',
        transaction_date: '2026-09-14',
        transaction_type: 'CUSTOMER_PAYMENT',
        status: 'POSTED',
        total_amount: 50000,
        narration: 'Revenue for Balance sheet test',
        posted_by_name: 'Cashier',
        posted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      [
        { id: 'j-bs-1', transaction_id: 'txn-bs-rev', company_id: compId, account_id: cashAcc.id, debit: 50000, credit: 0, created_at: '' },
        { id: 'j-bs-2', transaction_id: 'txn-bs-rev', company_id: compId, account_id: revAcc.id, debit: 0, credit: 50000, created_at: '' },
      ]
    )

    // 2. Rent Expense: ৳10,000
    await FinanceRepository.recordTransaction(
      {
        id: 'txn-bs-exp',
        company_id: compId,
        transaction_number: 'TXN-BS-EXP',
        transaction_date: '2026-09-14',
        transaction_type: 'EXPENSE',
        status: 'POSTED',
        total_amount: 10000,
        narration: 'Rent expense',
        posted_by_name: 'Cashier',
        posted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      [
        { id: 'j-bs-3', transaction_id: 'txn-bs-exp', company_id: compId, account_id: rentAcc.id, debit: 10000, credit: 0, created_at: '' },
        { id: 'j-bs-4', transaction_id: 'txn-bs-exp', company_id: compId, account_id: cashAcc.id, debit: 0, credit: 10000, created_at: '' },
      ]
    )

    const bs = await FinanceService.getBalanceSheet(compId)
    assert.strictEqual(bs.is_balanced, true)
    // Assets (Cash ৳40,000) = Liabilities (0) + Equity (Profit ৳40,000)
    assert.strictEqual(bs.assets.total, 40000)
    assert.strictEqual(bs.equity.current_period_profit, 40000)
    assert.strictEqual(bs.equity.total, 40000)
  })

  test('3. Cash Flow statement accurately captures Operating, Investing, and Financing flows', async () => {
    const compId = `${companyId}-cf`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!

    // Record Customer Receipt
    await FinanceService.recordCustomerPayment({
      companyId: compId,
      customerId: 'cust-101',
      customerName: 'Rahim Enterprise',
      paymentAccountId: cashAcc.id,
      amount: 30000,
      paymentMethod: 'cash',
    })

    // Record Operating Expense
    await FinanceService.recordExpense({
      companyId: compId,
      category: 'electricity',
      amount: 5000,
      paymentAccountId: cashAcc.id,
      description: 'Factory electricity bill',
    })

    const cf = await FinanceService.getCashFlow(compId)
    assert.strictEqual(cf.operating_activities.customer_receipts, 30000)
    assert.strictEqual(cf.operating_activities.operating_expenses_paid, 5000)
    assert.strictEqual(cf.operating_activities.total, 25000)
    assert.strictEqual(cf.net_cash_movement, 25000)
  })

  test('4. General Ledger computes running balance chronologically per account', async () => {
    const compId = `${companyId}-gl`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!

    // Entry 1: Deposit ৳10,000
    await FinanceService.recordCustomerPayment({
      companyId: compId,
      customerId: 'cust-102',
      customerName: 'Karim Store',
      paymentAccountId: cashAcc.id,
      amount: 10000,
      paymentMethod: 'cash',
    })

    // Entry 2: Expense ৳2,000
    await FinanceService.recordExpense({
      companyId: compId,
      category: 'transport',
      amount: 2000,
      paymentAccountId: cashAcc.id,
      description: 'Banner delivery transport fare',
    })

    const gl = await FinanceService.getGeneralLedger(compId, { accountId: cashAcc.id })
    assert.strictEqual(gl.length, 2)
    assert.strictEqual(gl[0].running_balance, 10000)
    assert.strictEqual(gl[1].running_balance, 8000)
  })
})

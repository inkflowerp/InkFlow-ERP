import { test, describe } from 'node:test'
import assert from 'node:assert'
import { FinanceRepository } from '../../lib/repositories/finance.repository.ts'
import { FinanceService } from '../../services/finance.service.ts'
import { SupplierRepository } from '../../lib/repositories/supplier.repository.ts'

describe('Finance 360 - Atomic Operations & Transaction Hardening Tests (V9.1)', () => {
  const companyId = 'co-finance-atomic-test-v9'

  test('1. Atomic Expense Recording mutates payment and expense account balances with balanced journal', async () => {
    const compId = `${companyId}-exp`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const rentAcc = accounts.find((a) => a.code === '6010')!

    // Initial cash deposit: ৳20,000
    await FinanceService.recordCustomerPayment({
      companyId: compId,
      customerId: 'cust-temp',
      customerName: 'Customer',
      paymentAccountId: cashAcc.id,
      amount: 20000,
      paymentMethod: 'cash',
    })

    // Record expense: ৳7,000 rent
    const txn = await FinanceService.recordExpense({
      companyId: compId,
      category: 'rent',
      amount: 7000,
      paymentAccountId: cashAcc.id,
      expenseAccountId: rentAcc.id,
      description: 'Factory monthly rent',
      vendorName: 'Factory Landlord',
    })

    assert.strictEqual(txn.status, 'POSTED')
    assert.strictEqual(txn.total_amount, 7000)

    const updatedCash = await FinanceRepository.getAccountById(cashAcc.id, compId)
    const updatedRent = await FinanceRepository.getAccountById(rentAcc.id, compId)

    // Cash: 20000 - 7000 = 13000
    assert.strictEqual(updatedCash?.current_balance, 13000)
    // Rent: 0 + 7000 = 7000
    assert.strictEqual(updatedRent?.current_balance, 7000)
  })

  test('2. Atomic Supplier Payment reduces Accounts Payable and creates supplier ledger entry', async () => {
    const compId = `${companyId}-supp`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const bankAcc = accounts.find((a) => a.code === '1020')!
    const apAcc = accounts.find((a) => a.code === '2010')!

    // Seed bank deposit ৳50,000
    await FinanceRepository.updateAccountBalance(bankAcc.id, compId, 50000)

    // Create supplier
    const supplier = await SupplierRepository.createSupplier({
      company_id: compId,
      supplier_name: 'Meghna Paper & PVC Mills',
      mobile: '01711223344',
      category: 'paper',
    })

    // Pay supplier ৳15,000
    const txn = await FinanceService.recordSupplierPayment({
      companyId: compId,
      supplierId: supplier.id,
      supplierName: supplier.supplier_name,
      paymentAccountId: bankAcc.id,
      amount: 15000,
      referenceNumber: 'PO-2026-009',
    })

    assert.strictEqual(txn.status, 'POSTED')
    assert.strictEqual(txn.total_amount, 15000)

    const updatedBank = await FinanceRepository.getAccountById(bankAcc.id, compId)
    const updatedAp = await FinanceRepository.getAccountById(apAcc.id, compId)

    assert.strictEqual(updatedBank?.current_balance, 35000)
    assert.strictEqual(updatedAp?.current_balance, -15000)

    const ledgerEntries = await SupplierRepository.getSupplierLedger(compId, supplier.id)
    assert.strictEqual(ledgerEntries.length >= 1, true)
    assert.strictEqual(ledgerEntries[0].debit, 15000)
  })

  test('3. Atomic Account Transfer debits destination, credits source by principal+fee, and debits fee account', async () => {
    const compId = `${companyId}-trf`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const bkashAcc = accounts.find((a) => a.code === '1030')!
    const feeAcc = accounts.find((a) => a.code === '6070')!

    // Deposit cash ৳10,000
    await FinanceRepository.updateAccountBalance(cashAcc.id, compId, 10000)

    // Transfer cash ৳5,000 to bKash with fee ৳25
    const transfer = await FinanceService.recordTransfer({
      companyId: compId,
      fromAccountId: cashAcc.id,
      toAccountId: bkashAcc.id,
      amount: 5000,
      feeAmount: 25,
      notes: 'Cash-in to bKash merchant wallet',
    })

    assert.strictEqual(transfer.status, 'POSTED')
    assert.strictEqual(transfer.amount, 5000)
    assert.strictEqual(transfer.fee_amount, 25)

    const updatedCash = await FinanceRepository.getAccountById(cashAcc.id, compId)
    const updatedBkash = await FinanceRepository.getAccountById(bkashAcc.id, compId)
    const updatedFee = await FinanceRepository.getAccountById(feeAcc.id, compId)

    // Cash: 10000 - (5000 + 25) = 4975
    assert.strictEqual(updatedCash?.current_balance, 4975)
    // bKash: 0 + 5000 = 5000
    assert.strictEqual(updatedBkash?.current_balance, 5000)
    // Fee expense: 0 + 25 = 25
    assert.strictEqual(updatedFee?.current_balance, 25)
  })

  test('4. Customer Refund reverses sales revenue and debits contra-revenue account with mandatory reason', async () => {
    const compId = `${companyId}-ref`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const revAcc = accounts.find((a) => a.code === '4010')!

    // Initial sale revenue ৳20,000 recorded in Cash & Revenue
    await FinanceRepository.updateAccountBalance(cashAcc.id, compId, 20000)
    await FinanceRepository.updateAccountBalance(revAcc.id, compId, 20000)

    // Refund ৳3,000
    const refund = await FinanceService.recordCustomerRefund({
      companyId: compId,
      customerId: 'c-001',
      customerName: 'Dhaka Traders',
      refundAccountId: cashAcc.id,
      amount: 3000,
      reason: 'Damaged banner reprint cancellation',
    })

    assert.strictEqual(refund.status, 'POSTED')
    assert.strictEqual(refund.total_amount, 3000)

    const updatedCash = await FinanceRepository.getAccountById(cashAcc.id, compId)
    const updatedRev = await FinanceRepository.getAccountById(revAcc.id, compId)

    // Cash: 20000 - 3000 = 17000
    assert.strictEqual(updatedCash?.current_balance, 17000)
    // Rev: 20000 - 3000 = 17000
    assert.strictEqual(updatedRev?.current_balance, 17000)
  })

  test('5. Daily Cash Closing records counted cash and posts shortage/surplus journal adjustments', async () => {
    const compId = `${companyId}-cc`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!

    // Current cash balance = ৳10,000
    await FinanceRepository.updateAccountBalance(cashAcc.id, compId, 10000)

    // Counted cash = ৳9,850 (Shortage of ৳150)
    const closing = await FinanceService.submitCashClosing({
      companyId: compId,
      accountId: cashAcc.id,
      countedCash: 9850,
      varianceReason: 'Tea and transport petty cash without voucher',
    })

    assert.strictEqual(closing.status, 'APPROVED')
    assert.strictEqual(closing.expected_cash, 10000)
    assert.strictEqual(closing.counted_cash, 9850)
    assert.strictEqual(closing.variance, -150)

    // Adjusted cash balance becomes exactly ৳9,850
    const updatedCash = await FinanceRepository.getAccountById(cashAcc.id, compId)
    assert.strictEqual(updatedCash?.current_balance, 9850)
  })
})

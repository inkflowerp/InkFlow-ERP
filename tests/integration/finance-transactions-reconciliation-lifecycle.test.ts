import { test, describe } from 'node:test'
import assert from 'node:assert'
import { FinanceService } from '../../services/finance.service.ts'
import { FinanceRepository } from '../../lib/repositories/finance.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { SupplierRepository } from '../../lib/repositories/supplier.repository.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'

describe('Finance Transactions & Reconciliation Lifecycle Integration Test (V6)', () => {
  const companyId = 'co-finance-lifecycle-test-v6'

  test('completes the entire financial lifecycle from receivables, payables, transfers, expenses, to cash closing and P&L', async () => {
    // 1. Initialize Chart of Accounts
    const accounts = await FinanceRepository.seedDefaultAccounts(companyId)
    assert.ok(accounts.length >= 15)

    const cashAcc = accounts.find((a) => a.code === '1010')!
    const bankAcc = accounts.find((a) => a.code === '1020')!
    const mfsAcc = accounts.find((a) => a.code === '1030')!

    // 2. Set Opening Cash & Bank balances
    await FinanceRepository.updateAccountBalance(cashAcc.id, companyId, 50000)
    await FinanceRepository.updateAccountBalance(bankAcc.id, companyId, 200000)
    await FinanceRepository.updateAccountBalance(mfsAcc.id, companyId, 30000)

    // 3. Create a Customer Invoice in V1 Billing
    const invoice: InvoiceRecord = {
      id: 'inv-test-v6-01',
      company_id: companyId,
      invoice_number: 'INV-2026-0001',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-01',
      customer_name: 'Apex Footwear Ltd',
      customer_phone: '+8801700000000',
      invoice_date: '2026-09-01',
      due_date: '2026-09-15',
      status: 'unpaid',
      subtotal: 80000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 80000,
      paid_amount: 0,
      due_amount: 80000,
      write_off_amount: 0,
      items: [],
      created_by_name: 'Sales Officer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await BillingRepository.createInvoice(invoice)

    // 4. Record Customer Payment (৳50,000 partial payment) into Cash in Hand
    const payResult = await FinanceService.recordCustomerPayment({
      companyId,
      invoiceId: invoice.id,
      customerId: 'cust-01',
      customerName: 'Apex Footwear Ltd',
      paymentAccountId: cashAcc.id,
      amount: 50000,
      paymentMethod: 'cash',
      actorName: 'Cashier',
    })

    assert.strictEqual(payResult.invoiceUpdated, true)
    assert.strictEqual(payResult.transaction.status, 'POSTED')
    assert.match(payResult.transaction.transaction_number, /^PAY-\d{4}-\d{6}$/)

    // Verify Invoice balance was updated in V1 Billing subledger
    const updatedInv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.strictEqual(updatedInv?.paid_amount, 50000)
    assert.strictEqual(updatedInv?.due_amount, 30000)
    assert.strictEqual(updatedInv?.status, 'partially_paid')

    // 5. Create a Supplier and Record Supplier Payment (৳40,000) from Bank Account
    const supplier = await SupplierRepository.createSupplier({
      id: 'supp-v6-01',
      company_id: companyId,
      supplier_code: 'SUPP-001',
      supplier_name: 'Standard Vinyl & Board Mills',
      mobile: '01711223344',
      category: 'RAW_MATERIAL',
      payment_terms: 'credit_30',
      is_active: true,
      default_currency: 'BDT',
    })

    // Log initial GRN purchase credit in supplier ledger
    await SupplierRepository.recordLedgerEntry({
      company_id: companyId,
      supplier_id: supplier.id,
      entry_type: 'GOODS_RECEIPT',
      reference_type: 'GRN',
      reference_id: 'GRN-2026-001',
      debit: 0,
      credit: 60000,
      notes: 'Received PVC Flex Banners',
    })

    const suppPayTxn = await FinanceService.recordSupplierPayment({
      companyId,
      supplierId: supplier.id,
      supplierName: supplier.supplier_name,
      paymentAccountId: bankAcc.id,
      amount: 40000,
      actorName: 'Accounts Manager',
    })

    assert.strictEqual(suppPayTxn.status, 'POSTED')

    // Verify V5 supplier ledger has the debited payment
    const suppEntries = await SupplierRepository.getLedgerEntries(companyId, supplier.id)
    const paymentEntry = suppEntries.find((e) => e.entry_type === 'PAYMENT')
    assert.strictEqual(paymentEntry?.debit, 40000)

    // 6. Record an Operating Expense (Factory Rent ৳15,000 via bKash MFS)
    const expenseTxn = await FinanceService.recordExpense({
      companyId,
      category: 'rent',
      amount: 15000,
      paymentAccountId: mfsAcc.id,
      vendorName: 'Factory Landlord',
      description: 'Monthly Factory Rent - September 2026',
    })

    assert.strictEqual(expenseTxn.status, 'POSTED')

    // 7. Perform an Account Transfer (Cash ৳20,000 -> Bank Account with ৳25 transfer fee)
    const transfer = await FinanceService.recordTransfer({
      companyId,
      fromAccountId: cashAcc.id,
      toAccountId: bankAcc.id,
      amount: 20000,
      feeAmount: 25,
      notes: 'Cash deposit to BRAC Bank',
    })

    assert.strictEqual(transfer.status, 'POSTED')
    assert.match(transfer.transfer_number, /^TRF-\d{4}-\d{6}$/)

    // 8. Daily Cash Drawer Closing with ৳100 variance
    const cashAccFresh = await FinanceRepository.getAccountById(cashAcc.id, companyId)
    const countedCash = (cashAccFresh?.current_balance || 0) - 100 // Shortage of ৳100

    const closing = await FinanceService.submitCashClosing({
      companyId,
      accountId: cashAcc.id,
      countedCash,
      varianceReason: 'Minor cash drawer difference at shift handover',
    })

    assert.strictEqual(closing.variance, -100)
    assert.strictEqual(closing.status, 'APPROVED')
    assert.match(closing.closing_number, /^CC-\d{4}-\d{6}$/)

    // 9. Verify Receivables Aging Report
    const arSummary = await FinanceService.getReceivablesAging(companyId)
    assert.strictEqual(arSummary.total_receivable, 30000)
    assert.strictEqual(arSummary.items.length, 1)
    assert.strictEqual(arSummary.items[0].due_amount, 30000)

    // 10. Verify Payables Aging Report
    const apSummary = await FinanceService.getPayablesAging(companyId)
    assert.strictEqual(apSummary.total_payable, 20000) // 60,000 - 40,000 = 20,000 net due

    // 11. Verify Financial Dashboard Metrics
    const dashboard = await FinanceService.getFinancialDashboard(companyId)
    assert.strictEqual(dashboard.total_receivables, 30000)
    assert.strictEqual(dashboard.total_payables, 20000)
    assert.ok(dashboard.total_liquid_assets > 0)
  })
})

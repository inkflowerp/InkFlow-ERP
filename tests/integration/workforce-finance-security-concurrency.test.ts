import { test, describe } from 'node:test'
import assert from 'node:assert'
import { WorkforceService } from '../../services/workforce.service.ts'
import { FinanceService } from '../../services/finance.service.ts'
import { FinanceRepository } from '../../lib/repositories/finance.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'

describe('Workforce & Finance Security, Isolation & Concurrency Tests (V6)', () => {
  const tenantA = 'co-tenant-alpha-v6'
  const tenantB = 'co-tenant-beta-v6'

  test('enforces strict multi-tenant boundary isolation between Company A and Company B', async () => {
    // 1. Create employees for Tenant A and Tenant B
    await WorkforceService.createEmployee({
      company_id: tenantA,
      name: 'Alpha Staff',
      role: 'Designer',
      department: 'design',
      base_salary: 25000,
    })

    await WorkforceService.createEmployee({
      company_id: tenantB,
      name: 'Beta Staff',
      role: 'Operator',
      department: 'printing',
      base_salary: 28000,
    })

    const alphaEmployees = await WorkforceService.getEmployees(tenantA)
    const betaEmployees = await WorkforceService.getEmployees(tenantB)

    assert.strictEqual(alphaEmployees.length, 1)
    assert.strictEqual(alphaEmployees[0].name, 'Alpha Staff')
    assert.strictEqual(betaEmployees.length, 1)
    assert.strictEqual(betaEmployees[0].name, 'Beta Staff')

    // 2. Initialize Chart of Accounts for both tenants
    await FinanceRepository.seedDefaultAccounts(tenantA)
    await FinanceRepository.seedDefaultAccounts(tenantB)

    const alphaAccounts = await FinanceRepository.getAccounts(tenantA)
    const betaAccounts = await FinanceRepository.getAccounts(tenantB)

    assert.strictEqual(alphaAccounts.every((a) => a.company_id === tenantA), true)
    assert.strictEqual(betaAccounts.every((a) => a.company_id === tenantB), true)
  })

  test('strictly rejects overpayment exceeding invoice due amount', async () => {
    const compId = `${tenantA}-overpay`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!

    const invoice: InvoiceRecord = {
      id: 'inv-overpay-test-v6',
      company_id: compId,
      invoice_number: 'INV-2026-999',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-99',
      customer_name: 'Overpay Customer',
      customer_phone: '+8801700000000',
      invoice_date: '2026-09-01',
      due_date: '2026-09-15',
      status: 'unpaid',
      subtotal: 10000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 10000,
      paid_amount: 0,
      due_amount: 10000,
      write_off_amount: 0,
      items: [],
      created_by_name: 'Test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await BillingRepository.createInvoice(invoice)

    // Attempt to pay ৳15,000 on a ৳10,000 due invoice
    await assert.rejects(
      async () => {
        await FinanceService.recordCustomerPayment({
          companyId: compId,
          invoiceId: invoice.id,
          customerId: 'cust-99',
          customerName: 'Overpay Customer',
          paymentAccountId: cashAcc.id,
          amount: 15000,
          paymentMethod: 'cash',
        })
      },
      {
        message: /Overpayment rejected/,
      }
    )
  })

  test('rejects account transfers where source and destination accounts are identical', async () => {
    const compId = `${tenantA}-sameacc`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!

    await assert.rejects(
      async () => {
        await FinanceService.recordTransfer({
          companyId: compId,
          fromAccountId: cashAcc.id,
          toAccountId: cashAcc.id,
          amount: 5000,
        })
      },
      {
        message: /Source and Destination accounts cannot be the same/,
      }
    )
  })
})
